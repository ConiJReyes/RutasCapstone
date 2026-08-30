import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { DashboardLayoutComponent } from './features/dashboard/dashboard-layout.component';
import { DashboardHomeComponent } from './features/dashboard/dashboard-home/dashboard-home.component';
import { ModulePlaceholderComponent } from './features/placeholders/module-placeholder.component';
import { authGuard } from './core/guards/auth.guard';

// Conductores
import { ConductorListaComponent } from './features/conductor/conductor-lista/conductor-lista.component';
import { ConductorFormComponent } from './features/conductor/conductor-form/conductor-form.component';

// Apoderados
import { ApoderadoListaComponent } from './features/apoderado/apoderado-lista/apoderado-lista.component';
import { ApoderadoFormComponent } from './features/apoderado/apoderado-form/apoderado-form.component';

// Rutas
import { RutasListaComponent } from './features/rutas/rutas-lista/rutas-lista.component';
import { RutasFormComponent } from './features/rutas/rutas-form/rutas-form.component';

// Furgones
import { FurgonesListaComponent } from './features/furgones/furgones-lista/furgones-lista.component';
import { FurgonesFormComponent } from './features/furgones/furgones-form/furgones-form.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardHomeComponent
      },
      // Conductores
      { path: 'conductores', component: ConductorListaComponent },
      { path: 'conductores/nuevo', component: ConductorFormComponent },
      { path: 'conductores/editar/:id', component: ConductorFormComponent },
      
      // Apoderados
      { path: 'apoderados', component: ApoderadoListaComponent },
      { path: 'apoderados/nuevo', component: ApoderadoFormComponent },
      { path: 'apoderados/editar/:id', component: ApoderadoFormComponent },

      // Rutas
      { path: 'rutas', component: RutasListaComponent },
      { path: 'rutas/nuevo', component: RutasFormComponent },
      { path: 'rutas/editar/:id', component: RutasFormComponent },

      // Furgones
      { path: 'furgones', component: FurgonesListaComponent },
      { path: 'furgones/nuevo', component: FurgonesFormComponent },
      { path: 'furgones/editar/:id', component: FurgonesFormComponent },

      // Otros
      { path: 'estudiantes', component: ModulePlaceholderComponent }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];