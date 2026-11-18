# showcase (showcase director): handoff note, 18 Nov 11:19 UTC (shift 10, 11:03 to ~11:20) - real, kept work

Owner: game/src/showcase/**, shots.json, screenshots/** (binary pictures only), tools/take-screenshots.mjs,
tools/tests/showcase/**. Scratch this shift: /tmp/marazul/showcase/s10/ (take.sh, <name>.json/.log, out/, final/,
cmp*.jpg, judge-final.jpg). Shift 9's note: /tmp/marazul/showcase/s10/NOTES-s9.md; shift 8's: s9/NOTES-s8.md.

## Installed (screenshots/, ALL FOUR NEW this shift; rendered from the code defaults, --check ok, tests 5/5, GPU smoke OK)
  1-cover-golden-hour.jpg    take c4  lum 85.1  234 kB  18.88 h, traffic 2.6, wreck 31 m ahead (clear of the palm)
  2-mission-firefight.jpg    take f15 lum 88.7  202 kB  Barrio Hierro along 0.47: brick warehouse, wires, graffiti; crew
                                                         grouped by the burning SUV; no crew tracer scratches
  3-dusk-on-foot.jpg         take d10 lum 85.9  218 kB  19.55 h HAZY, wet 0.6/0.3, traffic 2.6: neon + shop signs lit,
                                                         car lamps streaking in the damp road, sky warm; no FISTS card
  4-skyline-from-the-sea.jpg take k14 lum 128.3 193 kB  19.45 h, no police heli, news heli side-on 45 m out, speedboat
                                                         95 m out with wake, parasol rows faintly on the sand
Judge sheet: /tmp/marazul/showcase/s10/judge-final.jpg

## Findings
- GPU queue was EMPTY this shift: a take came back in 10-90 s. take.sh runs two at a time.
- Lamps/neon follow atmosphere.state.nightFactor = smoothstep(0.052, -0.105, sun.y) (+ cloudDarkness*0.8 for weather).
  In clear weather it is 0 until ~19:25 (19.4: 0.10, 19.5: 0.26, 19.6: 0.47, 19.75: 0.78). So "19:05-19:15 with lamps
  on" is impossible in clear weather; hazy adds a bit and lifts the frame. Clear 19.68 wet (d7): lamps on, lum 70.
- The white "scratch" in picture 2 was the CREW's tracers (aimed at the lead's hips, they pass under the camera).
  missionFirefight.js now drops non-lead tracers during the last ~0.5 s and freezes 0.02 s after the LEAD's flash
  (holdForLeadShot wraps commands.send; restored before run() ends).
- The crew still stand upright (mission enemies; simulation.aimWeapon on them had no visible effect -> removed).
  The lead's flash reads only faintly against the SUV fire at 768x480.
- Other agents' mid-edits broke two takes (specialAreas.js railAlong, citySectors.js CITY_PAINTINGS): check ok:false
  logs for console errors before judging; retake.

## Code this shift
- showcaseStaging.openScene: &weather= &traffic= &crowd= query tuning (judged pictures never pass them).
- goldenHourCover.js: SUN_HOURS 18.88, traffic 2.6, WRECK.ahead 31.
- duskOnFoot.js: 19.55, hazy, WET 0.6/0.3, DENSITY {traffic 2.6, crowd 2}.
- skylineFromTheSea.js: hours 19.45, helicopter null, news {45,8,34}, boat {95,18,0.3}; &news takes a 4th field course.
- skylineCraft.js: news heli course default 0.05 (side-on), setting.course overrides.
- missionFirefight.js: STREET.along 0.47, crew marks as a huddle (TURNED = first 3 face the lead, rest face the middle),
  holdForLeadShot (above), &after= tuning.

## Next steps, in order
1. Firefight: make the crew read as "turning to fire" (needs missions/pedestrians: mission enemies raise their guns
   when aiming; request below). Then retake f (t 0.45-0.5) and pick the frame with the lead's flash visible.
2. Skyline: haze still flattens the towers; try skyline-from-the-sea with eyeHeight ~25 and the boat 90 m out, or
   &weather=clear check; beach rows read only faintly (closer view of the sand?).
3. Dusk: street lamp heads barely read at 19.55 hazy; if engine raises lamp emission at low nightFactor, retake.
4. Cover: fine at 85; a take at 18.85 with a few more cars on the hotel side could add life.

## Requests to other owners
- missions/pedestrians: mission enemies (data.missionEnemy) standing their ground should show the aim pose
  (crowd simulation.aimWeapon) while facing the lead; today they stand arms down in pictures.
- engine/atmosphere: street lamps could come on a little before sunset (nightFactor ramp starts at sun.y 0.052);
  a lamp-on ramp from ~sun.y 0.10 would let a dusk picture show lamps with the sky still bright.
- effects: a scene option to draw only the lead's tracer (showcase works round it by filtering EFFECT_SPAWN).

## Commands
    /tmp/marazul/showcase/s10/take.sh f15 d10 ...    # parallel GPU takes from s10/<name>.json into s10/out
    node tools/take-screenshots.mjs --gpu --shots <file> --out-dir <dir>   # one shots file
    node tools/take-screenshots.mjs --install --reuse --out-dir /tmp/marazul/showcase/s10/final
    node tools/take-screenshots.mjs --check ; node --test "tools/tests/showcase/*.test.mjs"
    /tmp/marazul/showcase/judge-sheet.sh screenshots /tmp/marazul/showcase/s10/judge-final.jpg
    convert x.jpg -colorspace Gray -format '%[fx:mean*255]' info:     # mean luminance (owner: >= ~85)
    /opt/marazul-tools/gpu-capture smoke
