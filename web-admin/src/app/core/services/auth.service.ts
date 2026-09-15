import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CONDUCTOR' | 'APODERADO';
  permissions: string[];
}

export interface BackendAuthResponse {
  message: string;
  token: string;
  usuario: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    rol: string;
    rut?: string;
    telefono?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'rutas_seguras_auth_session';
  private readonly TOKEN_KEY = 'rutas_seguras_auth_token';

  private readonly apiUrl = 'http://127.0.0.1:8000/api';

  private currentUserSignal = signal<UserProfile | null>(this.getStoredUser());

  public readonly currentUser = this.currentUserSignal.asReadonly();
  public readonly isAuthenticated = computed(() => !!this.currentUserSignal());

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  private getStoredUser(): UserProfile | null {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        return JSON.parse(storedData);
      }
    } catch (error) {
      console.error('Error al recuperar sesión guardada:', error);
    }
    return null;
  }

  public async login(email: string, password: string): Promise<boolean> {
    const cleanEmail = email?.trim().toLowerCase();
    const cleanPassword = password?.trim();

    try {
      const response = await firstValueFrom(
        this.http.post<BackendAuthResponse>(`${this.apiUrl}/auth/login/`, {
          email: cleanEmail,
          password: cleanPassword
        })
      );

      if (response && response.token && response.usuario) {
        const u = response.usuario;
        const mappedUser: UserProfile = {
          id: String(u.id),
          name: `${u.first_name} ${u.last_name}`.trim() || u.email,
          email: u.email,
          role: u.rol.toUpperCase() as 'ADMIN' | 'CONDUCTOR' | 'APODERADO',
          permissions: [
            'MANAGE_ALL',
            'CRUD_APODERADOS',
            'CRUD_CONDUCTORES',
            'CRUD_FURGONES',
            'CRUD_RUTAS',
            'CRUD_ESTUDIANTES'
          ]
        };

        localStorage.setItem(this.TOKEN_KEY, response.token);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mappedUser));
        this.currentUserSignal.set(mappedUser);
        return true;
      }
      throw new Error('Respuesta del servidor inválida');
    } catch (error: any) {
      // Fallback local en caso de credencial admin por defecto o error de red
      if (cleanEmail === 'admin@rutas-seguras.cl' && cleanPassword === 'admin1234') {
        const adminUser: UserProfile = {
          id: 'admin-001',
          name: 'Administrador Sistema',
          email: cleanEmail,
          role: 'ADMIN',
          permissions: [
            'MANAGE_ALL',
            'CRUD_APODERADOS',
            'CRUD_CONDUCTORES',
            'CRUD_FURGONES',
            'CRUD_RUTAS',
            'CRUD_ESTUDIANTES'
          ]
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(adminUser));
        this.currentUserSignal.set(adminUser);
        return true;
      }

      const mensaje = error?.error?.message || error?.error?.errors?.non_field_errors?.[0] || 'Credenciales incorrectas o servidor no disponible.';
      throw new Error(mensaje);
    }
  }

  public getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  public hasPermission(permission: string): boolean {
    const user = this.currentUserSignal();
    if (!user) return false;
    return user.permissions.includes('MANAGE_ALL') || user.permissions.includes(permission);
  }

  public logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }
}
