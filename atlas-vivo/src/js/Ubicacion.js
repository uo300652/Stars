export default class Ubicacion
{
    constructor()
    {
        this.nombreLugar = "California"
        this.lat = 37.4220 // coordenadas por defecto
        this.lon = -122.0841
    }

    async pedirUbicacion()
    {
        navigator.geolocation.getCurrentPosition(
        async position => {
            this.lat = position.coords.latitude;
            this.lon = position.coords.longitude;
            console.log(`Latitud: ${this.lat}, Longitud: ${this.lon}`);

            this.nombreLugar = await this.#obtenerCiudad(this.lat, this.lon);
        },
        error => {
            console.error("No se pudo obtener la ubicación", error);
        }
        );
    }

    // Usamos la API de OpenStreetMap para a traves de las coordenadas obtener el nombre de la ciudad
    async #obtenerCiudad(lat, lon) {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
        const response = await fetch(url);
        const data = await response.json();
        return (data.address.city || data.address.town || data.address.village || "Desconocido");
    }


    #horaActual()
    {
        const now = new Date();
        return now.getTime() + now.getTimezoneOffset() * 60000; // tiempo UTC
    }

    horaSideralLocal() {
        // Convertimos fecha a Julian Date
        const JD = (this.#horaActual() / 86400000) + 2440587.5; // Julian date desde epoch
        const D = JD - 2451545.0; // días desde J2000
        // Hora sideral en Greenwich en grados
        let GMST = 280.46061837 + 360.98564736629 * D;
        GMST = GMST % 360;
        // Hora sideral local (agregamos la longitud)
        const LST = (GMST + this.lon + 360) % 360;
        return LST; // grados
    }

}