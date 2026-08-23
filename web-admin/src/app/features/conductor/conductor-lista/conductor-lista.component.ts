import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ConductorService, Conductor } from '../../../core/services/conductor.service';

@Component({
  selector: 'app-conductor-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './conductor-lista.component.html',
  styleUrl: './conductor-lista.component.scss'
})
export class ConductorListaComponent implements OnInit {
  conductores: Conductor[] = [];
  cargando = true;

  constructor(
    private conductorService: ConductorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarConductores();
  }

  cargarConductores(): void {
    this.cargando = true;
    this.conductorService.getConductores().subscribe({
      next: (data) => {
        this.conductores = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando conductores desde backend:', err);
        this.cargando = false;
      }
    });
  }

  onEdit(id?: number): void {
    if (id) {
      this.router.navigate(['/conductores/editar', id]);
    }
  }

  onDelete(id?: number): void {
    if (!id) return;
    if (confirm('¿Estás seguro de que deseas eliminar este conductor?')) {
      this.conductorService.eliminarConductor(id).subscribe({
        next: () => {
          this.cargarConductores();
        },
        error: (err) => {
          console.error('Error eliminando conductor:', err);
          alert('No se pudo eliminar el conductor.');
        }
      });
    }
  }
}