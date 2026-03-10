// Trash Adventure - Core game logic
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const TILE = 32, COLS = 20, ROWS = 15;
const W = COLS * TILE, H = ROWS * TILE;
canvas.width = W; canvas.height = H;

// Game states
const STATE = { TITLE: 0, PLAY: 1, ZONE_TRANS: 2, DIALOG: 3, GAMEOVER: 4, WIN: 5 };
let state = STATE.TITLE, titleBlink = 0;

// Player
const player = { x: 3, y: 7, dir: 2, frame: 0, hp: 5, maxHp: 5, trash: 0, score: 0 };
let moveTimer = 0;
const MOVE_DELAY = 120;

// World
let currentZone = 0, zones = [];
let particles = [], projectiles = [], pickups = [];
let dialogText = '', dialogCallback = null;
let shakeTimer = 0, transTimer = 0, flashAlpha = 0;
let dmgCooldown = 0; // invincibility after hit
let comboCount = 0, comboTimer = 0; // combo system
let floatingTexts = []; // damage/score popups

// Audio - simple synth beeps
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(freq, dur, type, vol) {
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.value = vol || 0.1;
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}
function sfxCollect() { playSound(880, 0.1, 'square', 0.08); playSound(1100, 0.15, 'square', 0.06); }
function sfxHit() { playSound(200, 0.2, 'sawtooth', 0.1); }
function sfxDamage() { playSound(120, 0.3, 'sawtooth', 0.12); }
function sfxClear() { playSound(660, 0.1); playSound(880, 0.15); playSound(1100, 0.2); }
function sfxBoss() { playSound(440, 0.3); playSound(660, 0.3); playSound(880, 0.4); }

// Input
const keys = {};
let touchDir = null, actionPressed = false;
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  if (audioCtx.state === 'suspended') audioCtx.resume();
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

document.querySelectorAll('.dpad button').forEach(btn => {
  const h = e => { e.preventDefault(); touchDir = btn.dataset.dir; if (audioCtx.state === 'suspended') audioCtx.resume(); };
  btn.addEventListener('touchstart', h); btn.addEventListener('mousedown', h);
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

function isSolid(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const ch = zones[currentZone].tiles[ty][tx];
  return ch === 'T' || ch === 'B' || ch === '~' || ch === 'W';
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x * TILE + TILE / 2, y: y * TILE + TILE / 2,
      vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
      life: 30 + Math.random() * 20, color, size: 2 + Math.random() * 3
    });
  }
}

function spawnFloatingText(x, y, text, color) {
  floatingTexts.push({ x: x * TILE + TILE / 2, y: y * TILE, text, color, life: 40 });
}

function spawnPickup(x, y, type) {
  pickups.push({ x, y, type, life: 600 }); // 10 second lifetime
}

function showDialog(text, cb) {
  dialogText = text; dialogCallback = cb || null; state = STATE.DIALOG;
}

function tryAction() {
  if (actionPressed) actionPressed = false;
  return true;
}

// --- Update ---
let lastTime = 0;
function update(dt) {
  if (state === STATE.TITLE) {
    titleBlink += dt;
    if (keys[' '] || keys['Enter'] || actionPressed) {
      tryAction(); state = STATE.PLAY;
      zones = buildAllZones();
      player.x = 3; player.y = 7; player.hp = 5; player.trash = 0; player.score = 0;
      currentZone = 0; dmgCooldown = 0; comboCount = 0; comboTimer = 0;
      particles = []; projectiles = []; pickups = []; floatingTexts = [];
    }
    return;
  }
  if (state === STATE.GAMEOVER || state === STATE.WIN) {
    titleBlink += dt;
    if (keys[' '] || keys['Enter'] || actionPressed) { tryAction(); state = STATE.TITLE; }
    return;
  }
  if (state === STATE.DIALOG) {
    if (keys[' '] || keys['Enter'] || actionPressed) {
      tryAction(); state = STATE.PLAY;
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
  if (dmgCooldown > 0) dmgCooldown -= dt;

  // Player movement
  moveTimer -= dt;
  const dir = getDir();
  if (dir && moveTimer <= 0) {
    player.dir = dir.d;
    const nx = player.x + dir.dx, ny = player.y + dir.dy;
    if (!isSolid(nx, ny)) {
      player.x = nx; player.y = ny;
      player.frame = (player.frame + 1) % 4;
      moveTimer = MOVE_DELAY;
    }
  }

  // Check exits
  for (const exit of zone.exits) {
    if (player.x !== exit.x || player.y !== exit.y) continue;
    if (exit.dir === '>' && zone.cleared) {
      currentZone++;
      if (currentZone >= zones.length) { state = STATE.WIN; sfxClear(); return; }
      const entry = zones[currentZone].exits.find(e => e.dir === '<');
      player.x = entry.x; player.y = entry.y - 1;
      state = STATE.ZONE_TRANS; transTimer = 500;
      showDialog('Entering: ' + zones[currentZone].name);
    } else if (exit.dir === '<' && currentZone > 0) {
      currentZone--;
      const entry = zones[currentZone].exits.find(e => e.dir === '>');
      player.x = entry.x; player.y = entry.y - 1;
      state = STATE.ZONE_TRANS; transTimer = 500;
    } else if (exit.dir === '>' && !zone.cleared) {
      player.y = exit.y - 1;
      const cnt = zone.trash.filter(t => t.collected).length;
      showDialog('Collect all trash to proceed! (' + cnt + '/' + zone.totalTrash + ')');
    }
  }

  // Collect trash
  for (const t of zone.trash) {
    if (!t.collected && player.x === t.x && player.y === t.y) {
      t.collected = true;
      player.trash++;
      comboCount++; comboTimer = 2000;
      const pts = 10 * Math.min(comboCount, 5);
      player.score += pts;
      spawnParticles(t.x, t.y, '#50d278', 8);
      spawnFloatingText(t.x, t.y, '+' + pts + (comboCount > 1 ? ' x' + comboCount : ''), '#50d278');
      sfxCollect();
      if (zone.trash.every(t2 => t2.collected)) {
        zone.cleared = true;
        spawnParticles(player.x, player.y, '#ffd700', 20);
        sfxClear();
        showDialog(zone.name + ' cleared! All trash collected!');
        if (currentZone === zones.length - 1 && zone.enemies.every(e => e.hp <= 0)) {
          state = STATE.WIN; return;
        }
      }
    }
  }

  // Collect pickups
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pk = pickups[i];
    pk.life--;
    if (pk.life <= 0) { pickups.splice(i, 1); continue; }
    if (player.x === pk.x && player.y === pk.y) {
      if (pk.type === 'heart' && player.hp < player.maxHp) {
        player.hp++; spawnFloatingText(pk.x, pk.y, '+HP', '#ff4444');
        playSound(660, 0.15, 'sine', 0.08);
      } else if (pk.type === 'star') {
        player.score += 50; spawnFloatingText(pk.x, pk.y, '+50', '#ffd700');
        playSound(880, 0.1, 'sine', 0.08);
      }
      spawnParticles(pk.x, pk.y, pk.type === 'heart' ? '#ff4444' : '#ffd700', 6);
      pickups.splice(i, 1);
    }
  }

  // NPC interaction
  if (keys[' '] || actionPressed) {
    for (const npc of zone.npcs) {
      if (Math.abs(player.x - npc.x) <= 1 && Math.abs(player.y - npc.y) <= 1) {
        showDialog(npc.name + ': "' + npc.msg + '"');
        tryAction();
        return;
      }
    }
  }

  // Attack: throw trash at enemies
  if (keys[' '] || actionPressed) {
    tryAction();
    if (player.trash > 0) {
      const dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
      const d = dirs[player.dir];
      // Spawn projectile
      projectiles.push({ x: player.x * TILE + TILE / 2, y: player.y * TILE + TILE / 2, vx: d.dx * 6, vy: d.dy * 6, life: 20 });
      player.trash--;
      let hitAny = false;
      for (const enemy of zone.enemies) {
        if (enemy.hp <= 0) continue;
        const dist = Math.abs(enemy.x - (player.x + d.dx * 2)) + Math.abs(enemy.y - (player.y + d.dy * 2));
        if (dist <= 2) {
          enemy.hp--; enemy.stunTimer = 500;
          player.score += 25; hitAny = true;
          spawnParticles(enemy.x, enemy.y, '#ff4444', 6);
          spawnFloatingText(enemy.x, enemy.y, '-1', '#ff4444');
          shakeTimer = 100; sfxHit();
          if (enemy.hp <= 0) {
            spawnParticles(enemy.x, enemy.y, '#ffd700', 15);
            player.score += 100;
            spawnFloatingText(enemy.x, enemy.y, '+100', '#ffd700');
            // Drop pickup
            if (Math.random() < 0.5) spawnPickup(enemy.x, enemy.y, 'heart');
            else spawnPickup(enemy.x, enemy.y, 'star');
            if (enemy.type === 'boss') {
              zone.cleared = true; sfxBoss();
              showDialog('You defeated the Trash King! The dump is saved!');
            }
          }
          break;
        }
      }
      if (!hitAny) playSound(300, 0.05, 'square', 0.04); // whiff sound
    }
  }

  // Enemy AI
  for (const enemy of zone.enemies) {
    if (enemy.hp <= 0) continue;
    if (enemy.stunTimer > 0) { enemy.stunTimer -= dt; continue; }
    enemy.moveTimer -= dt;
    if (enemy.moveTimer <= 0) {
      enemy.moveTimer = (enemy.type === 'boss' ? 400 : 600) + Math.random() * 300;
      const ddx = player.x - enemy.x, ddy = player.y - enemy.y;
      let mx = 0, my = 0;
      if (Math.random() < 0.3) {
        mx = Math.floor(Math.random() * 3) - 1;
        my = Math.floor(Math.random() * 3) - 1;
      } else if (Math.abs(ddx) > Math.abs(ddy)) {
        mx = ddx > 0 ? 1 : -1;
      } else {
        my = ddy > 0 ? 1 : -1;
      }
      const enx = enemy.x + mx, eny = enemy.y + my;
      if (!isSolid(enx, eny)) { enemy.x = enx; enemy.y = eny; }
    }
    // Collision with player
    if (enemy.x === player.x && enemy.y === player.y && dmgCooldown <= 0) {
      player.hp--; shakeTimer = 150; dmgCooldown = 800;
      spawnParticles(player.x, player.y, '#ff4444', 10);
      sfxDamage();
      const dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
      const kd = dirs[Math.floor(Math.random() * 4)];
      if (!isSolid(player.x + kd.dx, player.y + kd.dy)) {
        player.x += kd.dx; player.y += kd.dy;
      }
      if (player.hp <= 0) state = STATE.GAMEOVER;
    }
  }

  // Combo timer
  if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) comboCount = 0; }

  // Projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) projectiles.splice(i, 1);
  }

  // Floating texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].y -= 1; floatingTexts[i].life--;
    if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
  if (shakeTimer > 0) shakeTimer -= dt;
}

// --- Main draw ---
function draw() {
  ctx.fillStyle = '#16161e';
  ctx.fillRect(0, 0, W, H);
  if (state === STATE.TITLE) { drawTitle(); return; }
  if (state === STATE.GAMEOVER) { drawGameOver(); return; }
  if (state === STATE.WIN) { drawWin(); return; }

  const zone = zones[currentZone];
  const theme = THEME_COLORS[zone.theme];

  ctx.save();
  if (shakeTimer > 0) ctx.translate(Math.random() * 4 - 2, Math.random() * 4 - 2);

  // Tiles
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = zone.tiles[r][c], x = c * TILE, y = r * TILE;
      if (ch === 'T') drawTree(x, y, theme);
      else if (ch === 'B') drawBuilding(x, y);
      else if (ch === 'W' || ch === '~') drawWater(x, y);
      else if (ch === '>' || ch === '<') drawExit(x, y, ch, zone.cleared);
      else { ctx.fillStyle = theme.ground; ctx.fillRect(x, y, TILE, TILE); drawGrassDetail(x, y, theme); }
    }
  }

  // Trash
  for (const t of zone.trash) { if (!t.collected) drawTrashItem(t, theme.ground); }
  // Pickups
  for (const pk of pickups) drawPickup(pk);
  // NPCs
  for (const npc of zone.npcs) drawNPC(npc);
  // Enemies
  for (const enemy of zone.enemies) { if (enemy.hp > 0) drawEnemy(enemy); }
  // Player (flash if invincible)
  if (dmgCooldown <= 0 || Math.floor(Date.now() / 80) % 2 === 0) drawPlayer();
  // Projectiles
  for (const p of projectiles) {
    ctx.fillStyle = '#ffaa33';
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffdd88';
    ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
  }
  // Particles
  for (const p of particles) {
    ctx.globalAlpha = p.life / 50;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  // Floating texts
  for (const ft of floatingTexts) {
    ctx.globalAlpha = ft.life / 40;
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 12px Consolas';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  drawHUD(zone);
  // Minimap
  drawMinimap(zone);
  // Combo indicator
  if (comboCount > 1) {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px Consolas';
    ctx.textAlign = 'right';
    ctx.fillText('COMBO x' + comboCount, W - 10, 46);
  }
  if (state === STATE.DIALOG) drawDialog();
  if (flashAlpha > 0) {
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

// --- Game loop ---
function gameLoop(time) {
  const dt = lastTime ? time - lastTime : 16;
  lastTime = time;
  update(dt); draw();
  requestAnimationFrame(gameLoop);
}

function resize() {
  const scale = Math.min(window.innerWidth * 0.95 / W, window.innerHeight * 0.9 / H, 2);
  canvas.style.width = (W * scale) + 'px';
  canvas.style.height = (H * scale) + 'px';
}
window.addEventListener('resize', resize);
resize();
requestAnimationFrame(gameLoop);
