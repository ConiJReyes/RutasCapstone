import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RutasService, Ruta } from '../../../core/services/rutas.service';
import { MapaSeguimientoComponent } from '../../mapa/mapa-seguimiento.component';

@Component({
  selector: 'app-rutas-lista',
  standalone: true,
  imports: [CommonModule, MapaSeguimientoComponent],
  templateUrl: './rutas-lista.component.html',
  styleUrl: './rutas-lista.component.scss'
})
export class RutasListaComponent implements OnInit {
  rutas = signal<Ruta[]>([]);
  cargando = signal<boolean>(true);
  
  mostrarMapa = signal<boolean>(false);
  rutaSeleccionada = signal<Ruta | null>(null);

  constructor(
    private rutasService: RutasService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarRutas();
  }

  cargarRutas(): void {
    this.cargando.set(true);
    this.rutasService.getRutas().subscribe({
      next: (data) => {
        const mapped: Ruta[] = data.map(r => ({
          ...r,
          colegio: 'Escuela Bosques del Viento',
          estudiantesCount: r.estudiantesCount ?? r.estudiantes_count ?? 0,
          estado: (r.estado || 'inactiva').toString().toLowerCase() as any
        }));
        this.rutas.set(mapped);
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargando.set(false);
      }
    });
  }

  nuevaRuta(): void {
    this.router.navigate(['/rutas/nuevo']);
  }

  editarRuta(id: string | number | undefined): void {
    if (id !== undefined) {
      this.router.navigate(['/rutas/editar', id]);
    }
  }

  eliminarRuta(id: string | number | undefined): void {
    if (!id) return;
    if (confirm('¿Estás seguro de eliminar esta ruta?')) {
      this.rutasService.eliminarRuta(id).subscribe({
        next: () => this.cargarRutas()
      });
    }
  }

  abrirMapa(ruta: Ruta): void {
    this.rutaSeleccionada.set(ruta);
    this.mostrarMapa.set(true);
  }

  cerrarMapa(): void {
    this.mostrarMapa.set(false);
    this.rutaSeleccionada.set(null);
  }
}