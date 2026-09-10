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
  tiene_foto?: boolean;
  apoderado_nombre?: string;
  apoderado_telefono?: string;
  conductor?: number;
  conductor_nombre?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EstudianteCreateResponse {
  message: string;
  estudiante: Estudiante;
}

export interface EstudianteUpdateResponse {
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
  ) { }

  private getAuthHeaders(contentType: 'json' | 'multipart' = 'json'): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Authorization': token ? `Token ${token}` : ''
    });
    if (contentType === 'json') {
      headers = headers.set('Content-Type', 'application/json');
    }
    return headers;
  }

  obtenerEstudiantes(): Observable<Estudiante[]> {
    return this.http.get<Estudiante[]>(
      `${this.apiUrl}/estudiantes/`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  obtenerEstudiantesConductor(conductorId: number): Observable<Estudiante[]> {
    return this.http.get<Estudiante[]>(
      `${this.apiUrl}/conductores/${conductorId}/estudiantes/`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  obtenerEstudiante(id: number): Observable<Estudiante> {
    return this.http.get<Estudiante>(
      `${this.apiUrl}/estudiantes/${id}/`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  actualizarEstudiante(
    id: number,
    estudiante: Partial<Estudiante>
  ): Observable<EstudianteUpdateResponse> {
    return this.http.patch<EstudianteUpdateResponse>(
      `${this.apiUrl}/estudiantes/${id}/`,
      estudiante,
      { headers: this.getAuthHeaders() }
    );
  }

  crearEstudiante(estudiante: Estudiante, foto?: File): Observable<EstudianteCreateResponse> {
    const datos = new FormData();
    Object.entries(estudiante).forEach(([clave, valor]) => {
      if (valor !== undefined && valor !== null) {
        datos.append(clave, String(valor));
      }
    });
    if (foto) {
      datos.append('foto', foto, foto.name);
    }
    return this.http.post<EstudianteCreateResponse>(`${this.apiUrl}/estudiantes/`, datos, {
      // El navegador agrega el boundary correcto de multipart/form-data.
      headers: this.getAuthHeaders('multipart')
    });
  }
}
