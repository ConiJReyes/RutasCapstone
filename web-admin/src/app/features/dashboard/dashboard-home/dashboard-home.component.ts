import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription, timer, switchMap } from 'rxjs';

interface StatCard {
  key: string;
  title: string;
  count: number;
  icon: string;
  colorClass: string;
  route: string;
}

export interface DashboardStatsResponse {
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
    this.subscription = timer(0, 5000).pipe(
      switchMap(() => this.http.get<DashboardStatsResponse>(this.apiUrl))
    ).subscribe({
      next: (data) => {
        if (data) {
          this.updateStatCount('estudiantes', data.estudiantes ?? 0);
          this.updateStatCount('conductores', data.conductores ?? 0);
          this.updateStatCount('apoderados', data.apoderados ?? 0);
          this.updateStatCount('furgones', data.furgones ?? 0);
          this.updateStatCount('rutas', data.rutas ?? 0);
        }
      },
      error: (err) => console.error('Error al actualizar estadísticas del dashboard:', err)
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private updateStatCount(key: string, count: number): void {
  this.stats.update(stats =>
    stats.map(stat =>
      stat.key === key
        ? { ...stat, count }
        : stat
    )
  );
}
}

