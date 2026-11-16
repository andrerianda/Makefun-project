// The scoreboard (Tab): both crews by kills, with deaths, plants and cash.
import { SIDES } from '../config.js';
import { sideOfTeam } from '../sim/state.js';

export function createBoard(el) {
  let open = false, beat = 0;
  return {
    show(on) { open = on; beat = 0; el.style.display = on ? 'block' : 'none'; },
    update(state) {
      if (!open || beat++ % 20) return; // three times a second, not every frame
      const m = state.match;
      el.innerHTML = [0, 1].map((team) => {
        const side = sideOfTeam(state, team);
        const body = state.actors.filter((a) => a.team === team).sort((p, q) => q.kills - p.kills).map((a) =>
          `<tr class="${a.alive ? '' : 'dead'}"><td class="s${side}">${a.name}${a.hasKeg && team === state.actors[state.viewId].team ? ' (keg)' : ''}</td><td>${a.kills}</td><td>${a.deaths}</td><td>${a.plants}</td><td>$${a.money}</td></tr>`).join('');
        return `<h2 class="s${side}">${SIDES[side].name} ${m.score[team]} <small>${team ? 'their crew' : 'your crew'}</small></h2><table><tr><th>crew</th><th>kills</th><th>deaths</th><th>plants</th><th>cash</th></tr>${body}</table>`;
      }).join('<br>');
    },
  };
}
