# vehicle-system handoff note (physics system + vehicles system)

Shift 11:03 to ~11:20 UTC, 18 Nov (shift 10). Everything below is in the tree. 39 Node tests pass
(`node --test "tools/tests/vehicle-system/*.test.mjs"`), physics 50 pass, systemManifest pass.
GPU smoke OK at 11:17 (an 11:16 run failed only on city-world's transient CITY_PAINTINGS error).

## Done this shift
1. BOATS AND HELICOPTERS IN THE FLEET (HIGH item).
   - vehicles/vehicleCraftControls.js (pure, tested): craftKindOf(entry) 'boat'|'helicopter'|null;
     boatInputFrom (W ahead, S astern, A/D steer); helicopterInputFrom (W forward, S slows then
     sinks below 3 m/s, A/D yaw, Space(handbrake) climbs, controls.lift -1..1 wins);
     helicopterControlsActive.
   - vehicles/vehicleCraft.js: createCraftBody (physics Boat / Helicopter, tunings cached; heli with
     position.y and parked false = airborne, engine on), createCraftParts (rotor_main/_tail + blur
     discs, engine_l/_r, propeller_l/_r, helm; extra anchors wake, spray_l/_r, board, searchlight,
     camera, door_driver into rig.anchors; blur discs cloned at 0.6 opacity, no shadow),
     driveCraft/holdCraft/boardCraft (engine on)/leaveCraft (engine off below 1.2 m),
     liftCraftRoot (boat models' origin is the WATERLINE, physics origin the keel: root rides
     draft up the hull's up axis, so anchors/seats are right), poseCraftRig (rotors spin, blur
     replaces blades above rotorSpeed 0.55, outboards swing, props turn, helm turns).
   - vehicleRoster.js: spawn branches on craftKindOf (no parked clearance for craft); record.craft;
     record.car IS the Boat/Helicopter (audio/effects read rpm, throttle, wake, spray, rotorSpeed);
     entity tags 'boat' / 'helicopter'; craft draw PARTS at near, no wheel pose / merged settle /
     contact shadow; helicopters always NEAR (merged levels bake the blur disc as a solid plate).
   - vehicleMatrixUpdates.js: rotor_main/_tail, engine_l/_r, propeller_l/_r keep auto-updating.
   - vehicleLightsAndDoors.js: lamp groups lamp_nav_red / lamp_nav_green (on with the tail lamps).
   - world/physicsEvents.js isVehicleBody: boats (planing) and helicopters (rotorSpeed) count.
   - world/physicsSimulation.js: PhysicsWorld waterHeightAt = atmosphere.getWaveHeight (was flat 0).
   - GPU pictures: boat2.jpg (lead at the speedboat's helm off Bulevar, police boat under way with
     wake 0.78), heli3.jpg (lead piloting the news helicopter at 14 m, police heli flying ahead,
     translucent blur disc). The lead boards both via player/enterVehicle.
2. PLAYER CAR NIGHT GLOW (QA bug 2): cause found and fixed. The full-part model (player's car,
   damaged cars) uses the asset's lamp materials at daylight emission (head/brake/reverse 10); at
   night exposure 2.8 the reverse + brake lamps (QA's tour car backs up under the lead's boarding
   brake with autoReverse) bloomed into a white/red blob over the whole rear. Merged traffic lamps
   glow at 2.5. vehicleNightReflections.js caps lit lamps (userData.litIntensity) at
   NIGHT_LAMP_INTENSITY 2.5 at full night (nightLampIntensity), restored by day; setVehicleLamp
   now tracks swapped lamp materials (they were untracked: env 1.0 at night). GPU checks:
   nightqa3.jpg (reverse+brake lit, Los Pantanos 22:30: red points, no blob), nightqa2.jpg, chase1.jpg.

## Next steps, in order
1. Side glass "nearly opaque from outside" (player report): door glass in the near merge uses the
   role shader opaque dark (known); PARTS glass opacity comes from the asset. Look at window materials.
2. Player requests (REQUESTS.md 11:20): controls.lift keys, no exit in the air, anchor_board for
   boats, a farther heli chase camera. Missions: drop land stand-ins (told).
3. Police: policeDispatch's own helicopter could become a fleet heli (heli.flyTowards) later.
4. Instanced batch draws (20 for 27 cars) as models multiply; a near traffic bike with rider look.

## Known problems
- Far boats draw merged mid/far (propellers static there), fine.
- The player's own heli rotor disc reads faint from the chase camera (0.6 of the asset opacity).
- "Tan dust cloud around the car in the chase" (player): not investigated; asked effects.
- Stray logs /gold4.out, /night3.out, /night4.out at the filesystem root (shift 8).

## Commands
    node --test "tools/tests/vehicle-system/*.test.mjs"
    GPU capture (repo root; gpu-capture has no --timeout option):
      /opt/marazul-tools/gpu-capture capture --size 960x540 --page "index.html?seed=1&quality=high" --eval-timeout-ms 300000 --eval "$(cat /tmp/marazul/vehicle-system/boat.js)" --out /tmp/marazul/vehicle-system/boat2.jpg
      Scripts: boat.js, heli.js, nightqa2.js (QA tour order), nightqa3.js (reverse+brake lit),
      chase.js (night chase at 2 stars; its final police list needs Array.from(ofKind(...))).
    GPU smoke: /opt/marazul-tools/gpu-capture smoke --out /tmp/marazul/vehicle-system/smoke.jpg
