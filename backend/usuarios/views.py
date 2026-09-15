from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.http import Http404

from .models import (
    Usuario,
    Estudiante,
    Furgon,
    Ruta,
)

from .serializers import (
    RegistroDelegadoSerializer,
    DelegadoSerializer,
    UsuarioResponseSerializer,
)

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
        delegados = Usuario.objects.filter(rol='delegado').order_by('-id')
        serializer = DelegadoSerializer(delegados, many=True)
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
        try:
            delegado = Usuario.objects.get(id=delegado_id, rol='delegado')
        except Usuario.DoesNotExist:
            raise Http404
        return Response(DelegadoSerializer(delegado).data, status=status.HTTP_200_OK)

    def patch(self, request, delegado_id):
        try:
            delegado = Usuario.objects.get(id=delegado_id, rol='delegado')
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

        delegado.save()

        if hasattr(delegado, 'perfil_delegado'):
            perfil = delegado.perfil_delegado
            if 'rut' in request.data:
                perfil.rut = request.data['rut'].strip()
            if 'telefono' in request.data:
                perfil.telefono = request.data['telefono'].strip()
            perfil.save()

        return Response({
            'message': 'Delegado actualizado exitosamente.',
            'delegado': DelegadoSerializer(delegado).data
        }, status=status.HTTP_200_OK)

    def delete(self, request, delegado_id):
        try:
            delegado = Usuario.objects.get(id=delegado_id, rol='delegado')
        except Usuario.DoesNotExist:
            raise Http404

        delegado.delete()
        return Response({'message': 'Delegado eliminado correctamente.'}, status=status.HTTP_200_OK)


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








