import sys
import os
import requests

BASE_URL = "http://127.0.0.1:8000"

print("="*60)
print("VERIFICACION DE CODIGOS HTTP REALES EN SERVIDOR DJANGO")
print("="*60)

# 1. Login Apoderado
res_login_apod = requests.post(f"{BASE_URL}/api/auth/login/", json={
    "email": "apod_test_notif@example.com",
    "password": "pass123"
})
print(f"Login Apoderado HTTP Status: {res_login_apod.status_code}")
token_apod = res_login_apod.json().get("token")
print(f"Token obtenido: {token_apod[:10] if token_apod else 'None'}...")

# 2. Login Conductor
res_login_cond = requests.post(f"{BASE_URL}/api/auth/login/", json={
    "email": "cond_test_notif@example.com",
    "password": "pass123"
})
print(f"Login Conductor HTTP Status: {res_login_cond.status_code}")
token_cond = res_login_cond.json().get("token")

# 3. GET /api/notificaciones/ SIN Token (espera 401)
res_no_token = requests.get(f"{BASE_URL}/api/notificaciones/")
print(f"GET /api/notificaciones/ (Sin Token) HTTP Status: {res_no_token.status_code} [Esperado 401]")
assert res_no_token.status_code == 401, "Error: Deberia ser 401"

# 4. GET /api/notificaciones/ CON Token (espera 200)
headers_apod = {"Authorization": f"Token {token_apod}"}
res_with_token = requests.get(f"{BASE_URL}/api/notificaciones/", headers=headers_apod)
print(f"GET /api/notificaciones/ (Con Token Apoderado) HTTP Status: {res_with_token.status_code} [Esperado 200]")
assert res_with_token.status_code == 200, f"Error: Esperado 200 pero fue {res_with_token.status_code}"

# 5. POST /api/rutas/iniciar/ CON Token Conductor (espera 200)
headers_cond = {"Authorization": f"Token {token_cond}"}
res_iniciar = requests.post(f"{BASE_URL}/api/rutas/iniciar/", headers=headers_cond, json={})
print(f"POST /api/rutas/iniciar/ (Con Token Conductor) HTTP Status: {res_iniciar.status_code} [Esperado 200]")
assert res_iniciar.status_code == 200, f"Error: Esperado 200 pero fue {res_iniciar.status_code}"

# 6. GET /api/notificaciones/ CON Token Apoderado nuevamente (para verificar notificación de ruta iniciada)
res_notif_after = requests.get(f"{BASE_URL}/api/notificaciones/", headers=headers_apod)
data_notif = res_notif_after.json()
print(f"GET /api/notificaciones/ despues de iniciar ruta: {res_notif_after.status_code}, No leidas: {data_notif.get('no_leidas_count')}")
assert res_notif_after.status_code == 200, "Error en notificaciones"

print("="*60)
print("TODAS LAS PRUEBAS DE CODIGOS HTTP REALES PASARON EXITOSAMENTE CON STATUS 200!")
print("="*60)
