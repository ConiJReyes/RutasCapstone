import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonMenuToggle, IonHeader, IonToolbar, IonTitle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  warningOutline,
  sendOutline
} from 'ionicons/icons';

addIcons({
  menuOutline,
  warningOutline,
  sendOutline
});

@Component({
  selector: 'app-emergencia',
  templateUrl: './emergencia.page.html',
  styleUrls: ['./emergencia.page.scss'],
  standalone: true,
  imports: [IonTitle, IonToolbar, IonHeader, 
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonIcon,
    IonMenuToggle
  ]
})
export class EmergenciaPage {

  tipo = 'ruta';
  estudiante = '';
  categoria = '';
  descripcion = '';

  enviar() {
    console.log({
      tipo: this.tipo,
      estudiante: this.estudiante,
      categoria: this.categoria,
      descripcion: this.descripcion
    });
  }
}