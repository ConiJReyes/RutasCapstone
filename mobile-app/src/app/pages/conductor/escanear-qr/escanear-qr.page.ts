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
  qrCodeOutline,
  cameraOutline,
  flashOutline,
  flashOffOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  personOutline,
  schoolOutline,
  locationOutline,
  arrowBackOutline,
  refreshOutline,
  closeCircleOutline,
  busOutline,
  createOutline,
  checkmarkDoneCircleOutline,
  timeOutline,
  checkboxOutline,
  squareOutline,
  peopleOutline
} from 'ionicons/icons';

addIcons({
  menuOutline,
  qrCodeOutline,
  cameraOutline,
  flashOutline,
  flashOffOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  personOutline,
  schoolOutline,
  locationOutline,
  arrowBackOutline,
  refreshOutline,
  closeCircleOutline,
  busOutline,
  createOutline,
  checkmarkDoneCircleOutline,
  timeOutline,
  checkboxOutline,
  squareOutline,
  peopleOutline
});

export interface QrDataEscaneado {
  tipo: 'APODERADO' | 'ESTUDIANTE' | 'DELEGADO_AUTORIZADO';
  id_usuario?: number;
  id_estudiante?: number;
  rut?: string;
  rut_estudiante?: string;
  nombre?: string;
  nombre_estudiante?: string;
  apoderado_nombre?: string;
  email?: string;
  colegio?: string;
  curso?: string;
  ts: number;
  valido_hasta?: number;
  codigo_seguridad: string;
}

export interface EstudianteEntregaItem {
  id: number;
  nombre: string;
  rut: string;
  colegio?: string;
  curso?: string;
  estado?: string;
  seleccionado: boolean;
}

export interface PersonaEntregaInfo {
  id_usuario?: number;
  rut: string;
  nombre: string;
  tipo: string;
}

@Component({
  selector: 'app-escanear-qr',
  templateUrl: './escanear-qr.page.html',
  styleUrls: ['./escanear-qr.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonSpinner,
    IonMenuToggle,
    IonIcon,
    IonToast
  ]
})
export class EscanearQrPage implements OnInit, OnDestroy {

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  camaraActiva: boolean = false;
  flashEncendido: boolean = false;
  cargandoCamara: boolean = false;
  errorCamara: string = '';

  codigoManual: string = '';

  qrEscaneado: QrDataEscaneado | null = null;
  qrEsValido: boolean = false;
  errorValidacion: string = '';

  tipoAccion: 'RECEPCION' | 'ENTREGA' = 'RECEPCION';
  notaAdicional: string = '';

  // Flujo entrega múltiple Apoderado / Delegado
  modoEntregaMultiple: boolean = false;
  cargandoConsultaEntrega: boolean = false;
  personaEntrega: PersonaEntregaInfo | null = null;
  estudiantesEntrega: EstudianteEntregaItem[] = [];

  confirmacionExitosa: boolean = false;
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
          video: { facingMode: 'environment' }
        });

        if (this.videoElement && this.videoElement.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.stream;
          await this.videoElement.nativeElement.play();
        }
        this.camaraActiva = true;
      } else {
        this.errorCamara = 'El dispositivo no soporta la cámara web directa. Usa la simulación rápida o ingresa el código.';
      }
    } catch (err: any) {
      console.warn('Cámara no accesible o permiso denegado:', err);
      this.errorCamara = 'No se pudo acceder a la cámara. Puedes usar la simulación manual a continuación.';
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

  toggleFlash() {
    this.flashEncendido = !this.flashEncendido;
    this.lanzarToast(`Flash ${this.flashEncendido ? 'encendido' : 'apagado'}`, 'medium');
  }

  procesarTextoQR(textoQR: string) {
    this.errorValidacion = '';
    this.qrEscaneado = null;
    this.modoEntregaMultiple = false;
    this.personaEntrega = null;
    this.estudiantesEntrega = [];

    try {
      const data: QrDataEscaneado = JSON.parse(textoQR);

      if (!data.tipo || !data.codigo_seguridad) {
        throw new Error('Formato de código QR inválido');
      }

      const ahora = Date.now();
      if (data.valido_hasta && ahora > data.valido_hasta) {
        this.qrEsValido = false;
        this.errorValidacion = 'El código QR ha expirado (duración máxima: 5 min). Pídele a la persona que lo renueve.';
        this.qrEscaneado = data;
        return;
      }

      this.qrEscaneado = data;

      // Si es Apoderado o Delegado, realizamos la consulta multi-estudiante al backend
      if (data.tipo === 'APODERADO' || data.tipo === 'DELEGADO_AUTORIZADO') {
        this.cargandoConsultaEntrega = true;
        this.notificationService.consultarQREntrega(textoQR).subscribe({
          next: (res: any) => {
            this.cargandoConsultaEntrega = false;
            if (res.valido) {
              this.qrEsValido = true;
              this.modoEntregaMultiple = true;
              this.tipoAccion = 'ENTREGA';
              this.personaEntrega = res.persona;
              this.estudiantesEntrega = (res.estudiantes || []).map((e: any) => ({
                ...e,
                seleccionado: true
              }));
              this.lanzarToast('¡QR de Recepción validado correctamente!', 'success');
            } else {
              this.qrEsValido = false;
              this.errorValidacion = res.error || 'Código QR no válido o expirado.';
            }
          },
          error: (err: any) => {
            this.cargandoConsultaEntrega = false;
            console.warn('[EscanearQR] Error consultando QR en backend:', err);
            const msgError = err.error?.error || 'No se pudo consultar el QR con el servidor.';
            this.qrEsValido = false;
            this.errorValidacion = msgError;
          }
        });
      } else {
        // Estudiante individual (Flujo Abordaje / Tradicional)
        this.qrEsValido = true;
        this.modoEntregaMultiple = false;
        this.lanzarToast('¡Código QR escaneado con éxito!', 'success');
      }

    } catch (e) {
      this.qrEsValido = false;
      this.errorValidacion = 'Código QR no reconocido. Asegúrate de escanear un código generado por Rutas Seguras.';
    }
  }

  toggleEstudianteEntrega(estId: number) {
    const item = this.estudiantesEntrega.find(e => e.id === estId);
    if (item) {
      item.seleccionado = !item.seleccionado;
    }
  }

  toggleTodosEstudiantes() {
    const todosSeleccionados = this.estudiantesEntrega.every(e => e.seleccionado);
    this.estudiantesEntrega.forEach(e => e.seleccionado = !todosSeleccionados);
  }

  get totalSeleccionadosCount(): number {
    return this.estudiantesEntrega.filter(e => e.seleccionado).length;
  }

  get todosSeleccionadosState(): boolean {
    return this.estudiantesEntrega.length > 0 && this.estudiantesEntrega.every(e => e.seleccionado);
  }

  // Métodos de simulación para pruebas del usuario
  simularEscaneoApoderado() {
    const demoPayload: QrDataEscaneado = {
      tipo: 'APODERADO',
      id_usuario: 12,
      rut: '15.432.890-K',
      nombre: 'Carlos Pérez',
      email: 'carlos.perez@email.com',
      ts: Date.now(),
      valido_hasta: Date.now() + (5 * 60 * 1000),
      codigo_seguridad: `APOD-0012-${Date.now().toString().slice(-4)}`
    };
    this.procesarTextoQR(JSON.stringify(demoPayload));
  }

  simularEscaneoEstudiante() {
    const demoPayload: QrDataEscaneado = {
      tipo: 'ESTUDIANTE',
      id_estudiante: 45,
      rut_estudiante: '23.891.102-3',
      nombre_estudiante: 'Lucía Pérez',
      apoderado_nombre: 'Carlos Pérez',
      colegio: 'Colegio San José',
      curso: '3° Básico A',
      ts: Date.now(),
      valido_hasta: Date.now() + (5 * 60 * 1000),
      codigo_seguridad: `EST-0045-${Date.now().toString().slice(-4)}`
    };
    this.procesarTextoQR(JSON.stringify(demoPayload));
  }

  simularEscaneoExpirado() {
    const demoPayload: QrDataEscaneado = {
      tipo: 'APODERADO',
      id_usuario: 12,
      rut: '15.432.890-K',
      nombre: 'Carlos Pérez',
      ts: Date.now() - (20 * 60 * 1000),
      valido_hasta: Date.now() - (5 * 60 * 1000), // Expirado hace 5 min
      codigo_seguridad: `APOD-EXPIRADO`
    };
    this.procesarTextoQR(JSON.stringify(demoPayload));
  }

  procesarManual() {
    if (!this.codigoManual.trim()) return;
    this.procesarTextoQR(this.codigoManual.trim());
  }

  confirmarRecepcion() {
    if (!this.qrEscaneado || !this.qrEsValido) return;

    if (this.modoEntregaMultiple) {
      this.confirmarEntregaMultiple();
      return;
    }

    const accionBackend = this.tipoAccion === 'RECEPCION' ? 'abordar' : 'llegar';
    const estId = this.qrEscaneado.id_estudiante;
    const rut = this.qrEscaneado.rut_estudiante || this.qrEscaneado.rut;

    this.notificationService.escanearQR(estId, rut, accionBackend).subscribe({
      next: () => console.log('[EscanearQR] Notificación de Abordaje/Llegada registrada en Backend.'),
      error: (err: any) => console.warn('[EscanearQR] Error enviando escaneo a Backend:', err)
    });

    this.confirmacionExitosa = true;
    this.lanzarToast('¡Abordaje / Entrega registrado exitosamente!', 'success');
  }

  confirmarEntregaMultiple() {
    const seleccionados = this.estudiantesEntrega.filter(e => e.seleccionado);
    if (seleccionados.length === 0) {
      this.lanzarToast('Debes seleccionar al menos un estudiante para confirmar la entrega.', 'warning');
      return;
    }

    const estIds = seleccionados.map(e => e.id);
    const rutPersona = this.personaEntrega?.rut || this.qrEscaneado?.rut || '';
    const nombrePersona = this.personaEntrega?.nombre || this.qrEscaneado?.nombre || '';

    this.notificationService.confirmarEntregaMultiple(estIds, rutPersona, nombrePersona).subscribe({
      next: (res: any) => {
        console.log('[EscanearQR] Entrega múltiple confirmada:', res);
        this.confirmacionExitosa = true;
        this.lanzarToast(`¡Entrega de ${seleccionados.length} estudiante(s) confirmada exitosamente!`, 'success');
      },
      error: (err: any) => {
        console.error('[EscanearQR] Error al confirmar entrega múltiple:', err);
        const errorMsg = err.error?.error || 'Ocurrió un error al registrar la entrega.';
        this.lanzarToast(errorMsg, 'danger');
      }
    });
  }

  resetearEscaneo() {
    this.qrEscaneado = null;
    this.qrEsValido = false;
    this.errorValidacion = '';
    this.confirmacionExitosa = false;
    this.codigoManual = '';
    this.notaAdicional = '';
    this.modoEntregaMultiple = false;
    this.personaEntrega = null;
    this.estudiantesEntrega = [];
    this.cargandoConsultaEntrega = false;
  }

  volverARuta() {
    this.router.navigate(['/conductor/ruta-activa']);
  }

  get fechaActual(): number {
    return Date.now();
  }

  private lanzarToast(mensaje: string, color: string = 'success') {
    this.mensajeToast = mensaje;
    this.colorToast = color;
    this.mostrarToast = true;
  }
}
