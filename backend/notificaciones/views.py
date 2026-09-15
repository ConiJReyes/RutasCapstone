from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny

from django.http import Http404

from usuarios.models import (
    FCMToken,
    Notificacion,
    Estudiante,
    PerfilApoderado,
)

from usuarios.serializers import (
    FCMTokenSerializer,
    NotificacionSerializer,
)

from usuarios.push_service import (
    crear_y_despachar_notificacion,
    notificar_apoderados_de_estudiantes,
)

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
