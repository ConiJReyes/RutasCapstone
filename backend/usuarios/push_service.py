import logging
from typing import List, Optional
from .models import PerfilApoderado, Estudiante, Notificacion, FCMToken

logger = logging.getLogger(__name__)


def crear_y_despachar_notificacion(
    apoderado: PerfilApoderado,
    titulo: str,
    mensaje: str,
    tipo: str,
    estudiante: Optional[Estudiante] = None
) -> Notificacion:
    """
    1. Registra la notificación en la base de datos de Django.
    2. Busca los FCMTokens activos del usuario apoderado (soporte multidispositivo).
    3. Despacha la notificación Push nativa a cada token activo.
    4. Si un token responde como expirado/inválido, lo desmarca (is_active=False).
    """
    notificacion = Notificacion.objects.create(
        apoderado=apoderado,
        estudiante=estudiante,
        titulo=titulo,
        mensaje=mensaje,
        tipo=tipo
    )

    fcm_tokens = FCMToken.objects.filter(usuario=apoderado.usuario, is_active=True)

    for token_obj in fcm_tokens:
        despachar_fcm_push(token_obj, titulo, mensaje, tipo, notificacion.id)

    return notificacion


def despachar_fcm_push(
    token_obj: FCMToken,
    titulo: str,
    mensaje: str,
    tipo: str,
    notificacion_id: int
) -> bool:
    """
    Despacha la notificación Push al FCM Token.
    Si se detecta que el token caducó o fue anulado en el dispositivo,
    se desactiva automáticamente (is_active=False).
    """
    try:
        # Intenta usar firebase_admin si está configurado en el proyecto
        import firebase_admin
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(
                title=titulo,
                body=mensaje,
            ),
            data={
                'notificacion_id': str(notificacion_id),
                'tipo': tipo,
                'click_action': 'FLUTTER_NOTIFICATION_CLICK'
            },
            token=token_obj.token,
        )
        messaging.send(message)
        logger.info(f"Push enviado exitosamente a {token_obj.usuario.email}")
        return True

    except ImportError:
        # Si firebase_admin no está instalado o no hay credenciales activas,
        # la notificación queda registrada en BD y lista para consulta por API.
        logger.info(f"[Push Simulado/BD] Notificación '{titulo}' enviada a {token_obj.usuario.email} (token {token_obj.id})")
        return True

    except Exception as exc:
        err_str = str(exc).lower()
        if 'unregistered' in err_str or 'invalid-registration-token' in err_str or 'notfound' in err_str:
            logger.warning(f"Desactivando token de dispositivo inactivo/expirado para {token_obj.usuario.email}")
            token_obj.is_active = False
            token_obj.save(update_fields=['is_active'])
        else:
            logger.error(f"Error despachando Push a {token_obj.usuario.email}: {exc}")
        return False


def notificar_apoderados_de_estudiantes(
    estudiantes: List[Estudiante],
    titulo: str,
    mensaje_template: str,
    tipo: str
):
    """
    Notifica automáticamente a los apoderados de una lista de estudiantes.
    `mensaje_template` puede incluir `{nombre_estudiante}` si aplica.
    """
    apoderados_procesados = set()

    for est in estudiantes:
        apoderado = est.apoderado
        mensaje_personalizado = mensaje_template.format(
            nombre_estudiante=f"{est.nombre} {est.apellido}".strip()
        ) if '{nombre_estudiante}' in mensaje_template else mensaje_template

        crear_y_despachar_notificacion(
            apoderado=apoderado,
            titulo=titulo,
            mensaje=mensaje_personalizado,
            tipo=tipo,
            estudiante=est
        )
        apoderados_procesados.add(apoderado.id)

    return len(apoderados_procesados)
