import { Component } from '@angular/core';
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
  Estudiante
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
    IonMenuToggle
  ]
})
export class AgregarHijoPage {

  nombre = '';
  apellido = '';
  rut = '';
  fechaNacimiento = '';
  colegio = '';
  curso = '';

  direccionPrincipal = '';
  direccionAlternativa = '';

  personaAutorizada = '';
  rutPersonaAutorizada = '';

  cargando = false;
  errorMensaje = '';
  fotoSeleccionada?: File;
  vistaPreviaFoto = '';

  constructor(
    private router: Router,
    private estudianteService: EstudianteService,
    private toastController: ToastController
  ) {
      addIcons({menuOutline,alertCircleOutline});}

  async guardarEstudiante() {

    this.errorMensaje = '';

    if (
      !this.nombre.trim() ||
      !this.apellido.trim() ||
      !this.rut.trim() ||
      !this.fechaNacimiento ||
      !this.colegio.trim() ||
      !this.curso.trim() ||
      !this.direccionPrincipal.trim()
    ) {

      this.errorMensaje =
        'Completa todos los campos obligatorios.';

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

      colegio: this.colegio.trim(),

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
