import Ubicacion from './Ubicacion';

export default class Canvas {
  constructor(canvasElement) {
    this.ubicacion = new Ubicacion();
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');

    // El "mundo" lógico: 360° de Azimut (X) y 180° de Altitud (Y)
    this.skyWidth = 360; 
    this.skyHeight = 180;

    this.stars = [];
    this.lineasData = [];

    // Configuración de vista inicial
    this.scale = 5; 
    this.offsetX = 0;
    this.offsetY = 0;

    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;

    this.minScale = 2;
    this.maxScale = 50;

    this.addListeners();
  }

  async init() {
    await this.ubicacion.pedirUbicacion();
    await this.cargarEstrellas();
    await this.cargarConstelaciones();
    this.resize();
    this.animate(); // Iniciar loop de renderizado
  }

  // --- Lógica de Proyección de Coordenadas ---

  /**
   * Convierte RA/Dec a coordenadas locales (Azimut/Altitud)
   * y luego a coordenadas de "mundo" para el Canvas.
   */
  convertirPosicion(ra, dec, esGrados = false) {
    const raDeg = esGrados ? ra : ra * 15;
    const latRad = this.ubicacion.lat * Math.PI / 180;
    const lst = this.ubicacion.horaSideralLocal(); // en grados

    let ha = lst - raDeg;
    if (ha < 0) ha += 360;
    const haRad = ha * Math.PI / 180;
    const decRad = dec * Math.PI / 180;

    // Altitud
    const sinAlt = Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
    const altRad = Math.asin(sinAlt);
    const alt = altRad * 180 / Math.PI;

    // Azimut
    const cosAz = (Math.sin(decRad) - Math.sin(altRad) * Math.sin(latRad)) / (Math.cos(altRad) * Math.cos(latRad));
    let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180 / Math.PI;
    if (Math.sin(haRad) > 0) az = 360 - az;

    // Mapeo a nuestro espacio 2D: X = Azimut, Y = (90 - Altitud)
    const x = az;
    const y = 90 - alt; 

    return { x, y, alt, az };
  }

  // --- Métodos de Dibujo ---

  limpiar() {
    this.ctx.fillStyle = '#050510'; // Espacio profundo
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  dibujarRejilla() {
    this.ctx.save();
    this.ctx.font = '10px Arial';
    
    // Líneas de Altitud
    for (let alt = -90; alt <= 90; alt += 15) {
      const y = (90 - alt) * this.scale + this.offsetY;
      this.ctx.strokeStyle = alt === 0 ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 255, 255, 0.1)';
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.fillText(`${alt}°`, 10, y - 2);
    }

    // Líneas de Azimut y Puntos Cardinales
    const cardinales = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
    for (let az = 0; az < 360; az += 30) {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      for (let i = -1; i <= 1; i++) {
        const x = (az + i * this.skyWidth) * this.scale + this.offsetX;
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.canvas.height);
        this.ctx.stroke();
        if (cardinales[az]) {
          this.ctx.fillStyle = 'white';
          this.ctx.fillText(cardinales[az], x + 5, (90 * this.scale) + this.offsetY - 5);
        }
      }
    }
    this.ctx.restore();
  }

  dibujarSuelo() {
    const horizonY = 90 * this.scale + this.offsetY;
    if (horizonY > this.canvas.height) return;

    this.ctx.save();
    const grad = this.ctx.createLinearGradient(0, horizonY, 0, this.canvas.height);
    grad.addColorStop(0, 'rgba(10, 10, 20, 0.9)');
    grad.addColorStop(1, '#000000');
    
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, horizonY, this.canvas.width, this.canvas.height - horizonY);
    
    // Línea del horizonte
    this.ctx.strokeStyle = '#004400';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, horizonY);
    this.ctx.lineTo(this.canvas.width, horizonY);
    this.ctx.stroke();
    this.ctx.restore();
  }

  dibujarEstrellas() {
    this.stars.forEach(star => {
      const pos = this.convertirPosicion(star.ra, star.dec, false);
      const radius = Math.max(0.2, (6.5 - star.mag) * (this.scale * 0.05));
      const opacity = pos.alt > -5 ? 1 : 0.1; // Se ven un poco bajo el horizonte para efecto visual

      this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      
      // Dibujar con loop infinito horizontal
      for (let i = -1; i <= 1; i++) {
        const px = (pos.x + i * this.skyWidth) * this.scale + this.offsetX;
        const py = pos.y * this.scale + this.offsetY;

        if (px > -10 && px < this.canvas.width + 10) {
          this.ctx.beginPath();
          this.ctx.arc(px, py, radius, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    });
  }

  dibujarConstelaciones() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.4)';
    this.ctx.lineWidth = 1.5;

    this.lineasData.forEach(feature => {
        const coords = feature.geometry.coordinates;
        const segmentos = Array.isArray(coords[0][0]) ? coords : [coords];

        segmentos.forEach(segmento => {
            // Dibujamos 3 veces (-1, 0, 1) para permitir el scroll infinito horizontal
            for (let i = -1; i <= 1; i++) {
                this.ctx.beginPath();
                let prevX = null; // Guardamos la X anterior del "mundo" (0-360)

                segmento.forEach((punto, index) => {
                    // 1. Convertimos RA/Dec a nuestro sistema local Az/Alt
                    // punto[0] es RA/Longitud, punto[1] es Dec/Latitud
                    const pos = this.convertirPosicion(punto[0], punto[1], true);

                    // 2. Calculamos la posición real en el canvas
                    const px = (pos.x + i * this.skyWidth) * this.scale + this.offsetX;
                    const py = pos.y * this.scale + this.offsetY;

                    // 3. Lógica Anti-Rayas: Detectar el salto de 360° a 0°
                    // Si la distancia entre el punto actual y el anterior es más de medio cielo, 
                    // significa que la línea debe cortarse y continuar al otro lado.
                    const saltoDetectado = prevX !== null && Math.abs(pos.x - prevX) > 180;

                    if (index === 0 || saltoDetectado) {
                        this.ctx.moveTo(px, py);
                    } else {
                        this.ctx.lineTo(px, py);
                    }

                    // Actualizamos la X previa con el valor 0-360 puro (pos.x)
                    prevX = pos.x;
                });
                
                this.ctx.stroke();
            }
        });
    });

    this.ctx.restore();
}

  // --- Sistema de Renderizado y Eventos ---

  render() {
    this.limpiar();
    this.dibujarRejilla();
    this.dibujarConstelaciones();
    this.dibujarEstrellas();
    this.dibujarSuelo();
  }

  animate() {
    this.render();
    requestAnimationFrame(() => this.animate());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);
  }

  zoomAt(x, y, factor) {
    const prevScale = this.scale;
    this.scale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));
    
    // Zoom centrado en el ratón
    this.offsetX = x - (x - this.offsetX) * (this.scale / prevScale);
    this.offsetY = y - (y - this.offsetY) * (this.scale / prevScale);
  }

  addListeners() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoomAt(e.offsetX, e.offsetY, factor);
    }, { passive: false });

    this.canvas.addEventListener('mousedown', e => {
      this.isDragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    window.addEventListener('mousemove', e => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;

      this.offsetX += dx;
      this.offsetY += dy;

      // Normalizar offsetX para scroll infinito
      const worldWidth = this.skyWidth * this.scale;
      this.offsetX = ((this.offsetX % worldWidth) + worldWidth) % worldWidth;

      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    window.addEventListener('mouseup', () => this.isDragging = false);
  }

  // --- Carga de Datos ---
  async cargarEstrellas() {
    const res = await fetch('/estrellas.json');
    this.stars = await res.json();
  }

  async cargarConstelaciones() {
    const res = await fetch('/constellations.lines.json');
    const data = await res.json();
    this.lineasData = data.features || [];
  }
}