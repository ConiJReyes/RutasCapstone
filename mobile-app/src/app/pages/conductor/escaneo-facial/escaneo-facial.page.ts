import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService } from '../../../services/notification.service';
import {
  IonContent,
  IonButton,
  IonSpinner,
  IonMenuToggle,
  IonIcon,
  IonToast
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  scanOutline,
  cameraOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  personOutline,
  schoolOutline,
  arrowBackOutline,
  refreshOutline,
  closeCircleOutline,
  busOutline,
  checkmarkDoneCircleOutline,
  swapHorizontalOutline,
  shieldCheckmarkOutline,
  fingerPrintOutline
} from 'ionicons/icons';

addIcons({
  menuOutline,
  scanOutline,
  cameraOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  personOutline,
  schoolOutline,
  arrowBackOutline,
  refreshOutline,
  closeCircleOutline,
  busOutline,
  checkmarkDoneCircleOutline,
  swapHorizontalOutline,
  shieldCheckmarkOutline,
  fingerPrintOutline
});

export interface ResultadoFacial {
  coincidencia: boolean;
  score?: number;
  similitud_porcentaje?: number;
  tipo_identificado?: string;
  nombre_identificado?: string;
  rut_identificado?: string;
  estudiante_id?: number;
  estudiante_nombre?: string;
  colegio?: string;
  curso?: string;
  relacion?: string;
  mensaje: string;
  motivo?: string;
  evento_registrado?: boolean;
}

@Component({
  selector: 'app-escaneo-facial',
  templateUrl: './escaneo-facial.page.html',
  styleUrls: ['./escaneo-facial.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonSpinner,
    IonMenuToggle,
    IonIcon,
    IonToast
  ]
})
export class EscaneoFacialPage implements OnInit, OnDestroy {

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  camaraActiva: boolean = false;
  cargandoCamara: boolean = false;
  procesandoEscaneo: boolean = false;
  errorCamara: string = '';

  tipoAccion: 'abordar' | 'entregar' = 'abordar';

  resultadoBackend: ResultadoFacial | null = null;
  confirmado: boolean = false;
  ultimaCapturaBase64: string = '';

  mensajeToast: string = '';
  mostrarToast: boolean = false;
  colorToast: string = 'success';

  private stream: MediaStream | null = null;

  constructor(
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.iniciarCamara();
  }

  ionViewWillEnter() {
    this.iniciarCamara();
  }

  ngOnDestroy() {
    this.detenerCamara();
  }

  ionViewWillLeave() {
    this.detenerCamara();
  }

  async iniciarCamara() {
    this.cargandoCamara = true;
    this.errorCamara = '';

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        });

        if (this.videoElement && this.videoElement.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.stream;
          await this.videoElement.nativeElement.play();
        }
        this.camaraActiva = true;
      } else {
        this.errorCamara = 'El dispositivo o navegador no soporta acceso directo a cámara web.';
      }
    } catch (err: any) {
      console.warn('[EscaneoFacial] Cámara no accesible:', err);
      this.errorCamara = 'No se pudo acceder a la cámara. Revisa los permisos del navegador.';
    } finally {
      this.cargandoCamara = false;
    }
  }

  detenerCamara() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.camaraActiva = false;
  }

  setModo(modo: 'abordar' | 'entregar') {
    this.tipoAccion = modo;
    this.resetearEscaneo();
  }

  capturarYProcesarRostro() {
    if (!this.camaraActiva || !this.videoElement || !this.canvasElement) {
      this.lanzarToast('La cámara debe estar activa para realizar la captura biométrica.', 'warning');
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      this.lanzarToast('Esperando transmisión de video de cámara...', 'warning');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imagenBase64 = canvas.toDataURL('image/jpeg', 0.85);
    this.ultimaCapturaBase64 = imagenBase64;

    this.procesandoEscaneo = true;
    this.resultadoBackend = null;

    this.notificationService.escaneoFacial(imagenBase64, this.tipoAccion, false).subscribe({
      next: (res: ResultadoFacial) => {
        this.procesandoEscaneo = false;
        this.resultadoBackend = res;

        if (res.coincidencia) {
          this.lanzarToast(`¡Coincidencia biometrica encontrada! (${res.similitud_porcentaje}% similitud)`, 'success');
        } else {
          this.lanzarToast(res.mensaje || 'Rostro no identificado.', 'danger');
        }
      },
      error: (err) => {
        this.procesandoEscaneo = false;
        console.error('[EscaneoFacial] Error al procesar escaneo biométrico:', err);
        this.lanzarToast('Error de comunicación con el motor biométrico backend.', 'danger');
      }
    });
  }

  confirmarRegistro() {
    if (!this.resultadoBackend || !this.resultadoBackend.coincidencia || !this.ultimaCapturaBase64) return;

    this.procesandoEscaneo = true;

    this.notificationService.escaneoFacial(this.ultimaCapturaBase64, this.tipoAccion, true).subscribe({
      next: (res: ResultadoFacial) => {
        this.procesandoEscaneo = false;
        this.confirmado = true;
        const msg = this.tipoAccion === 'abordar' ? '¡Abordaje verificado y registrado!' : '¡Entrega a persona autorizada verificada y registrada!';
        this.lanzarToast(msg, 'success');
      },
      error: (err) => {
        this.procesandoEscaneo = false;
        console.error('[EscaneoFacial] Error al confirmar registro:', err);
        this.lanzarToast('No se pudo confirmar el registro en el backend.', 'danger');
      }
    });
  }

  resetearEscaneo() {
    this.resultadoBackend = null;
    this.confirmado = false;
    this.ultimaCapturaBase64 = '';
  }

  volverARuta() {
    this.router.navigate(['/conductor/ruta-activa']);
  }

  private lanzarToast(mensaje: string, color: string = 'success') {
    this.mensajeToast = mensaje;
    this.colorToast = color;
    this.mostrarToast = true;
  }
}
