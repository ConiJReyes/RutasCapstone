import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Seguimiento {
  estudiante: {
    id: number;
    nombre: string;
  };
  conductor: {
    id: number;
    nombre: string;
    telefono: string | null;
  };
  ruta: {
    id: number;
    nombre: string;
    estado:
      | 'no_iniciada'
      | 'en_camino'
      | 'finalizada'
      | 'pausada';
  };
  ubicacion: {
    latitud: number | null;
    longitud: number | null;
    ultima_actualizacion: string | null;
  };
  llegada_estimada: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SeguimientoService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': token ? `Token ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  obtenerSeguimiento(): Observable<Seguimiento> {
    return this.http.get<Seguimiento>(
      `${this.apiUrl}/seguimiento/`,
      { headers: this.getAuthHeaders() }
    );
  }
}
