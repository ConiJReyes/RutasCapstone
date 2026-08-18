import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  IonContent,
  IonInput,
  IonItem,
  IonButton,
  IonTextarea
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-agregar-hijo',
  templateUrl: './agregar-hijo.page.html',
  styleUrls: ['./agregar-hijo.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonInput,
    IonItem,
    IonButton,
    IonTextarea
  ]
})
export class AgregarHijoPage {

  nombre = '';
  apellido = '';
  rut = '';
  fechaNacimiento = '';
  colegio = '';
  curso = '';
  direccionPrincipal = '';
  direccionAlternativa = '';
  personaAutorizada = '';
  rutPersonaAutorizada = '';

  constructor(
    private router: Router
  ) {}

  guardarEstudiante() {

    if (
      !this.nombre ||
      !this.apellido ||
      !this.rut ||
      !this.fechaNacimiento ||
      !this.colegio ||
      !this.curso ||
      !this.direccionPrincipal
    ) {
      alert('Completa todos los campos obligatorios.');
      return;
    }

    alert('Estudiante registrado correctamente.');

    this.router.navigate(['/apoderado/mis-hijos']);
  }

}