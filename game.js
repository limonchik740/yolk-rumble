// YOLK RUMBLE - first-person chicken shooter. All shapes are procedural Three.js geometry.
const $ = id => document.getElementById(id);
const COLORS = ['#fffdf5', '#ffc933', '#e8456b', '#4aa8ff', '#6bdc6b', '#b46cff'];
const EN_COLS = ['#d94a3a', '#8e3b8e', '#2f2f3a', '#c9722e'];
const WAVES = 5, R = 46;
const MODES = [
  { id: 'flock', name: 'Flock Survival', desc: 'Every chicken wants YOU. Survive 5 waves and wipe out the flock.' },
  { id: 'fox', name: 'Fox Siege', desc: 'Foxes are raiding the Golden Egg! Shoot them before it gets eaten.' },
];
// ---- WEAPON TUNING: edit these numbers to change how the egg blaster feels ----
const W = { rate: .13, dmg: 1, range: 90, base: .004, move: .022, air: .03, bloom: .005, maxBloom: .03, bloomDecay: 6, rp: .011, ry: .006, recover: 9 };
const FOX_DPS = 6, PLAYER_HP = 100;

const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
const scene = new THREE.Scene();
scene.background = new THREE.Color('#bfe3ff'); scene.fog = new THREE.Fog('#cfe8f7', 70, 380);
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 700); camera.rotation.order = 'YXZ'; scene.add(camera);
scene.add(new THREE.HemisphereLight('#ffffff', '#6aa84f', 0.9));
const sun = new THREE.DirectionalLight('#fff3c4', 0.8); sun.position.set(10, 20, 8); scene.add(sun);
const mesh = (geo, c, x = 0, y = 0, z = 0, parent) => { const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: c, flatShading: true })); m.position.set(x, y, z); if (parent) parent.add(m); return m; };
const rnd = (a, b) => a + Math.random() * (b - a);

// ---- map loading (maps.js / farm.js) ----
let mapGroup = null, posts = [], mapI = 0, modeI = 0, myColor = COLORS[1];
function loadMap(i) {
  if (mapGroup) { scene.remove(mapGroup); mapGroup.traverse(o => o.geometry && o.geometry.dispose()); }
  const m = MAPS[i]; mapGroup = new THREE.Group(); scene.add(mapGroup);
  posts = m.build(mapGroup, R); scene.background.set(m.sky); scene.fog.color.set(m.fog);
}

// ---- first-person view model ----
const view = new THREE.Group(); camera.add(view); view.visible = false;
const vm = (geo, c, x, y, z, rx = 0) => { const m = mesh(geo, c, x, y, z, view); m.rotation.x = rx; return m; };
vm(new THREE.ConeGeometry(.22, .7, 4), '#ff9a2e', 0, -.42, -.95, -Math.PI / 2);
const vmWings = [-1, 1].map(s => vm(new THREE.BoxGeometry(.12, .9, .5), '#fff', s * 1.15, -.9, -.9));
vm(new THREE.CylinderGeometry(.1, .14, .8, 6), '#2b1d4a', .55, -.5, -.9, Math.PI / 2);
const muzzle = mesh(new THREE.SphereGeometry(.2, 6, 4), '#ffe066', .55, -.5, -1.4, view); muzzle.material.emissive = new THREE.Color('#ffcc33'); muzzle.visible = false;
let yaw = 0, yawT = 0, pitch = 0, pitchT = 0, bobT = 0;

// ---- creature builders ----
function makeChicken(col) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  mesh(new THREE.SphereGeometry(.9, 8, 6), col, 0, 1.3, 0, body).scale.set(1, .95, 1.15);
  mesh(new THREE.SphereGeometry(.5, 8, 6), col, 0, 2.2, .6, body);
  mesh(new THREE.ConeGeometry(.2, .5, 4), '#ff9a2e', 0, 2.15, 1.2, body).rotation.x = Math.PI / 2;
  mesh(new THREE.BoxGeometry(.18, .35, .4), '#e8456b', 0, 2.8, .55, body);
  [-1, 1].forEach(s => { mesh(new THREE.SphereGeometry(.09, 6, 4), '#2b1d4a', s * .27, 2.35, 1.0, body); mesh(new THREE.BoxGeometry(.3, .07, .08), '#2b1d4a', s * .27, 2.55, 1.0, body).rotation.z = s * .5; });
  mesh(new THREE.ConeGeometry(.35, .8, 4), col, 0, 1.6, -1.1, body).rotation.x = -2;
  const wings = [-1, 1].map(s => { const w = mesh(new THREE.BoxGeometry(.15, .6, .9), col, s * .95, 1.4, 0, body); w.userData.s = s; return w; });
  const legs = [-1, 1].map(s => mesh(new THREE.CylinderGeometry(.07, .07, .6, 5), '#ff9a2e', s * .35, .3, 0, g));
  scene.add(g); return { g, body, wings, legs, col, hy: 1.5, hr: 1.2 };
}
function makeFox() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const O = '#e8742a', D = '#3a2418';
  mesh(new THREE.BoxGeometry(.9, .8, 1.8), O, 0, .95, 0, body); mesh(new THREE.BoxGeometry(.7, .65, .75), O, 0, 1.25, 1.1, body);
  mesh(new THREE.BoxGeometry(.3, .28, .5), '#fff4e0', 0, 1.12, 1.6, body); mesh(new THREE.BoxGeometry(.14, .14, .1), D, 0, 1.2, 1.88, body);
  [-1, 1].forEach(s => { mesh(new THREE.ConeGeometry(.16, .4, 4), O, s * .22, 1.75, 1.0, body); mesh(new THREE.BoxGeometry(.1, .1, .08), D, s * .2, 1.38, 1.48, body); });
  mesh(new THREE.BoxGeometry(.4, .4, 1.3), O, 0, 1.15, -1.4, body).rotation.x = .5; mesh(new THREE.BoxGeometry(.42, .42, .4), '#fff4e0', 0, 1.5, -1.95, body);
  const legs = [[-.28, .6], [.28, .6], [-.28, -.6], [.28, -.6]].map(([x, z]) => mesh(new THREE.BoxGeometry(.2, .6, .2), D, x, .3, z, g));
  scene.add(g); return { g, body, wings: [], legs, col: O, hy: .9, hr: 1.05 };
}
let egg = null;
function makeEgg() {
  const g = new THREE.Group(); mesh(new THREE.TorusGeometry(1.9, .5, 6, 12), '#c9a24a', 0, .3, 0, g).rotation.x = Math.PI / 2;
  const m = mesh(new THREE.SphereGeometry(1.1, 10, 8), '#fff8d6', 0, 1.8, 0, g); m.scale.y = 1.4; m.material.emissive = new THREE.Color('#aa8800');
  scene.add(g); return { g, m, hp: 100 };
}

// ---- state ----
let state = 'menu', wave = 0, toSpawn = 0, spawnT = 0, clearT = -1, bossed = false, kills = 0, score = 0, time = 0;
let enemies = [], bits = [], tracers = [], player = null, menuC = null;
let cool = 0, bloom = 0, kick = 0, recoilOff = 0, flashT = 0, hurtT = 0, mouseDown = false, lastKill = '';
const keys = {}, MODE = () => MODES[modeI];

// ---- sound (tiny synth, no files) ----
let ac; const SFX = { shoot: ['square', 420, 110, .07, .1], hit: ['triangle', 900, 650, .05, .14], kill: ['sawtooth', 450, 1100, .18, .18], hurt: ['sawtooth', 220, 60, .25, .22], egg: ['sine', 300, 120, .2, .18] };
function sfx(k) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const P = SFX[k], t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = P[0]; o.frequency.setValueAtTime(P[1], t); o.frequency.exponentialRampToValueAtTime(P[2], t + P[3]); g.gain.setValueAtTime(P[4], t); g.gain.exponentialRampToValueAtTime(.001, t + P[3] + .05);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + P[3] + .06);
  } catch (e) {}
}
function banner(t, ms) { const b = $('banner'); b.textContent = t; b.classList.add('show'); clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove('show'), ms); }
function toast(t) { const b = $('toast'); b.textContent = t; b.style.opacity = 1; clearTimeout(toast.t); toast.t = setTimeout(() => b.style.opacity = 0, 700); }
function mark(k) { const m = $('mark'); m.className = ''; void m.offsetWidth; m.className = k; }
const glow = (e, on) => e.g.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.setHex(on ? 0xff3030 : 0); });

// ---- game flow ----
function clearAll() {
  [...enemies, player, menuC].forEach(c => c && scene.remove(c.g)); bits.forEach(b => scene.remove(b.m)); tracers.forEach(t => scene.remove(t.m)); if (egg) scene.remove(egg.g);
  enemies = []; bits = []; tracers = []; egg = null; player = null; menuC = null;
}
function startGame() {
  clearAll(); const fox = MODE().id === 'fox';
  player = Object.assign(makeChicken(myColor), { speed: 9, vx: 0, vz: 0, vy: 0, size: 1, face: 0, stun: 0, hp: PLAYER_HP, safe: 0 });
  player.g.position.set(0, 0, 8); player.g.visible = false; if (fox) egg = makeEgg();
  wave = 0; kills = 0; score = 0; time = 0; toSpawn = 0; clearT = -1; bloom = 0; kick = 0; recoilOff = 0; hurtT = 0;
  view.visible = true; vmWings.forEach(w => w.material.color.set(myColor)); yaw = yawT = 0; pitch = pitchT = 0;
  $('menu').classList.add('hidden'); $('over').classList.add('hidden'); $('hud').classList.remove('hidden');
  $('eggbar').classList.toggle('hidden', !fox); $('hpbar').classList.toggle('hidden', fox);
  state = 'play'; nextWave(); try { $('c').requestPointerLock(); } catch (e) {}
}
function nextWave() {
  wave++; bossed = false; toSpawn = (MODE().id === 'fox' ? 5 : 4) + wave * 3; spawnT = 1.5;
  banner(wave === WAVES ? 'FINAL WAVE!' : 'WAVE ' + wave, 1800);
}
function endGame(win) {
  state = 'over'; document.exitPointerLock(); view.visible = false; mouseDown = false; $('hud').classList.add('hidden'); $('over').classList.remove('hidden');
  const fox = MODE().id === 'fox', mm = Math.floor(time / 60), ss = String(Math.floor(time % 60)).padStart(2, '0');
  $('overTitle').textContent = win ? '🏆 Victory!' : (fox ? '🍳 The egg got scrambled!' : '🐔 You got pecked out!');
  const rows = [['Mode', MODE().name], ['Map', MAPS[mapI].name], ['Wave reached', wave + ' / ' + WAVES], [fox ? 'Foxes foiled' : 'Chickens downed', kills], ['Score', score], ['Time', mm + ':' + ss]];
  if (fox) rows.push(['Egg health left', Math.max(0, Math.ceil(egg.hp)) + '%']);
  $('board').innerHTML = rows.map((r, i) => `<li class="${i === 5 ? 'win' : ''}"><span>${r[0]}</span><span>${r[1]}</span></li>`).join('');
}

// ---- enemies ----
function spawnEnemy() {
  const fox = MODE().id === 'fox', boss = !fox && wave === WAVES && !bossed; bossed = bossed || boss;
  const parts = fox ? makeFox() : makeChicken(boss ? '#7a1f1f' : EN_COLS[Math.floor(Math.random() * EN_COLS.length)]);
  const size = boss ? 2.2 : fox ? 1 : rnd(1, 1.25);
  const e = Object.assign(parts, { fox, boss, size, hp: fox ? (wave >= 4 ? 3 : 2) : boss ? 14 : 2 + Math.floor(wave / 2), speed: (fox ? 6.5 : 4.8) + wave * .35 + rnd(0, .8), vx: 0, vz: 0, vy: 0, face: 0, stun: 0, cool: 0, flash: 0 });
  let x, z, k = 0;
  do { const a = rnd(0, 7), r = R - 3 - rnd(0, 4); x = Math.cos(a) * r; z = Math.sin(a) * r; }
  while (k++ < 15 && (posts.some(o => Math.hypot(x - o.x, z - o.z) < o.r + 1.5) || Math.hypot(x - player.g.position.x, z - player.g.position.z) < 20));
  e.g.position.set(x, 0, z); e.g.scale.setScalar(size); enemies.push(e);
}
function steer(e, tx, tz, dt) {   // zombie-style: run straight at the target, slide around obstacles, shake loose if stuck
  const p = e.g.position; let dx = tx - p.x, dz = tz - p.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; let sx = dx, sz = dz;
  for (const o of posts) {
    const ax = p.x - o.x, az = p.z - o.z, d = Math.hypot(ax, az) || .01, lim = o.r + 2.5 * e.size;
    if (d < lim) { const w = (lim - d) / lim, nx = ax / d, nz = az / d, s = (dx * -nz + dz * nx) >= 0 ? 1 : -1; sx += nx * w * 1.2 - nz * s * w * 1.8; sz += nz * w * 1.2 + nx * s * w * 1.8; }
  }
  e.chk = (e.chk || 0) + dt;
  if (e.chk > .7) { e.chk = 0; const mv = Math.hypot(p.x - (e.lx ?? 1e9), p.z - (e.lz ?? 1e9)); e.lx = p.x; e.lz = p.z; if (mv < .8) { e.side = Math.random() < .5 ? 1 : -1; e.unstuck = .9; } }
  if ((e.unstuck -= dt) > 0) { const q = sx; sx = -sz * e.side; sz = q * e.side; }
  return [sx, sz];
}
function enemyAI(e, dt) {
  e.stun -= dt; e.cool -= dt; if (e.flash > 0 && (e.flash -= dt) <= 0) glow(e, false);
  const p = e.g.position, tx = e.fox ? 0 : player.g.position.x, tz = e.fox ? 0 : player.g.position.z, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz), reach = e.fox ? 3.4 : 2.3 * e.size;
  if (d > reach * .9) { const [ix, iz] = steer(e, tx, tz, dt); moveEntity(e, dt, ix, iz); if (!e.fox && p.y <= .01 && Math.random() < dt * .7) e.vy = 7; }
  else {
    moveEntity(e, dt, 0, 0); e.face = Math.atan2(dx, dz);
    if (e.fox) { if (e.stun <= 0) { egg.hp -= FOX_DPS * dt; egg.flash = .1; if (Math.random() < dt * 3) sfx('egg'); } }
    else if (e.cool <= 0 && Math.abs(player.g.position.y - p.y) < 2.2) { e.cool = .9; hurtPlayer(7 * (e.boss ? 2 : 1), dx / (d || 1), dz / (d || 1)); e.squash = -.4; }
  }
}
function hurtPlayer(n, nx, nz) { player.hp -= n; player.safe = 0; hurtT = .4; player.vx += nx * 7; player.vz += nz * 7; sfx('hurt'); if (player.hp <= 0) endGame(false); }
function killEnemy(e) {
  enemies.splice(enemies.indexOf(e), 1); scene.remove(e.g);
  for (let i = 0; i < 10; i++) { const m = mesh(new THREE.BoxGeometry(.25, .12, .25), i % 3 ? e.col : '#fff', e.g.position.x, e.g.position.y + e.hy * e.size, e.g.position.z, scene); bits.push({ m, vx: rnd(-6, 6), vy: rnd(3, 9), vz: rnd(-6, 6), life: .9 }); }
  const pts = e.boss ? 50 : e.fox ? 15 : 10; kills++; score += pts; mark('kill'); sfx('kill'); toast((e.fox ? 'Fox' : e.boss ? 'BOSS' : 'Chicken') + ' down! +' + pts);
}

// ---- weapon: hitscan egg blaster with spread, bloom and recoil ----
function fire() {
  cool = W.rate; const p = player.g.position, sp = Math.hypot(player.vx, player.vz), air = p.y > .05;
  const spread = W.base + bloom + sp / 9 * W.move * (player.running ? 1.4 : 1) + (air ? W.air : 0);
  const cp = Math.cos(pitch), sp_ = Math.sin(pitch), sy = Math.sin(yaw), cy = Math.cos(yaw);
  const dir = [-sy * cp, sp_, -cy * cp], right = [cy, 0, -sy], up = [sy * sp_, cp, cy * sp_], a = rnd(0, 6.283), rr = Math.sqrt(Math.random()) * spread;
  let d = dir.map((v, i) => v + right[i] * Math.cos(a) * rr + up[i] * Math.sin(a) * rr); const l = Math.hypot(...d); d = d.map(v => v / l);
  const o = [p.x, p.y + 1.7 * player.size, p.z];
  let tEnd = Math.min(W.range, d[1] < 0 ? -o[1] / d[1] : 1e9), tHit = 1e9, target = null;
  for (const ob of posts) {   // buildings and trees stop bullets
    const ox = o[0] - ob.x, oz = o[2] - ob.z, A = d[0] * d[0] + d[2] * d[2], B = ox * d[0] + oz * d[2], C = ox * ox + oz * oz - ob.r * ob.r, D = B * B - A * C;
    if (A > 1e-6 && D >= 0) { const t = (-B - Math.sqrt(D)) / A; if (t > 0 && t < tEnd && o[1] + d[1] * t < ob.h) tEnd = t; }
  }
  for (const e of enemies) {
    const c = [e.g.position.x, e.g.position.y + e.hy * e.size, e.g.position.z], r = e.hr * e.size, oc = [c[0] - o[0], c[1] - o[1], c[2] - o[2]];
    const t = oc[0] * d[0] + oc[1] * d[1] + oc[2] * d[2], dist2 = oc[0] ** 2 + oc[1] ** 2 + oc[2] ** 2 - t * t;
    if (t > 0 && dist2 < r * r) { const th = t - Math.sqrt(r * r - dist2); if (th < tHit && th < tEnd) { tHit = Math.max(th, 0); target = e; } }
  }
  if (target) tEnd = tHit;
  // tracer
  const mz = [o[0] + right[0] * .5 + d[0] * 1.2, o[1] - .45 + d[1] * 1.2, o[2] + right[2] * .5 + d[2] * 1.2], end = [o[0] + d[0] * tEnd, o[1] + d[1] * tEnd, o[2] + d[2] * tEnd];
  const len = Math.hypot(end[0] - mz[0], end[1] - mz[1], end[2] - mz[2]) || .1, tm = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, 1), new THREE.MeshBasicMaterial({ color: '#ffe066' }));
  tm.position.set((mz[0] + end[0]) / 2, (mz[1] + end[1]) / 2, (mz[2] + end[2]) / 2); tm.lookAt(end[0], end[1], end[2]); tm.scale.z = len; scene.add(tm); tracers.push({ m: tm, t: .06 });
  // feel
  const kickP = W.rp * rnd(.8, 1.2); pitchT += kickP; recoilOff += kickP; yawT += rnd(-1, 1) * W.ry; bloom = Math.min(W.maxBloom, bloom + W.bloom); kick = 1; flashT = .05; sfx('shoot');
  if (target) {
    target.hp -= W.dmg; target.flash = .1; glow(target, true); target.stun = .1; target.vx += d[0] * 2; target.vz += d[2] * 2; target.squash = .3; mark('hit'); sfx('hit');
    if (target.hp <= 0) killEnemy(target);
  }
}

// ---- movement / physics ----
function moveEntity(c, dt, ix, iz) {
  const p = c.g.position, grounded = p.y <= 0.001;
  if ((ix || iz) && c.stun <= 0) {
    const l = Math.hypot(ix, iz), sp = c.speed * (c.running ? 1.6 : 1); ix /= l; iz /= l; const k = Math.min(1, dt * (grounded ? 10 : 4));
    c.vx += (ix * sp - c.vx) * k; c.vz += (iz * sp - c.vz) * k; c.face = Math.atan2(ix, iz);
  } else { const f = 1 - Math.min(1, dt * (grounded ? 6 : .5)); c.vx *= f; c.vz *= f; }
  c.vy -= 30 * dt; p.x += c.vx * dt; p.z += c.vz * dt; p.y += c.vy * dt;
  if (p.y <= 0) { if (c.vy < -6) c.squash = .35; p.y = 0; c.vy = 0; }
  const r = Math.hypot(p.x, p.z), lim = R - c.size;
  if (r > lim) { p.x *= lim / r; p.z *= lim / r; c.vx *= -.4; c.vz *= -.4; }
  posts.forEach(o => {
    const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz) || .01, m = o.r + .8 * c.size;
    if (d < m && p.y < o.h) { p.x = o.x + dx / d * m; p.z = o.z + dz / d * m; c.vx += dx / d * 3; c.vz += dz / d * 3; }
  });
}

function update(dt, t) {
  time += dt; const P = player;
  // player
  const mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), mz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw); P.running = keys.ShiftLeft || keys.ShiftRight; P.stun -= dt;
  moveEntity(P, dt, mx * -fz + mz * fx, mx * fx + mz * fz); P.face = Math.atan2(fx, fz);
  cool -= dt; bloom = Math.max(0, bloom - W.bloomDecay * W.maxBloom * dt * .5); kick *= 1 - Math.min(1, dt * 18); flashT -= dt; hurtT -= dt;
  if ((mouseDown || keys.KeyF) && cool <= 0) fire();
  const rec = recoilOff * Math.min(1, dt * W.recover); pitchT -= rec; recoilOff -= rec;   // aim settles back down after bursts
  P.safe += dt; if (P.safe > 5 && P.hp < PLAYER_HP) P.hp = Math.min(PLAYER_HP, P.hp + 5 * dt);
  // enemies
  for (const e of [...enemies]) enemyAI(e, dt);
  for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
    const a = enemies[i], b = enemies[j], dx = b.g.position.x - a.g.position.x, dz = b.g.position.z - a.g.position.z, d = Math.hypot(dx, dz) || .01, m = 1.3 * (a.size + b.size) / 2;
    if (d < m) { const k = (m - d) / 2 / d; a.g.position.x -= dx * k; a.g.position.z -= dz * k; b.g.position.x += dx * k; b.g.position.z += dz * k; }
  }
  // waves
  if (toSpawn > 0) { spawnT -= dt; if (spawnT <= 0 && enemies.length < (MODE().id === 'fox' ? 16 : 14)) { spawnEnemy(); toSpawn--; spawnT = .7; } }
  else if (!enemies.length) {
    if (wave >= WAVES) return endGame(true);
    if (clearT < 0) { clearT = 3.5; banner('WAVE CLEARED!', 1800); } clearT -= dt; if (clearT <= 0) { clearT = -1; nextWave(); }
  }
  if (egg) { egg.flash -= dt; egg.g.rotation.y += dt; egg.m.rotation.z = egg.hp < 35 ? Math.sin(t * 30) * .12 : 0; egg.m.position.y = 1.8 + Math.sin(t * 2) * .1;
    egg.m.material.emissive.setHex(egg.flash > 0 ? 0xff3030 : 0x553300); egg.m.material.color.setHex(egg.hp > 60 ? 0xfff8d6 : egg.hp > 30 ? 0xffd89a : 0xffa070);
    if (egg.hp <= 0) return endGame(false); }
  // particles
  for (let i = bits.length - 1; i >= 0; i--) { const b = bits[i]; b.vy -= 25 * dt; b.m.position.x += b.vx * dt; b.m.position.y = Math.max(.1, b.m.position.y + b.vy * dt); b.m.position.z += b.vz * dt; b.m.rotation.x += dt * 12; b.m.rotation.z += dt * 9; if ((b.life -= dt) <= 0) { scene.remove(b.m); bits.splice(i, 1); } }
  for (let i = tracers.length - 1; i >= 0; i--) if ((tracers[i].t -= dt) <= 0) { scene.remove(tracers[i].m); tracers.splice(i, 1); }
  hud();
}

// ---- first-person camera ----
function fpsCamera(dt, t) {
  const k = Math.min(1, dt * 30); yaw += (yawT - yaw) * k; pitch += (pitchT - pitch) * k;
  const p = player.g.position, sp = Math.hypot(player.vx, player.vz), ground = p.y <= .01, amp = ground ? Math.min(1, sp / 9) : 0, hz = hurtT > 0 ? 1 : 0;
  if (ground) bobT += dt * sp * 1.4;
  camera.position.set(p.x, p.y + 1.7 * player.size + Math.sin(bobT * 2) * .09 * amp, p.z);
  camera.rotation.set(pitch + hz * Math.sin(t * 30) * .06, yaw, Math.sin(bobT) * .025 * amp + hz * Math.sin(t * 22) * .08);
  camera.fov += ((player.running && sp > 4 ? 80 : 70) - camera.fov) * Math.min(1, dt * 6); camera.updateProjectionMatrix();
  view.position.z = kick * .15; view.rotation.x = kick * .12; muzzle.visible = flashT > 0;
}

// ---- animation ----
function animate(t, dt) {
  [...enemies, menuC].forEach(c => {
    if (!c) return; const sp = Math.hypot(c.vx, c.vz), air = c.g.position.y > .05;
    c.g.rotation.y += Math.atan2(Math.sin(c.face - c.g.rotation.y), Math.cos(c.face - c.g.rotation.y)) * Math.min(1, dt * 14);
    c.squash = (c.squash || 0) * (1 - Math.min(1, dt * 9)); const run = Math.min(1, sp / 7);
    c.body.position.y = air ? 0 : Math.abs(Math.sin(t * 16 + (c.size || 1))) * run * .25; c.body.scale.set(1 + c.squash * .5, 1 - c.squash, 1 + c.squash * .5);
    c.body.rotation.z = c.stun > 0 ? Math.sin(t * 40) * .3 : Math.sin(t * 16) * .08 * run; c.body.rotation.x = c.fox ? 0 : Math.min(.3, sp * .03);
    c.wings.forEach(w => w.rotation.z = w.userData.s * (air ? Math.sin(t * 35) * .9 + .6 : sp > 1 ? Math.sin(t * 20) * .4 + .5 : .15));
    c.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 16 + i * Math.PI) * .9 * run; });
  });
}

// ---- HUD ----
function hud() {
  const fox = MODE().id === 'fox'; $('hint').classList.toggle('hidden', !!document.pointerLockElement);
  $('info').textContent = `Wave ${wave}/${WAVES}  •  ${enemies.length + toSpawn} ${fox ? 'foxes' : 'chickens'} left`;
  $('score').innerHTML = `<div class="me"><span>Kills</span><span>${kills}</span></div><div><span>Score</span><span>${score}</span></div>`;
  const hp = Math.max(0, player.hp); $('hpbar').firstChild.style.width = hp + '%'; $('hpbar').lastChild.textContent = '❤ ' + Math.ceil(hp); $('hpbar').firstChild.style.background = hp > 50 ? '#6bdc6b' : hp > 25 ? '#ffc933' : '#e8456b';
  if (egg) { const h = Math.max(0, egg.hp); $('eggbar').firstChild.style.width = h + '%'; $('eggbar').lastChild.textContent = '🥚 Golden Egg ' + Math.ceil(h) + '%'; }
  $('hurt').style.opacity = hurtT > 0 || (!fox && player.hp < 30) ? 1 : 0;
}

// ---- menu + input ----
function menuUI() {
  const mk = (id, list, cur, set) => { $(id).innerHTML = list.map((x, i) => `<button class="opt ${i === cur ? 'sel' : ''}" data-i="${i}">${x.name}</button>`).join(''); $(id).onclick = e => { const i = e.target.dataset.i; if (i != null) { set(+i); menuUI(); } }; };
  mk('modes', MODES, modeI, i => modeI = i); mk('maps', MAPS, mapI, i => { if (i !== mapI) { mapI = i; loadMap(i); } });
  $('desc').textContent = MODES[modeI].desc + ' — ' + MAPS[mapI].desc;
}
function menuChicken() { clearAll(); menuC = Object.assign(makeChicken(myColor), { vx: 0, vz: 0, vy: 0, size: 1, face: 1, stun: 0 }); menuC.g.position.set(5, 0, 6); }
$('swatches').innerHTML = COLORS.map(c => `<div class="sw ${c === myColor ? 'sel' : ''}" role="button" tabindex="0" style="background:${c}" data-c="${c}"></div>`).join('');
$('swatches').onclick = e => { const c = e.target.dataset.c; if (!c) return; myColor = c; document.querySelectorAll('.sw').forEach(s => s.classList.toggle('sel', s.dataset.c === c)); menuChicken(); };
$('play').onclick = startGame; $('again').onclick = startGame;
$('toMenu').onclick = () => { $('over').classList.add('hidden'); $('menu').classList.remove('hidden'); state = 'menu'; menuChicken(); };
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Space') { e.preventDefault(); if (state === 'play' && player.g.position.y <= .001) player.vy = 11; } if (e.code.startsWith('Arrow')) e.preventDefault(); });
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('mousemove', e => { if (document.pointerLockElement) { yawT -= e.movementX * .0022; pitchT = Math.max(-1.3, Math.min(1.3, pitchT - e.movementY * .0022)); } });
addEventListener('mousedown', e => { if (state !== 'play') return; if (!document.pointerLockElement) $('c').requestPointerLock(); else mouseDown = true; });
addEventListener('mouseup', () => mouseDown = false);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

loadMap(mapI); menuUI(); menuChicken();
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop); const dt = Math.min(.05, (now - last) / 1000), t = now / 1000; last = now;
  if (state === 'play') { update(dt, t); if (state === 'play') fpsCamera(dt, t); }
  else if (state === 'menu' && menuC) { menuC.g.position.set(5, Math.max(0, Math.sin(t * 3) * 1.4), 6); menuC.face = Math.sin(t) * 1.2 + 1; camera.fov = 70; camera.position.set(-6 + Math.sin(t * .2) * 3, 8, 22); camera.lookAt(4, 1.5, 4); }
  animate(t, dt); renderer.render(scene, camera);
}
requestAnimationFrame(loop);
