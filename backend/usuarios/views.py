from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.http import FileResponse, Http404
from django.conf import settings
from .models import Estudiante, Usuario, CodigoRecuperacion, PerfilConductor, PerfilApoderado, FCMToken, Notificacion, Furgon, Ruta
from .serializers import (
    RegistroApoderadoSerializer,
    RegistroConductorSerializer,
    ConductorSerializer,
    ApoderadoSerializer,
    LoginSerializer,
    UsuarioResponseSerializer,
    EstudianteSerializer,
    EstudianteUpdateSerializer,
    FCMTokenSerializer,
    NotificacionSerializer,
    FurgonSerializer,
    RutaSerializer
)
from .push_service import crear_y_despachar_notificacion, notificar_apoderados_de_estudiantes

import secrets

import resend

from datetime import timedelta

from django.utils import timezone


class RegistroApoderadoView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistroApoderadoSerializer(data=request.data)
        if serializer.is_valid():
            usuario = serializer.save()
            token, _ = Token.objects.get_or_create(user=usuario)
            user_data = UsuarioResponseSerializer(usuario).data
            return Response({
                'message': 'Apoderado registrado exitosamente.',
                'token': token.key,
                'usuario': user_data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'message': 'Error en el registro.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class DashboardStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        estudiantes_count = Estudiante.objects.count()
        conductores_count = Usuario.objects.filter(rol='conductor').count()
        apoderados_count = Usuario.objects.filter(rol='apoderado',is_superuser=False,is_staff=False).count()
        furgones_count = Furgon.objects.count()
        rutas_count = Ruta.objects.count()
        return Response({
            'estudiantes': estudiantes_count,
            'conductores': conductores_count,
            'apoderados': apoderados_count,
            'furgones': furgones_count,
            'rutas': rutas_count
        }, status=status.HTTP_200_OK)



class ApoderadoListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        apoderados = Usuario.objects.filter(rol='apoderado', is_superuser=False, is_staff=False).order_by('-id')
        serializer = ApoderadoSerializer(apoderados, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data.copy()
        if 'nombre_completo' in data and not data.get('nombre'):
            parts = data['nombre_completo'].strip().split(' ', 1)
            data['nombre'] = parts[0]
            data['apellido'] = parts[1] if len(parts) > 1 else ''
        if 'usuario' in data and not data.get('email'):
            data['email'] = data['usuario']
        if not data.get('password'):
            data['password'] = '123456'

        serializer = RegistroApoderadoSerializer(data=data)
        if serializer.is_valid():
            usuario = serializer.save()
            user_data = ApoderadoSerializer(usuario).data
            return Response({
                'message': 'Apoderado registrado exitosamente.',
                'apoderado': user_data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'message': 'Error al registrar el apoderado.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class EstudianteSinAsignarListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        estudiantes = Estudiante.objects.filter(conductor__isnull=True)
        serializer = EstudianteSerializer(estudiantes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ConductorEstudiantesListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, conductor_id):
        try:
            conductor_user = Usuario.objects.get(id=conductor_id, rol='conductor')
            perfil_conductor = conductor_user.perfil_conductor
        except (Usuario.DoesNotExist, PerfilConductor.DoesNotExist):
            raise Http404

        estudiantes = perfil_conductor.estudiantes_asignados.all()
        serializer = EstudianteSerializer(estudiantes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ConductorAsignarEstudiantesView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, conductor_id):
        try:
            conductor_user = Usuario.objects.get(id=conductor_id, rol='conductor')
            perfil_conductor = conductor_user.perfil_conductor
        except (Usuario.DoesNotExist, PerfilConductor.DoesNotExist):
            raise Http404

        estudiante_ids = request.data.get('estudiante_ids', [])
        if not isinstance(estudiante_ids, list):
            return Response({'message': 'El formato de estudiante_ids debe ser una lista.'}, status=status.HTTP_400_BAD_REQUEST)

        estudiantes_a_asignar = list(Estudiante.objects.filter(id__in=estudiante_ids).select_related('apoderado__usuario'))
        estudiantes_actualizados = Estudiante.objects.filter(id__in=estudiante_ids).update(conductor=perfil_conductor)

        # Enviar notificación Push a los apoderados correspondientes
        from .push_service import crear_y_despachar_notificacion
        nombre_conductor = conductor_user.get_full_name() or conductor_user.email

        for est in estudiantes_a_asignar:
            if est.apoderado:
                nombre_estudiante = f"{est.nombre} {est.apellido}".strip()
                crear_y_despachar_notificacion(
                    apoderado=est.apoderado,
                    titulo="🚌 Conductor Asignado",
                    mensaje=f"Se ha asignado a {nombre_conductor} como furgón/conductor de transporte para {nombre_estudiante}.",
                    tipo="aviso_sistema",
                    estudiante=est
                )

        estudiantes = perfil_conductor.estudiantes_asignados.all()
        return Response({
            'message': f'{estudiantes_actualizados} estudiantes asignados exitosamente.',
            'estudiantes': EstudianteSerializer(estudiantes, many=True).data
        }, status=status.HTTP_200_OK)


class ConductorDesasignarEstudianteView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, conductor_id):
        try:
            conductor_user = Usuario.objects.get(id=conductor_id, rol='conductor')
            perfil_conductor = conductor_user.perfil_conductor
        except (Usuario.DoesNotExist, PerfilConductor.DoesNotExist):
            raise Http404

        estudiante_id = request.data.get('estudiante_id')
        if not estudiante_id:
            return Response({'message': 'Debe especificar el estudiante_id.'}, status=status.HTTP_400_BAD_REQUEST)

        estudiantes_a_desasignar = list(Estudiante.objects.filter(id=estudiante_id, conductor=perfil_conductor).select_related('apoderado__usuario'))
        Estudiante.objects.filter(id=estudiante_id, conductor=perfil_conductor).update(conductor=None)

        # Enviar notificación Push al apoderado
        from .push_service import crear_y_despachar_notificacion

        for est in estudiantes_a_desasignar:
            if est.apoderado:
                nombre_estudiante = f"{est.nombre} {est.apellido}".strip()
                crear_y_despachar_notificacion(
                    apoderado=est.apoderado,
                    titulo="🚌 Cambio en Transporte Escolar",
                    mensaje=f"Se ha desasignado el furgón/conductor de transporte para {nombre_estudiante}.",
                    tipo="aviso_sistema",
                    estudiante=est
                )

        estudiantes = perfil_conductor.estudiantes_asignados.all()
        return Response({
            'message': 'Estudiante desasignado exitosamente.',
            'estudiantes': EstudianteSerializer(estudiantes, many=True).data
        }, status=status.HTTP_200_OK)


class ApoderadoDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, apoderado_id):
        try:
            apoderado = Usuario.objects.get(id=apoderado_id, rol='apoderado')
        except Usuario.DoesNotExist:
            raise Http404
        return Response(ApoderadoSerializer(apoderado).data, status=status.HTTP_200_OK)

    def patch(self, request, apoderado_id):
        try:
            apoderado = Usuario.objects.get(id=apoderado_id, rol='apoderado')
        except Usuario.DoesNotExist:
            raise Http404

        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        if first_name is not None:
            apoderado.first_name = first_name.strip()
        if last_name is not None:
            apoderado.last_name = last_name.strip()

        nombre = request.data.get('nombre') or request.data.get('nombre_completo')
        if nombre and first_name is None:
            parts = nombre.strip().split(' ', 1)
            apoderado.first_name = parts[0]
            apoderado.last_name = parts[1] if len(parts) > 1 else ''

        email = request.data.get('email') or request.data.get('usuario')
        if email and email.lower().strip() != apoderado.email:
            new_email = email.lower().strip()
            if Usuario.objects.filter(email=new_email).exclude(id=apoderado.id).exists():
                return Response({'message': 'El correo electrónico ya está registrado.'}, status=status.HTTP_400_BAD_REQUEST)
            apoderado.email = new_email
            apoderado.username = new_email

        password = request.data.get('password')
        if password:
            apoderado.set_password(password)

        apoderado.save()

        if hasattr(apoderado, 'perfil_apoderado'):
            perfil = apoderado.perfil_apoderado
            if 'telefono' in request.data:
                perfil.telefono = request.data['telefono'].strip()
            perfil.save()

        return Response({
            'message': 'Apoderado actualizado exitosamente.',
            'apoderado': ApoderadoSerializer(apoderado).data
        }, status=status.HTTP_200_OK)


class CambiarPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, apoderado_id):
        try:
            apoderado = Usuario.objects.get(id=apoderado_id, rol='apoderado')
        except Usuario.DoesNotExist:
            raise Http404

        if request.user.id != apoderado.id and not request.user.is_staff:
            return Response({'message': 'No tiene permisos para modificar la contraseña de este usuario.'}, status=status.HTTP_403_FORBIDDEN)

        password_actual = request.data.get('password_actual', '')
        nueva_password = request.data.get('nueva_password', '')

        if not password_actual or not nueva_password:
            return Response({'message': 'Debe ingresar la contraseña actual y la nueva contraseña.'}, status=status.HTTP_400_BAD_REQUEST)

        if not apoderado.check_password(password_actual):
            return Response({'message': 'La contraseña actual es incorrecta.'}, status=status.HTTP_400_BAD_REQUEST)

        if apoderado.check_password(nueva_password) or password_actual == nueva_password:
            return Response({'message': 'La nueva contraseña no puede ser igual a la contraseña anterior.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(nueva_password) < 6:
            return Response({'message': 'La nueva contraseña debe tener al menos 6 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)

        apoderado.set_password(nueva_password)
        apoderado.save()

        return Response({'message': 'Contraseña actualizada exitosamente.'}, status=status.HTTP_200_OK)


    def delete(self, request, apoderado_id):
        try:
            apoderado = Usuario.objects.get(id=apoderado_id, rol='apoderado')
        except Usuario.DoesNotExist:
            raise Http404

        apoderado.delete()
        return Response({'message': 'Apoderado eliminado correctamente.'}, status=status.HTTP_200_OK)



class ConductorListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        conductores = Usuario.objects.filter(rol='conductor').order_by('-id')
        serializer = ConductorSerializer(conductores, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = RegistroConductorSerializer(data=request.data)
        if serializer.is_valid():
            usuario = serializer.save()
            user_data = ConductorSerializer(usuario).data
            return Response({
                'message': 'Conductor registrado exitosamente.',
                'conductor': user_data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'message': 'Error al registrar el conductor.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class ConductorDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, conductor_id):
        try:
            conductor = Usuario.objects.get(id=conductor_id, rol='conductor')
        except Usuario.DoesNotExist:
            raise Http404
        return Response(ConductorSerializer(conductor).data, status=status.HTTP_200_OK)

    def patch(self, request, conductor_id):
        try:
            conductor = Usuario.objects.get(
                id=conductor_id,
                rol='conductor'
            )
        except Usuario.DoesNotExist:
            raise Http404

        nombre = request.data.get('nombre') or request.data.get('nombre_completo')

        if nombre:
            parts = nombre.strip().split(' ', 1)
            conductor.first_name = parts[0]
            conductor.last_name = parts[1] if len(parts) > 1 else ''

        email = request.data.get('email')

        if email and email.lower().strip() != conductor.email:
            new_email = email.lower().strip()

            if Usuario.objects.filter(
                email=new_email
            ).exclude(id=conductor.id).exists():
                return Response(
                    {'message': 'El correo electrónico ya está registrado.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            conductor.email = new_email
            conductor.username = new_email

        password = request.data.get('password')

        if password:
            conductor.set_password(password)

        # Activar o desactivar conductor
        if 'is_active' in request.data:
            is_active = request.data.get('is_active')

            if isinstance(is_active, str):
                is_active = is_active.lower() == 'true'

            conductor.is_active = is_active

        conductor.save()

        if hasattr(conductor, 'perfil_conductor'):
            perfil = conductor.perfil_conductor

            if 'rut' in request.data:
                perfil.rut = request.data['rut'].strip()

            if 'telefono' in request.data:
                perfil.telefono = request.data['telefono'].strip()

            if 'licencia_conducir' in request.data:
                perfil.licencia_conducir = request.data['licencia_conducir'].strip()

            perfil.save()

        return Response({
            'message': 'Conductor actualizado exitosamente.',
            'conductor': ConductorSerializer(conductor).data
        }, status=status.HTTP_200_OK)



        def delete(self, request, conductor_id):
            try:
                conductor = Usuario.objects.get(id=conductor_id, rol='conductor')
            except Usuario.DoesNotExist:
                raise Http404

            conductor.delete()
            return Response({'message': 'Conductor eliminado correctamente.'}, status=status.HTTP_200_OK)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            usuario = serializer.validated_data['user']
            token, _ = Token.objects.get_or_create(user=usuario)
            user_data = UsuarioResponseSerializer(usuario).data
            return Response({
                'message': 'Inicio de sesión exitoso.',
                'token': token.key,
                'usuario': user_data
            }, status=status.HTTP_200_OK)
        return Response({
            'message': 'Error en inicio de sesión.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class EstudianteListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'perfil_apoderado'):
            return Response({
                'message': 'El usuario autenticado no tiene un perfil de apoderado asignado.'
            }, status=status.HTTP_403_FORBIDDEN)

        estudiantes = Estudiante.objects.filter(apoderado=request.user.perfil_apoderado)
        serializer = EstudianteSerializer(estudiantes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if not hasattr(request.user, 'perfil_apoderado'):
            return Response({
                'message': 'El usuario autenticado no tiene un perfil de apoderado asignado.'
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = EstudianteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(apoderado=request.user.perfil_apoderado)
            return Response({
                'message': 'Estudiante registrado exitosamente.',
                'estudiante': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'message': 'Error al registrar el estudiante.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class EstudianteDetailView(APIView):
    """Devuelve un estudiante únicamente a su apoderado propietario."""
    permission_classes = [IsAuthenticated]

    def get(self, request, estudiante_id):
        if not hasattr(request.user, 'perfil_apoderado'):
            return Response({
                'message': 'El usuario autenticado no tiene un perfil de apoderado asignado.'
            }, status=status.HTTP_403_FORBIDDEN)

        try:
            estudiante = Estudiante.objects.get(
                id=estudiante_id,
                apoderado=request.user.perfil_apoderado
            )
        except Estudiante.DoesNotExist:
            # No revela la existencia de estudiantes de otros apoderados.
            raise Http404

        return Response(EstudianteSerializer(estudiante).data, status=status.HTTP_200_OK)

    def patch(self, request, estudiante_id):
        if not hasattr(request.user, 'perfil_apoderado'):
            return Response({
                'message': 'El usuario autenticado no tiene un perfil de apoderado asignado.'
            }, status=status.HTTP_403_FORBIDDEN)

        try:
            estudiante = Estudiante.objects.get(
                id=estudiante_id,
                apoderado=request.user.perfil_apoderado
            )
        except Estudiante.DoesNotExist:
            raise Http404

        serializer = EstudianteUpdateSerializer(
            estudiante,
            data=request.data,
            partial=True
        )
        if not serializer.is_valid():
            return Response({
                'message': 'Error al actualizar el estudiante.',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response({
            'message': 'Información del estudiante actualizada.',
            'estudiante': EstudianteSerializer(estudiante).data
        }, status=status.HTTP_200_OK)


class EstudianteFotoView(APIView):
    """Entrega la foto privada solo al apoderado dueño del estudiante."""
    permission_classes = [IsAuthenticated]

    def get(self, request, estudiante_id):
        if not hasattr(request.user, 'perfil_apoderado'):
            raise Http404
        try:
            estudiante = Estudiante.objects.get(
                id=estudiante_id,
                apoderado=request.user.perfil_apoderado
            )
        except Estudiante.DoesNotExist:
            # No revela si existe un estudiante perteneciente a otra cuenta.
            raise Http404
        if not estudiante.foto:
            raise Http404

        respuesta = FileResponse(estudiante.foto.open('rb'), content_type='image/jpeg')
        respuesta['Cache-Control'] = 'private, no-store, max-age=0'
        respuesta['X-Content-Type-Options'] = 'nosniff'
        return respuesta




##RECUPERAR CONTRASEÑA
class SolicitarRecuperacionView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        email = request.data.get('email', '').strip().lower()

        if not email:
            return Response(
                {
                    'message': 'Ingresa tu correo electrónico.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        api_key = settings.RESEND_API_KEY

        if not api_key:
            return Response(
                {
                    'message':
                        'El servicio de correo no está configurado.'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        try:
            usuario = Usuario.objects.get(
                email__iexact=email
            )

        except Usuario.DoesNotExist:

            # No revelamos si el correo existe o no.
            return Response({
                'message':
                    'Si el correo está registrado, '
                    'recibirás un código de recuperación.'
            })

        # Generar código de 6 dígitos
        codigo = f'{secrets.randbelow(1000000):06d}'

        resend.api_key = api_key

        try:

            resend.Emails.send({
                'from': 'onboarding@resend.dev',
                'to': [usuario.email],
                'subject':
                    'Código para recuperar tu contraseña - Rutas Seguras',

                'html': f'''
                    <div style="
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: auto;
                        padding: 30px;
                    ">

                        <h1 style="color: #0f766e;">
                            Rutas Seguras
                        </h1>

                        <h2>
                            Recuperar contraseña
                        </h2>

                        <p>
                            Hola {usuario.first_name or ''},
                        </p>

                        <p>
                            Recibimos una solicitud para
                            recuperar tu contraseña.
                        </p>

                        <p>
                            Tu código de recuperación es:
                        </p>

                        <div style="
                            font-size: 32px;
                            font-weight: bold;
                            letter-spacing: 8px;
                            color: #173330;
                            padding: 20px;
                            text-align: center;
                            background: #e8f5f3;
                            border-radius: 12px;
                        ">
                            {codigo}
                        </div>

                        <p>
                            Este código es válido durante
                            <strong>10 minutos</strong>.
                        </p>

                        <p>
                            Si tú no solicitaste este cambio,
                            puedes ignorar este correo.
                        </p>

                        <p>
                            Tu ruta escolar, más segura. 🚌
                        </p>

                    </div>
                '''
            })

        except Exception as error:

            print(
                'Error enviando correo de recuperación:',
                error
            )

            return Response(
                {
                    'message':
                        'No se pudo enviar el correo de recuperación.'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Solo se invalida el código anterior cuando el correo se envió.
        CodigoRecuperacion.objects.filter(
            usuario=usuario,
            usado=False
        ).update(usado=True)

        CodigoRecuperacion.objects.create(
            usuario=usuario,
            codigo=codigo
        )

        return Response({
            'message':
                'Si el correo está registrado, '
                'recibirás un código de recuperación.'
        })


class ConfirmarRecuperacionView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        email = request.data.get(
            'email', ''
        ).strip().lower()

        codigo = request.data.get(
            'codigo', ''
        ).strip()

        nueva_password = request.data.get(
            'nueva_password', ''
        )

        if not email or not codigo or not nueva_password:

            return Response(
                {
                    'message':
                        'Correo, código y nueva contraseña '
                        'son obligatorios.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(codigo) != 6 or not codigo.isdigit():

            return Response(
                {
                    'message':
                        'El código debe tener 6 dígitos.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(nueva_password) < 8:

            return Response(
                {
                    'message':
                        'La contraseña debe tener al menos '
                        '8 caracteres.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:

            usuario = Usuario.objects.get(
                email__iexact=email
            )

        except Usuario.DoesNotExist:

            return Response(
                {
                    'message':
                        'Código de recuperación inválido.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        recuperacion = CodigoRecuperacion.objects.filter(
            usuario=usuario,
            codigo=codigo,
            usado=False
        ).order_by('-creado_en').first()

        if not recuperacion:

            return Response(
                {
                    'message':
                        'El código de recuperación es incorrecto.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not recuperacion.esta_vigente():

            return Response(
                {
                    'message':
                        'El código de recuperación ha expirado.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Cambiar contraseña usando el sistema de hash de Django
        usuario.set_password(nueva_password)
        usuario.save()

        # Marcar código como utilizado
        recuperacion.usado = True
        recuperacion.save(
            update_fields=['usado']
        )

        # Invalidar cualquier otro código pendiente
        CodigoRecuperacion.objects.filter(
            usuario=usuario,
            usado=False
        ).update(usado=True)

        return Response({
            'message':
                'Contraseña actualizada correctamente.'
        })


class RegistrarFCMTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('token', '').strip()
        device_name = request.data.get('device_name', 'Dispositivo Móvil').strip()

        if not token:
            return Response({'message': 'El token FCM es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        fcm_token, created = FCMToken.objects.update_or_create(
            token=token,
            defaults={
                'usuario': request.user,
                'device_name': device_name,
                'is_active': True
            }
        )

        return Response({
            'message': 'Token FCM registrado exitosamente.',
            'token': FCMTokenSerializer(fcm_token).data
        }, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)


class NotificacionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'perfil_apoderado'):
            return Response({'message': 'Solo apoderados tienen bandeja de notificaciones.'}, status=status.HTTP_403_FORBIDDEN)

        notificaciones = Notificacion.objects.filter(apoderado=request.user.perfil_apoderado)
        no_leidas_count = notificaciones.filter(leido=False).count()
        serializer = NotificacionSerializer(notificaciones, many=True)

        return Response({
            'no_leidas_count': no_leidas_count,
            'notificaciones': serializer.data
        }, status=status.HTTP_200_OK)


class MarcarNotificacionLeidaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notificacion_id):
        if not hasattr(request.user, 'perfil_apoderado'):
            return Response({'message': 'Permiso denegado.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            notificacion = Notificacion.objects.get(
                id=notificacion_id,
                apoderado=request.user.perfil_apoderado
            )
            notificacion.leido = True
            notificacion.save(update_fields=['leido'])
            return Response({'message': 'Notificación marcada como leída.'}, status=status.HTTP_200_OK)
        except Notificacion.DoesNotExist:
            raise Http404


class MarcarTodasNotificacionesLeidasView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, 'perfil_apoderado'):
            return Response({'message': 'Permiso denegado.'}, status=status.HTTP_403_FORBIDDEN)

        Notificacion.objects.filter(
            apoderado=request.user.perfil_apoderado,
            leido=False
        ).update(leido=True)

        return Response({'message': 'Todas las notificaciones han sido marcadas como leídas.'}, status=status.HTTP_200_OK)


# ==========================================
# ACCIONES REALES DEL SISTEMA QUE GENERAN PUSH
# ==========================================

class RutaIniciarView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        apoderados = PerfilApoderado.objects.all()
        cnt = 0
        for apoderado in apoderados:
            crear_y_despachar_notificacion(
                apoderado=apoderado,
                titulo="🚌 Ruta Iniciada",
                mensaje="El furgón escolar ha comenzado su recorrido habitual.",
                tipo="ruta_iniciada"
            )
            cnt += 1

        return Response({
            'message': 'Ruta iniciada exitosamente.',
            'notificados': cnt
        }, status=status.HTTP_200_OK)


class RutaEscanearQRView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        estudiante_id = request.data.get('estudiante_id')
        rut = request.data.get('rut', '').strip()
        accion = request.data.get('accion', 'abordar')

        estudiante = None
        if estudiante_id:
            estudiante = Estudiante.objects.filter(id=estudiante_id).first()
        elif rut:
            estudiante = Estudiante.objects.filter(rut=rut).first()

        if not estudiante:
            estudiante = Estudiante.objects.first()

        if not estudiante:
            return Response({'message': 'Estudiante no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if accion == 'abordar':
            titulo = "🎒 Estudiante Abordó"
            mensaje = f"¡{estudiante.nombre} {estudiante.apellido} ha abordado el furgón escolar!"
            tipo = "estudiante_abordo"
        else:
            titulo = "🏠 Estudiante Llegó"
            mensaje = f"¡{estudiante.nombre} {estudiante.apellido} ha llegado a su destino!"
            tipo = "estudiante_llego"

        notificacion = crear_y_despachar_notificacion(
            apoderado=estudiante.apoderado,
            titulo=titulo,
            mensaje=mensaje,
            tipo=tipo,
            estudiante=estudiante
        )

        return Response({
            'message': f"Escaneo registrado: {accion}",
            'estudiante': f"{estudiante.nombre} {estudiante.apellido}",
            'notificacion': NotificacionSerializer(notificacion).data
        }, status=status.HTTP_200_OK)


class RutaFinalizarView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        apoderados = PerfilApoderado.objects.all()
        cnt = 0
        for apoderado in apoderados:
            crear_y_despachar_notificacion(
                apoderado=apoderado,
                titulo="🏁 Ruta Finalizada",
                mensaje="El furgón escolar ha completado todo el recorrido de hoy.",
                tipo="ruta_finalizada"
            )
            cnt += 1

        return Response({
            'message': 'Ruta finalizada exitosamente.',
            'notificados': cnt
        }, status=status.HTTP_200_OK)


class EmergenciaCrearView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        detalle = request.data.get('detalle', 'Imprevisto en el recorrido').strip()
        apoderados = PerfilApoderado.objects.all()
        cnt = 0
        for apoderado in apoderados:
            crear_y_despachar_notificacion(
                apoderado=apoderado,
                titulo="🚨 ALERTA DE EMERGENCIA",
                mensaje=f"El conductor reporta una alerta en la ruta: {detalle}",
                tipo="emergencia"
            )
            cnt += 1

        return Response({
            'message': 'Alerta de emergencia emitida y notificada a los apoderados.',
            'notificados': cnt
        }, status=status.HTTP_200_OK)


class AvisoSistemaView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        titulo = request.data.get('titulo', 'Aviso del Sistema').strip()
        mensaje = request.data.get('mensaje', 'Estimado apoderado, se recuerda mantener actualizada la información de retiro.').strip()

        apoderados = PerfilApoderado.objects.all()
        cnt = 0
        for apoderado in apoderados:
            crear_y_despachar_notificacion(
                apoderado=apoderado,
                titulo=f"📢 {titulo}",
                mensaje=mensaje,
                tipo="aviso_sistema"
            )
            cnt += 1

        return Response({
            'message': 'Aviso del sistema despachado a los apoderados.',
            'notificados': cnt
        }, status=status.HTTP_200_OK)


class FurgonListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        furgones = Furgon.objects.all().order_by('-id')
        serializer = FurgonSerializer(furgones, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = FurgonSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FurgonDetailView(APIView):
    permission_classes = [AllowAny]

    def get_object(self, pk):
        try:
            return Furgon.objects.get(pk=pk)
        except Furgon.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        furgon = self.get_object(pk)
        serializer = FurgonSerializer(furgon)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        furgon = self.get_object(pk)
        serializer = FurgonSerializer(furgon, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        furgon = self.get_object(pk)
        furgon.delete()
        return Response({'message': 'Furgón eliminado.'}, status=status.HTTP_204_NO_CONTENT)


class RutaListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        rutas = Ruta.objects.all().order_by('-id')
        serializer = RutaSerializer(rutas, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data.copy()
        data['colegio'] = 'Escuela Bosques del Viento'
        serializer = RutaSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RutaDetailView(APIView):
    permission_classes = [AllowAny]

    def get_object(self, pk):
        try:
            return Ruta.objects.get(pk=pk)
        except Ruta.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        ruta = self.get_object(pk)
        serializer = RutaSerializer(ruta)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        ruta = self.get_object(pk)
        data = request.data.copy()
        data['colegio'] = 'Escuela Bosques del Viento'
        serializer = RutaSerializer(ruta, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        ruta = self.get_object(pk)
        ruta.delete()
        return Response({'message': 'Ruta eliminada.'}, status=status.HTTP_204_NO_CONTENT)

