import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  IonContent,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonButton,
  IonSpinner,
  IonIcon,
  ToastController
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import { arrowBackOutline, shieldCheckmarkOutline, personOutline, cardOutline, mailOutline, callOutline, lockClosedOutline } from 'ionicons/icons';

import { AuthService } from '../../../services/auth.service';

addIcons({
  arrowBackOutline,
  shieldCheckmarkOutline,
  personOutline,
  cardOutline,
  mailOutline,
  callOutline,
  lockClosedOutline
});

@Component({
  selector: 'app-registro-delegado',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonInput,
    IonInputPasswordToggle,
    IonItem,
    IonButton,
    IonSpinner,
    IonIcon
  ]
})
export class RegistroDelegadoPage {

  nombre: string = '';
  apellido: string = '';
  rut: string = '';
  email: string = '';
  telefono: string = '';
  password: string = '';
  confirmarPassword: string = '';

  cargando: boolean = false;
  errorMensaje: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private location: Location
  ) {}

  async onSubmit() {
    this.errorMensaje = '';

    if (!this.nombre.trim() || !this.rut.trim() || !this.email.trim() || !this.password) {
      this.errorMensaje = 'Por favor completa todos los campos obligatorios (*).';
      await this.mostrarToast(this.errorMensaje, 'warning');
      return;
    }

    if (this.password !== this.confirmarPassword) {
      this.errorMensaje = 'Las contraseñas no coinciden.';
      await this.mostrarToast(this.errorMensaje, 'danger');
      return;
    }

    this.cargando = true;

    const datos = {
      nombre: this.nombre,
      apellido: this.apellido,
      rut: this.rut,
      email: this.email,
      telefono: this.telefono,
      password: this.password
    };

    this.authService.registrarDelegado(datos).subscribe({
      next: async (res) => {
        this.cargando = false;
        await this.mostrarToast(res.message || 'Registro de delegado completado con éxito.', 'success');
        this.router.navigate(['/delegado/inicio']);
      },
      error: async (err) => {
        this.cargando = false;
        let mensaje = 'Ocurrió un error al registrar la cuenta de delegado.';
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

  volver() {
    this.location.back();
  }

  private async mostrarToast(mensaje: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 4500,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }
}
