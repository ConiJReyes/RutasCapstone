import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

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
import {
  personOutline,
  lockClosedOutline,
  arrowBackOutline
} from 'ionicons/icons';

import { AuthService } from '../../../services/auth.service';

addIcons({
  personOutline,
  lockClosedOutline,
  arrowBackOutline
});

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
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
export class LoginPage implements OnInit {

  rol: string = 'apoderado';

  email: string = '';
  password: string = '';

  cargando: boolean = false;
  errorMensaje: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private location: Location
  ) {
      addIcons({arrowBackOutline,personOutline,lockClosedOutline});}

  ngOnInit() {

    this.route.queryParams.subscribe(params => {

      if (params['rol']) {
        this.rol = params['rol'];
      }

    });

  }

  async onSubmit() {

    this.errorMensaje = '';

    if (!this.email.trim() || !this.password) {

      this.errorMensaje =
        'Por favor ingresa tu correo y contraseña.';

      await this.mostrarToast(
        this.errorMensaje,
        'warning'
      );

      return;
    }

    this.cargando = true;

    this.authService.login(
      this.email,
      this.password
    ).subscribe({

      next: async (res) => {

        this.cargando = false;

        if (this.rol && res.usuario.rol !== this.rol) {
          this.authService.logout();

          const rolEsperado = this.rol === 'conductor' ? 'Conductor' : 'Apoderado';
          const mensajeError = `Correo electrónico o contraseña incorrectos. La cuenta ingresada no corresponde a un perfil de ${rolEsperado}.`;

          this.errorMensaje = mensajeError;
          await this.mostrarToast(mensajeError, 'danger');
          return;
        }

        await this.mostrarToast(
          `¡Bienvenido/a ${res.usuario.first_name}!`,
          'success'
        );

        if (res.usuario.rol === 'apoderado') {

          this.router.navigate([
            '/apoderado/inicio'
          ]);

        } else if (res.usuario.rol === 'conductor') {

          this.router.navigate([
            '/conductor/inicio'
          ]);

        } else {

          this.router.navigate([
            '/home'
          ]);

        }

      },

      error: async (err) => {

        this.cargando = false;

        let mensaje =
          'Correo electrónico o contraseña incorrectos.';

        if (
          err.error &&
          err.error.errors
        ) {

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

        this.errorMensaje = mensaje;

        await this.mostrarToast(
          mensaje,
          'danger'
        );

      }

    });

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

  volver() {
    this.location.back();
  }

}