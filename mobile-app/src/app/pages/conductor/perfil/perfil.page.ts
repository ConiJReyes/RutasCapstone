import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import {
  IonContent,
  IonButton,
  IonMenuToggle,
  IonIcon,
  ToastController,
  MenuController
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  personOutline,
  mailOutline,
  cardOutline,
  callOutline,
  ribbonOutline,
  shieldCheckmarkOutline,
  menuOutline,
  arrowBackOutline,
  logOutOutline,
  busOutline,
  idCardOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';

import { AuthService, Usuario } from '../../../services/auth.service';

addIcons({
  personOutline,
  mailOutline,
  cardOutline,
  callOutline,
  ribbonOutline,
  shieldCheckmarkOutline,
  menuOutline,
  arrowBackOutline,
  logOutOutline,
  busOutline,
  idCardOutline,
  checkmarkCircleOutline
});

@Component({
  selector: 'app-perfil-conductor',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonButton,
    IonMenuToggle,
    IonIcon
  ]
})
export class PerfilPage implements OnInit {

  usuario: Usuario | null = null;

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
  }

  get nombreCompleto(): string {
    if (!this.usuario) return 'Conductor';
    const full = `${this.usuario.first_name || ''} ${this.usuario.last_name || ''}`.trim();
    return full || this.usuario.email || 'Conductor';
  }

  get iniciales(): string {
    if (!this.usuario) return 'C';
    const fn = (this.usuario.first_name || '').charAt(0);
    const ln = (this.usuario.last_name || '').charAt(0);
    return (fn + ln).toUpperCase() || 'C';
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
