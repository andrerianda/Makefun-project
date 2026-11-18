# props: handoff note (shift 9, 10:15-10:50 UTC 18 Nov)

## Finished and usable this shift (built, registered, tests pass for props)
- set_roadside: art/blender/assets/props/set_roadside.py -> game/assets/props/set_roadside.glb,
  238,524 B, 4,456/1,665/533 tris, 16 draws, 1024 atlas; materials atlas, glass, cutout_mesh,
  lamp_booth, lamp_flood. Objects: bus_stop_pole, parking_meter_twin, bollard_stainless,
  bollard_flex, cone_tall, cone_stack, roadworks_barrier, newspaper_bank, phone_booth,
  billboard_monopole (12 x 4 m face, 4 floodlights). Cycles sheet:
  /tmp/marazul/assets/preview/set_roadside_three_quarter.jpg (billboard reads right).
- set_construction: set_construction.py -> set_construction.glb, 232,096 B, 4,494/1,641/549 tris,
  9 draws; materials atlas, cutout_fence. Objects: scaffold_bay, cement_mixer, generator,
  cable_reel, cable_reel_small, pipe_stack, sofa_broken, fence_portable. Cycles sheet:
  /tmp/marazul/assets/preview/set_construction_three_quarter.jpg (all read as real site kit).
- set_commerce rebuilt: fruit heaps fill the crates and dome ~8 cm over the rim (sphere scale
  0.53/0.33/0.22 at z 0.17), saturated fruit colours, no fade; hot-dog umbrella gores deep red /
  yellow (fade 0.2). 232,532 B. Sheet: /tmp/marazul/assets/preview/set_commerce_three_quarter.jpg.
- Registry: PROP_ASSETS + PROP_SET_OBJECTS for set_roadside and set_construction.
- REQUESTS.md "Added ~10:42 UTC by props (shift 9)": three lines for city-dressing.
- Tests: node --test "tools/tests/assets/*.test.mjs" -> 471/472; the one failure is
  leisure/set_waterfront.glb unregistered (vegetation's file, not mine).

## Decisions
- The shift order listed parking meters, cones, bollards, a newspaper box and a phone booth,
  which already exist in set_traffic_control / set_sidewalk / newspaper_box_a: set_roadside
  holds NEW variants instead (twin meter, tall cone + stack, stainless + flexible bollards,
  three-box bank, enclosed booth) so nothing is duplicated.
- Brief item 6 leftovers NOT yet made: fuel pumps + pump island + canopy columns, air-and-water
  machine, car-wash sign frame, rooftop truss billboard (6 x 3 m), motel pylon sign, toll/security
  booth with barrier_arm (hinged part), speed camera pole, radio mast segment with lamp_beacon.
  Put them in a set_fuel_station (pumps, island, air machine, car-wash frame, pylon) and add the
  booth/speed camera/mast/rooftop billboard to set_roadside (rebuild; registry lists grow).

- Port extras DONE: container_chassis + terminal_tractor added to set_port.py (dual_wheels helper),
  rebuilt (425,380 B, 9,829/3,400/1,047 tris, 13 draws, 2048 atlas, 126 s on the GPU), registered
  (nodes/anchors/colliders + PROP_SET_OBJECTS.set_port entries). Preview sheet:
  /tmp/marazul/assets/preview/set_port_three_quarter.jpg (not yet looked at).
- Engine check DONE for set_roadside: /tmp/marazul/props/roadside_engine.jpg (low warm sun, six
  views, no console errors): everything reads right.
- Tests at 10:45: 479/479 pass.

## Next steps (in order)
1. Look at set_port_three_quarter.jpg and an engine shot of the chassis/tractor (row 2 of the
   layout, Blender y 55.5 -> game z -55.5; chassis x 6.81, tractor x 11.08). Engine shot of
   set_construction too.
2. Fuel station set and the remaining set_roadside items above (toll booth with barrier_arm,
   speed camera, radio mast with lamp_beacon, rooftop truss billboard).
3. Optional: phone_booth door as a hinged part; scaffold debris netting (cutout) variant.

## Now
- Shift ended 10:46 with everything above consistent; no gpu-run or capture left running.

## Commands
- model only, local (6 s): /opt/marazul-blender/bin/python /tmp/marazul/props/dry.py <set id> --levels
- build: /opt/marazul-tools/gpu-run --timeout 1500 -- /opt/marazul-blender/bin/python art/build_assets.py build <ids> --preview --jobs 2
  (about 60 s per 1024 set when the GPU is free)
- names in a built file: node -e reading the GLB JSON chunk (uint32 length at byte 12, JSON from byte 20)
- tests: node --test "tools/tests/assets/*.test.mjs"
- engine sheet: /opt/marazul-tools/gpu-capture capture --root . --size 960x540 --page "tools/preview/asset-viewer.html?asset=set_roadside&shots=three_quarter;35,12@3.2@-0.2,0.9,-1.29;35,12@3.6@0,0.7,-3.27;35,10@5.5@-2.3,1.7,-3.27;35,14@2.4@0,11,2.55;35,10@5.5@2.57,1.3,-1.29" --out /tmp/marazul/props/roadside_engine.jpg
  (focus x = Blender x, z = -(Blender y) of the layout origins dry.py prints)

## Earlier sets (unchanged)
set_street_lighting, set_traffic_control, set_sidewalk, set_alley_and_yard, set_street_wear,
set_yard_clutter, set_port, street_lamp_a, newspaper_box_a (all registered).
Known: awning_shop / fruit_stall canopies are coincident double-sided sheets (offset the underside
3-4 mm if the bake shows AO blotches); set_port texel density low on big surfaces.
