import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DelegadoService, Delegado } from '../../../core/services/delegado.service';

@Component({
  selector: 'app-delegado-lista',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './delegado-lista.component.html',
  styleUrl: './delegado-lista.component.scss'
})
export class DelegadoListaComponent implements OnInit {
  delegados: Delegado[] = [];
  expandedDelegadoIds: Set<number> = new Set<number>();
  cargando = false;

  constructor(
    private delegadoService: DelegadoService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDelegados();
  }

  cargarDelegados(): void {
    this.cargando = true;
    this.delegadoService.getDelegados().subscribe({
      next: (data) => {
        this.delegados = data;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar delegados:', err);
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  toggleExpand(id: number): void {
    if (this.expandedDelegadoIds.has(id)) {
      this.expandedDelegadoIds.delete(id);
    } else {
      this.expandedDelegadoIds.add(id);
    }
  }

  isExpanded(id: number): boolean {
    return this.expandedDelegadoIds.has(id);
  }

  onEdit(id: number): void {
    this.router.navigate(['/delegados/editar', id]);
  }

  onDelete(id: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este delegado autorizado?')) {
      this.delegadoService.deleteDelegado(id).subscribe({
        next: () => {
          this.cargarDelegados();
        },
        error: (err) => {
          console.error('Error al eliminar delegado:', err);
          alert('Ocurrió un error al eliminar el delegado.');
        }
      });
    }
  }

  onDesvincular(estudianteId: number, estudianteNombre: string): void {
    if (confirm(`¿Deseas desvincular al estudiante "${estudianteNombre}" de este delegado?`)) {
      this.delegadoService.desvincularEstudiante(estudianteId).subscribe({
        next: (res) => {
          alert(res.message || 'Estudiante desvinculado con éxito.');
          this.cargarDelegados();
        },
        error: (err) => {
          console.error('Error al desvincular estudiante:', err);
          alert('Ocurrió un error al desvincular el estudiante.');
        }
      });
    }
  }
}
