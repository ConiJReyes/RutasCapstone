import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';


export interface RutaItem {
  id: string;
  nombre: string;
  conductor: string;
  colegio: string;
  estudiantesCount: number;
  estado: 'activa' | 'inactiva';
}

@Component({
  selector: 'app-rutas-lista',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rutas-lista.component.html',
  styleUrl: './rutas-lista.component.scss'
})
export class RutasListaComponent {
  rutas = signal<RutaItem[]>([
    {
      id: '1',
      nombre: 'Ruta 01 - Norte',
      conductor: 'Carlos Pérez',
      colegio: 'Colegio San José',
      estudiantesCount: 12,
      estado: 'activa'
    },
    {
      id: '2',
      nombre: 'Ruta 02 - Sur',
      conductor: 'María Gómez',
      colegio: 'Liceo Central',
      estudiantesCount: 8,
      estado: 'inactiva'
    }
  ]);

  constructor(private router: Router) {}

  nuevaRuta(): void {
    this.router.navigate(['/rutas/nuevo']);
  }

  editarRuta(id: string): void {
    this.router.navigate(['/rutas/editar', id]);
  }
}