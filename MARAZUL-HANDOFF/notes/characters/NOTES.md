# characters: handoff note (character artist; shift 11, 18 Nov 11:04 UTC -> ~11:35)

## This shift: owner 11:08 "arms and hands look broken when holding the pistol"
All in the shared generator (every person gets it when rebuilt):
- _person.body_weights: ELBOW blend upper_arm->forearm over +-4.5 cm along the arm, WRIST blend
  forearm->hand over the last 8 cm of the forearm (+1.2 cm into the hand), on points within
  10 / 8.5 cm of the limb axis whose pair weight > 0.5 (after bone heat + smoothing, before the
  4-bone cut). Clay check of the source posed forward+wrist 70 deg / bent 90 / raised:
  /tmp/marazul/characters/s11_arm_dez.jpg (no pinch, no wrist collapse).
- _figure: knuckles (metacarpal heads on the back of the hand) and broader middle joints;
  fingers slimmer across (~4 mm gaps); finger_paths(grip=None|'shoot'|'support');
  Figure.grip_hand(grip, left) = palm + fingers + wrist stub, voxel 2.2 mm.
  Grip shapes: /tmp/marazul/characters/s11_grip.jpg (rows: relaxed, shoot, support).
- _person.build: the relaxed hands are CUT OUT of the skin into their own LOD part hands_lod0..2
  (split_hands, faces of paint_skin beyond wrist-4 mm), and two grip hands hand_r_grip /
  hand_l_grip (grip_hands, 640 tris each, lod0-only, weights hand + forearm blend like the body)
  are baked at GRIP_BAKE_OFFSET (0, 0.9, 0) so the relaxed hands do not occlude them black, and
  moved home in assemble (set on the asset module by _person.build: no script has its own).
  Budget: _person.build adds 3 draws and 2*640+40 triangles to ASSET['budget'] (the test counts
  hidden grips at every level). Registry entries need nodes hands_lod0..2, hand_r_grip,
  hand_l_grip and maxDraws +3 (and maxTriangles if over the 9,000 default).
- _wardrobe.bomber: the cuffs are knit in the shell material (paint_jacket) - no black band.
- REQUESTS.md "Added ~11:20 UTC by characters": character-runtime must hide the grips on load
  and swap hands <-> grips while a weapon is held. UNTIL THEY DO, rebuilt people show both.

## State at shift end (11:26 UTC): CONSISTENT
- ALL 15 people rebuilt 11:15-11:23 with the new arms/hands/grips and REGISTERED (registry
  HAND_NODES in every entry; maxDraws +3: Dez 10, Sol 10 + maxTriangles 10000, the rest 9, gang_member_street
  and pedestrian_older_f 8). Asset tests 11:23: 479 pass / 0 fail.
  Dez 677,300 B (9,706/3,803/2,017 counted). Pedestrians 239-252 kB, gangs/uniforms 259-300 kB, Sol 580 kB.
- (The engine's test run once failed the two pedestrians: it ran in the seconds between the files
  landing and my registry edit. Register IMMEDIATELY after every build.)
- Engine checks: aim view with the swap simulated /tmp/marazul/characters/s11-aim-grip.jpg
  (-zoom, -hand crops): smooth arm, mustard cuff, wrapped hand under the pistol. Aims sheet on
  the preview page: /tmp/marazul/characters/s11-aims-quarter.jpg (grips not hidden there: the
  page/run-time does not swap yet).

## Next (in order)
1. Check that character-runtime hid the grips on load and swaps them (REQUESTS 11:20). If it
   has not by the next seal, the grip hands show over the relaxed hands everywhere.
2. Closer engine look at the hands (fingers spindly? the grip fits the pistol?); tune
   finger_paths bends / grip-hand placement against the held pistol.
3. Older items: Dez behind view (diagonal folds), Remache tank top, corriente hard hat.

## Commands (from the repository root)
- arm/hand clay check (local, ~25 s): /opt/marazul-blender/bin/python /tmp/marazul/characters/t_arm.py <id> /tmp/marazul/characters/<id>_arm.jpg
- grip shapes (local, ~10 s): /opt/marazul-blender/bin/python /tmp/marazul/characters/t_grip.py <id> <out.jpg>
- source check (local, ~20 s): /opt/marazul-blender/bin/python /tmp/marazul/characters/t_down.py <id> <out.jpg>
- build: /opt/marazul-blender/bin/python art/build_assets.py build <ids> --gpu --jobs 2 --preview
- aim capture: see Next 1 (aim-final.js from player is the unswapped original)
- tests: node --test "tools/tests/assets/*.test.mjs"
