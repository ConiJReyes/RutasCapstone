import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  IonContent,
  IonInput,
  IonButton,
  IonSpinner,
  IonIcon,
  ToastController
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  shieldCheckmarkOutline,
  personOutline,
  callOutline,
  mailOutline,
  cardOutline,
  logOutOutline,
  checkmarkCircleOutline,
  lockClosedOutline
} from 'ionicons/icons';

import { AuthService, Usuario } from '../../../services/auth.service';

addIcons({
  arrowBackOutline,
  shieldCheckmarkOutline,
  personOutline,
  callOutline,
  mailOutline,
  cardOutline,
  logOutOutline,
  checkmarkCircleOutline,
  lockClosedOutline
});

@Component({
  selector: 'app-perfil-delegado',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonInput,
    IonButton,
    IonSpinner,
    IonIcon
  ]
})
export class PerfilDelegadoPage implements OnInit {

  usuario: Usuario | null = null;

  nombre: string = '';
  apellido: string = '';
  telefono: string = '';

  editando: boolean = false;
  guardando: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private location: Location,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.cargarPerfil();
  }

  cargarPerfil() {
    this.usuario = this.authService.getUsuario();
    if (this.usuario) {
      this.nombre = this.usuario.first_name || '';
      this.apellido = this.usuario.last_name || '';
      this.telefono = this.usuario.telefono || '';
    }
  }

  toggleEditar() {
    this.editando = !this.editando;
    if (!this.editando) {
      this.cargarPerfil();
    }
  }

  guardarPerfil() {
    if (!this.nombre.trim()) {
      this.mostrarToast('El nombre no puede estar vacío.', 'warning');
      return;
    }

    this.guardando = true;
    this.authService.actualizarPerfilDelegado({
      first_name: this.nombre,
      last_name: this.apellido,
      telefono: this.telefono
    }).subscribe({
      next: async (res) => {
        this.guardando = false;
        this.editando = false;
        this.usuario = this.authService.getUsuario();
        await this.mostrarToast('Perfil actualizado correctamente.', 'success');
      },
      error: async (err) => {
        this.guardando = false;
        await this.mostrarToast('Error al actualizar el perfil.', 'danger');
      }
    });
  }

  cerrarSesion() {
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  volver() {
    this.location.back();
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
