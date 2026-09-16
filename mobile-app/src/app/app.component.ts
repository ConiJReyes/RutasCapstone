import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';

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
import { NotificationService, NotificacionItem } from './services/notification.service';

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
export class AppComponent implements OnInit, OnDestroy {

  private alertSub?: Subscription;

  constructor(
    private authService: AuthService,
    private pushNotificationService: PushNotificationService,
    public notificationService: NotificationService,
    private router: Router,
    private toastController: ToastController,
    private menuController: MenuController
  ) {}

  ngOnInit() {
    if (this.estaAutenticado) {
      this.pushNotificationService.inicializarPushNotifications();
      this.notificationService.iniciarPolling();
    }

    // Escuchar alertas de notificaciones entrantes en tiempo real
    this.alertSub = this.notificationService.nuevaNotificacionAlert$.subscribe((notif: NotificacionItem) => {
      if (notif) {
        this.mostrarToastAlert(notif);
      }
    });
  }

  ngOnDestroy() {
    if (this.alertSub) {
      this.alertSub.unsubscribe();
    }
    this.notificationService.detenerPolling();
  }

  get usuario(): Usuario | null {
    return this.authService.getUsuario();
  }

  get estaAutenticado(): boolean {
    return !!this.authService.getToken();
  }

  async cerrarSesion() {
    this.notificationService.detenerPolling();
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

  private async mostrarToastAlert(notif: NotificacionItem) {
    const colorAlert = notif.tipo === 'emergencia' ? 'danger' : 'primary';
    const toast = await this.toastController.create({
      header: notif.titulo,
      message: notif.mensaje,
      duration: 4500,
      color: colorAlert,
      position: 'top',
      buttons: [
        {
          text: 'Ver',
          handler: () => {
            this.router.navigate(['/apoderado/notificaciones']);
          }
        }
      ]
    });
    await toast.present();
  }

}
