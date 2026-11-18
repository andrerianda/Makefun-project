# sports-cars handoff note (hero cars: sports_coupe, muscle_car, supercar, convertible_cruiser)

Shift 9, 10:15 to about 10:45 UTC, 18 Nov. Describes the tree.

## State
- [x] helpers in art/blender/assets/sports_cars/: _curves.py, _mesh.py, _body.py, _parts.py, _car.py
- [x] sports_coupe rebuilt 10:23 (build12): tail indicator/reverse dark when off. 20,070 tris, 33 draws, 238,840 B.
- [x] muscle_car built 10:23 (build12) and registered: 21,398 / 3,798 / 1,000 tris, 33 draws, 235,360 B.
- [x] convertible_cruiser built 10:26 (build13) and registered: 20,294 / 3,797 / 999, 26 draws, 228,772 B.
- [x] supercar rebuilt 10:41 (build14, front fender raised over the arch; the black patches on
      the fender tops are gone in its Cycles sheet) and registered: 19,962 / 3,798 / 1,000 tris,
      33 draws, 241,292 B.
- Asset tests 10:42: 479 pass, 0 fail.
- Engine picture landed: /tmp/marazul/sports-cars/viewer12_muscle_car.jpg (rear 3/4, rear
  close, front 3/4, side; lamps LIT: the viewer's default). A coupe capture with lamps=0 (to
  confirm the dark indicator/reverse when off) was in flight at 10:42 ->
  /tmp/marazul/sports-cars/viewer12_sports_coupe.jpg. supercar / convertible: no engine
  picture yet (GPU capture queue took ~9 min per capture this shift).

## This shift: what changed
- _car.unit_lamp(color, strength, unlit, name): a lamp group whose OFF look (the baked base
  colour; the game's unlit lamp = base colour, emissive 0) is set apart from its light. M.lamp
  bakes hsv(light, sat .55, val .9) = near white for reverse -> white blocks in the tail bar.
  lamp_reverse unlit (0.075, 0.03, 0.03), lamp_indicator_r (0.11, 0.035, 0.012).
- New spec keys (all optional, coupe unaffected):
  - 'round_lamps': [(x, z, r)] round headlamps in the nose (part of bumper_f; no crest lamp).
  - 'round_tail_lamps': [(x, z, r, ring_lamp, core_lamp)] round tail lamps in chrome bezels (lod0).
  - 'side_intake': (mark, mark) trim cells belt+2..belt+6 (the supercar's intake).
  - 'open_top': True: door cols rail..last with no glass, cockpit cells roof_rear..roof_front
    cols 0..rail-1 left OUT of the mesh (Shell.open: cell material None, skipped in build),
    'tonneau' material on deck..roof_rear, window_front cols 0..rail (wraps to the rail: a
    wraparound screen with crown_power 4). No window_rear / window_r / window_l. Needs a
    'quarter_rear' mark anyway (window_r origin is computed eagerly).
  - cabin 'rear_seat_y' / 'rear_seat_x': a rear bench in _parts.interior_half and anchors
    anchor_seat_passenger_2 (left) and _3 (right). open_top drops the parcel shelf.
- Supercar lesson: the arch crown is wheel_radius + arch_radius above ground (0.745); the
  belt there must stay >= ~3 cm above it or the arch opening cuts through the fender top (it
  read as a black patch on the fender). Fixed in supercar.py (build14).

## Next steps in order
1. DONE 10:43: viewer12_sports_coupe.jpg (lamps=0) shows the indicator/reverse segments dark
   grey-brown in the tail bar (no white blocks). Next: a dusk chase capture (coupe in the cover).
2. Engine pictures, rear three-quarter, warm low sun (viewer studio): capture each car
   (command below). The GPU capture queue was slow this shift (a coupe capture timed out at
   400 s); see the report for which landed.
3. Supercar: white specks inside the side intake (Cycles sheet) - probably the scallop +
   rear flare folding; try scallop 0.025 or start the intake one row later. Its nose is plain:
   a lit light blade across the nose (band of lamp_head on the nose cap) would sell it.
4. Convertible: a small white bit hangs under the front of the door (Cycles sheet; check what
   it is); lod2 shows through the open cockpit at distance (no interior at lod2): add a lod2
   cockpit cover if it shows. Fins on the deck are not possible with the section (rail_z is
   clamped below top) - would need a section change.
5. Muscle car: power bulge reads weakly (bubble -0.034); the hood could take a scoop slab.
6. Coupe headlamp projector eyes sink (centre - 0.003 * normal), wipers, front indicators,
   door cards, seat bolsters, rough normals at arch bottoms (all cars).

## Pictures
- Cycles sheets (front three-quarter): /tmp/marazul/assets/preview/{sports_coupe,muscle_car,
  supercar,convertible_cruiser}_three_quarter.jpg
- Older: chase10.jpg (dusk chase, coupe), viewer11.jpg (coupe viewer).

## Commands (from the repository root)
- quick check, no render, 10 s: /opt/marazul-blender/bin/python /tmp/marazul/sports-cars/check.py <id>
- build: /opt/marazul-blender/bin/python art/build_assets.py build <ids...> --preview --gpu --jobs 2
  (about 75-90 s per car on the GPU; two cars in parallel)
- viewer (rear 3/4, rear close, front 3/4, side):
  /opt/marazul-tools/gpu-capture capture --root . --size 960x540 --page "tools/preview/asset-viewer.html?asset=<id>&shots=145,14@1;165,9@2@0,0.75,2.1;35,12@1;100,6@1" --out /tmp/marazul/sports-cars/viewer_<id>.jpg
- chase: /opt/marazul-tools/gpu-capture capture --size 1280x800 --page "index.html?shot=police-chase-dusk&quality=high" --out /tmp/marazul/sports-cars/chase.jpg
- tests: node --test "tools/tests/assets/*.test.mjs"

## Design decisions (why), kept from the earlier shifts
- Section columns (see _body constants): N_TOP 8, N_GLASS 4, N_SHELF 2, N_SIDE 8. In the hood
  and deck zones the glass band collapses to a 3 to 5 cm rolled fender crest.
- Panels hood, trunk, bumper_f, bumper_r, window_front, window_rear and the body lod0 are baked
  as right halves with a.add(obj, mirror='X'). door_fr and window_r are baked once; door_fl /
  window_l are mirrored copies made in assemble_car. One wheel is baked; the others are copies.
- steering_wheel is an EMPTY whose local Z is the column (the exporter bakes mesh rotations).
- Level 0 only: moving parts are children of lod0. lod1 / lod2 are single merged meshes.
- lamp_indicator_l is a renamed copy of lamp_indicator_r given to the mirrored half's faces.
- Budgets: coupe 22000/40, supercar 23000/40, muscle 26000/44, convertible 26000/44
  (ASSET['budget'] and registry maxTriangles/maxDraws). Bytes default 1 MB.
- Material names: lamp_* = emissive lamp role, glass* = alpha-blended glass role, paint* =
  tinted paint; everything else goes to the atlas (smoked_red_plastic, tonneau_vinyl, ...).
  Each car's registry materials list must match the file exactly (the convertible has no
  glass_rear / glass_lens / glass_lens_red).
- The game deepens the hero clear coat at run time (vehicleModelRig.glossHeroPaint).
