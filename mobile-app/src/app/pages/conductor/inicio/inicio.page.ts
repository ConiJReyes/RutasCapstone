import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  IonContent,
  IonButton,
  IonIcon,
  IonMenuToggle,
  IonSpinner
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';

import {
  menuOutline,
  busOutline,
  playCircleOutline,
  personOutline,
  locationOutline,
  notificationsOutline,
  informationCircleOutline,
  cardOutline,
  shieldCheckmarkOutline,
  alertCircleOutline,
  schoolOutline
} from 'ionicons/icons';

import { AuthService, Usuario } from '../../../services/auth.service';
import { EstudianteService, Estudiante } from '../../../services/estudiante.service';

addIcons({
  menuOutline,
  busOutline,
  playCircleOutline,
  personOutline,
  locationOutline,
  notificationsOutline,
  informationCircleOutline,
  cardOutline,
  shieldCheckmarkOutline,
  alertCircleOutline,
  schoolOutline
});

@Component({
  selector: 'app-inicio-conductor',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonButton,
    IonIcon,
    IonMenuToggle,
    IonSpinner
  ]
})
export class InicioPage implements OnInit {

  usuario: Usuario | null = null;
  estudiantes: Estudiante[] = [];
  cargandoEstudiantes: boolean = true;
  errorEstudiantes: string = '';

  constructor(
    private authService: AuthService,
    private estudianteService: EstudianteService
  ) {}

  ngOnInit() {
    this.cargarDatosConductor();
  }

  ionViewWillEnter() {
    this.cargarDatosConductor();
  }

  cargarDatosConductor() {
    this.usuario = this.authService.getUsuario();
    if (this.usuario && this.usuario.id) {
      this.cargarEstudiantesConductor(this.usuario.id);
    } else {
      this.cargandoEstudiantes = false;
    }
  }

  cargarEstudiantesConductor(conductorId: number) {
    this.cargandoEstudiantes = true;
    this.errorEstudiantes = '';

    this.estudianteService.obtenerEstudiantesConductor(conductorId).subscribe({
      next: (data) => {
        this.estudiantes = data;
        this.cargandoEstudiantes = false;
      },
      error: (err) => {
        console.error('Error al obtener estudiantes del conductor:', err);
        this.cargandoEstudiantes = false;
        this.errorEstudiantes = 'No se pudieron cargar los estudiantes asignados a tu ruta.';
      }
    });
  }

  get saludo(): string {
    const hora = new Date().getHours();
    if (hora < 12) {
      return 'Buenos días';
    } else if (hora < 20) {
      return 'Buenas tardes';
    } else {
      return 'Buenas noches';
    }
  }

  get nombreMostrar(): string {
    if (!this.usuario) return 'Conductor';
    return this.usuario.first_name || 'Conductor';
  }

  get totalEstudiantes(): number {
    return this.estudiantes.length;
  }

  get proximaParada(): Estudiante | null {
    return this.estudiantes.length > 0 ? this.estudiantes[0] : null;
  }
}