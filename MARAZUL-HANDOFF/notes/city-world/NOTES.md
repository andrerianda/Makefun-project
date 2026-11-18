# city-world (open-world city system): handoff note

## Shift 10: 11:03 to ~11:22 UTC, 18 Nov (Opus 5.5). All three tasks done; smoke clean 11:21.
Tests: city-world + world-plan + hud + city-dressing + core + textures 259/259. GPU smoke clean
(smoke10.log). Entry openWorldCity.js 6138 B (6 B left; header comment trimmed to make room).
1. DECISION Gran Via = Centro: districtRegions.js GRAN_VIA_EAST_CORRIDOR (city e 760-1180,
   n -265..-70) moved from Las Lomas into Centro's outline (Las Lomas outline notched). NAMES ONLY:
   regions.zonedDistrictAt (corridor -> 'las_lomas') -> segment.zonedDistrict, used by lotPlacement
   lotRule + landmark matching, so lots/zoning/landmarks are identical seed for seed (checked with
   plan-snapshot.mjs: 2513 lots same, landmarks same; 41 lot labels + segments 33,34,346,532,533
   now centro). Gran Via t 0.21..0.80 reads Centro on carriageway, pavements, card; t < 0.2 (clinic
   stretch) and the hills stay Las Lomas. Test tools/tests/city-world/granViaCentro.test.mjs.
2. Crane rails: specialAreas.js port quay: CRANE_RAIL_OFFSETS [2.5, 32.98] (gauge 30.48, area
   craneGauge), PORT_APRON_WIDTH 36 (ring + apronWidth); railAlong() drops offset points an inside
   corner folds back (the L corner looped). terrainMesh QUAY_APRON 26 -> 38 (paved). waterfrontLayout
   railBedAt: each <=12 m rail length sits on the wall top (<5 m from shore) or the ground, + kerb
   on a road pavement. Landside rail runs on Ribera del Tamarindo's 2.2 m quay-side pavement
   (carriageway+parking edge 34 m in) for the first ~610 m: legs stand on the pavement, never lanes.
   Test portCraneRails.test.mjs.
3. Boot: ALL city paintings now go to the surface library's WORKER before generateCityPlan
   (citySectors.startCitySurfaces, called from openWorldCity init); every consumer REQUESTS its
   material (streetMaterials, laneMarkingBuilder, waterfrontBuilder, terrainMesh setOf via
   requestMaterial map/aoMap, tile = 1/map.repeat.x) so maps fill in place; a LOW job
   finishCityPaintings steps the queue (worker-failure fallback, drain after 4 s) and
   streaming.pendingCount includes surfaces.pending, so whenIdle (boot + showcase) waits: nothing
   shows placeholder. initTimings logged ("openWorldCity set-up ms ...", M.log('info')).
   GPU high, quiet machine, MARAZUL.summary().boot: openWorldCity init 1128 -> 616 ms; streaming
   phase 444 -> 493; firstFrame 3819 -> 3566 (runs 1 vs 9; machine noisy, see boot-after*.log).
   Tried: worker for everything but WAITING for it inside init = no gain (worker ~1.3x slower).
   Remaining init: plan ~300 ms, dressing creation 190-300 ms (city-dressing's).
4. citySectors passes viewCamera: view.camera to createCityDressing (city-dressing request).

## Next (shift 11)
1. Plan in a worker or cache? (~300 ms, plan has closures: hard). Ask city-dressing to slice its
   createCityDressing (~200-300 ms) into jobs.
2. city-dressing: snap crane legs to plan quay.craneRails (now 2.5 / 32.98 m, craneGauge).
3. Mirror triangles; kerb band; older items below.

Shift 9: 10:14 to ~10:52 UTC, 18 Nov (Opus 5.5). Earlier shifts: 1 05:19 streaming/terrain/streets;
2 05:47 surfaceAt, paint, waterfront; 3 06:20 signal clock, texture growth, surface batches, sand;
4 07:18 (cut off); 5 07:35 seatsNear, bridge piers, beach waterline, quay apron; 6 08:31 wet-street
mirror, asphalt grain, Mirador terrace, LANDMARK_REACHED; 7 09:29 obstaclesNear, mirror cheaper,
kerb puddles, Mirador scarp.
Tests: tools/tests/city-world 39/39, world-plan + hud 48/48. GPU smoke ~10:49 clean (smoke9b.log).
Entry module openWorldCity.js 6135 B < 6144, NOT touched (9 B left: new members go through the
`near(name)` helper or into citySectors.js / cityQueries.js / new files).

## Done this shift
1. Wet-street mirror renders a CHOSEN LIST (NEW streets/wetReflectionSubjects.js; the old
   wetReflectionCulling.js is deleted). isMirrorSubject(object, inVehicle, carried): glowing
   materials (emissive colour not black AND emissiveIntensity > 0: lamp heads lamp_main at every
   level, lit signal lamps, bus-shelter / kiosk / vending lamp panels, shop signs, car lamps),
   BatchedMesh (city-wide building batches; colorWrite-false shadow boxes out), never-culled
   non-instanced meshes (sky, sea, light glow cards, particles), car bodies (radius >= 1.2 m, opaque,
   under a `vehicle_*` root; instanced `vehicle*` material levels lod0/lod1 only). Out: people
   (skinned, and anything hanging on a bone), plants, lamp poles and every other street item, dark
   signal lamps, far car levels, wear decals. refresh(scene) walks the scene and records the
   LARGEST subtrees with nothing chosen (1 toggle for a whole crowd); a drawn-but-unchosen parent of
   chosen children is masked by layers.mask = 0. Refresh every 20 passes OR when a kept parent's
   child count / last child changed (changed(): a grown pool, a new car or person, a new wear group).
   wetStreetReflection.js: MIRROR_FRAME_INTERVAL 3 (was 2); during the pass scene.matrixWorldAutoUpdate
   = false (the frame's render just updated them) and scene.onBeforeRender = no-op (the dressing's
   sectorNearLevels hook re-ran every sector LOD, the pools pass and wear setCamera for the mirror
   camera, which also re-showed the hidden wear decals). Stats: scene.getObjectByName
   ('wet-street-mirror').userData.stats {draws, triangles, cpuMs, subjects, pruned, passes}.
2. District names agree with the road plan (NEW world/streetDistricts.js, used by cityQueries.districtAt,
   so openWorldCity.districtAt and DISTRICT_ENTERED): inside a lot -> lot.district; on a street's
   carriageway and pavements (half width + wider pavement + 1.5 m) -> segment.district; elsewhere the
   polygon. Only 16 m cells beside "boundary streets" (segments whose reach leaves their district's
   polygon; 84 of 561 centre lines straddle) call plan.nearestRoad; 0.5 us average per call.
   Calle Iguana (barrio firefight street, id 210): the polygon put its south pavement and a stretch of
   centre line in La Marisma; now Barrio Hierro along the block, also through hud's placeLineFor.
   Test tools/tests/city-world/streetDistricts.test.mjs (synthetic edge; Calle Iguana through the
   HUD's own placeLineFor; 300+ pavement points city-wide, 0 wrong). Coordinated with hud in
   REQUESTS.md (nothing for them to change).
3. Kerb puddle band checked from the lead's own on-foot camera at dusk after rain (kerb-dusk2.jpg,
   Gran Via t=0.42, 19:45, wetness 1 / puddles 0.8, lead 1.6 m from the kerb): reads as a darker
   standing-water strip along the kerb with sharp reflections; the whole carriageway is glossy at
   dusk, so the band is subtle but not wrong. Not changed.
4. Mirador de la Loma from the game's on-foot camera at sunset (mirador-foot1.jpg, 19:15, lead at
   8.5 m along the look line): brick terrace, railing, the grassy drop, Las Lomas roofs below and the
   Centro towers against the sun; lead at ~36% from the left. Works as a place; the far towers are
   the dressing's plain far level (no windows) and dominate the skyline.

## Cost table (GPU RTX 3090, Gran Via t=0.35 side 4, 22:00, wetness 1 / puddles 0.8, high,
## 1280x800; 4 interleaved blocks of 12 synchronous frames on vs pass off; shared GPU: noisy ms)
| version | frames: avg draws on / off (max) | pass draws | pass tris | pass CPU ms | avg ms on vs off |
| shift 7 final (every 2nd, whole scene, leave-out list) | ~+77 avg (505-515 / 346 pass frames) | 147 | 724 k | 3.7-8.2 | 23.48 vs 19.07 (+4.4) |
| s9 census of the old pass (10:20) | | 136 | 744 k | 5.0 | |
| s9 chosen list, 1st run (stale list leaks) | 228 / 206 (+22, max 294) | 87 | 640 k | 1.7-2.7 | 8.66 vs 7.92 (+0.74) |
| s9 + kept-parent change check | 244 / 222 (+22, max 287) | 64 | 590 k | 2.1-4.5 | 8.79 vs 6.75 (+2.0, noisy) |
| s9 FINAL (+ scene hook skipped) | 231 / 212 (+19, max 267 = +55 on pass frames) | 54 | 587 k | 1.6-2.2 | 6.40 vs 5.51 (+0.89) |
TARGET MET: +19 draws average (< +40), +0.9 ms (< +3 ms). Pass draws now: ~22 BatchedMesh
(buildings), 3 lamp heads, ~9 lit signal lamps, ~6 lamp panels, shop signs, ~6 middle cars, sky,
sea, glow, particles. Triangles stay ~590 k per pass (buildings): the next lever if needed.

## Next, in order
1. Plan question: Gran Via Marazul's west part (t <= ~0.38) is Las Lomas by the polygon AND by
   segment.district (stagingStreets says centro), so the card reads "Las Lomas / GRAN VIA MARAZUL"
   between the towers (night-s9c.jpg). If judged pictures sit there, move the Las Lomas/Centro
   polygon edge west of the tower blocks (world/plan/districtRegions.js DISTRICT_OUTLINES; plan
   owner, was in my brief at shift 7) and re-run streetDistricts.test.mjs.
2. Mirror triangles (~590 k per pass, buildings): leave the far building batches out beyond
   ~250 m, or draw only the far cards' lit-window material.
3. Kerb band: if showcase wants it stronger at dusk, raise its darkening (kerbPuddles.js
   diffuseColor *= 0.45 -> 0.35) or give the band a faint bright rim at its outer edge.
4. Older: beach damp edge, shop fronts for pedestrians, spawnPointsNear spacing.

## Known problems / requests
- city-dressing: sectorNearLevels' scene.onBeforeRender runs every sector LOD update + pools pass
  for EVERY perspective camera (water depth capture and any other camera too); the mirror now
  skips it, but the hook should check it is the view camera (REQUESTS.md 10:50).
- ATMOSPHERE (engine): wet-road lamp pools still give an amber wash at night (unchanged).
- A GPU capture (kerb-dusk1, 10:26) hung past its timeouts on the shared machine; I killed my own
  gpu-run (pid by `ps -eo pid,lstart,args | grep city-world`) and the retry took 30 s.

## Commands
    cd /home/user/Makefun-project
    D=/tmp/marazul/city-world
    /opt/marazul-tools/gpu-capture capture --size 1280x800 --keep-going --timeout-ms 400000 --eval-timeout-ms 300000 \
      --page "index.html?time=22&weather=clear&quality=high&seed=1&autostart=1&t=0.35&side=4&up=1.75&down=8" \
      --eval "$(cat $D/night3.js)" --out $D/night-x.jpg     # mirror cost on/off + pass census
    # mirror-census.js: per-object material facts of one pass (old-pass census: census.log)
    # kerb.js (page &time=19.75&t=0.42): the lead on the pavement by the kerb, game camera
    # mirador2.js (page &time=19.25): the lead at the Mirador railing, game camera
    node $D/district-probe.mjs; node $D/granvia-district.mjs   # district lookups in Node
    node --test "tools/tests/city-world/*.test.mjs"; node --test "tools/tests/world-plan/*.test.mjs"
    /opt/marazul-tools/gpu-capture smoke --out $D/smoke.jpg
Pictures: night-s9c.jpg (final mirror, 1280x800), kerb-dusk2.jpg, mirador-foot1.jpg, census.jpg.
