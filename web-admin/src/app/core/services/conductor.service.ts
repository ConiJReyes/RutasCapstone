import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Conductor {
  id?: number;
  usuario?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  nombre?: string;
  apellido?: string;
  nombre_completo?: string;
  rut: string;
  telefono?: string;
  licencia_conducir?: string;
  password?: string;
  rol?: string;
}

export interface ConductorCreateResponse {
  message: string;
  conductor: Conductor;
}

@Injectable({
  providedIn: 'root'
})
export class ConductorService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api/conductores/';

  constructor(private http: HttpClient) {}

  getConductores(): Observable<Conductor[]> {
    return this.http.get<Conductor[]>(this.apiUrl);
  }

  getConductorById(id: number): Observable<Conductor> {
    return this.http.get<Conductor>(`${this.apiUrl}${id}/`);
  }

  crearConductor(conductorData: {
    nombre: string;
    apellido?: string;
    rut: string;
    email: string;
    telefono?: string;
    licencia_conducir?: string;
    password: string;
  }): Observable<ConductorCreateResponse> {
    return this.http.post<ConductorCreateResponse>(this.apiUrl, conductorData);
  }

  actualizarConductor(id: number, conductorData: Partial<Conductor>): Observable<ConductorCreateResponse> {
    return this.http.patch<ConductorCreateResponse>(`${this.apiUrl}${id}/`, conductorData);
  }

  eliminarConductor(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}${id}/`);
  }
}