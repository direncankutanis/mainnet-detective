// Raiku mark (from https://raiku.com/brand/raiku-intersect.svg), used single-colour only.
export const MARK_VIEWBOX = "0 0 326 285";
export const MARK_W = 326;
export const MARK_H = 285;
export const MARK_PATH =
  "M246.472 2.9082L325.513 140.234V144.765L246.982 281.202L240.393 285H85.1201L81.8447 283.113L162.778 142.5H0V140.312L79.1074 2.86914L84.0898 0H241.423L246.472 2.9082Z";

// Same outline as a polygon, for building the halftone (point-in-polygon test).
const POLY: [number, number][] = [
  [246.472, 2.9082], [325.513, 140.234], [325.513, 144.765], [246.982, 281.202],
  [240.393, 285], [85.1201, 285], [81.8447, 283.113], [162.778, 142.5],
  [0, 142.5], [0, 140.312], [79.1074, 2.86914], [84.0898, 0], [241.423, 0],
];

function inside(x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    const [xi, yi] = POLY[i];
    const [xj, yj] = POLY[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export type Dot = { cx: number; cy: number; r: number };

/**
 * Halftone dots filling the mark, in mark coordinates. Dots grow towards the
 * lower right like a printed tone ramp.
 */
export function halftoneDots(step = 13): Dot[] {
  const dots: Dot[] = [];
  for (let row = 0, y = step / 2; y < MARK_H; y += step, row++) {
    const offset = row % 2 ? step / 2 : 0;
    for (let x = step / 2 + offset; x < MARK_W; x += step) {
      if (!inside(x, y)) continue;
      const t = (x / MARK_W) * 0.55 + (y / MARK_H) * 0.45;
      dots.push({ cx: +x.toFixed(1), cy: +y.toFixed(1), r: +(step * (0.2 + 0.26 * t)).toFixed(2) });
    }
  }
  return dots;
}
