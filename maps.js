// MAP LIST. To add a map: write a build(group, R) function that returns obstacles [{x,z,r,h}], then add it to MAPS.
function buildOrchard(g, R) {
  const obs = [], PI = Math.PI, rnd = (a, b) => a + Math.random() * (b - a), cache = {};
  const M = c => cache[c] || (cache[c] = new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
  const add = (geo, c, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
  const flat = (geo, c, x, z, y) => add(geo, c, x, y, z, -PI / 2);
  const inst = (geo, c, n, fn) => { const im = new THREE.InstancedMesh(geo, M(c), n), d = new THREE.Object3D(); for (let i = 0; i < n; i++) { d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); fn(d, i); d.updateMatrix(); im.setMatrixAt(i, d.matrix); } g.add(im); };
  flat(new THREE.CircleGeometry(700, 48), '#dbe7ef', 0, 0, -.05); flat(new THREE.CircleGeometry(R + 10, 48), '#f4f9fc', 0, 0, -.02);
  flat(new THREE.CircleGeometry(7, 24), '#9fd8f0', -22, 14, .03);   // frozen pond
  const trees = []; for (let x = -36; x <= 36; x += 12) for (let z = -36; z <= 36; z += 12) { const tx = x + rnd(-1.5, 1.5), tz = z + rnd(-1.5, 1.5); if (Math.hypot(tx, tz) > 17 && Math.hypot(tx, tz) < R - 5 && Math.hypot(tx + 22, tz - 14) > 9) { trees.push([tx, tz]); obs.push({ x: tx, z: tz, r: .9, h: 99 }); } }
  inst(new THREE.CylinderGeometry(.4, .55, 3, 6), '#6b4a2e', trees.length, (d, i) => d.position.set(trees[i][0], 1.5, trees[i][1]));
  inst(new THREE.IcosahedronGeometry(2.5, 0), '#2f6b4f', trees.length, (d, i) => { d.position.set(trees[i][0], 4.6, trees[i][1]); d.scale.y = 1.2; d.rotation.y = i; });
  inst(new THREE.IcosahedronGeometry(1.7, 0), '#ffffff', trees.length, (d, i) => d.position.set(trees[i][0], 6.6, trees[i][1]));
  // cabin
  add(new THREE.BoxGeometry(10, 5, 8), '#8a5a3a', 30, 2.5, -30); [1, -1].forEach(s => add(new THREE.BoxGeometry(6.4, .5, 9), '#ffffff', 30 - s * 2.6, 5.9, -30, 0, 0, s * .6)); add(new THREE.BoxGeometry(1.2, 3, 1.2), '#7a7a80', 33, 6.5, -30); add(new THREE.BoxGeometry(1.8, 3, .2), '#4d3522', 30, 1.5, -25.9);
  obs.push({ x: 28, z: -30, r: 5, h: 99 }, { x: 32, z: -30, r: 5, h: 99 });
  // snowmen
  [[8, -10], [-10, -7], [-4, 22]].forEach(([x, z]) => { add(new THREE.SphereGeometry(1.2, 8, 6), '#fff', x, 1.2, z); add(new THREE.SphereGeometry(.9, 8, 6), '#fff', x, 2.9, z); add(new THREE.SphereGeometry(.6, 8, 6), '#fff', x, 4, z); add(new THREE.ConeGeometry(.12, .6, 5), '#ff8a3d', x, 4, z + .7, PI / 2); add(new THREE.CylinderGeometry(.5, .5, .6, 8), '#222', x, 4.7, z); obs.push({ x, z, r: 1.3, h: 4 }); });
  inst(new THREE.DodecahedronGeometry(.8, 0), '#aab6c4', 32, (d, i) => { const a = i * 2.4, r = 14 + (i * 7) % 28; d.position.set(Math.cos(a) * r, .3, Math.sin(a) * r); d.scale.set(1 + i % 3 * .4, .6, 1 + i % 2 * .5); });
  inst(new THREE.BoxGeometry(4.2, 1.4, .8), '#9aa5b1', 72, (d, i) => { const a = i / 72 * 2 * PI; d.position.set(Math.cos(a) * R, .7, Math.sin(a) * R); d.rotation.y = -a + PI / 2; });
  const pines = []; for (let i = 0; i < 70; i++) { const a = rnd(0, 7), r = rnd(52, 140); pines.push([Math.cos(a) * r, Math.sin(a) * r, rnd(.9, 1.7)]); }
  inst(new THREE.ConeGeometry(2.6, 8, 7), '#2a5d46', 70, (d, i) => { d.position.set(pines[i][0], 4 * pines[i][2], pines[i][1]); d.scale.setScalar(pines[i][2]); });
  inst(new THREE.ConeGeometry(1.6, 3, 7), '#ffffff', 70, (d, i) => { d.position.set(pines[i][0], 8.4 * pines[i][2], pines[i][1]); d.scale.setScalar(pines[i][2]); });
  for (let i = 0; i < 18; i++) { const a = i / 18 * 2 * PI, r = rnd(130, 190); add(new THREE.SphereGeometry(1, 12, 8), '#e8f1f7', Math.cos(a) * r, -4, Math.sin(a) * r).scale.set(rnd(40, 70), rnd(14, 26), rnd(40, 70)); }
  for (let i = 0; i < 14; i++) { const a = i / 14 * 2 * PI + rnd(-.15, .15), r = rnd(270, 340), h = rnd(90, 140), w = rnd(50, 80), x = Math.cos(a) * r, z = Math.sin(a) * r; add(new THREE.ConeGeometry(w, h, 6), '#9fb4c8', x, h / 2 - 5, z); add(new THREE.ConeGeometry(w * .35, h * .35, 6), '#fff', x, h * .82 - 5, z); }
  return obs;
}
const MAPS = [
  { name: 'Sunny Farm', desc: 'Barn, corn field, tractor and rolling hills.', sky: '#bfe3ff', fog: '#cfe8f7', build: buildFarm },
  { name: 'Frosty Orchard', desc: 'Snowy tree rows, a cabin, snowmen and a frozen pond.', sky: '#dfe9f2', fog: '#e3edf5', build: buildOrchard },
];
