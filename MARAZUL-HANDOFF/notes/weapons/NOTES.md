# weapons: handoff note (shift 05:46 to about 06:12 UTC, 18 Nov)

## Status: brief essentially finished; every catalog weapon except fists (which needs no model) is built and registered
- art/blender/assets/weapons/_weaponkit.py: the weapon kit (set naming of props.js plus the weapon
  contract), shape helpers (side() makes a slab from a (y,z) profile, block, rod, lathe_y,
  bar = a flattened tube through (y,z) points smoothed with 2 subdivisions, shift), materials
  (gun_steel with edge polish to bright steel, polymer with optional 2 mm stipple, gun_wood,
  bore_black), WeaponKit.weapon/anchor/magazine/part/layout/levels.
- set_handguns.py, built 06:17: pistol, heavy_revolver, smg, grenade, fire_bottle. 8,014 tris,
  9 draws, 467,508 B (budget 8,500 / 12 / 520,000).
- set_long_guns.py, built 06:17: pump_shotgun, assault_rifle, sniper_rifle, rocket_launcher,
  baseball_bat, tire_iron. 10,396 tris, 10 draws, 524,268 B (budget 12,000 / 12 / 620,000).
- game/src/assets/registry/weapons.js: WEAPON_ASSETS (both sets) and WEAPON_SET_OBJECTS (per
  catalog id: asset, node, lods, magazine/pump, length, hold, anchors{muzzle,eject,gripOff,tip,
  exhaust}). index.js has the import and spread lines (the trucks artist added theirs beside mine).
- Asset tests: both weapon sets pass. The other failures belong to other domains: five
  characters/*.glb files that are missing, and trucks/ambulance.glb, which is not registered.

## Contract (decisions)
- `<weapon>` = an empty at the point where the hand closes on the grip; barrel +Y in Blender
  (-Z in the game), up +Z (+Y in the game). Children: `<weapon>_lod0/_lod1`, `<weapon>_magazine`
  (the lead asked for `<weapon>_magazine`, not the props `<part>__<object>` form),
  `pump_shotgun_pump`, anchors `anchor_<role>__<weapon>`.
- Magazine origins: the magazine's top centre; the revolver's cylinder: its axis; the launcher's
  rocket: its base on the tube axis. The shotgun has no magazine node (tube magazine); its
  fore-end slides.
- Holds: the pistol, revolver and smg are two_hand_pistol (the smg has grip_off on its fore grip);
  the long guns and the bat are two_hand_long (the bat's grip_off is 4 cm below the hand on the
  handle); the tire iron, grenade and bottle are one_hand. The grenade and bottle have no anchors
  and are held round the body, upright.
- Layout in the file: one row along Blender Y, each weapon lifted 3 cm off the ground (a side view
  is the contact sheet). No colliders. occlusion_ground False. Atlas 1024 with ORM at 512.
- Stainless is metallic 0.55, not 1.0: in the engine (sky-only environment) a fully metallic
  flat side reflects the dark lower hemisphere and the revolver frame read black.
  The dark steels (metallic 0.75 to 0.8) are dark anyway, but check them in engine captures.

## OPEN ISSUE (first thing next shift): the engine shows the revolver frame and barrel near black
In the asset viewer (/tmp/marazul/weapons/engine_revolver*.jpg) the revolver's frame, barrel and
strap (lod0, made of overlapping bevelled side() slabs) render near black, while its cylinder (a
separate lathe mesh with the SAME stainless material) is bright. The Cycles preview of the same
.glb shows the frame bright silver. These did NOT change it: metallic 1.0 -> 0.55 -> 0.15
(stainless is 0.15 now and stays; it is right for a sky-only game anyway), and exporting
tangents (a.bake(tangents=True), which costs 57 kB, so I reverted it). Final files built at 06:17
without tangents.
Best hypothesis: the baked occlusion (ORM red, the aoMap in three.js) is near 0 on the slabs,
because the slab parts overlap (rear_frame, top_strap, front_frame, barrel, grip interpenetrate)
and occlusion rays start inside neighbouring solids. Check /tmp/marazul/assets/work/set_handguns/set_handguns_orm.png
(red channel) for the revolver's islands. If that is it, fix by modelling the frame so the parts
don't overlap (trim the slabs where they meet), or lower the occlusion with occlusion_distance /
occlusion_samples. Otherwise check the base PNG for those islands. The pistol and SMG
are near-black by design, so the same fault would be hidden on them; the long guns' walnut, sand
and olive parts are slabs too: capture set_long_guns in the engine to check.

## Next (in order)
1. The open issue above.
2. Polish: the SMG is a boxy machine-pistol archetype; give it a more distinctive receiver line.
   Add a lamp_laser on the pistol's rail (optional; add 'lamp_laser' to the registry materials).
   Stipple on grips is in the normal map only; check it close up.
3. lod1 is a plain decimate (40 %). Check its silhouette at 10 m with `lod=1` in the viewer.

## Commands
- Build: `/opt/marazul-tools/gpu-run --timeout 1200 -- /opt/marazul-blender/bin/python art/build_assets.py build set_handguns set_long_guns --preview --view=side@1.0`
  (focus a weapon: `--view=62,12@4@0,<y>,<z>` with y and z from the "weapons: <name> at y .. z .."
  lines of the build log; that point is the grip, so add about half the weapon's length to y)
- Engine: `node tools/capture.mjs --root . --size 960x540 --page "tools/preview/asset-viewer.html?asset=set_handguns&shots=90,6@1" --out /tmp/marazul/weapons/x.jpg`
  (viewer focus is in game axes: x, y up, z = -Blender y)
- Tests: `node --test "tools/tests/assets/*.test.mjs"`
- Logs: /tmp/marazul/weapons/build*.log; Cycles sheets: /tmp/marazul/assets/preview/set_*_sheet.jpg;
  engine: /tmp/marazul/weapons/engine_*.jpg

## Known problems
- None blocking. The library's build.box UV-layer slip is worked around (normalise_uv), as in props.
