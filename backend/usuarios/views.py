from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.http import FileResponse, Http404
from django.conf import settings
from .models import Estudiante, Usuario, CodigoRecuperacion, PerfilConductor, PerfilApoderado
from .serializers import (
    RegistroApoderadoSerializer,
    RegistroConductorSerializer,
    ConductorSerializer,
    ApoderadoSerializer,
    LoginSerializer,
    UsuarioResponseSerializer,
    EstudianteSerializer,
    EstudianteUpdateSerializer
)

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
        apoderados_count = Usuario.objects.filter(rol='apoderado').count()
        return Response({
            'estudiantes': estudiantes_count,
            'conductores': conductores_count,
            'apoderados': apoderados_count,
            'furgones': 0,
            'rutas': 0
        }, status=status.HTTP_200_OK)



class ApoderadoListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        apoderados = Usuario.objects.filter(rol='apoderado').order_by('-id')
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

        nombre = request.data.get('nombre') or request.data.get('nombre_completo')
        if nombre:
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
            if 'rut' in request.data:
                perfil.rut = request.data['rut'].strip()
            if 'telefono' in request.data:
                perfil.telefono = request.data['telefono'].strip()
            perfil.save()

        return Response({
            'message': 'Apoderado actualizado exitosamente.',
            'apoderado': ApoderadoSerializer(apoderado).data
        }, status=status.HTTP_200_OK)

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
            conductor = Usuario.objects.get(id=conductor_id, rol='conductor')
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
            if Usuario.objects.filter(email=new_email).exclude(id=conductor.id).exists():
                return Response({'message': 'El correo electrónico ya está registrado.'}, status=status.HTTP_400_BAD_REQUEST)
            conductor.email = new_email
            conductor.username = new_email

        password = request.data.get('password')
        if password:
            conductor.set_password(password)

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
