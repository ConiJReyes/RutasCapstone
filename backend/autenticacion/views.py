from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token

from django.conf import settings
from django.utils import timezone

from usuarios.models import (
    Usuario,
    CodigoRecuperacion,
)

from usuarios.serializers import (
    LoginSerializer,
    UsuarioResponseSerializer,
)

import secrets
import resend
from datetime import timedelta

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
