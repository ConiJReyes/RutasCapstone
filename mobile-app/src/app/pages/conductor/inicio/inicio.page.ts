import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  IonContent,
  IonButton,
  IonIcon,
  IonMenuToggle
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
  shieldCheckmarkOutline
} from 'ionicons/icons';

import { AuthService, Usuario } from '../../../services/auth.service';

addIcons({
  menuOutline,
  busOutline,
  playCircleOutline,
  personOutline,
  locationOutline,
  notificationsOutline,
  informationCircleOutline,
  cardOutline,
  shieldCheckmarkOutline
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
    IonMenuToggle
  ]
})
export class InicioPage implements OnInit {

  usuario: Usuario | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.cargarUsuario();
  }

  ionViewWillEnter() {
    this.cargarUsuario();
  }

  cargarUsuario() {
    this.usuario = this.authService.getUsuario();
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
}