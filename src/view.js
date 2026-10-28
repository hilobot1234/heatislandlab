import { SIZE, HEIGHTS } from './model.js';

const stops = [[59, 76, 192], [135, 181, 212], [228, 229, 216], [228, 163, 131], [180, 4, 38]];
export function heatColor(temperature) {
  const t = Math.max(0, Math.min(3.99999, (temperature - 32) / 28 * 4));
  const i = Math.floor(t), f = t - i;
  return '#' + stops[i].map((v, channel) => Math.round(v + f * (stops[i + 1][channel] - v)).toString(16).padStart(2, '0')).join('');
}
const surfaceColor = { asphalt: '#68736f', concrete: '#b9bdb4', grass: '#88ac6f', pavers: '#d1c6a6' };
const roofColor = { dark: '#50545a', brick: '#b17c64', reflective: '#edf0db' };
function shadeColor(color, shade) {
  const factor = 1 - 0.35 * shade;
  return '#' + [1,3,5].map(offset => Math.round(parseInt(color.slice(offset,offset+2),16)*factor).toString(16).padStart(2,'0')).join('');
}

// Offline fallback: orthographic projection of 3D boxes and tree crowns.
function createIsometric(canvas, onPick) {
  const context = canvas.getContext('2d');
  let state, hits = [];
  function draw(cells, results, selected, heatmap) {
    state = [cells, results, selected, heatmap];
    const width = canvas.clientWidth, height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * ratio; canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height); hits = [];
    const scale = Math.min((width - 34) / 16, (height - 40) / (16 * .48 + 2.4));
    const point = (x, z, y = 0) => [width / 2 + (x - z) * scale, 20 + 2.4 * scale + (x + z) * scale * 0.48 - y * scale];
    function poly(points, color, index, selectedEdge = false) {
      context.beginPath(); points.forEach((p, j) => j ? context.lineTo(...p) : context.moveTo(...p)); context.closePath();
      context.fillStyle = color; context.fill();
      context.strokeStyle = selectedEdge ? '#18372e' : '#f5f7f0'; context.lineWidth = selectedEdge ? 3 : 1; context.stroke();
      if (index !== undefined) hits.push({ points, index });
    }
    for (let sum = 0; sum <= 14; sum++) for (let z = 0; z < SIZE; z++) {
      const x = sum - z; if (x < 0 || x >= SIZE) continue;
      const i = z * SIZE + x, cell = cells[i];
      const heat = heatColor(results[i].temperature);
      poly([point(x,z),point(x+1,z),point(x+1,z+1),point(x,z+1)], heatmap ? heat : shadeColor(surfaceColor[cell.ground],results[i].shade), i, selected === i);
      if (cell.object?.type === 'building') {
        const y = HEIGHTS[cell.object.height] / 10;
        const a = x + .1, b = z + .1, c = x + .9, d = z + .9;
        poly([point(c,b),point(c,d),point(c,d,y),point(c,b,y)], '#a0aba6', i);
        poly([point(a,d),point(c,d),point(c,d,y),point(a,d,y)], '#bac5bd', i);
        poly([point(a,b,y),point(c,b,y),point(c,d,y),point(a,d,y)], heatmap ? heat : shadeColor(roofColor[cell.object.material],results[i].shade), i, selected === i);
      } else if (cell.object?.type === 'tree') {
        const trunk = point(x+.5,z+.5), crown = point(x+.5,z+.5,.7);
        context.strokeStyle = '#775d40'; context.lineWidth = 5; context.beginPath(); context.moveTo(...trunk); context.lineTo(...crown); context.stroke();
        context.beginPath(); context.ellipse(...crown, scale * .35, scale * .38, 0, 0, Math.PI*2); context.fillStyle = '#32664c'; context.fill();
        hits.push({ index: i, points: [[crown[0]-scale*.35,crown[1]-scale*.38],[crown[0]+scale*.35,crown[1]-scale*.38],[crown[0]+scale*.35,crown[1]+scale*.38],[crown[0]-scale*.35,crown[1]+scale*.38]] });
      }
    }
  }
  canvas.addEventListener('click', event => {
    const rect = canvas.getBoundingClientRect(); const x = event.clientX-rect.left, y = event.clientY-rect.top;
    const inside = points => {
      let yes = false;
      for (let a = 0, b = points.length-1; a < points.length; b = a++) {
        const [ax, ay] = points[a], [bx, by] = points[b];
        if (((ay > y) !== (by > y)) && x < (bx-ax)*(y-ay)/(by-ay)+ax) yes = !yes;
      }
      return yes;
    };
    const hit = [...hits].reverse().find(hit => inside(hit.points)); if (hit) onPick(hit.index);
  });
  const observer = new ResizeObserver(() => state && draw(...state)); observer.observe(canvas.parentElement);
  return { draw, stop: () => observer.disconnect() };
}

function createThree(THREE, canvas, onPick) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-6,6,5,-5,.1,100);
  camera.position.set(11,12,11); camera.lookAt(0,.25,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0xb0beb3,2));
  const sun = new THREE.DirectionalLight(0xffffff,2); sun.position.set(-50,50,0); scene.add(sun);
  const group = new THREE.Group(); scene.add(group);
  let state;
  function mesh(geometry, color, position, index) {
    const item = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color,roughness:.9}));
    item.position.set(...position); item.userData.index = index; group.add(item); return item;
  }
  function draw(cells, results, selected, heatmap) {
    state = [cells, results, selected, heatmap];
    for (const item of [...group.children]) { item.geometry.dispose(); if (Array.isArray(item.material)) item.material.forEach(m => m.dispose()); else item.material.dispose(); group.remove(item); }
    cells.forEach((cell, i) => {
      const x = i % SIZE - 3.5, z = Math.floor(i / SIZE) - 3.5;
      const temperatureColor = heatColor(results[i].temperature);
      mesh(new THREE.BoxGeometry(.97,.08,.97), heatmap && cell.object?.type !== 'building' ? temperatureColor : shadeColor(surfaceColor[cell.ground],results[i].shade), [x,-.04,z], i);
      if (cell.object?.type === 'building') {
        const h = HEIGHTS[cell.object.height] / 10;
        const sides = new THREE.MeshStandardMaterial({color: '#a8b8b0'});
        const roof = new THREE.MeshStandardMaterial({color: heatmap ? temperatureColor : shadeColor(roofColor[cell.object.material],results[i].shade)});
        const building = new THREE.Mesh(new THREE.BoxGeometry(.8,h,.8), [sides,sides,roof,sides,sides,sides]);
        building.position.set(x,h/2,z); building.userData.index = i; group.add(building);
        // Window strips make heights easy to distinguish without detailed assets.
        for (let floor = .25; floor < h; floor += .3) mesh(new THREE.BoxGeometry(.55,.07,.012),'#536b67',[x,floor,z+.407],i);
      } else if (cell.object?.type === 'tree') {
        mesh(new THREE.CylinderGeometry(.035,.05,.6,7),'#79664c',[x,.3,z],i);
        mesh(new THREE.SphereGeometry(.35,12,9),'#397456',[x,.7,z],i);
      }
      if (i === selected) {
        const h = cell.object?.type === 'building' ? HEIGHTS[cell.object.height]/10+.02 : .015;
        const points = [[x-.48,h,z-.48],[x+.48,h,z-.48],[x+.48,h,z+.48],[x-.48,h,z+.48],[x-.48,h,z-.48]].map(v => new THREE.Vector3(...v));
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#18372e'})));
      }
    });
    const width = canvas.clientWidth, height = canvas.clientHeight;
    renderer.setSize(width,height,false);
    fitCamera(width / height);
    renderer.render(scene,camera);
  }
  // Frame the board with the tallest possible building so zoom stays fixed while editing.
  const tallest = Math.max(...Object.values(HEIGHTS)) / 10, edge = SIZE / 2;
  function fitCamera(aspect) {
    camera.updateMatrixWorld();
    const bounds = { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity };
    for (const x of [-edge, edge]) for (const y of [0, tallest]) for (const z of [-edge, edge]) {
      const p = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
      bounds.left = Math.min(bounds.left, p.x); bounds.right = Math.max(bounds.right, p.x);
      bounds.bottom = Math.min(bounds.bottom, p.y); bounds.top = Math.max(bounds.top, p.y);
    }
    const margin = 0.4, centerX = (bounds.left + bounds.right) / 2, centerY = (bounds.bottom + bounds.top) / 2;
    const halfHeight = Math.max((bounds.top - bounds.bottom) / 2, (bounds.right - bounds.left) / 2 / aspect) + margin;
    camera.left = centerX - halfHeight * aspect; camera.right = centerX + halfHeight * aspect;
    camera.top = centerY + halfHeight; camera.bottom = centerY - halfHeight; camera.updateProjectionMatrix();
  }
  canvas.addEventListener('click', event => {
    const rect = canvas.getBoundingClientRect();
    const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
    const hit = ray.intersectObjects(group.children).find(hit => Number.isInteger(hit.object.userData.index));
    if (hit) onPick(hit.object.userData.index);
  });
  new ResizeObserver(() => state && draw(...state)).observe(canvas.parentElement);
  return { draw };
}

export async function createView(canvas, onPick, onReady) {
  // Pinned official Three.js 0.160.1, served with the site. The simulator also works without it.
  const loading = import('./vendor/three.module.min.js');
  try {
    const THREE = await Promise.race([
      loading,
      new Promise((_, reject) => setTimeout(() => reject(new Error('3D download timeout')), 4500)),
    ]);
    const view = createThree(THREE,canvas,onPick);
    onReady('Three.js 3D'); return view;
  } catch {
    // A failed WebGL construction may claim the original canvas context.
    const fallbackCanvas = canvas.cloneNode(true); canvas.replaceWith(fallbackCanvas);
    const fallback = createIsometric(fallbackCanvas,onPick);
    let current = fallback, latest;
    onReady('Isometric view · 3D fallback');
    // On slow connections, keep downloading and switch to 3D once it arrives.
    loading.then(THREE => {
      const threeCanvas = fallbackCanvas.cloneNode(true); fallbackCanvas.replaceWith(threeCanvas);
      try { current = createThree(THREE,threeCanvas,onPick); }
      catch { threeCanvas.replaceWith(fallbackCanvas); return; }
      fallback.stop(); onReady('Three.js 3D');
      if (latest) current.draw(...latest);
    }).catch(() => {});
    return { draw: (...args) => { latest = args; current.draw(...args); } };
  }
}
