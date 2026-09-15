import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guardián de rutas (AuthGuard)
 * Protege las rutas privadas del Dashboard.
 * Si el usuario no ha iniciado sesión válida, lo redirige a la pantalla de /login.
 */
export const authGuard: CanActivateFn = (route, state) => {
  // Inyección de dependencias en formato funcional (Angular moderno)
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si el usuario está autenticado, permite el acceso
  if (authService.isAuthenticated()) {
    return true;
  }

  // Si no está autenticado, redirigir automáticamente a /login
  return router.createUrlTree(['/login']);
};
