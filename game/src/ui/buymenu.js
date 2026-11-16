// The buy menu (B): the Chandler's Counter, where the round's money is spent by key or by tap.
import { GEAR, NADES, SHOP, WEAPONS } from '../config.js';
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
