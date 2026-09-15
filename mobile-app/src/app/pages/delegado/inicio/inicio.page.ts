import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  IonContent,
  IonButton,
  IonSpinner,
  IonIcon,
  ToastController
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  shieldCheckmarkOutline,
  qrCodeOutline,
  navigateOutline,
  callOutline,
  personOutline,
  busOutline,
  logOutOutline,
  schoolOutline,
  homeOutline
} from 'ionicons/icons';

import { AuthService, Usuario } from '../../../services/auth.service';

addIcons({
  shieldCheckmarkOutline,
  qrCodeOutline,
  navigateOutline,
  callOutline,
  personOutline,
  busOutline,
  logOutOutline,
  schoolOutline,
  homeOutline
});

export interface EstudianteDelegado {
  id: number;
  rut: string;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  colegio: string;
  curso: string;
  direccion_principal: string;
  apoderado_nombre: string;
  apoderado_telefono: string;
  conductor_nombre: string;
  conductor_telefono: string;
}

@Component({
  selector: 'app-inicio-delegado',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonButton,
    IonSpinner,
    IonIcon
  ]
})
export class InicioDelegadoPage implements OnInit {

  usuario: Usuario | null = null;
  estudiantes: EstudianteDelegado[] = [];
  cargando: boolean = true;
  errorMensaje: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
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

  cargarEstudiantes() {
    this.cargando = true;
    this.authService.getEstudiantesDelegado().subscribe({
      next: (res) => {
        this.cargando = false;
        this.estudiantes = res || [];
      },
      error: async (err) => {
        this.cargando = false;
        this.errorMensaje = 'No se pudieron cargar los estudiantes autorizados.';
      }
    });
  }

  cerrarSesion() {
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  llamarTelefono(numero?: string) {
    if (numero) {
      window.location.href = `tel:${numero}`;
    } else {
      this.mostrarToast('No hay teléfono registrado para contactar.', 'warning');
    }
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
