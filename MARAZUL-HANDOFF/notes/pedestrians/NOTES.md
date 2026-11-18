# pedestrians handoff note (shift 10 + urgent grip-hands fix ~11:25-11:30 UTC, 18 Nov)

## Grip hands fix (11:25-11:30, done)
Rebuilt bases carry hands_lod0..2 + hand_r_grip/hand_l_grip (grips: one paint_skin primitive, no LOD
suffix -> level 0). Before: the grips were merged into every body's lod0 draw (drawn over the relaxed
hands on everyone) and the walker's gripHands found nothing. Now in pedestrianBodies.js:
- sortBodyParts: grips kept OUT of the merge (body.grips, own meshes; gripHands hides them on set-up,
  visible=false -> no draw); relaxed hands merged LAST per level (planMerge(meshes, handCount) ->
  bodyCount = draw count without hands).
- syncArmed (each animate, and right after walker.update): when the walker's gripHands shows the
  grips, showMergedHands(merge, false) cuts the relaxed hands with geometry.setDrawRange(0, bodyCount)
  on the person's own geometry (0 extra draws); unmerged relaxed hands (fallback) are hidden in
  showLevel. Grip visibility is never touched by us (gripHands caches it); only castShadow.
- Grips painted with the skin (paint_skin added to body.roles -> setPaint). drawsOf adds 2 when armed.
- Test: tools/tests/pedestrians/gripHands.test.mjs (34 tests pass). Local smoke OK (smoke-15.log).
- GPU: hands-crowd.jpg (+crop): 62 people, 0 grips visible, relaxed hands single and clean;
  hands-armed.jpg (+crop): Los Remaches member aiming a pistol, grips shown, relaxed-hand range cut
  (drawRange 15069 = bodyCount), two-handed hold reads. Scripts hands-crowd.js / hands-armed.js.
- Not ours: police officers (police/officerBehaviour.js) instantiate lod:0 unmerged, so gripHands works
  there directly. A person given holdWeapon but never aimAt stayed at weapon<0.5 -> grips not shown
  (run-time's rule in locomotionController ~line 453).
- pedestrianBodies.js is now 423 lines / 20 KB: next time split the merge helpers into bodyMerge.js.

# (earlier) pedestrians handoff note (shift 10, ~11:03 to ~11:17 UTC, 18 Nov)

Tests: `node --test "tools/tests/pedestrians/*.test.mjs"` (30 pass). Local smoke OK (smoke-14.log), no console errors.
Earlier shifts (still true): seatedDrivers.js seats a pooled body in every traffic car / bike within 40 m
(MAX_DRIVERS 16, refresh 0.4 s), seatedDriverOf(vehicleId) for the carjack; bikeRiderSeat.js riders;
crewIdle.js guards and crew roles; gang members wear their gang's bases (crowdSpawning GANG_BASES);
obstacleGrid / pavementObstacles; placeAt for missions.

## Done this shift
1. One-frame lag of seated drivers and riders FIXED. seatedDrivers.follow() re-places every seated body
   (seatPose -> instance position/quaternion, visibility) at render time; crowdSimulation.lateUpdate()
   calls it; the entry pedestrianCrowd.js has lateUpdate() (engine runs every update, then every
   lateUpdate, so this is after vehicles' update sets the interpolated drawn root). Posing stays in
   update(); the body moves rigidly, hands on wheel/grips included. Test at 15 m/s
   (seatedDrivers.test.mjs: lags 0.25 m without follow, < 0.1 mm with). GPU: hipToSeat 0.075 -> 0.
   Entry module 5.6 KB (< 6 KB; manifest test passes).
2. Captures (GPU, Gran Via high):
   - riders-d.jpg (+ riders-d-crop.jpg): an oncoming traffic sport_motorcycle with its rider, hands to the
     grips, feet down to the pegs, hipToSeat 0. Profile: pedestrians 0.358 ms, 24 draws / 41.6 k tris /
     14 shadow casters in view, 61 people + 6 drivers; frame 379 draws, 1.58 M tris.
     FOUND: entity.heading and MARAZUL.teleport's heading are rotation.y (three) convention, not compass:
     forward = (-sin h, -cos h). Old riders-a/redlight-a used compass and framed the wrong way;
     riders-c.js / redlight-c.js are corrected.
   - redlight-c.jpg (+ crop): stopped luxury_sedan, driver (pedestrian_office_f) seated, hips 0.45 m,
     head bone 1.08 m above the car root, just above the wheel rim; reads but faintly behind the
     windscreen glare at golden hour (glass is vehicle-system's). No change needed on our side.
   - crew-b.jpg showed La Corriente's WOMEN drawn on pedestrian_office_f (skirt under a hi-vis vest).
     CORRECTED in crowdPopulation.spawn: a gang that has its own base for one sex only draws its members
     as that sex (re-pick with sexes {male: 1}). crew-c.jpg: all five are corriente_stevedore now; guard
     uses stance 'watch' (character-runtime added it), crew talker/listener/squat/lookout roles work.
3. Stevedore hard hat, READY for the asset: pickAppearance now returns look.accessories (each outfit
   accessory by its chance, rolled by accessoryRoll(height, skin, top, index), not from `random`, so
   seeded crowds keep the same people). pedestrianBodies.build keeps any mesh whose own or ancestor's
   name contains 'hard_hat' (OPTIONAL_ACCESSORIES) out of the merge; showLevel shows it only when
   body.wearing includes the piece (at the drawn level, or the highest level it has). Nothing visible
   until characters adds the node (catalog la_corriente 0.4; ~40 % checked in accessories.test.mjs).
4. QA bug 6 (m02 guards gone 3.5 s in): upkeep despawned people beyond 105 m of the focus, and missions
   place guards before the teleport lands. People with data.missionGuard/missionEnemy/missionGiver are
   now kept to MISSION_KEEP_RADIUS 1500 m (the mission removes them). Not yet re-checked in m02.

## Next steps, in order
1. Re-check QA bug 6 in m02 (start the mission, after 3.5 s count crowd people with data.missionGuard).
2. When characters ships corriente_stevedore with a 'hard_hat' node: capture crew-b.js again and check
   the hat shows on ~40 %, follows the head, LOD switch OK (extra draw only for wearers).
3. carjack-f.js (fix its heading convention first, see above): F on a stopped car's driver.
4. Night crowds, rain (umbrellas/hurry), melee weapons in hand (walker.holdWeapon('two_hand_bat'|...)).

## Requests to other owners
- characters: the stevedore hard hat as its OWN mesh node per level (name containing 'hard_hat', e.g.
  'hard_hat_lod0'), skinned to the head bone, sharing the atlas; pedestrians hides/shows it per person.
- character-runtime: 'lean_wall' stance and 'smoke' gesture still missing ('watch' now works, thanks).
- vehicle-system: windscreen glare at golden hour hides seated drivers from the front (optional).

## Commands
    node --test "tools/tests/pedestrians/*.test.mjs"
    cd /home/user/Makefun-project && /opt/marazul-tools/gpu-capture capture --size 960x540 --page "index.html?shot=pedestrians-gran-via&seed=1&quality=high" --eval "$(cat /tmp/marazul/pedestrians/riders-c.js)" --eval-timeout-ms 240000 --out /tmp/marazul/pedestrians/riders-x.jpg
    (redlight-c.js, crew-b.js the same way)
    node tools/smoke-game.mjs --out /tmp/marazul/pedestrians/smoke-14.jpg
