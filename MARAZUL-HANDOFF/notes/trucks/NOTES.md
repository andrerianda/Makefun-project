# trucks handoff note (pickup_truck, offroad_4x4, cargo_van, ambulance, swat_van, box_truck, city_bus)

Brief: /tmp/marazul/briefs/v2/V2-trucks.md (+ UPDATE.md, sixth update). Shift 05:47 to ~06:15
UTC, 18 Nov. This note describes the real tree at hand-back.

Order this shift was asked for: ambulance and swat_van first (police programmer needs them), then
city_bus, then cargo_van and box_truck. pickup_truck and offroad_4x4 after those.

## Finished and registered (game/src/assets/registry/trucks.js; import + spread in index.js)
| id | tris lod0/1/2 | draws lod0/1/2 | bytes | wheel r | wheelbase | track | seats |
| ambulance | 16,674 / 4,798 / 1,200 | 37 / 12 / ~7 | ~622 kB | 0.38 | 3.76 | 1.74 | 4 |
| swat_van | 16,792 / 4,798 / 1,200 | 41 / 12 / 7 | ~637 kB | 0.48 | 3.92 | 1.98 | 8 |
Textures: base 1024, ORM 512, normal 512 (WebP). Budgets (ASSET['budget'] and registry
maxTriangles/maxDraws/maxBytes): 20000 / 48 / 680,000 each.
Build3 (06:11, current source, painted rear walls) LANDED: ambulance 623,364 bytes, swat_van
640,396 bytes, both "built", nothing stale. Asset tests at 06:11: 183 pass, 0 fail.
Known problem: in the sheets a thin dark vertical strip still shows at the rear-left corner of the
box (both vans), top to bottom. It is NOT the rear cap material (now paint). Suspects: the cap's
outer ring sharing vertices with the side (normals or AO inverted there), or the door slab edge.
Check with a close shot (--view=200,10@2.5@-1.1,-3.3,1.5) before changing anything.

Sheets: /tmp/marazul/assets/preview/{ambulance,swat_van}_sheet.jpg (rear 3/4 chase 145,14; front
3/4; side; close rear 215,8@1.5). Both read as real vehicles: stance, wheel size, cab/box
proportions OK.

## Source (art/blender/assets/trucks/)
- _grid.py: Mesh (faces with material name + `keep_lod` tag; vertices shared by position, which
  matters: unshared vertices doubled the file to 1 MB), Mesh.panel / Mesh.block (evenly cut flat
  panels and boxes, per-cell material callback), loft(keys, assign, levels, arches, step,
  level_step, n_arc, n_top) = the sectioned hull: key stations (y, w, zb, zt, rt, rb) interpolated
  to <= step, side rows at fixed heights `levels` clamped under the top corner (so a bonnet or a
  raked windscreen folds the upper rows away), arches cut and edge vertices snapped onto the arch
  circle, caps of concentric rings; assign(Face) -> (part, material, level) divides it into
  doors / hood / glass / bands. Face has x,y,z,n,w,rt; on_side(), on_top(margin), inside().
  arch_liner(mesh, y, z, r, x_outer, depth, mat, flare) = wheel well + proud lip.
  Also tag, part, single_uv, delete_faces, weld, drop_unused_materials, shrink.
- _truck.py: materials(spec) (paint, paint_secondary if secondary_color, glass, lamp_* incl.
  lamp_indicator_l/r, lamp_siren_a/b if sirens, liner, trim, grille, seat, tyre, steel, chrome,
  chassis, tread, pipe); wheel(... twin=) (tyre with groove and shoulders, steel dish, vents,
  dome, nuts, drum; twin adds an inboard tyre for box_truck/bus); lamp_unit (bezel + cells across
  x or up z), light_bar (siren_a on -X half, siren_b on +X, white take-down centre), beacon,
  van_mirror (two arms + tall head), seat, steering_wheel, rail (tube), rounded_block, box,
  plate_recess, chassis (rails, axles, diff, tank), exhaust; door_panel (shrink 6 mm + solidify
  inward), lid_panel; make_truck(a, spec, parts, mats): joins each part list, origin from
  spec['origins'], a.add(unwrap='smart'), wheel_fr (and wheel_rr if spec['twin_rear']), steering
  wheel mesh, anchors spec['anchors'] = [(name, loc, fwd, extras)], colliders spec['colliders'],
  extras, lod distances (35, 90), bake 1024/512/512 with material_texels cutting liner (0.12),
  chassis, seats, pipe, wheel back. assemble_truck: wheel copies (left under turned pivots),
  steering pivot (empty, local Z = column), lod1/lod2 = merged world copies, faces with keep_lod <
  level deleted, welded 8 mm, decimated to spec lod1 (4600) / lod2 (1150), all moving parts
  parented to lod0.
- ambulance.py, swat_van.py: one script each; hull keys, assign callbacks, fittings, contract.
- _hull.py and _wheels.py are an earlier predecessor's untested drafts: NOT used (left in place;
  they only change the domain hash). Delete or ignore.

## Decisions (why)
- Every part modelled whole (no mirrored halves): indicator l/r and siren a/b differ per side
  anyway, and it avoids mirrored custom-normal repair. Costs texels: density 51 px/m at 1024.
- Driver on the left (-X). Seat anchors = hip joint ~0.33 m over the seat floor.
- window_rear on ambulance/swat = the pass-through pane in the cab's back wall (the brief wants
  window_rear; the rear doors' glass is in the door nodes).
- Rear doors: door_rear_l (-X) and door_rear_r (+X), slabs hinged at the outer edges, origin on
  the hinge line.
- Lamp housings and cells are level 1: lod2 has no lamps (keeps lod2 at ~1,200 tris).

## Next steps, in order
1. Check build3 landed and its sheet (rear posts painted); run the asset tests.
2. city_bus (12.0 x 2.55 x 3.1, wb 5.9, r 0.48, twin rear via spec['twin_rear'] = True;
   door_fr = front passenger door leaf; anchor_seat_passenger_1.._6 along the cabin;
   anchor_sign_front + lamp_sign destination board; big windows: window_l/r long panes; rows of
   seats, grab rails; roof AC pod; paint_secondary skirt). Needs ~22,000 tris budget, lod1 5000.
   A 12 m hull at step 0.3 is fine; keep doors as hull parts (assign by y range on the +X side).
3. cargo_van (5.62 x 2.03 x 2.46, wb 3.52, r 0.36): reuse the ambulance cab keys stretched, one
   hull to the rear, sliding side door outline, barn doors (door_rear_l/r), no sirens (drop
   lamp_siren_* from its registry materials).
4. box_truck (7.62 x 2.42 x 3.26, wb 4.42, r 0.46, twin rear): cab-over flat face hull + box hull
   with ribs (thin boxes), roll-up door_rear as ONE node (horizontal slats), under-run rails.
5. Bytes: 622/637 kB vs the brief's 520 kB. Geometry dominates (~590 kB). Cut lod0 toward
   12-13k: wheel lathe segments 20 -> 18 and drop the drum, rear-door block step 0.2 -> 0.3 on
   the inner face, rounded_block bevel segments 2 -> 1 for hidden parts, interior liners coarser,
   seats simpler. lod1 has 5.7k verts / 4.8k tris (fine).
6. Quality: headlamps are flat cells in a bezel (add reflector discs / lens), wheel arches on the
   SWAT could be squared armour arches, add side marker lamps, ambulance chevrons on the rear
   doors (paint_secondary cells), engine-viewer capture (not done yet this shift).
7. pickup_truck, offroad_4x4.

## Commands (from the repository root)
- local check (no GPU, seconds): /opt/marazul-blender/bin/python /tmp/marazul/trucks/probe.py check <id>
- build: /opt/marazul-tools/gpu-run --timeout 1500 -- /opt/marazul-blender/bin/python art/build_assets.py build ambulance swat_van --preview --view=145,14 --view=three_quarter --view=side --view=215,8@1.5
  (two vans: ~2.5 min on the GPU; an over-budget build writes the .glb but no preview)
- preview a built file (ONE id per call): /opt/marazul-tools/gpu-run --timeout 600 --sync art,game/assets -- bash -c "/opt/marazul-blender/bin/python art/build_assets.py preview ambulance --view=... && ... preview swat_van --view=..."
- tests: node --test "tools/tests/assets/*.test.mjs"
- engine: node tools/capture.mjs --root . --size 960x540 --page "tools/preview/asset-viewer.html?asset=ambulance&shots=145,14@1;35,16@1" --out /tmp/marazul/trucks/ambulance_engine.jpg
