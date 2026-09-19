import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { EstudianteService, Estudiante } from '../../../core/services/estudiante.service';
import { ApoderadoService } from '../../../core/services/apoderado.service';
import { ColegioService, Colegio, Sede } from '../../../core/services/colegio.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-estudiantes-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './estudiantes-form.component.html',
  styleUrl: './estudiantes-form.component.scss'
})
export class EstudiantesFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private estudianteService = inject(EstudianteService);
  private apoderadoService = inject(ApoderadoService);
  private colegioService = inject(ColegioService);
  private authService = inject(AuthService);

  estudianteForm!: FormGroup;
  isSubmitting = false;
  isEditMode = false;
  estudianteId: number | null = null;
  errorMessage = '';

  apoderados = signal<any[]>([]);
  sedes = signal<Sede[]>([]);
  colegios = signal<Colegio[]>([]);

  user = this.authService.currentUser;
  esAdminPlataforma = signal(false);

  ngOnInit(): void {
    const u = this.user();
    this.esAdminPlataforma.set(u?.role === 'ADMIN_PLATAFORMA' || u?.role === 'ADMIN');

    this.initForm();
    this.cargarApoderados();

    if (this.esAdminPlataforma()) {
      this.cargarColegios();
    } else if (u?.colegioId) {
      this.cargarSedes(u.colegioId);
    }

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.estudianteId = Number(idParam);
      this.isEditMode = true;
      this.cargarEstudiante(this.estudianteId);
    }
  }

  initForm(): void {
    this.estudianteForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      rut: ['', [Validators.required]],
      fecha_nacimiento: [''],
      colegio: [null],
      sede: [null],
      curso: [''],
      direccion_principal: [''],
      direccion_alternativa: [''],
      persona_autorizada: [''],
      rut_persona_autorizada: [''],
      apoderado: [null]
    });
  }

  cargarApoderados(): void {
    this.apoderadoService.getApoderados().subscribe({
      next: (data) => this.apoderados.set(data || []),
      error: (err) => console.error('Error al cargar apoderados:', err)
    });
  }

  async cargarColegios(): Promise<void> {
    try {
      const data = await this.colegioService.getColegios();
      this.colegios.set(data || []);
    } catch (err) {
      console.error('Error al cargar colegios:', err);
    }
  }

  cargarSedes(colegioId: number): void {
    this.colegioService.getSedes(colegioId).subscribe({
      next: (data) => this.sedes.set(data || []),
      error: (err) => console.error('Error al cargar sedes:', err)
    });
  }

  onColegioChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    const colId = val ? Number(val) : null;
    if (colId) {
      this.cargarSedes(colId);
    } else {
      this.sedes.set([]);
    }
  }

  cargarEstudiante(id: number): void {
    this.estudianteService.getEstudianteById(id).subscribe({
      next: (est) => {
        if (est) {
          this.estudianteForm.patchValue({
            nombre: est.nombre,
            apellido: est.apellido,
            rut: est.rut,
            fecha_nacimiento: est.fecha_nacimiento || '',
            colegio: est.colegio || null,
            sede: est.sede || null,
            curso: est.curso || '',
            direccion_principal: est.direccion_principal || '',
            direccion_alternativa: est.direccion_alternativa || '',
            persona_autorizada: est.persona_autorizada || '',
            rut_persona_autorizada: est.rut_persona_autorizada || '',
            apoderado: est.apoderado || null
          });

          if (est.colegio) {
            this.cargarSedes(est.colegio);
          }
        }
      },
      error: (err) => {
        console.error('Error al cargar estudiante:', err);
        this.errorMessage = 'No se pudo cargar la información del estudiante.';
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.estudianteForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (this.estudianteForm.invalid) {
      this.estudianteForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const val = { ...this.estudianteForm.value };

    // Limpiar nulos/vacíos
    Object.keys(val).forEach(k => {
      if (val[k] === '' || val[k] === null) {
        delete val[k];
      }
    });

    if (this.isEditMode && this.estudianteId) {
      this.estudianteService.updateEstudiante(this.estudianteId, val).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/estudiantes']);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = this.extraerError(err);
        }
      });
    } else {
      this.estudianteService.createEstudiante(val).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/estudiantes']);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = this.extraerError(err);
        }
      });
    }
  }

  private extraerError(err: any): string {
    if (err?.error?.message) {
      return err.error.message;
    }
    if (err?.error?.errors) {
      const keys = Object.keys(err.error.errors);
      if (keys.length > 0) {
        const first = err.error.errors[keys[0]];
        return Array.isArray(first) ? `${keys[0]}: ${first[0]}` : `${keys[0]}: ${first}`;
      }
    }
    return 'Ocurrió un error al guardar los datos del estudiante.';
  }

  onCancel(): void {
    this.router.navigate(['/estudiantes']);
  }
}
