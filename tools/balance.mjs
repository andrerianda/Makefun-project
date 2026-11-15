// Dev tool: many bot-only matches; who wins rounds by team and by side, how rounds end, how close matches are.
const root = (process.env.REPO || '/home/user/Makefun-project') + '/game/src/';
const { createGame, stepGame } = await import(root + 'sim/step.js');
const { TICK, ROUND } = await import(root + 'config.js');
if (process.env.FULL) ROUND.toWin = 99;
if (process.env.HALF) { ROUND.half = +process.env.HALF; ROUND.max = ROUND.half + 6; } // play all twelve rounds, to see each half without the early stop
const { drain } = await import(root + 'sim/state.js');
const { startRound } = await import(root + 'sim/round.js');
const SWAP = !!process.env.SWAP;
const N = +(process.argv[2] || 24), from = +(process.argv[3] || 1);
const half = [[0, 0], [0, 0]], byRound = Array.from({ length: 25 }, () => [0, 0]);
const win = [[0, 0], [0, 0]], why = {}, match = [0, 0, 0], margin = []; let plants = 0, rounds = 0, time = 0, firstKill = [0, 0];
for (let seed = from; seed < from + N; seed++) {
  const s = createGame(seed, true);
  if (SWAP) { s.match.round = 0; s.match.attackers = 1; for (const a of s.actors) { a.alive = false; a.money = 800; } startRound(s); }
  let cur = 0, fk = false;
  while (s.match.phase !== 'final' && s.tick < 60 * 60 * 40) {
    stepGame(s, TICK);
    cur = drain(s, cur, (e) => {
      if (e.type === 'planted') plants++;
      else if (e.type === 'kill' && !fk && e.a >= 0) { fk = true; firstKill[s.actors[e.a].team === s.match.attackers ? 0 : 1]++; }
      else if (e.type === 'round' && e.s === 'freeze') fk = false;
      else if (e.type === 'round' && !['freeze', 'live', 'final'].includes(e.s)) { const L = s.match.last; win[L.team][L.side]++; half[s.match.round > 6 ? 1 : 0][L.side]++; byRound[s.match.round][L.side]++; why[e.s + 'AD'[L.side]] = (why[e.s + 'AD'[L.side]] || 0) + 1; rounds++; }
    });
  }
  time += s.time;
  const [a, b] = s.match.score; match[a === b ? 2 : a > b ? 0 : 1]++; margin.push(Math.min(a, b));
}
console.log(`matches: team0 ${match[0]}, team1 ${match[1]}, draws ${match[2]} | loser's rounds avg ${(margin.reduce((x, y) => x + y, 0) / N).toFixed(2)}`);
console.log(`round wins: team0 att ${win[0][0]} def ${win[0][1]} | team1 att ${win[1][0]} def ${win[1][1]} | attackers ${(100 * (win[0][0] + win[1][0]) / rounds).toFixed(1)}%`);
console.log(`ends ${JSON.stringify(why)} | plants ${plants}/${rounds} rounds | avg round ${(time / rounds).toFixed(1)}s | first kill att ${firstKill[0]} def ${firstKill[1]}`);

console.log(`first half att ${half[0][0]} def ${half[0][1]} | second half att ${half[1][0]} def ${half[1][1]} | attackers' wins by round: ${byRound.slice(1, ROUND.max + 1).map((r) => `${r[0]}/${r[0] + r[1]}`).join(' ')}`);
