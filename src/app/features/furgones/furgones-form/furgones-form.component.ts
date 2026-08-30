import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-furgones-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './furgones-form.component.html',
  styleUrl: './furgones-form.component.scss'
})
export class FurgonesFormComponent implements OnInit {
  furgonForm: FormGroup;
  isEditMode = signal(false);
  furgonId = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.furgonForm = this.fb.group({
      patente: ['', [Validators.required, Validators.pattern(/^[A-Z0-9-]{6,8}$/i)]],
      marcaModelo: ['', Validators.required],
      capacidad: ['', [Validators.required, Validators.min(1)]],
      conductorAsignado: ['', Validators.required],
      estado: ['disponible', Validators.required]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.furgonId.set(id);
      this.cargarFurgon(id);
    }
  }

  cargarFurgon(id: string): void {
    this.furgonForm.patchValue({
      patente: 'K3-89-21',
      marcaModelo: 'Mercedes-Benz Sprinter',
      capacidad: 19,
      conductorAsignado: 'Carlos Pérez',
      estado: 'en_ruta'
    });
  }

  onSubmit(): void {
    if (this.furgonForm.invalid) {
      this.furgonForm.markAllAsTouched();
      return;
    }

    console.log('Furgón guardado:', this.furgonForm.value);
    this.router.navigate(['/furgones']);
  }

  cancelar(): void {
    this.router.navigate(['/furgones']);
  }
}