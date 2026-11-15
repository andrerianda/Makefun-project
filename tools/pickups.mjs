// Dev tool: count rifle drops and pickups over a few bot matches.
const root = '/home/user/Makefun-project/game/src/';
const { createGame, stepGame } = await import(root + 'sim/step.js');
const { TICK } = await import(root + 'config.js');
const { drain } = await import(root + 'sim/state.js');
let picks = 0, kills = 0, rounds = 0;
for (let seed = 1; seed <= 4; seed++) {
  const s = createGame(seed, true); let cur = 0, kegged = 0;
  while (s.match.phase !== 'final' && s.tick < 60 * 60 * 40) {
    stepGame(s, TICK);
    cur = drain(s, cur, (e) => { if (e.type === 'pickup') picks++; else if (e.type === 'kill') kills++; else if (e.type === 'round' && e.s === 'freeze') rounds++; });
  }
}
console.log({ picks, kills, rounds });
