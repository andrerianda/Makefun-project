// Dev tool (not part of the entry): run bot-only matches headless and print what happened.
const root = (process.env.REPO || '/home/user/Makefun-project') + '/game/src/';
const { createGame, stepGame } = await import(root + 'sim/step.js');
const { TICK } = await import(root + 'config.js');
const { drain } = await import(root + 'sim/state.js');
const seeds = process.argv.slice(2).map(Number); if (!seeds.length) seeds.push(1);
const TOTALS = { A: 0, D: 0, len: 0, n: 0, why: {} };
for (const seed of seeds) {
  const s = createGame(seed, true);
  let cur = 0, t0 = Date.now(), rounds = [], kills = 0, shots = 0, radio = [], plants = 0, nadesN = 0, maxTick = 60 * 60 * 40;
  const reasons = {};
  while (s.match.phase !== 'final' && s.tick < maxTick) {
    stepGame(s, TICK);
    cur = drain(s, cur, (e) => {
      if (e.type === 'kill') kills++;
      else if (e.type === 'shot') shots++;
      else if (e.type === 'planted') plants++;
      else if (e.type === 'throw') nadesN++;
      else if (e.type === 'radio' && radio.length < 14) radio.push(`${s.actors[e.a].name}: ${e.s}`);
      else if (e.type === 'round' && !['freeze', 'live', 'final'].includes(e.s)) { rounds.push(`${e.s}${s.match.last.side ? 'D' : 'A'}@${Math.round(s.time)}s`); reasons[e.s] = (reasons[e.s] || 0) + 1; TOTALS[s.match.last.side ? 'D' : 'A']++; TOTALS.why[e.s + (s.match.last.side ? 'D' : 'A')] = (TOTALS.why[e.s + (s.match.last.side ? 'D' : 'A')] || 0) + 1; }
    });
  }
  console.log(`seed ${seed}: ${s.match.round} rounds, score ${s.match.score.join('-')}, ${Math.round(s.time)}s game time in ${Date.now() - t0}ms wall, ticks/s ${(s.tick / ((Date.now() - t0) / 1000)).toFixed(0)}`);
  console.log(' rounds:', rounds.join(' '));
  console.log(' kills', kills, 'shots', shots, 'plants', plants, 'nades', nadesN, 'reasons', JSON.stringify(reasons));
  console.log(' K/D:', s.actors.map((a) => `${a.name}(${a.skill.toFixed(2)}) ${a.kills}/${a.deaths} $${a.money}`).join(', '));
  if (seed === seeds[0]) console.log(' radio:\n  ' + radio.join('\n  '));
  TOTALS.len += s.time; TOTALS.n += s.match.round;
}
console.log('TOTALS attackers', TOTALS.A, 'defenders', TOTALS.D, 'avg round s', (TOTALS.len / TOTALS.n).toFixed(1), JSON.stringify(TOTALS.why));
