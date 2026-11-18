# missions + content (mission programmer): handoff note, 18 Nov ~11:20 UTC (shift 11:03 to ~11:22)

## FIRST: state at the end of this shift
Tests pass: node --test "tools/tests/missions/*.test.mjs" "tools/tests/qa/*.test.mjs" "tools/tests/catalog/*.test.mjs"
"tools/tests/core/systemManifest.test.mjs" "tools/tests/player/*.test.mjs" (115 pass). GPU probes intros2/guards2 clean
(ok true, errors []); intros3/guards3 + GPU smoke were the last runs (see "Verification" at the end).
Owner of game/src/missions/**, catalog content I edit (storyMissions.js, storyCharacters.js colours, progressionRanks.js
names; NOT combat's `stance` fields), tools/tests/missions/**.

## Done this shift
1. Intros no longer open on a grey plain (QA bug 5). ROOT CAUSE: player/cameraDirector.js does not write
   context.focus while a cutscene holds the camera, so the city kept streaming round where the lead was before.
   cutsceneDirector.js now writes context.focus.position = the lead every frame of a scene, and a STAGED scene
   (a mission intro) holds behind a black veil (fixed div, z-index 15, above HUD, under menus) until
   context.work.pendingCount has been 0 for 0.6 s (min 0.6 s, max 9 s), then calls the request's restage(),
   re-plans the shots and fades in over 0.6 s. Unstaged scenes (outros) play at once. Skip is ignored during
   the hold. GPU (intros2): holds 1.0-2.25 s, ~30 people within 40 m, streets and buildings in every intro.
2. Clear intro/start spots (QA bug 8): new stageSpot.js pickClearStage(point, obstacles): slides along the facade
   (0, +-1.5, +-3, +-4.5 m) and 0.6/1.2/1.8 m towards the door; costs each sight line (intro shots from
   cutsceneShots.js + the follow camera 2.3 m behind) that passes an obstacle circle (city obstaclesNear: pole,
   trunk, signal, clutter, shelter) +0.3 m; first zero-cost spot wins. missionScripting.stageAt uses it; restage()
   runs it again once the street has streamed (obstacles are only known then) and re-stages the giver.
   missionWorld.obstaclesNear(x, z, r). m03 play frame (intros2-m03-play.jpg): clear view, no pole.
3. m05 (QA bug 9): "Take out the loading crew" announced 3x -> fight retargets (nearest foe changed) are now
   o.retarget = 'quiet': missionRun passes on.objective(o, true) and missionScripting only moves the markers
   (checkpoints/collect still re-announce with the new target so GPS/maps follow). The body at the lead's feet:
   a start local (barrio_hierro locals: factory worker in hi-vis) shot in the crew's opening volley -> new
   missionGivers.leave(id) sends the giver and locals away when the objectives begin (back on the next show()).
   Enemy gunmen hold their first shot 2.2-4 s (missionEnemies FIRST_SHOT_SECONDS): in intros2 the lead was
   flatlined ~3 s into m05 objective 1 while standing still.
4. Stealth: AUDIO_PLAY 'stealth_suspicious' once per rise past 0.3 (re-armed below 0.1) and 'stealth_alarm' when
   the alarm starts (stealthObjective.js via world.sound). Seen in GPU guards2.
   - QA bug 6 (m02 no guard) is a PROBE ERROR: QA's probe-stealth2.js reads q.data.missionGuard; the flag is on
     q.entity.data. guards2: m02 posts 4 of 4 and they are still there at 3.6 s.
   - Clean Hands 1 of 2: post 0's outward line was junction all the way (report "no fair spot junction"). New
     guardVision.fairPostNear slides the post +-3/6/9 m along the sneak; guards2: 2 of 2 posted.
   - missionGuards.post returns guards.report (per post: spot, gap, person id / refusal) for playtests.
5. Coordinator's QA items: markers hidden in cutscenes (missionMarkers.setShown, called from scripting update);
   sight cones faint (apex alpha 0.24 x opacity 0.65-1, fading to 0 at the rim) and drawn only 10 m (DRAW_RANGE;
   the detection range is unchanged); restart point = footing(route.from) on the pavement by the facade, facing
   along the sneak.
6. Boats prepared: missionWorld.spawnVehicle puts a 'boat' class model on open water (waterSpotNear: rings to 90 m,
   water 5 m round it via city.plan.isWaterAt, bow out to sea, y 0); no water -> the land stand-in; the fleet
   still returns null for boats today -> stand-in as before. When the lead is at the helm of a real boat,
   'by: boat' checkpoint runs and go_to/escape targets move onto the water (world.waterPlace). So when
   vehicle-system announces drivable boats nothing more should be needed in missions except a GPU play of m06/m09.
7. missions system exposes `world` (missionDirector.js) for playtests.

## Next steps (in order)
1. When vehicle-system says boats are drivable (REQUESTS.md): GPU play of m06 (enter_vehicle speedboat at the
   marina, checkpoint_run on water, tail) and m09; check the boat spawns on water and the buoys are reachable.
2. m05 stealth bonus is meaningless: the loading crew fights at once; consider making them unaware until the lead
   is within ~12 m or fires.
3. m02 guards stand 14 m out across the quay road (fairPostSpot pushed past the road): check it reads fairly.
4. The giver is not in the m02 intro's establishing shot (Sol should face Dez): look at missionGivers.stage.

## Requests to other owners
- player: cameraDirector.js should write context.focus while a cutscene holds the camera (missions works round it).
- qa: probe-stealth2.js must read q.entity.data.missionGuard (bug 6 is a probe error).
- hud: (old) ui/missionObjective.js start() hide the result card.

## Commands
    node /tmp/marazul/missions/run.mjs probe-intros.js <name>    (m01,m02,m03,m05 starts from far away: hold, intro, play frames)
    node /tmp/marazul/missions/run.mjs probe-guards.js <name>    (m02/m08 guard post reports, census, cone frame, stingers)
    Outputs /tmp/marazul/missions/<name>.json and <name>-*.jpg. run.mjs inlines QA's /tmp/marazul/qa/s3/owner/lib.js.
    /opt/marazul-tools/gpu-capture smoke > /tmp/marazul/missions/smoke6.log

## Verification (end of shift)
- GPU smoke (smoke6.log): ok true, errors []. intros3/guards3: ok true, errors [].
- intros3: m01/m02/m03/m05 hold 1-2.25 s, 31-39 people within 40 m, every objective announced once, m05 lead alive
  at objective 1, no start markers in the m01 intro, no body at the m05 start (intros3-*.jpg).
- guards3: m02 4/4, m08 2/2 guards, stingers heard; cones now faint (guards3-m08_clean_hands-cone.jpg: almost
  invisible by day; raise apex alpha a little if QA finds them too faint). A small translucent pink box stands
  near a pedestrian in that frame: not identified (maybe a faded objective shell); check next shift.
- No GPU job of mine running.
