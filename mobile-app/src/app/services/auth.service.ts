import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Usuario {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  rol: string;
  rut?: string;
  telefono?: string;
  licencia_conducir?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  usuario: Usuario;
}

export interface RegistroApoderadoData {
  nombre: string;
  apellido: string;
  rut: string;
  email: string;
  telefono: string;
  password: string;
}

export interface RecuperacionResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  registrarApoderado(data: RegistroApoderadoData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/registro/`, data).pipe(
      tap(response => {
        if (response && response.token) {
          this.guardarSesion(response.token, response.usuario);
        }
      })
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login/`, { email, password }).pipe(
      tap(response => {
        if (response && response.token) {
          this.guardarSesion(response.token, response.usuario);
        }
      })
    );
  }

  solicitarRecuperacion(email: string): Observable<RecuperacionResponse> {
    return this.http.post<RecuperacionResponse>(
      `${this.apiUrl}/auth/password-reset/`,
      { email }
    );
  }

  confirmarRecuperacion(
    email: string,
    codigo: string,
    nuevaPassword: string
  ): Observable<RecuperacionResponse> {
    return this.http.post<RecuperacionResponse>(
      `${this.apiUrl}/auth/password-reset/confirm/`,
      {
        email,
        codigo,
        nueva_password: nuevaPassword
      }
    );
  }

  actualizarPerfilApoderado(id: number, data: { first_name?: string; last_name?: string; telefono?: string }): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/apoderados/${id}/`, data).pipe(
      tap(res => {
        if (res && res.apoderado) {
          const current = this.getUsuario();
          if (current) {
            current.first_name = res.apoderado.first_name || current.first_name;
            current.last_name = res.apoderado.last_name || current.last_name;
            current.telefono = res.apoderado.telefono || current.telefono;
            localStorage.setItem('user', JSON.stringify(current));
          }
        }
      })
    );
  }

  cambiarPassword(id: number, passwordActual: string, nuevaPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/apoderados/${id}/cambiar-password/`, {
      password_actual: passwordActual,
      nueva_password: nuevaPassword
    });
  }

  guardarSesion(token: string, usuario: Usuario): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(usuario));
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getUsuario(): Usuario | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }
}
