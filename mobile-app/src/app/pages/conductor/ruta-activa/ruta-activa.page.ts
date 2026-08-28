import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  IonContent,
  IonIcon,
  IonMenuToggle,
  IonToast,
  IonSpinner
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';

import {
  menuOutline,
  busOutline,
  locationOutline,
  locateOutline,
  personOutline,
  checkmarkCircleOutline,
  qrCodeOutline,
  warningOutline,
  flagOutline,
  timeOutline,
  arrowForwardOutline,
  checkmarkDoneCircleOutline
} from 'ionicons/icons';

import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';
import { EstudianteService } from '../../../services/estudiante.service';

addIcons({
  menuOutline,
  busOutline,
  locationOutline,
  locateOutline,
  personOutline,
  checkmarkCircleOutline,
  qrCodeOutline,
  warningOutline,
  flagOutline,
  timeOutline,
  arrowForwardOutline,
  checkmarkDoneCircleOutline
});

export interface ParadaRuta {
  id: number;
  numero: number;
  estudiante: string;
  colegioOCurso: string;
  direccion: string;
  personaAutorizada: string;
  relacion: string;
  estado: 'actual' | 'pendiente' | 'completada';
  tiempoEstimadoMin: number;
}

@Component({
  selector: 'app-ruta-activa',
  templateUrl: './ruta-activa.page.html',
  styleUrls: ['./ruta-activa.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonIcon,
    IonMenuToggle,
    IonToast
  ]
})
export class RutaActivaPage implements OnInit, OnDestroy {

  paradas: ParadaRuta[] = [];
  cargandoParadas: boolean = true;
  paradaActualIndex: number = 0;
  segundosTranscurridos: number = 0;

  private intervalTimer: ReturnType<typeof setInterval> | null = null;

  mostrarToast: boolean = false;
  mensajeToast: string = '';
  colorToast: string = 'success';

  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private authService: AuthService,
    private estudianteService: EstudianteService
  ) {}

  ngOnInit(): void {
    this.iniciarTimer();
    this.cargarParadasReales();
    this.notificationService.iniciarRuta().subscribe({
      next: () => console.log('[RutaActiva] Notificación de Ruta Iniciada registrada en Backend.'),
      error: (err) => console.warn('[RutaActiva] Error llamando a iniciarRuta:', err)
    });
  }

  ngOnDestroy(): void {
    this.detenerTimer();
  }

  ionViewWillLeave(): void {
    this.detenerTimer();
  }

  cargarParadasReales(): void {
    const usuario = this.authService.getUsuario();
    if (usuario && usuario.id) {
      this.cargandoParadas = true;
      this.estudianteService.obtenerEstudiantesConductor(usuario.id).subscribe({
        next: (estudiantes) => {
          this.cargandoParadas = false;
          if (estudiantes && estudiantes.length > 0) {
            this.paradas = estudiantes.map((e, index) => ({
              id: e.id || index + 1,
              numero: index + 1,
              estudiante: `${e.nombre} ${e.apellido}`,
              colegioOCurso: `${e.curso} · ${e.colegio}`,
              direccion: e.direccion_principal || 'Dirección de entrega',
              personaAutorizada: e.persona_autorizada || e.apoderado_nombre || 'Apoderado / Tutor',
              relacion: 'Contacto',
              estado: index === 0 ? 'actual' : 'pendiente',
              tiempoEstimadoMin: (index + 1) * 6
            }));
          } else {
            this.paradas = [];
          }
        },
        error: (err) => {
          console.error('Error al obtener paradas reales del conductor:', err);
          this.cargandoParadas = false;
        }
      });
    } else {
      this.cargandoParadas = false;
    }
  }

  private iniciarTimer(): void {
    this.detenerTimer();

    this.intervalTimer = setInterval(() => {
      this.segundosTranscurridos++;
    }, 1000);
  }

  private detenerTimer(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  get tiempoFormateado(): string {
    const mins = Math.floor(this.segundosTranscurridos / 60);
    const secs = this.segundosTranscurridos % 60;

    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }

  get paradaActual(): ParadaRuta | null {
    if (this.paradaActualIndex < this.paradas.length) {
      return this.paradas[this.paradaActualIndex];
    }

    return null;
  }

  get completadasCount(): number {
    return this.paradas.filter(
      p => p.estado === 'completada'
    ).length;
  }

  get todasCompletadas(): boolean {
    return this.paradas.length > 0 && this.completadasCount === this.paradas.length;
  }

  confirmarLlegada(): void {
    if (this.paradas.length === 0) {
      this.lanzarToast('No hay paradas registradas en tu ruta.', 'warning');
      return;
    }

    if (this.paradaActualIndex >= this.paradas.length) {
      this.lanzarToast(
        'Todas las paradas ya fueron completadas.',
        'warning'
      );
      return;
    }

    const paradaActual = this.paradas[this.paradaActualIndex];

    paradaActual.estado = 'completada';
    this.paradaActualIndex++;

    if (this.paradaActualIndex < this.paradas.length) {
      this.paradas[this.paradaActualIndex].estado = 'actual';

      this.lanzarToast(
        `Llegada a Parada ${paradaActual.numero} (${paradaActual.estudiante}) confirmada.`,
        'success'
      );
    } else {
      this.lanzarToast(
        '¡Llegada confirmada! Todas las paradas del recorrido han sido completadas.',
        'success'
      );
    }
  }

  centrarUbicacion(): void {
    this.lanzarToast(
      'Ubicación GPS del furgón centrada en el mapa.',
      'primary'
    );
  }

  irAEscanearQR(): void {
    this.router.navigate(['/conductor/escanear-qr']);
  }

  irAEmergencia(): void {
    this.router.navigate(['/conductor/emergencia']);
  }

  finalizarRuta(): void {
    this.detenerTimer();

    this.notificationService.finalizarRuta().subscribe({
      next: () => console.log('[RutaActiva] Notificación de Ruta Finalizada registrada en Backend.'),
      error: (err) => console.warn('[RutaActiva] Error llamando a finalizarRuta:', err)
    });

    this.lanzarToast(
      'Ruta finalizada exitosamente. Redirigiendo a inicio...',
      'success'
    );

    setTimeout(() => {
      this.router.navigate(['/conductor/inicio']);
    }, 1200);
  }

  private lanzarToast(
    mensaje: string,
    color: string = 'success'
  ): void {
    this.mensajeToast = mensaje;
    this.colorToast = color;
    this.mostrarToast = true;
  }
}