# vehicles handoff note (everyday cars: compact_hatch, family_sedan, taxi_cab, police_cruiser, luxury_sedan, suv, police_suv)

Brief: /tmp/marazul/briefs/v2/V1-everyday-cars.md. Shift 06:22 to ~06:38 UTC, 18 Nov.
This note describes the real tree at hand-back. ALL SEVEN CARS ARE BUILT AND REGISTERED.

## Finished and registered (game/src/assets/registry/vehicles.js)
| id | tris lod0/1/2 | draws lod0 | bytes | wheel r | wheelbase | track | seats | built |
| family_sedan | 19,064 / 4,596 / 1,100 | 36 | 800,820 | 0.335 | 2.76 | 1.58 | 4 | build7 06:10 |
| police_cruiser | 21,776 / 4,795 / 1,200 | 42 | 921,056 | 0.35 (steel) | 2.96 | 1.64 | 4 | build7 06:10 |
| taxi_cab | 20,068 / 4,695 / 1,150 | 43 | 813,428 | 0.335 (steel) | 2.76 | 1.58 | 4 | build7 06:10 |
| suv | 19,740 / 4,695 / 1,150 | 37 | 853,968 | 0.38 | 2.86 | 1.68 | 4 | build9 06:35 |
| police_suv | 21,808 / 4,895 / 1,200 | 43 | 932,600 | 0.40 (steel) | 3.02 | 1.73 | 4 | build9 06:35 |
| compact_hatch | 18,632 / 4,396 / 1,000 | 36 | 792,068 | 0.30 | 2.51 | 1.48 | 4 | build9 06:35 |
| luxury_sedan | 20,410 / 4,773 / 1,150 | 36 | 898,416 | 0.35 | 3.11 | 1.64 | 4 | build8 06:30 |
Budgets (ASSET['budget'] = registry max*): sedan 22000/40/1.1M; cruiser 23500/46/1.25M;
taxi 23500/44/1.25M; suv 23000/40/1.2M; police_suv 24500/46/1.3M; hatch 21000/40/1.1M;
luxury 23000/42/1.2M. Tests 06:37: 212 pass, 1 fail = buildings/kit_downtown_commercial.glb
unregistered (another domain, not ours). Vehicles total 6,020,548 bytes.
Sheets: /tmp/marazul/assets/preview/<id>_sheet.jpg (views 145,14 / three_quarter / side / 200,24@1.4).

Stale-by-hash only (output unchanged, no rebuild needed): family_sedan, taxi_cab, police_cruiser
(their helpers changed: _car chrome flag, new _police.py, _platform.suv()). Rebuild them with the
next real change.

## What changed this shift
- _police.py (new): roof_height, light_bar(spec, mats, y, depth, half, foot_x, pods) ->
  (objects, top), spotlight, push_bar(shell, mats, x, low, top, cross, probe, pad,
  wing=(z, half width) for a full-width ram bar), cage_bars(shell, mats, stations).
  police_cruiser.py uses it with its old values (identical geometry, 11,738 modelled tris).
- _platform.suv(): the SUV description moved out of suv.py; police_suv derives from it.
  Bonnet lifted 0 at the cowl -> 6 cm at the nose, nose_bow 0.04 (was estate-like).
- _car.materials: spec['chrome'] adds mats['chrome'] (plated_chrome, atlas) for non-police cars.
- police_suv.py: derive(suv(), tail -2.43, axles +-1.51, nose 2.48, width 2.01, heights
  1.155->1.20, 1.732->1.79); steel wheels 0.40, arch 0.445, clearance 0.22. Livery #F2F0E8 +
  #1D4E7A on the four door skins; white roof with anchor_decal_roof (facing up, y -0.95) for
  the roof number. Light bar y -0.04 half 0.62; ram bar uprights x 0.33 (0.36-0.98), cross
  tubes 0.62/0.84, wing tube z 0.48 to x 0.80; cage bars y -1.0..-0.22 behind rear glass.
- compact_hatch.py: own curves; screen moved back after the first sheet (read as a mini MPV);
  cabin shelf 0.13 (0.3 poked out through the tailgate). Big wrap headlamps, corner tail lamps
  joined by a high lamp bar.
- luxury_sedan.py: derive(saloon(), tail -2.43, axles +-1.555, nose 2.50, width 1.93), 7-spoke
  0.35 wheels; plated window surround (spec['paint'] chrome on cols RAIL and GLASS), tall grille
  with plated vertical bars + top bar on bumper_f, full-width tail band. Sheet good first time.

## Next steps, in order
1. SIZE (brief: ~480 kB per car, 3.4 MiB for seven; now 790-930 kB, 6.0 MB). Measured on
   family_sedan.glb (scripts: /tmp/marazul/vehicles/scripts/glbsize.py, glbverts.py, run with
   python3 -I <script> <glb>): textures only 36 kB; geometry ~20 B/vertex + 6 B/triangle
   (pipeline: float positions, no Draco). 22,185 vertices: lod0 7,934, lod1 5,667 (1.23
   verts/tri: atlas seams), bumper_f 2,341 (nose cap + lamp units), wheel 1,690 (shared),
   lod2 1,343, door_fl/door_fr 583 each (separate copies), hood 485, steering wheel 470.
   480 kB needs about 14-15k vertices: a third fewer. Plan, cheapest first: lod1 targets to
   ~4,000 (~-25 kB); steering wheel and seat bevels lighter (~-10 kB); share flange vertices
   in _body (the panel shut-gap flanges triple the vertices along every cut); lamp units
   lighter (fewer pod segments). Then rebuild all seven in one command (~7-8 min GPU).
2. Polish: suv/police_suv slimmer, taller head lamps; hatch still a little MPV-like (could
   shorten the roof at the rear and drop it more); taxi partition; trunk shut line, plate
   recesses, exhaust tips, wipers, door cards, black police handles; blacked-out (not plated)
   hub caps on police_suv (needs a mats override in _car.materials).
3. Engine check of the three new cars in the asset viewer (lamps=0), not done this shift.

## Decisions (why)
- Mirrored halves: body, hood, trunk, bumpers, windscreen, rear glass; door_fr, window_r,
  wheel_fr baked once and copied. Anything that differs left/right goes in a whole new part
  (light_bar, roof_sign). A fitting for a mirrored part is modelled as its right half only
  (luxury grille top bar: half width from x 0, no bevel at the seam).
- Tailgate cars (suv, police_suv, compact_hatch): the tailgate face is the tail cap; the cabin
  shelf must end before the tail (rear - shelf > tail).
- Lamp lens at level 1 only: lod2 shows the recessed bed without glass (no extra draw).
- Seat anchors at floor + 0.31; driver on the left (-X).

## Commands (from the repository root)
- local check: /opt/marazul-blender/bin/python /tmp/marazul/vehicles/probe.py check <id>
- build: /opt/marazul-tools/gpu-run --timeout 1500 -- /opt/marazul-blender/bin/python art/build_assets.py build <ids...> --preview --view=145,14 --view=three_quarter --view=side --view=200,24@1.4
  (views: azimuth from the front towards the right; @zoom@x,y,z focus in BLENDER coordinates;
  3 cars took 150-200 s with the GPU warm)
- tests: node --test "tools/tests/assets/*.test.mjs"
- engine (lamps off): node tools/capture.mjs --root . --size 960x540 --page "tools/preview/asset-viewer.html?asset=police_suv&lamps=0&shots=145,14@1;35,8@4.5@0.62,0.62,-2.2" --out /tmp/marazul/vehicles/police_suv_engine.jpg
