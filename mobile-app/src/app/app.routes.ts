import { Routes } from '@angular/router';

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
    loadComponent: () =>
      import('./pages/apoderado/inicio/inicio.page')
        .then((m) => m.InicioPage),
  },

  {
    path: 'apoderado/mis-hijos',
    loadComponent: () =>
      import('./pages/apoderado/mis-hijos/mis-hijos.page')
        .then((m) => m.MisHijosPage),
  },

  {
    path: 'apoderado/detalle-hijo',
    loadComponent: () =>
      import('./pages/apoderado/detalle-hijo/detalle-hijo.page')
        .then((m) => m.DetalleHijoPage),
  },

  {
    path: 'apoderado/seguimiento',
    loadComponent: () =>
      import('./pages/apoderado/seguimiento/seguimiento.page')
        .then((m) => m.SeguimientoPage),
  },
  {
    path: 'apoderado/mi-qr',
    loadComponent: () =>
      import('./pages/apoderado/mi-qr/mi-qr.page')
        .then(m => m.MiQrPage)
  },


  // =========================
  // CONDUCTOR
  // =========================
  {
    path: 'conductor/inicio',
    loadComponent: () =>
      import('./pages/conductor/inicio/inicio.page')
        .then((m) => m.InicioPage),
  },

  {
    path: 'conductor/ruta-activa',
    loadComponent: () =>
      import('./pages/conductor/ruta-activa/ruta-activa.page')
        .then((m) => m.RutaActivaPage),
  },

  {
    path: 'conductor/emergencia',
    loadComponent: () =>
      import('./pages/conductor/emergencia/emergencia.page')
        .then((m) => m.EmergenciaPage),
  },

  {
    path: 'conductor/escanear-qr',
    loadComponent: () =>
      import('./pages/conductor/escanear-qr/escanear-qr.page')
        .then((m) => m.EscanearQrPage),
  },
  {
    path: 'agregar-hijo',
    loadComponent: () => import('./pages/apoderado/agregar-hijo/agregar-hijo.page').then(m => m.AgregarHijoPage)
  },
];