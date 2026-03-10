// Trash Adventure - Epic trash collecting adventure game
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// --- Constants ---
const TILE = 32;
const COLS = 20;
const ROWS = 15;
const W = COLS * TILE;
const H = ROWS * TILE;
canvas.width = W;
canvas.height = H;

// --- Game State ---
const STATE = { TITLE: 0, PLAY: 1, ZONE_TRANS: 2, DIALOG: 3, GAMEOVER: 4, WIN: 5 };
let state = STATE.TITLE;
let titleBlink = 0;

// Player
const player = { x: 3, y: 7, dir: 0, frame: 0, animTimer: 0, hp: 5, maxHp: 5, trash: 0, score: 0, speed: 1, inv: [] };
let moveTimer = 0;
const MOVE_DELAY = 120; // ms between moves

// Zones
let currentZone = 0;
let zones = [];
let particles = [];
let dialogText = '';
let dialogCallback = null;
let shakeTimer = 0;
let transTimer = 0;
let flashAlpha = 0;

// Input
const keys = {};
let touchDir = null;
let actionPressed = false;

// --- Zone Definitions ---
function buildZones() {
  zones = [
    makeZone('The Park', 'park', [
      'TTTTTTTTTTTTTTTTTTTT',
      'T..................T',
      'T..TTT.............T',
      'T..T...............T',
      'T..................T',
      'T......WWW.........T',
      'T......W.W.........T',
      'T......WWW.........T',
      'T..................T',
      'T.........TT.......T',
      'T..............TT..T',
      'T..................T',
      'T..................T',
      'T..................T',
      'TTTTTTTTT>>TTTTTTTTT',
    ], { trash: 8, npcs: [{ x: 6, y: 7, name: 'Ranger Rick', msg: 'This park is filthy! Collect all the trash to unlock the next area.' }], enemies: 2 }),
    makeZone('The Beach', 'beach', [
      'TTTTTTTTT<<TTTTTTTTT',
      'T..................T',
      'T....~~............T',
      'T...~~~~...........T',
      'T..~~~~~~..........T',
      'T..~~~~~~..........T',
      'T...~~~~...........T',
      'T....~~............T',
      'T..................T',
      'T..................T',
      'T..................T',
      'T..................T',
      'T..................T',
      'T..................T',
      'TTTTTTTTT>>TTTTTTTTT',
    ], { trash: 10, npcs: [{ x: 12, y: 5, name: 'Beach Bev', msg: 'The tide washed in so much garbage! Please help clean the shore.' }], enemies: 3 }),
    makeZone('The City', 'city', [
      'TTTTTTTTT<<TTTTTTTTT',
      'T..................T',
      'T..BBBB....BBBB...T',
      'T..BBBB....BBBB...T',
      'T..................T',
      'T..................T',
      'T...BBBB...........T',
      'T...BBBB...BBB....T',
      'T..........BBB....T',
      'T..................T',
      'T..................T',
      'T..BBB.............T',
      'T..BBB.............T',
      'T..................T',
      'TTTTTTTTT>>TTTTTTTTT',
    ], { trash: 12, npcs: [{ x: 10, y: 5, name: 'Mayor Mo', msg: 'Our city streets are covered in litter. You are our only hope!' }], enemies: 4 }),
    makeZone('The Forest', 'forest', [
      'TTTTTTTTT<<TTTTTTTTT',
      'T.T....T.....T....T',
      'T...T........T..T.T',
      'T......T.....T....T',
      'T.T..........T....T',
      'T......T..........T',
      'T..T.......T......T',
      'T........T........T',
      'T...T.............T',
      'T..........T..T...T',
      'T.T...T...........T',
      'T...........T.....T',
      'T....T............T',
      'T.........T.......T',
      'TTTTTTTTT>>TTTTTTTTT',
    ], { trash: 15, npcs: [{ x: 8, y: 7, name: 'Old Oak', msg: 'The ancient forest weeps. Rid us of this pollution, brave one.' }], enemies: 5 }),
    makeZone('The Dump', 'dump', [
      'TTTTTTTTT<<TTTTTTTTT',
      'T..................T',
      'T..................T',
      'T..................T',
      'T..................T',
      'T..................T',
      'T..................T',
      'T.........X........T',
      'T..................T',
      'T..................T',
      'T..................T',
      'T..................T',
      'T..................T',
      'T..................T',
      'TTTTTTTTTTTTTTTTTTTT',
    ], { trash: 20, npcs: [], enemies: 6, boss: true }),
  ];
}

function makeZone(name, theme, layout, opts) {
  const tiles = [];
  const exits = [];
  for (let r = 0; r < ROWS; r++) {
    tiles[r] = [];
    for (let c = 0; c < COLS; c++) {
      const ch = layout[r][c];
      tiles[r][c] = ch;
      if (ch === '>' || ch === '<') exits.push({ x: c, y: r, dir: ch });
    }
  }
  // Place trash randomly on empty tiles
  const trashItems = [];
  const types = ['can', 'bottle', 'bag', 'wrapper', 'tire'];
  for (let i = 0; i < opts.trash; i++) {
    let px, py;
    do { px = 2 + Math.floor(Math.random() * (COLS - 4)); py = 2 + Math.floor(Math.random() * (ROWS - 4)); }
    while (tiles[py][px] !== '.' || trashItems.some(t => t.x === px && t.y === py));
    trashItems.push({ x: px, y: py, type: types[Math.floor(Math.random() * types.length)], collected: false });
  }
  // Place enemies
  const enemies = [];
  for (let i = 0; i < opts.enemies; i++) {
    let ex, ey;
    do { ex = 2 + Math.floor(Math.random() * (COLS - 4)); ey = 2 + Math.floor(Math.random() * (ROWS - 4)); }
    while (tiles[ey][ex] !== '.' || trashItems.some(t => t.x === ex && t.y === ey) || enemies.some(e => e.x === ex && e.y === ey));
    enemies.push({ x: ex, y: ey, hp: opts.boss && i === 0 ? 8 : 2, type: opts.boss && i === 0 ? 'boss' : 'rat', moveTimer: 0, dir: 0, stunTimer: 0 });
  }
  // Boss in the dump
  if (opts.boss) {
    enemies[0] = { x: 10, y: 7, hp: 10, type: 'boss', moveTimer: 0, dir: 0, stunTimer: 0 };
  }
  return { name, theme, tiles, exits, trash: trashItems, npcs: opts.npcs || [], enemies, cleared: false, totalTrash: opts.trash };
}

function isSolid(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const ch = zones[currentZone].tiles[ty][tx];
  return ch === 'T' || ch === 'B' || ch === '~' || ch === 'W';
}

// --- Input ---
window.addEventListener('keydown', e => { keys[e.key] = true; if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.key] = false; });

// Mobile controls
document.querySelectorAll('.dpad button').forEach(btn => {
  const handler = (e) => { e.preventDefault(); touchDir = btn.dataset.dir; };
  btn.addEventListener('touchstart', handler);
  btn.addEventListener('mousedown', handler);
});
document.addEventListener('touchend', () => { touchDir = null; });
document.addEventListener('mouseup', () => { touchDir = null; });
const actionBtn = document.getElementById('actionBtn');
actionBtn.addEventListener('touchstart', e => { e.preventDefault(); actionPressed = true; });
actionBtn.addEventListener('mousedown', e => { e.preventDefault(); actionPressed = true; });
actionBtn.addEventListener('touchend', () => { actionPressed = false; });
actionBtn.addEventListener('mouseup', () => { actionPressed = false; });

function getDir() {
  if (keys['ArrowUp'] || keys['w'] || touchDir === 'up') return { dx: 0, dy: -1, d: 0 };
  if (keys['ArrowDown'] || keys['s'] || touchDir === 'down') return { dx: 0, dy: 1, d: 2 };
  if (keys['ArrowLeft'] || keys['a'] || touchDir === 'left') return { dx: -1, dy: 0, d: 3 };
  if (keys['ArrowRight'] || keys['d'] || touchDir === 'right') return { dx: 1, dy: 0, d: 1 };
  return null;
}

// --- Particles ---
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 30 + Math.random() * 20, color, size: 2 + Math.random() * 3 });
  }
}

// --- Update ---
let lastTime = 0;
function update(dt) {
  if (state === STATE.TITLE) {
    titleBlink += dt;
    if (keys[' '] || keys['Enter'] || actionPressed) {
      state = STATE.PLAY;
      actionPressed = false;
      buildZones();
      player.x = 3; player.y = 7; player.hp = 5; player.trash = 0; player.score = 0;
      currentZone = 0;
    }
    return;
  }
  if (state === STATE.GAMEOVER || state === STATE.WIN) {
    titleBlink += dt;
    if (keys[' '] || keys['Enter'] || actionPressed) { state = STATE.TITLE; actionPressed = false; }
    return;
  }
  if (state === STATE.DIALOG) {
    if (keys[' '] || keys['Enter'] || actionPressed) {
      state = STATE.PLAY;
      actionPressed = false;
      if (dialogCallback) { dialogCallback(); dialogCallback = null; }
    }
    return;
  }
  if (state === STATE.ZONE_TRANS) {
    transTimer -= dt;
    if (transTimer <= 0) { state = STATE.PLAY; flashAlpha = 0; }
    else flashAlpha = transTimer / 500;
    return;
  }

  const zone = zones[currentZone];

  // Player movement
  moveTimer -= dt;
  const dir = getDir();
  if (dir && moveTimer <= 0) {
    player.dir = dir.d;
    const nx = player.x + dir.dx;
    const ny = player.y + dir.dy;
    if (!isSolid(nx, ny)) {
      player.x = nx;
      player.y = ny;
      player.animTimer += dt;
      player.frame = (player.frame + 1) % 4;
      moveTimer = MOVE_DELAY;
    }
  }

  // Check exits
  for (const exit of zone.exits) {
    if (player.x === exit.x && player.y === exit.y) {
      if (exit.dir === '>' && zone.cleared) {
        currentZone++;
        if (currentZone >= zones.length) { state = STATE.WIN; return; }
        player.x = zones[currentZone].exits.find(e => e.dir === '<').x;
        player.y = zones[currentZone].exits.find(e => e.dir === '<').y - 1;
        state = STATE.ZONE_TRANS; transTimer = 500;
        showDialog('Entering: ' + zones[currentZone].name);
      } else if (exit.dir === '<' && currentZone > 0) {
        currentZone--;
        player.x = zones[currentZone].exits.find(e => e.dir === '>').x;
        player.y = zones[currentZone].exits.find(e => e.dir === '>').y - 1;
        state = STATE.ZONE_TRANS; transTimer = 500;
      } else if (exit.dir === '>' && !zone.cleared) {
        player.y = exit.y - 1;
        showDialog('Collect all trash to unlock this exit! (' + zone.trash.filter(t => t.collected).length + '/' + zone.totalTrash + ')');
      }
    }
  }

  // Collect trash
  for (const t of zone.trash) {
    if (!t.collected && player.x === t.x && player.y === t.y) {
      t.collected = true;
      player.trash++;
      player.score += 10;
      spawnParticles(t.x, t.y, '#50d278', 8);
      // Check zone clear
      if (zone.trash.every(t2 => t2.collected)) {
        zone.cleared = true;
        spawnParticles(player.x, player.y, '#ffd700', 20);
        if (currentZone === zones.length - 1) {
          // Check boss dead too
          if (zone.enemies.every(e => e.hp <= 0)) { state = STATE.WIN; return; }
        }
      }
    }
  }

  // NPC interaction
  for (const npc of zone.npcs) {
    if (Math.abs(player.x - npc.x) <= 1 && Math.abs(player.y - npc.y) <= 1) {
      if (keys[' '] || actionPressed) {
        showDialog(npc.name + ': "' + npc.msg + '"');
        actionPressed = false;
      }
    }
  }

  // Action: throw trash at enemies
  if (keys[' '] || actionPressed) {
    actionPressed = false;
    if (player.trash > 0) {
      const dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
      const d = dirs[player.dir];
      for (const enemy of zone.enemies) {
        if (enemy.hp > 0 && Math.abs(enemy.x - (player.x + d.dx * 2)) <= 1 && Math.abs(enemy.y - (player.y + d.dy * 2)) <= 1) {
          enemy.hp--;
          enemy.stunTimer = 500;
          player.trash--;
          player.score += 25;
          spawnParticles(enemy.x, enemy.y, '#ff4444', 6);
          shakeTimer = 100;
          if (enemy.hp <= 0) {
            spawnParticles(enemy.x, enemy.y, '#ffd700', 15);
            player.score += 100;
            if (enemy.type === 'boss') {
              zone.cleared = true;
              showDialog('You defeated the Trash King! The dump is saved!');
            }
          }
          break;
        }
      }
    }
  }

  // Enemy AI
  for (const enemy of zone.enemies) {
    if (enemy.hp <= 0) continue;
    if (enemy.stunTimer > 0) { enemy.stunTimer -= dt; continue; }
    enemy.moveTimer -= dt;
    const spd = enemy.type === 'boss' ? 400 : 600;
    if (enemy.moveTimer <= 0) {
      enemy.moveTimer = spd + Math.random() * 300;
      // Move toward player
      const ddx = player.x - enemy.x;
      const ddy = player.y - enemy.y;
      let mx = 0, my = 0;
      if (Math.abs(ddx) > Math.abs(ddy)) mx = ddx > 0 ? 1 : -1;
      else my = ddy > 0 ? 1 : -1;
      if (Math.random() < 0.3) { mx = Math.floor(Math.random() * 3) - 1; my = Math.floor(Math.random() * 3) - 1; }
      const enx = enemy.x + mx;
      const eny = enemy.y + my;
      if (!isSolid(enx, eny)) { enemy.x = enx; enemy.y = eny; }
    }
    // Hit player
    if (enemy.x === player.x && enemy.y === player.y) {
      player.hp--;
      shakeTimer = 150;
      spawnParticles(player.x, player.y, '#ff4444', 10);
      // Knock player back
      const dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
      const kd = dirs[Math.floor(Math.random() * 4)];
      if (!isSolid(player.x + kd.dx, player.y + kd.dy)) { player.x += kd.dx; player.y += kd.dy; }
      if (player.hp <= 0) { state = STATE.GAMEOVER; }
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.life--;
    p.vy += 0.1;
    if (p.life <= 0) particles.splice(i, 1);
  }

  if (shakeTimer > 0) shakeTimer -= dt;
}

function showDialog(text, cb) {
  dialogText = text;
  dialogCallback = cb || null;
  state = STATE.DIALOG;
}

// --- Drawing ---
const COLORS = {
  park: { ground: '#2d5a1e', wall: '#1a3a10', accent: '#3d7a2e' },
  beach: { ground: '#c2a645', wall: '#8a7530', accent: '#4488cc' },
  city: { ground: '#444455', wall: '#333340', accent: '#666677' },
  forest: { ground: '#1e4a15', wall: '#0d2a08', accent: '#2d6a22' },
  dump: { ground: '#3a3520', wall: '#2a2515', accent: '#5a4a30' },
};
const TRASH_COLORS = { can: '#aaaacc', bottle: '#44aa44', bag: '#dddddd', wrapper: '#dd8833', tire: '#333333' };

function draw() {
  ctx.fillStyle = '#16161e';
  ctx.fillRect(0, 0, W, H);

  if (state === STATE.TITLE) { drawTitle(); return; }
  if (state === STATE.GAMEOVER) { drawGameOver(); return; }
  if (state === STATE.WIN) { drawWin(); return; }

  const zone = zones[currentZone];
  const theme = COLORS[zone.theme];

  ctx.save();
  if (shakeTimer > 0) ctx.translate(Math.random() * 4 - 2, Math.random() * 4 - 2);

  // Draw tiles
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = zone.tiles[r][c];
      const x = c * TILE, y = r * TILE;
      if (ch === 'T') { drawTree(x, y, theme); }
      else if (ch === 'B') { drawBuilding(x, y); }
      else if (ch === 'W') { drawWater(x, y); }
      else if (ch === '~') { drawWater(x, y); }
      else if (ch === '>' || ch === '<') { drawExit(x, y, ch, zone.cleared); }
      else { ctx.fillStyle = theme.ground; ctx.fillRect(x, y, TILE, TILE); drawGrassDetail(x, y, theme); }
    }
  }

  // Draw trash items
  for (const t of zone.trash) {
    if (!t.collected) drawTrashItem(t);
  }

  // Draw NPCs
  for (const npc of zone.npcs) drawNPC(npc);

  // Draw enemies
  for (const enemy of zone.enemies) {
    if (enemy.hp > 0) drawEnemy(enemy);
  }

  // Draw player
  drawPlayer();

  // Draw particles
  for (const p of particles) {
    ctx.globalAlpha = p.life / 50;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // HUD
  drawHUD(zone);

  // Dialog
  if (state === STATE.DIALOG) drawDialog();

  // Zone transition flash
  if (flashAlpha > 0) {
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

function drawTree(x, y, theme) {
  ctx.fillStyle = theme.wall;
  ctx.fillRect(x, y, TILE, TILE);
  // Trunk
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(x + 12, y + 18, 8, 14);
  // Canopy
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.arc(x + 16, y + 14, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a8a3a';
  ctx.beginPath();
  ctx.arc(x + 13, y + 12, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawBuilding(x, y) {
  ctx.fillStyle = '#556677';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#7799aa';
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  // Windows
  ctx.fillStyle = '#aaddff';
  ctx.fillRect(x + 6, y + 6, 8, 8);
  ctx.fillRect(x + 18, y + 6, 8, 8);
  ctx.fillRect(x + 6, y + 18, 8, 8);
  ctx.fillRect(x + 18, y + 18, 8, 8);
}

function drawWater(x, y) {
  const t = Date.now() / 1000;
  ctx.fillStyle = '#2255aa';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#3366bb';
  for (let i = 0; i < 3; i++) {
    const wx = x + 4 + Math.sin(t + i * 2 + y * 0.1) * 6;
    ctx.fillRect(wx, y + 6 + i * 10, 16, 2);
  }
}

function drawExit(x, y, dir, cleared) {
  ctx.fillStyle = cleared ? '#50d278' : '#883333';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = cleared ? '#70f298' : '#aa4444';
  ctx.font = '20px Consolas';
  ctx.textAlign = 'center';
  ctx.fillText(dir === '>' ? '▶' : '◀', x + TILE / 2, y + TILE / 2 + 7);
}

function drawGrassDetail(x, y, theme) {
  const seed = (x * 7 + y * 13) % 5;
  if (seed < 2) {
    ctx.fillStyle = theme.accent;
    ctx.fillRect(x + 8 + seed * 3, y + 12, 2, 6);
    ctx.fillRect(x + 20 + seed * 2, y + 8, 2, 5);
  }
}

function drawTrashItem(t) {
  const x = t.x * TILE, y = t.y * TILE;
  const bob = Math.sin(Date.now() / 300 + t.x + t.y) * 2;
  ctx.fillStyle = TRASH_COLORS[t.type];
  if (t.type === 'can') {
    ctx.fillRect(x + 10, y + 8 + bob, 12, 16);
    ctx.fillStyle = '#888';
    ctx.fillRect(x + 10, y + 8 + bob, 12, 3);
  } else if (t.type === 'bottle') {
    ctx.fillRect(x + 12, y + 6 + bob, 8, 18);
    ctx.fillRect(x + 14, y + 2 + bob, 4, 6);
  } else if (t.type === 'bag') {
    ctx.beginPath(); ctx.arc(x + 16, y + 16 + bob, 8, 0, Math.PI * 2); ctx.fill();
  } else if (t.type === 'wrapper') {
    ctx.fillRect(x + 8, y + 12 + bob, 16, 8);
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(x + 8, y + 14 + bob, 16, 4);
  } else if (t.type === 'tire') {
    ctx.beginPath(); ctx.arc(x + 16, y + 16 + bob, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS[zones[currentZone].theme].ground;
    ctx.beginPath(); ctx.arc(x + 16, y + 16 + bob, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Sparkle
  if (Math.sin(Date.now() / 200 + t.x * 3) > 0.7) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 14, y + 4 + bob, 3, 3);
  }
}

function drawNPC(npc) {
  const x = npc.x * TILE, y = npc.y * TILE;
  // Body
  ctx.fillStyle = '#4488ff';
  ctx.fillRect(x + 8, y + 12, 16, 16);
  // Head
  ctx.fillStyle = '#ffcc88';
  ctx.beginPath(); ctx.arc(x + 16, y + 10, 8, 0, Math.PI * 2); ctx.fill();
  // Exclamation mark
  const bob = Math.sin(Date.now() / 400) * 2;
  ctx.fillStyle = '#ffdd00';
  ctx.font = 'bold 16px Consolas';
  ctx.textAlign = 'center';
  ctx.fillText('!', x + 16, y - 2 + bob);
}

function drawEnemy(enemy) {
  const x = enemy.x * TILE, y = enemy.y * TILE;
  if (enemy.stunTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) return; // Flash when stunned

  if (enemy.type === 'boss') {
    // Trash King - bigger, meaner
    ctx.fillStyle = '#664422';
    ctx.fillRect(x + 2, y + 8, 28, 22);
    ctx.fillStyle = '#885533';
    ctx.fillRect(x + 6, y + 4, 20, 12);
    // Crown
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x + 8, y, 16, 6);
    ctx.fillRect(x + 6, y - 4, 4, 8);
    ctx.fillRect(x + 14, y - 6, 4, 10);
    ctx.fillRect(x + 22, y - 4, 4, 8);
    // Eyes
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x + 10, y + 10, 4, 4);
    ctx.fillRect(x + 18, y + 10, 4, 4);
    // HP bar
    ctx.fillStyle = '#333';
    ctx.fillRect(x - 4, y - 10, 40, 4);
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(x - 4, y - 10, 40 * (enemy.hp / 10), 4);
  } else {
    // Rat/pest
    ctx.fillStyle = '#887766';
    ctx.fillRect(x + 8, y + 12, 16, 12);
    ctx.fillStyle = '#aa9988';
    ctx.beginPath(); ctx.arc(x + 16, y + 12, 7, 0, Math.PI * 2); ctx.fill();
    // Ears
    ctx.fillStyle = '#cc9999';
    ctx.beginPath(); ctx.arc(x + 10, y + 6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 22, y + 6, 4, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(x + 12, y + 10, 3, 3);
    ctx.fillRect(x + 18, y + 10, 3, 3);
    // Tail
    ctx.strokeStyle = '#887766';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 24, y + 20);
    ctx.quadraticCurveTo(x + 30, y + 16, x + 28, y + 24);
    ctx.stroke();
  }
}

function drawPlayer() {
  const x = player.x * TILE, y = player.y * TILE;
  const bob = Math.sin(Date.now() / 200) * 1;
  // Body
  ctx.fillStyle = '#50d278';
  ctx.fillRect(x + 8, y + 14 + bob, 16, 14);
  // Head
  ctx.fillStyle = '#ffcc88';
  ctx.beginPath(); ctx.arc(x + 16, y + 10 + bob, 8, 0, Math.PI * 2); ctx.fill();
  // Eyes based on direction
  ctx.fillStyle = '#222';
  const eyeOffsets = [
    [{ x: 12, y: 7 }, { x: 18, y: 7 }],   // up
    [{ x: 16, y: 8 }, { x: 16, y: 14 }],   // right
    [{ x: 12, y: 13 }, { x: 18, y: 13 }],  // down
    [{ x: 10, y: 8 }, { x: 10, y: 14 }],   // left
  ];
  const eyes = eyeOffsets[player.dir];
  ctx.fillRect(x + eyes[0].x, y + eyes[0].y + bob, 3, 3);
  ctx.fillRect(x + eyes[1].x, y + eyes[1].y + bob, 3, 3);
  // Backpack
  ctx.fillStyle = '#338855';
  ctx.fillRect(x + 4, y + 16 + bob, 6, 10);
  // Walking animation - legs
  if (player.frame % 2 === 0) {
    ctx.fillStyle = '#2266aa';
    ctx.fillRect(x + 10, y + 26 + bob, 5, 6);
    ctx.fillRect(x + 18, y + 28 + bob, 5, 4);
  } else {
    ctx.fillStyle = '#2266aa';
    ctx.fillRect(x + 10, y + 28 + bob, 5, 4);
    ctx.fillRect(x + 18, y + 26 + bob, 5, 6);
  }
}

function drawHUD(zone) {
  // Background bar
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, 28);
  ctx.font = '12px Consolas';
  ctx.textAlign = 'left';
  // Zone name
  ctx.fillStyle = '#50d278';
  ctx.fillText(zone.name, 8, 18);
  // HP
  ctx.fillStyle = '#ff4444';
  for (let i = 0; i < player.maxHp; i++) {
    ctx.fillText(i < player.hp ? '♥' : '♡', 130 + i * 16, 18);
  }
  // Trash count
  ctx.fillStyle = '#dddddd';
  ctx.fillText('Trash: ' + player.trash, 240, 18);
  // Score
  ctx.fillStyle = '#ffd700';
  ctx.fillText('Score: ' + player.score, 340, 18);
  // Zone progress
  const collected = zone.trash.filter(t => t.collected).length;
  ctx.fillStyle = zone.cleared ? '#50d278' : '#aaaaaa';
  ctx.fillText(collected + '/' + zone.totalTrash + (zone.cleared ? ' ✓' : ''), 480, 18);
  // Zone indicator
  ctx.fillStyle = '#888';
  ctx.fillText('Zone ' + (currentZone + 1) + '/5', 560, 18);
}

function drawDialog() {
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(20, H - 100, W - 40, 80);
  ctx.strokeStyle = '#50d278';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, H - 100, W - 40, 80);
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Consolas';
  ctx.textAlign = 'left';
  // Word wrap
  const words = dialogText.split(' ');
  let line = '', ly = H - 78;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > W - 80) {
      ctx.fillText(line, 36, ly);
      line = word + ' ';
      ly += 18;
    } else line = test;
  }
  ctx.fillText(line, 36, ly);
  // Continue prompt
  ctx.fillStyle = '#50d278';
  ctx.font = '11px Consolas';
  ctx.textAlign = 'right';
  const blink = Math.sin(Date.now() / 300) > 0 ? '▶' : '';
  ctx.fillText('Press SPACE to continue ' + blink, W - 36, H - 28);
}

function drawTitle() {
  ctx.fillStyle = '#16161e';
  ctx.fillRect(0, 0, W, H);
  // Title
  ctx.fillStyle = '#50d278';
  ctx.font = 'bold 36px Consolas';
  ctx.textAlign = 'center';
  ctx.fillText('TRASH ADVENTURE', W / 2, 120);
  // Subtitle
  ctx.fillStyle = '#888';
  ctx.font = '16px Consolas';
  ctx.fillText('An Epic Journey to Save the Earth', W / 2, 155);
  // Animated trash falling
  const t = Date.now() / 1000;
  ctx.fillStyle = '#50d278';
  for (let i = 0; i < 8; i++) {
    const tx = 80 + i * 70 + Math.sin(t + i) * 20;
    const ty = 200 + ((t * 40 + i * 60) % 200);
    ctx.font = '20px Consolas';
    ctx.fillText(['🥫', '🍾', '📦', '🛞'][i % 4], tx, ty);
  }
  // Instructions
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '13px Consolas';
  ctx.fillText('Arrow Keys / WASD to move', W / 2, 310);
  ctx.fillText('SPACE to interact & throw trash at enemies', W / 2, 330);
  ctx.fillText('Collect trash → Throw at enemies → Clear zones!', W / 2, 350);
  // Start prompt
  if (Math.sin(titleBlink / 300) > 0) {
    ctx.fillStyle = '#50d278';
    ctx.font = 'bold 18px Consolas';
    ctx.fillText('Press SPACE to Start', W / 2, 420);
  }
}

function drawGameOver() {
  ctx.fillStyle = '#16161e';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 36px Consolas';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', W / 2, 180);
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '16px Consolas';
  ctx.fillText('Score: ' + player.score, W / 2, 230);
  ctx.fillText('Trash Collected: ' + player.trash, W / 2, 260);
  if (Math.sin(titleBlink / 300) > 0) {
    ctx.fillStyle = '#50d278';
    ctx.font = '18px Consolas';
    ctx.fillText('Press SPACE to Retry', W / 2, 340);
  }
}

function drawWin() {
  ctx.fillStyle = '#16161e';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 32px Consolas';
  ctx.textAlign = 'center';
  ctx.fillText('YOU SAVED THE EARTH!', W / 2, 140);
  ctx.fillStyle = '#50d278';
  ctx.font = '18px Consolas';
  ctx.fillText('All zones cleared!', W / 2, 180);
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '16px Consolas';
  ctx.fillText('Final Score: ' + player.score, W / 2, 230);
  ctx.fillText('Total Trash Collected: ' + player.trash, W / 2, 260);
  // Stars rating
  const stars = player.score > 2000 ? 3 : player.score > 1000 ? 2 : 1;
  ctx.fillStyle = '#ffd700';
  ctx.font = '30px Consolas';
  ctx.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), W / 2, 310);
  if (Math.sin(titleBlink / 300) > 0) {
    ctx.fillStyle = '#50d278';
    ctx.font = '18px Consolas';
    ctx.fillText('Press SPACE to Play Again', W / 2, 380);
  }
}

// --- Game Loop ---
function gameLoop(time) {
  const dt = lastTime ? time - lastTime : 16;
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

// --- Scaling ---
function resize() {
  const maxW = window.innerWidth * 0.95;
  const maxH = window.innerHeight * 0.9;
  const scale = Math.min(maxW / W, maxH / H, 2);
  canvas.style.width = (W * scale) + 'px';
  canvas.style.height = (H * scale) + 'px';
}
window.addEventListener('resize', resize);
resize();

requestAnimationFrame(gameLoop);
