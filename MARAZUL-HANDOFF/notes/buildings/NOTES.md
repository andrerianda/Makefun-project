# buildings (BK1 street building kits): handoff note

Shift 9: 10:15 to 10:49 UTC 18 Nov (Opus 5.5). Consistent state at the end: all four kits rebuilt
on the GPU (10:40, --jobs 2 --preview), registered, asset tests 479 pass / 0 fail, REQUESTS.md
note to city-dressing written (~10:48). No process left running.

## Done this shift
- kit_residential: 33 modules (was 25 built). Villa: ground_wall_4_b (arched loggia),
  ground_entrance_4_b (portico), upper_window_4_d (french doors + balustrade). New:
  ground_entrance_4_c (house door on a raised timber porch, posts, spindle rails, 18-degree clay
  shed roof; sign + light anchors), ground_stair_8_a (slot 'ground_stair', 8 m: 20 open treads
  on two stringers from local x -3.7 at the pavement to the landing at x 2.5; ground-flat door
  under the landing; light anchor) + upper_stair_4_a (slot 'upper_stair': door + transom onto
  the landing, sash + AC; storey 1 over the RIGHT 4 m half of the stair bay; light anchor),
  carport_4_a (slot 'carport', lean-to, posts 5.3 m out, yard 5.8), roof_prop_1_b (stucco
  chimney, paint_wall; the condenser still wins pickModule(roof_prop, 1)).
  Built: 673,736 bytes, lod0 6,684 tris / 114 draws, lod1 217 / 50 (budget 16000 / 220 / 1.25 MB).
- Downtown upper_window_4_c: card lamp (-1.2, 0.85, 1.2, 2.45) with panes; engine at 75 m:
  lod1 matches lod0, no pale pane.
- _facade.py: rain_streaks(); facade_stucco(rain=, grime=); FacadeMaterials(rain_up=,
  rain_ground=, grime=). Deco (strength 0.75, grime 0.62), downtown (0.9, 0.66), barrio (0.95,
  0.72). Residential keeps its own render().
- Registry: module table + anchors for all 8 additions; comment describes villa / porch / stair
  pair / carport / chimney use. tests 479/479.
- Engine picture (low warm sun): out/s9_engine.jpg (villa; house with porch, stair, carport,
  chimney; barrio + deco streaks; downtown lod1 vs lod0 at 75 m). Cycles sheets of the built
  files: /tmp/marazul/assets/preview/kit_*_three_quarter.jpg.

## Next (in order)
1. Look closer at the porch (ground_entrance_4_c): the shed roof's soffit sits 5-10 cm above the
   front beam (no rafters between): add rafter ends or lower the roof's front edge onto the beam.
   Check the carport close up (roof reads thin from the street).
2. tile_roof_pitched as a real tile set (clay_roof is an atlas material only).
3. Toward 45 modules: second porch (2 m), garden wall with gate, villa corner (rounded tower?),
   barrio stair landing module.
4. Check the streaks on the older kits in the real game on Gran Via / Barrio Hierro at 768x480;
   tune strength if they read too dirty on the deco hotels.

## Engine view tool (scratch)
scripts/engine_building.js + a cfg (props x/z RELATIVE to the building's cx/cz, optional y):
  /opt/marazul-tools/gpu-capture capture --root . --page "tools/preview/asset-viewer.html?asset=kit_residential" --size 960x540 --eval "$(cat /tmp/marazul/buildings/scripts/cfg_s9.js /tmp/marazul/buildings/scripts/engine_building.js)" --out /tmp/marazul/buildings/out/s9_engine.jpg
Card check: /opt/marazul-blender/bin/python -I scripts/card_crop.py game/assets/buildings/<kit>.glb /tmp/marazul/assets/work/<kit>/<kit> out/x.png <module> ...

## Commands
- source check (CPU ~60 s): `/opt/marazul-blender/bin/python art/build_assets.py preview kit_residential --source --view=20,8@3@-14,22,2`
  (source layout: ground row y=22 from x=-24, upper row y=11 z=2; see out/s9_res_source2.log views)
- build: `/opt/marazul-tools/gpu-run --timeout 1800 -- /opt/marazul-blender/bin/python art/build_assets.py build <ids> --jobs 2 --preview`
  (residential 408 s, others 180-225 s; gpu-run returns files only when the whole command ends)
- tests: `node --test "tools/tests/assets/*.test.mjs"`

## Older notes still valid
- Ground storey 4.2 m (buildingMeshAssembly.js). Assembler: bays 4 and 2 m; ground and top take
  variant 0 of a slot (sorted by name); upper storeys take upperVariant per building (so
  upper_window_4_d is the 4th residential variant); garages take column % count. Slots
  ground_stair, upper_stair, carport, eave, gable_end, top_crown are opt-in.
- Wear keyed to object Z (module coordinates): keep windows on the sills the kits pass.
- gpu-run does NOT forward env vars.
