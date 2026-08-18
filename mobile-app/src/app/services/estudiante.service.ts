import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Estudiante {
  id?: number;
  nombre: string;
  apellido: string;
  rut: string;
  fecha_nacimiento: string;
  colegio: string;
  curso: string;
  direccion_principal: string;
  direccion_alternativa?: string;
  persona_autorizada?: string;
  rut_persona_autorizada?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EstudianteCreateResponse {
  message: string;
  estudiante: Estudiante;
}

@Injectable({
  providedIn: 'root'
})
export class EstudianteService {

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Token ${token}` : ''
    });
  }

  obtenerEstudiantes(): Observable<Estudiante[]> {
    return this.http.get<Estudiante[]>(`${this.apiUrl}/estudiantes/`, {
      headers: this.getAuthHeaders()
    });
  }

  crearEstudiante(estudiante: Estudiante): Observable<EstudianteCreateResponse> {
    return this.http.post<EstudianteCreateResponse>(`${this.apiUrl}/estudiantes/`, estudiante, {
      headers: this.getAuthHeaders()
    });
  }
}
