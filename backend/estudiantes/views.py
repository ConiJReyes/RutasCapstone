from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.http import Http404, FileResponse

from usuarios.models import (
    Usuario,
    Estudiante,
    PerfilConductor,
)

from usuarios.serializers import (
    EstudianteSerializer,
    EstudianteUpdateSerializer,
    DelegadoEstudianteSerializer,
)

from usuarios.push_service import (
    crear_y_despachar_notificacion,
    notificar_apoderados_de_estudiantes,
)

class EstudianteSinAsignarListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        estudiantes = Estudiante.objects.filter(conductor__isnull=True)
        serializer = EstudianteSerializer(estudiantes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

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


#Delegados

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
            for est in Estudiante.objects.all():
                if est.rut_persona_autorizada:
                    est_rut_clean = est.rut_persona_autorizada.replace('.', '').replace('-', '').upper().strip()
                    if rut_clean in est_rut_clean or est_rut_clean in rut_clean:
                        estudiantes.append(est)

        serializer = DelegadoEstudianteSerializer(estudiantes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

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
