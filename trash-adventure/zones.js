// Zone definitions and map data
const ZONE_LAYOUTS = [
  { name: 'The Park', theme: 'park', map: [
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
  ], trash: 8, enemies: 2, npcs: [
    { x: 6, y: 7, name: 'Ranger Rick', msg: 'This park is filthy! Collect all the trash to unlock the next area.' }
  ]},
  { name: 'The Beach', theme: 'beach', map: [
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
  ], trash: 10, enemies: 3, npcs: [
    { x: 12, y: 5, name: 'Beach Bev', msg: 'The tide washed in so much garbage! Please help clean the shore.' }
  ]},
  { name: 'The City', theme: 'city', map: [
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
  ], trash: 12, enemies: 4, npcs: [
    { x: 10, y: 5, name: 'Mayor Mo', msg: 'Our city streets are covered in litter. You are our only hope!' }
  ]},
  { name: 'The Forest', theme: 'forest', map: [
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
  ], trash: 15, enemies: 5, npcs: [
    { x: 8, y: 7, name: 'Old Oak', msg: 'The ancient forest weeps. Rid us of this pollution, brave one.' }
  ]},
  { name: 'The Dump', theme: 'dump', map: [
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
  ], trash: 20, enemies: 6, boss: true, npcs: [] },
];

const THEME_COLORS = {
  park:   { ground: '#2d5a1e', wall: '#1a3a10', accent: '#3d7a2e' },
  beach:  { ground: '#c2a645', wall: '#8a7530', accent: '#4488cc' },
  city:   { ground: '#444455', wall: '#333340', accent: '#666677' },
  forest: { ground: '#1e4a15', wall: '#0d2a08', accent: '#2d6a22' },
  dump:   { ground: '#3a3520', wall: '#2a2515', accent: '#5a4a30' },
};

const TRASH_TYPES = ['can', 'bottle', 'bag', 'wrapper', 'tire'];
const TRASH_COLORS = { can: '#aaaacc', bottle: '#44aa44', bag: '#dddddd', wrapper: '#dd8833', tire: '#333333' };

function buildZone(layout) {
  const tiles = [], exits = [];
  for (let r = 0; r < ROWS; r++) {
    tiles[r] = [];
    for (let c = 0; c < COLS; c++) {
      const ch = layout.map[r][c];
      tiles[r][c] = ch;
      if (ch === '>' || ch === '<') exits.push({ x: c, y: r, dir: ch });
    }
  }
  const trashItems = [];
  for (let i = 0; i < layout.trash; i++) {
    let px, py;
    do { px = 2 + Math.floor(Math.random() * (COLS - 4)); py = 2 + Math.floor(Math.random() * (ROWS - 4)); }
    while (tiles[py][px] !== '.' || trashItems.some(t => t.x === px && t.y === py));
    trashItems.push({ x: px, y: py, type: TRASH_TYPES[Math.floor(Math.random() * TRASH_TYPES.length)], collected: false });
  }
  const enemies = [];
  for (let i = 0; i < layout.enemies; i++) {
    let ex, ey;
    do { ex = 2 + Math.floor(Math.random() * (COLS - 4)); ey = 2 + Math.floor(Math.random() * (ROWS - 4)); }
    while (tiles[ey][ex] !== '.' || trashItems.some(t => t.x === ex && t.y === ey) || enemies.some(e => e.x === ex && e.y === ey));
    const isBoss = layout.boss && i === 0;
    enemies.push({ x: isBoss ? 10 : ex, y: isBoss ? 7 : ey, hp: isBoss ? 10 : 2, maxHp: isBoss ? 10 : 2, type: isBoss ? 'boss' : 'rat', moveTimer: 0, dir: 0, stunTimer: 0 });
  }
  return {
    name: layout.name, theme: layout.theme, tiles, exits,
    trash: trashItems, npcs: layout.npcs.map(n => ({ ...n })),
    enemies, cleared: false, totalTrash: layout.trash
  };
}

function buildAllZones() {
  return ZONE_LAYOUTS.map(l => buildZone(l));
}
