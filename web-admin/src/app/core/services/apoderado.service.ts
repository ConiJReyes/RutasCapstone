import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Estudiante {
  id?: number;
  apoderado_id?: number;
  rut: string;
  nombre_completo: string;
  fecha_nacimiento?: string;
  curso?: string;
  colegio?: string;
  direccion_retiro?: string;
  latitud?: number;
  longitud?: number;
  foto_referencial?: string;
  dato_biometrico_huella?: string;
  estado_matricula?: 'pendiente' | 'aprobado' | 'rechazado';
  activo?: boolean;
}

export interface Apoderado {
  id: number;
  usuario: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  rut: string;
  nombre_completo: string;
  telefono: string;
  password?: string;
  estudiantes?: Estudiante[];
}

@Injectable({
  providedIn: 'root'
})
export class ApoderadoService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api/apoderados/';

  constructor(private http: HttpClient) {}

  getApoderados(): Observable<Apoderado[]> {
    return this.http.get<Apoderado[]>(this.apiUrl);
  }

  getApoderadoById(id: number): Observable<Apoderado> {
    return this.http.get<Apoderado>(`${this.apiUrl}${id}/`);
  }

  crearApoderado(apoderadoData: {
    nombre_completo: string;
    rut: string;
    usuario: string;
    telefono: string;
    password?: string;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, apoderadoData);
  }

  actualizarApoderado(id: number, apoderadoData: Partial<Apoderado>): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}${id}/`, apoderadoData);
  }

  deleteApoderado(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}${id}/`);
  }
}