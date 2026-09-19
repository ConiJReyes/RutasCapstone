import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ColegioService } from '../../core/services/colegio.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss'
})
export class DashboardLayoutComponent implements OnInit {
  protected authService = inject(AuthService);
  protected colegioService = inject(ColegioService);

  sidebarOpen = signal(false);

  user = computed(() => this.authService.currentUser());
  esAdminPlataforma = computed(() => {
    const u = this.user();
    return u?.role === 'ADMIN_PLATAFORMA' || u?.role === 'ADMIN';
  });

  navItems = computed<NavItem[]>(() => {
    const baseNav: NavItem[] = [
      { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' }
    ];

    if (this.esAdminPlataforma()) {
      baseNav.push({ label: 'Colegios', route: '/colegios', icon: 'building' });
    }

    baseNav.push(
      { label: 'Estudiantes', route: '/estudiantes', icon: 'graduation-cap' },
      { label: 'Apoderados', route: '/apoderados', icon: 'users' },
      { label: 'Conductores', route: '/conductores', icon: 'steering-wheel' },
      { label: 'Delegados', route: '/delegados', icon: 'shield' },
      { label: 'Furgones', route: '/furgones', icon: 'bus' },
      { label: 'Rutas', route: '/rutas', icon: 'map-pin' }
    );

    return baseNav;
  });

  ngOnInit(): void {
    if (this.esAdminPlataforma()) {
      this.colegioService.getColegios();
    }
  }

  onColegioChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    const id = value ? parseInt(value, 10) : null;
    this.colegioService.setSelectedColegioId(id);
    // Disparar recarga ligera o evento si es necesario
    window.dispatchEvent(new Event('colegio-changed'));
  }

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
