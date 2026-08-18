import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  IonContent,
  IonInput,
  IonItem,
  IonButton,
  IonTextarea,
  IonSpinner,
  ToastController,
  IonMenuToggle
} from '@ionic/angular/standalone';

import { EstudianteService, Estudiante } from '../../../services/estudiante.service';

@Component({
  selector: 'app-agregar-hijo',
  templateUrl: './agregar-hijo.page.html',
  styleUrls: ['./agregar-hijo.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonInput,
    IonItem,
    IonButton,
    IonTextarea,
    IonSpinner,
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

  constructor(
    private router: Router,
    private estudianteService: EstudianteService,
    private toastController: ToastController
  ) {}

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
      this.errorMensaje = 'Completa todos los campos obligatorios.';
      await this.mostrarToast(this.errorMensaje, 'warning');
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
      direccion_principal: this.direccionPrincipal.trim(),
      direccion_alternativa: this.direccionAlternativa.trim() || undefined,
      persona_autorizada: this.personaAutorizada.trim() || undefined,
      rut_persona_autorizada: this.rutPersonaAutorizada.trim() || undefined
    };

    this.estudianteService.crearEstudiante(estudianteData).subscribe({
      next: async (res) => {
        this.cargando = false;
        await this.mostrarToast(res.message || 'Estudiante registrado correctamente.', 'success');
        this.router.navigate(['/apoderado/mis-hijos']);
      },
      error: async (err) => {
        this.cargando = false;
        let mensaje = 'Error al registrar el estudiante.';
        if (err.error) {
          if (err.error.message) {
            mensaje = err.error.message;
          }
          if (err.error.errors) {
            const keys = Object.keys(err.error.errors);
            if (keys.length > 0) {
              const primerError = err.error.errors[keys[0]];
              mensaje = Array.isArray(primerError) ? primerError[0] : primerError;
            }
          }
        }
        this.errorMensaje = mensaje;
        await this.mostrarToast(mensaje, 'danger');
      }
    });
  }

  private async mostrarToast(mensaje: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }

}