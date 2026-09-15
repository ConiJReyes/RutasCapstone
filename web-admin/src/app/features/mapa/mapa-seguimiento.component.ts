import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';
import * as L from 'leaflet';

@Component({
  selector: 'app-mapa-seguimiento',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mapa-seguimiento.component.html',
  styleUrl: './mapa-seguimiento.component.scss'
})
export class MapaSeguimientoComponent implements OnInit, OnDestroy {
  @Input() rutaNombre: string = '';
  
  @Input() set colegioNombreInput(val: string) {
    if (val && val.trim()) this.dirColegio = val;
  }

  @Output() cerrar = new EventEmitter<void>();

  private socket?: Socket;
  private map?: L.Map;
  private furgonMarker?: L.Marker;
  private rutaPolylineGlow?: L.Polyline;
  private rutaPolylineMain?: L.Polyline;

  dirApoderado = {
    calle: 'Victor Jara',
    numero: '549',
    region: 'Región Metropolitana',
    comuna: 'Quilicura'
  };
  dirColegio = 'Colegio Quilicura';

  regiones: string[] = ['Región Metropolitana', 'Valparaíso', 'Biobío'];
  comunasDisponibles: string[] = ['Quilicura', 'Santiago', 'Lampa', 'Pudahuel', 'Maipú'];

  origenCoords: [number, number] = [-33.3602, -70.7300];
  destinoCoords: [number, number] = [-33.3550, -70.7250];

  cargandoGeo = false;
  necesitaDireccion = true;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    try {
      this.socket = io('http://localhost:3000');
      this.socket.on('posicionActualizada', (data: { lat: number; lon: number }) => {
        if (this.furgonMarker) {
          this.furgonMarker.setLatLng([data.lat, data.lon]);
        }
      });
    } catch (e) {
      console.warn('Socket no conectado:', e);
    }
  }

  ngOnDestroy(): void {
    this.destruirMapaYSocket();
  }

  cerrarModal(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.destruirMapaYSocket();
    this.necesitaDireccion = true;
    this.cerrar.emit();
    this.cdr.detectChanges();
  }

  private destruirMapaYSocket(): void {
    try {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = undefined;
      }
      if (this.map) {
        this.map.off();
        this.map.remove();
        this.map = undefined;
      }
    } catch (error) {
      console.warn('Error al destruir el mapa:', error);
      this.map = undefined;
    }
  }

  onRegionSelect(region: string): void {
    if (region === 'Región Metropolitana') {
      this.comunasDisponibles = ['Quilicura', 'Santiago', 'Lampa', 'Pudahuel', 'Maipú'];
    } else {
      this.comunasDisponibles = [];
    }
    this.dirApoderado.comuna = '';
  }

  async procesarDireccionesYIniciar(): Promise<void> {
    this.cargandoGeo = true;
    this.cdr.detectChanges();

    try {
      const urlOrigen = `http://localhost:3000/api/geo/ubicacion?calle=${encodeURIComponent(this.dirApoderado.calle)}&numero=${encodeURIComponent(this.dirApoderado.numero)}&comuna=${encodeURIComponent(this.dirApoderado.comuna)}`;
      const resOrigen = await fetch(urlOrigen);
      if (resOrigen.ok) {
        const dataOrigen = await resOrigen.json();
        if (dataOrigen.latitud && dataOrigen.longitud) {
          this.origenCoords = [parseFloat(dataOrigen.latitud), parseFloat(dataOrigen.longitud)];
        }
      }

      const urlColegio = `http://localhost:3000/api/geo/coincidencias?query=${encodeURIComponent(this.dirColegio)}&limite=1`;
      const resColegio = await fetch(urlColegio);
      if (resColegio.ok) {
        const dataColegio = await resColegio.json();
        if (dataColegio.coincidencias && dataColegio.coincidencias.length > 0) {
          this.destinoCoords = [
            parseFloat(dataColegio.coincidencias[0].latitud),
            parseFloat(dataColegio.coincidencias[0].longitud)
          ];
        }
      }
    } catch (e) {
      console.warn('API local no disponible. Usando coordenadas por defecto.', e);
    }

    this.necesitaDireccion = false;
    this.cargandoGeo = false;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.inicializarMapa();
    }, 150);
  }

  async trazarRutaPorCalles(): Promise<void> {
    try {
      const urlRuta = `http://localhost:3000/api/geo/ruta?latOrigen=${this.origenCoords[0]}&lonOrigen=${this.origenCoords[1]}&latDestino=${this.destinoCoords[0]}&lonDestino=${this.destinoCoords[1]}`;
      const resRuta = await fetch(urlRuta);
      
      if (resRuta.ok) {
        const dataRuta = await resRuta.json();
        if (this.map && dataRuta.puntosRuta) {
          if (this.rutaPolylineGlow) this.map.removeLayer(this.rutaPolylineGlow);
          if (this.rutaPolylineMain) this.map.removeLayer(this.rutaPolylineMain);

          // Línea traslúcida inferior para efecto Glow/Brillo
          this.rutaPolylineGlow = L.polyline(dataRuta.puntosRuta, {
            color: '#3f8178',
            weight: 12,
            opacity: 0.25,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(this.map);

          // Línea principal de trazado
          this.rutaPolylineMain = L.polyline(dataRuta.puntosRuta, {
            color: '#2d6861',
            weight: 5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(this.map);

          const bounds = L.latLngBounds(dataRuta.puntosRuta);
          this.map.fitBounds(bounds, { padding: [40, 40] });
        }
      }
    } catch (error) {
      console.error('Error al trazar la ruta:', error);
    }
  }

  inicializarMapa(): void {
    const mapElement = document.getElementById('mapa');
    if (mapElement && !this.map) {
      this.map = L.map('mapa', {
        zoomControl: false
      }).setView(this.origenCoords, 16); // Aumentamos ligeramente el zoom para ver mejor el círculo pequeño

      L.control.zoom({ position: 'bottomright' }).addTo(this.map);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(this.map);

      // 🔵 CÍRCULO MÁS PEQUEÑO DE DIRECCIÓN APROXIMADA (50 metros)
      L.circle(this.origenCoords, {
        color: '#2d6861',         // Color del borde
        fillColor: '#2d6861',     // Color del centro
        fillOpacity: 0.22,        // Un poco más visible al ser compacto
        weight: 2,                // Ancho del borde
        dashArray: '3, 3',        // Punteado fino
        radius: 50                // Radio ajustado a 50 metros
      }).addTo(this.map).bindPopup('<b>Zona Apoderado</b><br>Ubicación aproximada');

      // Icono Destino (Colegio)
      const destinoIcon = L.divIcon({
        html: `<div class="custom-pin pin-destino"><span>🏫</span></div>`,
        className: 'custom-leaflet-marker',
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      // Icono Furgón Escolar
      const furgonIcon = L.divIcon({
        html: `
          <div class="furgon-pin-container">
            <div class="pulse-ring"></div>
            <div class="furgon-card">🚌</div>
          </div>`,
        className: 'custom-leaflet-marker',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      L.marker(this.destinoCoords, { icon: destinoIcon }).addTo(this.map).bindPopup(`<b>Destino:</b> ${this.dirColegio}`);
      this.furgonMarker = L.marker(this.origenCoords, { icon: furgonIcon }).addTo(this.map).bindPopup('<b>Furgón Escolar</b><br>Transmisión en Vivo');

      this.trazarRutaPorCalles();

      setTimeout(() => {
        this.map?.invalidateSize();
      }, 300);
    }
  }
}