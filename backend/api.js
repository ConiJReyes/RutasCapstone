const http = require('http');
const { Server } = require('socket.io');

const PORT = 3000;
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_BASE_URL = 'http://router.project-osrm.org/route/v1/driving';

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;
  const params = urlObj.searchParams;
  const headers = { 'User-Agent': 'RutasSegurasAPI/1.0 (contacto@rutasseguras.cl)' };

  try {
    // 1. Geolocalizar dirección única
    if (pathname === '/api/geo/ubicacion' && req.method === 'GET') {
      const calle = params.get('calle');
      const numero = params.get('numero');
      const comuna = params.get('comuna');

      if (!calle || !numero || !comuna) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'Faltan parámetros' }));
      }

      const query = `${calle} ${numero}, ${comuna}, Chile`;
      const response = await fetch(`${NOMINATIM_BASE_URL}?q=${encodeURIComponent(query)}&format=json&limit=1`, { headers });
      const data = await response.json();

      if (!data.length) {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: 'Dirección no encontrada' }));
      }

      return res.end(JSON.stringify({
        latitud: parseFloat(data[0].lat),
        longitud: parseFloat(data[0].lon),
        direccionFormateada: data[0].display_name
      }));
    }

    // 2. Coincidencias para búsqueda del Colegio
    if (pathname === '/api/geo/coincidencias' && req.method === 'GET') {
      const query = params.get('query');
      const limite = params.get('limite') || 5;

      const response = await fetch(`${NOMINATIM_BASE_URL}?q=${encodeURIComponent(query + ', Chile')}&format=json&limit=${limite}`, { headers });
      const data = await response.json();

      const coincidencias = data.map(item => ({
        latitud: parseFloat(item.lat),
        longitud: parseFloat(item.lon),
        nombreCompleto: item.display_name
      }));

      return res.end(JSON.stringify({ total: coincidencias.length, coincidencias }));
    }

    // 3. Trazado de ruta por calles reales (OSRM)
    if (pathname === '/api/geo/ruta' && req.method === 'GET') {
      const latOrigen = params.get('latOrigen');
      const lonOrigen = params.get('lonOrigen');
      const latDestino = params.get('latDestino');
      const lonDestino = params.get('lonDestino');

      const osrmUrl = `${OSRM_BASE_URL}/${lonOrigen},${latOrigen};${lonDestino},${latDestino}?overview=full&geometries=geojson`;
      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (!data.routes || !data.routes.length) {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: 'No se pudo trazar la ruta' }));
      }

      const puntosRuta = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

      return res.end(JSON.stringify({
        distanciaMetros: data.routes[0].distance,
        duracionSegundos: data.routes[0].duration,
        puntosRuta
      }));
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Ruta no encontrada' }));

  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Error del servidor', detalle: error.message }));
  }
});

// Configuración de WebSockets
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('emitirPosicionFurgon', (data) => {
    io.emit('posicionActualizada', data);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor API y Tiempo Real activo en http://localhost:${PORT}`);
});