import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  IonContent,
  IonSpinner,
  IonIcon
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import { arrowBackOutline, busOutline, callOutline, locationOutline, refreshOutline, shieldCheckmarkOutline } from 'ionicons/icons';

import { SeguimientoService, Seguimiento } from '../../../services/seguimiento.service';

addIcons({
  arrowBackOutline,
  busOutline,
  callOutline,
  locationOutline,
  refreshOutline,
  shieldCheckmarkOutline
});

@Component({
  selector: 'app-seguimiento-delegado',
  templateUrl: './seguimiento.page.html',
  styleUrls: ['./seguimiento.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonSpinner,
    IonIcon
  ]
})
export class SeguimientoDelegadoPage implements OnInit, OnDestroy {

  seguimiento: Seguimiento | null = null;
  cargando = true;
  error = '';
  private seguimientoSub?: Subscription;

  constructor(
    private router: Router,
    private location: Location,
    private seguimientoService: SeguimientoService
  ) {}

  ngOnInit(): void {
    this.cargarSeguimiento();
  }

  cargarSeguimiento(): void {
    this.cargando = true;
    this.error = '';

    this.seguimientoSub?.unsubscribe();
    this.seguimientoSub = this.seguimientoService.obtenerSeguimiento().subscribe({
      next: (data) => {
        this.seguimiento = data;
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        this.error = 'No se pudo obtener la ubicación del furgón escolar.';
      }
    });
  }

  volver(): void {
    this.location.back();
  }

  contactarConductor(): void {
    if (this.seguimiento?.conductor?.telefono) {
      window.location.href = `tel:${this.seguimiento.conductor.telefono}`;
    }
  }

  ngOnDestroy(): void {
    this.seguimientoSub?.unsubscribe();
  }
}
