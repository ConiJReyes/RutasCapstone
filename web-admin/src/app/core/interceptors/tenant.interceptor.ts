import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ColegioService } from '../services/colegio.service';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const colegioService = inject(ColegioService);

  const token = authService.getToken();
  const user = authService.currentUser();
  const selectedColegioId = colegioService.selectedColegioId();

  let headers = req.headers;

  if (token) {
    headers = headers.set('Authorization', `Token ${token}`);
  }

  // Si el usuario es ADMINISTRADOR DE PLATAFORMA (o superadmin) y ha seleccionado un colegio en el selector global
  if (user && (user.role === 'ADMIN_PLATAFORMA' || user.role === 'ADMIN')) {
    if (selectedColegioId !== null) {
      headers = headers.set('X-Colegio-ID', String(selectedColegioId));
    }
  }

  const clonedReq = req.clone({ headers });
  return next(clonedReq);
};
