import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NotificacionItem {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: 'ruta_iniciada' | 'estudiante_abordo' | 'estudiante_llego' | 'ruta_finalizada' | 'emergencia' | 'aviso_sistema';
  leido: boolean;
  creado_en: string;
  estudiante?: number;
  estudiante_nombre?: string;
}

export interface NotificacionesResponse {
  no_leidas_count: number;
  notificaciones: NotificacionItem[];
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private apiUrl = environment.apiUrl;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Obtiene la lista de notificaciones del apoderado y actualiza el contador de no leídas.
   */
  getNotificaciones(): Observable<NotificacionesResponse> {
    return this.http.get<NotificacionesResponse>(`${this.apiUrl}/notificaciones/`).pipe(
      tap(res => {
        if (res && typeof res.no_leidas_count === 'number') {
          this.unreadCountSubject.next(res.no_leidas_count);
        }
      })
    );
  }

  /**
   * Marca una notificación específica como leída.
   */
  marcarLeida(notificacionId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/notificaciones/${notificacionId}/marcar-leido/`, {}).pipe(
      tap(() => {
        const current = this.unreadCountSubject.value;
        if (current > 0) {
          this.unreadCountSubject.next(current - 1);
        }
      })
    );
  }

  /**
   * Marca todas las notificaciones del apoderado como leídas.
   */
  marcarTodasLeidas(): Observable<any> {
    return this.http.post(`${this.apiUrl}/notificaciones/marcar-todas-leidas/`, {}).pipe(
      tap(() => {
        this.unreadCountSubject.next(0);
      })
    );
  }

  // ===============================================
  // ACCIONES DEL CONDUCTOR EN BACKEND (GENERAN PUSH)
  // ===============================================

  iniciarRuta(): Observable<any> {
    return this.http.post(`${this.apiUrl}/rutas/iniciar/`, {});
  }

  escanearQR(estudianteId?: number, rut?: string, accion: 'abordar' | 'llegar' = 'abordar'): Observable<any> {
    return this.http.post(`${this.apiUrl}/rutas/escanear-qr/`, {
      estudiante_id: estudianteId,
      rut: rut,
      accion: accion
    });
  }

  finalizarRuta(): Observable<any> {
    return this.http.post(`${this.apiUrl}/rutas/finalizar/`, {});
  }

  enviarEmergencia(detalle: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/emergencias/`, { detalle: detalle });
  }

}
