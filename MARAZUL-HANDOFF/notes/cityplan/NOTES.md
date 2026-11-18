# cityplan handoff note (agent 6, shift 05:47-06:10 UTC 18 Nov; stopped at a consistent state)
State: consistent. `node --test "tools/tests/world-plan/*.test.mjs"` -> 17 of 17 pass (06:04 UTC, after the last code change;
only docs changed since). Game smoke (tools/smoke-game.mjs) clean at 06:09 (0 errors, ready). Preview captures without errors.

## Done this shift
1. Authorship repair: the nine files the predecessor patched with Python were retyped in full with Write
   (cityPlanGenerator, cityPlanPainter, pedestrianGraph, roadLayoutDistrictStreets, specialAreas, terrainConforming,
   tools/preview/city-plan.html, tools/tests/world-plan/cityPlan.test.mjs, groundAndGraphs.test.mjs). Every change since is
   Write/Edit only. Small improvements: painter palette gained promenade/pier/quay/marina/runway colours and zone.parking
   (fields added, none renamed); a dead line removed in the lots test.
2. heightAt NaN/Infinity fixed. Cause: conformTerrain's last blend divides sums of eighth-power weights held in Float32Arrays;
   at the outer edge of a bank the weights underflow (0/0 = NaN, denormal/0 = Infinity): 28 samples of the 4 m grid (112
   lookup points, incl. x -440 z -1176 and x -864 z 812). Fix: MIN_WEIGHT_SUM = 1e-30 guard, skip the sample when the sums
   say nothing, write only finite results. Test 'the ground is finite everywhere' (every sample, 3.7 m lookup grid 600 m
   past the extent, rings out to 1e6 m, normals, a second seed).
3. lotPlacement.js:
   - AUTHORED_SITES by landmark kind (street key, `at` city point, `toward` city point for the side, setback, sizes) placed
     BEFORE all other landmarks (sort key), falling back to the normal search: pier (lot on the beach at e 200 behind the
     promenade, 64x58, deck starts in it), shopping_mall (superblock e 310..520 n -690..-520, 140x150), plaza (civic
     half-block east of Avenida de los Fundadores, 140x84; city hall faces it from the west side), stadium (new superblock
     e -470..-250 n 420..660, 190x196, on Avenida del Riel), airstrip (west of Camino de la Pista, south of the runway's
     east end; only 64x80 fits because the road curves).
   - Lot hash: a lot is filed under every 96 m cell its bounding box touches and a new lot queries its own box cells
     (the old centre-cell +-1 lookup missed overlaps with lots over ~150 m).
   - addSideFrontages(): corner lots get 1-2 more frontages (side edges in ring order along the other street of the
     corner, gap <= 10 m from its corridor, parallel within acos 0.85): 811 of 1041 corner lots.
4. roadLayoutDistrictStreets.js: calle_540 split into calle_540 (-1080..-470) and calle_540_b (-250..520) for the stadium.
5. docs/CITY_PLAN.md updated (stats, frontages, heightAt finite, authored sites, "Not there yet").
Stats: 76.3 km road, 561 segments, 305 intersections (67 signals), 1408 lanes, 2531 lots, 87/87 landmarks, no diagnostics.
Time ~440 ms warm, ~840 ms cold under load 4.9.

## Next steps, in order
1. Authored sites for the bus terminal (free superblock e -250..-30, n 340..540 from the ns_-140 gap: front avenida_del_riel
   at n 420? check: the gap block is n 340..540 between calle_del_mercado e -250 and centro_ns_-30), container terminal and
   shipyard (Puerto Tamarindo, on the quay side; look at the port geometry first), maybe a bigger airstrip site.
2. Diagonal avenue through Centro, node to node (see predecessor's list of junctions e,n: -250,-430 / -140,-350 / -30,-265 /
   85,-180 / 200,-95 / 310,-10 ... note ew_-10 is cut between 85 and 310 and the plaza now fills e 200..310 n -95..75, so
   route around it or end the diagonal at the plaza). designIntersections only knows 2 signal phases: give 5-6 arm junctions
   a third phase first; tests assert phases.length === 2 and conflictPhase 0/1 (update them).
3. Generation time: conformTerrain ~60 ms, terrain ~240 ms; cold ~0.8 s.
4. Rail tracks north of Avenida del Riel, container yards, yacht-club docks, beach polygon.
5. Pavement graph: 3 components, long crossings at big highway junctions (see predecessor note).

## Known problems
- The mall leaves a strip of small lots between it and the avenue at e 520; fine for now.
- Coastal landmarks found by the ordinary search may still overlap the promenade strip (sea side of Bulevar Dorado);
  fillStreets keeps that side free, only landmark search does not check it.
- Lot pads level at the street height of the entrance: wide lots on 10 percent streets sit up to ~1.5 m off at their ends.

## Commands
- node --test "tools/tests/world-plan/*.test.mjs"
- node /tmp/marazul/cityplan/huge.mjs        (huge/large landmarks: city position, size, street; runway vs airstrip)
- node /tmp/marazul/cityplan/corner.mjs      (timing, digest, corner lots with side frontages)
- node /tmp/marazul/cityplan/time.mjs        (4 timed generations + stats)
- node /tmp/marazul/cityplan/nan.mjs [seed]  (non-finite heights)
- node tools/capture.mjs --root . --size 1100x1000 --page "tools/preview/city-plan.html?e=200&n=-350&span=1300&kinds=1" --out /tmp/marazul/cityplan/centro.jpg
- node tools/smoke-game.mjs --out /tmp/marazul/cityplan/smoke.jpg
