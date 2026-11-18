# police handoff note (shift 10:15 to 10:49 UTC, 18 Nov)

## State at 10:49: police tests 43/43 pass (node --test "tools/tests/police/*.test.mjs"), core
## systemManifest test passes; SWAT game runs on GPU clean; GPU smoke NOT rerun (machine saturated).

## Done this shift (game/src/police/, tools/tests/police/)
1. WANTED-LEVEL BUG FIXED (Night Shift: six hostile crew downed -> 0 to 5 stars in 0.15 s).
   - crimeHeat.js: GANG_VIOLENCE_RULES {crimeId 'gang_violence', maxStars 2, spacingSeconds 1.5,
     perVictimSeconds 10}; isGangMember(entity) (tags gang/hostile, data.missionEnemy or factionId,
     never police); crimeAgainstVictim(crimeId, CRIME_CATALOG, gangVictim) maps every 'violence'
     category crime against a gang member to gang_violence; starCapFor(crimeId): gang_violence,
     discharging_firearm and brandishing alone never lift the level above 2 stars (addCrimeHeat
     fills heat only up to thresholds[3] - 1 = 59 for them; more serious crimes still can).
   - witnessRules.js: spacedDelay(gate, now, delay, spacing).
   - wantedLevelRuntime.js report(): looks the victim up by victimId, maps the crime, one gang report
     per victim per 10 s (wound + kill = one crime), queued so reports land >= 1.5 s apart, needs a
     witness; gang members / hostile crew / mission guards are NEVER witnesses (witnessKindOf) -
     that was half the bug (the crew, tagged pedestrian, reported their own deaths).
   - Test: tools/tests/police/gangViolence.test.mjs (real entity registry, bus, command queue):
     six crew + shots + wounds + kills in 0.15 s with an officer at 30 m -> <= 1 star at once,
     2 stars after a few seconds, never more; 6 gang reports >= 1.5 s apart; old combat 'homicide'
     kills mapped the same; crew alone (no other witness) -> 0 stars; a civilian kill is still homicide.
2. Helicopter (policeHelicopter.js): documented switch `helicopter.searchlight` (true: on only after
   dark; false: off at any hour); the beam needs street darkness >= 0.5 (off by day AND at sunset;
   fades in 0.5 -> 0.8); new `side` setting (metres right of the way of travel, negative = left) in
   the station. police-chase-night (policeChaseShowcase.js): NIGHT_HELICOPTER {altitude 30, trail
   -100, side -40} (40 m to the median side) so the beam crosses the frame. Tests in
   policeHelicopter.test.mjs (switch, sunset 19:30 dark, side station).
3. SWAT deploy: policeUnitKinds.deploySpawnScore(band, dx, dz, heading) - the tactical van, for a
   lead on foot, spawns on a lane point whose lane runs TOWARDS the lead (55-95 m ahead along it,
   <= 22 m to the side, best ~65 m), so driving on brings it past the lead; approachSpeed(profile,
   s, cruise) eases it off (5 m/s at ~21 m... (distance - 21) * 0.55) so it pulls up inside 30 m.
   Wired in policeDispatchRuntime findCarSpawn / driveCar. Tests in crewDismount.test.mjs.

## Looked at (GPU)
- swat2.jpg: INVALID (character runtime's weaponHandling.js had a missing swingWeight import at that
  moment, so officers.update threw inside policeDispatch.update; fixed by its owner minutes later).
- swat3 (eval): 4 stars on foot on Gran Via: van spawned 55 m up the lane, came in (31 m chase 9 m/s),
  stopped at 25 m at 18-19 s, four swat_officer out with smg_compact, all four in 'aim' by 22 s.
  ok:true, no console error, faults []. Picture: the boxing cruiser stands between the lead and the
  team, so the team is hidden. swat4.jpg (swat-eval3.js: lead teleported 9 m from the team's centroid
  facing them): still hidden behind a police car (one officer peeks beside the cruiser), and the
  close camera fills the frame with Dez's back. The deploy itself WORKS; the picture does not show it.
- night12 hung on the GPU machine for 26 min (stopped); night13 and a GPU smoke both timed out after
  330 s waiting for a slot at 10:42-10:48 (the machine was saturated). So police-chase-night with
  side -40 is NOT yet looked at, and the GPU smoke was not rerun this shift (the swat3/swat4 game
  runs passed with no console error, which covers boot + police at 4 stars).

## Next steps, in order
1. GPU smoke; capture police-chase-night (night-eval3.js) and tune NIGHT_HELICOPTER side/altitude if
   the beam does not cross the frame (helicopter may hide behind Gran Via towers at side -40: try
   altitude 34, trail -85).
2. SWAT picture: in swat-eval3.js put the lead ON the far side so no car is between (e.g. teleport to
   the team centroid + 9 m along the van's side vector, not toward the lead), or raise the camera.
2. Wreck flames: try effects/burn scale 1.3 for the staged wreck.
3. Officers thrown by explosions; visible slumped crew.

## Requests to other owners
- showcase: skylineFromTheSea.js turns the police searchlight off with `helicopter.leaving = true`
  (which also flies it away); use `helicopter.searchlight = false` instead (documented in
  policeHelicopter.js header). The beam is now off by day and at sunset anyway.
- combat: nothing more needed: police now maps any violence against a gang/hostile/missionEnemy
  victim to gang_violence by looking the victim up, whatever combat sends.

## Checks (scripts in /tmp/marazul/police/)
  wreck-eval2.js (police-wreck), night-eval3.js (police-chase-night), strike-eval.js, swat-eval2.js
  (4 stars on foot, logs dismountAt / dismountDistance, waits for 3 SWAT aiming, faces them).

## Commands
  node --test "tools/tests/police/*.test.mjs"
  P=/tmp/marazul/police; /opt/marazul-tools/gpu-capture capture --size 960x540 --page "index.html?shot=police-chase-night&seed=1&quality=high" --eval "$(cat $P/night-eval3.js)" --out $P/night12.jpg
  ... --page "index.html?seed=1&quality=high" --eval "$(cat $P/swat-eval2.js)" --eval-timeout-ms 300000 --out $P/swat2.jpg
  /opt/marazul-tools/gpu-capture smoke
