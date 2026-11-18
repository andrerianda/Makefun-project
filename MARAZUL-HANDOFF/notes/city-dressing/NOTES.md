# city-dressing: handoff note

## 11:03-11:35 shift (tenth): pools merged into BatchedMeshes, prop sign names, view-camera hook (IN THE TREE)
1. MERGE: props/streetItemBatches.js (new): one THREE.BatchedMesh per (material, castShadow, vertex
   layout); a pool part = a geometry in its batch, an item = one instance per part (addInstance /
   setMatrixAt / setColorAt for tints / deleteInstance; ids reused; batches grow with
   setInstanceCount / setGeometrySize). perObjectFrustumCulled and sortObjects OFF (pools already
   drop items beyond their kind's draw distance). Empty batches invisible. Casting batches get
   userData.shadowCascades = 'near' and go to onCaster -> shadowProxies.keepToNearCascades (they
   drop out of the far cascade). NOTE: NOT through shadowProxies.keepToNearCascades: that hack
   zeroes _multiDrawCount in a far cascade, and a BatchedMesh with culling + sorting off and no
   change returns early from onBeforeRender, so the batch stayed at 0 draws in the VIEW too
   (billboard and some boxes vanished, their sign faces floated). streetItemBatches.js saves the
   count in onBeforeShadow and restores it in onAfterShadow. streetItemPools.js keeps its API (addSector/setShown/update/
   setQuality/stats); setQuality re-places every item when a pool's shadow flag changes. New
   test hooks: pools.poolCounts(), pools.describePool(key) {count, castShadow, materials, meshes, xs},
   pools.batches(). Batch names: street_items_<material>[_cast].
2. Shadow tags: building_shadow_boxes userData.shadowCascades = 'far'; every batch passed to
   keepToNearCascades gets 'near' (engine's census honours both).
3. Prop sign names: props/propSignFaces.js (new): one InstancedMesh quad city-wide (1 draw), 2048
   atlas painted once (paintBrandSign / paintBillboard) with names of our own: SHOP_NAMES (awning
   valance, fruit stall, news stand), STAND_NAMES (hot-dog cart), CARGO_NAMES + the catalog's
   naviera_tamarindo / gaviota_express / frigorificos_golfo (container_20/40/stack sides, trailers,
   shed fascia), catalog vending / billboard brands. Per-face reach (90 m band ... 700 m billboard)
   and night glow (vending/billboard) as instance attribute signLook. Faces sit on the anchor's
   outward side (decided from the object's lod0 centre). Fed with the same `pooled` groups as the
   pools (cityDressing buildSector).
4. Billboard: layOutContainerTerminal puts ONE set_roadside billboard_monopole (kind 'billboard',
   STREET_ITEM_LEVELS 80/200/900 m) at a front corner of the terminal (3 m in), face to the
   road along the front; a box collider over the pole (item.legs). Its lamp_flood is always lit.
5. View camera: sectorNearLevels' scene hook returns unless camera === the view camera when one is
   known (options.viewCamera of createCityDressing, or dressing.setViewCamera(camera)); without one
   it keeps the old any-perspective-camera behaviour. REQUEST city-world: pass
   `viewCamera: view.camera` to createCityDressing in citySectors.js (I may not edit it).
Measured (GPU, high 1280x720, frame-eval-s10.js; frame draws = drawn frames, shadow in brackets):
| place                 | BEFORE frame d/tris (sh)   | dressing in view | pools draws | AFTER frame d/tris (sh)       | dressing in view | pools draws |
| Gran Via 13 h         | 330 / 1.20 M (111)         | 142 d / 573 k    | 106         | 192-208 / 1.06-1.10 M (53-69) | 76 d / 573 k     | 40          |
| Gran Via 22 h         | 228 / 0.70 M (0)           | 142 d            | 106         | 148 / 0.66 M (0)              | 76 d             | 40          |
| Bulevar Dorado 18.83  | 331 / 1.14 M (105)         | 143 d / 857 k    | 93          | 239-265 / 1.09-1.15 M (74-100)| 86 d / 857 k     | 36          |
| Barrio Hierro 18.83   | 321 / 0.87 M (102)         | 129 d / 436 k    | 97          | 188-220 / 0.76-0.82 M (55-81) | 58 d / 436 k     | 26          |
| Port 18.83            | 253 / 0.56 M (85)          | 101 d / 174 k    | 79          | 176-215 / 0.44-0.53 M (61-100)| 48 d / 174 k     | 26          |
Systems CPU 0.6-1.3 ms either way. (frame-s10before.log vs frame-s10a.log; the remaining pool draws
are ~10 signal lamp on/off materials and one atlas batch per set file.)
FINAL tree (frame-s10f.log, after the cascade fix + signs + billboard): Gran Via 13 h 209-223 d /
1.13-1.18 M (sh 63-77), 22 h 159-172 d; Bulevar 257-281 d (sh 80-104); Barrio Hierro 200-224 d;
port 177-202 d; dressing in view 50-86 d; pools 26-40 batches. GPU smoke OK (smoke-s10g.log).
Pictures: shops-s10b.jpg (Gran Via shop street, awnings + valance names), port-s10b.jpg,
billboard-s10g.jpg (terminal front: Coco Bravo billboard, line names on every box).
Tests: node --test "tools/tests/city-dressing/*.test.mjs" -> 54 pass (+ city-world cityObstacles 2).
Commands: /tmp/marazul/city-dressing/run-s10.sh <suffix> [shots]  (frame + shops/port pictures);
billboard view: at=-1190,768&yaw=96&up=4&tilt=8 time 17.5 (at-shot.js; yaw 96 looks EAST here).

## Next, in order (tenth shift's view)
1. Look at the shop street again after the -Z rule for lone anchor_sign (awning valance names):
   run-s10.sh x shots, then shops-s10x.jpg.
2. Fewer pool draws: the signal lamps' on/off copies are ~10 materials (one batch each): make the
   lit/dark lamp one material with an instance colour (emissive on/off via setColorAt) -> ~2 draws.
3. More billboards (set_roadside billboard_monopole) beside the port road, big junctions and the
   outer districts' empty lots (BILLBOARD_RULES.districtFavourites for the brand), and the rest of
   set_roadside (bus stop poles, meters, bollards) and set_construction - not placed yet.
4. kit_residential eaves/gables and ground_shop_4_a/_2_a fascia names (as before).
5. The billboard's lamp_flood is lit by day: select 'body' by day or swap the lamp material.
Requests: city-world - pass `viewCamera: view.camera` to createCityDressing (citySectors.js) or call
dressing.setViewCamera(view.camera); until then the hook still runs for every perspective camera.
engine - building_shadow_boxes now carry shadowCascades 'far', near building batches and street item
casting batches 'near'.

## 10:15-10:50 shift (ninth): port, shop fronts, beach, ground cover, obstacle index, split (IN THE TREE)
1. set_port (props/portTerminalLayout.js, pure): layOutContainerTerminal(lot) replaces the yard
   stock on the container_terminal lot (lot 5, 100 x 84 m, front edge = ring[0..3] towards the quay):
   two rows of blocks of container_stack modules (4-6 long x 2 deep, 12.24 / 7.32 m pitch, random
   180 turns, 6 m aisles), a tinted container_40 on the 3-high middle column of ~half the modules
   (y = 3 tiers), 20 ft boxes 1-2 high at block ends, forklifts past the block ends, a run of
   steel_shed bays (3-9) along the back with steel_shed_end at both ends (doors to the yard),
   box_trailers backed onto every other door, chain-link fence as before. Seed 1: 20 modules,
   22 singles, 9 bays, 3 trailers, 3 forklifts. layOutQuayApron(quay, {onRoad, isWater,
   craneSites}) for plan.specialAreas quay_1 (edge polyline, craneRails[0] gives inland):
   quay_crane every >= 36 m within 70 m of a terminal front (craneSitesOf), boom -Z over the
   water, waterside legs 2.5/1.8/1.2 m in, all four legs off the carriageway (carriagewayTest from
   plan.nearestRoad: lanes + median + parking) and out of the water; seed 1: 4 cranes. Along the
   whole quay, 21 m in: tinted 40 ft boxes (1-2 high), 20 ft pairs, trailers, forklifts in groups
   (81 items). NOTE the plan's crane rails are 6 and 18 m in (12 m gauge) but the crane model's
   gauge is 30.48 m: legs do not sit on the drawn rails (request to city-world/plan below).
   Cranes: mounted (no whole-crane box) + item.legs -> 4 leg box colliders + 4 obstacle circles.
2. Tinted instances (streetItemPools): source.tint -> parts whose material role is 'paint'
   (userData.role or name paint*) use a white clone ('<name>_tinted') and InstancedMesh.instanceColor
   from group.colors (Float32Array count*3, linear RGB; buildSectorClutter fills it from item.tint).
   One pool per object/level for all colours (key suffix _tint). LINE_COLOURS (9), AWNING_COLOURS (8),
   CANVAS_COLOURS (4).
3. set_commerce (props/shopFrontLayout.js, pure): from buildings.shopSigns (every shop bay of a
   shopfront plan; SHOP_FRONT_LIFE per district, centro/playa 1 ... barrio 0.25): awning_shop at
   the wall (mounted, y +0.3 -> mount 3.05 m under the fascia; two at 3.1 m on bays >= 6.4 m),
   tinted per shop; café terrace (cafe_set x1-2 at 2.9 m out + aframe_board) in centro/playa/bahia,
   else a board, a vending pair at the bay edge, news_stand / fruit_stall / hotdog_cart 3-3.2 m out.
   Pavement pieces go through layOutSectorClutter (new input.extra) so clearance drops the ones
   on narrow pavements. NOT done: names on anchor_sign (awning valance, stalls, vending) -
   could reuse shopSignDressing's atlas.
4. set_beach (props/beachLayout.js, pure): along promenade_1's line, 60 m frontages, 66% bar
   concessions: parasol rows at shore distance 12 / 16.5 / 21 m, 4.6 m pitch, 25% furled, tinted
   canvas per concession, two loungers each (feet to the sea, 1/3 with towel), a beach_bar_kiosk at
   the back of the sand facing the promenade; open frontages: volleyball nets; lifeguard_tower
   every >= 320 m at 30 m. Seed 1: 381 open + 117 closed parasols, 641 loungers, 16 bars,
   5 towers, 5 nets. Quay apron and beach are laid out ONCE per dressing (waterfrontItems) and
   filtered by sector bounds; they bypass the clutter checks (computed against the plan).
5. ground_cover (vegetation/groundCoverLayout.js, pure): variant_d over every pit's soil
   (y 0.012), variant_a at the wear layout's weeds_kerb and weeds_large spots, variant_c by
   unpitted trunks (70%), variant_b at worn-district pole feet (WORN_POLES). Pool kind 'cover'
   (foliage material, 15/40 m, two levels, no shadow, no collider/obstacle).
6. obstaclesNear by sector: props/obstacleIndex.js (per sector: bounds + reach, 16 m cell grid);
   dressing.obstaclesNear -> index.near; dressing.obstacleCount(). Tested against a full scan.
7. Draws: pools clamp an item's level to its model's top level (topLevelOf: '<object>_lod<n>'
   nodes): two-level objects (set_commerce, set_beach, steel_shed, many set_* objects) no longer
   open a duplicate level-2 pool with the lod1 geometry (one draw less per such object in view).
8. Split: buildings/sectorNearLevels.js (createSectorNearLevels: near-level detail per sector,
   the scene onBeforeRender hook, lastCamera, sectorLods, disposeMeshes) out of cityDressing.js
   (590 -> 494 lines). Behaviour unchanged (viewHookBatches.test passes).
New pool kinds (STREET_ITEM_LEVELS): portYard 60/200/900 m, crane 80/320/2400, beach 40/140/600,
cover 15/40/40. Tests: tools/tests/city-dressing/portBeachShops.test.mjs (8), livedInStreets
terminal test updated (stack modules, sheds, trailers); 52 pass with cityObstacles.
Smoke: LOCAL smoke 10:30 FAILED only on vegetation's fan_palm (registered 10:26, .glb not in
game/assets/vegetation yet) - not this area; re-run when it lands.
GPU: /tmp/marazul/city-dressing/run-s9.sh <suffix> (smoke; frame-eval-s9.js: Gran Via 13/22 h,
Bulevar, Barrio Hierro, PORT golden, with pools' drawn instanced meshes by asset; port-s9*.jpg
from the road north of the terminal 14 m up; beach-s9*.jpg at 19.1 h). PORT_AT/PORT_YAW/... env.

After batch a: beach kind 300 m (two levels; 10 set_beach draws were seen from the port at 600 m),
new kind 'shop' (25/110 m, two levels) for set_commerce, beach rows keep 4 m off the pier
(layOutBeach options.avoid, insideQuad(pier.ring, x, z, -4)).
### Measured 9a (GPU run s9-a, 10:29 tree = before the level clamp / shop kind; high 1280x720;
### game.profile drawn frames, two numbers alternate = frames without / with the far cascade band)
| place (time)          | frame draws / tris        | shadow d / tris     | dressing in view | pools drawn (by set)                        |
| Gran Via 13 h         | 335-360 / 1.18-1.24 M     | 99-118 / 0.51-0.56 M| 157 d / 584 k    | 121: traffic 33, commerce 24, sidewalk 13, alley 11, palms 20, cover 6 |
| Gran Via 22 h         | 242 / 0.70 M              | 0 (moon off)        | 156 d / 584 k    | 120                                          |
| Bulevar 18.83 h       | 379-401 / 1.26-1.31 M     | 107-129 / 0.44-0.49 | 167 d / 924 k    | 117: beach 26, traffic 18, commerce 14, palms 24 |
| Barrio Hierro 18.83 h | 262-280 / 0.78-0.82 M     | 61-79 / 0.26-0.31   | 128 d / 437 k    | 96: alley 36, sidewalk 17, yard 12           |
| Port 18.83 h          | 264-292 / 0.61-0.69 M     | 80-108 / 0.21-0.28  | 112 d / 193 k    | 90: port 26, alley 22, beach 10 (fixed)      |
Systems CPU 1.4-1.9 ms. Shift 8 for comparison: Gran Via 311-325 d, dressing 111-128 d. So the new
sets cost ~+30 draws in view on shopping streets (commerce 24) and the beach (26): the pools need
the BatchedMesh merge (next 2) to get under the engine's 60-draw target.
Pictures: port-s9a.jpg (cranes on the quay with their booms over the water, stack blocks with
tinted boxes on top, trailers; reads as a working terminal), beach-s9a.jpg (19.1 h: parasol rows
with red loungers along the water, yellow canvas, the pier). Batch a "failed" only on fan_palm 404.

End of shift (10:53): tests 52/52 (city-dressing + city-world cityObstacles); LOCAL smoke on the
final tree PASSES (smoke-local-s9b.log, exit 0, fan_palm landed 10:38). GPU batch b (final-tree
smoke, re-measure with the level clamp + 'shop' kind, the Gran Via shop-street shot shops-s9b.jpg
at (2.1, 201.4) yaw 96, 18.6 h) sat queued behind other agents' jobs for 13 min and was STOPPED
(nothing of mine left on the GPU). Re-run first thing: /tmp/marazul/city-dressing/run-s9b.sh c

Requests to other owners:
- city-world / plan: the quay's craneRails are 6 and 18 m in (12 m gauge); set_port's quay_crane
  is a 30.48 m gauge (legs at z = +-15.24): move the rails to ~2.5 and ~33 m in front of the
  container terminal (and widen the apron there to ~36 m so the landside legs clear the road), or
  tell me to scale differently. The cranes now stand with waterside legs 2.5 m in and landside legs
  just off the Ribera del Tamarindo carriageway, not on the drawn rails.
- engine: the pools root now reads ~157 draws in view on Gran Via (commerce 24, cover 6); the
  BatchedMesh merge of the pools is my next job (below).

## Next, in order (ninth shift's view)
0. Run run-s9b.sh (GPU smoke on the final tree, frame measures with the clamp, shops-s9*.jpg)
   and look at the shopping street (awning height under the fascia, café sets on the pavement).
1. Tune from the pictures (crane flood lamps glow by day?
   lamp_flood is always on: select 'body' by day or swap; awning height vs fascia; café density).
2. MERGE (engine: pools 110-128 draws in view = the main CPU cost; ~10 us/draw): turn the
   street item pools into BatchedMesh per (material, shadow flag, level band) so all objects of
   a set sharing the 'atlas' material draw in ONE call (set_sidewalk ~10 objects x 2-3 levels ->
   1-2 draws). streetItemPools' slot logic maps to addInstance/deleteInstance/setMatrixAt +
   setColorAt for tints; sectorMeshBatches.js (city-world) already shows the BatchedMesh pattern.
3. kit_residential: eave_4_a/eave_2_a (slot 'eave') instead of top_parapet on the long sides of
   house/villa/beach_house/motel plans, gable_end_4_a on 4 m ends, close the roof above roofBack
   (1.22 m eave / 1.8 m gable) in the clay tone (writeRoof is flat); ground_shop_4_a/_2_a for the
   kit's ground_shop slot + a painted name on their fascia anchor.
4. Names on set_commerce / set_port anchor_sign (shipping lines on boxes, hauliers on trailers).
5. Earlier list: hedges/shrubs at pit corners and plazas, cables across sector edges.

## 09:29-10:00 shift (eighth): neon, night wash, residential kit, yards, shadow cascades (IN THE TREE)
1. Neon / lit shop signs: props/shopSignDressing.js createShopSigns() -> one city-wide InstancedMesh
   'shop_sign_faces' (1 draw, no shadows, no lights/pools), atlas 2048x2048 of 4x16 cells painted
   once with signPainter.paintBrandSign for every storefront brand with a lit style (neon tubes
   full glow, light boxes ~0.55), emissiveIntensity 2.2 x nightFactor (dressing.update). Placement:
   buildingMeshAssembly pushes `shopSigns` for front ground_shop / ground_entrance bays of
   shopfront plans (plan.shopfront, plan.district now in buildingMassingPlan); layOutShopSigns
   (pure) keeps districts centro + playa_dorada (SHOP_SIGN_DISTRICTS; beach strip: hotels, bars,
   diners, clubs, ice cream...), fascia 0.14 m proud at y+3.62 (<= 3.4 x 0.62 m), and on ~1/3 of
   shops a blade sign (1.25 x 0.32 m, both faces, 0.85 m out at y+4.55, at the bay's edge).
   Drawn to 280 m (vertex-shader drop). The wet mirror renders the scene, so they reflect.
   dressing.shopSignStats().
2. Night wash: shop-door point lights 40/5.5 m -> 18/4.5 m, importance 0.3, pool: false (no fake
   pool). Street lamps 210/12/0.85 -> 170/10 m/0.8 rad, penumbra 0.8, colour 0xffb46e (~2800 K).
   FINDING: localLightManager's real lights are castShadow = false (line ~224): NO street lamp
   casts shadows. The crisp frond shadows on the right pavement in engine's gpu-night-2200b.jpg
   are the MOON key light (sunShadowRig) on wet glossy paving; that is engine/atmosphere's.
3. Building shadows by cascade: buildings/buildingShadowProxies.js. One mesh of plain boxes
   (footprint x height, 10 tris per building, all live sectors) drawn ONLY into far cascades
   (onBeforeShadow: drawRange 0 unless shadow camera width >= 140 m; onBeforeRender: drawRange 0,
   so never in the view or the wet mirror); the modelled near batches (city_dressing_near) are
   wrapped (keepToNearCascades: after BatchedMesh.onBeforeShadow, _multiDrawCount = 0 in a far
   cascade). High uses SHADOW_QUALITY.medium? (radii 21 / 96): near = modelled, far = boxes.
   Lamps and signal masts now cast from level 0 only (STREET_ITEM_LEVELS shadowLevels 1).
   NOTE: the engine's sceneCost census does not know this trick (it counts the near batches as
   casters and the boxes too); measure with game.profile() drawn shadowTriangles (frame-eval.js).
4. kit_residential: apartment_block and safehouse_apartment -> kit_residential, maxStoreys 4
   (kit_residential_tower does not exist); ~1/3 of Barrio Hierro old_town lots (hash) ->
   RESIDENTIAL_INFILL (max 3 storeys) - only 3 such lots exist in seed 1 (BH is industrial).
   City: kit_residential 807 buildings. buildingMeshAssembly: kits with a ground_garage slot put
   roll-up garage doors in ~3/8 of the non-entrance street bays (no shop sign on those); half the
   residential plans (seed & 1) wear top_crown (the pergola crown) on the street front; residential
   roofs get roof_prop_1_a condensers (1-2) 1.6 m in from the back parapet and roof_prop_4_a now and
   then (depth > 9 m). NOT done: sand-to-pastel tints for kit_residential (tints come from the
   district mood palette in planBuilding).
5. Vegetation: coconut_palm within 4 m of a wall (not medians) -> coconut_palm_leaning
   (fitCrownsToFacades, CROWN_REACH 1.2 back; SPECIES_ASSETS falls back to coconut_palm).
   Front yards: vegetation/frontYardPlantingLayout.js (pure): residential/villa plans with a yard
   >= 1.8 m: hedge_clipped modules every 2 m along the lot's street edge 0.55 m inside (75% of lots,
   a 3 m gap at the door, variant_a tall / variant_b edging per lot), shrubs_tropical groups of 2-4
   either side of the path when the yard >= 2.6 m. Pool kind 'shrub' (30/80 m, to 160 m, level 0
   casts). Colliders: hedge module = 2 x 1.1 x 0.7 box, shrub = 0.6 m cylinder.
   Blade signs hang at y+3.02 (under the first floor, clear of balconies; 2.85 m headroom).
6. Yards: STOCK_BLOCKS get a set column: skips (2 side by side), cinder stacks, tyre piles from
   set_yard_clutter. layOutOpenLotFence: open lots with no landmark in barrio_hierro / port /
   la_marisma / los_pantanos (car parks) get pallet_fence panels (3.38 m pitch, a 7 m opening at
   the front, a few missing panels, slight lean) + a skip or tyre pile in a back corner + a
   warning_post at the opening. Chain-link gates get a warning_post 70% of the time.
7. Warning faces: props/warningSignFaces.js: one InstancedMesh 'warning_sign_faces' on
   anchor_sign__warning_post / __warning_plate (0.38 x 0.15 m, -Z), atlas of WARNING_TEXTS
   (PELIGRO, PROHIBIDO EL PASO, NO APARCAR, PROPIEDAD PRIVADA, ALTA TENSIÓN, ZONA VIGILADA,
   SOLO PERSONAL, OBRAS), to 70 m. NOT yet seen in a capture. warning_plate is not placed anywhere.
Test: tools/tests/city-dressing/nightSignsAndShadowBoxes.test.mjs; buildingMassingPlan.test
   allows the kit storey cap. 42/42 pass.
Smoke: local smoke at 09:43 FAILED on someone else's file: "[openWorldCity] init: Cannot access
   'hook' before initialization at createWetStreetReflection" (world/streets/wetStreetReflection.js
   edited 09:40 by city-world/engine). Re-run before ending.
### Measured 8 (GPU run s8-a, tree of 09:37 = signs, lamps, shadow split; high, 1280x720,
### game.profile drawn frames: two numbers alternate = frames without / with the far cascade)
- Gran Via 13 h: 311-325 draws / 1.23-1.27 M tris, shadow 91-105 d / 0.50-0.54 M (engine 08:38
  golden: 0.34 / 0.92 M). Gran Via 22 h: 331-369 d / 1.21-1.27 M, shadow 0.46-0.52 M (was 0.46 /
  1.02). Bulevar golden: 343-383 d / 1.17-1.24 M, shadow 0.51-0.58 M (was 0.40 / 1.06). Barrio
  Hierro golden: 274-294 d / 0.84-0.89 M, shadow 0.27-0.32 M (was 0.19 / 0.58). The far cascade
  now adds 0.04-0.07 M instead of 0.4-0.6 M; peak frames ~0.55 M less. Dressing root in view
  111-128 d / 448-600 k. Shop sign quads live: 3345 (Gran Via), 1193 (Bulevar), 0 (Barrio):
  1 draw. Building boxes: 2050-4220 (x10 tris, far cascade only). Systems CPU 2.4-3.1 ms.
  Within ARCHITECTURE section 11 (550 calls / 1.5 M tris).
- Looked: night-s8a.jpg (Gran Via 22 h after rain): lit sign boxes over the shops on the right
  (Galerías Aurora, Mercadito 24, Voltio Electrónica) read well; neon could glow stronger; the
  right pavement still shows a warm wash with crisp frond shadows (see diagnostic below).
  hierro-s8a.jpg (Barrio Hierro 17:30 eye height, Calle Fragata): graffiti, posters, AC units,
  bag pile, pallet, litter decals, pole + wires: lived-in, still a little sparse on the kerb.
- Final tree (run s8-b, 09:54 tree): GPU smoke OK, night-s8b.jpg / moonoff-s8b.jpg / hierro-s8b.jpg
  no console errors; local smoke OK 09:59; tests 42/42. The night shot's lead now stands at a new
  spot (showcase): neon fascias and blades glow (Hotel Marejada, The Pelícano, Capa Fresca...),
  dark wet paving with warm pools and streaks. DIAGNOSTIC moonoff-s8b.jpg (all directional
  lights 0, keyLights [0.07,0,0,0]): the faint diagonal shadow bands on the right pavement go
  away -> the shadow pattern is the MOON key (engine), not a lamp (lamps never cast).
- Not re-measured after the 09:40-09:50 additions (hedges, shrubs, garages, crowns, roof props,
  pallet fences): they touch residential/worn districts; re-run frame-eval on the next shift.

## Next, in order (eighth shift's view)
1. Re-measure (run-s8.sh with frame-eval.js) on the final tree; look at a residential street
   (las_lomas / bahia_vista) for hedges, shrubs, garage doors, crowns, roof props; and a fenced
   Barrio Hierro car park for pallet fences + warning post faces (warningFaces was 0 in the night
   view, expected: none in Centro) - check the face sits on the band, reads the right way round.
2. Neon: brighter/more saturated tubes (NEON_GLOW 2.2 -> ~3), maybe a few more blades; beach
   strip check (Playa Dorada at 22 h); signs in the wet mirror verified only by eye.
3. kit_residential tints: sand-to-pastel wall, off-white trim for residential plans (planBuilding
   palette by kit), villa variant when the buildings artist ships it.
4. warning_plate on walls (substations, roll-up doors, yard gates) - placement not written.
4b. buildings 09:59 (REQUESTS): kit_residential has 25 modules: ground_shop_4_a / _2_a corner
   stores with a blank fascia anchor_sign_* (paint shop names there, e.g. via shopSignDressing
   with a lightbox/painted brand), eave_4_a / eave_2_a (slot 'eave') replace top_parapet on the
   long sides of houses/villas/beach houses/motels, gable_end_4_a on 4 m ends; close the roof
   above roofBack 1.22 m (eave) / 1.8 m (gable) in the clay tone (writeRoof is flat now).
5. Shrub groups at pit corners, median ends and plaza edges (only front yards now); hedges on the
   promenade and car-park edges.
6. cityDressing.js is 590 lines: split the per-sector build (buildSector) into its own module.
7. Older list: cables across sector edges, crown check vs neighbour sectors, port containers.
GPU: /tmp/marazul/city-dressing/run-s8.sh <suffix> (smoke, frame-eval.js measures at high: Gran Via
   13 h / 22 h, Bulevar golden, Barrio Hierro golden; night-after-rain shot at 22 h 1280x800
   (night-eval.js); a Barrio Hierro street at eye height (district-shot.js PICK=1)).

## 08:32-09:00 shift (seventh): lived-in streets, crowns, port stock, obstacles (IN THE TREE)
Brief: owner's reference /tmp/marazul/briefs/owner-ref-aim-and-map.png (density and wear only);
the AIM judged picture is a firefight in a dense worn Barrio Hierro street.
Finding: Barrio Hierro is an INDUSTRIAL district: 120 of 186 buildings are 'industrial' family
set back 11-20 m behind the pavement (front yards), so facade-to-facade wires rarely fit there
(they do in La Marisma's old town). Wires in Barrio Hierro come from utility poles.
1. Density (streetClutterLayout.js): CLUTTER_PROFILES barrio_hierro kerb 1.5 / wall 1.9 / service
   1.5 / wallUnits 0.32 (AC boxes on most upper floors); port 1.1/1.4/1.4/0.15; la_marisma up.
   Barrio wall mix adds dumpsters (closed/open), pallets, rusty drums, tyres, a rare portable
   toilet; DEEP objects on a pavement < 3.2 m become bag piles; a dumpster gathers bags at one
   end and cartons at the other; service sides denser (count scales with profile.service).
   Barrio Hierro: ~190 clutter items per 100 m of street (incl. wall units/fences) vs centro 17.
2. Utility poles + overhead wires: streetFurnitureLayout WIRED_DISTRICTS (barrio_hierro,
   puerto_tamarindo, los_pantanos) street/alley/service roads use utility_pole (34 m, staggered)
   instead of lamp_arm (the pole has its own lamp arm and light). props/overheadCableLayout.js
   (pure): 3 lines pole-to-pole (anchor_wire_1..3 from the GLB: (0.158,10.3,+-1.1), (0,10.8,0);
   flipped when the next pole faces the other way), service drops pole->facade behind (75%) and
   over the road to the facade across (50%), facade-to-facade across crowded streets
   (CABLE_DENSITY per district, ends on real walls, second line along the wall tangent).
   props/overheadCables.js: ONE city-wide InstancedMesh (4-sided tube, 14 pieces, radius 1.7 cm),
   instance matrix +X = the span (exact ends on slopes), sag per instance in the vertex shader,
   dropped beyond CABLE_DISTANCE 140 m, no shadows. 820 spans in the city (barrio 278, marisma
   221, port 128, pantanos 108). dressing.cableCount().
3. Crowns vs facades: coconut palms on pavements turn their lean (+X) over the road (+-20 deg),
   variant now from plant.roll (sectorStreetDressing); sectorStreetItems.fitCrownsToFacades:
   CROWN_REACH street_tree 4.2 / royal 3.0 / coconut 2.6 m x scale vs the distance to the
   sector's building edges -> shrink to fit, drop under 0.6. 282 shrunk, 74 dropped (5219 kept).
   (Neighbour sectors' buildings are not checked: a tree at a sector edge can still touch.)
4. Port quay / open yards (QA bug 8): streetClutterLayout.layOutYardStock for open lots (no
   building) of STOCKED_YARDS kinds or zone port_yard: blocks of pallet stacks, drums, tyres,
   cylinders, skips, toilets in rows with aisles + fence; kind clutterLarge (to 200 m); block
   pieces may touch (item.block). Container terminal (lot 5): 126 stock + 102 fence; Barrio
   scrapyard (lot 7) ~239. NO containers/cranes/sheds/trucks exist as assets: REQUEST below.
5. Obstacles for walkers: sectorStreetItems.streetObstacleCircles -> dressing.obstaclesNear(x, z,
   radius, out) -> {x, z, radius, kind: trunk|pole|signal|shelter|clutter} (pit trunks 0.62 m,
   long items as up to 3 circles). Not yet exposed by openWorldCity (request).
6. Far cards at night: cardPlaster / cardCurtain night peaks 1.4/1.2 -> 2.4/2.2 (UNVERIFIED from
   1 km; m-night-f.jpg shows Gran Via 22 h).
Test: tools/tests/city-dressing/livedInStreets.test.mjs (cables sane and on walls, crowns clear
of footprints, coconut lean, obstacles cover every item, barrio densest, terminal stocked).
7. Vegetation's street_tree_narrow landed 08:54 (reach 1.95 m): fitCrownsToFacades now turns a
   street_tree whose crown would touch a wall into street_tree_narrow (SPECIES_ASSETS falls back
   to street_tree if not loaded); 5290 trees kept, none shrunk below 0.85 now.
GPU runs: run-e.sh e (smoke OK, aim-hierro-e.jpg, eye-hierro-e.jpg, m-hierro/granvia/bulevar-e.log),
run-f.sh f (port-f.jpg, m-night-f.jpg, smoke-f), aim-hierro-g.jpg (turn -0.8, pick 1).
### Measured 7 (GPU, high, whole frame view + shadows; budget 550 calls / 1.5 M tris)
- Barrio Hierro 13 h (m-hierro-e): 225 calls / 675 k tris (batch b was 314 / 884 k); alley pool
  40 draws, 1068 instances, 63 k tris, 7 shadow draws; sidewalk 16 draws. Aim view 18.6 h
  (aim-hierro-e): 197 calls / 643 k tris, 256 cable spans held (1 draw).
- Gran Via 13 h (m-granvia-e): 359 / 1.72 M (as before, 1.79 M at batch a: tris are buildings and
  shadows, the dressing pools are alley 9 + sidewalk 14 draws, 15 k tris). Gran Via 22 h
  (m-night-f): 296 / 1.19 M. Port terminal 18.6 h (port-f): 163 / 704 k.
- Pictures looked at: m-hierro-e.jpg (utility poles, wires pole-to-pole and drops over the road,
  AC box, dumpster, drums, fence, newspaper box: reads lived-in), aim-hierro-e.jpg (aim turned the
  wrong way, at a fenced yard with a dumpster: hierro-aim.js turn sign is inverted, use turn<0),
  port-f.jpg (terminal: scattered skips, pallets, tyres, cylinders; still sparse for its size).
- GPU smoke-f / port-f / m-night-f FAILED on console errors that are NOT this area's:
  "BufferGeometryUtils.mergeGeometries() failed while trying to merge the uv1 attribute"
  (callers: traffic/sameMaterialMerge.js, pedestrians/pedestrianBodies.js; assets rebuilt
  08:45-08:50: sports_coupe, dez_tolliver, sport_motorcycle). smoke-e (08:39 tree) passed; local
  `node tools/smoke-game.mjs` passes at 08:55 with this shift's final tree.

### Night lighting (owner 08:58, coordinator's request at the end of the shift)
- Street lamp lights (sectorStreetDressing): spot 320 / range 24 / angle 1.05 -> 210 / 12 / 0.85,
  warmer 0xffc98a (pools of ~8 m radius from a 7 m head); bollard/other 120 -> 90.
- Foliage at night (streetItemPools.setFoliageNightFactor, called from dressing.update): albedo
  down to 35% at night, back faces take their true (flipped) normal again at night, so fronds are
  lit from below only by a lamp below them. By day unchanged (front-lit both faces, QA bug 3).
- More lit windows: buildingMassingPlan litShare 0.25-0.55 -> 0.40-0.75 (kit lamp_window groups);
  far cards litFraction 0.62 / 0.6 passed to windowedFacade / curtainWall (glazingSurfaces reads
  options.litFraction; UNVERIFIED that surfaceMaterials passes it through) and peaks 2.4 / 2.2.
- Capture: night-granvia-h.jpg (?shot=night-after-rain, 1280x800, GPU, no console errors).
  Looked: fronds are now dark silhouettes; lamp pools on the road are warm and local; BUT the
  pavement by the shop fronts (right) is still a wide cream pool (buildings' own ground-floor
  lights in buildingMeshAssembly lights? check their intensity/range next), towers still mostly
  dark blue glass with few lit windows (the tower kit's lamp_window share / glow: check
  WINDOW_GLOW and the tower module lit choice next), hard frond shadows on the pavement are the
  moon (engine/atmosphere). Engine is lowering the night exposure: judge again after it lands.
- Not done: neon signs / lit shop windows of our own design on Gran Via (next: a few emissive
  sign cards on ground_shop fronts via the sign atlas, signFaceDressing style, one draw).
- Aim picture location: Barrio Hierro streets are wide with 11-20 m industrial yards (aim-hierro-g
  looks over a fenced yard); for "dense worn street" showcase should try La Marisma old_town
  streets (facade-to-facade wires, barrio clutter mix) or Barrio Hierro 'trees' streets.

### Extension 09:03-09:08 (coordinator: new prop sets, shop lights, guard) - IN THE TREE
- set_yard_clutter in the MIXES (Y = 'set_yard_clutter'): barrio wall (cinder stacks/broken,
  leaning/flat cardboard, crate stacks, plastic crates, leaning mattress, tyre pile, trolley), port
  wall, service (crate stack, bundle, flat mattress, cinders), yard (skip, cinders, tyre pile).
  CLUTTER_OBJECTS has their plan sizes; skip and pallet_fence are clutterLarge. NOT yet: the
  pallet_fence round open lots, warning_plate/post faces (anchor_sign), skip in the open-yard
  STOCK_BLOCKS (STOCK_BLOCKS all use set_alley_and_yard: needs a set per block).
- set_street_wear: props/streetWearLayout.js (pure; WEAR_DENSITY per district): per segment every
  4.5/share m a lane decal (stains, cracks, patches, tyre marks along the lane), storm drains in
  the gutter (X along the kerb), kerb weeds, a pavement decal (gum, butts, litter), a manhole every
  ~45 m; per building edge (not towers) (4..8 per 20 m) x share wall decals at the wall foot, 2.5 cm
  proud, -Z out of the wall, on the pad; weeds_large at worn wall feet. props/streetWearDecals.js:
  per sector ONE merged mesh per material (own merge of position/normal/uv, Uint32 index, no
  BufferGeometryUtils), cutout_decal cloned transparent / no depth write / alphaTest 0 /
  polygonOffset -1,-1, weeds keep the cutout; no shadows; drawn only while the camera is within
  WEAR_DISTANCE 90 m of the sector's box (view hook + update). Max 500 decals per sector.
  Test in livedInStreets.test.mjs (wall decals on walls, objects exist, barrio > 5x playa).
- Shop-front door lights (buildingMeshAssembly): 90 / range 9 -> 40 / 5.5, importance 0.35.
- sectorStreetDressing:43 guarded (variant[...] ?? variant[0]); the 08:34 error was the window
  between the palm-lean edit (negative rotationY) and the roll edit.
- GPU 09:06: smoke-i OK (no errors), m-hierro-i.jpg: 300 calls / 955 k tris at high (was 225 /
  675 k; budget 550 / 1.5 M). Looked: litter decal on the pavement, tyre pile, leaning cardboard,
  a streak on the wall; lane stains not obvious in that view; wall graffiti small. Next: check a
  close wall (tags/throw-ups readable?), the lane decals' contrast, decal draws per sector.

## Next, in order (seventh shift's view)
1. (DONE 09:05, see the extension) Use the prop artist's NEW sets: set_street_wear.glb and
   set_yard_clutter.glb landed in game/assets/props at 08:50/08:54 but props.js registry is still
   06:41 (not registered = do not use). Ground/wall wear (stains, cracks, cinder blocks, graffiti?)
   go in streetClutterLayout MIXES (barrio wall zone, yards) and a 'decal' kind (no collider).
2. coconut_palm_leaning (registered 08:54): use it for side coconut palms 2.6-4 m from a wall
   (lean +X over the road, as coconut_palm now does), in SPECIES_ASSETS + fitCrownsToFacades.
3. Verify far cards lit at night from 1 km (skyline shot) with the 2.4 / 2.2 peaks.
4. Port: containers/cranes/sheds/trucks need assets (request below); then layOutYardStock blocks
   of containers along the quay. Denser stock: pitch 14 x 11 m could go to 10 x 8 m.
5. Barrio Hierro industrial front yards: more yard stock in the 11-20 m setbacks (layOutBuildingClutter
   front edges, 'yard' zone count), kerb clutter still sparse in eye-height views.
6. Cables across sector edges: pole-to-pole spans stop at sector borders (poles of the neighbour
   are not in the list): lay out poles with the wide bounds and keep spans whose start is inside.
7. Crown check ignores the neighbour sector's buildings.

## 08:05-08:20 shift (sixth): REGRESSION from the near/far batches, found and fixed (verify)
- Symptom (traffic cover5.jpg, showcase 08:02+ Gran Via takes): no buildings, palms or lamps in
  ?shot= pictures. Reproduced: cover-probe.jpg. Probe (cover-probe2.js): the batches DID hold the
  pieces (near 72, far 92 active instances) and the pools 0 instances; one more M.render() and
  everything showed (cover-probe2.jpg). Cause: batch membership changed inside LOD.update, i.e.
  WHILE the renderer projected the scene (after teleports new LODs sit after the batch roots in
  the layer; batch growth replaced geometry after projection; the pools filled in
  dressing.update with the previous frame's camera), so it drew one frame late, and a ?shot=
  holds its first frame.
- Fix (cityDressing.js): a hook chained onto the scene's onBeforeRender (installed on the first
  onView, removed on dispose) runs every live sector LOD's update(camera) and the pools' level
  pass with the very camera being rendered, BEFORE projection. Test:
  tools/tests/city-dressing/viewHookBatches.test.mjs (two real sectors 1.5 km apart, camera cut,
  only onBeforeRender runs; checks near/far pieces per sector, disposal, hook removal).
- First try (hook installed on the first onView) still failed in plain ?shot= captures (run e):
  the held picture is the FIRST frame drawn, before any LOD was projected, so no hook yet. Now
  the hook is installed from dressing.update() (systems update before the first frame), and the
  near/far batch roots hang under the pools root (in the scene from the dressing's creation).
  VERIFIED (run-shots.sh f, GPU, no console errors, smoke OK): shots-f-sheet.jpg shows buildings,
  palms and lamps in cover-golden-hour, police-chase-dusk and skyline-from-the-sea.

## Tree pits: DONE in the tree at 08:25, VERIFIED on the GPU (run-trees.sh a, no console errors,
## smoke OK): tree-pit.jpg (1280x800, Bulevar Dorado, coconut palm in its grate with soil and
## weeds), tree-pits-street.jpg (Gran Via pavement, palms in pits). m01-plaza.jpg caught the
## mission intro cutscene from above: no dark squares visible there; not diagnosed further.
- roadsidePlantingLayout tags plants place ('median' | 'side') and streetYaw (object +X along
  the street). sectorStreetItems.placeTreePits: a trunk on 'pavement' gets pit {x, z, rotationY}
  only if the whole 1.24 m grate square (+5 cm, 8 probes) is pavement, never kerb/asphalt; on
  verge/ground/planted median no pit; anything else dropped. Plan fallback: side plants get pits.
- Clearance: a pit tree carries clear = TREE_PIT_CLEAR (1.48 m): standing clutter keeps
  halfX + 1.48 m from the trunk (benches, shelters, bins, kiosks...). Lamps and signals keep
  2.2 m (clearPlantingAround). Cross-sector: layOutSectorStreetItems lays out 4 m past the
  sector's edges (signals from nodes within 50 m via allNodes) and returns `nearby` for the
  clutter's fixed list (17 intrusions at sector edges before, 0 now).
- Rendering: grates = clutter items {set_sidewalk tree_grate, kind 'pit', mounted (no collider)}
  pooled (STREET_ITEM_LEVELS.pit 25/160 m, never casts); soil = props/treePitSoil.js, one
  city-wide instanced 1.2 m quad (surface library 'dirt', darkened x0.55) 1.2 cm above the paving
  under the grate (grate spans 0..3.6 cm). Trunk, grate and soil all use itemHeightAt (ground +
  kerb lift at the trunk).
- Test: tools/tests/city-dressing/treePits.test.mjs (whole city: 5293 trees, 4232 in pits; every
  pavement trunk has a pit lying on pavement; trunks only on pavement/verge/ground/median; no
  lamp/signal within 2.2 m; no standing clutter in a pit).
- QA bug 3, my part: foliage (two-sided cutout fronds/leaves) now lit on both faces like the
  front (streetItemPools.foliageMaterial: faceDirection = 1.0): no black fronds seen from below.
  The camera pulled to 0.3 m by the palm trunk is the PLAYER camera's collision: REQUEST to player:
  ignore vegetation and props in the camera probe (or sphere-cast, min 1 m, fade the lead).
  The planter "spikes" were seen from inside because of that same camera collapse.
  m01 plaza "dark squares above trees": m01-plaza.jpg (look; not yet diagnosed).
- NOT done: canopy vs facades. Measured trunk-to-lot-edge distances (tree-facade.mjs): most
  trees >= 3 m, ~180 coconut palms and ~150 street trees 2 to 3 m, 36 at 1 to 2 m; crowns are
  4.5 to 5 m in radius (coconut leans 2.5 m towards its +X). Next: turn coconut palms so their
  lean points to the street, and shrink or drop trees whose crown radius x scale exceeds the
  distance to the building footprint (building plans, not lot rings) where the building is taller
  than the crown base.

## (old) TOP PRIORITY plan: street trees in real tree pits (owner, 08:01; coordinator)
Read "Owner's direction on street trees" at the end of /tmp/marazul/briefs/UPDATE.md and QA's
/tmp/marazul/qa/BUGS.md bug 3. Every tree or palm on PAVEMENT stands in a pit (soil bed 1.2 to 1.6 m,
sunk 2 to 4 cm, low kerb edge or cast-iron grate, soil/mulch, a few weeds); on wide boulevards a
planted verge strip; no trunk on bare concrete or asphalt; no trunk in walls, signs, lamps, benches,
shelters, parked cars or the kerb; no canopy through facades or awnings; trunks on the sampled
ground. Plan (fast path):
1. set_sidewalk already has `tree_grate` (1.2 m cast-iron grate round a 0.5 m opening, flush with
   the pavement, anchor_tree__tree_grate where the trunk stands; registry props.js line ~410).
   In cityDressing.buildSector, for every planted item whose clearance surface kind is 'pavement'
   (surfaceClearance / options.streets.surfaceAt(x, z).kind), push a clutter item
   {assetId: 'set_sidewalk', object: 'tree_grate', x, z, rotationY, kind: 'clutterLarge', mounted: true}
   (mounted = no collider) into the clutter list BEFORE layOutSectorClutter's fixed checks (or add
   it after, as it is flat). It then pools with the clutter (no extra draws per sector). Under the
   grate: a dark soil disc/square quad (a small instanced pool or a 'soil' surface from the
   texture library, 1.4 m, 1 cm below the grate) so the openings show soil, not concrete; a few
   weeds optional. Trees on verges/medians keep the planted ground (no pit).
2. Clearance: clutter already keeps 0.9 m from plants; also keep trees 1.5 m from benches,
   shelters, kiosks, lamps, signs, parked-car bays (lane graph parking: plan segment parkingLeft/
   Right) and 1 m + canopy radius from facades (buildings' footprints in plans): drop or shift the
   tree in roadsidePlantingLayout / layOutSectorStreetItems (ITEM_RADIUS.plant).
3. Test (tools/tests/city-dressing/): over the whole city (as streetItemsOnBuiltSurface.test.mjs
   does), every planted item on 'pavement' has a tree_grate at its x, z, and no lamp/control/
   clutter/building footprint within its clearance.
4. QA bug 3: palm at Bulevar (193.4, 898.2) 0.7 m behind the lead stops the camera and its fronds
   draw black across the sky (camera near-clip inside fronds: check frond material side/alphaTest
   and whether the camera's collision uses the palm collider radius); a planter plant pokes into
   the frame on Bulevar; dark squares float above the trees at the first mission's plaza (likely
   the palms' crossed-card level 2 or a card material with no alpha: look there first).
5. Deliver a GPU close-up of a pavement tree at /tmp/marazul/city-dressing/tree-pit.jpg (adapt
   face-shot.js: find the nearest plant instance in the pools, camera 3 m off, 1.6 m up).

Shift from 07:34 UTC, 18 Nov (fifth shift). Everything below is in the tree unless marked.
The previous shift (07:16 to 07:28, cut by a restart) left windows, junction pooling and clutter
in the tree without a note: checked with `git diff 8ed35ac`, consistent, tests passing.

## Done (in the tree)
1. Lit windows after sunset: facadeMaterials.js WINDOW_GLOW: each kit lamp group (lamp_window_a
   homes, _b offices, _c shop fronts, lamp_crown) glows its own warm colour at a lower peak
   (0.6 to 1.2) times the atmosphere's nightFactor (cityDressing.update -> materials.setNightFactor);
   the baked 2.2 burned to white. Unlit by day. The kits' baked dark glass panes are used as baked
   (pane override removed). Day check: m-granvia-a.jpg (Gran Via 13 h: dark glass bands, fine),
   panes-centro.jpg / panes-hierro.jpg (07:20).
2. Junction controls pooled (junctionControlDressing.js): each control object is a body group
   plus an on and an off group per lamp material (lamp_red/amber/green/stop/walk) in the city-wide
   pools (streetItemPools.js kind 'control': 30 / 90 m, drawn to 300 m); a signal lamp switches by
   handle.setShown(group, index, shown) only when its light changes; signals within 340 m update.
3. Street clutter (owner's wish): streetClutterLayout.js (pure, Node-tested) lays out by district
   profile (CLUTTER_PROFILES: Barrio Hierro and the port dense, Playa Dorada tidy): kerb zone
   (bins, hydrants, newspaper boxes, ticket machines, benches backs to traffic, bike racks, kiosks),
   back of pavement (bags, cartons, wheelie bins, crates), bus shelters at avenue stops, service
   sides of buildings (dumpsters, wheelie bins, bags, pallets, drums), industrial yards and
   chain-link fences (about half the industrial lots), wall units (AC boxes under windows, AC
   condensers and gas meters low on side walls). sectorStreetItems.layOutSectorClutter keeps an item
   only where surfaceClearance allows and clear of lamps, plants, signals and each other;
   sectorClutterDressing.js -> pool instances, box colliders (not for scatter class), and seats:
   dressing.seatsNear(x, z, radius, out) -> {x, y, z, rotationY, heading, object} from the
   anchor_seat* anchors of benches and bus shelters (city-world / pedestrians can sit there).
   Pool kinds: 'clutter' (small: 16 / 60 m, gone beyond 60 m, NEVER casts shadows) and
   'clutterLarge' (benches, dumpsters, shelters, fences, wall units: 28 / 70 m, to 200 m, shadows
   from level 0 only). STREET_ITEM_LEVELS[kind].shadowLevels sets it (this shift).
4. Sign faces (this shift): props/signFaceDressing.js createSignFaces({assets, districtName}):
   two city-wide InstancedMeshes (sign_faces_stop, sign_faces_names) under the pools root. Stop:
   white ALTO lettering (canvas, alphaTest) on anchor_sign__sign_octagon. Names: an atlas canvas
   2048x1024, 128 cells 256x64 (84 street names in the city), each painted with the texture
   toolkit's paintStreetNamePlate(name, {district}) on first use, uploaded once a frame at most;
   per-instance attribute signCell (uv rect) via onBeforeCompile; both sides of each blade
   (8 mm thick). Faces beyond FACE_DISTANCE (160 m) dropped in the vertex shader. Layout:
   junctionControlLayout gives the name post `names` [arm 0, arm 1] and `districts`.
   dressing.signFaceStats().

5. Coordinator's 07:40 items (this shift): (a) far level merged across sectors: every sector's
   buildings.far (cards, parapet bands, roofs) is kept detached in a farHolder at the sector origin
   and copied into city-wide BatchedMeshes (city-world's streets/sectorMeshBatches.js, one per
   material, root 'city_dressing_far') while the VIEW camera sees the far level; removed when the
   modelled level shows (createNearDetail's onLevel, perspective cameras only) and on dispose.
   dressing.farStats(). The NEAR (modelled) level is batched the same way ('city_dressing_near',
   createNearDetail's holder + setShown; dressing.nearStats()). (b) the far level casts no shadows (buildingMeshAssembly: beyond the near
   distance, past shadowCasterDistance). (c) "towers as plain grey boxes": the far cards' surfaces
   (windowedFacade, curtainWall) were requestMaterial placeholders (flat) until the slice painter
   reached them; now painted at once with getMaterial (facadeMaterials surface(..., now = true)).
   (d) signal lamps' dark copies stop at level 1 (pools source.maxLevel).
6. Stop face lifted 8 mm (the octagon's post strap at z -0.035 showed through ALTO; f-stop-b.jpg).
   Name blades verified: f-names-b.jpg "SUBIDA TIMON / LAS LOMAS", readable, right way round.
   Night windows verified: m-night-a.jpg (Gran Via 22 h, warm varied windows, no white burn).

## Measured (GPU, high; measure-shot.js renders with and without the clutter pools)
Before this shift's shadow change (batch a, 07:38):
- Gran Via 13 h: 617 calls / 1.786 M tris with clutter, 544 / 1.762 M without (+73 calls incl.
  shadow passes, +23 k tris); median frame 34.9 vs 32.8 ms (shared GPU, noisy).
- Barrio Hierro 13 h: 387 / 948 k with, 256 / 839 k without (+131 calls: alley 43 draws,
  830 instances, 23 shadow-casting pools). -> small clutter made shadowless, its level 2 dropped.
- Bulevar 18.85 h: 421 / 1.47 M with, 448 / 1.51 M without (noise: traffic moved).
Batch b (small clutter shadowless, level 2 dropped; sign faces):
- Gran Via 13 h: +23 calls / +7 k tris for the clutter (was +73); min frame 29.9 vs 32.0 ms (noise).
- Barrio Hierro 13 h: 314 / 884 k with, 258 / 829 k without: +56 calls (was +131), alley
  shadow pools 23 -> 5.
- Bulevar 18.85 h: 323 / 951 k with, 288 / 941 k without (+35; min frame 26.9 vs 29.2: noise).
Batch c (far level batched across sectors; far casts no shadow):
- Bulevar 18.85 h same view: whole frame 323 -> 301 calls; far = 9 batch draws; clutter +21 calls,
  +4 k tris, min frame 32.3 vs 32.7 ms (no measurable cost).
- Gran Via 18.85 h (look -8, tilt 12): 346 calls / 1.15 M tris; near sector meshes 126 draws,
  117 shadow casters -> batch d batches the near level too (results in m-*-d.log).
Batch d (near level batched across sectors too: city-wide BatchedMeshes 'city_dressing_near',
the modelled level kept detached in a holder per sector and copied in while the view shows it):
- Gran Via 18.85 h same view: whole frame 346 -> 261 calls, 1.15 M tris unchanged; near level
  126 draws / 117 shadow casters -> 17 batch draws / 16 casters; far 9 batches. Picture
  m-granvia-d.jpg: buildings complete, towers with window detail, no grey boxes.
- Bulevar 18.85 h: 325 calls / 1.44 M tris (near 27 batches / 26 casters, far 9); tris higher than
  batch c's 0.91 M in the same view: CHECK (streaming state or per-piece culling of batched
  pieces in the shadow pass); clutter +16 calls.
- GPU smoke OK (smoke-d), city-block preview OK (block-d), no console errors. Tests 26/26.
Summary for the dressing at high, Gran Via golden hour: sector groups ~260 draws (near 126 +
far ~50 + shadow) -> 26 batch draws; whole frame 617 (13 h, batch a) / 346 (18.85 h, c) -> 261 (d).

## Next, in order
1. The tree pits (top of this note).
2. Bulevar triangles in batch d (above). Near batches: every near/far switch copies a sector's
   modelled level into the batches (a few MB); watch for hitches while driving fast.
3. Clutter draws: if still heavy in Barrio Hierro, merge small clutter objects per material
   (many objects x 2 levels x materials = ~40 draws) or cut the mix to fewer objects.
4. Per-sector texture leak check (city-world saw GPU textures grow on round trips).
5. Earlier list: landmark crowns/signs, corner-lot second frontage, hill plinths, roof props.

## Requests to other owners (seventh shift)
- city-world: expose dressing.obstaclesNear(x, z, radius, out) (and seatsNear) on openWorldCity
  for pedestrians (people walk through palm trunks: REQUESTS 08:xx).
- pedestrians: read obstacle circles {x, z, radius, kind} from it; pit trunks are 0.62 m.
- prop artist: register set_street_wear and set_yard_clutter (files landed, registry not);
  shipping containers (20/40 ft, stackable, a few paints), a quay gantry crane, a steel shed, a
  box truck / tractor unit for the port quay (QA bug 8).
- traffic / pedestrians / vehicle-system: GPU smoke at 08:50 fails on mergeGeometries uv1 type
  mismatch (sameMaterialMerge.js or pedestrianBodies.js, after the 08:45 asset rebuilds).

## Requests to other owners
- engine: engineDemonstration's palms/lamps stand on Centro's asphalt (if still in the manifest).
- city-world / pedestrians: benches and bus shelter seats are published: dressing.seatsNear(x, z,
  radius, out) (heading = compass way the sitter faces). The city does not expose the dressing
  yet: expose it (e.g. city.dressing or city.seatsNear) for pedestrians.
- plan: plan.heightAt NaN at ~100 grid points (guarded here).

## Commands
    node --test "tools/tests/city-dressing/*.test.mjs"
    /tmp/marazul/city-dressing/run-b.sh <suffix>      # GPU: smoke, measures, face close-ups (background)
    /tmp/marazul/city-dressing/run-measure.sh <suffix> # GPU: smoke + 3 measures + night
    node /tmp/marazul/city-dressing/count-names.mjs    # street names, posts, stop signs in the plan
    # gpu-capture cannot read --eval-file under /tmp: the scripts pass --eval "$(cat file)".
