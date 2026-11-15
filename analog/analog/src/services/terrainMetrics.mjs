// Horn gradient and Riley TRI require a complete 3 × 3 elevation neighborhood.
export function deriveTerrainMetrics({ gridWidth: width, gridHeight: height, cellSizeMeters: cell, elevations }) {
  const count = width * height;
  const slopeDegrees = Array(count).fill(null);
  const aspectDegrees = Array(count).fill(null);
  const roughnessTriMeters = Array(count).fill(null);
  const localReliefMeters = Array(count).fill(null);
  const round = (value) => Math.round(value * 100) / 100;

  if (Number.isFinite(cell) && cell > 0 && elevations.length === count) {
    for (let row = 1; row < height - 1; row++) {
      for (let col = 1; col < width - 1; col++) {
        const index = row * width + col;
        const top = index - width;
        const bottom = index + width;
        const window = [
          elevations[top - 1], elevations[top], elevations[top + 1],
          elevations[index - 1], elevations[index], elevations[index + 1],
          elevations[bottom - 1], elevations[bottom], elevations[bottom + 1],
        ];
        if (!window.every(Number.isFinite)) continue;
        const [nw, n, ne, w, center, e, sw, s, se] = window;
        const dx = (ne + 2 * e + se - nw - 2 * w - sw) / (8 * cell);
        const dy = (nw + 2 * n + ne - sw - 2 * s - se) / (8 * cell);
        const slope = Math.atan(Math.hypot(dx, dy)) * 180 / Math.PI;
        slopeDegrees[index] = round(slope);
        if (slope >= 0.05) {
          aspectDegrees[index] = round((Math.atan2(-dx, -dy) * 180 / Math.PI + 360) % 360) % 360;
        }
        roughnessTriMeters[index] = round(Math.sqrt(window.reduce((sum, z) => sum + (z - center) ** 2, 0)));
        localReliefMeters[index] = round(Math.max(...window) - Math.min(...window));
      }
    }
  }
  return { slopeDegrees, aspectDegrees, roughnessTriMeters, localReliefMeters };
}
