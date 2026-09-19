import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ColegioService, Colegio } from '../../../core/services/colegio.service';
import { SedesModalComponent } from '../sedes-modal/sedes-modal.component';
import { AdminColegioModalComponent } from '../admin-colegio-modal/admin-colegio-modal.component';

@Component({
  selector: 'app-colegios-lista',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, SedesModalComponent, AdminColegioModalComponent],
  templateUrl: './colegios-lista.component.html',
  styleUrl: './colegios-lista.component.scss'
})
export class ColegiosListaComponent implements OnInit {
  protected colegioService = inject(ColegioService);

  colegios = signal<Colegio[]>([]);
  cargando = signal(true);
  busqueda = signal('');
  colegioParaSedes = signal<Colegio | null>(null);
  colegioParaAdmins = signal<Colegio | null>(null);

  ngOnInit(): void {
    this.cargarColegios();
  }

  async cargarColegios(): Promise<void> {
    this.cargando.set(true);
    const data = await this.colegioService.getColegios();
    this.colegios.set(data);
    this.cargando.set(false);
  }

  colegiosFiltrados(): Colegio[] {
    const query = this.busqueda().toLowerCase().trim();
    if (!query) return this.colegios();
    return this.colegios().filter(c =>
      c.nombre.toLowerCase().includes(query) ||
      (c.rbd && c.rbd.toLowerCase().includes(query)) ||
      (c.direccion && c.direccion.toLowerCase().includes(query))
    );
  }

  seleccionarColegioContexto(colegio: Colegio): void {
    this.colegioService.setSelectedColegioId(colegio.id);
    alert(`Contexto cambiado activamente a: "${colegio.nombre}". La información en el panel ahora estará filtrada por este colegio.`);
  }

  abrirModalSedes(colegio: Colegio): void {
    this.colegioParaSedes.set(colegio);
  }

  cerrarModalSedes(): void {
    this.colegioParaSedes.set(null);
    this.cargarColegios();
  }

  abrirModalAdmins(colegio: Colegio): void {
    this.colegioParaAdmins.set(colegio);
  }

  cerrarModalAdmins(): void {
    this.colegioParaAdmins.set(null);
  }

  async eliminarColegio(colegio: Colegio): Promise<void> {
    if (confirm(`¿Estás seguro de que deseas eliminar el colegio "${colegio.nombre}"? esta acción no se puede deshacer.`)) {
      this.colegioService.deleteColegio(colegio.id).subscribe({
        next: () => {
          alert('Colegio eliminado correctamente.');
          this.cargarColegios();
        },
        error: (err) => {
          alert(err?.error?.message || 'Error al eliminar colegio.');
        }
      });
    }
  }
}
