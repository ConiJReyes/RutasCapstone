import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';

export interface Colegio {
  id: number;
  nombre: string;
  rbd?: string;
  direccion?: string;
  telefono?: string;
  email_contacto?: string;
  activo: boolean;
  total_estudiantes?: number;
  total_conductores?: number;
  total_sedes?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Sede {
  id: number;
  colegio: number;
  colegio_nombre?: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  activa: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ColegioService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api';
  private readonly SELECTED_COLEGIO_KEY = 'rutas_seguras_selected_colegio';

  private selectedColegioIdSignal = signal<number | null>(this.getStoredSelectedColegio());
  public readonly selectedColegioId = this.selectedColegioIdSignal.asReadonly();

  private colegiosListSignal = signal<Colegio[]>([]);
  public readonly colegiosList = this.colegiosListSignal.asReadonly();

  constructor(private http: HttpClient) {}

  private getStoredSelectedColegio(): number | null {
    try {
      const stored = localStorage.getItem(this.SELECTED_COLEGIO_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        return isNaN(parsed) ? null : parsed;
      }
    } catch (error) {
      console.error('Error al recuperar colegio seleccionado:', error);
    }
    return null;
  }

  public setSelectedColegioId(id: number | null): void {
    this.selectedColegioIdSignal.set(id);
    if (id !== null) {
      localStorage.setItem(this.SELECTED_COLEGIO_KEY, String(id));
    } else {
      localStorage.removeItem(this.SELECTED_COLEGIO_KEY);
    }
  }

  public async getColegios(): Promise<Colegio[]> {
    try {
      const colegios = await firstValueFrom(
        this.http.get<Colegio[]>(`${this.apiUrl}/colegios/`)
      );
      this.colegiosListSignal.set(colegios || []);
      return colegios || [];
    } catch (error) {
      console.error('Error al obtener colegios:', error);
      return [];
    }
  }

  public getColegio(id: number): Observable<Colegio> {
    return this.http.get<Colegio>(`${this.apiUrl}/colegios/${id}/`);
  }

  public createColegio(colegioData: Partial<Colegio>): Observable<Colegio> {
    return this.http.post<Colegio>(`${this.apiUrl}/colegios/`, colegioData);
  }

  public updateColegio(id: number, colegioData: Partial<Colegio>): Observable<Colegio> {
    return this.http.patch<Colegio>(`${this.apiUrl}/colegios/${id}/`, colegioData);
  }

  public deleteColegio(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/colegios/${id}/`);
  }

  // Sedes
  public getSedes(colegioId: number): Observable<Sede[]> {
    return this.http.get<Sede[]>(`${this.apiUrl}/colegios/${colegioId}/sedes/`);
  }

  public createSede(colegioId: number, sedeData: Partial<Sede>): Observable<Sede> {
    return this.http.post<Sede>(`${this.apiUrl}/colegios/${colegioId}/sedes/`, sedeData);
  }

  public updateSede(id: number, sedeData: Partial<Sede>): Observable<Sede> {
    return this.http.patch<Sede>(`${this.apiUrl}/sedes/${id}/`, sedeData);
  }

  public deleteSede(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/sedes/${id}/`);
  }

  // Administradores de Colegio
  public getAdministradoresColegio(colegioId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/colegios/${colegioId}/administradores/`);
  }

  public createAdministradorColegio(colegioId: number, adminData: { nombre: string; apellido?: string; email: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/colegios/${colegioId}/administradores/`, adminData);
  }
}
