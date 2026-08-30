import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

export interface FurgonItem {
  id: string;
  patente: string;
  marcaModelo: string;
  capacidad: number;
  conductorAsignado: string;
  estado: 'disponible' | 'en_ruta' | 'mantenimiento';
}

@Component({
  selector: 'app-furgones-lista',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './furgones-lista.component.html',
  styleUrl: './furgones-lista.component.scss'
})
export class FurgonesListaComponent {
  furgones = signal<FurgonItem[]>([
    {
      id: '1',
      patente: 'K3-89-21',
      marcaModelo: 'Mercedes-Benz Sprinter',
      capacidad: 19,
      conductorAsignado: 'Carlos Pérez',
      estado: 'en_ruta'
    },
    {
      id: '2',
      patente: 'HG-54-10',
      marcaModelo: 'Hyundai H350',
      capacidad: 15,
      conductorAsignado: 'María Gómez',
      estado: 'disponible'
    }
  ]);

  constructor(private router: Router) {}

  nuevoFurgon(): void {
    this.router.navigate(['/furgones/nuevo']);
  }

  editarFurgon(id: string): void {
    this.router.navigate(['/furgones/editar', id]);
  }
}