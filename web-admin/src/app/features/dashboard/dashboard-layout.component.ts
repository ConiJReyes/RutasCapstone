import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss'
})
export class DashboardLayoutComponent {
  protected authService = inject(AuthService);
  sidebarOpen = signal(false);

  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'dashboard'
    },
    {
      label: 'Apoderados',
      route: '/apoderados',
      icon: 'users'
    },
    {
      label: 'Conductores',
      route: '/conductores',
      icon: 'steering-wheel'
    },
    {
      label: 'Furgones',
      route: '/furgones',
      icon: 'bus'
    },
    {
      label: 'Rutas',
      route: '/rutas',
      icon: 'map-pin'
    }
  ];

  toggleSidebar(): void {
    this.sidebarOpen.update(val => !val);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }
}
