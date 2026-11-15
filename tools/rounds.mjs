// Dev tool: one bot match round by round: what each side carried, who won and how.
const root = (process.env.REPO || '/home/user/Makefun-project') + '/game/src/';
const { createGame, stepGame } = await import(root + 'sim/step.js');
const { TICK, ROUND } = await import(root + 'config.js');
const { drain, sideOf } = await import(root + 'sim/state.js');
if (process.env.FULL) ROUND.toWin = 99;
for (const seed of process.argv.slice(2).map(Number)) {
  const s = createGame(seed, true);
  let cur = 0, kit = '';
  while (s.match.phase !== 'final' && s.tick < 60 * 60 * 40) {
    stepGame(s, TICK);
    cur = drain(s, cur, (e) => {
      if (e.type === 'round' && e.s === 'live') {
        const row = (side) => { const t = s.actors.filter((a) => sideOf(s, a) === side); return `${t.filter((a) => a.slots[0]).length}rifles ${t.filter((a) => a.armor > 0).length}armour ${t.reduce((n, a) => n + a.nades[0] + a.nades[1] + a.nades[2], 0)}nades $${t.reduce((n, a) => n + a.money, 0)}`; };
        kit = `ATT(team${s.match.attackers}) ${row(0)} | DEF ${row(1)} | play ${s.coach[s.match.attackers].play}->${s.coach[s.match.attackers].site} vs ${s.coach[1 - s.match.attackers].play}`;
      } else if (e.type === 'round' && !['freeze', 'live', 'final'].includes(e.s)) console.log(`r${s.match.round} ${'AD'[s.match.last.side]} wins (${e.s}) t=${(ROUND.live - s.match.t).toFixed(0)}s | ${kit}`);
    });
  }
  console.log(`seed ${seed} final ${s.match.score.join('-')}`);
}
