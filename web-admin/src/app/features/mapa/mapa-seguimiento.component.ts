import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  @Input() direccionExistente: { region?: string; comuna?: string; calle?: string; numero?: string } | null = null;
  @Output() alCerrar = new EventEmitter<void>();

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  necesitaDireccion: boolean = true;
  cargandoGeo: boolean = false;

  dirApoderado = {
    region: 'Región Metropolitana de Santiago',
    comuna: 'Quilicura',
    calle: 'Victor Jara',
    numero: '549'
  };

  dirColegio: string = 'Escuela Bosques del Viento, Santiago, Chile';

  regiones: string[] = [
    'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo',
    'Valparaíso', 'Región Metropolitana de Santiago', 'O\'Higgins', 'Maule',
    'Ñuble', 'Bío Bío', 'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'
  ];

  comunasPorRegion: { [key: string]: string[] } = {
    'Región Metropolitana de Santiago': [
      'Quilicura', 'Santiago', 'Providencia', 'Las Condes', 'Ñuñoa', 'Maipú', 
      'La Florida', 'Pudahuel', 'Vitacura', 'San Miguel', 'Peñalolén'
    ],
    'Valparaíso': ['Valparaíso', 'Viña del Mar', 'Concón'],
    'Bío Bío': ['Concepción', 'Talcahuano']
  };

  comunasDisponibles: string[] = [];

  private map!: L.Map;
  private furgonMarker!: L.Marker;
  private intervalId: any;
  private step: number = 0;
  private totalSteps: number = 60;

  // Coordenadas base (Quilicura -> Santiago Centro)
  private origenCoords: [number, number] = [-33.3602, -70.7300]; 
  private destinoCoords: [number, number] = [-33.4100, -70.6000]; 

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.comunasDisponibles = this.comunasPorRegion[this.dirApoderado.region] || [];
  }

  onRegionSelect(region: string): void {
    this.dirApoderado.region = region;
    this.comunasDisponibles = this.comunasPorRegion[region] || [];
    this.dirApoderado.comuna = '';
  }

  async procesarDireccionesYIniciar(): Promise<void> {
    this.cargandoGeo = true;
    this.cdr.detectChanges();

    const query = `${this.dirApoderado.calle} ${this.dirApoderado.numero}, ${this.dirApoderado.comuna}, Chile`;

    try {
      // Intentar buscar coordenadas reales con límite de tiempo (timeout de 2s)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();
      clearTimeout(timeoutId);

      if (data && data.length > 0) {
        this.origenCoords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (e) {
      console.warn('Geocodificación falló o demoró mucho; usando coordenadas por defecto.', e);
    }

    // Ocultar formulario e instanciar mapa
    this.necesitaDireccion = false;
    this.cargandoGeo = false;
    this.cdr.detectChanges();

    // Esperar renderizado del contenedor
    setTimeout(() => {
      this.inicializarMapa();
    }, 200);
  }

  private inicializarMapa(): void {
    if (!this.mapContainer || !this.mapContainer.nativeElement) return;

    if (this.map) {
      this.map.remove();
    }

    this.map = L.map(this.mapContainer.nativeElement).setView(this.origenCoords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    // Marcador Punto de Inicio (Apoderado)
    L.marker(this.origenCoords)
      .addTo(this.map)
      .bindPopup(`<b>Inicio: Apoderado</b><br>${this.dirApoderado.calle} ${this.dirApoderado.numero}, ${this.dirApoderado.comuna}`)
      .openPopup();

    // Marcador Punto Destino (Colegio)
    L.marker(this.destinoCoords)
      .addTo(this.map)
      .bindPopup(`<b>Destino: Colegio</b><br>${this.dirColegio}`);

    // Línea trazada del recorrido
    L.polyline([this.origenCoords, this.destinoCoords], {
      color: '#3f8178',
      weight: 4,
      dashArray: '8, 8'
    }).addTo(this.map);

    // Ajustar zoom para enfocar ambos puntos
    const bounds = L.latLngBounds([this.origenCoords, this.destinoCoords]);
    this.map.fitBounds(bounds, { padding: [40, 40] });

    // Icono animado del Furgón
    const furgonIcon = L.divIcon({
      className: 'furgon-pin-custom',
      html: '<div style="font-size:24px; background:#ffffff; border-radius:50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.3); border:2px solid #3f8178;">🚐</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    this.furgonMarker = L.marker(this.origenCoords, { icon: furgonIcon }).addTo(this.map);

    // Corregir tamaño de Leaflet dentro del modal
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 100);

    this.iniciarMovimientoFurgon();
  }

  private iniciarMovimientoFurgon(): void {
    if (this.intervalId) clearInterval(this.intervalId);

    this.step = 0;
    this.intervalId = setInterval(() => {
      if (this.step <= this.totalSteps) {
        const factor = this.step / this.totalSteps;
        const lat = this.origenCoords[0] + (this.destinoCoords[0] - this.origenCoords[0]) * factor;
        const lng = this.origenCoords[1] + (this.destinoCoords[1] - this.origenCoords[1]) * factor;

        const nuevaPosicion: [number, number] = [lat, lng];
        if (this.furgonMarker) {
          this.furgonMarker.setLatLng(nuevaPosicion);
        }

        this.step++;
      } else {
        this.step = 0; // Reiniciar animación
      }
    }, 1000);
  }

  cerrarModal(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.alCerrar.emit();
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.map) this.map.remove();
  }
}