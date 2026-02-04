import Ubicacion from './Ubicacion'

export default class Canvas {
  constructor(canvasElement) {
    this.ubicacion = new Ubicacion();

    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    
    this.skyWidth = 360;
    this.skyHeight = 180;

    this.stars = [];
    this.lineasData = []; 

    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    this.isDragging = false;
    this.hasMoved = false;
    this.lastX = 0;
    this.lastY = 0;

    this.minScale = 6;
    this.maxScale = 1000;

    this.addListeners();
  }

  // ------------------- Inicialización -------------------
  async init() {
    await this.ubicacion.pedirUbicacion(); // Obtener ubicación del usuario
    await this.cargarEstrellas();
    await this.cargarConstelaciones();
  }

  // ------------------- Render -------------------
  limpiar() {
    this.ctx.fillStyle = '#0b0c1e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render() {
    this.limpiar();
    this.dibujarConstelaciones();
    this.dibujarEstrellas();
  }

  // ------------------- Resize -------------------
  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    this.ctx.scale(dpr, dpr);

    if (this.scale === 1 && this.offsetX === 0) {
      this.scale = Math.min(this.canvas.clientWidth / this.skyWidth, this.canvas.clientHeight / this.skyHeight);
      this.offsetX = (this.canvas.clientWidth - this.skyWidth * this.scale) / 2;
      this.offsetY = (this.canvas.clientHeight - this.skyHeight * this.scale) / 2;
    }
  }

  // ------------------- Proyección -------------------
  proyectar(ra, dec, entradaEnGrados = false) {
    let raEnGrados = entradaEnGrados ? ra : ra * 15;
    if (raEnGrados < 0) raEnGrados += 360;

    const x = (raEnGrados / 360) * this.skyWidth;
    const y = ((90 - dec) / 180) * this.skyHeight;
    return [x, y];
  }

  // ------------------- Filtrado de visibilidad -------------------
  #filtrarEstrellasVisibles() {
    const lat = this.ubicacion.lat * Math.PI / 180;
    const lst = this.ubicacion.horaSideralLocal(); // grados

    return this.stars.filter(star => {
      const raDeg = star.ra * 15;
      let ha = lst - raDeg;
      if (ha < 0) ha += 360;

      const haRad = ha * Math.PI / 180;
      const decRad = star.dec * Math.PI / 180;

      const sinAlt = Math.sin(decRad) * Math.sin(lat) + Math.cos(decRad) * Math.cos(lat) * Math.cos(haRad);
      const alt = Math.asin(sinAlt) * 180 / Math.PI;

      return alt > 0;
    });
  }

  #esVisible(raGrados, decGrados) {
    const lat = this.ubicacion.lat * Math.PI / 180;
    const lst = this.ubicacion.horaSideralLocal(); // grados
    let ha = lst - raGrados;
    if (ha < 0) ha += 360;

    const haRad = ha * Math.PI / 180;
    const decRad = decGrados * Math.PI / 180;

    const sinAlt = Math.sin(decRad) * Math.sin(lat) + Math.cos(decRad) * Math.cos(lat) * Math.cos(haRad);
    const alt = Math.asin(sinAlt) * 180 / Math.PI;

    return alt > 0;
  }

  // ------------------- Carga de datos -------------------
  async cargarEstrellas() {
    try {
      const res = await fetch('/estrellas.json');
      const starsJson = await res.json();

      this.stars = starsJson.map(s => {
        const [x, y] = this.proyectar(s.ra, s.dec, false);
        return { ...s, x, y };
      });

      this.stars = this.#filtrarEstrellasVisibles();

      this.resize();
      this.render();
    } catch (e) {
      console.error("Error cargando estrellas:", e);
    }
  }

  async cargarConstelaciones() {
    try {
      const res = await fetch('/constellations.lines.json');
      const data = await res.json();
      this.lineasData = data.features || [];
      this.render();
    } catch (e) {
      console.warn("Error cargando constelaciones:", e);
    }
  }

  // ------------------- Dibujo -------------------
  dibujarEstrellas() {
    this.stars.forEach(star => {
      const baseRadius = Math.max(0.1, 6.5 - star.mag);
      const radius = (baseRadius * (this.scale * 0.015)) + 0.2;
      star.radius = radius;

      for (let i = -1; i <= 1; i++) {
        const px = (star.x + i * this.skyWidth) * this.scale + this.offsetX;
        const py = star.y * this.scale + this.offsetY;

        if (px > -10 && px < this.canvas.width + 10) {
          this.ctx.beginPath();
          this.ctx.arc(px, py, radius, 0, Math.PI * 2);
          this.ctx.fillStyle = 'white';
          this.ctx.fill();
        }
      }
    });
  }

  dibujarConstelaciones() {
    if (!this.lineasData || this.lineasData.length === 0) return;

    this.ctx.save();
    this.ctx.strokeStyle = '#ff0000';
    this.ctx.lineWidth = 2;

    this.lineasData.forEach(feature => {
      if (!feature.geometry || !feature.geometry.coordinates) return;

      const coords = feature.geometry.coordinates;
      const segmentos = Array.isArray(coords[0][0]) ? coords : [coords];

      segmentos.forEach(segmento => {
        // Solo dibujar si al menos un punto es visible
        const visible = segmento.some(punto => this.#esVisible(punto[0], punto[1]));
        if (!visible) return;

        for (let i = -1; i <= 1; i++) {
          this.ctx.beginPath();
          let prevX = null;

          segmento.forEach((punto, index) => {
            const [x, y] = this.proyectar(punto[0], punto[1], true);
            const px = (x + i * this.skyWidth) * this.scale + this.offsetX;
            const py = y * this.scale + this.offsetY;

            if (index === 0 || (prevX !== null && Math.abs(x - prevX) > this.skyWidth / 2)) {
              this.ctx.moveTo(px, py);
            } else {
              this.ctx.lineTo(px, py);
            }

            prevX = x;
          });

          this.ctx.stroke();
        }
      });
    });

    this.ctx.restore();
  }

  // ------------------- Zoom -------------------
  zoomAt(x, y, zoomFactor) {
    const prevScale = this.scale;
    const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * zoomFactor));
    if (newScale === prevScale) return;

    const worldX = (x - this.offsetX) / prevScale;
    const worldY = (y - this.offsetY) / prevScale;

    this.scale = newScale;
    this.offsetX = x - worldX * this.scale;
    this.offsetY = y - worldY * this.scale;

    this.render();
  }

  // ------------------- Offset -------------------
  #normalizarOffset() {
    const worldWidthPx = this.skyWidth * this.scale;
    this.offsetX = ((this.offsetX % worldWidthPx) + worldWidthPx) % worldWidthPx;
  }

  // ------------------- Click en estrellas -------------------
  #onStarClick(star) {
    const name = star.proper || star.bf || `HIP ${star.id}`;
    console.log(`Seleccionada: ${name} (Mag: ${star.mag})`);
  }

  // ------------------- Listeners -------------------
  addListeners() {
    window.addEventListener('resize', () => {
      this.resize();
      this.render();
    });

    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.zoomAt(x, y, e.deltaY < 0 ? 1.1 : 0.9);
    }, { passive: false });

    this.canvas.addEventListener('mousedown', e => {
      this.isDragging = true;
      this.hasMoved = false;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    window.addEventListener('mousemove', e => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.hasMoved = true;
      this.offsetX += dx;
      this.offsetY += dy;
      this.lastX = e.clientX;
      this.lastY = e.clientY;

      this.#normalizarOffset();
      this.render();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('click', e => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - this.offsetX) / this.scale;
      const worldY = (mouseY - this.offsetY) / this.scale;

      const sensitivity = 10 / this.scale;

      const clickedStar = this.stars.find(star => {
        for (let i = -1; i <= 1; i++) {
          const sx = star.x + i * this.skyWidth;
          const dx = sx - worldX;
          const dy = star.y - worldY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < sensitivity) return true;
        }
        return false;
      });

      if (clickedStar) this.#onStarClick(clickedStar);
      else console.log("No hay estrella aquí");
    });
  }
}
