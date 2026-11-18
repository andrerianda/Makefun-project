# content (F2) handoff note (own note of the third-shift agent; state at 18 Nov 04:51 UTC)

## Tree state (true when written; verify with ls)
ALL FIFTEEN CATALOGS EXIST in game/src/catalog/, complete, cross-consistent, 26 tests passing:
- from the first predecessor, kept untouched: cityDistricts.js, vehicleCatalog.js,
  storyCharacters.js, pedestrianArchetypes.js
- written this shift: gangsAndFactions.js, storyMissions.js, wantedLevels.js, crimeCatalog.js,
  weaponCatalog.js, sideActivities.js, shopsAndProperties.js, radioStations.js,
  brandsAndSignage.js, playerControls.js, progressionRanks.js
Tests (tools/tests/catalog/): catalogReferences, sideActivities, shopsAndProperties,
radioAndBrands, controlsAndProgression (.test.mjs).
docs/GAME_DESIGN.md: see "Progress" at the bottom (written last; compact).

## Commands
node --test "tools/tests/catalog/*.test.mjs"        (about 1 second; 26 tests)

## Style of every catalog
Header comment (what it is, units, where borrowed ids come from); first declaration = main export
`export const X = freezeCatalog({...})`; small builder helpers and freezeCatalog as hoisted function
declarations at the BOTTOM; no imports; every export deeply frozen (tests check).

## Main exports
cityDistricts: CITY_DISTRICTS (+ CITY_LANDMARK_REQUESTS flat list, LANDMARK_KINDS, CITY_THOROUGHFARES,
  CITY_CLOCK_AND_WEATHER, BUILDING_STYLES, CITY_GEOGRAPHY_NAMES)
vehicleCatalog: VEHICLE_CATALOG (+ VEHICLE_CLASSES, VEHICLE_FLAGS, VEHICLE_ENGINE_SOUNDS, rarity)
storyCharacters: STORY_CHARACTERS, PLAYABLE_LEADS, CHARACTER_APPEARANCE_VOCABULARY
pedestrianArchetypes: PEDESTRIAN_ARCHETYPES (20), reactions, stimuli, TRAFFIC_DRIVER_ARCHETYPES
gangsAndFactions: GANGS_AND_FACTIONS (8), FACTION_ORDER, POLICE_UNITS (6), FACTION_MEMBERS (15),
  FACTION_ATTITUDE_RULES
storyMissions: STORY_MISSIONS (16), STORY_MISSION_ORDER, STORY_ACTS, MISSION_OBJECTIVE_KINDS (23),
  MISSION_RULES
wantedLevels: WANTED_LEVELS (array indexed by stars 0..5), WANTED_RULES, BUSTED_RULES, WASTED_RULES
crimeCatalog: CRIME_CATALOG (30), CRIME_CATEGORIES, CRIME_REPORTING
weaponCatalog: WEAPON_CATALOG (12), WEAPON_ORDER, WEAPON_WHEEL_SLOTS (8), COMBAT_RULES
sideActivities: SIDE_ACTIVITIES (14), SIDE_ACTIVITY_ORDER, SIDE_ACTIVITY_RULES
shopsAndProperties: SHOPS_AND_SERVICES (33), SHOP_KINDS, PROPERTIES_FOR_SALE (16), PROPERTY_RULES,
  OUTFIT_CATALOG (13), VEHICLE_UPGRADES, FOOD_AND_DRINK, PHONE_SERVICES
radioStations: RADIO_STATIONS (6), RADIO_DIAL_ORDER, RADIO_SCALES, RADIO_RULES
brandsAndSignage: BRANDS_AND_SIGNAGE (77), BRAND_KINDS, SIGN_STYLES, BILLBOARD_RULES
playerControls: PLAYER_CONTROLS, CONTROL_CONTEXTS, WEAPON_SLOT_KEYS, MOUSE_AND_CAMERA_SETTINGS
progressionRanks: PROGRESSION_RANKS (array, ranks 0..10), REPUTATION_SOURCES, TRACKED_STATISTICS,
  COMPLETION_WEIGHTS, FUN_TOGGLES, SAVE_RULES

## Decisions other agents must know
- Story: gold laundered as glazed tiles (boat -> cold store -> rail yard -> foundry -> casino's
  golden pool); blue ledger; finale Villa Santangel -> helipad -> Faro del Coral; epilogue =
  evidence dock at Tribunal del Golfo. Acts: 1 = m01-05, 2 = m06-11, 3 = m12-15, act 4 = m16.
- Missions need: tow hook (m01), stealth vision cones (m02, m08, m11), phone camera `photograph`
  (m02, m06, m11), boats (m06, m09, m13, m15), drivable police boat (m13), scripted lead switch
  (m02, m15), formal outfit gate (m11), allies in combat, a boss (Lemaire, m15), police helicopter
  as rescue (m15), swat_van driven by the player (m16). No mission needs the player to fly.
- Shop id = landmark id when the landmark is the shop; extra ids: tolliver_tow_garage@tolliver_tow,
  el_remache_rebuilds@chatarreria_el_remache, linea_blanca_aurora and pim_phone_kiosk@galerias_aurora,
  prieto_charters@marina_bahia_vista. Brand `linea_blanca` exists for that shop's sign.
- Rank thresholds 0,250,900,1700,2600,3800,5200,6200,8500,11000,14000; story pays 8000 (rank 7).
- Heat thresholds 10/30/60/100/150; arrest only at 1-2 stars; bribe = phone call to La Notaria.

## Next steps, in order
1. docs/GAME_DESIGN.md: if only the compact version exists, extend it (districts with street
   names, per-mission tables, data-shape section field by field) reading the catalogs; never
   contradict them.
2. Read all names once more against the originality rule (brief rule 3). Reviewed so far: nothing
   knowingly echoes a game or brand; `ravello` logo text ("ram's horn curl in a shield") could be
   reworded if a reviewer finds it too close to real sports-car badges.
3. Optional polish: vigia_azul_security.headquarters is `parque_las_terrazas` (no office landmark
   exists); mission pickups/features are free-form ids listed in the missions only.

## Known problems
None failing. boat/helicopter control contexts reuse W/A/S/D on purpose (they replace the vehicle
movement keys; radio/weapon actions come from the vehicle context).

## Progress
04:51 all 15 catalogs + 5 test files done, 26/26 passing. Writing docs/GAME_DESIGN.md (compact) now.
04:53 docs/GAME_DESIGN.md written (compact, ~12 KB: premise, cast table, mission table, systems, districts, module table). 26/26 tests pass. Shift ended here.
