// All numerical parameters are illustrative, not fitted weather observations.
export const SIZE = 8;
export const AIR = 32;
export const HEIGHTS = { low: 6, medium: 12, tall: 24 };
export const SURFACES = {
  asphalt: { label: 'Asphalt', excess: 28 },
  concrete: { label: 'Concrete', excess: 18 },
  grass: { label: 'Grass', excess: 7 },
  pavers: { label: 'Light pavers', excess: 12 },
};
export const MATERIALS = {
  dark: { label: 'Dark roof', excess: 28 },
  brick: { label: 'Brick / tile roof', excess: 18 },
  reflective: { label: 'Reflective roof', excess: 9 },
};

export function blankNeighborhood() {
  return Array.from({ length: SIZE * SIZE }, () => ({ ground: 'asphalt', object: null }));
}

export function exampleNeighborhood() {
  const cells = blankNeighborhood();
  for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
    const cell = cells[z * SIZE + x];
    if (z >= 4 && x >= 4) cell.ground = 'grass';
    if (z === 3) cell.ground = 'pavers';
  }
  for (const [x, z, height, material] of [[1, 1, 'low', 'dark'], [3, 1, 'tall', 'brick'], [1, 5, 'medium', 'reflective'], [2, 6, 'low', 'brick']]) {
    cells[z * SIZE + x].object = { type: 'building', height, material };
  }
  for (const [x, z] of [[5, 4], [6, 6], [4, 6], [6, 1]]) cells[z * SIZE + x].object = { type: 'tree' };
  return cells;
}

// This pure reducer is shared by pointer and keyboard editing.
export function editCell(cells, index, tool, options = {}) {
  if (!Number.isInteger(index) || index < 0 || index >= cells.length) throw new RangeError('Invalid tile');
  const next = cells.map(cell => ({ ...cell, object: cell.object && { ...cell.object } }));
  const cell = next[index];
  if (tool === 'tree') cell.object = { type: 'tree' };
  if (tool === 'building') {
    const height = options.height || 'medium';
    const material = options.material || 'brick';
    if (!(height in HEIGHTS) || !(material in MATERIALS)) throw new Error('Invalid building choice');
    cell.object = { type: 'building', height, material };
  }
  if (tool === 'ground') {
    if (!(options.ground in SURFACES)) throw new Error('Invalid surface');
    cell.ground = options.ground;
  }
  if (tool === 'remove') cell.object = null;
  return next;
}

// Sun is due west at 45° elevation. A sunward ray loses x as it gains y.
// At a receiver height y, a building shades a sample if its westward ray
// intersects a 0.8-tile-wide box. Tree crowns are spheres centered at 7 m.
function blocked(x, z, y, cells, receiver) {
  for (let i = 0; i < cells.length; i++) {
    if (i === receiver && cells[i].object?.type === 'building') continue;
    const object = cells[i].object;
    if (!object) continue;
    const cx = (i % SIZE) * 10 + 5;
    const cz = Math.floor(i / SIZE) * 10 + 5;
    if (object.type === 'building') {
      if (Math.abs(z - cz) > 4) continue;
      const enter = Math.max(0, x - (cx + 4));
      const exit = x - (cx - 4);
      if (exit > enter && y + enter < HEIGHTS[object.height]) return true;
    } else {
      // Ray parameter t: (x-t, y+t, z), quadratic ray/sphere test.
      const dx = x - cx, dy = y - 7, dz = z - cz;
      const b = 2 * (-dx + dy);
      const c = dx * dx + dy * dy + dz * dz - 3.5 ** 2;
      const discriminant = b * b - 8 * c;
      if (discriminant >= 0 && (-b + Math.sqrt(discriminant)) / 4 > 0) return true;
    }
  }
  return false;
}

export function estimate(cells, index) {
  const cell = cells[index];
  const building = cell.object?.type === 'building';
  const y = building ? HEIGHTS[cell.object.height] : 0;
  const x = (index % SIZE) * 10 + 5;
  const z = Math.floor(index / SIZE) * 10 + 5;
  const material = building ? MATERIALS[cell.object.material] : SURFACES[cell.ground];
  let shaded = 0;
  // 25 samples avoid all-or-nothing shadows at tile boundaries.
  for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) {
    const extent = building ? 8 : 10;
    if (blocked(x + ((a + 0.5) / 5 - 0.5) * extent, z + ((b + 0.5) / 5 - 0.5) * extent, y, cells, index)) shaded++;
  }
  const shade = shaded / 25;
  let treeEffect = 0;
  cells.forEach((other, i) => {
    if (other.object?.type !== 'tree') return;
    const distance = Math.hypot(x - ((i % SIZE) * 10 + 5), z - (Math.floor(i / SIZE) * 10 + 5));
    treeEffect += 2.5 * Math.max(0, 1 - distance / 25);
  });
  const shadeReduction = material.excess * 0.65 * shade;
  // Cooling removes only heat left after shade, so the budget terms always sum to the
  // displayed temperature and the surface never drops below air temperature.
  const cooling = Math.min(Math.min(4, treeEffect) * Math.max(0, 1 - y / 12), material.excess - shadeReduction);
  const temperature = AIR + material.excess - shadeReduction - cooling;
  return { temperature, shade, cooling, shadeReduction, material: material.label, excess: material.excess, kind: building ? 'roof' : 'ground' };
}

export const temperatures = cells => cells.map((_, index) => estimate(cells, index));
