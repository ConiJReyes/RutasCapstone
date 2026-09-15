import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
  duracionMinutos: number = 15;
  expiracionTs: number = 0;
  tiempoRestanteTexto: string = '15:00';
  esValido: boolean = true;
  private timerInterval: any = null;

  constructor(
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private location: Location,
    private toastController: ToastController
  ) {}

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
    this.mostrarToast('Código QR actualizado por 15 minutos', 'success');
  }

  generarQR() {
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
    const svgMarkup = this.buildSvgQr(this.qrPayload);
    this.qrSvgSafe = this.sanitizer.bypassSecurityTrustHtml(svgMarkup);

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

  private buildSvgQr(text: string): string {
    const modules = this.generateQrMatrix(text);
    const size = modules.length;
    const margin = 2;
    const totalSize = size + margin * 2;
    const cellSize = 10;
    const pixelDim = totalSize * cellSize;

    let paths = '';

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (modules[r][c]) {
          const x = (c + margin) * cellSize;
          const y = (r + margin) * cellSize;
          paths += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="1.5" ry="1.5" fill="#3f7d73" />`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pixelDim} ${pixelDim}" style="width:100%; height:auto;">
      <rect width="100%" height="100%" fill="#ffffff" rx="16" />
      ${paths}
    </svg>`;
  }

  private generateQrMatrix(text: string): boolean[][] {
    const N = text.length > 80 ? 33 : 25;
    const matrix: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));

    const drawFinder = (top: number, left: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isOuter = (r === 0 || r === 6 || c === 0 || c === 6);
          const isInner = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          matrix[top + r][left + c] = isOuter || isInner;
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, N - 7);
    drawFinder(N - 7, 0);

    for (let i = 8; i < N - 8; i++) {
      matrix[6][i] = (i % 2 === 0);
      matrix[i][6] = (i % 2 === 0);
    }

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }

    let seed = Math.abs(hash);
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const inTopLeft = (r < 8 && c < 8);
        const inTopRight = (r < 8 && c >= N - 8);
        const inBottomLeft = (r >= N - 8 && c < 8);
        const isTiming = (r === 6 || c === 6);

        if (!inTopLeft && !inTopRight && !inBottomLeft && !isTiming) {
          const bitIndex = (r * N + c) % text.length;
          const charCode = text.charCodeAt(bitIndex);
          const randomVal = rng();
          matrix[r][c] = ((charCode ^ Math.floor(randomVal * 255)) % 2 === 0);
        }
      }
    }

    return matrix;
  }
}
