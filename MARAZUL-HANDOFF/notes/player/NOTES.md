# player handoff note (shift 10, ~11:03 to ~11:12 UTC by the box clock, 18 Nov). Everything below is real and in the tree.
# Tests: player 34/34 (node --test "tools/tests/player/*.test.mjs"). GPU smoke OK (smoke-s10.log).
# Images looked at: aim-low-vs-ref.jpg, window9.jpg, chase2.jpg, carjack6.jpg.

## Done this shift
1. AIM CAMERA LOWER (owner 11:12, coordinator's first item). onFootCamera.js ON_FOOT_FRAMING.aim =
   {pivotHeight 1.72, distance 1.28, pitch -0.0175 (1 deg), shoulder 0.42, fieldOfView -8 (50), bodyTurn 0.3}
   (was 1.82 / 1.03 / 3 deg / 0.30 / 48). Measured in the game, 1280x720 (aim-lowA.log):
   camera 1.645 m up, 1.338 m behind the head, 1 deg down, FOV 50; head centre 29.9 % from the left,
   head top ~37 % from the top; right hand 40.0 % / 56.1 %; shoulders' back vs camera 26.9 deg
   (chest 6.9 off the view). Variant B (1.68/1.36/1.5 deg/0.44) gave 1.42 m back and top 34.6 %: rejected.
   Side by side (reference | old aim-s9b | new): /tmp/marazul/player/aim-low-vs-ref.jpg.
   playerMotion.test asserts the new ranges (camera 1.64-1.76 m unshifted: the game's head follow
   lowers it ~0.09 m; 1.2-1.4 m back; 0-2 deg; FOV 48-52; head top 0.34-0.40).
2. CARJACK seen in the game. carjack5.log (old pick): a car passing at 63 km/h was claimed by F,
   braked to a stop 17 m away, the walk gave up at 6 s, the car stood empty. FIX: BOARDING.claimSpeed 6 m/s:
   board() refuses a car faster than that (no claim). carjack6 (crawling/stopped car, carjack6.js):
   phases enter at 0.05 s, stages turn 0.05 / reach 0.2 / open 0.3 / pull 0.65, driver handed to
   the crowd and thrown down by the door (carjack6.jpg shows him on the road at the open door).
3. CANCEL after claiming a moving car = PLAIN EXIT: abandon() -> haulOut(true): the seated driver
   plays walker.exitVehicle({dragged: false}), VEHICLE_STOLEN carries abandoned: true and dragged: true
   (= "the seated body already plays its way out", so the crowd does not seat another). Test added.
4. DRIVER'S FACE (window9.jpg, crowd cleared within 14 m): head bone 0.937 m, glass band holds it,
   but from outside the side glass reads dark grey and nearly opaque: only the shoulder shows behind
   the A-pillar. Not a player fix (glass material: vehicle-system).
5. CHASE in the game at rest (chase2.log): 5.54 m back, 2.15 m up, 6.0 deg down, FOV 55, roof at
   56 % from the top, car centred, ~25 % of the width. "At speed" in that run only reached 9.7 km/h
   (rammed traffic): 5.40 m back, FOV 55.6. chase3.js (lane drive) returned null ids (spawn on the lane
   start did not give an entity): not captured at speed this shift; the unit tests cover 17.7/40 m/s.

## Next, in order
1. Boats/helicopters: vehicle-system was writing vehicleCraft.js / vehicleCraftControls.js at 11:07
   (fleet spawns them; record.car = Boat/Helicopter; controls throttle/brake/steer, Space climbs,
   controls.lift). When REQUESTS says they are drivable: carDoorAndSeat.js reads only anchor_door_driver /
   anchor_seat_driver: fall back to anchor_board for boats (stand at it, sit at the seat or helm);
   the chase camera scales by radius (chaseSizeOf clamps to 6: a heli gets ~9.8 m back / 4.45 m up):
   capture both and tune (maybe a heli class: higher, less pitch-down near the ground).
2. Chase at speed in the game: fix chase3.js (check what vehicle/spawn returns at a lane start;
   maybe use traffic's own lane car), want 5.5-6.5 m, car 28-35 % of the width (now ~25 %).
3. Crowd 'dragged' mode after a PLAIN exit plays 'getup' on a standing driver (pedestrians): check it.

## Commands
    node --test "tools/tests/player/*.test.mjs"
    /opt/marazul-tools/gpu-capture capture --size 1280x720 --page "index.html?seed=1&quality=high" --eval "$(cat /tmp/marazul/player/aim-final.js)" --out /tmp/marazul/player/aim-x.jpg
    (tuned variants: aim-lowA.js / aim-lowB.js set TUNE through followCamera.tuneAim)
    ... --size 960x540 --eval "$(cat /tmp/marazul/player/carjack6.js)" --out /tmp/marazul/player/carjack6.jpg
    ... --eval "$(cat /tmp/marazul/player/window9.js)"  (driver's face, crowd cleared)
    ... --eval "$(cat /tmp/marazul/player/chase2.js)"   (chase at rest + after 3.5 s of throttle)
    /opt/marazul-tools/gpu-capture smoke --out /tmp/marazul/player/smoke-s10.jpg
    (gpu-capture has no --timeout option.)

## Requests to other owners
- vehicle-system: (a) a large tan dust/smoke cloud around the player's coupe in chase2.jpg (after
  ramming traffic) and around the jacked car in carjack6.jpg (stopped): too big and too opaque.
  (b) side glass reads dark, nearly opaque from outside (window9.jpg): the seated driver's face does
  not show; lighten/clear the side windows a little. (c) A half-finished vehicleRoster.js
  (UNDRIVABLE is not defined) broke a capture at ~11:07; fine at 11:09.
- pedestrians: a driver whose carjack was abandoned now plays walker.exitVehicle({dragged: false})
  (VEHICLE_STOLEN abandoned: true, dragged: true): your 'dragged' mode then plays 'getup' on a standing
  person; skip the getup when the walker is not lying (or on abandoned) and let him flee.
- character-runtime: aim camera moved lower/further (1.645 m, 1.34 m back, 50 deg); the hold measured
  hand 40 % / 56 %, angle 26.9 deg: keep the hold as is.

## Older notes still valid
- Aim camera follows the head bone (cameraDirector.followHead), followCamera.aimDirection(out),
  tuneAim, chase CHASE_FRAMING, FLATLINED/CUFFED, get-in/out through the run-time's transit,
  passenger-side walk round, bike throw (vehicleEntry.thrownOff), boarding stall/sidestep
  (BOARDING.detour), palm clipNear (cameraCollision.js), claimed-car rolling wait (BOARDING.rolling).
