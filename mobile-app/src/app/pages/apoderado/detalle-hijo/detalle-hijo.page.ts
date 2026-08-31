import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonIcon,
  IonSpinner,
  IonMenuToggle,
  ToastController, IonButton, IonInput, IonTextarea } from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';

import {
  schoolOutline,
  calendarOutline,
  cardOutline,
  locationOutline,
  homeOutline,
  personOutline,
  shieldCheckmarkOutline,
  busOutline,
  menuOutline,
  lockClosedOutline,
  createOutline,
  bookOutline
} from 'ionicons/icons';

import {
  EstudianteService,
  Estudiante
} from '../../../services/estudiante.service';

addIcons({
  schoolOutline,
  calendarOutline,
  cardOutline,
  locationOutline,
  homeOutline,
  personOutline,
  shieldCheckmarkOutline,
  busOutline,
  menuOutline,
  lockClosedOutline,
  createOutline,
  bookOutline
});

@Component({
  selector: 'app-detalle-hijo',
  templateUrl: './detalle-hijo.page.html',
  styleUrls: ['./detalle-hijo.page.scss'],

  standalone: true,

  imports: [IonButton, IonInput, IonTextarea,
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonSpinner,
    IonMenuToggle
  ]
})
export class DetalleHijoPage implements OnInit {

  estudiante?: Estudiante;

  cargando = true;

  errorMensaje = '';
  modoEdicion = false;
  guardando = false;
  datosEdicion?: Estudiante;


  constructor(
    private route: ActivatedRoute,
    private estudianteService: EstudianteService,
    private toastController: ToastController
  ) {
      addIcons({shieldCheckmarkOutline,menuOutline,personOutline,schoolOutline,cardOutline,lockClosedOutline,calendarOutline,bookOutline,busOutline,locationOutline,homeOutline,createOutline});}


  ngOnInit() {

    this.route.queryParams.subscribe(params => {

      const id = Number(params['id']);

      if (!id) {

        this.errorMensaje =
          'No se encontró el estudiante seleccionado.';

        this.cargando = false;

        return;
      }

      this.cargarEstudiante(id);

    });

  }


  cargarEstudiante(id: number) {

    this.cargando = true;

    this.errorMensaje = '';

    this.estudianteService
      .obtenerEstudiante(id)
      .subscribe({

        next: (data) => {

          this.estudiante = data;
          this.datosEdicion = { ...data };

          this.cargando = false;

        },

        error: async (err) => {

          console.error(
            'Error cargando estudiante:',
            err
          );

          this.cargando = false;

          this.errorMensaje =
            'No se pudo cargar la información del estudiante.';

          await this.mostrarToast(
            this.errorMensaje,
            'danger'
          );

        }

      });

  }

  iniciarEdicion() {
    if (!this.estudiante) {
      return;
    }
    this.datosEdicion = { ...this.estudiante, colegio: 'Escuela Bosques del Viento' };
    this.modoEdicion = true;
  }

  cancelarEdicion() {
    this.datosEdicion = this.estudiante ? { ...this.estudiante, colegio: 'Escuela Bosques del Viento' } : undefined;
    this.modoEdicion = false;
  }

  guardarCambios() {
    if (!this.estudiante?.id || !this.datosEdicion) {
      return;
    }

    this.datosEdicion.colegio = 'Escuela Bosques del Viento';
    this.guardando = true;
    const { id, rut, tiene_foto, created_at, updated_at, ...datos } = this.datosEdicion;

    this.estudianteService.actualizarEstudiante(this.estudiante.id, datos).subscribe({
      next: async (respuesta) => {
        this.estudiante = respuesta.estudiante;
        this.datosEdicion = { ...respuesta.estudiante };
        this.modoEdicion = false;
        this.guardando = false;
        await this.mostrarToast(respuesta.message, 'success');
      },
      error: async (err) => {
        this.guardando = false;
        console.error('Error actualizando estudiante:', err);
        let mensaje = 'No se pudo actualizar la información del estudiante.';
        const errores = err.error?.errors;
        if (errores) {
          const primerCampo = Object.keys(errores)[0];
          const primerError = errores[primerCampo];
          mensaje = Array.isArray(primerError) ? primerError[0] : primerError;
        }
        await this.mostrarToast(mensaje, 'danger');
      }
    });
  }


  formatearFecha(fecha: string): string {

    if (!fecha) {
      return 'No registrada';
    }

    const [anio, mes, dia] =
      fecha.split('-');

    return `${dia}/${mes}/${anio}`;

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
