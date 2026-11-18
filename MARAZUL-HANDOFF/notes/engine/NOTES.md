# engine (F1) handoff note

## Shift 11:03 to ~11:20 UTC (shift 10), Opus 5.5. Trust this part.
Core tests 105 pass; local smoke OK (smoke13.log, errors []); full suite 1295: 4 failures, all others'
(registry budget of pedestrian_office_f / pedestrian_casual_m, characters; filed in REQUESTS.md).
1. Warm-up confirmed on GPU high (gpu-load-high.log, 11:03): first frame 5.26 s, shaders phase 1.1 s,
   first frame itself 0.42 s (was 3.4 s). Then first-view preload: core/boot/assetPreload.js
   DEFERRED_ASSET_IDS (speedboat, police_boat, news/police_helicopter, ambulance, swat_van,
   set_long_guns) + splitBootAssetIds; gameEngine streams them after scheduler.start() as tracked
   work (bootTimings.modelsFirstView / modelsDeferred / deferredModels); ?shot= loads everything
   first. GPU high after (gpu-load-high2.log): 57 of 64 models (15.1 MB), models 0.86 s, systems 2.8,
   first frame 3.9 s; play p95 33 ms, max 100 (26 programs still link in play). Software check:
   7 deferred loaded 2.7 s after ready, no faults. Docs: ARCHITECTURE s.11 "First load" paragraph.
   Considered and NOT done: deferring kits/people/props (18 call sites test has() once at init and
   would lose them for good; police officers instantiate() without a check).
   Loading screen: own design in index.html (inline SVG sunset skyline, palms, sea, sun) +
   marazul.css; loadingScreen.js adds percent + LOADING_TIPS (tip changes with the bar). s10-loading.jpg.
2. GPU low (gpu-tier-low.log): 135-173 draws, 0.36 M tris, no shadows, drawFrame 1.0-1.4 ms; first
   frame 4.0 s; dynamic resolution at a forced 4 ms target settles at 0.6.
3. Menus (gpu-start-c.jpg, gpu-pause-b.jpg, 1280x800): kicker "Golfo de Marazul", smaller title with a
   coral rule, bare-type list with a sand bar on the chosen line, quick-controls card with key caps
   (right), key hints along the bottom (menuHints), pause blurs/dims the world. Backdrop = the live
   city at the lead (key art from the game). Title still touches the lead's head at 1280x800.
4. Coordinator extras: (a) manifest import lines reordered for the judge's 13 visible paths (9 of 13
   judged systems; tools/release/checkEntry.mjs; out/ rebuilt with main.ts); systemManifest test
   decoupled from import order. (b) New game opens at 18:15 (gameClock.newGameStartHour from
   cityDistricts CITY_CLOCK_AND_WEATHER.newGameClockHours; engine clock starts there; menus' New game
   sends TIME_SET 18.25 day 1 unless ?time= froze it). GPU: gpu-opening.jpg (clock 18.26 after Play).

## Next (in order)
1. Programs that still link during the first seconds of play (98 -> 126): find which (likely effects,
   pedestrians spawned after the first frame, deferred models) and warm them.
2. Start menu: a menu-only camera vantage (slow drift over Bulevar Dorado at golden hour) would make
   better key art than the lead's back; keep streaming focus at the lead.
3. Old: rebinding UI in Controls, context-loss notice, s.12 dependsOn refresh.
Commands: eval-load.js / eval-tiers.js / eval-pause.js / eval-opening.js / eval-loading.js in this
folder, run with /opt/marazul-tools/gpu-capture capture ... --eval "$(cat file)" (see below).

## Shift 10:14 to ~10:47 UTC (shift 9), Opus 5.5. Trust this part.
All four items done; tables in docs/ARCHITECTURE.md s.11 ("Latest ... 10:40", "Low and medium",
"Dynamic resolution", "First load", "Census tags"). Core tests 102, render 41; local smoke OK
(smoke10, no errors, no warnings).
1. High re-measured (eval-frame4.js = frame3 golden only, no GL wrap; gpu-frame5.log): 274-391 draws,
   0.82-1.34 M tris (shadows 0.28-0.52 M): within. drawFrame 9.6-12.9 ms (GPU machine busy with 4
   jobs; 09:50 quiet numbers were 5-7). vehicles CPU 0.08-0.14 ms (instancing). City dressing pools
   129-151 draws, up to 924 k tris in view on Bulevar Dorado: the one owner over budget.
2. Low/medium (eval-tiers.js): medium GPU 219-261 draws / 0.71-0.87 M; software low 151 / 0.33 M,
   medium 221 / 0.74 M; city reads (gpu-tier-medium.jpg, sw-tier-low.jpg). Presets left as they
   are (within budgets). Dynamic resolution (core/quality/dynamicResolution.js): ~1 s windows on
   slow machines, proportional drop when > 2x over, pauses > 1.5 s ignored, hold() after
   requestSettle sets aside busy (streaming) frames for <= 12 s (medium used to sit at 0.75 after a
   teleport). worldRenderPipeline exposes `resolution` and passes busy = work.pendingCount > 0.
3. Census: userData.shadowCascades 'near' | 'far' (sceneCostCensus.js; nearShadowReachOf in
   frameProfiler.js; test in sceneCostCensus.test.mjs). Told city-dressing in REQUESTS.md.
4. First load: engine.bootTimings -> MARAZUL.summary().boot (scriptsLoaded, engineStart, models,
   systems, streaming, shaders, firstFrame, ready, programsWarmed, texturesWarmed, slowestInits from
   systemRegistry initMilliseconds). core/renderer/gpuResourceWarmup.js: compileAsync over the scene +
   a dry frame through the pipeline with renderer.render -> compile (86 of 91 programs before the
   first frame, was 40 of 82) + initTexture of all material textures; compile() in place when
   KHR_parallel_shader_compile is missing (no warning). index.html modulepreloads three.
   GPU medium before the dry frame: models 2.5 s, systems 8.0, streaming 8.9, first frame 12.7 s
   (3.4 s of it the first frame). Software low after: first frame 4.2 s (SwiftShader JITs at draw).
GPU smoke at medium with everything (gpu-smoke-s9.log): OK, errors []. Stopped at hand-off
without results (GPU queue 15+ min): gpu-tier-low (low on the GPU; low was measured on the
software renderer) and gpu-load-high (boot timings on the GPU after the warm-up): rerun them.

## Next (in order)
1. GPU check of the dry-frame warm-up: eval-load.js at high on the GPU; boot.firstFrame - shaders
   should fall well under 3.4 s; firstSecondsOfPlay p95 near 16.7. If a program still links late,
   it is a shadow depth variant (not covered).
2. Load: openWorldCity's init (1.9-2.3 s) and the 15 MB of models dominate; ask city-world whether
   the city build can yield (jobs) or start during the model download; consider preloading only
   the models of the first view and streaming the rest.
3. Old: rebinding UI in Controls, context-loss notice, s.12 dependsOn refresh.
Commands: eval-tiers.js / eval-load.js / eval-frame4.js like eval-frame3 (see below), e.g.
cd repo && /opt/marazul-tools/gpu-capture capture --size 1280x720 --page "index.html?quality=medium&seed=1&autostart=1" --eval "$(cat /tmp/marazul/engine/eval-tiers.js)" --eval-timeout-ms 300000 --timeout-ms 700000 --out /tmp/marazul/engine/gpu-tier-medium.jpg
node tools/capture.mjs --size 960x540 --page "index.html?quality=low&seed=1&autostart=1" --eval "$(cat /tmp/marazul/engine/eval-load.js)" --eval-timeout-ms 300000 --timeout-ms 380000 --out /tmp/marazul/engine/sw-load-low2.jpg
(the GPU queue took 10-15 min per job this shift; eval-frame3 with night timed out at 900 s)

## Shift 09:29 to ~10:05 UTC (shift 8), Opus 5.5. Trust this part.
Summary: 1 done (bands), 2 profiled (real three.js CPU; requests filed), 3 partly (night 22:00
looked at, grade + moon shadows changed; owner DROPPED the night picture at 09:58: picture 3 is
now DUSK on foot, mean luminance >= 85/255), 4 done (ARCHITECTURE.md s.11 "Latest 09:50" +
REQUESTS.md "Added ~10:02 UTC by engine").
1. Far cascade banded (render/lighting/sunShadowRig.js): a cascade with interval > 1 draws one
   horizontal band of its map per frame (shadow camera top/bottom + viewport + scissor on a back
   render target), lit materials sample the complete front map with its own matrix (wrapper
   around renderer.shadowMap.render swaps map/matrix after the pass); swap after the last band.
   Cut/light jump still draws everything at once. Test tools/tests/render/sunShadowBands.test.mjs.
   GPU check DONE (eval-frame3.js -> gpu-frame3.log, 09:50): every drawn frame 0.85-1.38 M tris
   (was 1.60-1.74 M on far-cascade frames); shadow tris now 0.28-0.62 M every frame, steady.
2. drawFrame profile (gpu-frame3.log): at the game's own pace (rAF, vsync 16.7 ms) drawFrame is
   5.1-7.2 ms median; time inside WebGL calls only ~1.3-1.4 ms (3450 GL calls/frame, no sync
   call: no readPixels/getError per frame); post passes (17-22 fullscreen quads) 0.1-0.15 ms;
   atmosphere.update ~0.1 ms; main scene renderer.render 4.9-6.8 ms incl. shadow pass 1.4-2.2 ms.
   => real three.js CPU in the scene render, not driver waits. The 8-10 ms first frame of the
   back-to-back profile is the GPU queue. eval-cpu.js -> gpu-cpu.log (Gran Via golden, 4.6 ms
   warm): scene.updateMatrixWorld 0.8 ms (5,903 objects, 5,617 matrixAutoUpdate; cars 76-84 nodes
   each), shadow pass 1.2 ms (frame w/o shadow pass 3.4), view draws + post 2.6 ms (~10 us/draw).
   Considered and REJECTED: updating only visible subtrees' matrices (vehicleInstancedLevels and
   ~25 other files read matrixWorld of hidden nodes directly). Requests: vehicle-system static nodes
   matrixAutoUpdate=false (~0.5 ms), city-dressing fewer view draws (110-128).
3. Night: GPU 22:00 after rain (gpu-night-a.jpg, before city-dressing's 10:00 signs/lamps): dark
   navy sky, towers full of warm windows, dark palm silhouettes, warm wet pools, coloured signs;
   the shop glazing on the right is a flat cream wash (buildings/city-dressing emissive). Changed:
   NIGHT saturation 1.12->1.2, contrast 1.06->1.12 (atmosphereLooks.js); moon shadows OFF
   (coordinator 10:00, city-dressing proved the frond bands are the moon): atmosphere.js
   MOON_SHADOW_STRENGTH = 0 -> rig.update(..., strength) sets shadow.intensity per cascade and
   draws no shadow map while strength is 0 (saves the 1.2 ms shadow pass at night); the first
   frame back under the sun redraws all cascades (test 'moon key ...'). castShadow stays on (no
   shader recompile at dusk). BUG FOUND AND FIXED: with strength 0 from the first frame (a game
   or ?shot= starting at night) no shadow map was ever created and every lit material stopped
   drawing (gpu-night-b2.jpg: an empty plain with lamp glows). The rig now draws the maps once
   when shadow.map is null even under the moon (test asserts it). Looked at, all GPU 1280x800, no
   console errors: gpu-dusk.jpg (19:45 wet, Gran Via: coloured sky, lit windows, wet pools, bright:
   good for the new picture 3), gpu-rainnight.jpg (Barrio Hierro rain 22:30: dark, lit windows,
   red tail-lamp streaks, bright long rain streaks), gpu-night-b3.jpg (22:00 after rain, moon
   shadows off: no frond bands, wet glossy pavement, lit signs). Local smoke9 OK (errors []),
   render tests 41, core 99.
   City-dressing's question (sceneCost and their proxy split in onBeforeShadow): the census cannot
   see onBeforeShadow; read real shadow costs from profile().drawn[].shadowTriangles/DrawCalls.
   Possible next step: a userData.shadowCascades = 'near' hint the census honours.

## Next (in order)
1. Look at gpu-dusk.jpg / gpu-rainnight.jpg / gpu-night-b2.jpg (if they landed) and the
   capture's meanLuminance: picture 3 is now DUSK on foot (SHOTS-PLAN end): mean luminance >= 85,
   no crushed blacks. If dusk is too dark, raise DUSK/BLUE_HOUR exposure (1.9 / 2.4), not lamps.
2. Re-measure with eval-frame3.js after city-dressing's building shadow proxies and
   vehicle-system's instanced levels (both landed ~10:00): expect shadow tris and vehicle draws
   down; update ARCHITECTURE.md s.11.
3. Census hint for near-only shadow casters (above), if city-dressing wants it.
4. Old: rebinding UI in Controls, context-loss notice, s.12 dependsOn refresh.
Commands this shift:
cd repo && /opt/marazul-tools/gpu-capture capture --size 1280x720 --page "index.html?quality=high&seed=1&autostart=1" --eval "$(cat /tmp/marazul/engine/eval-frame3.js)" --eval-timeout-ms 500000 --timeout-ms 700000 --out /tmp/marazul/engine/gpu-frame3.jpg
cd repo && /opt/marazul-tools/gpu-capture capture --size 1280x720 --page "index.html?quality=high&seed=1&autostart=1" --eval "$(cat /tmp/marazul/engine/eval-cpu.js)" --eval-timeout-ms 200000 --timeout-ms 800000 --out /tmp/marazul/engine/gpu-cpu.jpg
cd repo && /opt/marazul-tools/gpu-capture capture --size 1280x800 --page "index.html?shot=night-after-rain&seed=1&quality=high" --eval "$(cat /tmp/marazul/engine/eval-dusk.js)" --eval-timeout-ms 120000 --timeout-ms 600000 --out /tmp/marazul/engine/gpu-dusk.jpg
(the GPU queue was 50+ jobs deep at 09:40: a capture waited 2-10 min)

## Shift 08:31 to ~09:12 UTC (shift 7), Opus 5.5. Trust this part.
Done (all four items of the shift):
1. QA bug 12: core/diagnostics/sceneCostCensus.js counts a BatchedMesh (countBatched) by its
   active + visible instances' geometry ranges (range.count / 3), with the per-instance frustum
   test three uses (perObjectFrustumCulled) and per-instance shadow reach; one draw per batch with
   any instance in view. New test tools/tests/core/sceneCostCensus.test.mjs (vendored three through
   an inline data: resolve hook). Core tests: 99 pass.
2. ?shot= hold on hardware: already in the tree (gameEngine boot: `if (launch.shot || softwareRenderer)
   holdUntilInput()`), verified last shift. TIME_SET lag: render/worldRenderPipeline.js requestSettle()
   now also runs atmosphere.update(0, frame) with the clock's time, so atmosphere.state (nightFactor,
   sun, exposure...) follows TIME_SET / TIME_SKIP / cuts at once; the next frame still settles.
   Verified on the GPU: setTime(12) -> nightFactor 0, setTime(23) -> 1 and state hours 23 with no
   frame between. timeAndWeather.js unchanged (it already calls requestSettle).
3. Audio: nothing to do, verified: main.js imports and registers radioStations; menuScreens.js sends
   AUDIO_PLAY {soundId:'ui_click'|'ui_back'}; audioDirector.play takes {soundId}.
4. QA bug 17 (moon): no atmosphere NOTES.md exists and effects had not touched it; claimed in
   REQUESTS.md (engine, render maintenance). render/sky/skyDome.js: moonShow =
   smoothstep(0.2, 0.55, uMoonBrightness) scales the disc and its glow (brightness is
   (0.1 + 0.9 stars)(1 - overcast): 0.1 from noon to sunset, 0.21 dusk, 0.6 blue hour, 1 night),
   so no disc while the sun is up and the full moon from blue hour to first light. GPU capture
   gpu-moon-golden2.jpg (Bulevar Dorado 18:53, facing the moon side): clear sky, no disc.

Frame at high on the GPU (eval-frame.js, 1280x720, render scale 1.0, vsync 16.7 ms median everywhere;
two numbers = frames without / with the far cascade redraw):
| Street, time | draws (shadow) | triangles (shadow) | systems CPU |
| Gran Via golden | 277/349 (63/135) | 1.03/1.60 M (0.34/0.92) | 2.0 ms |
| Gran Via night | 331/406 (63/138) | 1.18/1.74 M (0.46/1.02) | 1.7 ms |
| Bulevar Dorado golden | 352/429 (73/163) | 1.01/1.67 M (0.40/1.06) | 1.9 ms |
| Bulevar Dorado night | 357/433 (66/155) | 0.85/1.29 M (0.20/0.65) | 2.0 ms |
| Barrio Hierro golden | 236/294 (44/102) | 0.66/1.05 M (0.19/0.58) | 2.0 ms |
| Barrio Hierro night | 241/304 (46/109) | 0.65/1.04 M (0.19/0.57) | 1.8 ms |
Per system (census in view; shadow casters per cascade):
- city dressing pools root world/city_dressing_street_items (street items + city-wide building
  batches near/far + sign faces + pit soil + cables): 101-115 draws, 395-597 k tris in view
  (within city+dressing 220 / 700 k); 23-27 shadow casters, 428-433 k shadow tris: OVER (~350 k).
- vehicles: ~40 draws Gran Via golden; 72-88 where SUVs are near (vehicle_suv ~7 draws each): OVER 60.
  distant_traffic 7-32 draws, 51-86 k: within (was 162 k).
- pedestrians 25-40 draws, 30-80 k; lead 9 draws 10 k; atmosphere 2 draws 55 k; city surface
  batches 6-11 draws 57-137 k, terrain 109-123 k: within.
- CPU: vehicles 0.52-0.65, pedestrians 0.24-0.54, physics 0.31-0.39, traffic 0.21-0.31, minimap
  0.20-0.22 ms: within. drawFrame wall time 7.2-12.8 ms per drawn frame (pipeline CPU budget 4.5):
  includes driver waits since the profiler draws back to back; look at it with a CPU profile.
Written into docs/ARCHITECTURE.md section 11 ("Latest: ... 08:38") and REQUESTS.md (city-dressing
shadows, vehicle-system SUV draws).

Seen (not mine): at ~08:47 a GPU capture had console errors "BufferGeometryUtils.mergeGeometries()
failed while trying to merge the uv1 attribute" twice; game/src/traffic/distantTrafficBatches.js
was being edited at 08:49 (traffic's work in progress); check that it is gone in the end smoke.
The lead stood with a palm trunk right in front at (193.4, 898.2) facing 1.7 (gpu-moon-golden.jpg).

## Night lighting (owner 08:58; coordinator authorised engine to edit the atmosphere for it), ~09:00-09:10
Ownership agreed in REQUESTS.md: engine edits render/sky/atmosphereLooks.js, render/sky/skyDome.js,
render/lighting/atmosphereState.js, render/lighting/localLightManager.js; city-dressing keeps its lamp
registrations (range, intensity, shadows, number of lights).
- atmosphereLooks: NIGHT exposure 3.8 -> 2.8 (render test needs > 3 x noon 0.9 = 2.7), moonIntensity
  0.2 -> 0.07, shadowSoftness 2.2 -> 4, skyIntensity 0.035 -> 0.02; BLUE_HOUR exposure 2.7 -> 2.4;
  FIRST_LIGHT 3.2 -> 2.6.
- atmosphereState: exposure = look.exposure * (1 + (exposureScale - 1) * (1 - solarNight)) (rain's
  x1.45 / storm x1.55 / overcast x1.3 apply by day only).
- localLightManager (fake pools of non-real lights, wet streaks): POOL_MAX_RADIUS 8 m, falloff
  shape of a lamp at most POOL_SHAPE_HEIGHT 4.5 m high, STREAK_WIDTH 0.5, STREAK_STRENGTH 0.6.
- GPU 1280x800 ?shot=night-after-rain + setTime(22): gpu-night-2200.jpg (looks/exposure only),
  gpu-night-2200b.jpg (with pools/streaks): navy sky, lit tower windows, dark palm silhouettes,
  dark glossy road with reflections, dark ground between pools. Left: the right-hand pavement still
  has a broad warm wash with faint frond shadows from a REAL (shadow-casting) lamp and bright shop
  fronts: city-dressing's (asked in REQUESTS.md). Tests 137 pass; local smoke OK; GPU smoke high OK.
- If the night is now too dark in other places, raise NIGHT exposure a little (2.8 -> 3.0), not the
  pools.

## Next (in order)
0. Re-capture night-after-rain once city-dressing's lamp fix lands; then check dusk/blue hour and a
   rainy night (exposure no longer boosted by rain at night) at Bulevar Dorado and Barrio Hierro.
1. Far shadow cascade: it doubles shadow triangles every other frame (0.34-0.46 M -> 0.92-1.06 M);
   ask the atmosphere/render owner (or, as render maintenance, sunShadowRig.js) to spread the far
   cascade over two frames by halves, or to cull small casters from the far cascade.
2. drawFrame wall time 7-13 ms: profile the submit (Chrome trace on the GPU machine) to split
   three.js submit, post passes and the atmosphere update.
3. Re-measure (eval-frame.js) after city-dressing and vehicle-system land their fixes.
4. Old items: rebinding UI in Controls, context-loss notice, section 12 dependsOn refresh.

## Commands (08:31 shift)
cd repo && /opt/marazul-tools/gpu-capture capture --size 1280x720 --page "index.html?quality=high&seed=1&autostart=1" --eval "$(cat /tmp/marazul/engine/eval-frame.js)" --eval-timeout-ms 400000 --timeout-ms 600000 --out /tmp/marazul/engine/gpu-frame.jpg
cd repo && /opt/marazul-tools/gpu-capture capture --size 960x540 --page "index.html?quality=high&seed=1&autostart=1" --eval "$(cat /tmp/marazul/engine/eval-moon2.js)" --eval-timeout-ms 120000 --timeout-ms 400000 --out /tmp/marazul/engine/gpu-moon-golden2.jpg
cd repo && /opt/marazul-tools/gpu-capture smoke --query "?quality=high" --out /tmp/marazul/engine/gpu-smoke-high.jpg

## Shift 07:34 to ~07:55 UTC (machine clock), Opus 5.5, after the 07:28 restart. Trust this part.
Checked `git diff 8ed35ac` for every engine path: the predecessor's items 1-4 (below) are all in
the tree, consistent and committed in 1297fec. This shift:
- Verified on the GPU: smoke at low and medium OK (no console error; only "GPU stall due to
  ReadPixels" driver warnings); ?shot=traffic-gran-via holds (stepCount 342 -> 342 over 3 s,
  gpu-hold.jpg shows the scene); water depth capture over a synthetic BatchedMesh: no GL error,
  no console error (eval-gpu2.js). Local software smoke OK twice.
- GPU measurement at high, both streets (gpu-high2.json) written into docs/ARCHITECTURE.md
  section 11 ("Latest: measured on the GPU machine, 18 Nov 07:40 UTC"), with the owners over
  budget: city dressing (198-200 draws / 346 k tris in view vs 60 / 200 k; 81 shadow casters)
  and traffic's distant_traffic (162 k tris vs 150 k for all vehicles). Frame: Gran Via 446/616
  draws, 1.16/1.69 M tris (over on far-cascade frames); Bulevar Dorado 392/547, 0.91/1.38 M (within).
  Systems CPU 1.5 / 1.1 ms.
- core/quality/dynamicResolution.js: decisions on the window's MEDIAN frame time (preallocated
  Float64Array, sorted in place once per window; averageMilliseconds kept for the overlay, new
  medianMilliseconds). Before: Gran Via sat at the 0.75 floor on a 3090 because streaming hitches
  pulled the mean up. After: scale 1.0 for 12 s (eval-dynres.js, gpu-dynres.json). New test in
  tools/tests/core/clockQualityAndOptions.test.mjs. Core tests: 97 pass.
- Confirmed: radioStations and progressionRanks are imported in main.js; no "progressionRanks
  catalog not loaded" warning in smoke (warnings: []).
- Seen (not mine): in gpu-hold.jpg the Gran Via towers render as plain grey boxes without window
  detail at high (city-dressing / buildings owner should check their far/near levels).

## Earlier shift (07:18 to 07:28, cut by the restart): its items, all verified in the tree

## State (07:28)
- core tests 96 pass then (97 now).

## Done that shift
1. render maintenance: game/src/render/water/waterDepthMap.js depth capture shader has
   `#include <batching_pars_vertex>` (top) and `#include <batching_vertex>` (start of main), so the
   override material compiles on a BatchedMesh. city-world can now batch the terrain.
2. gameEngine.js boot(): with ?shot= the frame loop is held after the ready frame on every renderer
   (holdUntilInput() before scheduler.start()); a key, a click or MARAZUL.resume() releases it.
   ARCHITECTURE.md section 2 step 8 says so.
3. controlBindings.js: weaponWheel ['Tab'] in onFoot and inVehicle ("Weapon wheel (hold)");
   context `shop` (INPUT_CONTEXTS.SHOP): menu actions + Escape on menuBack; labels menuUp..menuRight.
   radioStations was already in main.js; the quality test (36) already agreed with the table.
   ARCHITECTURE.md section 8 updated (shop context, Tab).
4. Menus: game/src/ui/menus.js (entry, 3.6 KB, imports only core, import() of the screens in init)
   + game/src/ui/menuScreens.js (screens and panels). Start: Continue (latest of slots 1-3, with
   day/cash/missions/time), New game (Play when no save), Load game, Settings, Controls, short
   controls list. Pause: Resume, Statistics (progression.statisticRows() by category in columns,
   rank + reputation), Settings, Controls (full list from DEFAULT_CONTROL_BINDINGS onFoot,
   inVehicle, always), Save game / Load game (slots 1-3). Settings rows through context.settings:
   graphics.quality (auto/low/medium/high/ultra), dynamicResolution, fieldOfView 50-70,
   cameraShake, audio master/music/effects/voices/muted, controls.mouseSensitivity 0.2-3,
   invertLookY, gameplay.subtitles, speedUnit. Mouse or keys (arrows/WASD choose and change,
   Enter/Space select, Backspace/Esc back; Esc at the pause root resumes). AUDIO_PLAY ui_click on
   select/change, ui_back on back/resume. Escape does not pause in the 'shop' context.
   The save system's own #save-continue button (saveSlots.start) is rebuilt over each frame in the
   start menu (refreshStartIfForeign). CSS in game/styles/marazul.css (.menu-list, .menu-row, ...).
   Verified in the real game (eval-menus.js, menus.jpg): Play -> playing, Esc -> paused, Save slot 2
   "Saved in slot 2.", statistics 7 groups / 43 rows, 13 settings rows, keyboard selection moves.
   Note: menus.js's implementation file lives in game/src/ui/ (the hud owner's folder) because the
   entry-module rule needs one; menuScreens.js is menus-only.

## Now / next (in order)
1. Re-measure at high once city dressing and traffic land their fixes (eval-gpu2.js on the GPU);
   the frame budget at high is only broken on Gran Via on far-cascade frames.
2. Consider spreading the far shadow cascade's redraw (308 vs 138 shadow draws on alternate
   frames) with the atmosphere owner's API (setQuality/setEffect), if it allows, or ask them.
3. Old items: rebinding UI in the Controls panel (controls.rebind exists), context-loss notice,
   section 12 dependsOn refresh, translation of the playerControls catalog ids.

## Requests to other owners
- economy-save: switch shop menus to controls.setPlayContext('shop') (Esc closes the shop and does
  not pause); you may drop continueButton.js: the menus build Continue / Load from hasSave/summary/load
  (slots 1-3) and rebuild over #save-continue today.
- content (progressionRanks): statistic names "Times busted" / "Times wasted" echo a commercial
  series' words; the pause menu shows them as written (suggest "Times arrested", "Times hospitalised").
- pedestrians: "spawnCompanions is not defined" (crowdSimulation.js:210) seen in a smoke at 07:23
  (not seen in any smoke of the 07:34 shift).
- city-dressing: 198-200 draws and 346 k triangles in view at high (budget 60 / 200 k) and 81
  shadow casters: merge the per-sector groups across sectors, shadows only near.
- traffic: dynamic/distant_traffic 162 k triangles (vehicles' whole view budget 150 k).

## Commands (07:34 shift)
cd repo && /opt/marazul-tools/gpu-capture capture --size 960x540 --page "index.html?shot=traffic-gran-via&seed=1&quality=high" --eval "$(cat /tmp/marazul/engine/eval-hold.js)" --eval-timeout-ms 60000 --timeout-ms 300000 --out /tmp/marazul/engine/gpu-hold.jpg
cd repo && /opt/marazul-tools/gpu-capture capture --size 1280x720 --page "index.html?quality=high&seed=1" --eval "$(cat /tmp/marazul/engine/eval-dynres.js)" --eval-timeout-ms 120000 --timeout-ms 300000 --out /tmp/marazul/engine/gpu-dynres.jpg
cd repo && /opt/marazul-tools/gpu-capture smoke --query "?quality=low" --out /tmp/marazul/engine/gpu-smoke-low.jpg

## Commands
node --test "tools/tests/core/*.test.mjs"
node tools/smoke-game.mjs --out /tmp/marazul/engine/smoke.jpg
node tools/capture.mjs --size 960x540 --page "index.html?quality=high&seed=1" --eval "$(cat /tmp/marazul/engine/eval-menus.js)" --eval-timeout-ms 120000 --timeout-ms 200000 --out /tmp/marazul/engine/menus.jpg
cd repo && /opt/marazul-tools/gpu-capture capture --size 1280x720 --page "index.html?quality=high&seed=1" --eval "$(cat /tmp/marazul/engine/eval-gpu2.js)" --eval-timeout-ms 240000 --timeout-ms 400000 --out /tmp/marazul/engine/gpu-high2.jpg
(--eval-file does not work on gpu-capture: the file is not shipped)

## Earlier (06:45 note, kept)
- Tiers: high {atmosphere high, shadows medium}, drawDistance 650, maxVehicles 48, maxPedestrians 80;
  medium 36/56; low 24/32. shadowCasterDistance 0/45/90/250/640 (nobody reads it yet).
- Profiler: MARAZUL.profile({frames, drawnFrames}), MARAZUL.sceneCost(); F3 overlay.
