import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RutasService, Ruta } from '../../../core/services/rutas.service';
import { Conductor, ConductorService } from '../../../core/services/conductor.service';

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
  guardando = signal(false);
  conductores = signal<Conductor[]>([]);
  cargandoConductores = signal(true);
  readonly colegioFijo = 'Escuela Bosques del Viento';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private rutasService: RutasService,
    private conductorService: ConductorService
  ) {
    this.rutaForm = this.fb.group({
      nombre: ['', Validators.required],
      conductor: ['', Validators.required],
      colegio: [{ value: this.colegioFijo, disabled: true }, Validators.required],
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
    this.cargarConductores();
  }

  cargarConductores(): void {
    this.cargandoConductores.set(true);
    this.conductorService.getConductores().subscribe({
      next: (conductores) => {
        this.conductores.set(conductores);
        this.cargandoConductores.set(false);

        // Una ruta requiere un conductor antes de poder registrarse.
        if (!this.isEditMode() && conductores.length === 0) {
          this.router.navigate(['/conductores/nuevo']);
        }
      },
      error: () => this.cargandoConductores.set(false)
    });
  }

  nombreConductor(conductor: Conductor): string {
    return conductor.nombre_completo
      || [conductor.nombre || conductor.first_name, conductor.apellido || conductor.last_name]
        .filter(Boolean)
        .join(' ')
      || conductor.usuario
      || conductor.email;
  }

  cargarRuta(id: string): void {
    this.rutasService.getRuta(id).subscribe({
      next: (ruta) => {
        if (ruta) {
          this.rutaForm.patchValue({
            nombre: ruta.nombre,
            conductor: ruta.conductor,
            colegio: this.colegioFijo,
            estado: ruta.estado
          });
        }
      }
    });
  }

  onSubmit(): void {
    if (this.rutaForm.invalid) {
      this.rutaForm.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const rawVal = this.rutaForm.getRawValue();
    const rutaData: Ruta = {
      nombre: rawVal.nombre,
      conductor: rawVal.conductor,
      colegio: this.colegioFijo,
      estado: rawVal.estado
    };

    if (this.isEditMode() && this.rutaId()) {
      this.rutasService.actualizarRuta(this.rutaId()!, rutaData).subscribe({
        next: () => {
          this.guardando.set(false);
          this.router.navigate(['/rutas']);
        },
        error: () => this.guardando.set(false)
      });
    } else {
      this.rutasService.crearRuta(rutaData).subscribe({
        next: () => {
          this.guardando.set(false);
          this.router.navigate(['/rutas']);
        },
        error: () => this.guardando.set(false)
      });
    }
  }

  cancelar(): void {
    this.router.navigate(['/rutas']);
  }
}
