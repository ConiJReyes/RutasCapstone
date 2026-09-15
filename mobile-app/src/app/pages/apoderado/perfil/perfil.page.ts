import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  IonContent,
  IonButton,
  IonMenuToggle,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonSpinner,
  ToastController,
  MenuController
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  personOutline,
  mailOutline,
  cardOutline,
  callOutline,
  shieldCheckmarkOutline,
  menuOutline,
  arrowBackOutline,
  logOutOutline,
  lockClosedOutline,
  peopleOutline,
  idCardOutline,
  createOutline,
  saveOutline,
  keyOutline,
  closeOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';

import { AuthService, Usuario } from '../../../services/auth.service';

addIcons({
  personOutline,
  mailOutline,
  cardOutline,
  callOutline,
  shieldCheckmarkOutline,
  menuOutline,
  arrowBackOutline,
  logOutOutline,
  lockClosedOutline,
  peopleOutline,
  idCardOutline,
  createOutline,
  saveOutline,
  keyOutline,
  closeOutline,
  checkmarkCircleOutline
});

@Component({
  selector: 'app-perfil-apoderado',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonButton,
    IonMenuToggle,
    IonIcon,
    IonInput,
    IonInputPasswordToggle,
    IonItem,
    IonSpinner
  ]
})
export class PerfilPage implements OnInit {

  usuario: Usuario | null = null;

  // Edición de Datos
  editandoDatos: boolean = false;
  nombre: string = '';
  apellido: string = '';
  telefono: string = '';
  cargandoPerfil: boolean = false;

  // Cambio de Contraseña
  editandoPassword: boolean = false;
  passwordActual: string = '';
  nuevaPassword: string = '';
  confirmarNuevaPassword: string = '';
  cargandoPassword: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private menuController: MenuController
  ) {}

  ngOnInit() {
    this.cargarUsuario();
  }

  ionViewWillEnter() {
    this.cargarUsuario();
  }

  cargarUsuario() {
    this.usuario = this.authService.getUsuario();
    if (this.usuario) {
      this.nombre = this.usuario.first_name || '';
      this.apellido = this.usuario.last_name || '';
      this.telefono = this.usuario.telefono || '';
    }
  }

  get nombreCompleto(): string {
    if (!this.usuario) return 'Apoderado';
    const full = `${this.usuario.first_name || ''} ${this.usuario.last_name || ''}`.trim();
    return full || this.usuario.email || 'Apoderado';
  }

  get iniciales(): string {
    if (!this.usuario) return 'A';
    const fn = (this.usuario.first_name || '').charAt(0);
    const ln = (this.usuario.last_name || '').charAt(0);
    return (fn + ln).toUpperCase() || 'A';
  }

  iniciarEdicionDatos() {
    this.cargarUsuario();
    this.editandoDatos = true;
  }

  cancelarEdicionDatos() {
    this.editandoDatos = false;
    this.cargarUsuario();
  }

  guardarPerfil() {
    if (!this.usuario) return;

    if (!this.nombre.trim()) {
      this.mostrarToast('El nombre es obligatorio.', 'warning');
      return;
    }

    this.cargandoPerfil = true;

    this.authService.actualizarPerfilApoderado(this.usuario.id, {
      first_name: this.nombre.trim(),
      last_name: this.apellido.trim(),
      telefono: this.telefono.trim()
    }).subscribe({
      next: async (res) => {
        this.cargandoPerfil = false;
        this.editandoDatos = false;
        this.cargarUsuario();
        await this.mostrarToast('Datos personales actualizados exitosamente.', 'success');
      },
      error: async (err) => {
        this.cargandoPerfil = false;
        const msg = err.error?.message || 'Error al actualizar los datos.';
        await this.mostrarToast(msg, 'danger');
      }
    });
  }

  iniciarCambioPassword() {
    this.editandoPassword = true;
    this.passwordActual = '';
    this.nuevaPassword = '';
    this.confirmarNuevaPassword = '';
  }

  cancelarCambioPassword() {
    this.editandoPassword = false;
    this.passwordActual = '';
    this.nuevaPassword = '';
    this.confirmarNuevaPassword = '';
  }

  guardarPassword() {
    if (!this.usuario) return;

    if (!this.passwordActual || !this.nuevaPassword || !this.confirmarNuevaPassword) {
      this.mostrarToast('Por favor completa todos los campos de contraseña.', 'warning');
      return;
    }

    // Validación solicitada: La nueva contraseña NO puede ser igual a la anterior/actual
    if (this.nuevaPassword === this.passwordActual) {
      this.mostrarToast('La nueva contraseña no puede ser igual a la contraseña anterior.', 'danger');
      return;
    }

    if (this.nuevaPassword !== this.confirmarNuevaPassword) {
      this.mostrarToast('La nueva contraseña y su confirmación no coinciden.', 'warning');
      return;
    }

    if (this.nuevaPassword.length < 6) {
      this.mostrarToast('La nueva contraseña debe tener al menos 6 caracteres.', 'warning');
      return;
    }

    this.cargandoPassword = true;

    this.authService.cambiarPassword(this.usuario.id, this.passwordActual, this.nuevaPassword).subscribe({
      next: async () => {
        this.cargandoPassword = false;
        this.cancelarCambioPassword();
        await this.mostrarToast('Contraseña actualizada exitosamente.', 'success');
      },
      error: async (err) => {
        this.cargandoPassword = false;
        const msg = err.error?.message || 'Error al actualizar la contraseña.';
        await this.mostrarToast(msg, 'danger');
      }
    });
  }

  async cerrarSesion() {
    this.authService.logout();
    await this.menuController.close('main-menu');
    await this.mostrarToast('Has cerrado sesión correctamente.', 'success');
    this.router.navigate(['/login'], { replaceUrl: true });
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
