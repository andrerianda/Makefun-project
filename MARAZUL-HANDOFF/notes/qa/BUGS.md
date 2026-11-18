# MARAZUL QA bug list (shift 6, 18 Nov 11:03-11:35 UTC; working tree of 11:05-11:11)

How these were found: a new-player run on the GPU machine (hardware WebGL, 960x540, quality high, seed 1, NO
autostart): start menu -> Enter -> the opening call -> W / Shift / A / D held -> the first mission's marker and
intro -> M map, T phone -> F into a car and W/A -> punching people until the police came
(/tmp/marazul/qa/s6/play/probe-play.js, play.json, frames play-*.jpg, contact sheet sheet.jpg; car/map/phone again
with autostart: probe-play2.js / probe-play3.js, play2.json, play3.json, sheet2.jpg). Keys are KeyboardEvents
dispatched on the focused element (they reach the game's own window/document listeners); the game ran in real time
(no M.advance). Also: the stealth census (s6/stealth/stealth3.json, sheet.jpg), the trees probe
(s5/owner/trees.json, trees-*.jpg), the districts tour for the night glow (s6/districts, 11:11, 20 views, ok, no
console error; night sheet /tmp/marazul/qa/s6/carnight.jpg).
At 11:10 the tree did not boot for ~1 min: "[openWorldCity] init: PORT_APRON_WIDTH is not defined"
(world/plan/specialAreas.js mid-edit); fine at 11:10:40.
Severity: blocker (a player or the judge sees it at once, or a loop is broken), ugly (visibly wrong), minor.

## The first five minutes as a new player (what works)
- Start menu: Play / Settings / Controls with the key list; Enter on the panel starts a new game (2 s).
- Opening: lead placed ~20 m from Aunt Hattie's marker facing it; at +2.5 s the call ("Incoming call / Aunt Hattie /
  T Open phone") with a readable subtitle. Location card "Barrio Hierro / Calle Gaviota". No console error.
- Walking: W 3 s = 11 m, feet on the ground, camera 2.3 -> 2.64 m behind at 1.7 m, 60 fps steady (median 16.7 ms,
  worst 16.8 ms on foot; worst 66.7 ms once while driving).
- Walking straight ahead reaches the m01 marker in ~14 s and the intro starts (it runs 26 s; Enter/Space skip).
- F next to a parked car: in after 3.0 s; chase camera 5.67 m back, 2.19 m up, FOV 55 (owner 5.5-6.5 / 1.9-2.2 /
  55-60). F out: 0.2 s. M opens the city map (legend, help line, "PUERTO TAMARINDO" now fits); T opens the phone
  with the active mission card; both close with the same key.
- Police: 15 punches on bystanders -> "Assault" notices, 1 star at the 5th victim; 8 s later two officers at
  1.7 m aiming; sprinting 5 s keeps them at 14 m.
- Stealth m02 (old bug 6 was a PROBE error: guard data is on person.entity.data): 4 guards stand at the cold store
  from objective 1 on and stay (census 0 / 0.2 / 1.2 / 3.7 s: 4 each); walking into a guard's cone for 2.5 s sends the
  lead back to the sneak's start, objective 1 again.
- Trees (owner's direction): no trunk circle overlaps a street item on Bulevar (46 trunks), Gran Via (70), Tolliver
  Tow (58); street trees stand in pits (trees-tolliver_tow.jpg). The "solid at the trunk" hits are the trunk's own
  collider (the probe's ray is within 0.25 m of the axis), not a wall.

## Fixed since shift 5 (dropped, with the proof)
- Stealth guards missing (was 6): present, see above (stealth3.json).
- City map cutting "PUERTO TAMARINDO": fits (play2-08-map.jpg).

## The five worst open bugs

### 1. The judged set is still the 09:59 one (showcase) - blocker
- screenshots/ unchanged since 09:59 (checked 11:12 and at the end of the shift); showcase s9's cover/dusk takes timed
  out in the GPU queue. Everything in shift 5's review stands (/tmp/marazul/qa/s5/judged-768.jpg): 3 reads as
  afternoon daylight (luma 83), 2's crew are bystanders in a calm row with a white tracer scratch, 4 is hazy purple
  with one window pattern on every tower, 3 and 4 still show the FISTS card, cover luma 78.

### 2. A new game starts at 15:00 in flat afternoon light, not at golden hour (engine) - blocker for first impressions
- play.json "after New game": clock 15.08; phone shows "Fri 15:46". core/gameEngine.js creates the clock with no
  startHour, so gameClock.js's default 15:00 wins; the catalogue says newGameClockHours: 18.25
  (catalog/cityDistricts.js). At 2 real s per game minute the signature golden hour (18:50) comes after ~2 h of play,
  so a finalist playing 10 minutes never sees the look of our cover. Pass startHour from the catalogue (18.25, or
  ~18.4) on a new game.

### 3. At night the player's car still glows: the rear blown out white or red with a pool (vehicle-system) - blocker at night
- /tmp/marazul/qa/s6/carnight.jpg (districts tour 11:11, 22:30, chase camera; order barrio_hierro, isla_coral,
  las_lomas, los_pantanos, port_quay): Los Pantanos and port quay a white blob hiding the car, Barrio Hierro the rear
  half white, Las Lomas the whole rear red with a red pool on the paving; Isla Coral nearly right. Traffic cars in the
  same frames are dark. vehicle-system's 10:4x check (night6L) was in the LOCAL software browser: on the GPU the bloom
  is far stronger. Repro: `node tools/qa-tour.mjs --part districts --out-dir <dir>` (views *-car-night).

### 4. The first mission's intro shows other start markers as big coloured shells over cars and people (missions) - ugly
- play-07/-08 (m01 intro, ~25 s into a new game): green, yellow and blue translucent cylinders and rings 4-5 m wide
  over the parked cars (the cars tinted green/blue) and round the people; play-05 / -09: the same rings on the
  pavement in play. Hide every start marker during a cutscene (missionMarkers hideStarts) and keep start markers off
  parked cars.

### 5. The m01 street opens onto a vast empty grey plain (city-dressing / city-world) - ugly
- play-10 .. -14 (m01 giver ~(-422, -434), Barrio Hierro, the first place every player sees): left of the lead a
  bare paved lot ~100 m deep to a low wall on the horizon; the police chase (play-14) runs across empty concrete.
  Fill it (yard clutter, parked trucks, fences, a building row) or move the giver.

## Other open bugs (worst first)

### 6. Guard sight cones are opaque coloured sheets to the horizon (missions, guardSightView.js) - ugly
- s6/stealth/sheet.jpg: blue, then orange and pink flat sheets 20+ m long covering the quay, opacity 0.75-1, read as
  paint or water; the lead's feet are tinted where she stands in one. Owner wanted a readable cone: ~0.25-0.4
  opacity, fade with distance, only the cone's edge line strong. Also m02's sneak checkpoint (-1155.6, 704.5) is on
  the road's centre line with traffic (stealth3-stealth-begin.jpg).

### 7. Fists, melee and thrown weapons take no stance; firearm feet in one line; long guns 39-40 deg (character-runtime, combat, player) - ugly
- Carried from shift 5 (s5/owner/stance-sheet.jpg, aimview-sheet.jpg); not re-measured this shift.

### 8. Mission intros open on an unstreamed plain (missions/cutscene) - ugly
- Carried from shift 5 (s5/owner/starts-sheet.jpg). This shift's m01 intro from a fresh game was streamed.

### 9. The on-foot camera collapses to 0.95 m at the Tolliver Tow spot (player camera) - minor
- trees-tolliver_tow.jpg / trees.json: behind 0.92 m, the lead's back fills a third of the frame, nothing visible
  between camera and lead; Bulevar and Gran Via spots 2.3 m. Lamp poles cutting the lead (m02/m03 starts) carried.

### 10. Police arrive at point-blank (police) - minor
- play.json: 8 s after 1 star two officers stand 1.65 / 1.73 m from the lead aiming; play-13: one cut by the frame's
  edge beside the camera. At 1 star let them call out from 5-8 m first.

### 11. The coupe roof reads see-through from the chase camera at night (sports-cars) - minor
- carnight.jpg (Las Lomas, Barrio Hierro): tan seats through the roof. Carried.

### Carried, not re-checked
- m05 objective announced three times; a body at its start (missions). Rocket launcher across the body, bat hanging,
  sniper above the head when not aiming (character-runtime). Port foot spot faces a bare yard; Los Pantanos and Isla
  Coral lots (city-dressing). Fire close up tall flat sheets (effects). Phone covers the location label (hud).
