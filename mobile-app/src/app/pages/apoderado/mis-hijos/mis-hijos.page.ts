import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonCard,
  IonCardContent,
  IonSpinner,
  IonMenuToggle
} from '@ionic/angular/standalone';

import { EstudianteService, Estudiante } from '../../../services/estudiante.service';

@Component({
  selector: 'app-mis-hijos',
  templateUrl: './mis-hijos.page.html',
  styleUrls: ['./mis-hijos.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonCard,
    IonCardContent,
    IonSpinner,
    IonMenuToggle
  ]
})
export class MisHijosPage {

  estudiantes: Estudiante[] = [];
  cargando: boolean = true;
  errorMensaje: string = '';

  constructor(
    private estudianteService: EstudianteService
  ) {}

  ionViewWillEnter() {
    this.cargarEstudiantes();
  }

  cargarEstudiantes() {
    this.cargando = true;
    this.errorMensaje = '';

    this.estudianteService.obtenerEstudiantes().subscribe({
      next: (data) => {
        this.estudiantes = data;
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje = 'No se pudieron cargar los estudiantes.';
        console.error('Error cargando estudiantes:', err);
      }
    });
  }

}