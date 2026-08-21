import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  IonContent,
  IonButton,
  IonIcon
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  peopleOutline,
  busOutline,
  chevronForwardOutline,
  arrowBackOutline
} from 'ionicons/icons';

addIcons({
  peopleOutline,
  busOutline,
  chevronForwardOutline,
  arrowBackOutline
});

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    RouterLink,
    IonContent,
    IonButton,
    IonIcon
  ],
})
export class HomePage {

  constructor(
    private location: Location
  ) {}

  volver() {
    this.location.back();
  }

}