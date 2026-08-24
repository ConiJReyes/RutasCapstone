import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  SeguimientoService,
  Seguimiento
} from '../../../services/seguimiento.service';

@Component({
  selector: 'app-seguimiento',
  templateUrl: './seguimiento.page.html',
  styleUrls: ['./seguimiento.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule
  ]
})
export class SeguimientoPage implements OnInit, OnDestroy {

  seguimiento: Seguimiento | null = null;

  cargando = true;
  error = '';

  private seguimientoSubscription?: Subscription;

  constructor(
    private router: Router,
    private seguimientoService: SeguimientoService
  ) { }

  ngOnInit(): void {
    this.cargarSeguimiento();
  }

  /**
   * Obtiene desde el backend el seguimiento
   * correspondiente al apoderado autenticado.
   */
  cargarSeguimiento(): void {

    this.cargando = true;
    this.error = '';

    this.seguimientoSubscription?.unsubscribe();

    this.seguimientoSubscription =
      this.seguimientoService.obtenerSeguimiento().subscribe({

        next: (data) => {

          this.seguimiento = data;
          this.cargando = false;

        },

        error: (error) => {

          console.error(
            'Error al cargar seguimiento:',
            error
          );

          this.seguimiento = null;
          this.cargando = false;

          this.error =
            'No se pudo cargar la información del seguimiento.';
        }

      });
  }

  /**
   * Estado visual de la ruta.
   */
  get estadoRuta(): string {

    if (!this.seguimiento) {
      return '';
    }

    switch (this.seguimiento.ruta.estado) {

      case 'en_camino':
        return 'En camino';

      case 'no_iniciada':
        return 'Ruta no iniciada';

      case 'finalizada':
        return 'Ruta finalizada';

      case 'pausada':
        return 'Ruta pausada';

      default:
        return 'Estado desconocido';
    }
  }

  /**
   * Descripción debajo del estado.
   */
  get descripcionEstado(): string {

    if (!this.seguimiento) {
      return '';
    }

    switch (this.seguimiento.ruta.estado) {

      case 'en_camino':
        return 'El furgón se encuentra en ruta';

      case 'no_iniciada':
        return 'El conductor aún no ha iniciado la ruta';

      case 'finalizada':
        return 'La ruta ha finalizado';

      case 'pausada':
        return 'La ruta se encuentra temporalmente pausada';

      default:
        return 'Estado de la ruta no disponible';
    }
  }

  /**
   * Indica si actualmente tenemos coordenadas.
   */
  get tieneUbicacion(): boolean {

    return !!(
      this.seguimiento &&
      this.seguimiento.ubicacion &&
      this.seguimiento.ubicacion.latitud !== null &&
      this.seguimiento.ubicacion.longitud !== null
    );
  }

  /**
   * Contacto del conductor.
   *
   * Posteriormente podemos conectar esto con
   * teléfono/WhatsApp utilizando el número
   * entregado por Django.
   */
  contactarConductor(): void {

    if (!this.seguimiento?.conductor?.telefono) {
      return;
    }

    window.location.href =
      `tel:${this.seguimiento.conductor.telefono}`;
  }

  /**
   * Navega a la pantalla de ruta completa.
   */
  verRutaCompleta(): void {

    if (!this.seguimiento?.ruta?.id) {
      return;
    }

    this.router.navigate(
      ['/apoderado/ruta-completa'],
      {
        queryParams: {
          ruta: this.seguimiento.ruta.id
        }
      }
    );
  }

  /**
   * Regresa al inicio del apoderado.
   */
  volver(): void {

    this.router.navigate([
      '/apoderado/inicio'
    ]);
  }

  ngOnDestroy(): void {

    this.seguimientoSubscription?.unsubscribe();
  }
}