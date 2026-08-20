import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Estudiante {
  id?: number;
  apoderado_id?: number;
  rut: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  curso: string;
  colegio: string;
  direccion_retiro: string;
  latitud?: number;
  longitud?: number;
  foto_referencial?: string;
  dato_biometrico_huella?: string;
  estado_matricula: 'pendiente' | 'aprobado' | 'rechazado';
  activo: boolean;
}

export interface Apoderado {
  id: number;
  usuario: string;
  rut: string;
  nombre_completo: string;
  telefono: string;
  estudiantes?: Estudiante[]; // Lista de hijos/estudiantes a cargo
}

@Injectable({
  providedIn: 'root'
})
export class ApoderadoService {
  private apoderados: Apoderado[] = [
    {
      id: 1,
      usuario: 'mrodriguez',
      rut: '11222333-4',
      nombre_completo: 'María Rodríguez Morales',
      telefono: '+56987654321',
      estudiantes: [
        {
          id: 101,
          apoderado_id: 1,
          rut: '23456789-1',
          nombre_completo: 'Lucas Silva Rodríguez',
          fecha_nacimiento: '2015-05-12',
          curso: '4to Básico A',
          colegio: 'Colegio San Agustín',
          direccion_retiro: 'Av. Providencia 1234, Depto 502',
          estado_matricula: 'aprobado',
          activo: true
        },
        {
          id: 102,
          apoderado_id: 1,
          rut: '24567890-2',
          nombre_completo: 'Sofía Silva Rodríguez',
          fecha_nacimiento: '2018-09-20',
          curso: '1ro Básico B',
          colegio: 'Colegio San Agustín',
          direccion_retiro: 'Av. Providencia 1234, Depto 502',
          estado_matricula: 'aprobado',
          activo: true
        }
      ]
    },
    {
      id: 2,
      usuario: 'cramirez',
      rut: '14555666-7',
      nombre_completo: 'Carlos Ramírez Soto',
      telefono: '+56911223344',
      estudiantes: [
        {
          id: 103,
          apoderado_id: 2,
          rut: '22111333-K',
          nombre_completo: 'Mateo Ramírez Torres',
          fecha_nacimiento: '2014-02-28',
          curso: '5to Básico C',
          colegio: 'Liceo Bicentenario',
          direccion_retiro: 'Calle Las Condes 890',
          estado_matricula: 'pendiente',
          activo: true
        }
      ]
    }
  ];

  private apoderados$ = new BehaviorSubject<Apoderado[]>(this.apoderados);

  getApoderados(): Observable<Apoderado[]> {
    return this.apoderados$.asObservable();
  }

  getApoderadoById(id: number): Apoderado | undefined {
    return this.apoderados.find(a => a.id === id);
  }

  saveApoderado(apoderadoData: Partial<Apoderado>): void {
    if (apoderadoData.id) {
      const index = this.apoderados.findIndex(a => a.id === apoderadoData.id);
      if (index !== -1) {
        this.apoderados[index] = { 
          ...this.apoderados[index], 
          ...apoderadoData 
        } as Apoderado;
      }
    } else {
      const newApoderado: Apoderado = {
        ...apoderadoData,
        id: Date.now(),
        estudiantes: apoderadoData.estudiantes || []
      } as Apoderado;
      this.apoderados.push(newApoderado);
    }
    this.apoderados$.next([...this.apoderados]);
  }

  deleteApoderado(id: number): void {
    this.apoderados = this.apoderados.filter(a => a.id !== id);
    this.apoderados$.next([...this.apoderados]);
  }
}