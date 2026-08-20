import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Interfaz que define la estructura del usuario autenticado
 * Incluye roles y permisos específicos para el sistema.
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN';
  permissions: string[]; // Lista de permisos asignados (ej. 'MANAGE_ALL', 'VIEW_ROUTES', etc.)
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Clave utilizada para almacenar la sesión en el LocalStorage del navegador
  private readonly STORAGE_KEY = 'rutas_seguras_auth_session';

  // Credenciales estrictas del Administrador del Sistema
  private readonly ADMIN_CREDENTIALS = {
    email: 'admin@rutas-seguras.cl',
    password: 'admin1234'
  };

  // Signal reactivo para gestionar el estado del usuario en toda la aplicación
  private currentUserSignal = signal<UserProfile | null>(this.getStoredUser());

  // Propiedades públicas de sólo lectura basadas en Signals
  public readonly currentUser = this.currentUserSignal.asReadonly();
  public readonly isAuthenticated = computed(() => !!this.currentUserSignal());

  constructor(private router: Router) {}

  /**
   * Obtiene la sesión guardada en LocalStorage al recargar la página.
   */
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

  /**
   * Método de inicio de sesión verídico y estricto.
   * Valida que las credenciales coincidan exactamente con el Administrador autorizado.
   * @param email Correo electrónico ingresado
   * @param password Contraseña ingresada
   * @returns Promesa que resuelve true si es correcto o rechaza con error si es inválido
   */
  public login(email: string, password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Simula un breve tiempo de respuesta de red (300ms)
      setTimeout(() => {
        const cleanEmail = email?.trim().toLowerCase();
        const cleanPassword = password?.trim();

        // Verificación estricta de credenciales
        if (
          cleanEmail === this.ADMIN_CREDENTIALS.email &&
          cleanPassword === this.ADMIN_CREDENTIALS.password
        ) {
          // Creación del objeto de usuario con perfil y permisos de Administrador
          const adminUser: UserProfile = {
            id: 'admin-001',
            name: 'Administrador',
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

          // Guardar sesión en almacenamiento local para persistencia
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(adminUser));
          
          // Actualizar el Signal reactivo
          this.currentUserSignal.set(adminUser);
          
          resolve(true);
        } else {
          // Si las credenciales no son correctas, se rechaza la autenticación
          reject(new Error('Credenciales incorrectas. Verifique su correo o contraseña.'));
        }
      }, 300);
    });
  }

  /**
   * Verifica si el usuario actual posee un permiso específico.
   * @param permission Código de permiso a validar
   */
  public hasPermission(permission: string): boolean {
    const user = this.currentUserSignal();
    if (!user) return false;
    // Si tiene permiso general 'MANAGE_ALL' o el permiso puntual en la lista
    return user.permissions.includes('MANAGE_ALL') || user.permissions.includes(permission);
  }

  /**
   * Cierra la sesión activa, limpia el almacenamiento y redirige al Login.
   */
  public logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }
}
