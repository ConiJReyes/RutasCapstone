import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColegioService, Colegio } from '../../../core/services/colegio.service';

@Component({
  selector: 'app-admin-colegio-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-colegio-modal.component.html',
  styleUrl: './admin-colegio-modal.component.scss'
})
export class AdminColegioModalComponent implements OnInit {
  @Input({ required: true }) colegio!: Colegio;
  @Output() alCerrar = new EventEmitter<void>();

  admins = signal<any[]>([]);
  cargando = signal<boolean>(true);
  guardando = signal<boolean>(false);
  mensajeError = signal<string>('');
  mensajeExito = signal<string>('');

  adminForm = signal<{ nombre: string; email: string; password: string }>({
    nombre: '',
    email: '',
    password: ''
  });

  constructor(private colegioService: ColegioService) {}

  ngOnInit(): void {
    if (this.colegio?.id) {
      this.cargarAdministradores();
    }
  }

  cargarAdministradores(): void {
    this.cargando.set(true);
    this.colegioService.getAdministradoresColegio(this.colegio.id).subscribe({
      next: (list) => {
        this.admins.set(list || []);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar administradores:', err);
        this.cargando.set(false);
      }
    });
  }

  guardarAdmin(): void {
    this.mensajeError.set('');
    this.mensajeExito.set('');
    const data = this.adminForm();

    if (!data.nombre || !data.nombre.trim()) {
      this.mensajeError.set('Debe ingresar el nombre del administrador.');
      return;
    }
    if (!data.email || !data.email.trim()) {
      this.mensajeError.set('Debe ingresar el correo electrónico.');
      return;
    }
    if (!data.password || data.password.length < 6) {
      this.mensajeError.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    this.guardando.set(true);

    const parts = data.nombre.trim().split(' ', 1);
    const nombre = parts[0];
    const apellido = data.nombre.trim().substring(nombre.length).trim();

    this.colegioService.createAdministradorColegio(this.colegio.id, {
      nombre: nombre,
      apellido: apellido,
      email: data.email.trim(),
      password: data.password
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.mensajeExito.set('Cuenta administrativa creada exitosamente.');
        this.adminForm.set({ nombre: '', email: '', password: '' });
        this.cargarAdministradores();
      },
      error: (err) => {
        this.guardando.set(false);
        const msg = err?.error?.message || 'Error al crear el administrador de colegio.';
        this.mensajeError.set(msg);
      }
    });
  }

  cerrar(): void {
    this.alCerrar.emit();
  }
}
