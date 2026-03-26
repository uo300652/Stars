/**
 * Handles the user's geographic location.
 *
 * Responsibility: ask the browser for coordinates and resolve a human-readable
 * place name via OpenStreetMap Nominatim.
 *
 * Time and coordinate math has been moved to @atlas-vivo/star-engine.
 */
export default class Ubicacion {
  constructor() {
    this.nombreLugar = 'California';
    this.lat = 37.4220; // default coordinates
    this.lon = -122.0841;
  }

  async pedirUbicacion() {
    navigator.geolocation.getCurrentPosition(
      async position => {
        this.lat = position.coords.latitude;
        this.lon = position.coords.longitude;
        console.log(`Latitud: ${this.lat}, Longitud: ${this.lon}`);
        this.nombreLugar = await this.#obtenerCiudad(this.lat, this.lon);
      },
      error => {
        console.error('No se pudo obtener la ubicación', error);
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
