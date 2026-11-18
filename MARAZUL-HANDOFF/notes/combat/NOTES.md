# combat handoff note (shift 10, 11:03 to ~11:20 UTC, 18 Nov). Tests pass (25). GPU smoke OK 11:17.

Owner: game/src/combat/**, tools/tests/combat/**, and the `stance` fields of game/src/catalog/weaponCatalog.js.
Entry module weaponsAndCombat.js (5.9 KB of 6 KB: keep the header short).

## Done this shift (all in the tree)
1. CARRY HOLDS wired (playerCombat.js): carryHoldOf(weapon) (exported) = stance.hold if CARRY_HOLDS has it
   ('two_hand_bat', 'one_hand_club', 'throw'). driveArms passes it to walker.holdWeapon on foot (never seated;
   no setWeaponGrip/muzzle/reload for carry holds; no play('fire') on them). Raised (aimAt along camera dir)
   while aim button held (melee) or framing (thrown); lowerWeapon otherwise.
   - Melee attack: tryFire -> startWalkerAction -> walker.play('swing', {duration: 0.55 bat, 0.45 iron});
     onAction (walker.on('action'), subscribed in bindFigure, unsubscribed on a body change) lands meleeHit at
     stage 'impact'. act.weapon pending, forgotten after ACTION_TIMEOUT 1.5 s.
   - Throw: shoot() -> startWalkerAction -> play('throw', {0.7}); at 'release' centreRay + launch(); then
     inventory.startReload() if the magazine is empty (hand empties while the next is drawn).
   - Fists: driveGuard -> setStance('guard') while aim held or 1.6 s after a strike, back to 'stand' only if the
     stance is still 'guard'; strikes jab/cross/hook (combo within 0.9 s), hit at the strike's impact.
   - Without a walker everything falls back to the old timed strike + aimPose.js and an immediate launch.
2. AUDIO_PLAY 'grenade_bounce' in thrownProjectiles.fixedUpdate before bounceOff (speed > 1.2 m/s, volume
   min(1, speed/10)); 'throw_whoosh' in playerCombat.launch (non-rocket) at the release point.
3. 'effects/eject' {shooterId, weaponId} from pumpRack's new onBack at 0.1 + 0.45 x cycleSeconds, for pump AND
   bolt (sniper) cadences (effects switches per shooter to waiting for combat's calls).
4. Test tools/tests/combat/carriedActions.test.mjs (carry holds by name, eject once per stroke at the back).
5. REQUESTS.md entry "Added ~11:16 UTC by combat (shift 10)".

## Pictures (GPU, /tmp/marazul/combat/)
- s10-bat-aim.jpg, s10-throw-aim.jpg, s10-rocket-aim.jpg: game camera. Bat cocked upright right of the head
  (normal close camera, melee has no aim framing); throw wind-up with the hand behind the head; rocket tube on
  the shoulder with back-blast smoke.
- s10-bat-side-c.jpg, s10-throw-side-c.jpg, s10-fists-side.jpg, s10-rocket-side.jpg (rocket side taken before
  the probe fix: arms followed the cut camera): throw stance reads well (support arm pointing, hand cocked);
  bat over the shoulder; guard reads. Events in the overlays: swing start/impact, throw start/release, flight 1,
  jab start/impact.
- s10-trace.jpg: hand path through a bat swing (moves; the drive is fast just before 0.5).
- Probe caveat: combat aims the arms along context.view.camera's direction, so a camera/cutTo turns the arms;
  carryprobe.js pins getWorldDirection for side views.

## Next steps, in order
1. Rocket side view with the fixed probe (PROBE_MODE='rocket' PROBE_VIEW='side'); fists aim view.
2. Arms during scripted cuts: use the follow camera's own aim yaw/pitch instead of context.view.camera when a
   CAMERA_CUT_TO hold is active (player could expose it).
3. Earlier items: barrio firefight scene tuning (street, crew distance), aim assist, brandishing crime.

## Commands
    node --test "tools/tests/combat/*.test.mjs"
    P="$(cat /tmp/marazul/combat/carryprobe.js)"; /opt/marazul-tools/gpu-capture capture --size 960x540 --page "index.html?seed=1&quality=high" --eval "globalThis.PROBE_MODE='bat';globalThis.PROBE_VIEW='side';globalThis.PROBE_AT=0.47;$P" --out /tmp/marazul/combat/x.jpg
      (modes bat | iron | throw | rocket | fists; views aim | side; overlay prints hold, events, swing, flights)
    swingtrace.js (hand path through a swing), weaponprobe.js (throw | bottle | scope | shotgun | rocket)
    /opt/marazul-tools/gpu-capture smoke --out /tmp/marazul/combat/s10-smoke.jpg
