import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FurgonesService, Furgon } from '../../../core/services/furgones.service';

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
  guardando = signal(false);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private furgonesService: FurgonesService
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
    this.furgonesService.getFurgon(id).subscribe({
      next: (furgon) => {
        if (furgon) {
          this.furgonForm.patchValue({
            patente: furgon.patente,
            marcaModelo: furgon.marcaModelo || furgon.marca_modelo || '',
            capacidad: furgon.capacidad,
            conductorAsignado: furgon.conductorAsignado || furgon.conductor_asignado || '',
            estado: furgon.estado
          });
        }
      }
    });
  }

  onSubmit(): void {
    if (this.furgonForm.invalid) {
      this.furgonForm.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const formVal = this.furgonForm.value;
    const furgonData: Furgon = {
      patente: formVal.patente,
      marcaModelo: formVal.marcaModelo,
      capacidad: Number(formVal.capacidad),
      conductorAsignado: formVal.conductorAsignado,
      estado: formVal.estado
    };

    if (this.isEditMode() && this.furgonId()) {
      this.furgonesService.actualizarFurgon(this.furgonId()!, furgonData).subscribe({
        next: () => {
          this.guardando.set(false);
          this.router.navigate(['/furgones']);
        },
        error: () => this.guardando.set(false)
      });
    } else {
      this.furgonesService.crearFurgon(furgonData).subscribe({
        next: () => {
          this.guardando.set(false);
          this.router.navigate(['/furgones']);
        },
        error: () => this.guardando.set(false)
      });
    }
  }

  cancelar(): void {
    this.router.navigate(['/furgones']);
  }
}