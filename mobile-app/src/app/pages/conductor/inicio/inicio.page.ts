import { Component } from '@angular/core';

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
  informationCircleOutline
} from 'ionicons/icons';

addIcons({
  menuOutline,
  busOutline,
  playCircleOutline,
  personOutline,
  locationOutline,
  notificationsOutline,
  informationCircleOutline
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
export class InicioPage {

  constructor() {}

}