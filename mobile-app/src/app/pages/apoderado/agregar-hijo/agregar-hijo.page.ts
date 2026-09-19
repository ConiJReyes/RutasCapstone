import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  IonContent,
  IonInput,
  IonItem,
  IonButton,
  IonTextarea,
  IonSpinner,
  IonIcon,
  IonSelect,
  IonSelectOption,
  ToastController,
  IonMenuToggle
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';

import {
  menuOutline,
  alertCircleOutline,
  cameraOutline,
  closeOutline
} from 'ionicons/icons';

import {
  EstudianteService,
  Estudiante,
  ColegioItem,
  SedeItem
} from '../../../services/estudiante.service';

addIcons({
  menuOutline,
  alertCircleOutline,
  cameraOutline,
  closeOutline
});

@Component({
  selector: 'app-agregar-hijo',
  templateUrl: './agregar-hijo.page.html',
  styleUrls: ['./agregar-hijo.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonInput,
    IonItem,
    IonButton,
    IonTextarea,
    IonSpinner,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonMenuToggle
  ]
})
export class AgregarHijoPage implements OnInit {

  nombre = '';
  apellido = '';
  rut = '';
  fechaNacimiento = '';
  colegioId?: number;
  sedeId?: number;
  curso = '';

  colegiosList: ColegioItem[] = [];
  sedesList: SedeItem[] = [];

  direccionPrincipal = '';
  direccionAlternativa = '';

  personaAutorizada = '';
  rutPersonaAutorizada = '';

  cargando = false;
  cargandoColegios = false;
  cargandoSedes = false;
  errorMensaje = '';
  fotoSeleccionada?: File;
  vistaPreviaFoto = '';

  constructor(
    private router: Router,
    private estudianteService: EstudianteService,
    private toastController: ToastController
  ) {
    addIcons({ menuOutline, alertCircleOutline, cameraOutline, closeOutline });
  }

  ngOnInit() {
    this.cargarColegios();
  }

  cargarColegios() {
    this.cargandoColegios = true;
    this.estudianteService.obtenerColegiosActivos().subscribe({
      next: (data) => {
        this.colegiosList = data || [];
        this.cargandoColegios = false;
      },
      error: (err) => {
        console.error('Error al cargar colegios:', err);
        this.cargandoColegios = false;
      }
    });
  }

  onColegioChange(event: any) {
    const val = event.detail.value;
    this.colegioId = val ? Number(val) : undefined;
    this.sedeId = undefined;
    this.sedesList = [];

    if (this.colegioId) {
      this.cargandoSedes = true;
      this.estudianteService.obtenerSedesActivas(this.colegioId).subscribe({
        next: (data) => {
          this.sedesList = data || [];
          this.cargandoSedes = false;
        },
        error: (err) => {
          console.error('Error al cargar sedes:', err);
          this.cargandoSedes = false;
        }
      });
    }
  }

  async guardarEstudiante() {

    this.errorMensaje = '';

    if (
      !this.nombre.trim() ||
      !this.apellido.trim() ||
      !this.rut.trim() ||
      !this.fechaNacimiento ||
      !this.colegioId ||
      !this.curso.trim() ||
      !this.direccionPrincipal.trim()
    ) {

      this.errorMensaje =
        'Completa todos los campos obligatorios (incluyendo la selección de Colegio).';

      await this.mostrarToast(
        this.errorMensaje,
        'warning'
      );

      return;
    }

    this.cargando = true;

    const estudianteData: Estudiante = {

      nombre: this.nombre.trim(),

      apellido: this.apellido.trim(),

      rut: this.rut.trim(),

      fecha_nacimiento: this.fechaNacimiento,

      colegio: this.colegioId,

      colegio_id: this.colegioId,

      sede: this.sedeId,

      sede_id: this.sedeId,

      curso: this.curso.trim(),

      direccion_principal:
        this.direccionPrincipal.trim(),

      direccion_alternativa:
        this.direccionAlternativa.trim() || undefined,

      persona_autorizada:
        this.personaAutorizada.trim() || undefined,

      rut_persona_autorizada:
        this.rutPersonaAutorizada.trim() || undefined
    };

    this.estudianteService
      .crearEstudiante(estudianteData, this.fotoSeleccionada)
      .subscribe({

        next: async (res) => {

          this.cargando = false;

          await this.mostrarToast(
            res.message ||
            'Estudiante registrado correctamente.',
            'success'
          );

          this.router.navigate([
            '/apoderado/mis-hijos'
          ]);

        },

        error: async (err) => {

          this.cargando = false;

          let mensaje =
            'Error al registrar el estudiante.';

          console.error('Error registrando estudiante:', err);

          if (err.status === 0) {

            mensaje =
              'No se pudo conectar con el servidor. Verifica que Django esté iniciado.';

          } else if (err.status === 401) {

            mensaje =
              'Tu sesión expiró. Inicia sesión nuevamente.';

          } else if (err.status === 403) {

            mensaje =
              'No tienes permisos para registrar estudiantes.';

          } else if (err.status >= 500) {

            mensaje =
              'El servidor no pudo procesar la solicitud. Revisa la terminal de Django.';

          } else if (err.error) {

            if (err.error.message) {

              mensaje = err.error.message;

            }

            if (err.error.errors) {

              const keys =
                Object.keys(err.error.errors);

              if (keys.length > 0) {

                const primerError =
                  err.error.errors[keys[0]];

                mensaje =
                  Array.isArray(primerError)
                    ? primerError[0]
                    : primerError;
              }
            }
          }

          this.errorMensaje = mensaje;

          await this.mostrarToast(
            mensaje,
            'danger'
          );
        }

      });
  }

  seleccionarFoto(event: Event) {
    const input = event.target as HTMLInputElement;
    const foto = input.files?.[0];
    this.errorMensaje = '';
    if (!foto) {
      return;
    }

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
    const maximoBytes = 5 * 1024 * 1024;
    if (!tiposPermitidos.includes(foto.type) || foto.size > maximoBytes) {
      this.errorMensaje = 'Selecciona una imagen JPEG, PNG o WebP de hasta 5 MB.';
      input.value = '';
      return;
    }

    this.limpiarVistaPrevia();
    this.fotoSeleccionada = foto;
    this.vistaPreviaFoto = URL.createObjectURL(foto);
  }

  quitarFoto(input: HTMLInputElement) {
    this.limpiarVistaPrevia();
    this.fotoSeleccionada = undefined;
    input.value = '';
  }

  private limpiarVistaPrevia() {
    if (this.vistaPreviaFoto) {
      URL.revokeObjectURL(this.vistaPreviaFoto);
      this.vistaPreviaFoto = '';
    }
  }

  private async mostrarToast(
    mensaje: string,
    color: 'success' | 'danger' | 'warning'
  ) {

    const toast =
      await this.toastController.create({

        message: mensaje,

        duration: 3000,

        color: color,

        position: 'bottom'

      });

    await toast.present();
  }

}
