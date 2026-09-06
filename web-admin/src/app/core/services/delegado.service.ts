import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DelegadoEstudiante {
  id: number;
  rut: string;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  colegio?: string;
  curso?: string;
  direccion_principal?: string;
  persona_autorizada?: string;
  rut_persona_autorizada?: string;
  apoderado_nombre?: string;
  apoderado_telefono?: string;
  conductor_nombre?: string;
  conductor_telefono?: string;
}

export interface Delegado {
  id: number;
  usuario: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  rut: string;
  nombre_completo: string;
  telefono: string;
  rol?: string;
  estudiantes?: DelegadoEstudiante[];
}

@Injectable({
  providedIn: 'root'
})
export class DelegadoService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api/delegados/';

  constructor(private http: HttpClient) {}

  getDelegados(): Observable<Delegado[]> {
    return this.http.get<Delegado[]>(this.apiUrl);
  }

  getDelegadoById(id: number): Observable<Delegado> {
    return this.http.get<Delegado>(`${this.apiUrl}${id}/`);
  }

  crearDelegado(delegadoData: {
    nombre: string;
    apellido?: string;
    rut: string;
    email: string;
    telefono?: string;
    password?: string;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, delegadoData);
  }

  actualizarDelegado(id: number, delegadoData: Partial<Delegado>): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}${id}/`, delegadoData);
  }

  deleteDelegado(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}${id}/`);
  }

  desvincularEstudiante(estudianteId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}desvincular-estudiante/`, {
      estudiante_id: estudianteId
    });
  }
}
