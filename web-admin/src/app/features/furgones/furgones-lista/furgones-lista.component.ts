import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FurgonesService, Furgon } from '../../../core/services/furgones.service';

@Component({
  selector: 'app-furgones-lista',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './furgones-lista.component.html',
  styleUrl: './furgones-lista.component.scss'
})
export class FurgonesListaComponent implements OnInit {
  furgones = signal<Furgon[]>([]);
  cargando = signal<boolean>(true);

  constructor(
    private furgonesService: FurgonesService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarFurgones();
  }

  cargarFurgones(): void {
    this.cargando.set(true);
    this.furgonesService.getFurgones().subscribe({
      next: (data) => {
        const mapped = data.map(item => ({
          ...item,
          marcaModelo: item.marcaModelo || item.marca_modelo || '',
          conductorAsignado: item.conductorAsignado || item.conductor_asignado || 'Sin asignar'
        }));
        this.furgones.set(mapped);
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargando.set(false);
      }
    });
  }

  nuevoFurgon(): void {
    this.router.navigate(['/furgones/nuevo']);
  }

  editarFurgon(id: string | number | undefined): void {
    if (id !== undefined) {
      this.router.navigate(['/furgones/editar', id]);
    }
  }

  eliminarFurgon(id: string | number | undefined): void {
    if (!id) return;
    if (confirm('¿Estás seguro de eliminar este furgón?')) {
      this.furgonesService.eliminarFurgon(id).subscribe({
        next: () => this.cargarFurgones()
      });
    }
  }
}