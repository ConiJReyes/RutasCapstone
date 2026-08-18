import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  IonContent,
  IonInput,
  IonItem,
  IonButton,
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';

import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonInput,
    IonItem,
    IonButton,
    IonSpinner
  ]
})
export class RegistroPage {

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
    private toastController: ToastController
  ) {}

  async onSubmit() {
    this.errorMensaje = '';

    if (!this.nombre.trim() || !this.apellido.trim() || !this.rut.trim() || !this.email.trim() || !this.password) {
      this.errorMensaje = 'Por favor completa todos los campos obligatorios.';
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

    this.authService.registrarApoderado(datos).subscribe({
      next: async (res) => {
        this.cargando = false;
        await this.mostrarToast(res.message || 'Registro completado exitosamente.', 'success');
        this.router.navigate(['/apoderado/inicio']);
      },
      error: async (err) => {
        this.cargando = false;
        let mensaje = 'Ocurrió un error al registrar la cuenta.';
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