import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Estudiante } from '../../../core/services/estudiante.service';

@Component({
  selector: 'app-estudiante-detalle-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estudiante-detalle-modal.component.html',
  styleUrl: './estudiante-detalle-modal.component.scss'
})
export class EstudianteDetalleModalComponent {
  @Input({ required: true }) estudiante!: Estudiante;
  @Output() alCerrar = new EventEmitter<void>();

  cerrar(): void {
    this.alCerrar.emit();
  }
}
