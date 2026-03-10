// Rendering functions for Trash Adventure

function drawTree(x, y, theme) {
  ctx.fillStyle = theme.wall;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(x + 12, y + 18, 8, 14);
  ctx.fillStyle = theme.accent;
  ctx.beginPath(); ctx.arc(x + 16, y + 14, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4a8a3a';
  ctx.beginPath(); ctx.arc(x + 13, y + 12, 8, 0, Math.PI * 2); ctx.fill();
}

function drawBuilding(x, y) {
  ctx.fillStyle = '#556677';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#7799aa';
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
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
  ctx.fillText(dir === '>' ? '\u25B6' : '\u25C0', x + TILE / 2, y + TILE / 2 + 7);
}

function drawGrassDetail(x, y, theme) {
  const seed = (x * 7 + y * 13) % 5;
  if (seed < 2) {
    ctx.fillStyle = theme.accent;
    ctx.fillRect(x + 8 + seed * 3, y + 12, 2, 6);
    ctx.fillRect(x + 20 + seed * 2, y + 8, 2, 5);
  }
}

function drawTrashItem(t, themeGround) {
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
    ctx.fillStyle = themeGround;
    ctx.beginPath(); ctx.arc(x + 16, y + 16 + bob, 4, 0, Math.PI * 2); ctx.fill();
  }
  if (Math.sin(Date.now() / 200 + t.x * 3) > 0.7) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 14, y + 4 + bob, 3, 3);
  }
}

function drawNPC(npc) {
  const x = npc.x * TILE, y = npc.y * TILE;
  ctx.fillStyle = '#4488ff';
  ctx.fillRect(x + 8, y + 12, 16, 16);
  ctx.fillStyle = '#ffcc88';
  ctx.beginPath(); ctx.arc(x + 16, y + 10, 8, 0, Math.PI * 2); ctx.fill();
  const bob = Math.sin(Date.now() / 400) * 2;
  ctx.fillStyle = '#ffdd00';
  ctx.font = 'bold 16px Consolas';
  ctx.textAlign = 'center';
  ctx.fillText('!', x + 16, y - 2 + bob);
}

function drawEnemy(enemy) {
  const x = enemy.x * TILE, y = enemy.y * TILE;
  if (enemy.stunTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) return;
  if (enemy.type === 'boss') {
    ctx.fillStyle = '#664422';
    ctx.fillRect(x + 2, y + 8, 28, 22);
    ctx.fillStyle = '#885533';
    ctx.fillRect(x + 6, y + 4, 20, 12);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x + 8, y, 16, 6);
    ctx.fillRect(x + 6, y - 4, 4, 8);
    ctx.fillRect(x + 14, y - 6, 4, 10);
    ctx.fillRect(x + 22, y - 4, 4, 8);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x + 10, y + 10, 4, 4);
    ctx.fillRect(x + 18, y + 10, 4, 4);
    ctx.fillStyle = '#333';
    ctx.fillRect(x - 4, y - 10, 40, 4);
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(x - 4, y - 10, 40 * (enemy.hp / enemy.maxHp), 4);
  } else {
    ctx.fillStyle = '#887766';
    ctx.fillRect(x + 8, y + 12, 16, 12);
    ctx.fillStyle = '#aa9988';
    ctx.beginPath(); ctx.arc(x + 16, y + 12, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cc9999';
    ctx.beginPath(); ctx.arc(x + 10, y + 6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 22, y + 6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(x + 12, y + 10, 3, 3);
    ctx.fillRect(x + 18, y + 10, 3, 3);
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
  const bob = Math.sin(Date.now() / 200);
  ctx.fillStyle = '#50d278';
  ctx.fillRect(x + 8, y + 14 + bob, 16, 14);
  ctx.fillStyle = '#ffcc88';
  ctx.beginPath(); ctx.arc(x + 16, y + 10 + bob, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  const eyeOffsets = [
    [{ x: 12, y: 7 }, { x: 18, y: 7 }],
    [{ x: 16, y: 8 }, { x: 16, y: 14 }],
    [{ x: 12, y: 13 }, { x: 18, y: 13 }],
    [{ x: 10, y: 8 }, { x: 10, y: 14 }],
  ];
  const eyes = eyeOffsets[player.dir];
  ctx.fillRect(x + eyes[0].x, y + eyes[0].y + bob, 3, 3);
  ctx.fillRect(x + eyes[1].x, y + eyes[1].y + bob, 3, 3);
  ctx.fillStyle = '#338855';
  ctx.fillRect(x + 4, y + 16 + bob, 6, 10);
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

function drawPickup(pk) {
  const x = pk.x * TILE, y = pk.y * TILE;
  const bob = Math.sin(Date.now() / 250 + pk.x) * 3;
  const alpha = pk.life < 100 ? pk.life / 100 : 1;
  ctx.globalAlpha = alpha;
  if (pk.type === 'heart') {
    ctx.fillStyle = '#ff4444';
    ctx.font = '20px Consolas';
    ctx.textAlign = 'center';
    ctx.fillText('\u2665', x + TILE / 2, y + TILE / 2 + 6 + bob);
  } else if (pk.type === 'star') {
    ctx.fillStyle = '#ffd700';
    ctx.font = '20px Consolas';
    ctx.textAlign = 'center';
    ctx.fillText('\u2605', x + TILE / 2, y + TILE / 2 + 6 + bob);
  }
  ctx.globalAlpha = 1;
}

function drawMinimap(zone) {
  const mx = W - 70, my = 34, ms = 3;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(mx - 2, my - 2, COLS * ms + 4, ROWS * ms + 4);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = zone.tiles[r][c];
      if (ch === 'T' || ch === 'B' || ch === 'W') ctx.fillStyle = '#333';
      else if (ch === '~') ctx.fillStyle = '#224488';
      else if (ch === '>' || ch === '<') ctx.fillStyle = zone.cleared ? '#50d278' : '#663333';
      else ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(mx + c * ms, my + r * ms, ms, ms);
    }
  }
  // Trash dots
  for (const t of zone.trash) {
    if (!t.collected) { ctx.fillStyle = '#ffaa33'; ctx.fillRect(mx + t.x * ms, my + t.y * ms, ms, ms); }
  }
  // Enemy dots
  for (const e of zone.enemies) {
    if (e.hp > 0) { ctx.fillStyle = '#ff4444'; ctx.fillRect(mx + e.x * ms, my + e.y * ms, ms, ms); }
  }
  // Player dot (blinking)
  if (Math.floor(Date.now() / 300) % 2 === 0) {
    ctx.fillStyle = '#50d278';
    ctx.fillRect(mx + player.x * ms, my + player.y * ms, ms, ms);
  }
}

function drawHUD(zone) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, 28);
  ctx.font = '12px Consolas';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#50d278';
  ctx.fillText(zone.name, 8, 18);
  ctx.fillStyle = '#ff4444';
  for (let i = 0; i < player.maxHp; i++) {
    ctx.fillText(i < player.hp ? '\u2665' : '\u2661', 130 + i * 16, 18);
  }
  ctx.fillStyle = '#dddddd';
  ctx.fillText('Bag: ' + player.trash, 240, 18);
  ctx.fillStyle = '#ffd700';
  ctx.fillText('Score: ' + player.score, 330, 18);
  const collected = zone.trash.filter(t => t.collected).length;
  ctx.fillStyle = zone.cleared ? '#50d278' : '#aaaaaa';
  ctx.fillText(collected + '/' + zone.totalTrash + (zone.cleared ? ' \u2713' : ''), 440, 18);
  ctx.fillStyle = '#888';
  ctx.fillText('Zone ' + (currentZone + 1) + '/5', 530, 18);
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
  ctx.fillStyle = '#50d278';
  ctx.font = '11px Consolas';
  ctx.textAlign = 'right';
  const blink = Math.sin(Date.now() / 300) > 0 ? '\u25B6' : '';
  ctx.fillText('Press SPACE to continue ' + blink, W - 36, H - 28);
}

function drawTitle() {
  ctx.fillStyle = '#16161e';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#50d278';
  ctx.font = 'bold 36px Consolas';
  ctx.textAlign = 'center';
  ctx.fillText('TRASH ADVENTURE', W / 2, 100);
  ctx.fillStyle = '#888';
  ctx.font = '16px Consolas';
  ctx.fillText('An Epic Journey to Save the Earth', W / 2, 135);
  // Animated scene
  const t = Date.now() / 1000;
  ctx.fillStyle = '#2d5a1e';
  ctx.fillRect(0, 260, W, H - 260);
  for (let i = 0; i < 6; i++) {
    const tx = 40 + i * 100 + Math.sin(t * 0.5 + i) * 10;
    drawTree(tx, 240, THEME_COLORS.park);
  }
  // Falling trash
  for (let i = 0; i < 10; i++) {
    const fx = (i * 67 + t * 30) % W;
    const fy = (i * 43 + t * 50) % 100 + 160;
    ctx.fillStyle = ['#aaaacc', '#44aa44', '#dddddd', '#dd8833'][i % 4];
    ctx.fillRect(fx, fy, 6, 8);
  }
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '13px Consolas';
  ctx.fillText('Arrow Keys / WASD to move', W / 2, 340);
  ctx.fillText('SPACE to interact & throw trash at enemies', W / 2, 360);
  ctx.fillText('Collect trash \u2192 Throw at enemies \u2192 Clear zones!', W / 2, 380);
  if (Math.sin(titleBlink / 300) > 0) {
    ctx.fillStyle = '#50d278';
    ctx.font = 'bold 18px Consolas';
    ctx.fillText('Press SPACE to Start', W / 2, 430);
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
  const stars = player.score > 2000 ? 3 : player.score > 1000 ? 2 : 1;
  ctx.fillStyle = '#ffd700';
  ctx.font = '30px Consolas';
  ctx.fillText('\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars), W / 2, 310);
  if (Math.sin(titleBlink / 300) > 0) {
    ctx.fillStyle = '#50d278';
    ctx.font = '18px Consolas';
    ctx.fillText('Press SPACE to Play Again', W / 2, 380);
  }
}
