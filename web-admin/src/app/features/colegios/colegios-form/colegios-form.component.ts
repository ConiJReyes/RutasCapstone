import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ColegioService, Colegio } from '../../../core/services/colegio.service';

@Component({
  selector: 'app-colegios-form',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './colegios-form.component.html',
  styleUrl: './colegios-form.component.scss'
})
export class ColegiosFormComponent implements OnInit {
  private colegioService = inject(ColegioService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  esEdicion = signal(false);
  colegioId = signal<number | null>(null);
  guardando = signal(false);

  formData = signal<Partial<Colegio>>({
    nombre: '',
    rbd: '',
    direccion: '',
    telefono: '',
    email_contacto: '',
    activo: true
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        this.esEdicion.set(true);
        this.colegioId.set(id);
        this.cargarColegio(id);
      }
    }
  }

  cargarColegio(id: number): void {
    this.colegioService.getColegio(id).subscribe({
      next: (data) => {
        this.formData.set({
          nombre: data.nombre,
          rbd: data.rbd || '',
          direccion: data.direccion || '',
          telefono: data.telefono || '',
          email_contacto: data.email_contacto || '',
          activo: data.activo
        });
      },
      error: () => {
        alert('No se pudo cargar la información del colegio.');
        this.router.navigate(['/colegios']);
      }
    });
  }

  guardar(): void {
    const data = this.formData();
    if (!data.nombre?.trim()) {
      alert('Debe ingresar un nombre para el colegio.');
      return;
    }

    this.guardando.set(true);

    if (this.esEdicion() && this.colegioId()) {
      this.colegioService.updateColegio(this.colegioId()!, data).subscribe({
        next: () => {
          this.guardando.set(false);
          alert('Colegio actualizado exitosamente.');
          this.router.navigate(['/colegios']);
        },
        error: (err) => {
          this.guardando.set(false);
          alert(err?.error?.message || 'Error al actualizar colegio.');
        }
      });
    } else {
      this.colegioService.createColegio(data).subscribe({
        next: () => {
          this.guardando.set(false);
          alert('Colegio creado exitosamente.');
          this.router.navigate(['/colegios']);
        },
        error: (err) => {
          this.guardando.set(false);
          alert(err?.error?.message || 'Error al crear colegio.');
        }
      });
    }
  }
}
