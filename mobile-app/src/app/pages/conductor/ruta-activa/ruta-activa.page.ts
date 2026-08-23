import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import {
  IonContent,
  IonIcon,
  IonMenuToggle,
  IonButton,
  IonToast
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
    RouterLink,
    IonContent,
    IonIcon,
    IonMenuToggle,
    IonButton,
    IonToast
  ]
})
export class RutaActivaPage implements OnInit, OnDestroy {

  paradas: ParadaRuta[] = [
    {
      id: 1,
      numero: 1,
      estudiante: 'Lucía Pérez',
      colegioOCurso: '3° Básico · Colegio San José',
      direccion: 'Av. Los Carrera 1234',
      personaAutorizada: 'María González',
      relacion: 'Nana',
      estado: 'actual',
      tiempoEstimadoMin: 5
    },
    {
      id: 2,
      numero: 2,
      estudiante: 'Andrés Pérez',
      colegioOCurso: '5° Básico · Colegio San José',
      direccion: 'Calle Las Flores 456',
      personaAutorizada: 'Carlos Pérez',
      relacion: 'Padre',
      estado: 'pendiente',
      tiempoEstimadoMin: 12
    },
    {
      id: 3,
      numero: 3,
      estudiante: 'Tomás Martínez',
      colegioOCurso: '6° Básico · Colegio Central',
      direccion: 'Pasaje Los Robles 789',
      personaAutorizada: 'Ana Martínez',
      relacion: 'Madre',
      estado: 'pendiente',
      tiempoEstimadoMin: 20
    }
  ];

  paradaActualIndex: number = 0;
  segundosTranscurridos: number = 512; // Inicia en 08:32
  private intervalTimer: any = null;

  mostrarToast: boolean = false;
  mensajeToast: string = '';
  colorToast: string = 'success';

  constructor(private router: Router) {}

  ngOnInit() {
    this.iniciarTimer();
  }

  ngOnDestroy() {
    this.detenerTimer();
  }

  ionViewWillLeave() {
    this.detenerTimer();
  }

  private iniciarTimer() {
    this.detenerTimer();
    this.intervalTimer = setInterval(() => {
      this.segundosTranscurridos++;
    }, 1000);
  }

  private detenerTimer() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  get tiempoFormateado(): string {
    const mins = Math.floor(this.segundosTranscurridos / 60);
    const secs = this.segundosTranscurridos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  get paradaActual(): ParadaRuta | null {
    if (this.paradaActualIndex < this.paradas.length) {
      return this.paradas[this.paradaActualIndex];
    }
    return null;
  }

  get completadasCount(): number {
    return this.paradas.filter(p => p.estado === 'completada').length;
  }

  get todasCompletadas(): boolean {
    return this.completadasCount === this.paradas.length;
  }

  confirmarLlegada() {
    if (this.paradaActualIndex >= this.paradas.length) {
      this.lanzarToast('Todas las paradas ya fueron completadas.', 'warning');
      return;
    }

    const paradaActual = this.paradas[this.paradaActualIndex];
    paradaActual.estado = 'completada';

    this.paradaActualIndex++;

    if (this.paradaActualIndex < this.paradas.length) {
      this.paradas[this.paradaActualIndex].estado = 'actual';
      this.lanzarToast(`Llegada a Parada ${paradaActual.numero} (${paradaActual.estudiante}) confirmada.`, 'success');
    } else {
      this.lanzarToast(`¡Llegada confirmada! Todas las paradas del recorrido han sido completadas.`, 'success');
    }
  }

  centrarUbicacion() {
    this.lanzarToast('Ubicación GPS del furgón centrada en el mapa.', 'primary');
  }

  irAEscanearQR() {
    this.router.navigate(['/conductor/escanear-qr']);
  }

  irAEmergencia() {
    this.router.navigate(['/conductor/emergencia']);
  }

  finalizarRuta() {
    this.detenerTimer();
    this.lanzarToast('Ruta finalizada exitosamente. Redirigiendo a inicio...', 'success');
    setTimeout(() => {
      this.router.navigate(['/conductor/inicio']);
    }, 1200);
  }

  private lanzarToast(mensaje: string, color: string = 'success') {
    this.mensajeToast = mensaje;
    this.colorToast = color;
    this.mostrarToast = true;
  }
}