import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApoderadoService, Apoderado } from '../../../core/services/apoderado.service';

@Component({
  selector: 'app-apoderado-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './apoderado-lista.component.html',
  styleUrl: './apoderado-lista.component.scss'
})
export class ApoderadoListaComponent implements OnInit {
  apoderados: Apoderado[] = [];
  expandedApoderadoIds: Set<number> = new Set<number>();
  cargando = false;

  constructor(
    private apoderadoService: ApoderadoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarApoderados();
  }

  cargarApoderados(): void {
    this.cargando = true;
    this.apoderadoService.getApoderados().subscribe({
      next: (data) => {
        this.apoderados = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar apoderados:', err);
        this.cargando = false;
      }
    });
  }

  toggleExpand(id: number): void {
    if (this.expandedApoderadoIds.has(id)) {
      this.expandedApoderadoIds.delete(id);
    } else {
      this.expandedApoderadoIds.add(id);
    }
  }

  isExpanded(id: number): boolean {
    return this.expandedApoderadoIds.has(id);
  }

  onEdit(id: number): void {
    this.router.navigate(['/apoderados/editar', id]);
  }

  onDelete(id: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este apoderado?')) {
      this.apoderadoService.deleteApoderado(id).subscribe({
        next: () => {
          this.cargarApoderados();
        },
        error: (err) => {
          console.error('Error al eliminar apoderado:', err);
          alert('Ocurrió un error al eliminar el apoderado.');
        }
      });
    }
  }
}