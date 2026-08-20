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

  constructor(
    private conductorService: ConductorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.conductorService.getConductores().subscribe((data) => {
      this.conductores = data;
    });
  }

  onEdit(id: number): void {
    this.router.navigate(['/conductores/editar', id]);
  }

  onDelete(id: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este conductor?')) {
      this.conductorService.deleteConductor(id);
    }
  }
}