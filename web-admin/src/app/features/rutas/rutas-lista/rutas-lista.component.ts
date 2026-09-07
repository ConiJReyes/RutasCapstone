import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RutasService, Ruta } from '../../../core/services/rutas.service';
import { MapaSeguimientoComponent } from '../../mapa/mapa-seguimiento.component';
import { Conductor, ConductorService, EstudianteItem } from '../../../core/services/conductor.service';
import { forkJoin } from 'rxjs';

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
    private conductorService: ConductorService,
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
        this.conductorService.getConductores().subscribe({
          next: (conductores) => this.actualizarRutasConEstudiantes(data, conductores),
          error: () => {
            // Sin la lista de conductores no es posible calcular los estudiantes por ruta.
            this.actualizarRutasConEstudiantes(data, []);
          }
        });
      },
      error: () => {
        this.cargando.set(false);
      }
    });
  }

  nuevaRuta(): void {
    this.conductorService.getConductores().subscribe({
      next: (conductores) => {
        this.router.navigate([conductores.length ? '/rutas/nuevo' : '/conductores/nuevo']);
      },
      // Si no se puede comprobar la lista, se mantiene el acceso al formulario.
      error: () => this.router.navigate(['/rutas/nuevo'])
    });
  }

  private actualizarRutasConEstudiantes(rutas: Ruta[], conductores: Conductor[]): void {
    const rutasConConductor = rutas.map((ruta) => ({
      ruta,
      conductor: conductores.find((conductor) =>
        this.normalizarNombre(conductor.nombre_completo || this.nombreConductor(conductor))
        === this.normalizarNombre(ruta.conductor)
      )
    }));

    const solicitudes = rutasConConductor
      .filter(({ conductor }) => conductor?.id !== undefined)
      .map(({ ruta, conductor }) =>
        this.conductorService.getEstudiantesConductor(conductor!.id!)
      );

    if (solicitudes.length === 0) {
      this.mostrarRutas(rutasConConductor, new Map());
      return;
    }

    forkJoin(solicitudes).subscribe({
      next: (respuestas) => {
        const estudiantesPorRuta = new Map<string | number, EstudianteItem[]>();
        let indice = 0;
        rutasConConductor
          .filter(({ conductor }) => conductor?.id !== undefined)
          .forEach(({ ruta }) => estudiantesPorRuta.set(ruta.id!, respuestas[indice++]));
        this.mostrarRutas(rutasConConductor, estudiantesPorRuta);
      },
      error: () => this.mostrarRutas(rutasConConductor, new Map())
    });
  }

  private mostrarRutas(
    rutasConConductor: Array<{ ruta: Ruta; conductor?: Conductor }>,
    estudiantesPorRuta: Map<string | number, EstudianteItem[]>
  ): void {
    const mapped: Ruta[] = rutasConConductor.map(({ ruta, conductor }) => {
      const estudiantes = ruta.id === undefined ? [] : estudiantesPorRuta.get(ruta.id) || [];

      if (conductor && ruta.id !== undefined) {
        console.info(`[Rutas] Estudiantes de ${ruta.nombre} (${conductor.nombre_completo || conductor.email})`,
          estudiantes.map((estudiante) => ({
            estudiante: estudiante.nombre_completo,
            direccionPrincipal: estudiante.direccion_principal || 'Sin dirección principal',
            direccionAlternativa: estudiante.direccion_alternativa || 'Sin dirección alternativa'
          }))
        );
      }

      return {
        ...ruta,
        colegio: 'Escuela Bosques del Viento',
        estudiantesCount: estudiantes.length,
        estudiantes_count: estudiantes.length,
        estado: (ruta.estado || 'inactiva').toString().toLowerCase() as 'activa' | 'inactiva'
      };
    });

    this.rutas.set(mapped);
    this.cargando.set(false);
    this.cdr.markForCheck();
  }

  private nombreConductor(conductor: Conductor): string {
    return [conductor.nombre || conductor.first_name, conductor.apellido || conductor.last_name]
      .filter(Boolean)
      .join(' ')
      || conductor.email;
  }

  private normalizarNombre(nombre: string): string {
    return nombre.trim().toLocaleLowerCase();
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
