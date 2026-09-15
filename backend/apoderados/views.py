from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token

from django.http import Http404
from usuarios.models import Usuario, PerfilApoderado

from usuarios.serializers import (
    RegistroApoderadoSerializer,
    ApoderadoSerializer,
    UsuarioResponseSerializer,
)



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
