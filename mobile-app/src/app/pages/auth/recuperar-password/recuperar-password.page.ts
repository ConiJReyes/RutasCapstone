import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  IonContent,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonButton,
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-recuperar-password',
  templateUrl: './recuperar-password.page.html',
  styleUrls: ['./recuperar-password.page.scss'],
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
    IonSpinner
  ]
})
export class RecuperarPasswordPage implements OnInit {

  rol: string = 'apoderado';
  email = '';
  codigo = '';
  nuevaPassword = '';
  confirmarPassword = '';
  codigoEnviado = false;
  cargando = false;
  mensaje = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.rol = params['rol'] || 'apoderado';
    });
  }

  enviarCodigo() {
    const email = this.email.trim().toLowerCase();
    if (!email) {
      this.mensaje = 'Ingresa tu correo electrónico.';
      return;
    }

    this.cargando = true;
    this.mensaje = '';
    this.authService.solicitarRecuperacion(email).subscribe({
      next: async (respuesta) => {
        this.email = email;
        this.codigoEnviado = true;
        this.cargando = false;
        await this.mostrarToast(respuesta.message, 'success');
      },
      error: async (err) => {
        this.cargando = false;
        this.mensaje = err.error?.message || 'No se pudo enviar el código.';
        await this.mostrarToast(this.mensaje, 'danger');
      }
    });
  }

  confirmarCambio() {
    if (!this.codigo || !this.nuevaPassword || !this.confirmarPassword) {
      this.mensaje = 'Completa el código y la nueva contraseña.';
      return;
    }
    if (this.nuevaPassword !== this.confirmarPassword) {
      this.mensaje = 'Las contraseñas no coinciden.';
      return;
    }

    this.cargando = true;
    this.mensaje = '';
    this.authService.confirmarRecuperacion(
      this.email,
      this.codigo.trim(),
      this.nuevaPassword
    ).subscribe({
      next: async (respuesta) => {
        this.cargando = false;
        await this.mostrarToast(respuesta.message, 'success');
        this.router.navigate(['/login'], { queryParams: { rol: this.rol } });
      },
      error: async (err) => {
        this.cargando = false;
        this.mensaje = err.error?.message || 'No se pudo cambiar la contraseña.';
        await this.mostrarToast(this.mensaje, 'danger');
      }
    });
  }

  private async mostrarToast(
    mensaje: string,
    color: 'success' | 'danger'
  ) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

}
