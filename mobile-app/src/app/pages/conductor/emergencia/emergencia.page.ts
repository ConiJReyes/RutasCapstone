import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonMenuToggle,
  IonSpinner,
  ToastController,
  AlertController
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  menuOutline,
  warningOutline,
  sendOutline,
  personOutline,
  checkmarkCircleOutline,
  radioButtonOnOutline,
  radioButtonOffOutline,
  alertCircleOutline
} from 'ionicons/icons';

import { NotificationService } from '../../../services/notification.service';
import { EstudianteService, Estudiante } from '../../../services/estudiante.service';
import { AuthService } from '../../../services/auth.service';

addIcons({
  menuOutline,
  warningOutline,
  sendOutline,
  personOutline,
  checkmarkCircleOutline,
  radioButtonOnOutline,
  radioButtonOffOutline,
  alertCircleOutline
});

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
    IonMenuToggle,
    IonSpinner
  ]
})
export class EmergenciaPage implements OnInit {

  tipo: 'ruta' | 'estudiante' = 'ruta';
  categoria: string = '';
  descripcion: string = '';

  estudiantesLista: Estudiante[] = [];
  estudianteSeleccionadoId: number | null = null;
  cargandoEstudiantes: boolean = false;
  enviando: boolean = false;

  constructor(
    private notificationService: NotificationService,
    private estudianteService: EstudianteService,
    private authService: AuthService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.cargarEstudiantesConductor();
  }

  ionViewWillEnter() {
    this.cargarEstudiantesConductor();
  }

  cargarEstudiantesConductor() {
    const usuario = this.authService.getUsuario();
    if (!usuario) return;

    this.cargandoEstudiantes = true;
    this.estudianteService.obtenerEstudiantesConductor(usuario.id).subscribe({
      next: (estudiantes) => {
        this.cargandoEstudiantes = false;
        this.estudiantesLista = estudiantes || [];
        if (this.estudiantesLista.length > 0 && !this.estudianteSeleccionadoId) {
          this.estudianteSeleccionadoId = this.estudiantesLista[0].id || null;
        }
      },
      error: (err) => {
        console.warn('Fallback cargando lista general de estudiantes:', err);
        this.estudianteService.obtenerEstudiantes().subscribe({
          next: (estudiantes) => {
            this.cargandoEstudiantes = false;
            this.estudiantesLista = estudiantes || [];
            if (this.estudiantesLista.length > 0 && !this.estudianteSeleccionadoId) {
              this.estudianteSeleccionadoId = this.estudiantesLista[0].id || null;
            }
          },
          error: (e) => {
            this.cargandoEstudiantes = false;
            console.error('Error cargando estudiantes:', e);
          }
        });
      }
    });
  }

  seleccionarEstudiante(estId?: number) {
    if (estId !== undefined) {
      this.estudianteSeleccionadoId = estId;
    }
  }

  async confirmarYEnviar() {
    if (!this.categoria) {
      await this.mostrarToast('Por favor selecciona un tipo de emergencia.', 'warning');
      return;
    }

    if (!this.descripcion.trim()) {
      await this.mostrarToast('Por favor describe brevemente la situación.', 'warning');
      return;
    }

    if (this.tipo === 'estudiante' && !this.estudianteSeleccionadoId) {
      await this.mostrarToast('Debes seleccionar un estudiante de la lista.', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar envío',
      message: '¿Confirmar envío de esta emergencia?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'Enviar emergencia',
          role: 'confirm',
          handler: () => {
            this.procesarEnvio();
          }
        }
      ]
    });

    await alert.present();
  }

  private procesarEnvio() {
    this.enviando = true;

    const payload = {
      categoria: this.tipo === 'ruta' ? 'emergencia_ruta' : 'emergencia_estudiante',
      tipo_emergencia: this.categoria,
      descripcion: this.descripcion.trim(),
      estudiante_id: this.tipo === 'estudiante' ? this.estudianteSeleccionadoId : null
    };

    this.notificationService.enviarEmergencia(payload).subscribe({
      next: async (res: any) => {
        this.enviando = false;
        const msg = res.message || '🚨 Alerta de emergencia emitida y notificada exitosamente.';
        await this.mostrarToast(msg, 'danger');

        // Reset form
        this.categoria = '';
        this.descripcion = '';
      },
      error: async (err: any) => {
        this.enviando = false;
        console.error('Error enviando emergencia:', err);
        const errDetail = err.error?.message || 'No se pudo emitir la emergencia.';
        await this.mostrarToast(errDetail, 'danger');
      }
    });
  }

  private async mostrarToast(mensaje: string, color: 'success' | 'danger' | 'warning' = 'danger') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3500,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }

}