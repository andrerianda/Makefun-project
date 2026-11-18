# physics handoff notes (P1-physics) — shift 07:34-~08:00 UTC 18 Nov

Earlier shifts built the world, cars, character capsule, triggers. Shift 07:19 (cut off 07:28) wrote
Motorcycle.js + test, Boat.js + test, Helicopter.js (untested). All kept and checked this shift.
docs/PHYSICS.md now documents everything below (motorcycles, boats, helicopters, characters, explode).

## Done (tests: 50 physics pass; vehicle-system, combat, player tests pass; GPU smoke OK 07:47)
- Helicopter.js fixed and tested (tools/tests/physics/helicopter.test.mjs, 9 tests):
  thrust uses the vertical speed before this step's gravity (hover used to climb 0.16 m/s);
  altitude hold when collective centred (holdHeight, predicted stop point); sink-rate profile near the
  ground (min(0.5+sqrt(4h), 0.5+1.2h)) with flare feed-forward scaled by actual sink; assist cancels 60 %
  of ground effect so it lands; sits (0.4 g thrust) only below 3 cm; at speed yaw limited to the
  coordinated-turn rate 0.9*g*tan(maxTilt)/speed and forward speed eased 40 % by full yaw (no skid).
- Characters (CharacterController + PhysicsWorld + worldQueries), tools/tests/physics/character-crowd.test.mjs (4):
  world.characters (sorted by x each step; addCharacter/removeCharacter, the controller adds itself);
  queries on LAYER.CHARACTER -> HIT_KIND.CHARACTER, hit.character (overlaps: controller in bodies[]);
  separation after the actors: up to 3 relaxation passes, mass-weighted, nudge() sweeps against walls
  (WALL_MASK) and the other takes what a blocked one could not; closing speed removed on the first pass;
  controller.active (false = out of world), .solid, ignores(other); push(vx,vy,vz,knockDown) with
  KNOCKDOWN event; while knockedDown input ignored, tumble 9 m/s^2, auto get-up after getUpTime 1.8 s
  lying still (Infinity = game decides); world.explode(x,y,z,{radius,power,characterSpeed,ignore}).
  digest() includes characters.
- Requests to vehicle-system / player / combat appended to /tmp/marazul/briefs/REQUESTS.md (07:48).

## Next, in order
1. Knockable props (street lamps, hydrants, signs: static until hit hard, then a body on LAYER.PROP;
   PHYSICS_EVENT.PROP_BROKEN exists already) — brief P1 item.
2. Cheap crowd / traffic modes from the brief (kinematic pedestrians far away, rail cars), if still wanted.
3. (done 07:55: boat test checks the spray and wake anchor positions.)
4. Watch the vehicle-system adopt Motorcycle/Boat/Helicopter; helicopter crash damage needs their isVehicleBody.

## Known
- Helicopter yaw at full speed is slow (~0.15 rad/s at 40 m/s), by design (coordinated turn).
- A capsule left standing (player seated) is solid to other characters until player sets active=false.

## Commands
node --test "tools/tests/physics/*.test.mjs"     (about 2 s)
/opt/marazul-tools/gpu-capture smoke --out /tmp/marazul/physics/smoke.jpg   (from the repo root)
Probes: /tmp/marazul/physics/heli-*.mjs, boat-probe.mjs
