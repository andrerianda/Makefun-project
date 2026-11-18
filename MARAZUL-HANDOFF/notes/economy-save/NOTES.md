# economy-save handoff note (shift 07:34 to 08:06 UTC, 18 Nov). Everything below is in the tree.

Owner: game/src/economy/**, game/src/save/**, tools/tests/economy-save/**.
Tests: `node --test "tools/tests/economy-save/*.test.mjs"` (13 pass). Manifest test passes. GPU smoke OK 08:05.

## State of the brief
All five brief items work and have been seen working in the real game (GPU captures, real key events):
1. money, busted/wasted penalties, income; 2. progression and statistics; 3. shops and properties in the world
(markers, E prompt, menu, purchases); 4. saving and loading (format v2 + migration); 5. showcase scenes
economy-gun-shop / economy-respray.

## This shift
- Took over the cut-off shift 6 diff (8ed35ac..): it was consistent (save format v2 with the `lead` header and
  the v1->v2 migration + test; the 'shop' input context; policeSeeLead via policeDispatch.playerSeen; the
  showcase scenes in economy/economyShowcase.js). The menus (ui/menuScreens.js, menus.js) now own Continue /
  Load game through saveGame.hasSave/summary/load, so save/continueButton.js was unused: removed.
- Played through with real KeyboardEvents (eval-keys.js, GPU): E at Trueno Armory Hierro opens the shop (input
  context 'shop'), S chooses, Enter buys rounds ($35, reserve 42->56), Escape leaves; Ropa Vieja outfit bought
  and worn; Dock 12 bought with E/Enter ($45,000), after TIME_SKIP 30 h it pays $900 collected with Enter;
  at Capa Fresca with 2 stars and no unit in sight the drive-in opens the menu by itself, the respray row
  reads "Respray and lose the heat $800", D picks a colour, Enter: paid $800, car repainted (fleet.repaint),
  WANTED_CLEARED {reason:'respray'}, level 0. No faults, no console errors.
- FIXED: Escape closed the shop AND paused the game (economy updates before menus; the context went back to
  onFoot in the same frame so menus read Escape as pause). closeMenu(true) now hands the play context back on
  the next frame.
- FIXED: the shop priced a respray when the menu opened; stars added later kept the old price. The menu now
  redraws when the wanted level changes, and buy() re-prices the item from a fresh offer before charging.
- Statistic names: STATISTIC_SHOWN_NAMES in statisticsBook.js shows "Times arrested" / "Times hospitalised"
  (coordinator's originality fix; ids times_busted / times_wasted unchanged). Test asserts no busted/wasted.
- Reload test (reload-test.mjs, local browser): save, page reload, Continue in the start menu -> cash $57,000,
  properties [tolliver_loft, dock_12_storage], missions [m01, m05], weapons (smg 30/60 equipped) and the lead's
  position (96.87, -1.07) all come back. No errors.
- Captures looked at: economy-gun-shop.jpg (menu at the Barrio Hierro door, good), economy-respray.jpg (blue
  coupe at Playa Dorada, notification, stars gone, cash $1,200 after the $800 two-star respray).
- REQUESTS.md item "progressionRanks catalog not loaded at init": gone (main.js registers the catalog; the
  message no longer exists in economy code).

## Next steps, in order
1. Statistics page: the pause menu already reads progression.statisticRows(); check it in a capture.
2. Optional polish: a sign or awning on shop doors so the gun shop reads as a shop in the picture (city-dressing
   owner, or a small sign mesh in shopMarkers.js).
3. Command handlers are registered in start(), not init (works; move if someone needs them during init).

## Requests to other owners
- content (catalog/progressionRanks.js): rename the stat names 'Times busted' / 'Times wasted' in the catalog
  ("Times arrested" / "Times hospitalised"); then STATISTIC_SHOWN_NAMES can go. catalog/storyMissions.js fail
  texts still say "wasted" / "Busted" (originality).
- player / vehicle-system: a car from fleet.spawn({modelId:'sports_coupe', parked:true, ownerSystem:'test'})
  reported data.driverId 1 and F (KeyF) next to it (2.5 m, nearestEnterable returned it) did not board it in
  6 s; PLAYER_ENTER_VEHICLE works. Check that parked spawns have no driver and that F boards them.
- police: the bust() fallback (when player.bust is missing) both emits PLAYER_BUSTED {fine} and sends
  ECONOMY_SPEND_MONEY: the economy takes the fine from the event, so that path charges twice.

## Commands
    node --test "tools/tests/economy-save/*.test.mjs"
    /opt/marazul-tools/gpu-capture capture --size 960x540 --page "index.html?seed=1&quality=high" --eval "$(cat /tmp/marazul/economy-save/eval-keys.js)" --out /tmp/marazul/economy-save/keys.jpg
    /opt/marazul-tools/gpu-capture capture --size 960x540 --page "index.html?shot=economy-respray&seed=1&quality=high" --out /tmp/marazul/economy-save/economy-respray.jpg
    /opt/marazul-tools/gpu-capture smoke --out /tmp/marazul/economy-save/smoke-gpu.jpg
    node /tmp/marazul/economy-save/reload-test.mjs   (local software browser, about 2 min)
