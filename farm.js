// FARM MAP - every object is built from simple Three.js shapes. Returns a list of solid obstacles {x,z,r,h}.
function buildFarm(scene, R) {
  const obs = [], cache = {}, rnd = (a, b) => a + Math.random() * (b - a), PI = Math.PI;
  const M = c => cache[c] || (cache[c] = new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
  const add = (geo, c, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); scene.add(m); return m; };
  const B = (w, h, d, c, x, y, z, ry = 0) => add(new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z, 0, ry);   // y = bottom
  const Cy = (r, h, c, x, y, z, seg = 10) => add(new THREE.CylinderGeometry(r, r, h, seg), c, x, y + h / 2, z);
  const flat = (geo, c, x, z, y = .03, rot = 0) => { const m = add(geo, c, x, y, z, -PI / 2); m.rotation.z = rot; return m; };
  const ob = (x, z, r, h = 99) => obs.push({ x, z, r, h });
  const free = (x, z, pad = 1) => !obs.some(o => Math.hypot(x - o.x, z - o.z) < o.r + pad);
  const inst = (geo, c, n, fn, vary) => {
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: c, flatShading: true }), n), d = new THREE.Object3D();
    for (let i = 0; i < n; i++) { d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); fn(d, i); d.updateMatrix(); im.setMatrixAt(i, d.matrix); if (vary) im.setColorAt(i, new THREE.Color(vary[i % vary.length])); }
    scene.add(im); return im;
  };
  const road = (x1, z1, x2, z2, w = 5) => { const dx = x2 - x1, dz = z2 - z1; flat(new THREE.PlaneGeometry(w, Math.hypot(dx, dz)), '#b58f5e', (x1 + x2) / 2, (z1 + z2) / 2, .04, Math.atan2(-dx, -dz)); };
  const fence = (x1, z1, x2, z2) => {
    const dx = x2 - x1, dz = z2 - z1, l = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx);
    B(.25, 1.5, .25, '#7a5632', x1, 0, z1);
    [.5, 1.05].forEach(y => B(l, .12, .1, '#a07848', (x1 + x2) / 2, y, (z1 + z2) / 2, ry));
  };
  const box4 = (x, z, w, d) => { fence(x - w / 2, z - d / 2, x + w / 2, z - d / 2); fence(x + w / 2, z - d / 2, x + w / 2, z + d / 2); fence(x + w / 2, z + d / 2, x - w / 2, z + d / 2); fence(x - w / 2, z + d / 2, x - w / 2, z - d / 2); };
  const wheel = (x, y, z, r, w) => { add(new THREE.CylinderGeometry(r, r, w, 12), '#222', x, y, z, 0, 0, PI / 2); add(new THREE.CylinderGeometry(r * .5, r * .5, w + .05, 8), '#d9a441', x, y, z, 0, 0, PI / 2); };

  // ground, lawn, dirt yard, roads, patches
  flat(new THREE.CircleGeometry(700, 48), '#76b947', 0, 0, -.05);
  flat(new THREE.CircleGeometry(R + 10, 48), '#8fd058', 0, 0, -.02);
  flat(new THREE.CircleGeometry(11, 32), '#a98355', 0, 0, .03);
  road(0, 70, 0, 0); road(0, -2, -28, -14); road(0, -2, 26, -22); road(-4, 4, -26, 20); road(4, 2, 30, 18, 4);
  for (let i = 0; i < 16; i++) { const a = rnd(0, 7), r = rnd(6, R - 4); flat(new THREE.CircleGeometry(rnd(1, 2.6), 10), i % 2 ? '#8c6a43' : '#a07c4e', Math.cos(a) * r, Math.sin(a) * r, .035); }

  // red barn
  const bx = -30, bz = -26;
  B(16, 8, 20, '#b3262e', bx, 0, bz); ob(bx, bz - 5, 8.5); ob(bx, bz + 5, 8.5);
  [1, -1].forEach(s => add(new THREE.BoxGeometry(9.2, .5, 22), '#5c5f66', bx - s * 3.6, 10.15, bz, 0, 0, s * .45));
  [-10, 10].forEach(dz => { const t = add(new THREE.CylinderGeometry(9.24, 9.24, .3, 3), '#b3262e', bx, 9.43, bz + dz, -PI / 2); t.scale.set(1, 1, .31); });
  B(6, 5.5, .3, '#5a2a1e', bx, 0, bz + 10.1);
  B(6.3, .3, .35, '#fff', bx, 5.5, bz + 10.15); B(.3, 5.5, .35, '#fff', bx - 3.1, 0, bz + 10.15); B(.3, 5.5, .35, '#fff', bx + 3.1, 0, bz + 10.15); B(.25, 7, .35, '#fff', bx, -.6, bz + 10.2, .0).rotation.z = .85;
  B(.25, 7, .35, '#fff', bx, -.6, bz + 10.2).rotation.z = -.85;
  // silo, feed bins, barrels, sacks
  Cy(3, 14, '#c9ced3', -14, 0, -34, 14); add(new THREE.ConeGeometry(3.2, 3, 14), '#8b2a2a', -14, 15.5, -34); ob(-14, -34, 3.2);
  Cy(.9, 1.6, '#9aa5ad', -9, 0, -14); add(new THREE.ConeGeometry(1, .7, 8), '#c0392b', -9, 1.95, -14); ob(-9, -14, 1, 2);
  [[-20, -14], [-21.3, -14.4], [-20.5, -15.5]].forEach(([x, z], i) => { Cy(.6, 1.1, i % 2 ? '#2c6fb0' : '#2e8f5a', x, 0, z); ob(x, z, .7, 1.1); });
  B(1.2, .5, .8, '#d9c9a0', -17, 0, -13); B(1.2, .5, .8, '#d9c9a0', -17.1, .5, -13.1, .3); ob(-17, -13, 1, 1);

  // farmhouse
  const hx = 30, hz = -28;
  B(12, 6, 10, '#f2e6c9', hx, 0, hz); add(new THREE.ConeGeometry(9.2, 4, 4), '#7a3b2e', hx, 8, hz, 0, PI / 4).scale.set(1.15, 1, .95); B(1.2, 3, 1.2, '#8a4a3a', hx + 3, 6, hz - 1);
  B(1.6, 3, .2, '#6b3b22', hx, 0, hz + 5.1); [-4, 4, -2.5, 2.5].forEach(x => B(1.5, 1.5, .2, '#6fb7e8', hx + x * 1.2, 2.2, hz + 5.1));
  B(12, .4, 3, '#a07848', hx, 0, hz + 6.5); [-5.5, 5.5].forEach(x => B(.3, 3, .3, '#fff', hx + x, 0, hz + 7.8)); B(12.4, .3, 3.6, '#7a3b2e', hx, 3.1, hz + 6.6);
  ob(hx - 3, hz, 6); ob(hx + 3, hz, 6);

  // shed, coops, hay, troughs, equipment
  B(5, 3.5, 4, '#8a6a45', 36, 0, 6); add(new THREE.BoxGeometry(5.8, .3, 4.8), '#9aa0a6', 36, 3.8, 6, 0, 0, .12); B(1.4, 2.4, .2, '#4d3522', 36, 0, 8.05); ob(36, 6, 3.4);
  [[-12, 10, .4], [-18, 16, -.3], [-6, 18, .2]].forEach(([x, z, ry]) => {
    B(3, 1.8, 2.4, '#e0b070', x, .6, z, ry); add(new THREE.BoxGeometry(3.5, .2, 3), '#a63d2f', x, 2.6, z, 0, ry, 0).rotation.z = .12;
    B(.6, .8, .1, '#3a2a1a', x, .8, z + 1.25, ry); B(.8, .1, 1.6, '#a07848', x, .2, z + 2, ry); [-1.2, 1.2].forEach(s => B(.2, .6, .2, '#7a5632', x + s, 0, z - .8, ry)); ob(x, z, 2.4, 3);
  });
  const bale = (x, y, z) => add(new THREE.CylinderGeometry(1.1, 1.1, 1.5, 12), '#e0c15a', x, y + 1.1, z, 0, rnd(0, 3), PI / 2);
  [[-20, -4], [-22.5, -4.4], [-21.2, -4.2, 1.1]].forEach(([x, z, y = 0]) => bale(x, y, z)); ob(-21.4, -4.2, 2.4, 2.4);
  [[8, 22], [-30, -2], [26, 10], [-2, -22], [42, -8]].forEach(([x, z]) => { bale(x, 0, z); ob(x, z, 1.3, 1.5); });
  [[4, -7, 0], [-26, -8, .5], [20, 4, 1.2]].forEach(([x, z, ry]) => { B(3.2, .8, 1.1, '#8a8f94', x, 0, z, ry); B(2.9, .05, .8, '#4aa8ff', x, .78, z, ry); ob(x, z, 1.7, .8); });
  // tractor
  const tx = 14, tz = -18;
  B(2.2, 1.6, 3.8, '#2f8f46', tx, .8, tz); B(1.9, 1.9, 1.7, '#1f6a33', tx, 2.2, tz - .5); B(2.3, .15, 2.1, '#222', tx, 4.1, tz - .5);
  [-.95, .95].forEach(s => B(.12, 1.7, .12, '#222', tx + s, 2.4, tz - 1.2)); Cy(.1, 1.2, '#444', tx + .6, 2.4, tz + 1.4, 6);
  wheel(tx - 1.4, 1.2, tz - 1.1, 1.2, .8); wheel(tx + 1.4, 1.2, tz - 1.1, 1.2, .8); wheel(tx - 1.2, .7, tz + 1.4, .7, .5); wheel(tx + 1.2, .7, tz + 1.4, .7, .5); ob(tx, tz, 2.6, 3);
  // old wagon and rusty plow
  B(4, .3, 2.4, '#7a5632', -40, 1, 6); [-1.2, 1.2].forEach(s => { B(4, .8, .15, '#6a4a28', -40, 1.3, 6 + s); }); wheel(-41.5, 1, 7.3, 1, .2); wheel(-38.5, 1, 7.3, 1, .2); wheel(-41.5, 1, 4.7, 1, .2); wheel(-38.5, 1, 4.7, 1, .2); B(3, .2, .2, '#6a4a28', -43, .8, 6); ob(-40, 6, 2.6, 1.8);
  [0, 1, 2, 3].forEach(i => B(.2, 1.4, .2, '#8a4b2a', 24 + i * .7, 0, -6, .0).rotation.z = .5); B(3, .15, .2, '#7a3f22', 25, .9, -6); B(.2, .15, 2.4, '#7a3f22', 26.2, .6, -5); ob(25, -6, 1.8, 1.4);

  // corn field and vegetable garden
  flat(new THREE.PlaneGeometry(19, 15), '#6b4a2e', -25, 20, .035);
  const stalks = []; for (let x = -33; x <= -17; x += 1.1) for (let z = 13.5; z <= 26.5; z += 1.1) stalks.push([x + rnd(-.2, .2), z + rnd(-.2, .2), rnd(2.2, 3.4)]);
  inst(new THREE.BoxGeometry(.14, 1, .14), '#5fa83a', stalks.length, (d, i) => { const s = stalks[i]; d.position.set(s[0], s[2] / 2, s[1]); d.scale.y = s[2]; });
  inst(new THREE.BoxGeometry(1.1, .05, .22), '#4f9a32', stalks.length, (d, i) => { const s = stalks[i]; d.position.set(s[0], s[2] * .65, s[1]); d.rotation.y = rnd(0, PI); d.rotation.z = rnd(-.3, .3); });
  inst(new THREE.ConeGeometry(.13, .5, 4), '#d9b84a', stalks.length, (d, i) => { const s = stalks[i]; d.position.set(s[0], s[2] + .2, s[1]); });
  const gx = 30, gz = 18; B(11, .25, 8, '#5b3a24', gx, 0, gz); box4(gx, gz, 12.5, 9.5);
  const veg = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) veg.push([gx - 4.2 + c * 1.2, gz - 2.8 + r * 1.9]);
  inst(new THREE.IcosahedronGeometry(.4, 0), '#ffffff', veg.length, (d, i) => { d.position.set(veg[i][0], .5, veg[i][1]); d.scale.y = .8; }, ['#5fb04a', '#d94a3a', '#8bc34a', '#e8873a', '#9b59b6']);
  B(.15, 2.6, .15, '#7a5632', gx + 6.8, 0, gz - 5.8); B(1.8, .12, .12, '#7a5632', gx + 6.8, 1.9, gz - 5.8); add(new THREE.ConeGeometry(.5, .5, 8), '#d9b84a', gx + 6.8, 2.8, gz - 5.8); B(.8, 1, .3, '#3a6ea5', gx + 6.8, .9, gz - 5.8);

  // fences: perimeter (with a south gate), coop paddock
  const N = 72; for (let i = 0; i < N; i++) { const a = i / N * 2 * PI, b = (i + 1) / N * 2 * PI; if (Math.abs(((a + PI * 1.5) % (2 * PI)) - PI) > .17) fence(Math.cos(a) * R, Math.sin(a) * R, Math.cos(b) * R, Math.sin(b) * R); }
  box4(-12, 14, 18, 14);

  // scatter: trees (some solid), bushes, rocks, weeds, flowers, clouds
  const trees = []; for (let i = 0; i < 90; i++) { const a = rnd(0, 7), r = i < 12 ? rnd(R - 8, R - 3) : rnd(R + 5, 140); const x = Math.cos(a) * r, z = Math.sin(a) * r; if (free(x, z, 3) && !(Math.abs(x) < 5 && z > 0)) { trees.push([x, z, rnd(.8, 1.5)]); if (r < R) ob(x, z, .9 * 1, 99); } }
  inst(new THREE.CylinderGeometry(.35, .5, 3, 6), '#6b4a2e', trees.length, (d, i) => { d.position.set(trees[i][0], 1.5 * trees[i][2], trees[i][1]); d.scale.setScalar(trees[i][2]); });
  inst(new THREE.IcosahedronGeometry(2.4, 0), '#ffffff', trees.length, (d, i) => { d.position.set(trees[i][0], 4.6 * trees[i][2], trees[i][1]); d.scale.set(trees[i][2], trees[i][2] * 1.2, trees[i][2]); d.rotation.y = i; }, ['#3f8f3a', '#4ea544', '#2f7d3a', '#6bb04a']);
  const spots = (n, pad, rmax = R - 2) => { const p = []; let k = 0; while (p.length < n && k++ < n * 6) { const a = rnd(0, 7), r = Math.sqrt(Math.random()) * rmax, x = Math.cos(a) * r, z = Math.sin(a) * r; if (free(x, z, pad) && Math.hypot(x + 25, z - 20) > 13 || false) p.push([x, z]); } return p; };
  let bu = spots(40, 1.5); inst(new THREE.IcosahedronGeometry(.9, 0), '#3f8f3a', bu.length, (d, i) => { d.position.set(bu[i][0], .5, bu[i][1]); d.scale.set(rnd(.8, 1.4), rnd(.7, 1), rnd(.8, 1.4)); });
  let ro = spots(36, .8); inst(new THREE.DodecahedronGeometry(.7, 0), '#8d9296', ro.length, (d, i) => { d.position.set(ro[i][0], .25, ro[i][1]); d.scale.set(rnd(.5, 1.6), rnd(.4, .9), rnd(.5, 1.6)); d.rotation.set(rnd(0, 3), rnd(0, 3), 0); });
  [[-24, 24, 1.8], [10, -10, 1.6], [34, -10, 1.7]].forEach(([x, z, s]) => { add(new THREE.DodecahedronGeometry(s, 0), '#7c8185', x, s * .6, z).scale.y = .8; ob(x, z, s, s * 1.1); });
  let we = spots(260, .3, R + 6); inst(new THREE.ConeGeometry(.16, .8, 4), '#5aa03c', we.length, (d, i) => { d.position.set(we[i][0], .35, we[i][1]); d.rotation.y = i; d.scale.y = rnd(.6, 1.5); });
  let wd = spots(50, .3); inst(new THREE.ConeGeometry(.12, 1.1, 4), '#8a9a4a', wd.length, (d, i) => { d.position.set(wd[i][0], .5, wd[i][1]); d.rotation.z = rnd(-.3, .3); });
  let fl = spots(160, .3); inst(new THREE.SphereGeometry(.17, 6, 4), '#ffffff', fl.length, (d, i) => { d.position.set(fl[i][0], .4, fl[i][1]); }, ['#ff5c8a', '#ffd23f', '#ffffff', '#b46cff', '#ff8a3d']);

  // distant hills, mountains, clouds, sun
  const hills = ['#6fae45', '#5e9e40', '#7ebd52', '#4f8e3c'];
  for (let i = 0; i < 20; i++) { const a = i / 20 * 2 * PI + rnd(-.1, .1), r = rnd(120, 190); add(new THREE.SphereGeometry(1, 12, 8), hills[i % 4], Math.cos(a) * r, -4, Math.sin(a) * r).scale.set(rnd(40, 75), rnd(14, 30), rnd(40, 75)); }
  for (let i = 0; i < 14; i++) { const a = i / 14 * 2 * PI + rnd(-.15, .15), r = rnd(270, 340), h = rnd(80, 130), w = rnd(50, 80), x = Math.cos(a) * r, z = Math.sin(a) * r; add(new THREE.ConeGeometry(w, h, 6), '#7d8fa8', x, h / 2 - 5, z); add(new THREE.ConeGeometry(w * .3, h * .3, 6), '#ffffff', x, h * .85 - 5, z); }
  inst(new THREE.IcosahedronGeometry(8, 0), '#ffffff', 36, (d, i) => { const g = Math.floor(i / 4), a = g * 2.1, r = 60 + g * 22; d.position.set(Math.cos(a) * r + (i % 4) * 9, 85 + (g % 3) * 14, Math.sin(a) * r + (i % 2) * 5); d.scale.set(1.6, .6, 1); });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(18, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff4a8', fog: false })); sun.position.set(220, 200, -380); scene.add(sun);
  return obs;
}
