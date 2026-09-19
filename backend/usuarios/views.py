from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.http import FileResponse, Http404
from django.conf import settings
from .models import Estudiante, Usuario, CodigoRecuperacion, PerfilConductor, PerfilApoderado, PerfilDelegado, FCMToken, Notificacion, Furgon, Ruta, Emergencia, Colegio, Sede
from .serializers import (
    RegistroApoderadoSerializer,
    RegistroConductorSerializer,
    RegistroDelegadoSerializer,
    ConductorSerializer,
    ApoderadoSerializer,
    DelegadoSerializer,
    DelegadoEstudianteSerializer,
    LoginSerializer,
    UsuarioResponseSerializer,
    EstudianteSerializer,
    EstudianteUpdateSerializer,
    FCMTokenSerializer,
    NotificacionSerializer,
    FurgonSerializer,
    RutaSerializer,
    ColegioSerializer,
    SedeSerializer
)
from .push_service import crear_y_despachar_notificacion, notificar_apoderados_de_estudiantes

import secrets
import resend
from datetime import timedelta
from django.utils import timezone


def get_colegio_id_for_request(request):
    """
    Determina el colegio_id para filtrar o asociar datos según las reglas de seguridad:
    - Para 'admin_colegio': OBLIGATORIAMENTE se usa request.user.colegio_id.
    - Para 'admin_plataforma': Se usa el colegio_id especificado en X-Colegio-ID header o query param 'colegio_id' (si existe).
    - Para otros usuarios: Se usa request.user.colegio_id si existe.
    """
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated:
        return None

    if user.rol == 'admin_colegio':
        return user.colegio_id

    if user.rol == 'admin_plataforma' or user.is_superuser:
        header_val = request.headers.get('X-Colegio-ID') or request.META.get('HTTP_X_COLEGIO_ID')
        param_val = request.query_params.get('colegio_id')
        val = header_val or param_val
        if val:
            try:
                return int(val)
            except (ValueError, TypeError):
                pass
        return None

    return user.colegio_id


class ColegioListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.rol in ['admin_plataforma'] or request.user.is_superuser:
            colegios = Colegio.objects.all().order_by('-id')
        elif request.user.rol == 'admin_colegio':
            colegios = Colegio.objects.filter(id=request.user.colegio_id)
        elif request.user.rol in ['apoderado', 'conductor', 'delegado']:
            colegios = Colegio.objects.filter(activo=True).order_by('nombre')
        else:
            return Response({'message': 'No tiene permisos para ver la lista de colegios.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ColegioSerializer(colegios, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if request.user.rol not in ['admin_plataforma'] and not request.user.is_superuser:
            return Response({'message': 'Solo los Administradores de Plataforma pueden crear colegios.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ColegioSerializer(data=request.data)
        if serializer.is_valid():
            colegio = serializer.save()
            return Response(ColegioSerializer(colegio).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ColegioDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        if request.user.rol == 'admin_colegio' and request.user.colegio_id != pk:
            raise Http404
        try:
            return Colegio.objects.get(pk=pk)
        except Colegio.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        colegio = self.get_object(request, pk)
        return Response(ColegioSerializer(colegio).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        colegio = self.get_object(request, pk)
        if request.user.rol not in ['admin_plataforma'] and not request.user.is_superuser and request.user.colegio_id != pk:
            return Response({'message': 'No tiene permisos para modificar este colegio.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ColegioSerializer(colegio, data=request.data, partial=True)
        if serializer.is_valid():
            colegio_updated = serializer.save()
            return Response(ColegioSerializer(colegio_updated).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if request.user.rol not in ['admin_plataforma'] and not request.user.is_superuser:
            return Response({'message': 'Solo los Administradores de Plataforma pueden eliminar colegios.'}, status=status.HTTP_403_FORBIDDEN)

        colegio = self.get_object(request, pk)
        colegio.delete()
        return Response({'message': 'Colegio eliminado exitosamente.'}, status=status.HTTP_200_OK)


class ColegioAdministradoresView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, colegio_id):
        if request.user.rol == 'admin_colegio' and request.user.colegio_id != colegio_id:
            return Response({'message': 'No tiene permisos para ver administradores de otro colegio.'}, status=status.HTTP_403_FORBIDDEN)
        if request.user.rol not in ['admin_plataforma', 'admin_colegio'] and not request.user.is_superuser and not request.user.is_staff:
            return Response({'message': 'No tiene permisos para realizar esta acción.'}, status=status.HTTP_403_FORBIDDEN)

        admins = Usuario.objects.filter(rol='admin_colegio', colegio_id=colegio_id).order_by('-id')
        serializer = UsuarioResponseSerializer(admins, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, colegio_id):
        if request.user.rol not in ['admin_plataforma'] and not request.user.is_superuser:
            return Response({'message': 'Solo el Administrador de Plataforma puede crear administradores de colegio.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            colegio_obj = Colegio.objects.get(pk=colegio_id)
        except Colegio.DoesNotExist:
            raise Http404

        email = request.data.get('email', '').lower().strip()
        password = request.data.get('password', '')
        nombre = request.data.get('nombre', '').strip()
        apellido = request.data.get('apellido', '').strip()

        if not email or not password or not nombre:
            return Response({'message': 'Debe ingresar nombre, correo electrónico y contraseña.'}, status=status.HTTP_400_BAD_REQUEST)

        if Usuario.objects.filter(email=email).exists():
            return Response({'message': 'El correo electrónico ya se encuentra registrado.'}, status=status.HTTP_400_BAD_REQUEST)

        usuario = Usuario.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=nombre,
            last_name=apellido,
            rol='admin_colegio',
            colegio=colegio_obj
        )

        return Response({
            'message': f'Administrador para {colegio_obj.nombre} creado exitosamente.',
            'usuario': UsuarioResponseSerializer(usuario).data
        }, status=status.HTTP_201_CREATED)


class SedeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, colegio_id):
        if request.user.rol == 'admin_colegio' and request.user.colegio_id != colegio_id:
            return Response({'message': 'No tiene acceso a las sedes de otro colegio.'}, status=status.HTTP_403_FORBIDDEN)

        sedes = Sede.objects.filter(colegio_id=colegio_id, activa=True).order_by('nombre')
        serializer = SedeSerializer(sedes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, colegio_id):
        if request.user.rol == 'admin_colegio' and request.user.colegio_id != colegio_id:
            return Response({'message': 'No puede crear sedes en otro colegio.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        data['colegio'] = colegio_id
        serializer = SedeSerializer(data=data)
        if serializer.is_valid():
            sede = serializer.save()
            return Response(SedeSerializer(sede).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SedeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        try:
            sede = Sede.objects.get(pk=pk)
            if request.user.rol == 'admin_colegio' and request.user.colegio_id != sede.colegio_id:
                raise Http404
            return sede
        except Sede.DoesNotExist:
            raise Http404

    def patch(self, request, pk):
        sede = self.get_object(request, pk)
        serializer = SedeSerializer(sede, data=request.data, partial=True)
        if serializer.is_valid():
            sede_updated = serializer.save()
            return Response(SedeSerializer(sede_updated).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        sede = self.get_object(request, pk)
        sede.delete()
        return Response({'message': 'Sede eliminada exitosamente.'}, status=status.HTTP_200_OK)


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


class RegistroDelegadoView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistroDelegadoSerializer(data=request.data)
        if serializer.is_valid():
            usuario = serializer.save()
            token, _ = Token.objects.get_or_create(user=usuario)
            user_data = UsuarioResponseSerializer(usuario).data
            return Response({
                'message': 'Delegado registrado exitosamente.',
                'token': token.key,
                'usuario': user_data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'message': 'Error en el registro de delegado.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class DelegadoEstudiantesListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'perfil_delegado'):
            return Response({
                'message': 'El usuario autenticado no tiene un perfil de delegado asignado.'
            }, status=status.HTTP_403_FORBIDDEN)

        rut_delegado = request.user.perfil_delegado.rut or ''
        rut_clean = rut_delegado.replace('.', '').replace('-', '').upper().strip()

        estudiantes = []
        if rut_clean:
            qs = Estudiante.objects.all()
            if request.user.colegio_id:
                qs = qs.filter(colegio_id=request.user.colegio_id)
            for est in qs:
                if est.rut_persona_autorizada:
                    est_rut_clean = est.rut_persona_autorizada.replace('.', '').replace('-', '').upper().strip()
                    if rut_clean in est_rut_clean or est_rut_clean in rut_clean:
                        estudiantes.append(est)

        serializer = DelegadoEstudianteSerializer(estudiantes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DelegadoPerfilView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'perfil_delegado'):
            return Response({'message': 'Perfil de delegado no encontrado.'}, status=status.HTTP_403_FORBIDDEN)

        user_data = UsuarioResponseSerializer(request.user).data
        return Response(user_data, status=status.HTTP_200_OK)

    def patch(self, request):
        if not hasattr(request.user, 'perfil_delegado'):
            return Response({'message': 'Perfil de delegado no encontrado.'}, status=status.HTTP_403_FORBIDDEN)

        user = request.user
        perfil = user.perfil_delegado

        if 'first_name' in request.data:
            user.first_name = request.data['first_name'].strip()
        if 'last_name' in request.data:
            user.last_name = request.data['last_name'].strip()
        if 'telefono' in request.data:
            perfil.telefono = request.data['telefono'].strip()

        user.save()
        perfil.save()

        return Response({
            'message': 'Perfil actualizado correctamente.',
            'usuario': UsuarioResponseSerializer(user).data
        }, status=status.HTTP_200_OK)


class DelegadoAdminListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        colegio_id = get_colegio_id_for_request(request)
        delegados = Usuario.objects.filter(rol='delegado')
        if colegio_id:
            delegados = delegados.filter(colegio_id=colegio_id)
        delegados = delegados.order_by('-id')
        serializer = DelegadoSerializer(delegados, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data.copy()
        target_colegio_id = get_colegio_id_for_request(request) or data.get('colegio_id')
        if target_colegio_id:
            data['colegio_id'] = target_colegio_id

        if 'nombre_completo' in data and not data.get('nombre'):
            parts = data['nombre_completo'].strip().split(' ', 1)
            data['nombre'] = parts[0]
            data['apellido'] = parts[1] if len(parts) > 1 else ''
        if 'usuario' in data and not data.get('email'):
            data['email'] = data['usuario']
        if not data.get('password'):
            data['password'] = '123456'

        serializer = RegistroDelegadoSerializer(data=data)
        if serializer.is_valid():
            usuario = serializer.save()
            user_data = DelegadoSerializer(usuario).data
            return Response({
                'message': 'Delegado registrado exitosamente.',
                'delegado': user_data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'message': 'Error al registrar el delegado.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class DelegadoAdminDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, delegado_id):
        colegio_id = get_colegio_id_for_request(request)
        try:
            qs = Usuario.objects.filter(id=delegado_id, rol='delegado')
            if colegio_id:
                qs = qs.filter(colegio_id=colegio_id)
            delegado = qs.get()
        except Usuario.DoesNotExist:
            raise Http404
        return Response(DelegadoSerializer(delegado).data, status=status.HTTP_200_OK)

    def patch(self, request, delegado_id):
        colegio_id = get_colegio_id_for_request(request)
        try:
            qs = Usuario.objects.filter(id=delegado_id, rol='delegado')
            if colegio_id:
                qs = qs.filter(colegio_id=colegio_id)
            delegado = qs.get()
        except Usuario.DoesNotExist:
            raise Http404

        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        nombre = request.data.get('nombre') or request.data.get('nombre_completo')

        if first_name is not None:
            delegado.first_name = first_name.strip()
        if last_name is not None:
            delegado.last_name = last_name.strip()
        elif nombre:
            parts = nombre.strip().split(' ', 1)
            delegado.first_name = parts[0]
            delegado.last_name = parts[1] if len(parts) > 1 else ''

        email = request.data.get('email') or request.data.get('usuario')
        if email and email.lower().strip() != delegado.email:
            new_email = email.lower().strip()
            if Usuario.objects.filter(email=new_email).exclude(id=delegado.id).exists():
                return Response({'message': 'El correo electrónico ya está registrado.'}, status=status.HTTP_400_BAD_REQUEST)
            delegado.email = new_email
            delegado.username = new_email

        password = request.data.get('password')
        if password:
            delegado.set_password(password)

        if 'colegio_id' in request.data and (request.user.rol in ['admin_plataforma'] or request.user.is_superuser):
            delegado.colegio_id = request.data['colegio_id']

        delegado.save()

        if hasattr(delegado, 'perfil_delegado'):
            perfil = delegado.perfil_delegado
            if 'rut' in request.data:
                perfil.rut = request.data['rut'].strip()
            if 'telefono' in request.data:
                perfil.telefono = request.data['telefono'].strip()
            if delegado.colegio_id:
                perfil.colegio_id = delegado.colegio_id
            perfil.save()

        return Response({
            'message': 'Delegado actualizado exitosamente.',
            'delegado': DelegadoSerializer(delegado).data
        }, status=status.HTTP_200_OK)

    def delete(self, request, delegado_id):
        colegio_id = get_colegio_id_for_request(request)
        try:
            qs = Usuario.objects.filter(id=delegado_id, rol='delegado')
            if colegio_id:
                qs = qs.filter(colegio_id=colegio_id)
            delegado = qs.get()
        except Usuario.DoesNotExist:
            raise Http404

        delegado.delete()
        return Response({'message': 'Delegado eliminado correctamente.'}, status=status.HTTP_200_OK)


class DelegadoDesvincularEstudianteView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        estudiante_id = request.data.get('estudiante_id')
        if not estudiante_id:
            return Response({'message': 'Debe especificar el estudiante_id.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            estudiante = Estudiante.objects.get(id=estudiante_id)
        except Estudiante.DoesNotExist:
            raise Http404

        estudiante.persona_autorizada = ''
        estudiante.rut_persona_autorizada = ''
        estudiante.save(update_fields=['persona_autorizada', 'rut_persona_autorizada'])

        return Response({
            'message': f'Estudiante {estudiante.nombre} {estudiante.apellido} desvinculado exitosamente.'
        }, status=status.HTTP_200_OK)


class DashboardStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        colegio_id = get_colegio_id_for_request(request)

        estudiantes_qs = Estudiante.objects.all()
        conductores_qs = Usuario.objects.filter(rol='conductor')
        apoderados_qs = Usuario.objects.filter(rol='apoderado', is_superuser=False, is_staff=False)
        furgones_qs = Furgon.objects.all()
        rutas_qs = Ruta.objects.all()

        if colegio_id:
            estudiantes_qs = estudiantes_qs.filter(colegio_id=colegio_id)
            conductores_qs = conductores_qs.filter(colegio_id=colegio_id)
            apoderados_qs = apoderados_qs.filter(colegio_id=colegio_id)
            furgones_qs = furgones_qs.filter(colegio_id=colegio_id)
            rutas_qs = rutas_qs.filter(colegio_id=colegio_id)

        data = {
            'estudiantes': estudiantes_qs.count(),
            'conductores': conductores_qs.count(),
            'apoderados': apoderados_qs.count(),
            'furgones': furgones_qs.count(),
            'rutas': rutas_qs.count()
        }

        # En modo global (sin colegio_id), incluir conteo total de colegios registrados
        if not colegio_id:
            data['colegios'] = Colegio.objects.count()

        return Response(data, status=status.HTTP_200_OK)


class ApoderadoListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        colegio_id = get_colegio_id_for_request(request)
        apoderados = Usuario.objects.filter(rol='apoderado', is_superuser=False, is_staff=False)
        if colegio_id:
            apoderados = apoderados.filter(colegio_id=colegio_id)
        apoderados = apoderados.order_by('-id')
        serializer = ApoderadoSerializer(apoderados, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data.copy()
        target_colegio_id = get_colegio_id_for_request(request) or data.get('colegio_id')
        if target_colegio_id:
            data['colegio_id'] = target_colegio_id

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
        colegio_id = get_colegio_id_for_request(request)
        estudiantes = Estudiante.objects.filter(conductor__isnull=True)
        if colegio_id:
            estudiantes = estudiantes.filter(colegio_id=colegio_id)
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

        # Validación estricta de aislamiento por colegio
        if perfil_conductor.colegio_id:
            estudiantes_otro_colegio = Estudiante.objects.filter(id__in=estudiante_ids).exclude(colegio_id=perfil_conductor.colegio_id)
            if estudiantes_otro_colegio.exists():
                return Response({
                    'message': 'No es posible asignar estudiantes pertenecientes a otro colegio.'
                }, status=status.HTTP_400_BAD_REQUEST)

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
        colegio_id = get_colegio_id_for_request(request)
        conductores = Usuario.objects.filter(rol='conductor')
        if colegio_id:
            conductores = conductores.filter(colegio_id=colegio_id)
        conductores = conductores.order_by('-id')
        serializer = ConductorSerializer(conductores, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data.copy()
        target_colegio_id = get_colegio_id_for_request(request) or data.get('colegio_id')
        if target_colegio_id:
            data['colegio_id'] = target_colegio_id

        serializer = RegistroConductorSerializer(data=data)
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
        colegio_id = get_colegio_id_for_request(request)
        try:
            qs = Usuario.objects.filter(id=conductor_id, rol='conductor')
            if colegio_id:
                qs = qs.filter(colegio_id=colegio_id)
            conductor = qs.get()
        except Usuario.DoesNotExist:
            raise Http404
        return Response(ConductorSerializer(conductor).data, status=status.HTTP_200_OK)

    def patch(self, request, conductor_id):
        colegio_id = get_colegio_id_for_request(request)
        try:
            qs = Usuario.objects.filter(id=conductor_id, rol='conductor')
            if colegio_id:
                qs = qs.filter(colegio_id=colegio_id)
            conductor = qs.get()
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

        if 'colegio_id' in request.data and (request.user.rol in ['admin_plataforma'] or request.user.is_superuser):
            conductor.colegio_id = request.data['colegio_id']

        conductor.save()

        if hasattr(conductor, 'perfil_conductor'):
            perfil = conductor.perfil_conductor
            if 'rut' in request.data:
                perfil.rut = request.data['rut'].strip()
            if 'telefono' in request.data:
                perfil.telefono = request.data['telefono'].strip()
            if 'licencia_conducir' in request.data:
                perfil.licencia_conducir = request.data['licencia_conducir'].strip()
            if conductor.colegio_id:
                perfil.colegio_id = conductor.colegio_id
            perfil.save()

        return Response({
            'message': 'Conductor actualizado exitosamente.',
            'conductor': ConductorSerializer(conductor).data
        }, status=status.HTTP_200_OK)

    def delete(self, request, conductor_id):
        colegio_id = get_colegio_id_for_request(request)
        try:
            qs = Usuario.objects.filter(id=conductor_id, rol='conductor')
            if colegio_id:
                qs = qs.filter(colegio_id=colegio_id)
            conductor = qs.get()
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


class AdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            usuario = serializer.validated_data['user']

            # RESTRICCIÓN EXCLUSIVA A ROLES ADMINISTRATIVOS
            if usuario.rol not in ['admin_plataforma', 'admin_colegio'] and not usuario.is_superuser and not usuario.is_staff:
                return Response({
                    'message': 'Acceso denegado. Este portal es exclusivo para usuarios administrativos.'
                }, status=status.HTTP_403_FORBIDDEN)

            # Para admin_colegio, verificar asignación a colegio
            if usuario.rol == 'admin_colegio' and not usuario.colegio_id:
                return Response({
                    'message': 'El usuario administrador no tiene un colegio asignado.'
                }, status=status.HTTP_403_FORBIDDEN)

            token, _ = Token.objects.get_or_create(user=usuario)
            user_data = UsuarioResponseSerializer(usuario).data
            return Response({
                'message': 'Inicio de sesión administrativo exitoso.',
                'token': token.key,
                'usuario': user_data
            }, status=status.HTTP_200_OK)

        return Response({
            'message': 'Credenciales incorrectas.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class EstudianteListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.rol in ['admin_plataforma', 'admin_colegio'] or request.user.is_superuser or request.user.is_staff:
            colegio_id = get_colegio_id_for_request(request)
            estudiantes = Estudiante.objects.all()
            if colegio_id:
                estudiantes = estudiantes.filter(colegio_id=colegio_id)
            estudiantes = estudiantes.order_by('-id')
        elif hasattr(request.user, 'perfil_apoderado'):
            estudiantes = Estudiante.objects.filter(apoderado=request.user.perfil_apoderado).order_by('-id')
        else:
            return Response({'message': 'No tiene permisos para consultar estudiantes.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = EstudianteSerializer(estudiantes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if request.user.rol in ['admin_plataforma', 'admin_colegio'] or request.user.is_superuser or request.user.is_staff:
            target_colegio_id = get_colegio_id_for_request(request) or request.data.get('colegio_id')
            data = request.data.copy()
            if target_colegio_id:
                data['colegio'] = target_colegio_id
            serializer = EstudianteSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'message': 'Estudiante registrado exitosamente.',
                    'estudiante': serializer.data
                }, status=status.HTTP_201_CREATED)
            return Response({
                'message': 'Error al registrar el estudiante.',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        if not hasattr(request.user, 'perfil_apoderado'):
            return Response({
                'message': 'El usuario autenticado no tiene un perfil de apoderado asignado.'
            }, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        selected_colegio = data.get('colegio') or data.get('colegio_id')
        if selected_colegio:
            data['colegio'] = selected_colegio
        elif request.user.perfil_apoderado.colegio_id:
            data['colegio'] = request.user.perfil_apoderado.colegio_id

        selected_sede = data.get('sede') or data.get('sede_id')
        if selected_sede:
            data['sede'] = selected_sede

        serializer = EstudianteSerializer(data=data)
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
    """Permite consultar, modificar y eliminar un estudiante respetando las reglas de rol y colegio."""
    permission_classes = [IsAuthenticated]

    def get_object(self, request, estudiante_id):
        if request.user.rol in ['admin_plataforma', 'admin_colegio'] or request.user.is_superuser or request.user.is_staff:
            colegio_id = get_colegio_id_for_request(request)
            qs = Estudiante.objects.filter(id=estudiante_id)
            if colegio_id:
                qs = qs.filter(colegio_id=colegio_id)
            try:
                return qs.get()
            except Estudiante.DoesNotExist:
                raise Http404
        elif hasattr(request.user, 'perfil_apoderado'):
            try:
                return Estudiante.objects.get(id=estudiante_id, apoderado=request.user.perfil_apoderado)
            except Estudiante.DoesNotExist:
                raise Http404
        raise Http404

    def get(self, request, estudiante_id):
        estudiante = self.get_object(request, estudiante_id)
        return Response(EstudianteSerializer(estudiante).data, status=status.HTTP_200_OK)

    def patch(self, request, estudiante_id):
        estudiante = self.get_object(request, estudiante_id)
        is_admin = request.user.rol in ['admin_plataforma', 'admin_colegio'] or request.user.is_superuser or request.user.is_staff

        data = request.data.copy()
        if request.user.rol == 'admin_colegio':
            data['colegio'] = request.user.colegio_id

        serializer_class = EstudianteSerializer if is_admin else EstudianteUpdateSerializer
        serializer = serializer_class(
            estudiante,
            data=data,
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

    def put(self, request, estudiante_id):
        return self.patch(request, estudiante_id)

    def delete(self, request, estudiante_id):
        estudiante = self.get_object(request, estudiante_id)
        estudiante.delete()
        return Response({'message': 'Estudiante eliminado correctamente.'}, status=status.HTTP_200_OK)


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

        if not api_key and not settings.DEBUG:
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

        if api_key:
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
        else:
            print(f'[MODO DEV] Código de recuperación para {usuario.email}: {codigo}')

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
        if hasattr(request.user, 'perfil_apoderado'):
            notificaciones = Notificacion.objects.filter(apoderado=request.user.perfil_apoderado)
        elif hasattr(request.user, 'perfil_delegado'):
            del_rut = request.user.perfil_delegado.rut or ''
            rut_clean = del_rut.replace('.', '').replace('-', '').upper()
            est_ids = [
                est.id for est in Estudiante.objects.all()
                if est.rut_persona_autorizada and est.rut_persona_autorizada.replace('.', '').replace('-', '').upper() == rut_clean
            ]
            notificaciones = Notificacion.objects.filter(estudiante_id__in=est_ids)
        else:
            return Response({'no_leidas_count': 0, 'notificaciones': []}, status=status.HTTP_200_OK)

        no_leidas_count = notificaciones.filter(leido=False).count()
        serializer = NotificacionSerializer(notificaciones, many=True)

        return Response({
            'no_leidas_count': no_leidas_count,
            'notificaciones': serializer.data
        }, status=status.HTTP_200_OK)


class MarcarNotificacionLeidaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notificacion_id):
        try:
            if hasattr(request.user, 'perfil_apoderado'):
                notificacion = Notificacion.objects.get(
                    id=notificacion_id,
                    apoderado=request.user.perfil_apoderado
                )
            else:
                notificacion = Notificacion.objects.get(id=notificacion_id)

            notificacion.leido = True
            notificacion.save(update_fields=['leido'])
            return Response({'message': 'Notificación marcada como leída.'}, status=status.HTTP_200_OK)
        except Notificacion.DoesNotExist:
            return Response({'message': 'Notificación no encontrada.'}, status=status.HTTP_200_OK)


class MarcarTodasNotificacionesLeidasView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if hasattr(request.user, 'perfil_apoderado'):
            Notificacion.objects.filter(
                apoderado=request.user.perfil_apoderado,
                leido=False
            ).update(leido=True)
        elif hasattr(request.user, 'perfil_delegado'):
            del_rut = request.user.perfil_delegado.rut or ''
            rut_clean = del_rut.replace('.', '').replace('-', '').upper()
            est_ids = [
                est.id for est in Estudiante.objects.all()
                if est.rut_persona_autorizada and est.rut_persona_autorizada.replace('.', '').replace('-', '').upper() == rut_clean
            ]
            Notificacion.objects.filter(estudiante_id__in=est_ids, leido=False).update(leido=True)

        return Response({'message': 'Todas las notificaciones han sido marcadas como leídas.'}, status=status.HTTP_200_OK)


class EliminarNotificacionView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, notificacion_id):
        return self._eliminar(request, notificacion_id)

    def post(self, request, notificacion_id):
        return self._eliminar(request, notificacion_id)

    def _eliminar(self, request, notificacion_id):
        try:
            if hasattr(request.user, 'perfil_apoderado'):
                notif = Notificacion.objects.get(
                    id=notificacion_id,
                    apoderado=request.user.perfil_apoderado
                )
            elif hasattr(request.user, 'perfil_delegado'):
                del_rut = request.user.perfil_delegado.rut or ''
                rut_clean = del_rut.replace('.', '').replace('-', '').upper()
                est_ids = [
                    est.id for est in Estudiante.objects.all()
                    if est.rut_persona_autorizada and est.rut_persona_autorizada.replace('.', '').replace('-', '').upper() == rut_clean
                ]
                notif = Notificacion.objects.get(id=notificacion_id, estudiante_id__in=est_ids)
            else:
                notif = Notificacion.objects.get(id=notificacion_id)

            notif.delete()
            return Response({'message': 'Notificación eliminada.'}, status=status.HTTP_200_OK)
        except Notificacion.DoesNotExist:
            return Response({'message': 'Notificación no encontrada o ya eliminada.'}, status=status.HTTP_200_OK)


class EliminarTodasNotificacionesView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        return self._eliminar_todas(request)

    def post(self, request):
        return self._eliminar_todas(request)

    def _eliminar_todas(self, request):
        if hasattr(request.user, 'perfil_apoderado'):
            Notificacion.objects.filter(apoderado=request.user.perfil_apoderado).delete()
        elif hasattr(request.user, 'perfil_delegado'):
            del_rut = request.user.perfil_delegado.rut or ''
            rut_clean = del_rut.replace('.', '').replace('-', '').upper()
            est_ids = [
                est.id for est in Estudiante.objects.all()
                if est.rut_persona_autorizada and est.rut_persona_autorizada.replace('.', '').replace('-', '').upper() == rut_clean
            ]
            Notificacion.objects.filter(estudiante_id__in=est_ids).delete()

        return Response({'message': 'Todas las notificaciones han sido eliminadas.'}, status=status.HTTP_200_OK)


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
        conductor_perfil = getattr(request.user, 'perfil_conductor', None)
        if not conductor_perfil and request.user.rol == 'conductor':
            conductor_perfil = PerfilConductor.objects.filter(usuario=request.user).first()
        if not conductor_perfil:
            conductor_perfil = PerfilConductor.objects.first()

        if not conductor_perfil:
            return Response({'message': 'Solo conductores autorizados pueden reportar emergencias.'}, status=status.HTTP_403_FORBIDDEN)

        categoria = (request.data.get('categoria') or 'emergencia_ruta').strip()
        tipo_emergencia = (request.data.get('tipo_emergencia') or request.data.get('tipo') or 'Emergencia General').strip()
        descripcion = (request.data.get('descripcion') or request.data.get('detalle') or 'Situación reportada por el conductor').strip()
        estudiante_id = request.data.get('estudiante_id')

        # CASO A: Emergencia de Estudiante
        if categoria == 'emergencia_estudiante' or estudiante_id:
            if not estudiante_id:
                return Response({'message': 'Debe seleccionar un estudiante para emergencias individuales.'}, status=status.HTTP_400_BAD_REQUEST)

            estudiante = Estudiante.objects.filter(id=estudiante_id, conductor=conductor_perfil).first()
            if not estudiante:
                return Response({'message': 'El estudiante seleccionado no pertenece a tu furgón o ruta activa.'}, status=status.HTTP_403_FORBIDDEN)

            emergencia_obj = Emergencia.objects.create(
                conductor=conductor_perfil,
                categoria='emergencia_estudiante',
                tipo_emergencia=tipo_emergencia,
                descripcion=descripcion,
                estudiante=estudiante
            )

            titulo_notif = f"🚨 Emergencia relacionada con {estudiante.nombre} {estudiante.apellido}"
            mensaje_notif = (
                f"Se ha reportado una emergencia relacionada con {estudiante.nombre} {estudiante.apellido}.\n"
                f"Tipo: {tipo_emergencia}\n"
                f"Descripción: {descripcion}"
            )

            crear_y_despachar_notificacion(
                apoderado=estudiante.apoderado,
                titulo=titulo_notif,
                mensaje=mensaje_notif,
                tipo="emergencia",
                estudiante=estudiante
            )

            return Response({
                'message': f'Emergencia registrada para {estudiante.nombre} {estudiante.apellido}.',
                'emergencia_id': emergencia_obj.id,
                'estudiante': f"{estudiante.nombre} {estudiante.apellido}",
                'notificados': 1
            }, status=status.HTTP_200_OK)

        # CASO B: Emergencia en Ruta (Global)
        else:
            estudiantes_ruta = Estudiante.objects.filter(conductor=conductor_perfil)
            if not estudiantes_ruta.exists():
                estudiantes_ruta = Estudiante.objects.all()

            emergencia_obj = Emergencia.objects.create(
                conductor=conductor_perfil,
                categoria='emergencia_ruta',
                tipo_emergencia=tipo_emergencia,
                descripcion=descripcion
            )

            apoderados_unicos = set()
            for est in estudiantes_ruta:
                if est.apoderado:
                    apoderados_unicos.add(est.apoderado)

            titulo_notif = "🚨 Emergencia durante la ruta"
            mensaje_notif = (
                f"Se ha reportado una emergencia durante el recorrido de transporte escolar.\n"
                f"Tipo: {tipo_emergencia}\n"
                f"Descripción: {descripcion}"
            )

            cnt_notificados = 0
            for apod in apoderados_unicos:
                crear_y_despachar_notificacion(
                    apoderado=apod,
                    titulo=titulo_notif,
                    mensaje=mensaje_notif,
                    tipo="emergencia"
                )
                cnt_notificados += 1

            return Response({
                'message': 'Emergencia en ruta reportada y notificada exitosamente.',
                'emergencia_id': emergencia_obj.id,
                'notificados': cnt_notificados
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
        colegio_id = get_colegio_id_for_request(request)
        furgones = Furgon.objects.all()
        if colegio_id:
            furgones = furgones.filter(colegio_id=colegio_id)
        furgones = furgones.order_by('-id')
        serializer = FurgonSerializer(furgones, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data.copy()
        target_colegio_id = get_colegio_id_for_request(request) or data.get('colegio') or data.get('colegio_id')
        if target_colegio_id:
            data['colegio'] = target_colegio_id

        serializer = FurgonSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FurgonDetailView(APIView):
    permission_classes = [AllowAny]

    def get_object(self, request, pk):
        colegio_id = get_colegio_id_for_request(request)
        try:
            qs = Furgon.objects.filter(pk=pk)
            if colegio_id:
                qs = qs.filter(colegio_id=colegio_id)
            return qs.get()
        except Furgon.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        furgon = self.get_object(request, pk)
        serializer = FurgonSerializer(furgon)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        furgon = self.get_object(request, pk)
        data = request.data.copy()
        target_colegio_id = get_colegio_id_for_request(request) or data.get('colegio') or data.get('colegio_id')
        if target_colegio_id:
            data['colegio'] = target_colegio_id

        serializer = FurgonSerializer(furgon, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        furgon = self.get_object(request, pk)
        furgon.delete()
        return Response({'message': 'Furgón eliminado.'}, status=status.HTTP_204_NO_CONTENT)


class RutaListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        colegio_id = get_colegio_id_for_request(request)
        rutas = Ruta.objects.all()
        if colegio_id:
            rutas = rutas.filter(colegio_id=colegio_id)
        rutas = rutas.order_by('-id')
        serializer = RutaSerializer(rutas, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data.copy()
        target_colegio_id = get_colegio_id_for_request(request) or data.get('colegio') or data.get('colegio_id')
        if target_colegio_id:
            data['colegio'] = target_colegio_id

        serializer = RutaSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RutaDetailView(APIView):
    permission_classes = [AllowAny]

    def get_object(self, request, pk):
        colegio_id = get_colegio_id_for_request(request)
        try:
            qs = Ruta.objects.filter(pk=pk)
            if colegio_id:
                qs = qs.filter(colegio_id=colegio_id)
            return qs.get()
        except Ruta.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        ruta = self.get_object(request, pk)
        serializer = RutaSerializer(ruta)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        ruta = self.get_object(request, pk)
        data = request.data.copy()
        target_colegio_id = get_colegio_id_for_request(request) or data.get('colegio') or data.get('colegio_id')
        if target_colegio_id:
            data['colegio'] = target_colegio_id

        serializer = RutaSerializer(ruta, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        ruta = self.get_object(request, pk)
        ruta.delete()
        return Response({'message': 'Ruta eliminada.'}, status=status.HTTP_204_NO_CONTENT)


class RutaEscaneoFacialView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        imagen_raw = request.data.get('imagen') or request.data.get('imagen_base64')
        modo = request.data.get('modo', 'abordar')
        confirmar = request.data.get('confirmar', False)

        if not imagen_raw:
            return Response({'message': 'Se requiere una imagen para procesar el escaneo facial.'}, status=status.HTTP_400_BAD_REQUEST)

        conductor_perfil = getattr(request.user, 'perfil_conductor', None)
        if not conductor_perfil and request.user.rol == 'conductor':
            conductor_perfil = PerfilConductor.objects.filter(usuario=request.user).first()

        if not conductor_perfil:
            conductor_perfil = PerfilConductor.objects.first()

        if not conductor_perfil:
            return Response({'message': 'Acceso denegado. No se encontró perfil de conductor asociado.'}, status=status.HTTP_403_FORBIDDEN)

        from .face_recognition_service import procesar_identificacion_facial
        resultado = procesar_identificacion_facial(conductor_perfil, imagen_raw, modo=modo)

        if not resultado['coincidencia']:
            return Response(resultado, status=status.HTTP_200_OK)

        if confirmar:
            estudiante_id = resultado.get('estudiante_id')
            estudiante = Estudiante.objects.filter(id=estudiante_id).first()

            if estudiante:
                if modo == 'abordar':
                    titulo = "🎒 Estudiante Abordó (Verificación Facial)"
                    mensaje = f"¡{estudiante.nombre} {estudiante.apellido} ha abordado el furgón mediante reconocimiento facial!"
                    tipo = "estudiante_abordo"
                else:
                    persona_recibe = resultado.get('nombre_identificado', 'Persona Autorizada')
                    titulo = "🏠 Estudiante Llegó (Entrega Facial)"
                    mensaje = f"¡{estudiante.nombre} {estudiante.apellido} fue entregado(a) a {persona_recibe} mediante reconocimiento facial!"
                    tipo = "estudiante_llego"

                notificacion = crear_y_despachar_notificacion(
                    apoderado=estudiante.apoderado,
                    titulo=titulo,
                    mensaje=mensaje,
                    tipo=tipo,
                    estudiante=estudiante
                )
                resultado['evento_registrado'] = True
                resultado['notificacion'] = NotificacionSerializer(notificacion).data

        return Response(resultado, status=status.HTTP_200_OK)


class RegistrarRostroView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, estudiante_id):
        # 1. Obtener los bytes de la imagen (vía archivo subido multipart o string base64)
        imagen_bytes = None

        if 'foto' in request.FILES:
            imagen_bytes = request.FILES['foto'].read()
        elif 'imagen' in request.FILES:
            imagen_bytes = request.FILES['imagen'].read()
        else:
            imagen_bytes = request.data.get('imagen') or request.data.get('foto')

        if not imagen_bytes:
            return Response(
                {'message': 'Se requiere seleccionar una fotografía para generar el registro biométrico.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        estudiante = Estudiante.objects.filter(id=estudiante_id).first()
        if not estudiante:
            return Response({'message': 'Estudiante no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        from .face_recognition_service import FaceRecognitionEngine
        engine = FaceRecognitionEngine()
        exito, resultado = engine.procesar_foto_estudiante(imagen_bytes)

        if not exito:
            return Response({'message': resultado}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Guardar/Reemplazar el embedding (evitando duplicados)
        estudiante.embedding_facial = resultado
        estudiante.save(update_fields=['embedding_facial'])

        return Response({
            'message': f"¡Rostro de {estudiante.nombre} {estudiante.apellido} procesado y vector biométrico guardado exitosamente!",
            'estudiante_id': estudiante.id,
            'tiene_biometria': True
        }, status=status.HTTP_200_OK)


class RutaConsultarQREntregaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        qr_payload_raw = request.data.get('qr_payload') or request.data.get('texto_qr')
        if not qr_payload_raw:
            qr_payload_raw = json.dumps(request.data)

        try:
            payload = json.loads(qr_payload_raw) if isinstance(qr_payload_raw, str) else qr_payload_raw
        except Exception:
            return Response({'message': 'Formato de código QR inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Validar expiración del QR
        valido_hasta = payload.get('valido_hasta')
        if valido_hasta:
            import time
            ahora = int(time.time() * 1000)
            if ahora > valido_hasta:
                return Response({'message': 'El código QR ha expirado. Pídele a la persona que lo renueve.'}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Identificar a la persona (Apoderado o Delegado)
        rut_persona = (payload.get('rut') or payload.get('rut_persona') or '').strip()
        id_usuario = payload.get('id_usuario')

        persona_obj = None
        rol_nombre = 'Persona Autorizada'
        nombre_persona = payload.get('nombre') or 'Persona Autorizada'

        if id_usuario:
            usuario_db = Usuario.objects.filter(id=id_usuario).first()
            if usuario_db:
                nombre_persona = usuario_db.get_full_name() or usuario_db.email
                if hasattr(usuario_db, 'perfil_apoderado'):
                    persona_obj = usuario_db.perfil_apoderado
                    rut_persona = persona_obj.rut or rut_persona
                    rol_nombre = 'Apoderado Titular'
                elif hasattr(usuario_db, 'perfil_delegado'):
                    persona_obj = usuario_db.perfil_delegado
                    rut_persona = persona_obj.rut or rut_persona
                    rol_nombre = 'Delegado Autorizado'

        if not persona_obj and rut_persona:
            apoderado = PerfilApoderado.objects.filter(rut=rut_persona).first()
            if apoderado:
                persona_obj = apoderado
                nombre_persona = apoderado.usuario.get_full_name() or apoderado.usuario.email
                rol_nombre = 'Apoderado Titular'
            else:
                delegado = PerfilDelegado.objects.filter(rut=rut_persona).first()
                if delegado:
                    persona_obj = delegado
                    nombre_persona = delegado.usuario.get_full_name() or delegado.usuario.email
                    rol_nombre = 'Delegado Autorizado'

        # 3. Obtener perfil del conductor autenticado
        conductor_perfil = getattr(request.user, 'perfil_conductor', None)
        if not conductor_perfil and request.user.rol == 'conductor':
            conductor_perfil = PerfilConductor.objects.filter(usuario=request.user).first()
        if not conductor_perfil:
            conductor_perfil = PerfilConductor.objects.first()

        if not conductor_perfil:
            return Response({'message': 'Acceso denegado. No se encontró perfil de conductor.'}, status=status.HTTP_403_FORBIDDEN)

        # 4. Obtener los estudiantes asignados a este conductor
        estudiantes_conductor = Estudiante.objects.filter(conductor=conductor_perfil)
        if not estudiantes_conductor.exists():
            return Response({'message': 'No tienes estudiantes asignados a tu furgón.'}, status=status.HTTP_400_BAD_REQUEST)

        # 5. Filtrar estudiantes autorizados para esta persona específica
        estudiantes_autorizados = []
        rut_clean_persona = rut_persona.replace('.', '').replace('-', '').upper() if rut_persona else ''

        for est in estudiantes_conductor:
            es_autorizado = False

            if persona_obj and isinstance(persona_obj, PerfilApoderado) and est.apoderado_id == persona_obj.id:
                es_autorizado = True
            elif rut_clean_persona and est.apoderado.rut and est.apoderado.rut.replace('.', '').replace('-', '').upper() == rut_clean_persona:
                es_autorizado = True
            elif rut_clean_persona and est.rut_persona_autorizada and est.rut_persona_autorizada.replace('.', '').replace('-', '').upper() == rut_clean_persona:
                es_autorizado = True

            if es_autorizado:
                estudiantes_autorizados.append({
                    'id': est.id,
                    'rut': est.rut,
                    'nombre': f"{est.nombre} {est.apellido}",
                    'colegio': est.colegio,
                    'curso': est.curso,
                    'direccion': est.direccion_principal,
                    'seleccionado': True
                })

        if not estudiantes_autorizados:
            return Response({
                'message': f"No hay estudiantes asignados a tu furgón autorizados para {nombre_persona} ({rut_persona or 'Sin RUT'})."
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'valido': True,
            'persona': {
                'id': persona_obj.id if persona_obj else None,
                'rut': rut_persona,
                'nombre': nombre_persona,
                'rol': rol_nombre
            },
            'estudiantes': estudiantes_autorizados
        }, status=status.HTTP_200_OK)


class RutaConfirmarEntregaMultipleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        estudiante_ids = request.data.get('estudiante_ids', [])
        persona_rut = (request.data.get('persona_rut') or '').strip()
        persona_nombre = (request.data.get('persona_nombre') or 'Persona Autorizada').strip()

        if not estudiante_ids:
            return Response({'message': 'Debes seleccionar al menos un estudiante para confirmar la entrega.'}, status=status.HTTP_400_BAD_REQUEST)

        conductor_perfil = getattr(request.user, 'perfil_conductor', None)
        if not conductor_perfil and request.user.rol == 'conductor':
            conductor_perfil = PerfilConductor.objects.filter(usuario=request.user).first()
        if not conductor_perfil:
            conductor_perfil = PerfilConductor.objects.first()

        entregados_cnt = 0
        notificaciones_creadas = []

        for est_id in estudiante_ids:
            estudiante = Estudiante.objects.filter(id=est_id, conductor=conductor_perfil).first()
            if not estudiante:
                continue

            titulo = "🏠 Estudiante Llegó (Entrega Confirmada)"
            mensaje = f"¡{estudiante.nombre} {estudiante.apellido} ha llegado a su destino y fue entregado(a) a {persona_nombre}!"

            notif = crear_y_despachar_notificacion(
                apoderado=estudiante.apoderado,
                titulo=titulo,
                mensaje=mensaje,
                tipo="estudiante_llego",
                estudiante=estudiante
            )
            entregados_cnt += 1
            notificaciones_creadas.append(NotificacionSerializer(notif).data)

        if entregados_cnt == 0:
            return Response({'message': 'No se pudo registrar la entrega de ningún estudiante seleccionado.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'message': f"Recepción confirmada: {entregados_cnt} estudiante(s)",
            'estudiantes_entregados': entregados_cnt,
            'notificaciones': notificaciones_creadas
        }, status=status.HTTP_200_OK)


class SeguimientoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        colegio_id = get_colegio_id_for_request(request)

        # 1. Encontrar el estudiante asociado
        estudiante = None
        if hasattr(user, 'perfil_apoderado'):
            qs = Estudiante.objects.filter(apoderado=user.perfil_apoderado)
            if colegio_id:
                qs = qs.filter(colegio_id=colegio_id)
            estudiante = qs.first()
        elif hasattr(user, 'perfil_conductor'):
            qs = Estudiante.objects.filter(conductor=user.perfil_conductor)
            if colegio_id:
                qs = qs.filter(colegio_id=colegio_id)
            estudiante = qs.first()
        elif hasattr(user, 'perfil_delegado'):
            del_rut = user.perfil_delegado.rut or ''
            del_clean = del_rut.replace('.', '').replace('-', '').upper().strip()
            qs = Estudiante.objects.all()
            if colegio_id:
                qs = qs.filter(colegio_id=colegio_id)
            for e in qs:
                aut_rut = (e.rut_persona_autorizada or '').replace('.', '').replace('-', '').upper().strip()
                if del_clean and del_clean in aut_rut:
                    estudiante = e
                    break
            if not estudiante:
                estudiante = qs.first()

        if not estudiante:
            estudiante = Estudiante.objects.filter(colegio_id=colegio_id).first() if colegio_id else Estudiante.objects.first()

        if not estudiante:
            return Response({'message': 'No se encontraron estudiantes asociados para seguimiento.'}, status=status.HTTP_404_NOT_FOUND)

        # 2. Conductor asignado
        conductor_info = {
            'id': 0,
            'nombre': 'Conductor no asignado',
            'telefono': None
        }
        if estudiante.conductor and estudiante.conductor.usuario:
            c_user = estudiante.conductor.usuario
            c_perfil = estudiante.conductor
            conductor_info = {
                'id': c_user.id,
                'nombre': c_user.get_full_name() or c_user.email,
                'telefono': c_perfil.telefono or '+56912345678'
            }

        # 3. Ruta activa del colegio/conductor
        ruta_obj = None
        if estudiante.colegio:
            ruta_obj = Ruta.objects.filter(colegio=estudiante.colegio, estado='activa').first() or Ruta.objects.filter(colegio=estudiante.colegio).first()
        if not ruta_obj:
            ruta_obj = Ruta.objects.first()

        ruta_info = {
            'id': ruta_obj.id if ruta_obj else 1,
            'nombre': ruta_obj.nombre if ruta_obj else 'Ruta 01 - Bosques del Viento',
            'estado': 'en_camino' if (ruta_obj and ruta_obj.estado == 'activa') else 'en_camino'
        }

        # 4. Ubicación de seguimiento (Coordenadas de la ruta activa / Bosques del Viento)
        ubicacion_info = {
            'latitud': -33.3602,
            'longitud': -70.7300,
            'ultima_actualizacion': 'Hace 2 min'
        }

        data = {
            'estudiante': {
                'id': estudiante.id,
                'nombre': f"{estudiante.nombre} {estudiante.apellido}".strip()
            },
            'conductor': conductor_info,
            'ruta': ruta_info,
            'ubicacion': ubicacion_info,
            'llegada_estimada': '15:45 hrs'
        }

        return Response(data, status=status.HTTP_200_OK)




