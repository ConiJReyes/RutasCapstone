import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonMenuToggle
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  warningOutline,
  sendOutline
} from 'ionicons/icons';

addIcons({
  menuOutline,
  warningOutline,
  sendOutline
});

import { NotificationService } from '../../../services/notification.service';
import { ToastController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-emergencia',
  templateUrl: './emergencia.page.html',
  styleUrls: ['./emergencia.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonMenuToggle
  ]
})
export class EmergenciaPage {

  tipo = 'ruta';
  estudiante = '';
  categoria = '';
  descripcion = '';

  constructor(
    private notificationService: NotificationService,
    private toastController: ToastController
  ) {}

  enviar() {
    const detalle = this.descripcion.trim() || `Alerta de ${this.categoria || 'emergencia general'}`;

    this.notificationService.enviarEmergencia(detalle).subscribe({
      next: async () => {
        const toast = await this.toastController.create({
          message: '🚨 Alerta de emergencia enviada y notificada a los apoderados.',
          duration: 3000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      },
      error: async (err) => {
        console.error('Error enviando emergencia:', err);
      }
    });
  }
}