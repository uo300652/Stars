// ─── GeoJSON types for constellation line data (constellations.lines.json) ───

export interface ConstellationGeometry {
  type: 'MultiLineString' | 'LineString';
  /**
   * For MultiLineString: an array of line-strings, each an array of [RA, Dec] pairs.
   * For LineString: a single array of [RA, Dec] pairs.
   */
  coordinates: number[][][] | number[][];
}

export interface ConstellationFeature {
  type: 'Feature';
  /** IAU abbreviation, e.g. "Ori" for Orion */
  id: string;
  properties: Record<string, unknown>;
  geometry: ConstellationGeometry;
}

export interface ConstellationCollection {
  type: 'FeatureCollection';
  features: ConstellationFeature[];
}
