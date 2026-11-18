# vegetation: handoff note

Shift 9 (10:15 to ~10:48 UTC, 18 Nov). Area `vegetation` (also owns leisure: art/blender/assets/leisure/**,
game/assets/leisure/**, game/src/assets/registry/leisure.js). build --preview WORKS again (Draco-safe).

## END OF SHIFT 9 (10:40): built, registered, asset tests 479/479 passing
- shrubs_tropical (2,088 tris) and street_tree_narrow (4,112) rebuilt 10:30: blue-grey crown TOPS
  fixed in the SPEC: matte leaves (gloss 0.10-0.14), crown light (0.1, 0.3, 0.85) / (0.15, 0.35, 0.8),
  shrub leaf albedo up a little (0.058,0.115,0.022 / 0.075,0.135,0.026). Cause: dark glossy leaves
  under the studio sky -> the grazing sky reflection beat the diffuse. Before: shrubs_engine2/3.jpg,
  narrow_engine2.jpg (narrow tree's UNDERSIDE was already warm green). Not re-captured after the fix.
- NEW fan_palm (fan_palm.py + helper _fanpalm.py on top of _palm.py): fan leaves modelled segment by
  segment (costapalmate, 38-46 pleated segments over ~200 deg, split drooping tips) baked on cards
  fan_a / fan_b / fan_dead; crown via _palm.add_crown; SKIRT of hanging dead fans (spec['skirt'] rows x
  per_row, per variant 'skirt_rows'). First build 10:30 (fan_palm_three_quarter.jpg): pale thin pole
  trunk, small crown, short skirt -> revised SPEC (darker thicker trunk, 24 longer fans, 4 x 8 skirt,
  variant_a 5.8 m trunk): dry run 3,348/1,270/24 and 2,772/950/24 tris. REBUILD = build14 (started
  10:31, GPU queue busy). The registry (vegetation.js fan_palm, maxTriangles 6400) already describes the
  REVISED file (heights 8.4 / 10.4 m, crown 6.7 / 6.5 m). If build14 did not land, the older file
  (4,968 tris) is in game/assets: rebuild fan_palm first next shift.
  (fan_palm.py's docstring was edited after build14 was sent: its cache hash is stale; harmless.)
- set_beach part two (helper _beach_gear.py): surfboard, surfboard_rack, beach_shower (anchor_use,
  anchor_water), kayak, pedal_boat (anchor_seat_1/_2), court_lines (16 x 8 m tape), beach_bin,
  beach_bin_recycle. Built 10:30: 10,838/3,709 tris, 21 draws, 262 kB. Registered (leisure.js now
  builds node lists with setNodes()). Cycles sheet: /tmp/marazul/assets/preview/set_beach_three_quarter.jpg
  (whole row, far). Engine close-ups: /tmp/marazul/vegetation/beach2_engine.jpg (capture queued 10:38).
- NEW set_waterfront part one: promenade_bench, bench_backless, railing_2m, railing_post,
  promenade_lamp (lamp_main, anchor_light), pier_kiosk (paint_canvas flaps, anchor_sign, anchor_use).
  Built 10:30: 1,458/486 tris, 8 draws, 128 kB. Registered. Sheet:
  /tmp/marazul/assets/preview/set_waterfront_three_quarter.jpg (reads well: kiosk, lit lantern, benches).
- REQUESTS.md: "Added ~10:40 UTC by vegetation (shift 9)" for city-dressing + showcase.

- 10:45 UPDATE: build14 LANDED (fan_palm 6,120/2,220/48 tris, 4 draws, 177 kB, registry matches);
  tests 479/479 pass. Engine look /tmp/marazul/vegetation/fan_engine.jpg: pleated fans on long petioles,
  straw skirt, brown trunk, green from below: reads as a fan palm. Crown a bit open, skirt a bit stringy.
  The set_beach engine capture (beach2_engine.jpg) timed out TWICE (exit 124 after 300/420 s) while a
  fan_palm capture started later finished in ~3 min: maybe the zoomed set shots hang the viewer; try
  fewer shots / zoom <= 6 next time. Nothing of mine is left running.

## Next steps, in order
1. Engine captures of set_beach part two (close-ups) and set_waterfront, and of the shrub / narrow tree
   tops after the fix; fan_palm: a slightly denser crown (count 28) and less stringy skirt (ragged 0.3).
2. set_waterfront part two: dock section 4 m on piles with a ladder, mooring bollards and cleats,
   life-ring post, harbour light (lamp_main + anchor_light), channel buoys (lamp_beacon), coiled rope,
   lobster traps, fish-cleaning table, coin telescope; static boats (rowing boat, small yacht, cabin cruiser).
   Waterfront detail: the bench could get armrests, the railing a bottom rail; kiosk interior shelves.
3. More shrubs_tropical variants (croton, bird-of-paradise, agave, yucca, topiary ball, oleander).
4. set_beach rest: windbreak, cooler, beach balls, sandcastle, rescue board, catamaran. Then set_park.

## Pipeline problems
- build.box names its UV layer differently (props found it too): _leisure.single_uv() works around it.
- The GPU queue was busy 10:31-10:40 (captures by many agents): a gpu-capture waited > 5 min.

## Commands
- Dry run plants (local, ~30 s): /opt/marazul-blender/bin/python /tmp/marazul/vegetation/scripts/dry.py <ids>
- Dry run leisure sets: /opt/marazul-blender/bin/python /tmp/marazul/vegetation/scripts/dry_leisure.py set_beach set_waterfront
- Build: /opt/marazul-tools/gpu-run --timeout 1500 -- /opt/marazul-blender/bin/python art/build_assets.py build <ids> --jobs 2 --preview
  (one plant ~75-100 s on the GPU, a set 35-80 s, plus queue)
- Engine look: /opt/marazul-tools/gpu-capture capture --root . --size 960x540 --page "tools/preview/asset-viewer.html?asset=<id>&shots=35,12@0.8;30,4@2.2@0,0.8,0;200,30@1.2" --out /tmp/marazul/vegetation/<name>.jpg
  (shot = yaw,pitch@zoom[@focus x,y,z in game axes]; for a set, zoom ~10-13 with the object's x as focus)
- Tests: node --test "tools/tests/assets/*.test.mjs"
