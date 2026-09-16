import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Subject, Observable, tap } from 'rxjs';
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

  private nuevaNotificacionAlertSubject = new Subject<NotificacionItem>();
  public nuevaNotificacionAlert$ = this.nuevaNotificacionAlertSubject.asObservable();

  private pollingTimer: any = null;
  private knownIds: Set<number> = new Set();
  private inicializadoPrimeraVez: boolean = false;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': token ? `Token ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  /**
   * Obtiene la lista de notificaciones del apoderado/delegado y actualiza el contador de no leídas.
   */
  getNotificaciones(): Observable<NotificacionesResponse> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return new Observable(sub => {
        sub.next({ no_leidas_count: 0, notificaciones: [] });
        sub.complete();
      });
    }

    return this.http.get<NotificacionesResponse>(`${this.apiUrl}/notificaciones/`, { headers: this.getAuthHeaders() }).pipe(
      tap(res => {
        if (res && typeof res.no_leidas_count === 'number') {
          this.unreadCountSubject.next(res.no_leidas_count);
        }

        if (res && res.notificaciones) {
          res.notificaciones.forEach(notif => {
            if (this.inicializadoPrimeraVez && !notif.leido && !this.knownIds.has(notif.id)) {
              this.nuevaNotificacionAlertSubject.next(notif);
            }
            this.knownIds.add(notif.id);
          });
          this.inicializadoPrimeraVez = true;
        }
      })
    );
  }

  /**
   * Inicia el polling automático cada X segundos para mantener la lista y alertas actualizadas en tiempo real.
   */
  iniciarPolling(intervalMs: number = 8000): void {
    this.detenerPolling();
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    this.getNotificaciones().subscribe({ error: () => {} });

    this.pollingTimer = setInterval(() => {
      const activeToken = localStorage.getItem('auth_token');
      if (activeToken) {
        this.getNotificaciones().subscribe({ error: () => {} });
      } else {
        this.detenerPolling();
      }
    }, intervalMs);
  }

  /**
   * Detiene el polling automático.
   */
  detenerPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Marca una notificación específica como leída.
   */
  marcarLeida(notificacionId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/notificaciones/${notificacionId}/marcar-leido/`, {}, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        const current = this.unreadCountSubject.value;
        if (current > 0) {
          this.unreadCountSubject.next(current - 1);
        }
      })
    );
  }

  /**
   * Marca todas las notificaciones como leídas.
   */
  marcarTodasLeidas(): Observable<any> {
    return this.http.post(`${this.apiUrl}/notificaciones/marcar-todas-leidas/`, {}, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        this.unreadCountSubject.next(0);
      })
    );
  }

  /**
   * Elimina una notificación individual de la bandeja del usuario.
   */
  eliminarNotificacion(notificacionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/notificaciones/${notificacionId}/eliminar/`, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        this.getNotificaciones().subscribe({ error: () => {} });
      })
    );
  }

  /**
   * Elimina todas las notificaciones de la bandeja del usuario.
   */
  eliminarTodasNotificaciones(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/notificaciones/eliminar-todas/`, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        this.unreadCountSubject.next(0);
        this.getNotificaciones().subscribe({ error: () => {} });
      })
    );
  }

  // ===============================================
  // ACCIONES DEL CONDUCTOR EN BACKEND (GENERAN PUSH)
  // ===============================================

  iniciarRuta(): Observable<any> {
    return this.http.post(`${this.apiUrl}/rutas/iniciar/`, {}, { headers: this.getAuthHeaders() });
  }

  escanearQR(estudianteId?: number, rut?: string, accion: 'abordar' | 'llegar' = 'abordar'): Observable<any> {
    return this.http.post(`${this.apiUrl}/rutas/escanear-qr/`, {
      estudiante_id: estudianteId,
      rut: rut,
      accion: accion
    }, { headers: this.getAuthHeaders() });
  }

  escaneoFacial(imagenBase64: string, modo: 'abordar' | 'entregar' = 'abordar', confirmar: boolean = false): Observable<any> {
    return this.http.post(`${this.apiUrl}/rutas/escaneo-facial/`, {
      imagen: imagenBase64,
      modo: modo,
      confirmar: confirmar
    }, { headers: this.getAuthHeaders() });
  }

  finalizarRuta(): Observable<any> {
    return this.http.post(`${this.apiUrl}/rutas/finalizar/`, {}, { headers: this.getAuthHeaders() });
  }

  enviarEmergencia(datos: string | {
    categoria: string;
    tipo_emergencia: string;
    descripcion: string;
    estudiante_id?: number | null;
  }): Observable<any> {
    const payload = typeof datos === 'string' ? { detalle: datos } : datos;
    return this.http.post(`${this.apiUrl}/emergencias/`, payload, { headers: this.getAuthHeaders() });
  }

  consultarQREntrega(qrPayload: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/rutas/consultar-qr-entrega/`, {
      qr_payload: qrPayload
    }, { headers: this.getAuthHeaders() });
  }

  confirmarEntregaMultiple(estudianteIds: number[], personaRut?: string, personaNombre?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/rutas/confirmar-entrega-multiple/`, {
      estudiante_ids: estudianteIds,
      persona_rut: personaRut,
      persona_nombre: personaNombre
    }, { headers: this.getAuthHeaders() });
  }

}
