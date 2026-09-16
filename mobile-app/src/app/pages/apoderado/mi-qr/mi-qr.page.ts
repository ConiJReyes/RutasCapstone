import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as QRCode from 'qrcode';

import {
  IonContent,
  IonButton,
  IonCard,
  IonCardContent,
  IonSpinner,
  IonMenuToggle,
  IonIcon,
  IonToast,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSelect,
  IonSelectOption
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  menuOutline,
  qrCodeOutline,
  refreshOutline,
  copyOutline,
  downloadOutline,
  informationCircleOutline,
  personOutline,
  schoolOutline,
  checkmarkCircleOutline,
  swapHorizontalOutline,
  sparklesOutline,
  arrowBackOutline,
  shieldCheckmarkOutline,
  flashOutline,
  peopleOutline,
  timeOutline,
  alertCircleOutline
} from 'ionicons/icons';

import { AuthService, Usuario } from '../../../services/auth.service';
import { EstudianteService, Estudiante } from '../../../services/estudiante.service';

addIcons({
  menuOutline,
  qrCodeOutline,
  refreshOutline,
  copyOutline,
  downloadOutline,
  informationCircleOutline,
  personOutline,
  schoolOutline,
  checkmarkCircleOutline,
  swapHorizontalOutline,
  sparklesOutline,
  arrowBackOutline,
  shieldCheckmarkOutline,
  flashOutline,
  peopleOutline,
  timeOutline,
  alertCircleOutline
});

@Component({
  selector: 'app-mi-qr',
  templateUrl: './mi-qr.page.html',
  styleUrls: ['./mi-qr.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonButton,
    IonSpinner,
    IonMenuToggle,
    IonIcon,
    IonToast
  ]
})
export class MiQrPage implements OnInit, OnDestroy {

  usuario: Usuario | null = null;
  estudiantes: Estudiante[] = [];
  estudianteSeleccionado: Estudiante | null = null;

  modo: 'apoderado' | 'estudiante' = 'apoderado';
  cargandoEstudiantes: boolean = false;

  qrPayload: string = '';
  qrSvgSafe: SafeHtml = '';
  qrImageUrl: string = '';

  timestampHash: number = Date.now();
  duracionMinutos: number = 5; // lo disminui a 5min en vez de 15
  expiracionTs: number = 0;
  tiempoRestanteTexto: string = '15:00';
  esValido: boolean = true;
  private timerInterval: any = null;

  toastMensaje: string = '';
  toastColor: string = 'success';
  mostrarToast: boolean = false;

  constructor(
    private authService: AuthService,
    private estudianteService: EstudianteService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.usuario = this.authService.getUsuario();
    this.cargarEstudiantes();
    this.generarQR();
  }

  ionViewWillEnter() {
    this.usuario = this.authService.getUsuario();
    this.cargarEstudiantes();
    this.generarQR();
  }

  ngOnDestroy() {
    this.detenerTimer();
  }

  ionViewWillLeave() {
    this.detenerTimer();
  }

  cargarEstudiantes() {
    this.cargandoEstudiantes = true;
    this.estudianteService.obtenerEstudiantes().subscribe({
      next: (data) => {
        this.estudiantes = data;
        this.cargandoEstudiantes = false;
        if (this.estudiantes.length > 0 && !this.estudianteSeleccionado) {
          this.estudianteSeleccionado = this.estudiantes[0];
        }
      },
      error: (err) => {
        this.cargandoEstudiantes = false;
        console.error('Error cargando estudiantes para QR:', err);
      }
    });
  }

  cambiarModo(nuevoModo: 'apoderado' | 'estudiante') {
    this.modo = nuevoModo;
    if (this.modo === 'estudiante' && !this.estudianteSeleccionado && this.estudiantes.length > 0) {
      this.estudianteSeleccionado = this.estudiantes[0];
    }
    this.generarQR();
  }

  onEstudianteChange(event: any) {
    const estId = event.detail.value;
    const est = this.estudiantes.find(e => e.id === Number(estId));
    if (est) {
      this.estudianteSeleccionado = est;
      this.generarQR();
    }
  }

  seleccionarEstudianteDirecto(est: Estudiante) {
    this.modo = 'estudiante';
    this.estudianteSeleccionado = est;
    this.generarQR();
  }

  regenerarQR() {
    this.generarQR();
    this.lanzarNotificacion('Código QR actualizado por 5 minutos', 'primary');
  }

  async generarQR() {
    this.timestampHash = Date.now();
    this.expiracionTs = this.timestampHash + (this.duracionMinutos * 60 * 1000);
    this.esValido = true;

    let payloadObj: any = {};

    if (this.modo === 'apoderado' || !this.estudianteSeleccionado) {
      payloadObj = {
        tipo: 'APODERADO',
        id_usuario: this.usuario?.id || 0,
        rut: this.usuario?.rut || '12.345.678-9',
        nombre: `${this.usuario?.first_name || 'Apoderado'} ${this.usuario?.last_name || ''}`.trim(),
        email: this.usuario?.email || '',
        ts: this.timestampHash,
        valido_hasta: this.expiracionTs,
        duracion_minutos: this.duracionMinutos,
        codigo_seguridad: `APOD-${this.usuario?.id || 0}-${this.timestampHash.toString().slice(-6)}`
      };
    } else {
      payloadObj = {
        tipo: 'ESTUDIANTE',
        id_estudiante: this.estudianteSeleccionado.id,
        rut_estudiante: this.estudianteSeleccionado.rut,
        nombre_estudiante: `${this.estudianteSeleccionado.nombre} ${this.estudianteSeleccionado.apellido}`,
        colegio: this.estudianteSeleccionado.colegio,
        curso: this.estudianteSeleccionado.curso,
        apoderado_id: this.usuario?.id || 0,
        apoderado_nombre: `${this.usuario?.first_name || ''} ${this.usuario?.last_name || ''}`.trim(),
        ts: this.timestampHash,
        valido_hasta: this.expiracionTs,
        duracion_minutos: this.duracionMinutos,
        codigo_seguridad: `EST-${this.estudianteSeleccionado.id}-${this.timestampHash.toString().slice(-6)}`
      };
    }

    this.qrPayload = JSON.stringify(payloadObj);

    try {
      const svgMarkup = await QRCode.toString(this.qrPayload, {
        type: 'svg',
        margin: 2,
        color: { dark: '#244642', light: '#ffffff' }
      });
      this.qrSvgSafe = this.sanitizer.bypassSecurityTrustHtml(svgMarkup);

      this.qrImageUrl = await QRCode.toDataURL(this.qrPayload, {
        margin: 2,
        width: 400,
        color: { dark: '#244642', light: '#ffffff' }
      });
    } catch (err) {
      console.error('[MiQR] Error al generar código QR real:', err);
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

  copiarPayload() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.qrPayload).then(() => {
        this.lanzarNotificacion('Código QR copiado al portapapeles', 'success');
      }).catch(() => {
        this.lanzarNotificacion('No se pudo copiar automáticamente', 'danger');
      });
    } else {
      this.lanzarNotificacion('Copia no soportada en este navegador', 'warning');
    }
  }

  descargarQR() {
    const a = document.createElement('a');
    a.href = this.qrImageUrl;
    a.download = this.modo === 'apoderado'
      ? `QR_Apoderado_${this.usuario?.first_name || 'Apoderado'}.png`
      : `QR_Estudiante_${this.estudianteSeleccionado?.nombre || 'Hijo'}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.lanzarNotificacion('Descargando imagen QR...', 'success');
  }

  get codigoSeguridadActual(): string {
    if (this.modo === 'apoderado' || !this.estudianteSeleccionado) {
      return `APOD-${(this.usuario?.id || 1).toString().padStart(4, '0')}-${this.timestampHash.toString().slice(-4)}`;
    }
    return `EST-${(this.estudianteSeleccionado.id || 1).toString().padStart(4, '0')}-${this.timestampHash.toString().slice(-4)}`;
  }

  private lanzarNotificacion(mensaje: string, color: string = 'success') {
    this.toastMensaje = mensaje;
    this.toastColor = color;
    this.mostrarToast = true;
  }
}
