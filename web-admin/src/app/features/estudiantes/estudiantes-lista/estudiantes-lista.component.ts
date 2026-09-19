import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EstudianteService, Estudiante } from '../../../core/services/estudiante.service';
import { EstudianteDetalleModalComponent } from '../estudiante-detalle-modal/estudiante-detalle-modal.component';

@Component({
  selector: 'app-estudiantes-lista',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, EstudianteDetalleModalComponent],
  templateUrl: './estudiantes-lista.component.html',
  styleUrl: './estudiantes-lista.component.scss'
})
export class EstudiantesListaComponent implements OnInit, OnDestroy {
  protected estudianteService = inject(EstudianteService);

  estudiantes = signal<Estudiante[]>([]);
  cargando = signal(true);
  busqueda = signal('');
  estudianteParaModal = signal<Estudiante | null>(null);

  private onColegioChangedListener = () => this.cargarEstudiantes();

  ngOnInit(): void {
    window.addEventListener('colegio-changed', this.onColegioChangedListener);
    this.cargarEstudiantes();
  }

  ngOnDestroy(): void {
    window.removeEventListener('colegio-changed', this.onColegioChangedListener);
  }

  async cargarEstudiantes(): Promise<void> {
    this.cargando.set(true);
    const data = await this.estudianteService.getEstudiantes();
    this.estudiantes.set(data || []);
    this.cargando.set(false);
  }

  estudiantesFiltrados(): Estudiante[] {
    const query = this.busqueda().toLowerCase().trim();
    if (!query) return this.estudiantes();

    return this.estudiantes().filter(e =>
      e.nombre.toLowerCase().includes(query) ||
      e.apellido.toLowerCase().includes(query) ||
      e.rut.toLowerCase().includes(query) ||
      (e.curso && e.curso.toLowerCase().includes(query)) ||
      (e.apoderado_nombre && e.apoderado_nombre.toLowerCase().includes(query)) ||
      (e.colegio_nombre && e.colegio_nombre.toLowerCase().includes(query))
    );
  }

  abrirFicha(est: Estudiante): void {
    this.estudianteParaModal.set(est);
  }

  cerrarFicha(): void {
    this.estudianteParaModal.set(null);
  }

  async eliminarEstudiante(est: Estudiante): Promise<void> {
    const confirmacion = confirm(
      `¿Estás seguro de que deseas eliminar permanentemente al estudiante:\n\n` +
      `📌 Nombre: ${est.nombre} ${est.apellido}\n` +
      `📌 RUT: ${est.rut}\n\n` +
      `Esta acción no se puede deshacer.`
    );

    if (confirmacion) {
      this.estudianteService.deleteEstudiante(est.id).subscribe({
        next: () => {
          alert(`Estudiante ${est.nombre} ${est.apellido} (RUT: ${est.rut}) eliminado correctamente.`);
          this.cargarEstudiantes();
        },
        error: (err) => {
          console.error('Error al eliminar estudiante:', err);
          alert(err?.error?.message || 'Error al eliminar el estudiante.');
        }
      });
    }
  }
}
