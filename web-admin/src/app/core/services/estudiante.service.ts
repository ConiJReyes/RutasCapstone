import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';

export interface Estudiante {
  id: number;
  nombre: string;
  apellido: string;
  nombre_completo?: string;
  rut: string;
  fecha_nacimiento?: string;
  colegio?: number;
  colegio_nombre?: string;
  sede?: number;
  sede_nombre?: string;
  curso?: string;
  direccion_principal?: string;
  direccion_alternativa?: string;
  persona_autorizada?: string;
  rut_persona_autorizada?: string;
  foto?: string;
  tiene_foto?: boolean;
  apoderado?: number;
  apoderado_nombre?: string;
  apoderado_telefono?: string;
  conductor?: number;
  conductor_id?: number;
  conductor_nombre?: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EstudianteService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api';

  private estudiantesListSignal = signal<Estudiante[]>([]);
  public readonly estudiantesList = this.estudiantesListSignal.asReadonly();

  constructor(private http: HttpClient) {}

  public async getEstudiantes(): Promise<Estudiante[]> {
    try {
      const data = await firstValueFrom(
        this.http.get<Estudiante[]>(`${this.apiUrl}/estudiantes/`)
      );
      this.estudiantesListSignal.set(data || []);
      return data || [];
    } catch (error) {
      console.error('Error al cargar estudiantes:', error);
      return [];
    }
  }

  public getEstudianteById(id: number): Observable<Estudiante> {
    return this.http.get<Estudiante>(`${this.apiUrl}/estudiantes/${id}/`);
  }

  public createEstudiante(data: Partial<Estudiante>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/estudiantes/`, data);
  }

  public updateEstudiante(id: number, data: Partial<Estudiante>): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/estudiantes/${id}/`, data);
  }

  public deleteEstudiante(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/estudiantes/${id}/`);
  }
}
