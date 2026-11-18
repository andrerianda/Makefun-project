# character-runtime handoff note (shift 11, ~11:03 to ~11:18 UTC by the machine clock, 18 Nov)

## Done this shift
0. OWNER 11:08 "arms look broken" (run-time part) - DONE.
   - Wrist roll shared with the forearm (motion/handPlacement.js shareWristRoll, WRIST table):
     the rig has no twist bones, so a hand rolled ~100 deg on its forearm (pistol support hand
     98 deg, long-gun support hands 104-119, throw 177) wrung the wrist skin. Now the forearm
     rolls about its own length by max(55 % of the roll, roll - 43 deg) (cap 100 deg); the hand
     keeps its exact grip frame (the gun does not move: barrel-to-target 1.2 deg as before).
     Measured (dbg-wrist.mjs): every aimed wrist rolls <= 43 deg (characters asked +-80: met).
     Wrist FLEXION untouched (pistol 23/43 deg; long guns' strong hand ~90 deg: clamping would
     turn the gun; fix through per-hold poles/grip keys if the new skin shows it).
   - POP found and fixed: motion/locomotionPose.js hipTurn flipped 1.1 rad in one frame when an
     aimed strafe crossed pure sideways (facingAngle +90 -> -90): the aimed hands jumped 7.9 cm
     in one frame. Faded to 0 within +-17 deg of sideways: worst hand step now 1.5 cm/frame
     (dbg-pop.mjs sweeps aim yaw/pitch while walking). Elbow poles already down-and-out; no
     inversion seen in the sweep.
   - GRIP HANDS wired (rig/gripHands.js + controller): finds hand_r_grip / hand_l_grip and the
     relaxed `hands` (the THREE.LOD; hands_lod<N> only when there is no LOD), hides the grips at
     set-up, shows them (hiding `hands`) while a weapon is held (weapon layer > 0.5), reverse
     otherwise; files without the nodes are untouched. The rebuilt dez_tolliver.glb had NOT
     landed at 11:16 (no hand_r_grip in any game/assets/characters/*.glb): not yet seen in game.
   LOOKED: s11-aim-wrist-zoom.jpg / -zoom2.jpg (arm straight and smooth into the gun, no crease),
   s11-aim-final-zoom.jpg.
1. STANCE (QA 10:50) - DONE. aimStance.js: standing, the feet spread to stanceWidth 0.45 (x body
   scale) side to side (walking only the old +5 cm each: the controller passes weaponState.still
   from the gait speed, so strafes do not get wider), drop 0.062 -> 0.08, hipPitch 0.27 -> 0.31.
   IN THE GAME (aim-final-m.js, pistol, in the AIM direction's frame, s11-aim-final.log):
   feet 0.47 m apart sideways, left 0.23 m ahead (0.52 m apart); trunk (pelvis->neck) lean 16.3
   deg, head over pelvis 20.2 deg; hips 0.929 m (standing ~1.006: 7.7 cm lower). Aim view kept:
   head 29.8 % (bone at 53.8 % from the top), right hand 40.0 % / 56.1 %, support 37.8 % / 57.1 %,
   shouldersBackVsCamera 27.0, chest 6.9 deg off the view (the player's aim camera is now
   1.72 m / 1.28 m / -1 deg / 0.42 / fov 50 - their change). LOOKED: s11-aims-side.jpg.
   NOTE on QA's numbers: probe-weapons.js measures along p.motion.heading, which is ~50 deg off
   the figure's body (its idle feet show a 14 cm "stagger"), so its width/lean read low.
2. play('rack', {duration, delay}) - DONE (weaponHandling startRack/pumpStroke: combat's
   pumpRack curve; the hand rides 7 cm; a small kick; from the first call a shot no longer racks
   by itself - combat stops moving setWeaponGrip once play('rack') succeeds: no double stroke).
   'watch' (stance, hands 'clasp'), 'lean_wall' (stance, body; wall ~0.3 m behind) and gesture
   'smoke' - DONE (motion/loiterPose.js; GESTURES has 'smoke'; preview acts sheet has them).
   LOOKED: s11-acts-side.jpg (figures 7-9: smoke, watch, lean_wall read right; small in frame).
3. MELEE/THROW: combat HAS wired them. From combat's s10-bat-side-b.jpg / s10-throw-side-b.jpg
   (swing 0.88/0.90) both showed the RECOVERY to the cocked key (throw hand up at the face):
   carryPose.js now holds the follow-through (bat 0.72-0.84, iron 0.7-0.84, throw 0.72-0.86)
   and returns in the last ~15 %; bat gets a 0.4 key so it drives down from 0.28 (combat 11:16:
   "upright until 0.5"; now hands 1.09 m, bat level-forward at 0.48). NOT re-captured in game.
4. SPLIT: the vehicle transit's posing -> controller/transitPosing.js (poseVehicleTransit,
   reachTransitHand); controller ~35 KB. Stance/action handling still in the controller.
Tests: tools/tests/characters/loiterRackAndWrists.test.mjs (new, 8). 57 pass; pedestrians 30,
combat 25, police 43, player 34 pass. GPU smoke OK (s11-smoke3.log 11:16; bat key added after,
pure data). CONTROLLER.md updated (rack, watch, lean_wall, smoke).

## Next steps, in order
1. When dez_tolliver.glb with hand_r_grip lands: aim capture (aim-final-m.js), crop the hands,
   check the grip sits on the pistol and that hands swap back when holstered.
2. Capture bat and throw in the game (combat's s10-*-side-b set-up, or preview script=carried
   phases=9 view=side) to confirm the held follow-through and the earlier drive.
3. Long guns' strong-hand wrist flexion ~90 deg: per-hold poles/grip keys.
4. Controller split: stance/action handling -> controller/actionPlayer.js; events module.
5. play('fire', {lift, recover, shake}) options are ignored (one recoil envelope): read them.
6. Rocket in the aim camera, crouched tactical walk check, smg shake per shot, QA bug 13.

## Commands
    node --test "tools/tests/characters/*.test.mjs"
    node /tmp/marazul/character-runtime/dbg-wrist.mjs      # wrist roll/bend, forearm roll, elbows per hold
    node /tmp/marazul/character-runtime/dbg-pop.mjs        # biggest per-frame elbow/hand step over an aim sweep
    node /tmp/marazul/character-runtime/dbg-stance3.mjs pistol_two_hand,rifle   # width/stagger/lean (aim + body frame)
    node /tmp/marazul/character-runtime/dbg-carry.mjs two_hand_bat
    /opt/marazul-tools/gpu-capture capture --size 1280x720 --page "index.html?seed=1&quality=high" --eval "$(cat /tmp/marazul/character-runtime/aim-final-m.js)" --out /tmp/marazul/character-runtime/x.jpg
      (aim-final-m.js = aim-final-l.js + `stance` numbers in the aim frame; window.__WEAPON picks the weapon)
    /opt/marazul-tools/gpu-capture capture --root . --size 960x540 --page "tools/preview/characters.html?script=acts&phases=9&view=side&spacing=1.1" --out ...
    /opt/marazul-tools/gpu-capture smoke --out /tmp/marazul/character-runtime/smoke.jpg

## Known problems
- Other owners' in-progress errors seen in captures: "PORT_APRON_WIDTH is not defined"
  (world/plan/specialAreas.js, ~11:08), "CITY_PAINTINGS is not defined" (vehicle-system, 11:16).
  My final smoke passed.

## State at hand-off: consistent. No process of mine running.
