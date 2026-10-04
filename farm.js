// FARM MAP. Layout (x = left/right, z = toward you):  barn+silo+tractor NW, farmhouse+garden N, coop paddock W,
// corn field SE, shed E, central muster yard, main road runs from the south gate to the yard.
// Every solid thing registers an obstacle: round {x,z,r,h} or axis-aligned box {x,z,hw,hd,h}. h = how tall (low ones can be jumped).
function buildFarm(scene, R) {
  const obs = [], cache = {}, rnd = (a, b) => a + Math.random() * (b - a), PI = Math.PI;
  const M = c => cache[c] || (cache[c] = new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
  const add = (geo, c, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); scene.add(m); return m; };
  const B = (w, h, d, c, x, y, z, ry = 0) => add(new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z, 0, ry);   // y = bottom
  const Cy = (r, h, c, x, y, z, seg = 10) => add(new THREE.CylinderGeometry(r, r, h, seg), c, x, y + h / 2, z);
  const flat = (w, d, c, x, z, y = .03) => add(new THREE.PlaneGeometry(w, d), c, x, y, z, -PI / 2);
  const ob = (x, z, r, h = 99) => obs.push({ x, z, r, h });
  const obb = (x, z, hw, hd, h = 99) => obs.push({ x, z, hw, hd, h });
  const free = (x, z, pad) => !obs.some(o => Math.hypot(x - o.x, z - o.z) < (o.r ?? Math.hypot(o.hw, o.hd)) + pad);
  const inst = (geo, c, n, fn, vary) => {
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: c, flatShading: true }), n), d = new THREE.Object3D();
    for (let i = 0; i < n; i++) { d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); fn(d, i); d.updateMatrix(); im.setMatrixAt(i, d.matrix); if (vary) im.setColorAt(i, new THREE.Color(vary[i % vary.length])); }
    scene.add(im); return im;
  };
  const road = (x1, z1, x2, z2, w = 4) => { const dx = x2 - x1, dz = z2 - z1, m = flat(w, Math.hypot(dx, dz), '#b9955f', (x1 + x2) / 2, (z1 + z2) / 2, .04); m.rotation.z = Math.atan2(-dx, -dz); };
  const fence = (x1, z1, x2, z2, solid = true) => {
    const dx = x2 - x1, dz = z2 - z1, l = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx);
    B(.25, 1.5, .25, '#7a5632', x1, 0, z1); B(.25, 1.5, .25, '#7a5632', x2, 0, z2);
    [.5, 1.05].forEach(y => B(l, .12, .1, '#a07848', (x1 + x2) / 2, y, (z1 + z2) / 2, ry));
    if (solid) obb((x1 + x2) / 2, (z1 + z2) / 2, Math.abs(dx) / 2 + .15, Math.abs(dz) / 2 + .15, 1.5);
  };
  const side = (a, b, c, e, gap) => {   // one fence side, optionally with a 3-unit gate in the middle
    if (!gap) return fence(a, b, c, e);
    const l = Math.hypot(c - a, e - b), ux = (c - a) / l, uz = (e - b) / l, mx = (a + c) / 2, mz = (b + e) / 2;
    fence(a, b, mx - ux * 1.5, mz - uz * 1.5); fence(mx + ux * 1.5, mz + uz * 1.5, c, e);
  };
  const fenceRect = (x, z, w, d, gap = '') => { const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    side(x0, z0, x1, z0, gap.includes('n')); side(x1, z0, x1, z1, gap.includes('e')); side(x1, z1, x0, z1, gap.includes('s')); side(x0, z1, x0, z0, gap.includes('w')); };
  const wheel = (x, y, z, r, w) => { add(new THREE.CylinderGeometry(r, r, w, 12), '#222', x, y, z, 0, 0, PI / 2); add(new THREE.CylinderGeometry(r * .5, r * .5, w + .05, 8), '#d9a441', x, y, z, 0, 0, PI / 2); };
  const bale = (x, y, z) => add(new THREE.CylinderGeometry(1.1, 1.1, 1.5, 12), '#e0c15a', x, y + 1.1, z, 0, rnd(0, 3), PI / 2);

  // ground: calm greens (so red/orange enemies stand out), dirt yards and roads as straight strips - no random blobs
  add(new THREE.CircleGeometry(700, 48), '#74b146', 0, -.05, 0, -PI / 2); add(new THREE.CircleGeometry(R + 10, 48), '#79b84a', 0, -.02, 0, -PI / 2);
  flat(16, 16, '#b08c5e', 0, 0); [[-8, -8], [8, -8], [-8, 8], [8, 8]].forEach(([x, z]) => B(1, .5, 1, '#9aa0a6', x, 0, z));   // central muster yard
  flat(28, 14, '#a98355', -26, -12); flat(18, 14, '#a98355', -24, 10); flat(9, 4, '#8c6a43', -26, -6); flat(8, 5, '#8c6a43', -12, 3);   // barn yard, coop yard, mud by troughs
  road(0, 52, 0, -14, 5); road(0, -14, 24, -14); road(24, -14, 24, -21, 3); road(0, -14, -14, -14); road(8, 0, -14, 10, 3); road(8, 20, 15, 20, 3);

  // barn (NW) - walls are one solid box
  const bx = -26, bz = -30;
  B(16, 8, 20, '#b3262e', bx, 0, bz); obb(bx, bz, 8, 10);
  [1, -1].forEach(s => add(new THREE.BoxGeometry(9.2, .5, 22), '#5c5f66', bx - s * 3.6, 10.15, bz, 0, 0, s * .45));
  [-10, 10].forEach(dz => { const t = add(new THREE.CylinderGeometry(9.24, 9.24, .3, 3), '#b3262e', bx, 9.43, bz + dz, -PI / 2); t.scale.set(1, 1, .31); });
  B(6, 5.5, .3, '#5a2a1e', bx, 0, bz + 10.1); B(6.3, .3, .35, '#fff', bx, 5.5, bz + 10.15); [-3.1, 3.1].forEach(x => B(.3, 5.5, .35, '#fff', bx + x, 0, bz + 10.15));
  [.85, -.85].forEach(r => B(.25, 7, .35, '#fff', bx, -.6, bz + 10.2).rotation.z = r);
  Cy(3, 14, '#c9ced3', -13, 0, -34, 14); add(new THREE.ConeGeometry(3.2, 3, 14), '#8b2a2a', -13, 15.5, -34); ob(-13, -34, 3.1);   // silo
  bale(-15.5, 0, -26); bale(-17, 0, -24.3); bale(-16, 1.4, -25.2); ob(-16, -25, 2.3, 2.6);                                          // hay stack
  [[-31.5, -18.8], [-32.8, -19.2], [-32, -20.2]].forEach(([x, z], i) => { Cy(.6, 1.1, i % 2 ? '#2c6fb0' : '#2e8f5a', x, 0, z); ob(x, z, .65, 1.1); });
  B(1.2, .5, .8, '#d9c9a0', -20.5, 0, -18.8); B(1.2, .5, .8, '#d9c9a0', -20.5, .5, -18.9); obb(-20.5, -18.8, .7, .5, 1);
  Cy(.9, 1.6, '#9aa5ad', -35, 0, -17); add(new THREE.ConeGeometry(1, .7, 8), '#c0392b', -35, 1.95, -17); ob(-35, -17, 1, 2);       // feed bin
  const tx = -10, tz = -18;   // tractor
  B(2.2, 1.6, 3.8, '#2f8f46', tx, .8, tz); B(1.9, 1.9, 1.7, '#1f6a33', tx, 2.2, tz - .5); B(2.3, .15, 2.1, '#222', tx, 4.1, tz - .5);
  [-.95, .95].forEach(s => B(.12, 1.7, .12, '#222', tx + s, 2.4, tz - 1.2)); Cy(.1, 1.2, '#444', tx + .6, 2.4, tz + 1.4, 6);
  wheel(tx - 1.4, 1.2, tz - 1.1, 1.2, .8); wheel(tx + 1.4, 1.2, tz - 1.1, 1.2, .8); wheel(tx - 1.2, .7, tz + 1.4, .7, .5); wheel(tx + 1.2, .7, tz + 1.4, .7, .5); obb(tx, tz, 2.1, 2.4, 3);
  const wx = -38, wz = -8;   // old wagon
  B(4, .3, 2.4, '#7a5632', wx, 1, wz); [-1.2, 1.2].forEach(s => B(4, .8, .15, '#6a4a28', wx, 1.3, wz + s)); [[-1.5, 1.3], [1.5, 1.3], [-1.5, -1.3], [1.5, -1.3]].forEach(([x, z]) => wheel(wx + x, 1, wz + z, 1, .2)); B(3, .2, .2, '#6a4a28', wx - 3, .8, wz); obb(wx, wz, 2.2, 1.5, 1.8);
  [0, 1, 2, 3].forEach(i => B(.2, 1.4, .2, '#8a4b2a', 13 + i * .7, 0, -6).rotation.z = .5); B(3, .15, .2, '#7a3f22', 14.1, .9, -6); obb(14.1, -6, 1.8, .6, 1.4);   // rusty plow
  B(3.2, .8, 1.1, '#8a8f94', -26, 0, -9); B(2.9, .05, .8, '#4aa8ff', -26, .78, -9); obb(-26, -9, 1.7, .6, .8);                       // troughs
  B(3.2, .8, 1.1, '#8a8f94', -12, 0, 3); B(2.9, .05, .8, '#4aa8ff', -12, .78, 3); obb(-12, 3, 1.7, .6, .8);
  B(3.2, .8, 1.1, '#8a8f94', 10, 0, 22); B(2.9, .05, .8, '#4aa8ff', 10, .78, 22); obb(10, 22, 1.7, .6, .8);

  // farmhouse (N): house box + porch deck, with a path to the porch
  const hx = 24, hz = -30;
  B(12, 6, 10, '#f2e6c9', hx, 0, hz); obb(hx, hz, 6, 5);
  add(new THREE.ConeGeometry(9.2, 4, 4), '#7a3b2e', hx, 8, hz, 0, PI / 4).scale.set(1.15, 1, .95); B(1.2, 3, 1.2, '#8a4a3a', hx + 3, 6, hz - 1);
  B(1.6, 3, .2, '#6b3b22', hx, 0, hz + 5.1); [-4.8, -3, 3, 4.8].forEach(x => B(1.5, 1.5, .2, '#6fb7e8', hx + x, 2.2, hz + 5.1));
  B(12, .4, 3, '#a07848', hx, 0, hz + 6.5); obb(hx, hz + 6.5, 6, 1.5, .4); [-5.5, 5.5].forEach(x => { B(.3, 3, .3, '#fff', hx + x, 0, hz + 7.8); ob(hx + x, hz + 7.8, .25, 3); }); B(12.4, .3, 3.6, '#7a3b2e', hx, 3.1, hz + 6.6);
  B(5, 3.5, 4, '#8a6a45', 36, 0, -14); add(new THREE.BoxGeometry(5.8, .3, 4.8), '#9aa0a6', 36, 3.8, -14, 0, 0, .12); B(1.4, 2.4, .2, '#4d3522', 36, 0, -11.9); obb(36, -14, 2.5, 2);   // shed

  // vegetable garden (beside the house) with scarecrow
  const gx = 8, gz = -28; B(11, .25, 8, '#5b3a24', gx, 0, gz); fenceRect(gx, gz, 12.5, 9.5, 's');
  const veg = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) veg.push([gx - 4.2 + c * 1.2, gz - 2.8 + r * 1.9]);
  inst(new THREE.IcosahedronGeometry(.4, 0), '#ffffff', veg.length, (d, i) => { d.position.set(veg[i][0], .5, veg[i][1]); d.scale.y = .8; }, ['#5fb04a', '#d94a3a', '#8bc34a', '#e8873a', '#9b59b6']);
  B(.15, 2.6, .15, '#7a5632', gx + 5, 0, gz - 3.5); B(1.8, .12, .12, '#7a5632', gx + 5, 1.9, gz - 3.5); add(new THREE.ConeGeometry(.5, .5, 8), '#d9b84a', gx + 5, 2.8, gz - 3.5); B(.8, 1, .3, '#3a6ea5', gx + 5, .9, gz - 3.5); ob(gx + 5, gz - 3.5, .4, 2.6);

  // coop paddock (W): gate on the east side
  fenceRect(-24, 10, 18, 14, 'e');
  [[-29, 7], [-23, 7], [-26, 13.5]].forEach(([x, z]) => {
    B(3, 1.8, 2.4, '#e0b070', x, .6, z); add(new THREE.BoxGeometry(3.5, .2, 3), '#a63d2f', x, 2.6, z).rotation.z = .12;
    B(.6, .8, .1, '#3a2a1a', x, .8, z + 1.25); B(.8, .1, 1.6, '#a07848', x, .2, z + 2); [-1.2, 1.2].forEach(s => B(.2, .6, .2, '#7a5632', x + s, 0, z - .8)); obb(x, z, 1.6, 1.3, 2.7);
  });

  // corn field (SE) - walkable, eggs/foxes can hide in it
  flat(19, 15, '#6b4a2e', 24, 20, .035);
  const stalks = []; for (let x = 15; x <= 33; x += 1.1) for (let z = 13.5; z <= 26.5; z += 1.1) stalks.push([x + rnd(-.2, .2), z + rnd(-.2, .2), rnd(2.2, 3.4)]);
  inst(new THREE.BoxGeometry(.14, 1, .14), '#5fa83a', stalks.length, (d, i) => { const s = stalks[i]; d.position.set(s[0], s[2] / 2, s[1]); d.scale.y = s[2]; });
  inst(new THREE.BoxGeometry(1.1, .05, .22), '#4f9a32', stalks.length, (d, i) => { const s = stalks[i]; d.position.set(s[0], s[2] * .65, s[1]); d.rotation.y = rnd(0, PI); d.rotation.z = rnd(-.3, .3); });
  inst(new THREE.ConeGeometry(.13, .5, 4), '#d9b84a', stalks.length, (d, i) => { const s = stalks[i]; d.position.set(s[0], s[2] + .2, s[1]); });

  // loose hay, big rocks, perimeter fence (south gate on the road)
  [[-34, 20], [30, -3], [4, 30], [-6, -26], [40, -26]].forEach(([x, z]) => { bale(x, 0, z); ob(x, z, 1.25, 1.5); });
  [[-8, 26, 1.8], [40, 2, 1.7], [12, -40, 1.9]].forEach(([x, z, s]) => { add(new THREE.DodecahedronGeometry(s, 0), '#7c8185', x, s * .6, z).scale.y = .8; ob(x, z, s, s * 1.1); });
  const N = 72, gate = a => Math.abs(Math.atan2(Math.sin(a - PI / 2), Math.cos(a - PI / 2))) < .17;
  for (let i = 0; i < N; i++) { const a = i / N * 2 * PI, b = (i + 1) / N * 2 * PI; if (!gate(a)) fence(Math.cos(a) * R, Math.sin(a) * R, Math.cos(b) * R, Math.sin(b) * R, false); }

  // trees (placed on purpose: windbreak, house, edges), bushes, flower beds, grass tufts
  const trees = [[-10, -42], [-5, -43], [0, -44], [5, -43], [10, -42], [36, -34], [14, -37], [-40, 0], [-42, -14], [-38, 16], [42, 8], [40, 28], [30, 36], [-30, 38], [-10, 40], [14, 40], [42, -4], [-42, -26]];
  for (let i = 0; i < 80; i++) { const a = rnd(0, 7), r = rnd(R + 6, 140), x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x) > 8 || z < 0) trees.push([x, z]); }
  const sc = trees.map(() => rnd(.85, 1.4)); trees.forEach(([x, z]) => { if (Math.hypot(x, z) < R) ob(x, z, .8); });
  inst(new THREE.CylinderGeometry(.35, .5, 3, 6), '#6b4a2e', trees.length, (d, i) => { d.position.set(trees[i][0], 1.5 * sc[i], trees[i][1]); d.scale.setScalar(sc[i]); });
  inst(new THREE.IcosahedronGeometry(2.4, 0), '#ffffff', trees.length, (d, i) => { d.position.set(trees[i][0], 4.6 * sc[i], trees[i][1]); d.scale.set(sc[i], sc[i] * 1.2, sc[i]); d.rotation.y = i; }, ['#3f8f3a', '#4ea544', '#2f7d3a', '#6bb04a']);
  const bushes = [[18, -21.5], [30, -21.5], [-34, -19], [-18, -19.5], [-15, -37], [3, -34], [15, -36], [38, -18], [-14, 14], [-14, 6], [18, 12], [34, 12]];
  inst(new THREE.IcosahedronGeometry(.9, 0), '#3f8f3a', bushes.length, (d, i) => { d.position.set(bushes[i][0], .5, bushes[i][1]); d.scale.set(rnd(1, 1.4), rnd(.8, 1), rnd(1, 1.4)); }); bushes.forEach(([x, z]) => ob(x, z, .85, 1.2));
  const beds = []; for (let x = 18; x <= 30; x += .9) if (Math.abs(x - 24) > 2.2) { beds.push([x, -20.6]); beds.push([x + .4, -19.9]); }
  for (let x = 2; x <= 14; x += 1) beds.push([x, -22.4]);
  inst(new THREE.SphereGeometry(.17, 6, 4), '#ffffff', beds.length, (d, i) => d.position.set(beds[i][0], .4, beds[i][1]), ['#ff5c8a', '#ffd23f', '#ffffff', '#b46cff', '#ff8a3d']);
  const tufts = []; for (let i = 0; i < 260; i++) { const a = rnd(0, 7), r = rnd(R - 6, R - .6); tufts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  for (let i = 0; i < 50; i++) { const e = i % 4, t = rnd(0, 1); tufts.push([e < 2 ? 14 + rnd(0, 1.2) + (e ? 20 : 0) : 15 + t * 18, e < 2 ? 12.4 + t * 15 : (e === 2 ? 12.5 : 27.5) + rnd(-.6, .6)]); }
  inst(new THREE.ConeGeometry(.16, .8, 4), '#5aa03c', tufts.length, (d, i) => { d.position.set(tufts[i][0], .35, tufts[i][1]); d.rotation.y = i; d.scale.y = rnd(.6, 1.5); });
  inst(new THREE.DodecahedronGeometry(.45, 0), '#8d9296', 14, (d, i) => { const c = [[-8, 26], [40, 2], [12, -40]][i % 3]; d.position.set(c[0] + rnd(-3.5, 3.5), .2, c[1] + rnd(-3.5, 3.5)); d.scale.y = .6; d.rotation.y = i; });

  // distant hills, mountains, clouds, sun
  const hills = ['#6fae45', '#5e9e40', '#7ebd52', '#4f8e3c'];
  for (let i = 0; i < 20; i++) { const a = i / 20 * 2 * PI + rnd(-.1, .1), r = rnd(120, 190); add(new THREE.SphereGeometry(1, 12, 8), hills[i % 4], Math.cos(a) * r, -4, Math.sin(a) * r).scale.set(rnd(40, 75), rnd(14, 30), rnd(40, 75)); }
  for (let i = 0; i < 14; i++) { const a = i / 14 * 2 * PI + rnd(-.15, .15), r = rnd(270, 340), h = rnd(80, 130), w = rnd(50, 80), x = Math.cos(a) * r, z = Math.sin(a) * r; add(new THREE.ConeGeometry(w, h, 6), '#7d8fa8', x, h / 2 - 5, z); add(new THREE.ConeGeometry(w * .3, h * .3, 6), '#ffffff', x, h * .85 - 5, z); }
  inst(new THREE.IcosahedronGeometry(8, 0), '#ffffff', 36, (d, i) => { const g = Math.floor(i / 4), a = g * 2.1, r = 60 + g * 22; d.position.set(Math.cos(a) * r + (i % 4) * 9, 85 + (g % 3) * 14, Math.sin(a) * r + (i % 2) * 5); d.scale.set(1.6, .6, 1); });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(18, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff4a8', fog: false })); sun.position.set(220, 200, -380); scene.add(sun);
  return obs;
}
