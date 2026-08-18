import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  IonContent,
  IonInput,
  IonItem,
  IonButton
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-recuperar-password',
  templateUrl: './recuperar-password.page.html',
  styleUrls: ['./recuperar-password.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonInput,
    IonItem,
    IonButton
  ]
})
export class RecuperarPasswordPage implements OnInit {

  rol: string = 'apoderado';

  constructor(
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.rol = params['rol'] || 'apoderado';
    });
  }

}