import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  const usuario = authService.getUsuario();

  if (!token || !usuario) {
    router.navigate(['/login'], { replaceUrl: true });
    return false;
  }

  const requiredRole = route.data?.['rol'];
  if (requiredRole && usuario.rol !== requiredRole) {
    if (usuario.rol === 'apoderado') {
      router.navigate(['/apoderado/inicio'], { replaceUrl: true });
    } else if (usuario.rol === 'conductor') {
      router.navigate(['/conductor/inicio'], { replaceUrl: true });
    } else {
      router.navigate(['/login'], { replaceUrl: true });
    }
    return false;
  }

  return true;
};
