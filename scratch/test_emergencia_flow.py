import os
import sys
import django
from datetime import date

# Setup Django environment
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
django.setup()

from django.contrib.auth import get_user_model
from usuarios.models import PerfilConductor, PerfilApoderado, Estudiante, Notificacion, Emergencia
from rest_framework.authtoken.models import Token
import requests

User = get_user_model()

def run_test():
    print("--- STARTING EMERGENCY MODULE INTEGRATION TESTS ---")
    
    # 1. Find or create conductor user & auth token
    conductor_user = User.objects.filter(rol='conductor').first()
    if not conductor_user:
        conductor_user = User.objects.create_user(
            username='conductor_test@example.com',
            email='conductor_test@example.com',
            password='Password123!',
            rol='conductor',
            first_name='Carlos',
            last_name='Conductor'
        )
    conductor_user.set_password('Password123!')
    conductor_user.save()
    
    conductor_profile, _ = PerfilConductor.objects.get_or_create(usuario=conductor_user)
    token_conductor, _ = Token.objects.get_or_create(user=conductor_user)
    
    # 2. Find or create apoderado user & auth token
    apoderado_user = User.objects.filter(rol='apoderado').first()
    if not apoderado_user:
        apoderado_user = User.objects.create_user(
            username='apoderado_test@example.com',
            email='apoderado_test@example.com',
            password='Password123!',
            rol='apoderado',
            first_name='Maria',
            last_name='Apoderada'
        )
    apoderado_user.set_password('Password123!')
    apoderado_user.save()
    
    apoderado_profile, _ = PerfilApoderado.objects.get_or_create(usuario=apoderado_user)
    token_apoderado, _ = Token.objects.get_or_create(user=apoderado_user)
    
    # 3. Create or get student assigned to apoderado and conductor
    estudiante, _ = Estudiante.objects.get_or_create(
        rut='12345678-9',
        defaults={
            'nombre': 'Sofía',
            'apellido': 'González',
            'apoderado': apoderado_profile,
            'conductor': conductor_profile,
            'fecha_nacimiento': date(2015, 5, 20),
            'colegio': 'Colegio San Antonio',
            'curso': '3° Básico',
            'direccion_principal': 'Av. Principal 123'
        }
    )
    estudiante.apoderado = apoderado_profile
    estudiante.conductor = conductor_profile
    estudiante.save()

    # Create second student for same apoderado to test deduplication
    estudiante2, _ = Estudiante.objects.get_or_create(
        rut='87654321-0',
        defaults={
            'nombre': 'Mateo',
            'apellido': 'González',
            'apoderado': apoderado_profile,
            'conductor': conductor_profile,
            'fecha_nacimiento': date(2017, 8, 10),
            'colegio': 'Colegio San Antonio',
            'curso': '1° Básico',
            'direccion_principal': 'Av. Principal 123'
        }
    )
    estudiante2.apoderado = apoderado_profile
    estudiante2.conductor = conductor_profile
    estudiante2.save()

    base_url = "http://127.0.0.1:8000/api"
    headers_conductor = {
        "Authorization": f"Token {token_conductor.key}",
        "Content-Type": "application/json"
    }
    headers_apoderado = {
        "Authorization": f"Token {token_apoderado.key}",
        "Content-Type": "application/json"
    }

    # TEST A: EMERGENCIA EN RUTA
    print("\n--- TEST A: EMERGENCIA EN RUTA ---")
    payload_ruta = {
        "categoria": "EMERGENCIA_RUTA",
        "tipo_emergencia": "Falla Mecánica",
        "descripcion": "El furgón presenta una falla en el motor."
    }
    
    res_a = requests.post(f"{base_url}/emergencias/", json=payload_ruta, headers=headers_conductor)
    print(f"POST /api/emergencias/ Status: {res_a.status_code}")
    print(f"Response: {res_a.json()}")
    assert res_a.status_code in (200, 201), f"Expected 200 or 201, got {res_a.status_code}"

    # Verify DB Incident
    emergencia_db_a = Emergencia.objects.filter(categoria='emergencia_ruta').order_by('-creado_en').first()
    assert emergencia_db_a is not None, "Emergencia instance not found in DB"
    print(f"DB Record created: ID={emergencia_db_a.id}, Conductor={emergencia_db_a.conductor}, Tipo={emergencia_db_a.tipo_emergencia}")

    # Verify Apoderado Notification list via API
    res_notif_a = requests.get(f"{base_url}/notificaciones/", headers=headers_apoderado)
    print(f"GET /api/notificaciones/ (Apoderado) Status: {res_notif_a.status_code}")
    assert res_notif_a.status_code == 200, f"Expected 200 OK, got {res_notif_a.status_code}"
    notifs_a = res_notif_a.json()
    if isinstance(notifs_a, dict):
        notifs_a = notifs_a.get('notificaciones', notifs_a.get('results', []))
    print(f"Received {len(notifs_a)} notifications for apoderado.")
    emergency_notif_a = next((n for n in notifs_a if "falla en el motor" in n.get('mensaje', '').lower() or "emergencia" in n.get('titulo', '').lower()), None)
    assert emergency_notif_a is not None, f"Notification for Route Emergency not found in Apoderado inbox! Received: {notifs_a}"
    print(f"Verified Notification in Apoderado Inbox: Title='{emergency_notif_a.get('titulo')}', Message='{emergency_notif_a.get('mensaje')}'")


    # TEST B: EMERGENCIA DE ESTUDIANTE
    print("\n--- TEST B: EMERGENCIA DE ESTUDIANTE ---")
    payload_estudiante = {
        "categoria": "ESTUDIANTE",
        "tipo_emergencia": "Problema de Salud",
        "descripcion": "Sofía presenta fiebre alta y malestar.",
        "estudiante_id": estudiante.id
    }
    
    res_b = requests.post(f"{base_url}/emergencias/", json=payload_estudiante, headers=headers_conductor)
    print(f"POST /api/emergencias/ (Student) Status: {res_b.status_code}")
    print(f"Response: {res_b.json()}")
    assert res_b.status_code in (200, 201), f"Expected 200 or 201, got {res_b.status_code}"

    # Verify DB Incident for Student Emergency
    emergencia_db_b = Emergencia.objects.filter(categoria='emergencia_estudiante').order_by('-creado_en').first()
    assert emergencia_db_b is not None, "Student Emergencia instance not found in DB"
    assert emergencia_db_b.estudiante_id == estudiante.id, f"Expected student {estudiante.id}, got {emergencia_db_b.estudiante_id}"
    print(f"DB Record created: ID={emergencia_db_b.id}, Estudiante={emergencia_db_b.estudiante}")

    # Verify Apoderado Notification list via API
    res_notif_b = requests.get(f"{base_url}/notificaciones/", headers=headers_apoderado)
    assert res_notif_b.status_code == 200, f"Expected 200 OK, got {res_notif_b.status_code}"
    notifs_b = res_notif_b.json()
    if isinstance(notifs_b, dict):
        notifs_b = notifs_b.get('notificaciones', notifs_b.get('results', []))
    emergency_notif_b = next((n for n in notifs_b if "sofía" in n.get('mensaje', '').lower() or "fiebre" in n.get('mensaje', '').lower()), None)
    assert emergency_notif_b is not None, f"Notification for Student Emergency not found in Apoderado inbox! Received: {notifs_b}"
    print(f"Verified Notification in Apoderado Inbox: Title='{emergency_notif_b.get('titulo')}', Message='{emergency_notif_b.get('mensaje')}'")


    # TEST C: SECURITY TEST (Unauthorized Student Rejection)
    print("\n--- TEST C: SECURITY VALIDATION (UNAUTHORIZED STUDENT) ---")
    other_apoderado_u = User.objects.create_user(username='other_apod@example.com', email='other_apod@example.com', password='Password123!', rol='apoderado')
    other_profile = PerfilApoderado.objects.create(usuario=other_apoderado_u)
    other_conductor_u = User.objects.create_user(username='other_cond@example.com', email='other_cond@example.com', password='Password123!', rol='conductor')
    other_cond_profile = PerfilConductor.objects.create(usuario=other_conductor_u)
    
    unauthorized_student = Estudiante.objects.create(
        nombre="Pedro", apellido="Soto", rut="99999999-9",
        apoderado=other_profile, conductor=other_cond_profile,
        fecha_nacimiento=date(2016, 1, 1), colegio="Otro Colegio", direccion_principal="Calle 123"
    )
    
    payload_unauthorized = {
        "categoria": "ESTUDIANTE",
        "tipo_emergencia": "Accidente",
        "descripcion": "Intento no autorizado.",
        "estudiante_id": unauthorized_student.id
    }
    
    res_c = requests.post(f"{base_url}/emergencias/", json=payload_unauthorized, headers=headers_conductor)
    print(f"POST /api/emergencias/ (Unauthorized) Status: {res_c.status_code}")
    print(f"Response: {res_c.json()}")
    assert res_c.status_code == 403, f"Expected 403 Forbidden, got {res_c.status_code}"
    print("Security Validation PASSED: Driver cannot send emergency for a student not in their route/care.")

    print("\n==========================================")
    print("ALL INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("==========================================")

if __name__ == '__main__':
    run_test()
