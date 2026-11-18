# traffic: handoff note (shift 6, 10:15-10:50 UTC 18 Nov) - real, kept work; 46 tests pass (traffic + systemManifest)

## Shift 6 (10:15-)
- MOTORCYCLES (item 1): sport_motorcycle was already in the district mixes (built + spawn.traffic), but traffic never
  mounted the physics Motorcycle, so a near traffic bike fell over. trafficDrivers.attach (placeCar, adopt, pullOut)
  now calls record.car.mount() for any fleet car with mount() (isRiddenVehicle) and marks agent.bike; the physics
  holds it up and leans it into turns (Motorcycle lean controller; the rig follows the body pose).
  Lane position: agent.laneBias = -(0.35..0.85) m (BIKE_LANE_BIAS): rides the LEFT wheel track of its lane (added to
  the steering offset with pull-over/lane-change offsets). Filtering: not done (optional).
  Crash: car.riderSeated false (RIDER_THROWN) -> manage() zeroes controls, drops the agent and pushes the id to
  `released` (vehicle-system asked for this, REQUESTS 10:40): the bike lies where it fell, removed when far+unseen.
  chopper_motorcycle stays out of the mix (not built; a stand-in with the chopper's catalog wheelbase would look wrong).
  Riders: pedestrians own the bodies (their bikeRiderSeat; vehicle-system mentions it 10:40). traffic.nearCars lists
  bikes like cars (driverId null, tag traffic, car.riderSeated true).
- DISTANT DRAWS (item 2): distantTrafficBatches.js rewritten on vehicle-system's instancing: createVehicleInstanceBatches
  (vehicles/vehicleInstancedLevels.js) + mergedVehicleLevel(asset, 2) (vehicleMergedLevels.js), imported read only.
  One draw per model (paint per instance, lamps by INSTANCE_LAMP_FLAGS.lamps at night, CPU frustum culling), the same
  merged geometry the fleet's far cars draw (shared buffers). Far shape beyond 120 m unchanged (1 draw, 2 at night).
  Colour passed as getHex() (the batches cache one Color per key). begin(camera, lampsLit) / end() (distantTraffic.update).
  sameMaterialMerge.js and farCarMerge.test.mjs deleted (unused now); distantBatches.test.mjs: 3 models x 60 cars
  + 30 far + 12 behind = 4 draws by day, 5 at night, 12 culled, lamp flag set, no console.error.
  GPU cover (s6-cover.log): 228 distant/parked cars in 8 draws, 53k tris (was 35 draws), 32 culled, no errors.
- PULL-OUTS (item 3): two reasons none ever fired: (a) drivers.pullOut refused at the target count (streets are always
  at it) -> now allows target + 2; (b) kerbsideParking tested ANY vehicle within 7 m of a point 9 m behind the spot,
  i.e. the parked row itself -> new pure pullOutClear(points, along, countMoving): nothing MOVING within 4 m of the
  lane from 30 m behind the exit to 6 m past it (tested). Capture: pullOut.js -> s6-pullout.log/.jpg.
- STILL CAR (item 4): cover run (coverDiag.js, samples every 0.5 s, any traffic car within 70 m of the camera still
  >= 1.5 s with lineDistance/gap/blocker/giveWay/mood/stuck): NO such car in the cover now (rows []). The old 4 s car
  (local-timeline.log, boot scene) stood at side -3 m with parked cars beside: most likely the old parked-blocker or a
  red light; re-run coverDiag-style sampling on the boot scene if it shows again.
- JUNCTION CAMERA: ?shot=traffic-junction camera now above the approach lanes (side half*0.45, corner+24 m back, 10 m up),
  not on the corner where the bus shelter canopy was. Capture s6-junction.jpg.
- trafficFlow exposes `drivers` (getter; agents, adopt, stats) for debugging/showcase. Entry 5.9 KB (< 6144).
- Traffic CPU in the cover (profile 30 frames, GPU): 0.537 ms/frame (budget 0.8). Earlier Gran Via 0.157: the cover has
  37 physics cars + police chase; measure Gran Via again next shift.

- GPU RESULTS (10:48, tree as handed back): smoke OK, errors [] (s6-smoke.log). s6b-pullout.jpg/.log: a parked
  sports_coupe pulled out 4 s after the wait began (indicator left, merging at 3.4 m/s; parking.pulledOut 1); Gran Via
  distant: 124 cars in 2 draws. s6b-bike.jpg/.log: two adopted bikes mounted (R), riding 7-18 m/s upright in lane,
  lean 0.24 rad (14 deg) in a turn at 17 m/s, laneBias -0.49; NO rider body yet (pedestrians), picture shows the bike
  small ~40 m ahead (the static cut lagged a 17 m/s bike). s6b-junction.jpg: clear elevated view of the queue, signals
  and crossing at golden hour, no canopy. The first batch of those three (s6-*.log) hung on the GPU machine 20 min and
  was killed; reruns took 40-75 s.

## Next steps (in order)
1. Bike close-up once pedestrians seat riders (bikeTurn.js; cut the camera AFTER the advance, or follow the bike).
2. Bike lane filtering between queued cars (optional): when stopped behind a car at a red, ride between lanes to the line.
3. Traffic CPU 0.54 ms in the cover: profile drivers vs distant (MARAZUL.profile systems) and trim if > 0.6 on Gran Via.
4. Ask vehicle-system to let traffic add instances into the FLEET's own batches (a hook) so a model's parked/distant
   cars share the fleet's draw: saves the remaining ~6 draws.

## Commands
- node --test tools/tests/core/systemManifest.test.mjs "tools/tests/traffic/*.test.mjs"
- cover diagnosis + batch cost: /opt/marazul-tools/gpu-capture capture --size 960x540 --page "index.html?seed=1&quality=high" --eval "$(cat /tmp/marazul/traffic/coverDiag.js)" --eval-timeout-ms 240000 --out /tmp/marazul/traffic/x.jpg
- pull-out picture: same with pullOut.js; bike in a turn: bikeTurn.js (adopts 3 bikes ahead on Gran Via via traffic.drivers.adopt)
- /opt/marazul-tools/gpu-capture smoke   (exit 75 = no GPU: node tools/smoke-game.mjs locally)
- The GPU queue was slow this shift (3 captures queued 15+ min): keep runs few.

## Requests to other owners
- pedestrians: traffic bikes are in traffic.nearCars (car.riderSeated true, driverId null); seat riders on them; on a
  thrown rider traffic releases the bike (it lies there), the rider body is yours to drop/ragdoll at car.riderThrow.
- vehicle-system: optional hook to add traffic's distant/parked instances into the fleet's own instance batches.

## Shift 5 and earlier, condensed
- Cover: lanes feeding the picture weighted at cuts (arrivesInFront), parked blockers overtaken from 0.4 m.
- Sirens (sirenGiveWay.js): pull over to the kerb and stop, scatter from a pursuit; turn lanes 160 m before junctions;
  pull-outs eased over 3.4 s; far lamps brighter; nearCars(out, radius) for pedestrians' seated drivers.
- Lane changes, distant kinematic traffic (ring 185..500 m, promote < 150, demote > 200), kerbside parking (58% of
  spots, real cars < 65 m, instanced 39..140 m), shared signal clock (openWorldCity.signals).
