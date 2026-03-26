/**
 * All HTTP calls to the server API.
 *
 * Responsibility: network only — no state, no drawing.
 */
export default class SkyApi {
  static async fetchStars() {
    const res = await fetch('/api/engine/stars');
    return res.json();
  }

  static async fetchConstellations() {
    const res = await fetch('/api/engine/constellations');
    const data = await res.json();
    return data.features || [];
  }

  static async findNearestStar(clickAz, clickAlt, lat, lon) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch('/api/engine/find-star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clickAz, clickAlt, lat, lon }),
        signal: controller.signal,
      });
      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }
}
