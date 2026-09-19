import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription, timer, switchMap } from 'rxjs';
import { ColegioService } from '../../../core/services/colegio.service';

interface StatCard {
  key: string;
  title: string;
  count: number;
  icon: string;
  colorClass: string;
  route: string;
}

export interface DashboardStatsResponse {
  colegios?: number;
  estudiantes: number;
  conductores: number;
  apoderados: number;
  furgones: number;
  rutas: number;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss'
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
  private subscription?: Subscription;
  private readonly apiUrl = 'http://127.0.0.1:8000/api/dashboard/stats/';
  private colegioService = inject(ColegioService);
  private onColegioChangedListener = () => this.fetchStatsNow();

  stats = signal<StatCard[]>([
    {
      key: 'estudiantes',
      title: 'Estudiantes',
      count: 0,
      icon: 'graduation-cap',
      colorClass: 'primary',
      route: '/estudiantes'
    },
    {
      key: 'furgones',
      title: 'Furgones',
      count: 0,
      icon: 'bus',
      colorClass: 'emerald',
      route: '/furgones'
    },
    {
      key: 'rutas',
      title: 'Rutas',
      count: 0,
      icon: 'map-pin',
      colorClass: 'amber',
      route: '/rutas'
    },
    {
      key: 'conductores',
      title: 'Conductores',
      count: 0,
      icon: 'steering-wheel',
      colorClass: 'cyan',
      route: '/conductores'
    },
    {
      key: 'apoderados',
      title: 'Apoderados',
      count: 0,
      icon: 'users',
      colorClass: 'purple',
      route: '/apoderados'
    }
  ]);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    window.addEventListener('colegio-changed', this.onColegioChangedListener);

    this.subscription = timer(0, 5000).pipe(
      switchMap(() => this.http.get<DashboardStatsResponse>(this.apiUrl))
    ).subscribe({
      next: (data) => this.processStatsResponse(data),
      error: (err) => console.error('Error al actualizar estadísticas del dashboard:', err)
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('colegio-changed', this.onColegioChangedListener);
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private fetchStatsNow(): void {
    this.http.get<DashboardStatsResponse>(this.apiUrl).subscribe({
      next: (data) => this.processStatsResponse(data),
      error: (err) => console.error('Error al actualizar estadísticas:', err)
    });
  }

  private processStatsResponse(data: DashboardStatsResponse): void {
    if (!data) return;

    const newCards: StatCard[] = [];

    // Si viene la propiedad 'colegios' (modo global para Admin Plataforma), añadir la card de Colegios
    if (data.colegios !== undefined && data.colegios !== null) {
      newCards.push({
        key: 'colegios',
        title: 'Colegios',
        count: data.colegios,
        icon: 'building',
        colorClass: 'indigo',
        route: '/colegios'
      });
    }

    newCards.push(
      { key: 'estudiantes', title: 'Estudiantes', count: data.estudiantes ?? 0, icon: 'graduation-cap', colorClass: 'primary', route: '/estudiantes' },
      { key: 'furgones', title: 'Furgones', count: data.furgones ?? 0, icon: 'bus', colorClass: 'emerald', route: '/furgones' },
      { key: 'rutas', title: 'Rutas', count: data.rutas ?? 0, icon: 'map-pin', colorClass: 'amber', route: '/rutas' },
      { key: 'conductores', title: 'Conductores', count: data.conductores ?? 0, icon: 'steering-wheel', colorClass: 'cyan', route: '/conductores' },
      { key: 'apoderados', title: 'Apoderados', count: data.apoderados ?? 0, icon: 'users', colorClass: 'purple', route: '/apoderados' }
    );

    this.stats.set(newCards);
  }
}

