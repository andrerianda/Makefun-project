# QA area notes (shift 6, 18 Nov 11:03-~11:15 UTC by the clock)

## What exists
- tools/qa-tour.mjs (mine, unchanged): parts streets, districts, loops; GPU first, --local fallback.
- tools/tests/qa/: originality, landmarkFrontDirection, qaTour: 6 pass (11:13). No repo file changed this shift.
- Shift 6 scratch: /tmp/marazul/qa/s6/
  run.mjs <dir> <probe.js> <name> [WxH] [page]: like s5/owner/run.mjs but writes into <dir>, and replaces __W__/__H__
    (my own grab size) as well as __LIB__.
  play/probe-play.js: NEW PLAYER run with no autostart (page "index.html?seed=1&quality=high"): start menu -> Enter ->
    opening call -> W/Shift/A/D -> car -> M/T -> marker -> intro -> abort -> punch people until wanted -> flee. Keys
    are KeyboardEvents dispatched on the focused element; real time (sleep), no M.advance. grab() composites every
    visible <canvas> (3D, minimap, city map) but not DOM text (visible text is logged instead).
    CAVEAT: walking forward from the spawn reaches the m01 marker in ~14 s, so the car/map steps of that run fell
    into the intro cutscene. probe-play3.js (autostart, spawns a parked sedan 3.2 m away, F, drive, M, T, F out)
    covers the car; its spawn spot was on the pavement so the drive was blocked (not a game bug): spawn the car on
    the road next time (city.spawnPointsNear(x, z, r, 'vehicle'?) or a lane point).
  stealth/probe-stealth3.js: the s5 stealth2 probe with the census fixed (guard data lives on person.entity.data).
  carnight.jpg: the five *-car-night views of the 11:11 districts tour + play3 driving.
- Judged set at judge size (still the 09:59 set): /tmp/marazul/qa/s5/judged-768.jpg.

## Status (end of shift 6)
- Done: new-player first five minutes (start menu, opening, walk, car, map, phone, first mission, police) on the GPU;
  stealth census (4 guards, seen -> back to the sneak start: works); trees probe (no trunk overlaps; Tolliver camera
  collapse 0.92 m); night car glow re-checked on the GPU: NOT fixed. screenshots/ not retaken (09:59) -> no new
  judged review possible.
- BUGS.md rewritten. REQUESTS.md "Added ~11:30 UTC by qa".
- Five worst open: 1 judged set not retaken (showcase); 2 new game starts at 15:00 not golden hour (engine);
  3 driven car glows at night on the GPU (vehicle-system); 4 m01 intro shows other start markers as big coloured
  shells over cars (missions); 5 m01 street faces a vast empty lot (city-dressing/city-world).

## Next (in order)
1. When screenshots/ changes (mtime), rebuild the 768x480 sheet and review (commands below).
2. Re-run probe-play.js after engine sets the start hour (expect ~18:15) and missions hides markers in cutscenes.
3. Car feel on the road: spawn the car in a lane (not on the pavement) and measure 0-50 km/h and steering.
4. districts tour at night again after vehicle-system answers (GPU, not local).
5. probe-weapons.js (s5/owner) after combat wires the melee/throw holds; probe-starts.js for the unstreamed intros.

## Commands
  node /tmp/marazul/qa/s6/run.mjs /tmp/marazul/qa/s6/play probe-play.js play 960x540 "index.html?seed=1&quality=high"
  node /tmp/marazul/qa/s6/run.mjs /tmp/marazul/qa/s6/stealth probe-stealth3.js stealth3
  node /tmp/marazul/qa/s5/owner/run.mjs probe-trees.js trees
  node tools/qa-tour.mjs --part districts --out-dir /tmp/marazul/qa/s6/districts
  node --test "tools/tests/qa/*.test.mjs"
  judged: for f in screenshots/*.jpg; convert $f -resize 768x480 j/...; montage j/*.jpg -tile 2x -geometry 768x480+2+2
  luma: convert x.jpg -colorspace Gray -format '%[fx:int(mean*255)]' info:
GPU was fast this shift (probes 25 s - 2 min). Two captures at a time at most. Wait with a background
`until [ -s log ]` loop, not sleep.
