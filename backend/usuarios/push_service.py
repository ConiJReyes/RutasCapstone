import logging
from typing import List, Optional
from .models import PerfilApoderado, Estudiante, Notificacion, FCMToken

logger = logging.getLogger(__name__)


def crear_y_despachar_notificacion(
    apoderado: Optional[PerfilApoderado],
    titulo: str,
    mensaje: str,
    tipo: str,
    estudiante: Optional[Estudiante] = None
) -> Optional[Notificacion]:
    """
    1. Registra la notificación en la base de datos de Django para el apoderado (si existe).
    2. Si el estudiante tiene un apoderado no pasado explícitamente, lo recupera de estudiante.apoderado.
    3. Notifica a los FCMTokens del apoderado y también a la persona delegada autorizada si existe.
    4. Maneja excepciones para evitar que errores en notificaciones rompan la acción del conductor.
    """
    if not apoderado and estudiante and hasattr(estudiante, 'apoderado'):
        apoderado = estudiante.apoderado

    notificacion = None
    if apoderado:
        try:
            notificacion = Notificacion.objects.create(
                apoderado=apoderado,
                estudiante=estudiante,
                titulo=titulo,
                mensaje=mensaje,
                tipo=tipo
            )
        except Exception as e:
            logger.error(f"Error registrando Notificacion en BD: {e}")

        try:
            fcm_tokens = FCMToken.objects.filter(usuario=apoderado.usuario, is_active=True)
            for token_obj in fcm_tokens:
                despachar_fcm_push(token_obj, titulo, mensaje, tipo, notificacion.id if notificacion else 0)
        except Exception as e:
            logger.error(f"Error despachando FCM Tokens para apoderado: {e}")

    # Notificar también a la persona autorizada (Delegado) si está registrada en el sistema
    if estudiante and estudiante.rut_persona_autorizada:
        try:
            rut_clean = estudiante.rut_persona_autorizada.replace('.', '').replace('-', '').upper()
            from .models import PerfilDelegado
            delegados = PerfilDelegado.objects.filter(rut__isnull=False)
            for del_obj in delegados:
                if del_obj.rut and del_obj.rut.replace('.', '').replace('-', '').upper() == rut_clean:
                    del_tokens = FCMToken.objects.filter(usuario=del_obj.usuario, is_active=True)
                    for t in del_tokens:
                        despachar_fcm_push(t, titulo, mensaje, tipo, notificacion.id if notificacion else 0)
        except Exception as e:
            logger.error(f"Error despachando notificación a delegado: {e}")

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
