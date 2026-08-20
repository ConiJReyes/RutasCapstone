import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Conductor {
  id: number;
  usuario: string;
  rut: string;
  nombre_completo: string;
  licencia_conducir: string;
  telefono: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConductorService {
  // Datos mock / iniciales para probar la tabla de inmediato
  private conductores: Conductor[] = [
    {
      id: 1,
      usuario: 'jperez',
      rut: '12345678-K',
      nombre_completo: 'Juan Carlos Pérez Gómez',
      licencia_conducir: 'Clase A2',
      telefono: '+56912345678'
    },
    {
      id: 2,
      usuario: 'mgonzalez',
      rut: '15678901-2',
      nombre_completo: 'Maria Gonzalez Silva',
      licencia_conducir: 'Clase A3',
      telefono: '+56987654321'
    }
  ];

  private conductores$ = new BehaviorSubject<Conductor[]>(this.conductores);

  // Obtener la lista como Observable
  getConductores(): Observable<Conductor[]> {
    return this.conductores$.asObservable();
  }

  // Obtener un conductor por ID (para editar)
  getConductorById(id: number): Conductor | undefined {
    return this.conductores.find(c => c.id === id);
  }

  // Crear o actualizar un conductor
  saveConductor(conductorData: Partial<Conductor>): void {
    if (conductorData.id) {
      // Modificación / Edición
      const index = this.conductores.findIndex(c => c.id === conductorData.id);
      if (index !== -1) {
        this.conductores[index] = { ...this.conductores[index], ...conductorData } as Conductor;
      }
    } else {
      // Creación
      const newConductor: Conductor = {
        ...conductorData,
        id: Date.now() // Generamos un ID temporal único
      } as Conductor;
      this.conductores.push(newConductor);
    }
    this.conductores$.next([...this.conductores]);
  }

  // Eliminar un conductor
  deleteConductor(id: number): void {
    this.conductores = this.conductores.filter(c => c.id !== id);
    this.conductores$.next([...this.conductores]);
  }
}