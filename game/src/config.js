// CAMPANILE's tables in one place: timing, movement, economy, the armoury and the palette.
// The simulation reads these tables; nothing here touches the DOM or three.js.

export const TICK = 1 / 60; // fixed simulation step, seconds

export const MOVE = {
  speed: 6.1, accel: 48, friction: 8.5, stopSpeed: 1.6,
  airAccel: 9, airCap: 0.8, gravity: 19.6, jump: 5.9,
  walkMul: 0.5, duckMul: 0.38, radius: 0.36,
  standH: 1.82, duckH: 1.3, standEye: 1.62, duckEye: 1.1, duckRate: 7,
  tagSlow: 0.55, tagTime: 0.35,
};

export const ROUND = {
  freeze: 7, live: 105, fuse: 40, post: 6, buyWindow: 18,
  toWin: 7, max: 12, half: 6,
  plantTime: 3.2, douseTime: 10, douseKitTime: 5, kegBlast: 13, kegDamage: 420,
};

export const ECON = {
  start: 800, cap: 16000, win: 3250, lose: 1900, loseStep: 500, loseMax: 3400,
  plantLoss: 800, plantSelf: 300, douseSelf: 300,
};

// Spray drift, shared by every automatic: first shots climb, then the muzzle walks left and right.
export const SPRAY = [0, 0.1, -0.2, 0.3, 0.7, 0.9, 0.5, -0.3, -0.9, -1, -0.7, -0.1, 0.6, 1, 0.8, 0.2, -0.5, -0.9, -0.6, 0.1];

// dmg at the muzzle; falloff multiplies it every 20 m; armorPen is the share that passes a jerkin;
// spread is the standing cone (radians), move/air add to it at full speed or off the ground;
// bloom grows per shot and decays per second; kickP/kickY are the view punch per shot (radians).
export const WEAPONS = {
  knife: { name: 'Gutting Knife', slot: 2, kind: 'melee', auto: true, dmg: 55, armorPen: 0.85, head: 1, rpm: 110, range: 1.9, speed: 1, price: 0, reward: 1500 },
  sparrow: { name: 'Sparrow .32', slot: 1, kind: 'pistol', auto: false, dmg: 26, armorPen: 0.5, head: 4, rpm: 400, mag: 12, reserve: 36, reload: 2, range: 55, falloff: 0.78, speed: 0.97, spread: 0.006, move: 0.035, air: 0.12, bloom: 0.011, bloomDecay: 0.09, kickP: 0.014, kickY: 0.004, pen: 0.35, price: 200, reward: 300 },
  mastiff: { name: 'Mastiff .45', slot: 1, kind: 'pistol', auto: false, dmg: 55, armorPen: 0.93, head: 4, rpm: 250, mag: 7, reserve: 28, reload: 2.2, range: 65, falloff: 0.82, speed: 0.95, spread: 0.005, move: 0.06, air: 0.16, bloom: 0.03, bloomDecay: 0.08, kickP: 0.042, kickY: 0.012, pen: 0.6, price: 700, reward: 300 },
  cicada: { name: 'Cicada 9', slot: 0, kind: 'smg', auto: true, dmg: 25, armorPen: 0.58, head: 4, rpm: 820, mag: 30, reserve: 90, reload: 2.3, range: 45, falloff: 0.72, speed: 0.96, spread: 0.011, move: 0.022, air: 0.09, bloom: 0.004, bloomDecay: 0.07, kickP: 0.0085, kickY: 0.0075, pen: 0.3, price: 1250, reward: 600 },
  brine: { name: 'Brine 12', slot: 0, kind: 'shotgun', auto: false, dmg: 19, pellets: 9, armorPen: 0.5, head: 2, rpm: 68, mag: 6, reserve: 24, reload: 2.9, range: 28, falloff: 0.5, speed: 0.92, spread: 0.055, move: 0.02, air: 0.06, bloom: 0, bloomDecay: 1, kickP: 0.06, kickY: 0.01, pen: 0.15, price: 1500, reward: 900 },
  corsa: { name: 'Corsa AR', slot: 0, kind: 'rifle', auto: true, dmg: 35, armorPen: 0.78, head: 4, rpm: 600, mag: 30, reserve: 90, reload: 2.5, range: 90, falloff: 0.94, speed: 0.88, spread: 0.0035, move: 0.09, air: 0.2, bloom: 0.0045, bloomDecay: 0.05, kickP: 0.0125, kickY: 0.0105, pen: 0.75, price: 2700, reward: 300 },
  tramont: { name: 'Tramont AR', slot: 0, kind: 'rifle', auto: true, dmg: 31, armorPen: 0.72, head: 4, rpm: 640, mag: 25, reserve: 75, reload: 2.9, range: 90, falloff: 0.96, speed: 0.9, spread: 0.0025, move: 0.085, air: 0.2, bloom: 0.0035, bloomDecay: 0.055, kickP: 0.0095, kickY: 0.008, pen: 0.7, price: 3000, reward: 300 },
  meridian: { name: 'Meridian LR', slot: 0, kind: 'sniper', auto: false, dmg: 112, armorPen: 0.96, head: 4, rpm: 41, mag: 5, reserve: 20, reload: 3.4, range: 140, falloff: 1, speed: 0.8, spread: 0.0006, hip: 0.07, move: 0.18, air: 0.3, bloom: 0, bloomDecay: 1, kickP: 0.07, kickY: 0.01, pen: 1, scopeFov: 24, price: 4750, reward: 100 },
};

// Thrown gear, in slot 3. fuse counts from the throw.
export const NADES = [
  { id: 'crackler', name: 'Crackler', hint: 'frag', fuse: 1.7, price: 300, max: 1, radius: 7.5, dmg: 96 },
  { id: 'glare', name: 'Glare', hint: 'flash', fuse: 1.5, price: 200, max: 2, radius: 26, blind: 3.2 },
  { id: 'seafog', name: 'Seafog', hint: 'smoke', fuse: 1.9, price: 300, max: 1, radius: 4.4, life: 16 },
];

export const GEAR = {
  jerkin: { name: 'Jerkin', hint: 'body armour', price: 650 },
  cap: { name: 'Jerkin + Cap', hint: 'armour and helmet', price: 1000 },
  kit: { name: 'Douse Kit', hint: 'halves the douse', price: 400 },
};

// The buy menu's rows, in order; keys 1-9, 0, Z, X and V pick them.
export const SHOP = ['sparrow', 'mastiff', 'cicada', 'brine', 'corsa', 'tramont', 'meridian', 'jerkin', 'cap', 'kit', 'crackler', 'glare', 'seafog'];

// A side is a job and a uniform: Smugglers attack with the keg, Wardens defend the sites. The two crews swap
// sides at half-time, so you play both.
export const SIDES = [{ name: 'Smugglers', color: '#f2a23a' }, { name: 'Wardens', color: '#35b8ad' }];
export const CREWS = [['You', 'Brannoch', 'Isolde', 'Quill', 'Marrow'], ['Hale', 'Verity', 'Osric', 'Tamsin', 'Corwen']];

// The look: one dusk palette, shared by the sky, the level and its painted textures.
export const PALETTE = {
  sky: ['#f6c38a', '#e88f6b', '#5b5f9a', '#1f2550'], sun: '#ffd9a0', fog: '#d99a80', sea: '#2f5f7c',
  stucco: ['#e8b98c', '#d98f6f', '#e6d3a8', '#b9cfc0', '#c9a0a8', '#dcc48a'], shutter: ['#2f6f66', '#7a3b2e', '#31507a', '#3d5a34'],
  stone: '#9c8f86', crate: '#b08650',
};
