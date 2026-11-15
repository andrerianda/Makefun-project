// The two panels that open over the game: the buy counter (B) and the scoreboard (Tab).
import { GEAR, NADES, SHOP, SIDES, WEAPONS } from '../config.js';
import { sideOfTeam } from '../sim/state.js';
import { owns, priceOf, shopOpen } from '../sim/economy.js';

export const SHOP_KEYS = [...'1234567890qft']; // not Z, X or V: those call the radio and turn the camera
const describe = (id) => WEAPONS[id] || GEAR[id] || NADES.find((n) => n.id === id);

export function createShop(el) {
  const rows = el.querySelector('#shopRows');
  rows.innerHTML = SHOP.map((id, i) => {
    const d = describe(id);
    return `<div class="row" data-id="${id}"><kbd>${SHOP_KEYS[i].toUpperCase()}</kbd><span>${d.name} <em>${d.hint || d.kind}</em></span><b></b></div>`;
  }).join('');
  const cells = [...rows.children];
  let open = false, cash = -1;
  return {
    get open() { return open; },
    toggle(state, on = !open) { cash = -1; open = on && shopOpen(state, state.actors[0]); el.style.display = open ? 'block' : 'none'; },
    /** The item a key buys. */
    pick: (key) => SHOP[SHOP_KEYS.indexOf(key)],
    update(state) {
      const a = state.actors[0];
      if (!open) return;
      if (!shopOpen(state, a)) { this.toggle(state, false); return; }
      if (a.money === cash) return; // every buy moves the cash: redraw only then
      cash = a.money;
      for (const row of cells) {
        const id = row.dataset.id, price = priceOf(state, a, id), have = owns(a, id);
        row.className = `row${have ? ' have' : price < 0 || price > a.money ? ' poor' : ''}`;
        row.lastChild.textContent = have ? 'owned' : price < 0 ? 'Wardens only' : `$${price}`;
      }
    },
  };
}

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
