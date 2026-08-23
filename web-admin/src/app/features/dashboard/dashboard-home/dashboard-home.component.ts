import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Interfaz para las tarjetas estadísticas del Dashboard
 */
interface StatCard {
  title: string;
  count: number;
  icon: string;
  colorClass: string;
  route: string;
}

/**
 * Componente principal del Dashboard.
 * Muestra el resumen básico con las cantidades de estudiantes, furgones, rutas, conductores y apoderados.
 */
@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss'
})
export class DashboardHomeComponent {
  // Lista de estadísticas clave a mostrar en las tarjetas del panel
  stats: StatCard[] = [
    {
      title: 'Estudiantes',
      count: 428,
      icon: 'graduation-cap',
      colorClass: 'primary',
      route: '/estudiantes'
    },
    {
      title: 'Furgones',
      count: 20,
      icon: 'bus',
      colorClass: 'emerald',
      route: '/furgones'
    },
    {
      title: 'Rutas',
      count: 24,
      icon: 'map-pin',
      colorClass: 'amber',
      route: '/rutas'
    },
    {
      title: 'Conductores',
      count: 18,
      icon: 'steering-wheel',
      colorClass: 'cyan',
      route: '/conductores'
    },
    {
      title: 'Apoderados',
      count: 395,
      icon: 'users',
      colorClass: 'purple',
      route: '/apoderados'
    }
  ];
}
