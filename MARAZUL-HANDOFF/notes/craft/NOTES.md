# craft handoff note (V3: sport_motorcycle, chopper_motorcycle, speedboat, police_boat, police_helicopter, news_helicopter)

Brief: /tmp/marazul/briefs/v2/V3-bikes-boats-helicopters.md (+ UPDATE.md through the eleventh update).
Shift 8: 09:29 to ~10:00 UTC, 18 Nov. Asked: speedboat (with the motorcycle fixes), then
news_helicopter (rotor_main + blur disc, livery of the catalogue's invented channel Canal 6 Golfo,
no searchlight), then police_boat. Fourth judged picture = city from the sea at dusk with a boat
or helicopter in frame. Build WITHOUT --preview until the asset-pipeline owner fixes Draco import.

## FINAL STATUS shift 8 (09:56 UTC) - all four asked items done and sealed (commit 984082a)
- speedboat, news_helicopter, police_boat: BUILT, REGISTERED, checked in the engine (asset
  viewer): /tmp/marazul/craft/speedboat_engine1.jpg, news_engine1.jpg, police_boat_engine1.jpg;
  sport_motorcycle rebuilt with the fixes: moto_engine2.jpg. Source sheets: speedboat_source2.jpg,
  news_source1.jpg, moto_source2.jpg.
- news_helicopter 205,184 bytes, 11,944 / 4,119 / 1,995 tris, 22 draws (cap 17000/26/430000).
- police_boat 260,452 bytes, 12,084 / 5,583 / 2,958 tris, 16 draws (cap 16000/20/430000).
- Asset tests 09:54: every craft entry passes; 3 failures belong to others (kit_residential
  names, characters/circle_enforcer.glb unregistered).
- REQUESTS.md: "Added ~09:47 UTC by craft" (speedboat, motorcycle) and "Added ~09:56 UTC by craft"
  (news_helicopter, police_boat) for vehicle-system, showcase, police.
- asset-pipeline FIXED --preview at 09:40 (REQUESTS "Added ~09:52 by asset-pipeline"): use
  `build <ids> --gpu --preview --view=...` again; `build --gpu` now defaults to --jobs 2. The lib
  change made speedboat and sport_motorcycle stale once (built 09:34, before the fix): name them
  only when they change.
- Known look issues to improve: police_boat wheelhouse glass reads pale in the viewer (raise
  opacity / darker tint), radar arch thin; speedboat hull sweep is a plain band; sport_motorcycle
  fairing top still has a light notch at the nose (mask predicate) and reads a little chunky.

## Status at 09:44 UTC (kept for the history)
- police_helicopter: FINISHED, REGISTERED (233,752 bytes).
- sport_motorcycle: REBUILT 09:34 with the fixes (narrower sharper fairing nose and lower
  fairing; flat box-section spars via B.beam; dark frame 0.09; small front indicators; dark
  mirror housings; wheels 28 segments, discs follow `segments`, sprocket 24):
  11,524 / 7,844 / 5,939 tris, 13 draws, 255,836 bytes. Registered (comment updated).
- speedboat: BUILT 09:35 and REGISTERED: game/assets/boats/speedboat.glb 243,748 bytes,
  11,104 / 5,588 / 2,967 tris, 13 draws. Changes before the build: sleeker hull keys (lower aft
  sheer 0.88, narrower bow), a tapering hull sweep that ends before the stem (no patches at the
  bow), teak cockpit sole and aft deck (deck_teak) for contrast. Asset tests 09:37: 360/360 pass.
  NOTE: in `preview --source` sheets the convex collider col_hull_hull is drawn as a flat white
  lid over the cockpit (no material). It is not in the game; ignore it in source sheets.
- news_helicopter: SOURCE WRITTEN (helicopters/news_helicopter.py), local check OK
  (11,976 tris at lod0 with interior/doors/rotors). GPU build submitted 09:44 (build_s8b.log).
- police_boat: SOURCE WRITTEN (boats/police_boat.py), local check OK (12,084 tris). GPU build
  submitted 09:44 with news_helicopter.
- chopper_motorcycle: not started.

## Pipeline bug (reported in REQUESTS.md by the previous shift)
`build --preview` / `preview <id>` crash re-importing the Draco .glb in Blender. Use
`preview <id> --source` on gpu-run and the asset viewer through gpu-capture.

## Designs
### speedboat (Blender axes, waterline z 0, mid hull y 0)
hull y -4.30 (transom) to +4.75 (stem), outboards to -5.22; beam 2.72 at sheer; keel -0.45;
sheer 0.88 aft, 0.94 amidships, 1.30 bow; sole 0.22; helm to starboard x 0.60; engines x +-0.34,
pivots (x, -4.40, 0.62), prop hubs (x, -5.12, -0.30). Nodes lod0-2, engine_l/_r, propeller_l/_r,
steering_wheel (empty) + steering_wheel_mesh. Anchors seat_driver, seat_passenger_1..3, board,
wake, spray_l/_r, light_head_l, light_tail_l, camera. col_hull_hull.
### police_boat (catalogue Olabarria Rompeolas 36: 11.0 x 3.3, draught 0.7)
hull y -4.90 to +5.20 (10.1 m), keel -0.68, sheer 1.08 aft / 1.13 mid / 1.52 bow, sole 0.42;
grey foam collar r 0.25 on the sheer round the bow (beam 3.32 over it); wheelhouse y -1.10..1.45,
half width 0.98, sill 1.42, roof 2.42, reverse-raked front with 3 screens (mullion rods), long
side windows, back windows beside a solid door panel; light bar on the roof (lamp_siren_a -X red,
lamp_siren_b +X blue) at y 0.95, anchor_siren above it; searchlight drum fixed on the roof front
(lamp_searchlight lens, anchor_searchlight at (0, 1.53, 2.62) spot 140 m 9 deg); radar arch with
radome; outboards scale 1.12 at x +-0.44; guard rail behind them; bow post, towing bitt, fenders
aft. Decal anchors on the white topsides under the collar (x +-1.39, y -0.30, z 0.56, 2.6 x 0.40).
Colliders col_hull_hull, col_box_cabin. Materials atlas, paint, paint_secondary, glass, lamp_head,
lamp_nav_red, lamp_nav_green, lamp_tail, lamp_siren_a, lamp_siren_b, lamp_searchlight.
### news_helicopter (catalogue Golfo Aero Libelula, Canal 6 Golfo livery #F1EFEA / #C2337A / #2B2F36)
Teardrop pod nose y 3.42 to boom end -5.95, fin to -6.7; pod half width 0.75; bubble canopy
(glass for y > 0.95, rel 0.42-0.975, frames at the door edges and a centre strip); 3-blade main
rotor r 4.90 hub 3.05; open 2-blade tail rotor r 0.80 at (-0.21, -5.98, 2.12) on the left of the
fin (built in news_helicopter.tail_rotor, spins about X, blur annulus); skids x +-0.98; camera
ball under the nose at (0, 2.88, 0.34); antenna pods on the belly sides, belly dish, no sirens,
no searchlight. Same nodes/anchors/colliders/materials as police_helicopter minus searchlight,
sirens and lamp_searchlight.

## Next steps, in order
1. (done 09:50) news_helicopter and police_boat registered.
2. Polish for the sunset sea picture if showcase uses a boat: police_boat darker wheelhouse
   glass and a sturdier radar arch; speedboat a livelier hull graphic. Rebuild with --preview.
3. chopper_motorcycle from _bike.py (catalogue: 2.46 long, wheelbase 1.76, wheel r 0.33, seat
   0.68; raked long fork, teardrop tank, air-cooled twin, swept bars, fishtail pipes).
3. Lighter far levels for the moving parts (wheels / engines show at every level).

## Commands (from the repository root)
- source sheet: /opt/marazul-tools/gpu-run --timeout 600 -- /opt/marazul-blender/bin/python art/build_assets.py preview <id> --source --view=35,14 --view=150,12 --view=side --view=front
- local checks: /opt/marazul-blender/bin/python /tmp/marazul/craft/probe.py check <domain> <id>
  and /opt/marazul-blender/bin/python /tmp/marazul/craft/parts.py boats <id> (body parts with bounds)
- build: /opt/marazul-blender/bin/python art/build_assets.py build <ids> --gpu --jobs 2   (no --preview)
- engine picture: /opt/marazul-tools/gpu-capture capture --root . --size 960x540 --page "tools/preview/asset-viewer.html?asset=<id>&shots=35,14@1;150,12@1;270,6@1" --out /tmp/marazul/craft/<name>.jpg
- tests: node --test "tools/tests/assets/*.test.mjs"
