# effects handoff note (shift 10:15 to ~10:45 UTC, 18 Nov; seventh shift on this area)

## Done this shift (tests: effects 26/26; entry worldEffects.js 5998 of 6144 bytes)
- SHOTGUN SHELL ON THE PUMP RACK (weaponDischargeEffects.js): a weapon whose stance.cadence is
  'pump' or 'bolt' keeps its case at the shot; it flies at the back of the stroke,
  strokeEjectDelay(stance) = 0.1 + 0.45 * cycleSeconds (exactly where combat/pumpRack.js has the
  pump fully back; tested against pumpTravel). Six fixed pending slots; ages only while effects are
  not frozen. Command 'effects/eject' {shooterId, weaponId, origin?, direction?}: combat may call
  it at the back of its stroke; from the first call effects waits for combat's calls for that
  shooter (fallback 3x the delay); other shooters keep the timed case. Agreement written in
  REQUESTS.md (~10:30, effects section).
- ROCKET BACK-BLAST from the aim view: s10-rocket-aim.jpg (old recipe, 0.14 s, aim view) showed
  NOTHING: the jet blows back past the camera and nearFade hides it. Recipe now adds a pale
  backblastSmoke cloud thrown out flat ALL ROUND the shooter (aim 'flat', 7-9, 2.2-3.4 s), more
  ground dust (8-10), a warm fireGlow at the tube end, light 1400 / 12 m / 0.16 s.
- HEAT SHIMMER: the post pipeline (atmosphere's postPipeline.js) has no screen copy or
  distortion hook, so a rising heat-haze card (style heatHaze: faint pale-warm upright dust
  card, opacity 0.09, lit 0.4) rides over wreck_fire, vehicle_fire and ground_fire. Request to
  engine for a distortion target in REQUESTS.md.
- AMBIENT (new ambientEffects.js): emitters found once from the plan (findAmbientEmitters, pure):
  surf every 16 m along beach shore edges (2.5 m out to sea, recipe 'surf': surfFoam + splash,
  running up the sand), sea_spray every 14 m on seawall/rocky edges, pier spray both sides every
  12 m where the pier stands over water (shoreDistance < -6), steam_vent at every 3rd
  'manhole_round' of streetWearLayout.layOutSectorWear in centro / barrio_hierro /
  puerto_tamarindo (max 60). 64 m grid; every 0.25 s the nearest 12 within 110 m of the camera
  work, each on its own jittered interval (surf 1.4 s, spray 2.4, pier 3, steam 0.5). Plan read
  lazily from openWorldCity.plan in update (checked once a second until found).
  BOATS: vehicle entities tagged 'boat' (none yet: the roster has no boat physics) and models
  handed over with 'effects/boat' {object, speed?, remove?}: wake every 0.08 s at anchor_wake
  (or fleet.anchorOf(id,'wake'), or 4.4 m astern), recipe boat_wake (wakeFoam + mist, scale
  speed/10); bow_spray at anchor_spray_l/_r every 0.11 s above 4 m/s; within 260 m.
- STILLS (new effectsStillScenes.js, registered from effectsShowcaseScene.js):
  effects-rifle-casing (&after=s, default 0.06), effects-rocket-launch (0.2 s), effects-surf.
- stats() now has ambient {emitters, active, boats} and waiting (cases on a stroke).

## Captures this shift (GPU)
- s10-rocket-aim.jpg: OLD back-blast from the aim view (discharge-rocket.js): nothing visible.
- s10-*.log (10:24 batch): INVALID, engine's worldRenderPipeline called resolution.hold() before
  dynamicResolution had it (engine mid-edit; fixed 10:24:31). s10b casing/rocket hung on a busy
  GPU (killed); s10b-surf.jpg did run.
- s10b-surf.jpg (effects-surf at along 0.5): the lead ended up UNDER the pier (it is at ~0.5);
  sand, water's own shore foam, golden light; my surf particles not distinguishable from the
  water's foam band. Scene moved to along 0.42 (140 m east of the pier) - NOT re-captured.
- s10c-casing.jpg (effects-rifle-casing, 0.06 s): WORKS - flash and tracer gone, a brass rifle
  case clearly visible in the air near the reticle, rifle and hands read. Showcase can use it.
- s10c-rocket.jpg (effects-rocket-launch, 0.2 s): the back-blast now reads from the aim view as a
  warm pale haze/cloud round the shooter (lower half, both sides) with dust; subtle - could be
  denser/darker (backblastSmoke opacity 0.5 -> 0.65, flat count 7-9 -> 10-12).
- s10c-smoke.log: GPU smoke OK 10:55 (exit 0, no console errors) with the final code.

## Next steps, in order
1. Re-capture effects-surf (now along 0.42) and check stats().ambient (emitters ~658 on seed 1:
   surf 150, spray 420, pier 28, steam 60 - scripts/emitters.mjs; active should be > 0 there);
   if surf is lost in the water's foam, make surfFoam taller (splash up) or denser. Thicken the
   rocket back-blast cloud a little (see s10c-rocket.jpg). Capture steam in Centro (golden hour,
   backlit) and the heat haze over effects-burning-cruiser (not yet captured).
2. Boat wakes: capture with a speedboat model placed by hand + 'effects/boat' (showcase's
   skyline picture is the user); the wakeFoam card is a camera-facing billboard: if it reads as
   puffs rather than a flat trail, add a flat 'onWater' option to the renderer (lie on XZ).
3. Heat shimmer for real if engine adds a distortion target.
4. Casing 'clink' is audio's (WEAPON_FIRED, or the stroke time).

## Requests to other owners (all in REQUESTS.md ~10:30 effects)
- combat: optional 'effects/eject' at the back of the pump stroke (shape above).
- engine: distortion target for heat shimmer (optional).
- vehicle-system: tag boat entities 'boat' when boats get physics.
- showcase: 'effects/boat' for the skyline speedboat; new stills.

## Commands
    node --test "tools/tests/effects/*.test.mjs"
    /opt/marazul-tools/gpu-capture capture --size 960x540 --page "index.html?shot=effects-rifle-casing&seed=1&quality=high" --out /tmp/marazul/effects/x.jpg
    scenes: effects-rifle-casing, effects-rocket-launch, effects-surf, effects-burning-cruiser(-far),
      effects-explosion(-night), effects-burning, effects-gunfire, effects-drift
    /opt/marazul-tools/gpu-capture smoke --out /tmp/marazul/effects/smoke.jpg

## Files (all mine)
worldEffects.js (entry), effectsDirector.js, particlePool.js, decalPool.js, effectCatalogue.js,
effectSpawning.js, effectTextures.js, particleRenderer.js, decalRenderer.js, effectLights.js,
debrisChunks.js, vehicleDrivingEffects.js, effectsShowcaseScene.js, effectsStillScenes.js,
tracerStreaks.js, shellCasings.js, weaponDischargeEffects.js, ambientEffects.js;
tools/tests/effects/{effectPools,drivingEffects,debrisChunks,shotEffects,ambientAndStroke}.test.mjs;
tools/preview/effects.html.
