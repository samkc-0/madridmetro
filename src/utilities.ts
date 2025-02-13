/**
 * Normaliza las coordenadas de las estaciones del metro de Madrid
 * @param coordinates Objeto con las coordenadas x, y de las estaciones
 * @returns Objeto con las coordenadas normalizadas entre 0 y 1
 */
export function normalizeCoordinates(
  coordinates: Record<string, { x: number; y: number }>,
  scaleFactor: number = 1
) {
  // Si no hay coordenadas, regresamos un objeto vacío
  if (Object.keys(coordinates).length === 0) {
    return {};
  }

  // Si solo hay una estación, regresamos {x: 0, y: 0}
  if (Object.keys(coordinates).length === 1) {
    const [station] = Object.keys(coordinates);
    return { [station]: { x: 0, y: 0 } };
  }

  // Primero encontramos los valores mínimos y máximos
  const allX = Object.values(coordinates).map((coord) => coord.x);
  const allY = Object.values(coordinates).map((coord) => coord.y);

  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);

  // Normalizamos cada coordenada
  const normalized: Record<string, { x: number; y: number }> = {};

  for (const [station, coord] of Object.entries(coordinates)) {
    normalized[station] = {
      x: ((coord.x - minX) / (maxX - minX)) * scaleFactor,
      y: ((coord.y - minY) / (maxY - minY)) * scaleFactor,
    };
  }

  return normalized;
}
