import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-rutas-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './rutas-form.component.html',
  styleUrl: './rutas-form.component.scss'
})
export class RutasFormComponent implements OnInit {
  rutaForm: FormGroup;
  isEditMode = signal(false);
  rutaId = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.rutaForm = this.fb.group({
      nombre: ['', Validators.required],
      conductor: ['', Validators.required],
      colegio: ['', Validators.required],
      estado: ['activa', Validators.required]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.rutaId.set(id);
      this.cargarRuta(id);
    }
  }

  cargarRuta(id: string): void {
    // Carga de datos de prueba
    this.rutaForm.patchValue({
      nombre: 'Ruta 01 - Norte',
      conductor: 'Carlos Pérez',
      colegio: 'Colegio San José',
      estado: 'activa'
    });
  }

  onSubmit(): void {
    if (this.rutaForm.invalid) {
      this.rutaForm.markAllAsTouched();
      return;
    }

    console.log('Datos guardados:', this.rutaForm.value);
    this.router.navigate(['/rutas']);
  }

  cancelar(): void {
    this.router.navigate(['/rutas']);
  }
}