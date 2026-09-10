import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ApoderadoService, Estudiante } from '../../../core/services/apoderado.service';

@Component({
  selector: 'app-apoderado-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './apoderado-form.component.html',
  styleUrl: './apoderado-form.component.scss'
})
export class ApoderadoFormComponent implements OnInit {
  apoderadoForm!: FormGroup;
  estudianteForm!: FormGroup;
  
  isSubmitting = false;
  isEditMode = false;
  apoderadoId: number | null = null;

  // Lista temporal de estudiantes asociados al apoderado
  estudiantesList: Estudiante[] = [];
  showEstudianteModal = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private apoderadoService: ApoderadoService
  ) {}

  ngOnInit(): void {
    this.initApoderadoForm();
    this.initEstudianteForm();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.apoderadoId = Number(idParam);
      this.isEditMode = true;
      this.apoderadoService.getApoderadoById(this.apoderadoId).subscribe({
        next: (apoderado) => {
          if (apoderado) {
            this.apoderadoForm.patchValue(apoderado);
            this.estudiantesList = apoderado.estudiantes ? [...apoderado.estudiantes] : [];
          }
        },
        error: (err) => console.error('Error al obtener apoderado:', err)
      });
    }
  }

initApoderadoForm(): void {
  this.apoderadoForm = this.fb.group({
    correo: ['', [
      Validators.required,
      Validators.email
    ]],

    rut: ['', [
      Validators.required,
      Validators.pattern('^[0-9]{7,8}-[0-9kK]{1}$')
    ]],

    nombre_completo: ['', [
      Validators.required,
      Validators.minLength(3)
    ]],

    telefono: ['', [
      Validators.required,
      Validators.pattern(
        '^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\\s\\./0-9]*$'
      )
    ]]
  });
}

  initEstudianteForm(): void {
    this.estudianteForm = this.fb.group({
      rut: ['', [Validators.required, Validators.pattern('^[0-9]{7,8}-[0-9kK]{1}$')]],
      nombre_completo: ['', [Validators.required, Validators.minLength(3)]],
      fecha_nacimiento: ['', [Validators.required]],
      curso: ['', [Validators.required]],
      colegio: ['', [Validators.required]],
      direccion_retiro: ['', [Validators.required]],
      latitud: [null],
      longitud: [null],
      estado_matricula: ['pendiente', [Validators.required]],
      activo: [true]
    });
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // Métodos del Modal de Estudiantes
  openEstudianteModal(): void {
    this.estudianteForm.reset({
      estado_matricula: 'pendiente',
      activo: true
    });
    this.showEstudianteModal = true;
  }

  closeEstudianteModal(): void {
    this.showEstudianteModal = false;
  }

  addEstudiante(): void {
    if (this.estudianteForm.invalid) {
      this.estudianteForm.markAllAsTouched();
      return;
    }

    const newEstudiante: Estudiante = {
      ...this.estudianteForm.value,
      id: Date.now()
    };

    this.estudiantesList.push(newEstudiante);
    this.closeEstudianteModal();
  }

  removeEstudiante(index: number): void {
    this.estudiantesList.splice(index, 1);
  }

  // Guardar Apoderado + Estudiantes
  onSubmit(): void {
  if (this.apoderadoForm.invalid) {
    this.apoderadoForm.markAllAsTouched();
    return;
  }

  this.isSubmitting = true;

  const formData = {
    nombre_completo: this.apoderadoForm.value.nombre_completo,
    rut: this.apoderadoForm.value.rut,
    usuario: this.apoderadoForm.value.correo,
    telefono: this.apoderadoForm.value.telefono
  };

  if (this.isEditMode && this.apoderadoId) {
    this.apoderadoService.actualizarApoderado(
      this.apoderadoId,
      formData
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/apoderados']);
      },
      error: (err) => {
        console.error('Error al actualizar apoderado:', err);
        this.isSubmitting = false;
        alert(
          err.error?.message ||
          'Error al actualizar el apoderado.'
        );
      }
    });

  } else {
    this.apoderadoService.crearApoderado(formData).subscribe({
      next: (response) => {
        console.log('✅ APODERADO CREADO:', response);

        this.isSubmitting = false;
        this.router.navigate(['/apoderados']);
      },
      error: (err) => {
        console.error('❌ ERROR AL CREAR APODERADO:', err);

        this.isSubmitting = false;

        alert(
          err.error?.errors
            ? JSON.stringify(err.error.errors)
            : err.error?.message ||
              'Error al crear el apoderado.'
        );
      }
    });
  }
}

  onCancel(): void {
    this.router.navigate(['/apoderados']);
  }
}