from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
from .serializers import (
    RegistroApoderadoSerializer,
    LoginSerializer,
    UsuarioResponseSerializer
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
