import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { DelegadoService } from '../../../core/services/delegado.service';

@Component({
  selector: 'app-delegado-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './delegado-form.component.html',
  styleUrl: './delegado-form.component.scss'
})
export class DelegadoFormComponent implements OnInit {
  delegadoForm!: FormGroup;
  isSubmitting = false;
  isEditMode = false;
  delegadoId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private delegadoService: DelegadoService
  ) {}

  ngOnInit(): void {
    this.initForm();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.delegadoId = Number(idParam);
      this.isEditMode = true;
      this.delegadoService.getDelegadoById(this.delegadoId).subscribe({
        next: (delegado) => {
          if (delegado) {
            this.delegadoForm.patchValue({
              nombre_completo: delegado.nombre_completo || `${delegado.first_name || ''} ${delegado.last_name || ''}`.trim(),
              rut: delegado.rut,
              correo: delegado.usuario || delegado.email,
              telefono: delegado.telefono
            });
          }
        },
        error: (err) => console.error('Error al obtener delegado:', err)
      });
    }
  }

  initForm(): void {
    this.delegadoForm = this.fb.group({
      nombre_completo: ['', [Validators.required, Validators.minLength(3)]],
      rut: ['', [Validators.required]],
      correo: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required]],
      password: ['']
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.delegadoForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.delegadoForm.invalid) {
      this.delegadoForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const formData = {
      nombre_completo: this.delegadoForm.value.nombre_completo,
      nombre: this.delegadoForm.value.nombre_completo.split(' ')[0],
      apellido: this.delegadoForm.value.nombre_completo.split(' ').slice(1).join(' '),
      rut: this.delegadoForm.value.rut,
      email: this.delegadoForm.value.correo,
      usuario: this.delegadoForm.value.correo,
      telefono: this.delegadoForm.value.telefono,
      password: this.delegadoForm.value.password || '123456'
    };

    if (this.isEditMode && this.delegadoId) {
      this.delegadoService.actualizarDelegado(this.delegadoId, formData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/delegados']);
        },
        error: (err) => {
          console.error('Error al actualizar delegado:', err);
          this.isSubmitting = false;
          alert(err.error?.message || 'Error al actualizar el delegado.');
        }
      });
    } else {
      this.delegadoService.crearDelegado(formData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/delegados']);
        },
        error: (err) => {
          console.error('Error al crear delegado:', err);
          this.isSubmitting = false;
          let msg = 'Error al registrar el delegado.';
          if (err.error?.errors) {
            const firstKey = Object.keys(err.error.errors)[0];
            msg = Array.isArray(err.error.errors[firstKey]) ? err.error.errors[firstKey][0] : err.error.errors[firstKey];
          } else if (err.error?.message) {
            msg = err.error.message;
          }
          alert(msg);
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/delegados']);
  }
}
