# Audio: handoff note (shift 9, 10:15 to ~10:55 UTC, 18 Nov)

## State at a glance
Everything below is in the tree. Tests: node --test "tools/tests/audio/*.test.mjs" (23 pass, 6 new).
In game (GPU, combat-eval.js, Gran Via 13:00): bank rendered (143 ms total, spread over the first frames
after the first click), acoustics measured (Gran Via: enclosure 0.63, canyon 0.5, slap 0.17 s), ~0.1 ms per
gunshot on the main thread (incl. event dispatch, casing, surface lookup), firefight (rifle every 6 frames)
0.11 ms/frame for the whole director, police helicopter forced -> rotor audible, audio 0.185 ms in
M.profile at 5 stars with the helicopter. Budget 0.3 ms. The only capture error was fan_palm.glb 404
(vegetation's file landing mid-capture, not audio). That eval ran on the final audio code (10:30).
NOT DONE: a clean smoke after it. The GPU smoke (10:48) and the full preview capture (10:36) both timed
out in the GPU queue (four other agents' jobs ahead); run the smoke first thing next shift.

## New this shift (files in game/src/audio/)
- pcmSynthesis.js (pure): render into Float32Arrays: addNoise (TPT state-variable filter, sweeps, brown,
  crackle), addTone (swept sine/triangle/square), addRing (inharmonic partials), addEchoes (rolling darker
  copies; flushes denormals - without that the loop was 10x slower), finishPcm (tanh drive, peak, end fade),
  measurePcm, renderRateFor(ctx) = min(rate, 32 kHz).
- combatSoundRecipes.js (pure): GUNSHOT_CLASS_SOUND per class (pistol, revolver, smg, shotgun, rifle,
  sniper: crack/body/boom/tail/mech/echo delays), gunshotClassOf(weapon) (revolver = handgun with cylinder
  reload), casingKindOf (brass | rifle_brass | shell | null for revolver/thrown/heavy/melee), renderGunshot
  (crack, blast, body, boom, slide/bolt click, street echoes; sniper rolls ~2.6 s), renderCasing (5 bounces),
  grenade bounce, glass crack/shatter, rocket launch + whoosh, throw, bottle smash (glass + whoomp + crackle),
  pump stroke back/forward, sniper bolt, stingers (suspicious, alarm). COMBAT_SOUND_RECIPES by name.
- renderedSoundBank.js: AudioBuffers (2 variants for shots/casings/glass/bounce), prerender(ms) once a
  frame from the director until done, play(out, t, name, {gain, pitch}) = one BufferSource.
- weaponAndImpactSounds.js (rewritten on the bank): gunshot(weaponId, origin, loudness, direction):
  speed-of-sound delay (distance/343, max 2 s), refDistance from noiseRadius/150 (the old code used
  9*noiseRadius = no distance falloff at all), pump stroke at the pumpRack timing (0.1 + 0.3/0.9 x
  cycleSeconds) + shell, sniper bolt at +0.45 s + case, casings to the shooter's right on HARD ground only
  (footstep surface asphalt/concrete/wood/metal) within 28 m, priority footstep. Projectile weapons:
  rocket = launch thump + whoosh on a slot whose panner GLIDES along the aim for 1.6 s (mixer glideTo);
  thrown = throw swish (it used to play glass or an explosion at the thrower). grenadeBounce(pos, strength),
  bottleSmash, glass(pos, strength, 'cracked'|'shattered'), stinger(name). Explosions also delayed by
  distance, debris glass from the bank; crash no longer adds glass (VEHICLE_DAMAGED does).
- streetAcoustics.js (pure) + acousticProbe.js: one physics ray per frame (8 level directions at the
  listener out to 60 m, then one up; mask STATIC|SEE_THROUGH), every 9 frames -> enclosure, canyon
  (opposite pairs hit), slap = 2 x mean wall distance / 343, indoor = ceiling < 12 m and enclosure >= 0.6
  (tight 12-60 ms flutter, feedback 0.55), open = nearly dry, shore < 80 m damps it. mixer.setAcoustics()
  drives a new slap network (delay + low-pass + feedback, fed by the reverb send) and the reverb return.
- helicopterRotorVoice.js: one voice for the nearest helicopter (policeDispatch.helicopter {active, root}
  or any fleet record whose car.rotorSpeed > 0.05): a seamless 1 s loop (22 blade slaps, tail rotor 104 Hz,
  turbine 2310 Hz) rendered once (rotor.prepare() after the bank), rate by rotor speed, low-pass and level
  by distance, driven at 15 Hz.
- vehicleEngineVoices.js: boat wash per voice (low-passed noise from the existing noise loop) driven by
  car.wake / car.spray (Boat physics) only when the car has them. Motorcycles already sound through the
  fleet (rpm/throttle; thumping_twin / screaming_four).
- radioDrumSamples.js (pure) + vehicleRadio.js: each kit's hits (kick, snare x2, hat x2, hatOpen, clap,
  clave) rendered once per kit at 32 kHz on tune; a hit is now one BufferSource into the drum bus (was
  source + filter + gain or oscillator + gain). Levels kept absolute (test checks the kick level).
- audioDirector.js: bank, rotor, acoustics probe; VEHICLE_DAMAGED glass (throttled 0.12 s per vehicle);
  EXPLOSION_DETONATED weaponId 'fire_bottle' -> bottle smash, else explosion by radius/7; WEAPON_FIRED
  passes direction; AUDIO_PLAY ids added: grenade_bounce (volume = strength), throw_whoosh, bottle_smash,
  glass_crack, glass_shatter, stealth_suspicious, stealth_alarm (+ old ids). footstepTracker exposes surfaceAt.
- tools/preview/audio.html: new clips (pistol at 150 m late arrival, casings/pump/bolt, rocket, throw +
  grenade bounces + bottle, car glass, stingers, pistol in canyon/open/indoors, helicopter pass-by).
  NOT yet seen rendered: the full-page GPU capture timed out at 600 s (GPU queue busy with four other
  jobs). Use ?only=... per group (see Commands).

## Next steps, in order
1. Preview check per group on the GPU: ?only=casings, ?only=rocket, ?only=throw, ?only=glass, ?only=stealth,
   ?only=pistol%20at%2025, ?only=helicopter, and ?only=radio (drum hits now buffers: compare with
   p-radio2.jpg; peaks should stay 0.77..0.85). Listen-level sanity: no clipping, no silence.
2. Radio CPU in a car: re-run drive-eval.js and read overlayAudioMs (was 0.29 before the drum buffers).
3. Wire requests below as other owners land them (nothing to change in audio: the AUDIO_PLAY ids exist).
4. Optional: police radio chatter while wanted; distant gunfire ambience in Barrio Hierro at night;
   tunnel/interior ambience bed using acoustics.indoor.

## Requests to other owners (open)
- combat: send AUDIO_PLAY {soundId:'grenade_bounce', position, volume: min(1, speed/10)} on each grenade
  bounce in thrownProjectiles.fixedUpdate (bounceOff), and AUDIO_PLAY {soundId:'throw_whoosh', position}
  when the lead throws (playerCombat.launch emits WEAPON_FIRED only for rockets; NPC throws already get the
  swish through WEAPON_FIRED). Bottle smash and rocket launch need nothing more.
- missions: send AUDIO_PLAY {soundId:'stealth_suspicious'} when a guard's suspicion first crosses
  INVESTIGATE (0.3) and {soundId:'stealth_alarm'} when the alarm starts (state.alert goes >= 0)
  (stealthObjective.js watch()); once per guard per rise, please.
- vehicle-system: when boats/helicopters join the fleet, keep record.car = the Boat (rpm, throttle, wake,
  spray) / Helicopter (rotorSpeed) so engine, wash and rotor voices pick them up automatically.
- engine: register radioStations in main.js; menus send AUDIO_PLAY 'ui_click'/'ui_back';
  gameEvents.js comment for VEHICLE_DAMAGED (stage, previousStage, glass, windowsCracked, windowsShattered).
- hud: station name on RADIO_STATION_CHANGED.

## Known problems
- Bank rendering: single items up to ~10-25 ms (sniper, glass) on the first frames after the first click
  (usually the menu). If that hitch shows in play, render the sniper/stinger variants at 24 kHz or move the
  bank into an OfflineAudioContext.
- Casing landing time is estimated (0.36-0.5 s), not read from effects' shellCasings (no event there).

## Commands
  node --test "tools/tests/audio/*.test.mjs"
  node /tmp/marazul/audio/time-bank.mjs        (render timings per sound at 32 kHz)
  EVAL="$(tr '\n' ' ' < /tmp/marazul/audio/combat-eval.js)"; /opt/marazul-tools/gpu-capture capture --size 960x540 --eval "$EVAL" --out /tmp/marazul/audio/combat.jpg
  /opt/marazul-tools/gpu-capture capture --root . --size 960x1600 --page "tools/preview/audio.html?only=casings" --eval "window.__audioStats" --out /tmp/marazul/audio/p-casings.jpg
  /opt/marazul-tools/gpu-capture smoke --out /tmp/marazul/audio/smoke.jpg
  (exit 75 = no GPU machine: node tools/capture.mjs / node tools/smoke-game.mjs with the same arguments)
  Eval scripts must have no // comments (newlines are flattened).
