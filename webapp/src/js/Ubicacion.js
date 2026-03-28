/**
 * Handles the user's geographic location.
 *
 * Responsibility: ask the browser for coordinates and resolve a human-readable
 * place name via OpenStreetMap Nominatim.
 *
 * Time and coordinate math has been moved to @atlas-vivo/star-engine.
 */
export default class Ubicacion {
  /**
   * @param {{ onResolved?: (loc: { name: string, lat: number, lon: number }) => void }} options
   */
  constructor({ onResolved } = {}) {
    this.nombreLugar = 'California';
    this.lat = 37.4220; // default coordinates
    this.lon = -122.0841;
    // Animation targets — Sky.js lerps lat/lon toward these each frame
    this._targetLat = this.lat;
    this._targetLon = this.lon;
    this._onResolved = onResolved ?? null;
  }

  pedirUbicacion() {
    navigator.geolocation.getCurrentPosition(
      async position => {
        // Set targets, not current values — Sky.js will lerp smoothly toward them
        this._targetLat = position.coords.latitude;
        this._targetLon = position.coords.longitude;
        this.nombreLugar = await this.#obtenerCiudad(this._targetLat, this._targetLon);
        this._onResolved?.({ name: this.nombreLugar, lat: this._targetLat, lon: this._targetLon });
      },
      error => {
        console.error('No se pudo obtener la ubicación', error);
        this._onResolved?.({ name: this.nombreLugar, lat: this.lat, lon: this.lon });
      }
    );
  }

  async #obtenerCiudad(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    return data.address.city || data.address.town || data.address.village || 'Desconocido';
  }
}
