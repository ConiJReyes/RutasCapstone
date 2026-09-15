import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import {
  IonApp,
  IonRouterOutlet,
  IonMenu,
  IonContent,
  IonMenuToggle,
  ToastController,
  MenuController
} from '@ionic/angular/standalone';

import { AuthService, Usuario } from './services/auth.service';
import { PushNotificationService } from './services/push-notification.service';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IonApp,
    IonRouterOutlet,
    IonMenu,
    IonContent,
    IonMenuToggle
  ]
})
export class AppComponent {

  constructor(
    private authService: AuthService,
    private pushNotificationService: PushNotificationService,
    public notificationService: NotificationService,
    private router: Router,
    private toastController: ToastController,
    private menuController: MenuController
  ) {
    if (this.estaAutenticado) {
      this.pushNotificationService.inicializarPushNotifications();
      this.notificationService.getNotificaciones().subscribe({ error: () => {} });
    }
  }

  get usuario(): Usuario | null {
    return this.authService.getUsuario();
  }

  get estaAutenticado(): boolean {
    return !!this.authService.getToken();
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
