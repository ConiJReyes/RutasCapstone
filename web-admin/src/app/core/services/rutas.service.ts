import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

export interface Ruta {
  id?: number | string;
  nombre: string;
  conductor: string;
  colegio: string;
  estudiantesCount?: number;
  estudiantes_count?: number;
  estado: 'activa' | 'inactiva';
}

@Injectable({
  providedIn: 'root'
})
export class RutasService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api/rutas-admin/';

  private mockRutas: Ruta[] = [
    {
      id: 1,
      nombre: 'Ruta 01 - Norte',
      conductor: 'Carlos Pérez',
      colegio: 'Escuela Bosques del Viento',
      estudiantes_count: 12,
      estudiantesCount: 12,
      estado: 'activa'
    },
    {
      id: 2,
      nombre: 'Ruta 02 - Sur',
      conductor: 'María Gómez',
      colegio: 'Escuela Bosques del Viento',
      estudiantes_count: 8,
      estudiantesCount: 8,
      estado: 'inactiva'
    }
  ];

  constructor(private http: HttpClient) {}

  getRutas(): Observable<Ruta[]> {
    return this.http.get<Ruta[]>(this.apiUrl).pipe(
      catchError(() => of(this.mockRutas))
    );
  }

  getRuta(id: string | number): Observable<Ruta> {
    return this.http.get<Ruta>(`${this.apiUrl}${id}/`).pipe(
      catchError(() => {
        const item = this.mockRutas.find(r => String(r.id) === String(id)) || this.mockRutas[0];
        return of({ ...item, colegio: 'Escuela Bosques del Viento' });
      })
    );
  }

  crearRuta(ruta: Ruta): Observable<Ruta> {
    const payload = {
      nombre: ruta.nombre,
      conductor: ruta.conductor,
      colegio: 'Escuela Bosques del Viento',
      estado: ruta.estado
    };
    return this.http.post<Ruta>(this.apiUrl, payload).pipe(
      catchError(() => {
        const newObj = { ...ruta, id: Date.now(), colegio: 'Escuela Bosques del Viento' };
        this.mockRutas.unshift(newObj);
        return of(newObj);
      })
    );
  }

  actualizarRuta(id: string | number, ruta: Ruta): Observable<Ruta> {
    const payload = {
      nombre: ruta.nombre,
      conductor: ruta.conductor,
      colegio: 'Escuela Bosques del Viento',
      estado: ruta.estado
    };
    return this.http.put<Ruta>(`${this.apiUrl}${id}/`, payload).pipe(
      catchError(() => of({ ...ruta, id, colegio: 'Escuela Bosques del Viento' }))
    );
  }

  eliminarRuta(id: string | number): Observable<any> {
    return this.http.delete(`${this.apiUrl}${id}/`).pipe(
      catchError(() => {
        this.mockRutas = this.mockRutas.filter(r => String(r.id) !== String(id));
        return of({ success: true });
      })
    );
  }
}
