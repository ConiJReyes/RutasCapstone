import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, ActionPerformed, PushNotificationSchema, Token } from '@capacitor/push-notifications';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {

  private apiUrl = environment.apiUrl;
  private tokenRegistrado$ = new BehaviorSubject<string | null>(null);
  private nuevaNotificacionReceived$ = new BehaviorSubject<PushNotificationSchema | null>(null);

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Inicializa los permisos y oyentes de Push Notifications en el dispositivo móvil.
   */
  async inicializarPushNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('[PushNotificationService] Plataforma web/navegador: Notificaciones Push simuladas habilitadas.');
      return;
    }

    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[PushNotificationService] Permiso de notificaciones denegado por el usuario.');
        return;
      }

      await PushNotifications.register();
      this.configurarOyentes();

    } catch (error) {
      console.error('[PushNotificationService] Error inicializando Push Notifications:', error);
    }
  }

  private configurarOyentes(): void {
    // Escucha el registro exitoso del FCM Push Token
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('[PushNotificationService] Token FCM recibido:', token.value);
      this.tokenRegistrado$.next(token.value);
      this.enviarTokenAlBackend(token.value).subscribe({
        next: () => console.log('[PushNotificationService] Token FCM registrado exitosamente en Django.'),
        error: (err) => console.error('[PushNotificationService] Error enviando token al backend:', err)
      });
    });

    // Error al registrar
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[PushNotificationService] Error en registro de Push:', error);
    });

    // Notificación recibida con la app abierta (Foreground)
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[PushNotificationService] Notificación Push recibida en primer plano:', notification);
      this.nuevaNotificacionReceived$.next(notification);
    });

    // Usuario hizo clic en la notificación Push (Background / Closed)
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[PushNotificationService] Acción de notificación tocada por usuario:', action);
      this.router.navigate(['/apoderado/notificaciones']);
    });
  }

  /**
   * Envia el FCM Token actual al servidor Django.
   */
  enviarTokenAlBackend(fcmToken: string): Observable<any> {
    const usuario = this.authService.getUsuario();
    const deviceName = Capacitor.getPlatform() === 'android' ? 'Android Device' : 'iOS Device';

    return this.http.post(`${this.apiUrl}/notificaciones/fcm-token/`, {
      token: fcmToken,
      device_name: deviceName
    });
  }

  getNuevaNotificacionSubject(): Observable<PushNotificationSchema | null> {
    return this.nuevaNotificacionReceived$.asObservable();
  }

  getTokenActual(): string | null {
    return this.tokenRegistrado$.value;
  }
}
