import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as QRCode from 'qrcode';

import {
  IonContent,
  IonButton,
  IonIcon,
  ToastController
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  shieldCheckmarkOutline,
  refreshOutline,
  qrCodeOutline,
  copyOutline,
  timeOutline,
  alertCircleOutline
} from 'ionicons/icons';

import { AuthService, Usuario } from '../../../services/auth.service';

addIcons({
  arrowBackOutline,
  shieldCheckmarkOutline,
  refreshOutline,
  qrCodeOutline,
  copyOutline,
  timeOutline,
  alertCircleOutline
});

@Component({
  selector: 'app-mi-qr-delegado',
  templateUrl: './mi-qr.page.html',
  styleUrls: ['./mi-qr.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon
  ]
})
export class MiQrDelegadoPage implements OnInit, OnDestroy {

  usuario: Usuario | null = null;
  estudiantes: any[] = [];
  cargando: boolean = true;

  qrPayload: string = '';
  qrSvgSafe: SafeHtml = '';

  timestampHash: number = Date.now();
  duracionMinutos: number = 5;
  expiracionTs: number = 0;
  tiempoRestanteTexto: string = '05:00';
  esValido: boolean = true;
  private timerInterval: any = null;

  constructor(
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private location: Location,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.usuario = this.authService.getUsuario();
    this.cargarEstudiantes();
  }

  ionViewWillEnter() {
    this.usuario = this.authService.getUsuario();
    this.cargarEstudiantes();
  }

  ngOnDestroy() {
    this.detenerTimer();
  }

  cargarEstudiantes() {
    this.cargando = true;
    this.authService.getEstudiantesDelegado().subscribe({
      next: (res) => {
        this.cargando = false;
        this.estudiantes = res || [];
        this.generarQR();
      },
      error: () => {
        this.cargando = false;
        this.generarQR();
      }
    });
  }

  regenerarQR() {
    this.generarQR();
    this.mostrarToast('Código QR actualizado por 5 minutos', 'success');
  }

  async generarQR() {
    this.timestampHash = Date.now();
    this.expiracionTs = this.timestampHash + (this.duracionMinutos * 60 * 1000);
    this.esValido = true;

    const payloadObj = {
      tipo: 'DELEGADO_AUTORIZADO',
      id_usuario: this.usuario?.id || 0,
      rut: this.usuario?.rut || '',
      nombre: `${this.usuario?.first_name || 'Delegado'} ${this.usuario?.last_name || ''}`.trim(),
      estudiantes_autorizados: this.estudiantes.map(e => ({ id: e.id, rut: e.rut, nombre: e.nombre_completo })),
      ts: this.timestampHash,
      valido_hasta: this.expiracionTs,
      duracion_minutos: this.duracionMinutos,
      codigo_seguridad: `DEL-${this.usuario?.id || 0}-${this.timestampHash.toString().slice(-6)}`
    };

    this.qrPayload = JSON.stringify(payloadObj);

    try {
      const svgMarkup = await QRCode.toString(this.qrPayload, {
        type: 'svg',
        margin: 2,
        color: { dark: '#3f7d73', light: '#ffffff' }
      });
      this.qrSvgSafe = this.sanitizer.bypassSecurityTrustHtml(svgMarkup);
    } catch (err) {
      console.error('[MiQrDelegado] Error al generar código QR real:', err);
    }

    this.iniciarTimer();
  }

  private iniciarTimer() {
    this.detenerTimer();
    this.actualizarConteo();
    this.timerInterval = setInterval(() => {
      this.actualizarConteo();
    }, 1000);
  }

  private detenerTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private actualizarConteo() {
    const ahora = Date.now();
    const diffMs = this.expiracionTs - ahora;

    if (diffMs <= 0) {
      this.esValido = false;
      this.tiempoRestanteTexto = '00:00';
      this.detenerTimer();
    } else {
      const min = Math.floor(diffMs / 60000);
      const sec = Math.floor((diffMs % 60000) / 1000);
      this.tiempoRestanteTexto = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
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
