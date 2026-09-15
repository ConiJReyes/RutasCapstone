from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from django.http import Http404

from usuarios.serializers import (
    ConductorSerializer,
    EstudianteSerializer,
    RegistroConductorSerializer,
)

from usuarios.models import (
    Usuario,
    PerfilConductor,
    Estudiante,
)

from usuarios.serializers import (
    ConductorSerializer,
    EstudianteSerializer,
)

from usuarios.push_service import (
    crear_y_despachar_notificacion,
    notificar_apoderados_de_estudiantes,
)

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
