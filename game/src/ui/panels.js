// The two panels that open over the game: the buy counter (B) and the scoreboard (Tab).
import { GEAR, NADES, SHOP, SIDES, WEAPONS } from '../config.js';
import { sideOfTeam } from '../sim/state.js';
import { priceOf, shopOpen } from '../sim/economy.js';

export const SHOP_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'z', 'x', 'v'];
const describe = (id) => WEAPONS[id] || GEAR[id] || NADES.find((n) => n.id === id);
const owns = (a, id) => (WEAPONS[id] ? a.slots[WEAPONS[id].slot] === id : id === 'jerkin' ? a.armor >= 100 : id === 'cap' ? a.armor >= 100 && a.helmet : id === 'kit' ? a.kit : a.nades[NADES.findIndex((n) => n.id === id)] >= NADES.find((n) => n.id === id).max);

export function createShop(el) {
  const rows = el.querySelector('#shopRows');
  rows.innerHTML = SHOP.map((id, i) => {
    const d = describe(id);
    return `<div class="row" data-id="${id}"><kbd>${SHOP_KEYS[i].toUpperCase()}</kbd><span>${d.name} <em>${d.hint || d.kind}</em></span><b></b></div>`;
  }).join('');
  const cells = [...rows.children];
  let open = false;
  return {
    get open() { return open; },
    toggle(state, on = !open) { open = on && shopOpen(state, state.actors[0]); el.style.display = open ? 'block' : 'none'; },
    /** The item a key buys, or null. */
    pick: (key) => SHOP[SHOP_KEYS.indexOf(key.toLowerCase())] || null,
    update(state) {
      const a = state.actors[0];
      if (!open) return;
      if (!shopOpen(state, a)) { this.toggle(state, false); return; }
      for (const row of cells) {
        const id = row.dataset.id, price = priceOf(state, a, id), have = owns(a, id);
        row.className = `row${have ? ' have' : price < 0 || price > a.money ? ' poor' : ''}`;
        row.lastChild.textContent = have ? 'owned' : price < 0 ? 'Wardens only' : `$${price}`;
      }
    },
  };
}

export function createBoard(el) {
  let open = false;
  return {
    show(on) { open = on; el.style.display = on ? 'block' : 'none'; },
    update(state) {
      if (!open) return;
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
