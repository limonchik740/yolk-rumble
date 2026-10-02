// YOLK RUMBLE - an original chicken arena game. Everything is built from simple Three.js shapes.
const $ = id => document.getElementById(id);
const COLORS = ['#fffdf5', '#ffc933', '#e8456b', '#4aa8ff', '#6bdc6b', '#b46cff'];
const NAMES = ['Sir Pecks', 'Nugget', 'Beaky', 'Omelette', 'Cluckles'];
const ROUNDS = 3, ROUND_TIME = 60, R = 18, MAX_EGGS = 12;

// ---- settings you can tweak ----
const BOT_COUNT = 3, BOT_SKILL = 0.6;   // BOT_SKILL 0 (sleepy) .. 1 (scary)
let gravity = 30;

const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
const scene = new THREE.Scene();
scene.background = new THREE.Color('#7fd6ff');
scene.fog = new THREE.Fog('#7fd6ff', 40, 90);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
scene.add(new THREE.HemisphereLight('#ffffff', '#6aa84f', 0.9));
const sun = new THREE.DirectionalLight('#fff3c4', 0.8); sun.position.set(10, 20, 8); scene.add(sun);

const mat = (c, extra) => new THREE.MeshLambertMaterial(Object.assign({ color: c, flatShading: true }, extra));
function mesh(geo, c, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); if (parent) parent.add(m); return m;
}

// ---- arena: round grass floor, ring wall, colorful bumper posts ----
mesh(new THREE.CylinderGeometry(R, R, 1, 32), '#8be04e', 0, -0.5, 0, scene);
mesh(new THREE.CylinderGeometry(R + 4, R + 4, 0.6, 32), '#5fb85a', 0, -1.1, 0, scene);
for (let i = 0; i < 32; i++) {
  const a = i / 32 * Math.PI * 2;
  mesh(new THREE.BoxGeometry(2, 1.6, 1), i % 2 ? '#e8456b' : '#fff8e6', Math.cos(a) * (R + .4), .4, Math.sin(a) * (R + .4), scene).rotation.y = -a + Math.PI / 2;
}
const posts = [];
for (let i = 0; i < 4; i++) {
  const a = i * Math.PI / 2 + Math.PI / 4;
  const p = mesh(new THREE.CylinderGeometry(1.3, 1.6, 2.4, 8), ['#ffc933', '#4aa8ff', '#b46cff', '#ff8a3d'][i], Math.cos(a) * 8, 1.2, Math.sin(a) * 8, scene);
  posts.push({ x: p.position.x, z: p.position.z, r: 1.7 });
}

// ---- chicken builder ----
function makeChicken(col) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const b = mesh(new THREE.SphereGeometry(.9, 8, 6), col, 0, 1.3, 0, body); b.scale.set(1, .95, 1.15);
  mesh(new THREE.SphereGeometry(.5, 8, 6), col, 0, 2.2, .6, body);
  mesh(new THREE.ConeGeometry(.2, .5, 4), '#ff9a2e', 0, 2.15, 1.2, body).rotation.x = Math.PI / 2;
  mesh(new THREE.BoxGeometry(.18, .35, .4), '#e8456b', 0, 2.8, .55, body);
  mesh(new THREE.SphereGeometry(.09, 6, 4), '#2b1d4a', .27, 2.35, 1.0, body);
  mesh(new THREE.SphereGeometry(.09, 6, 4), '#2b1d4a', -.27, 2.35, 1.0, body);
  mesh(new THREE.ConeGeometry(.35, .8, 4), col, 0, 1.6, -1.1, body).rotation.x = -2;     // tail
  const wings = [-1, 1].map(s => { const w = mesh(new THREE.BoxGeometry(.15, .6, .9), col, s * .95, 1.4, 0, body); w.userData.s = s; return w; });
  const legs = [-1, 1].map(s => mesh(new THREE.CylinderGeometry(.07, .07, .6, 5), '#ff9a2e', s * .35, .3, 0, g));
  // egg blaster: a tiny cannon strapped to the side
  mesh(new THREE.CylinderGeometry(.12, .16, .8, 6), '#2b1d4a', 0, 1.4, 1.0, body).rotation.x = Math.PI / 2;
  scene.add(g);
  return { g, body, wings, legs };
}

// ---- game state ----
let chickens = [], eggs = [], shots = [], player = null;
let state = 'menu', round = 0, timeLeft = 0, eventClock = 0, eventEnd = 0, endFn = null, myColor = COLORS[1];
let totals = [];
const keys = {}, mouse = new THREE.Vector2(), aim = new THREE.Vector3(), ray = new THREE.Raycaster();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let firing = false;

function spawnChicken(name, col, isBot, i) {
  const parts = makeChicken(col), a = i / (BOT_COUNT + 1) * Math.PI * 2;
  const c = Object.assign(parts, { name, col, bot: isBot, vx: 0, vz: 0, vy: 0, size: 1, targetSize: 1, face: 0, stun: 0, cool: 0, score: 0, total: 0, thinkT: 0, speedy: false });
  c.g.position.set(Math.cos(a) * 12, 0, Math.sin(a) * 12);
  chickens.push(c); return c;
}

function spawnEgg() {
  const gold = Math.random() < .15, a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (R - 3);
  const m = mesh(new THREE.SphereGeometry(.4, 8, 6), gold ? '#ffd700' : '#fff8e6', Math.cos(a) * r, .6, Math.sin(a) * r, scene);
  m.scale.y = 1.3; if (gold) { m.material.emissive = new THREE.Color('#aa7700'); m.scale.multiplyScalar(1.3); }
  eggs.push({ m, gold, v: gold ? 5 : 1, t: Math.random() * 6 });
}

function startRound() {
  clearArena();
  chickens = []; eggs = []; shots = [];
  round++;
  const others = COLORS.filter(c => c !== myColor).sort(() => Math.random() - .5);
  player = spawnChicken('You', myColor, false, 0);
  for (let i = 0; i < BOT_COUNT; i++) spawnChicken(NAMES[i], others[i], true, i + 1);
  chickens.forEach((c, i) => c.total = totals[i] || 0);
  timeLeft = ROUND_TIME; eventClock = 8; eventEnd = 0; gravity = 30;
  for (let i = 0; i < 6; i++) spawnEgg();
  $('menu').classList.add('hidden'); $('over').classList.add('hidden'); $('hud').classList.remove('hidden');
  state = 'play'; banner('ROUND ' + round, 1200);
}
function clearArena() {
  chickens.forEach(c => scene.remove(c.g)); eggs.forEach(e => scene.remove(e.m)); shots.forEach(s => scene.remove(s.m));
}

function banner(t, ms) {
  const b = $('banner'); b.textContent = t; b.classList.add('show');
  clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove('show'), ms);
}

// ---- random funny events ----
const EVENTS = [
  { name: 'MEGA CHICKENS!', on() { chickens.forEach(c => c.targetSize = 2); }, off() { chickens.forEach(c => c.targetSize = 1); } },
  { name: 'MOON GRAVITY!', on() { gravity = 8; }, off() { gravity = 30; } },
  { name: 'TURBO CLUCK!', on() { chickens.forEach(c => c.speedy = true); }, off() { chickens.forEach(c => c.speedy = false); } },
  { name: 'EGG RAIN!', on() { for (let i = 0; i < 8; i++) spawnEgg(); }, off() {} },
];
let activeEvent = null;
function triggerEvent() {
  activeEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  activeEvent.on(); eventEnd = 6; banner(activeEvent.name, 1800);
}

// ---- shooting ----
function shoot(c, dx, dz) {
  if (c.cool > 0 || c.stun > 0) return;
  c.cool = .5; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const m = mesh(new THREE.SphereGeometry(.28, 6, 5), '#ff8a3d', c.g.position.x + dx * 1.5 * c.size, 1.5 * c.size, c.g.position.z + dz * 1.5 * c.size, scene);
  shots.push({ m, vx: dx * 26, vz: dz * 26, life: 1.4, owner: c });
  c.face = Math.atan2(dx, dz); c.recoil = .15;
}

// ---- per-frame update ----
function moveChicken(c, dt, ix, iz) {
  const p = c.g.position, grounded = p.y <= 0.001;
  if ((ix || iz) && c.stun <= 0) {
    const l = Math.hypot(ix, iz), sp = 9 * (c.speedy ? 1.5 : 1); ix /= l; iz /= l;
    const k = Math.min(1, dt * (grounded ? 10 : 4));
    c.vx += (ix * sp - c.vx) * k; c.vz += (iz * sp - c.vz) * k; c.face = Math.atan2(ix, iz);
  } else { const f = 1 - Math.min(1, dt * (grounded ? 6 : .5)); c.vx *= f; c.vz *= f; }
  c.vy -= gravity * dt; p.x += c.vx * dt; p.z += c.vz * dt; p.y += c.vy * dt;
  if (p.y <= 0) { if (c.vy < -6) c.squash = .35; p.y = 0; c.vy = 0; }
  const r = Math.hypot(p.x, p.z), lim = R - 1 * c.size;
  if (r > lim) { p.x *= lim / r; p.z *= lim / r; c.vx *= -.4; c.vz *= -.4; }
  posts.forEach(o => {   // bounce off the colored posts
    const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), m = o.r + .8 * c.size;
    if (d < m && p.y < 2.4) { p.x = o.x + dx / d * m; p.z = o.z + dz / d * m; c.vx += dx / d * 4; c.vz += dz / d * 4; }
  });
}
function jump(c) { if (c.g.position.y <= 0.001 && c.stun <= 0) { c.vy = 11 * (gravity < 20 ? 1.3 : 1); c.squash = -.3; } }

function botThink(c, dt) {
  c.thinkT -= dt;
  if (c.thinkT <= 0) {
    c.thinkT = .3 + Math.random() * .4;
    let best = null, bd = 1e9;
    eggs.forEach(e => { const d = Math.hypot(e.m.position.x - c.g.position.x, e.m.position.z - c.g.position.z) / (e.gold ? 3 : 1); if (d < bd) { bd = d; best = e; } });
    c.goal = best ? best.m.position : null;
    c.foe = null; let fd = 12;
    chickens.forEach(o => { if (o !== c) { const d = o.g.position.distanceTo(c.g.position); if (d < fd) { fd = d; c.foe = o; } } });
    if (Math.random() < .12) jump(c);
  }
  let ix = 0, iz = 0;
  if (c.goal) { ix = c.goal.x - c.g.position.x; iz = c.goal.z - c.g.position.z; }
  if (c.foe && Math.random() < BOT_SKILL * dt * 3) shoot(c, c.foe.g.position.x - c.g.position.x, c.foe.g.position.z - c.g.position.z);
  return [ix * BOT_SKILL + (ix ? 0 : 0), iz * BOT_SKILL];
}

function update(dt, t) {
  // player input
  chickens.forEach(c => {
    c.cool -= dt; c.stun -= dt;
    c.size += (c.targetSize - c.size) * Math.min(1, dt * 6); c.g.scale.setScalar(c.size);
    let ix = 0, iz = 0;
    if (c === player) {
      ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
      iz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
      if (firing) shoot(c, aim.x - c.g.position.x, aim.z - c.g.position.z);
    } else [ix, iz] = botThink(c, dt);
    moveChicken(c, dt, ix, iz);
  });
  // bumping
  for (let i = 0; i < chickens.length; i++) for (let j = i + 1; j < chickens.length; j++) {
    const a = chickens[i], b = chickens[j], dx = b.g.position.x - a.g.position.x, dz = b.g.position.z - a.g.position.z;
    const d = Math.hypot(dx, dz) || .01, m = 1.5 * (a.size + b.size) / 2;
    if (d < m && Math.abs(a.g.position.y - b.g.position.y) < 2) {
      const nx = dx / d, nz = dz / d, ma = b.size / (a.size + b.size), mb = a.size / (a.size + b.size);
      a.g.position.x -= nx * (m - d) * ma; a.g.position.z -= nz * (m - d) * ma;
      b.g.position.x += nx * (m - d) * mb; b.g.position.z += nz * (m - d) * mb;
      a.vx -= nx * 8 * ma; a.vz -= nz * 8 * ma; b.vx += nx * 8 * mb; b.vz += nz * 8 * mb;
    }
  }
  // eggs
  for (let i = eggs.length - 1; i >= 0; i--) {
    const e = eggs[i]; e.m.rotation.y += dt * 2; e.m.position.y = .6 + Math.sin(t * 3 + e.t) * .15;
    for (const c of chickens) {
      if (Math.hypot(c.g.position.x - e.m.position.x, c.g.position.z - e.m.position.z) < 1.2 * c.size && c.g.position.y < 1.5 * c.size) {
        c.score += e.v; c.squash = -.25; scene.remove(e.m); eggs.splice(i, 1); break;
      }
    }
  }
  if (eggs.length < MAX_EGGS && Math.random() < dt * 1.2) spawnEgg();
  // shots
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]; s.m.position.x += s.vx * dt; s.m.position.z += s.vz * dt; s.life -= dt;
    let hit = false;
    for (const c of chickens) if (c !== s.owner && Math.hypot(c.g.position.x - s.m.position.x, c.g.position.z - s.m.position.z) < 1.2 * c.size && c.g.position.y < 2.5 * c.size) {
      c.stun = .9; c.vx += s.vx * .5; c.vz += s.vz * .5; c.vy = 6; hit = true;
      const lost = Math.min(2, c.score); c.score -= lost; s.owner.score += 1 + lost;   // splat steals points!
      break;
    }
    if (hit || s.life <= 0) { scene.remove(s.m); shots.splice(i, 1); }
  }
  // events + clock
  if (eventEnd > 0) { eventEnd -= dt; if (eventEnd <= 0 && activeEvent) { activeEvent.off(); activeEvent = null; } }
  else { eventClock -= dt; if (eventClock <= 0) { triggerEvent(); eventClock = 12 + Math.random() * 6; } }
  timeLeft -= dt;
  if (timeLeft <= 0) endRound();
  hud();
}

// ---- funny procedural animation ----
function animate(t, dt) {
  chickens.forEach(c => {
    const sp = Math.hypot(c.vx, c.vz), air = c.g.position.y > .05;
    c.g.rotation.y += Math.atan2(Math.sin(c.face - c.g.rotation.y), Math.cos(c.face - c.g.rotation.y)) * Math.min(1, dt * 14);
    c.squash = (c.squash || 0) * (1 - Math.min(1, dt * 9));
    const bob = air ? 0 : Math.abs(Math.sin(t * 16)) * Math.min(1, sp / 8) * .25;
    c.body.position.y = bob; c.body.scale.set(1 + c.squash * .5, 1 - c.squash, 1 + c.squash * .5);
    c.body.rotation.z = c.stun > 0 ? Math.sin(t * 40) * .35 : Math.sin(t * 16) * .08 * Math.min(1, sp / 8);
    c.body.rotation.x = c.stun > 0 ? .4 : Math.min(.3, sp * .02);
    c.wings.forEach(w => w.rotation.z = w.userData.s * (air || c.stun > 0 ? Math.sin(t * 35) * .9 + .6 : .15));
    c.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 16 + i * Math.PI) * .9 * Math.min(1, sp / 8); });
  });
}

// ---- HUD and rounds ----
function hud() {
  $('info').textContent = `Round ${round}/${ROUNDS}  •  ${Math.max(0, Math.ceil(timeLeft))}s`;
  $('score').innerHTML = [...chickens].sort((a, b) => b.score - a.score).map(c =>
    `<div class="${c === player ? 'me' : ''}"><span>${c.name}</span><span>${c.score}</span></div>`).join('');
}
function endRound() {
  state = 'over'; if (activeEvent) { activeEvent.off(); activeEvent = null; } gravity = 30;
  chickens.forEach((c, i) => { totals[i] = c.total + c.score; });
  const last = round >= ROUNDS, list = chickens.map((c, i) => ({ n: c.name, r: c.score, t: totals[i] })).sort((a, b) => b.t - a.t);
  const youWon = list[0].n === 'You';
  $('overTitle').textContent = last ? (youWon ? '🏆 You win!' : list[0].n + ' wins!') : `Round ${round} done`;
  $('board').innerHTML = list.map((x, i) => `<li class="${i === 0 ? 'win' : ''}"><span>${x.n}</span><span>+${x.r} → ${x.t}</span></li>`).join('');
  $('next').textContent = last ? 'Play again' : 'Next round';
  $('hud').classList.add('hidden'); $('over').classList.remove('hidden');
}

// ---- menu + input wiring ----
$('swatches').innerHTML = COLORS.map(c => `<div class="sw ${c === myColor ? 'sel' : ''}" role="button" tabindex="0" style="background:${c}" data-c="${c}"></div>`).join('');
$('swatches').onclick = e => { const c = e.target.dataset.c; if (!c) return; myColor = c; document.querySelectorAll('.sw').forEach(s => s.classList.toggle('sel', s.dataset.c === c)); menuChicken(); };
$('playSolo').onclick = () => { round = 0; totals = []; startRound(); };
$('next').onclick = () => { if (round >= ROUNDS) { round = 0; totals = []; } startRound(); };
$('toMenu').onclick = () => { $('over').classList.add('hidden'); $('menu').classList.remove('hidden'); state = 'menu'; menuChicken(); };
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); if (state === 'play') jump(player); }
  if (e.code === 'KeyF' && state === 'play') shoot(player, Math.sin(player.face), Math.cos(player.face));
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('mousemove', e => { mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); });
addEventListener('mousedown', e => { if (state === 'play' && e.target.id === 'c') firing = true; });
addEventListener('mouseup', () => firing = false);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// menu backdrop: your chosen chicken struts in the arena
function menuChicken() { clearArena(); chickens = []; eggs = []; shots = []; player = null; const c = spawnChicken('You', myColor, false, 0); c.g.position.set(5, 0, 6); menuC = c; }
let menuC; menuChicken();

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (now - last) / 1000), t = now / 1000; last = now;
  if (state === 'play') {
    ray.setFromCamera(mouse, camera); ray.ray.intersectPlane(ground, aim);
    update(dt, t);
    const p = player.g.position; camera.position.lerp(new THREE.Vector3(p.x * .8, 17 + player.size * 3, p.z * .8 + 15 + player.size * 3), .08); camera.lookAt(p.x * .8, 0, p.z * .8);
  } else if (state === 'menu') {
    menuC.vy = 0; menuC.face = Math.sin(t) * 1.2 + 1; menuC.vx = 5; menuC.g.position.y = Math.max(0, Math.sin(t * 3) * 1.2);
    menuC.g.position.set(5, Math.max(0, Math.sin(t * 3) * 1.4), 6); menuC.vx = 0; menuC.vz = 0;
    camera.position.set(-6 + Math.sin(t * .2) * 3, 8, 22); camera.lookAt(4, 1.5, 4);
  }
  animate(t, dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
