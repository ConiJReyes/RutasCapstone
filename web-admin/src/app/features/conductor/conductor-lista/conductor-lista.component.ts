import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConductorService, Conductor, EstudianteItem } from '../../../core/services/conductor.service';

@Component({
  selector: 'app-conductor-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './conductor-lista.component.html',
  styleUrl: './conductor-lista.component.scss'
})
export class ConductorListaComponent implements OnInit {
  conductores: Conductor[] = [];
  cargando = true;

  // Estado del Modal de Asignación de Estudiantes
  mostrarModalAsignacion: boolean = false;
  conductorSeleccionado: Conductor | null = null;
  estudiantesAsignados: EstudianteItem[] = [];
  estudiantesDisponibles: EstudianteItem[] = [];
  estudiantesSeleccionadosIds: number[] = [];
  cargandoModal: boolean = false;
  guardandoAsignacion: boolean = false;

  constructor(
    private conductorService: ConductorService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarConductores();
  }

  cargarConductores(): void {
    this.cargando = true;
    this.conductorService.getConductores().subscribe({
      next: (data) => {
        this.conductores = data;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando conductores desde backend:', err);
        this.cargando = false;
      }
    });
  }

  onEdit(id?: number): void {
    if (id) {
      this.router.navigate(['/conductores/editar', id]);
    }
  }

  onDelete(id?: number): void {
    if (!id) return;
    if (confirm('¿Estás seguro de que deseas eliminar este conductor?')) {
      this.conductorService.eliminarConductor(id).subscribe({
        next: () => {
          this.cargarConductores();
        },
        error: (err) => {
          console.error('Error eliminando conductor:', err);
          alert('No se pudo eliminar el conductor.');
        }
      });
    }
  }

  // --- MÉTODOS DEL MODAL DE ASIGNACIÓN DE ESTUDIANTES ---

  abrirModalAsignacion(conductor: Conductor): void {
    if (!conductor.id) return;
    this.conductorSeleccionado = conductor;
    this.mostrarModalAsignacion = true;
    this.estudiantesSeleccionadosIds = [];
    this.cargarDatosModal(conductor.id);
  }

  cerrarModalAsignacion(): void {
    this.mostrarModalAsignacion = false;
    this.conductorSeleccionado = null;
    this.estudiantesAsignados = [];
    this.estudiantesDisponibles = [];
    this.estudiantesSeleccionadosIds = [];
  }

  cargarDatosModal(conductorId: number): void {
    this.cargandoModal = true;
    this.estudiantesSeleccionadosIds = [];

    // Carga paralela de asignados y sin asignar
    this.conductorService.getEstudiantesConductor(conductorId).subscribe({
      next: (asignados) => {
        this.estudiantesAsignados = asignados;
        this.conductorService.getEstudiantesSinAsignar().subscribe({
          next: (sinAsignar) => {
            this.estudiantesDisponibles = sinAsignar;
            this.cargandoModal = false;
            this.cdr.markForCheck();
          },
          error: (err) => {
            console.error('Error cargando estudiantes sin asignar:', err);
            this.cargandoModal = false;
          }
        });
      },
      error: (err) => {
        console.error('Error cargando estudiantes del conductor:', err);
        this.cargandoModal = false;
      }
    });
  }

  toggleSeleccion(estudianteId: number): void {
    const index = this.estudiantesSeleccionadosIds.indexOf(estudianteId);
    if (index > -1) {
      this.estudiantesSeleccionadosIds.splice(index, 1);
    } else {
      this.estudiantesSeleccionadosIds.push(estudianteId);
    }
  }

  estaSeleccionado(estudianteId: number): boolean {
    return this.estudiantesSeleccionadosIds.includes(estudianteId);
  }

  asignarSeleccionados(): void {
    if (!this.conductorSeleccionado?.id || this.estudiantesSeleccionadosIds.length === 0) return;

    this.guardandoAsignacion = true;
    const condId = this.conductorSeleccionado.id;

    this.conductorService.asignarEstudiantes(condId, this.estudiantesSeleccionadosIds).subscribe({
      next: (res) => {
        this.guardandoAsignacion = false;
        this.cargarDatosModal(condId);
        this.cargarConductores(); // Refresca contadores en la lista principal
      },
      error: (err) => {
        console.error('Error al asignar estudiantes:', err);
        this.guardandoAsignacion = false;
        alert('No se pudieron asignar los estudiantes.');
      }
    });
  }

  desasignarEstudiante(estudianteId: number): void {
    if (!this.conductorSeleccionado?.id) return;
    const condId = this.conductorSeleccionado.id;

    if (confirm('¿Deseas quitar a este estudiante de la ruta del conductor?')) {
      this.conductorService.desasignarEstudiante(condId, estudianteId).subscribe({
        next: () => {
          this.cargarDatosModal(condId);
          this.cargarConductores();
        },
        error: (err) => {
          console.error('Error al desasignar estudiante:', err);
          alert('No se pudo desasignar el estudiante.');
        }
      });
    }
  }
}