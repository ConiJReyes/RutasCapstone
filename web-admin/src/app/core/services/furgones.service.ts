import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

export interface Furgon {
  id?: number | string;
  patente: string;
  marcaModelo?: string;
  marca_modelo?: string;
  capacidad: number;
  conductorAsignado?: string;
  conductor_asignado?: string;
  estado: 'disponible' | 'en_ruta' | 'mantenimiento';
}

@Injectable({
  providedIn: 'root'
})
export class FurgonesService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api/furgones/';

  private mockFurgones: Furgon[] = [
    {
      id: 1,
      patente: 'K3-89-21',
      marca_modelo: 'Mercedes-Benz Sprinter',
      marcaModelo: 'Mercedes-Benz Sprinter',
      capacidad: 19,
      conductor_asignado: 'Carlos Pérez',
      conductorAsignado: 'Carlos Pérez',
      estado: 'en_ruta'
    },
    {
      id: 2,
      patente: 'HG-54-10',
      marca_modelo: 'Hyundai H350',
      marcaModelo: 'Hyundai H350',
      capacidad: 15,
      conductor_asignado: 'María Gómez',
      conductorAsignado: 'María Gómez',
      estado: 'disponible'
    }
  ];

  constructor(private http: HttpClient) {}

  getFurgones(): Observable<Furgon[]> {
    return this.http.get<Furgon[]>(this.apiUrl).pipe(
      catchError(() => of(this.mockFurgones))
    );
  }

  getFurgon(id: string | number): Observable<Furgon> {
    return this.http.get<Furgon>(`${this.apiUrl}${id}/`).pipe(
      catchError(() => {
        const item = this.mockFurgones.find(f => String(f.id) === String(id)) || this.mockFurgones[0];
        return of(item);
      })
    );
  }

  crearFurgon(furgon: Furgon): Observable<Furgon> {
    const payload = {
      patente: furgon.patente,
      marca_modelo: furgon.marcaModelo || furgon.marca_modelo || '',
      capacidad: furgon.capacidad,
      conductor_asignado: furgon.conductorAsignado || furgon.conductor_asignado || '',
      estado: furgon.estado
    };
    return this.http.post<Furgon>(this.apiUrl, payload).pipe(
      catchError(() => {
        const newObj = { ...furgon, id: Date.now() };
        this.mockFurgones.unshift(newObj);
        return of(newObj);
      })
    );
  }

  actualizarFurgon(id: string | number, furgon: Furgon): Observable<Furgon> {
    const payload = {
      patente: furgon.patente,
      marca_modelo: furgon.marcaModelo || furgon.marca_modelo || '',
      capacidad: furgon.capacidad,
      conductor_asignado: furgon.conductorAsignado || furgon.conductor_asignado || '',
      estado: furgon.estado
    };
    return this.http.put<Furgon>(`${this.apiUrl}${id}/`, payload).pipe(
      catchError(() => of({ ...furgon, id }))
    );
  }

  eliminarFurgon(id: string | number): Observable<any> {
    return this.http.delete(`${this.apiUrl}${id}/`).pipe(
      catchError(() => {
        this.mockFurgones = this.mockFurgones.filter(f => String(f.id) !== String(id));
        return of({ success: true });
      })
    );
  }
}
