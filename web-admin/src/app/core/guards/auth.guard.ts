import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guardián de rutas (AuthGuard)
 * Protege las rutas privadas del Dashboard.
 * Si el usuario no ha iniciado sesión válida, lo redirige a la pantalla de /login.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();
  if (authService.isAuthenticated() && user && ['ADMIN_PLATAFORMA', 'ADMIN_COLEGIO'].includes(user.role)) {
    // Restricción: ADMIN_COLEGIO no puede acceder a las rutas de gestión de colegios
    if (user.role === 'ADMIN_COLEGIO' && state.url.startsWith('/colegios')) {
      return router.createUrlTree(['/dashboard']);
    }
    return true;
  }

  // Redirigir a /login si no está autenticado o no es rol administrativo
  return router.createUrlTree(['/login']);
};
