import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ConductorService } from '../../../core/services/conductor.service';

@Component({
  selector: 'app-conductor-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './conductor-form.component.html',
  styleUrl: './conductor-form.component.scss'
})
export class ConductorFormComponent implements OnInit {
  conductorForm!: FormGroup;
  isSubmitting = false;
  isEditMode = false;
  conductorId: number | null = null;
  errorMessage = '';

  licenciasDisponibles = ['Clase A1', 'Clase A2', 'Clase A3', 'Clase B'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private conductorService: ConductorService
  ) {}

  ngOnInit(): void {
    this.initForm();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.conductorId = Number(idParam);
      this.isEditMode = true;
      this.cargarConductor(this.conductorId);
    }
  }

  initForm(): void {
    this.conductorForm = this.fb.group({
      nombre_completo: ['', [Validators.required, Validators.minLength(3)]],
      rut: ['', [Validators.required, Validators.pattern('^[0-9]{7,8}-[0-9kK]{1}$')]],
      telefono: ['', [Validators.required]],
      licencia_conducir: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(6)]]
    });
  }

  cargarConductor(id: number): void {
    this.conductorService.getConductorById(id).subscribe({
      next: (conductor) => {
        if (conductor) {
          const nombreCompleto = conductor.nombre_completo || `${conductor.first_name || ''} ${conductor.last_name || ''}`.trim();
          this.conductorForm.patchValue({
            nombre_completo: nombreCompleto,
            rut: conductor.rut,
            telefono: conductor.telefono,
            licencia_conducir: conductor.licencia_conducir,
            email: conductor.email
          });
        }
      },
      error: (err) => {
        console.error('Error al cargar conductor:', err);
        this.errorMessage = 'No se pudo cargar la información del conductor.';
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.conductorForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (this.conductorForm.invalid) {
      this.conductorForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const val = this.conductorForm.value;
    const parts = val.nombre_completo.trim().split(' ', 1);
    const nombre = parts[0];
    const apellido = val.nombre_completo.trim().substring(nombre.length).trim();

    if (this.isEditMode && this.conductorId) {
      // Edición
      const updatePayload: any = {
        nombre: nombre,
        apellido: apellido,
        rut: val.rut.trim(),
        telefono: val.telefono.trim(),
        licencia_conducir: val.licencia_conducir,
        email: val.email.trim()
      };

      if (val.password && val.password.trim()) {
        updatePayload.password = val.password.trim();
      }

      this.conductorService.actualizarConductor(this.conductorId, updatePayload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/conductores']);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = this.extraerError(err);
        }
      });
    } else {
      // Creación en backend Django
      const createPayload = {
        nombre: nombre,
        apellido: apellido,
        rut: val.rut.trim(),
        email: val.email.trim(),
        telefono: val.telefono.trim(),
        licencia_conducir: val.licencia_conducir,
        password: val.password
      };

      this.conductorService.crearConductor(createPayload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/conductores']);
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
        return Array.isArray(first) ? first[0] : first;
      }
    }
    return 'Ocurrió un error al guardar los datos en el servidor.';
  }

  onCancel(): void {
    this.router.navigate(['/conductores']);
  }
}