import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-ruta-activa',
  templateUrl: './ruta-activa.page.html',
  styleUrls: ['./ruta-activa.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class RutaActivaPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
