import { Component, Input, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColegioService, Colegio, Sede } from '../../../core/services/colegio.service';

@Component({
  selector: 'app-sedes-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sedes-modal.component.html',
  styleUrl: './sedes-modal.component.scss'
})
export class SedesModalComponent implements OnInit {
  @Input({ required: true }) colegio!: Colegio;
  @Output() alCerrar = new EventEmitter<void>();

  private colegioService = inject(ColegioService);

  sedes = signal<Sede[]>([]);
  cargando = signal(true);
  guardando = signal(false);

  // Formulario nueva/edición de sede
  sedeForm = signal<Partial<Sede>>({
    nombre: '',
    direccion: '',
    telefono: '',
    activa: true
  });
  modoEdicion = signal(false);
  sedeEditandoId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarSedes();
  }

  cargarSedes(): void {
    this.cargando.set(true);
    this.colegioService.getSedes(this.colegio.id).subscribe({
      next: (data) => {
        this.sedes.set(data || []);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  guardarSede(): void {
    const data = this.sedeForm();
    if (!data.nombre?.trim()) {
      alert('Debe ingresar un nombre para la sede.');
      return;
    }

    this.guardando.set(true);

    if (this.modoEdicion() && this.sedeEditandoId()) {
      this.colegioService.updateSede(this.sedeEditandoId()!, data).subscribe({
        next: () => {
          this.guardando.set(false);
          this.resetForm();
          this.cargarSedes();
        },
        error: (err) => {
          this.guardando.set(false);
          alert(err?.error?.message || 'Error al actualizar sede.');
        }
      });
    } else {
      this.colegioService.createSede(this.colegio.id, data).subscribe({
        next: () => {
          this.guardando.set(false);
          this.resetForm();
          this.cargarSedes();
        },
        error: (err) => {
          this.guardando.set(false);
          alert(err?.error?.message || 'Error al crear sede.');
        }
      });
    }
  }

  editarSede(sede: Sede): void {
    this.modoEdicion.set(true);
    this.sedeEditandoId.set(sede.id);
    this.sedeForm.set({
      nombre: sede.nombre,
      direccion: sede.direccion || '',
      telefono: sede.telefono || '',
      activa: sede.activa
    });
  }

  eliminarSede(sede: Sede): void {
    if (confirm(`¿Eliminar la sede "${sede.nombre}"?`)) {
      this.colegioService.deleteSede(sede.id).subscribe({
        next: () => this.cargarSedes(),
        error: (err) => alert(err?.error?.message || 'Error al eliminar sede.')
      });
    }
  }

  resetForm(): void {
    this.modoEdicion.set(false);
    this.sedeEditandoId.set(null);
    this.sedeForm.set({
      nombre: '',
      direccion: '',
      telefono: '',
      activa: true
    });
  }

  cerrar(): void {
    this.alCerrar.emit();
  }
}
