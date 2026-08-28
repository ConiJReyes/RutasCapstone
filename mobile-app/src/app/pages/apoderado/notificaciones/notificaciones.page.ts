import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  IonContent,
  IonButton,
  IonMenuToggle,
  IonIcon,
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  notificationsOutline,
  busOutline,
  checkmarkCircleOutline,
  warningOutline,
  schoolOutline,
  homeOutline,
  megaphoneOutline,
  menuOutline,
  arrowBackOutline,
  checkmarkDoneOutline,
  timeOutline,
  mailUnreadOutline
} from 'ionicons/icons';

import { NotificationService, NotificacionItem } from '../../../services/notification.service';
import { PushNotificationService } from '../../../services/push-notification.service';

addIcons({
  notificationsOutline,
  busOutline,
  checkmarkCircleOutline,
  warningOutline,
  schoolOutline,
  homeOutline,
  megaphoneOutline,
  menuOutline,
  arrowBackOutline,
  checkmarkDoneOutline,
  timeOutline,
  mailUnreadOutline
});

@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.page.html',
  styleUrls: ['./notificaciones.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonButton,
    IonMenuToggle,
    IonIcon,
    IonSpinner
  ]
})
export class NotificacionesPage implements OnInit, OnDestroy {

  notificaciones: NotificacionItem[] = [];
  noLeidasCount: number = 0;
  cargando: boolean = false;
  private pushSubscription?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private pushNotificationService: PushNotificationService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.cargarNotificaciones();

    // Escuchar notificaciones entrantes en tiempo real
    this.pushSubscription = this.pushNotificationService.getNuevaNotificacionSubject().subscribe(notif => {
      if (notif) {
        this.cargarNotificaciones();
      }
    });
  }

  ionViewWillEnter() {
    this.cargarNotificaciones();
  }

  ngOnDestroy() {
    if (this.pushSubscription) {
      this.pushSubscription.unsubscribe();
    }
  }

  cargarNotificaciones() {
    this.cargando = true;
    this.notificationService.getNotificaciones().subscribe({
      next: (res) => {
        this.cargando = false;
        this.notificaciones = res.notificaciones || [];
        this.noLeidasCount = res.no_leidas_count || 0;
      },
      error: (err) => {
        this.cargando = false;
        console.error('Error cargando notificaciones:', err);
      }
    });
  }

  marcarComoLeida(item: NotificacionItem) {
    if (item.leido) return;

    this.notificationService.marcarLeida(item.id).subscribe({
      next: () => {
        item.leido = true;
        if (this.noLeidasCount > 0) {
          this.noLeidasCount--;
        }
      }
    });
  }

  marcarTodasComoLeidas() {
    if (this.noLeidasCount === 0) return;

    this.notificationService.marcarTodasLeidas().subscribe({
      next: async () => {
        this.notificaciones.forEach(n => n.leido = true);
        this.noLeidasCount = 0;
        await this.mostrarToast('Todas las notificaciones fueron marcadas como leídas.', 'success');
      }
    });
  }

  getIconoTipo(tipo: string): string {
    switch (tipo) {
      case 'ruta_iniciada':
        return 'bus-outline';
      case 'estudiante_abordo':
        return 'school-outline';
      case 'estudiante_llego':
        return 'home-outline';
      case 'ruta_finalizada':
        return 'checkmark-circle-outline';
      case 'emergencia':
        return 'warning-outline';
      case 'aviso_sistema':
      default:
        return 'megaphone-outline';
    }
  }

  getClaseIcono(tipo: string): string {
    switch (tipo) {
      case 'ruta_iniciada': return 'icon-ruta';
      case 'estudiante_abordo': return 'icon-abordo';
      case 'estudiante_llego': return 'icon-llego';
      case 'ruta_finalizada': return 'icon-finalizada';
      case 'emergencia': return 'icon-emergencia';
      case 'aviso_sistema': return 'icon-aviso';
      default: return 'icon-aviso';
    }
  }

  getBadgeText(tipo: string): string {
    switch (tipo) {
      case 'ruta_iniciada': return 'Ruta Iniciada';
      case 'estudiante_abordo': return 'Estudiante Abordó';
      case 'estudiante_llego': return 'Estudiante Llegó';
      case 'ruta_finalizada': return 'Ruta Finalizada';
      case 'emergencia': return 'Emergencia';
      case 'aviso_sistema': return 'Aviso del Sistema';
      default: return 'Notificación';
    }
  }

  private async mostrarToast(mensaje: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2500,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }

}
