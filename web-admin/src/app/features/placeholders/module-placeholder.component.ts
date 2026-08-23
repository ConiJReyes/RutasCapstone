import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

/**
 * Componente Placeholder para los módulos CRUD del Side Menu.
 * Muestra una vista temporal limpia con el nombre del módulo y enlace de retorno.
 */
@Component({
  selector: 'app-module-placeholder',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- Contenedor de la vista placeholder del módulo -->
    <div class="placeholder-view fade-in">
      <div class="placeholder-card glass-panel">
        <div class="icon-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <!-- Título dinámico del módulo seleccionado -->
        <h2>Gestión de {{ moduleTitle }}</h2>
        <p>Este botón redirigirá al CRUD de {{ moduleTitle }}. Actualmente está en fase de desarrollo.</p>
        <!-- Enlace para volver al Dashboard -->
        <a routerLink="/dashboard" class="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Volver al Dashboard</span>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .placeholder-view {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 400px;
    }
    .placeholder-card {
      padding: 3rem 2rem;
      text-align: center;
      max-width: 500px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .icon-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(79, 108, 241, 0.15);
      color: var(--primary-400);
      display: flex;
      align-items: center;
      justify-content: center;
      svg {
        width: 28px;
        height: 28px;
      }
    }
    h2 {
      font-size: 1.5rem;
      color: #ffffff;
      text-transform: capitalize;
    }
    p {
      color: var(--text-secondary);
      font-size: 0.9375rem;
      line-height: 1.5;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding: 0.625rem 1.25rem;
      background: var(--primary-500);
      color: #ffffff;
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      font-weight: 600;
      transition: background 0.2s ease;
      svg {
        width: 16px;
        height: 16px;
      }
      &:hover {
        background: var(--primary-600);
      }
    }
  `]
})
export class ModulePlaceholderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  
  // Nombre del módulo detectado desde la URL
  moduleTitle: string = 'Módulo';

  ngOnInit(): void {
    // Extrae el segmento de ruta (apoderados, conductores, furgones, rutas)
    const path = this.route.snapshot.url[0]?.path || 'módulo';
    this.moduleTitle = path.charAt(0).toUpperCase() + path.slice(1);
  }
}
