import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ConductorService } from '../../../core/services/conductor.service'; // Ajusta la ruta a tu servicio si varia

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

  licenciasDisponibles = ['Clase A1', 'Clase A2', 'Clase A3', 'Clase B'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private conductorService: ConductorService
  ) {}

  ngOnInit(): void {
    this.initForm();

    // Revisa si viene un 'id' en la ruta para ponerse en modo edición
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.conductorId = Number(idParam);
      this.isEditMode = true;
      const conductor = this.conductorService.getConductorById(this.conductorId);
      if (conductor) {
        this.conductorForm.patchValue(conductor);
      }
    }
  }

  initForm(): void {
    this.conductorForm = this.fb.group({
      usuario: ['', [Validators.required]],
      rut: ['', [Validators.required, Validators.pattern('^[0-9]{7,8}-[0-9kK]{1}$')]],
      nombre_completo: ['', [Validators.required, Validators.minLength(3)]],
      licencia_conducir: ['', [Validators.required]],
      telefono: ['', [Validators.required, Validators.pattern('^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\\s\\./0-9]*$')]]
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.conductorForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.conductorForm.invalid) {
      this.conductorForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const formData = {
      ...this.conductorForm.value,
      id: this.conductorId ?? undefined
    };

    // Guarda los cambios en la lista en memoria del Servicio
    this.conductorService.saveConductor(formData);

    setTimeout(() => {
      this.isSubmitting = false;
      this.router.navigate(['/conductores']);
    }, 300);
  }

  onCancel(): void {
    this.router.navigate(['/conductores']);
  }
}