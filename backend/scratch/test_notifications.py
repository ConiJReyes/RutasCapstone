import sys
import os

sys.path.insert(0, os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

import json
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from usuarios.models import (
    Usuario, PerfilApoderado, PerfilConductor, PerfilDelegado, Estudiante, Notificacion, FCMToken
)
from usuarios.push_service import crear_y_despachar_notificacion
from usuarios.views import (
    NotificacionListView, MarcarNotificacionLeidaView, MarcarTodasNotificacionesLeidasView,
    EliminarNotificacionView, EliminarTodasNotificacionesView
)

print("="*60)
print("INICIANDO VERIFICACION DE ELIMINACION DE NOTIFICACIONES")
print("="*60)

User = get_user_model()
user_apod = User.objects.filter(email="apod_test_notif@example.com").first()
perf_apod = PerfilApoderado.objects.filter(usuario=user_apod).first()

factory = APIRequestFactory()

# Crear notificaciones de prueba
notif1 = Notificacion.objects.create(apoderado=perf_apod, titulo="Test Eliminar 1", mensaje="Prueba 1", tipo="aviso_sistema")
notif2 = Notificacion.objects.create(apoderado=perf_apod, titulo="Test Eliminar 2", mensaje="Prueba 2", tipo="aviso_sistema")

cnt_antes = Notificacion.objects.filter(apoderado=perf_apod).count()

# TEST A: Eliminar Notificación Individual
print("\n--- TEST A: Eliminar Notificación Individual ---")
req1 = factory.delete(f'/api/notificaciones/{notif1.id}/eliminar/')
force_authenticate(req1, user=user_apod)
res1 = EliminarNotificacionView.as_view()(req1, notificacion_id=notif1.id)
print(f"Respuesta Backend: {res1.status_code} -> {res1.data.get('message')}")
cnt_despues_ind = Notificacion.objects.filter(apoderado=perf_apod).count()
assert res1.status_code == 200, f"Error en status {res1.status_code}"
assert cnt_despues_ind == cnt_antes - 1, "Error: No se eliminó la notificación individual"
print("[OK] Test A PASO: Notificación individual eliminada de la BD.")

# TEST B: Eliminar Todas las Notificaciones
print("\n--- TEST B: Eliminar Todas las Notificaciones ---")
req2 = factory.delete('/api/notificaciones/eliminar-todas/')
force_authenticate(req2, user=user_apod)
res2 = EliminarTodasNotificacionesView.as_view()(req2)
print(f"Respuesta Backend: {res2.status_code} -> {res2.data.get('message')}")
cnt_despues_todas = Notificacion.objects.filter(apoderado=perf_apod).count()
assert res2.status_code == 200, f"Error en status {res2.status_code}"
assert cnt_despues_todas == 0, "Error: No se eliminaron todas las notificaciones"
print("[OK] Test B PASO: Todas las notificaciones del usuario fueron eliminadas de su bandeja.")

print("\n"+"="*60)
print("TODAS LAS PRUEBAS DE ELIMINACION FINALIZARON EXITOSAMENTE!")
print("="*60)
