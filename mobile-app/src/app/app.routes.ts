import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // =========================
  // PANTALLA INICIAL
  // =========================
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

  // =========================
  // HOME
  // =========================
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.page')
        .then((m) => m.HomePage),
  },

  // =========================
  // AUTENTICACIÓN
  // =========================
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login.page')
        .then((m) => m.LoginPage),
  },

  {
    path: 'registro',
    loadComponent: () =>
      import('./pages/auth/registro/registro.page')
        .then((m) => m.RegistroPage),
  },

  {
    path: 'recuperar-password',
    loadComponent: () =>
      import('./pages/auth/recuperar-password/recuperar-password.page')
        .then((m) => m.RecuperarPasswordPage),
  },

  // =========================
  // APODERADO
  // =========================
  {
    path: 'apoderado/inicio',
    canActivate: [authGuard],
    data: { rol: 'apoderado' },
    loadComponent: () =>
      import('./pages/apoderado/inicio/inicio.page')
        .then((m) => m.InicioPage),
  },

  {
    path: 'apoderado/perfil',
    canActivate: [authGuard],
    data: { rol: 'apoderado' },
    loadComponent: () =>
      import('./pages/apoderado/perfil/perfil.page')
        .then((m) => m.PerfilPage),
  },

  {
    path: 'apoderado/notificaciones',
    canActivate: [authGuard],
    data: { rol: 'apoderado' },
    loadComponent: () =>
      import('./pages/apoderado/notificaciones/notificaciones.page')
        .then((m) => m.NotificacionesPage),
  },

  {
    path: 'apoderado/mis-hijos',
    canActivate: [authGuard],
    data: { rol: 'apoderado' },
    loadComponent: () =>
      import('./pages/apoderado/mis-hijos/mis-hijos.page')
        .then((m) => m.MisHijosPage),
  },

  {
    path: 'apoderado/detalle-hijo',
    canActivate: [authGuard],
    data: { rol: 'apoderado' },
    loadComponent: () =>
      import('./pages/apoderado/detalle-hijo/detalle-hijo.page')
        .then((m) => m.DetalleHijoPage),
  },

  {
    path: 'apoderado/seguimiento',
    canActivate: [authGuard],
    data: { rol: 'apoderado' },
    loadComponent: () =>
      import('./pages/apoderado/seguimiento/seguimiento.page')
        .then((m) => m.SeguimientoPage),
  },
  {
    path: 'apoderado/mi-qr',
    canActivate: [authGuard],
    data: { rol: 'apoderado' },
    loadComponent: () =>
      import('./pages/apoderado/mi-qr/mi-qr.page')
        .then(m => m.MiQrPage)
  },
  {
    path: 'apoderado/contrato',
    canActivate: [authGuard],
    data: { rol: 'apoderado' },
    loadComponent: () =>
      import('./pages/apoderado/contrato/contrato.page')
        .then((m) => m.ContratoPage),
  },

  {
    path: 'agregar-hijo',
    canActivate: [authGuard],
    data: { rol: 'apoderado' },
    loadComponent: () =>
      import('./pages/apoderado/agregar-hijo/agregar-hijo.page')
        .then(m => m.AgregarHijoPage)
  },

  // =========================
  // CONDUCTOR
  // =========================
  {
    path: 'conductor/inicio',
    canActivate: [authGuard],
    data: { rol: 'conductor' },
    loadComponent: () =>
      import('./pages/conductor/inicio/inicio.page')
        .then((m) => m.InicioPage),
  },

  {
    path: 'conductor/ruta-activa',
    canActivate: [authGuard],
    data: { rol: 'conductor' },
    loadComponent: () =>
      import('./pages/conductor/ruta-activa/ruta-activa.page')
        .then((m) => m.RutaActivaPage),
  },

  {
    path: 'conductor/emergencia',
    canActivate: [authGuard],
    data: { rol: 'conductor' },
    loadComponent: () =>
      import('./pages/conductor/emergencia/emergencia.page')
        .then((m) => m.EmergenciaPage),
  },

  {
    path: 'conductor/escanear-qr',
    canActivate: [authGuard],
    data: { rol: 'conductor' },
    loadComponent: () =>
      import('./pages/conductor/escanear-qr/escanear-qr.page')
        .then((m) => m.EscanearQrPage),
  },

  {
    path: 'conductor/perfil',
    canActivate: [authGuard],
    data: { rol: 'conductor' },
    loadComponent: () =>
      import('./pages/conductor/perfil/perfil.page')
        .then((m) => m.PerfilPage),
  },
];