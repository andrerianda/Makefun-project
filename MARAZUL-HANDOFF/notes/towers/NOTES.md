# towers (brief BK2) handoff note

Written 05:39 UTC 18 Nov by the shift that started 05:18 UTC (third shift on this brief).
Everything below is real, kept work: the tree matches this note.

## State at hand-back
- kit_glass_tower BUILT (build3, landed 05:33) and REGISTERED; its asset tests pass
  (`node --test "tools/tests/assets/*.test.mjs"`: only kit_deco_resort fails, the buildings
  artist's, not ours). No process of ours runs except the orphaned build1 poller (see incident).
- Script, built file and registry are in step: nothing in the script is ahead of the file.

## GPU incident at 05:07
The GPU worker restarted about 05:07 and lost its in-memory job table: every gpu-run started
05:02 to 05:08 (set_traffic_control, royal_palm/coconut_palm, family_sedan, kit_deco_resort,
sports_coupe, and our first kit_glass_tower build, log build1.log) polls `HTTP 404` forever and
never lands. A 404 on /job/<id> means the worker does not know the id (gpu_worker.py), never
"still running". Our orphaned poller (pid 14224) could not be killed (permission refused); it
uses no GPU. Note: gpu-run pulls the whole game/assets from the worker, so our builds also
brought back other artists' finished files that were left on the worker.

## Files in the repository (all typed with Write/Edit)
- art/blender/assets/towers_industry/_kit.py : shared helpers: Mesher, card, Kit; materials
  window_glass (lamp_window_<group>), curtain_wall_tile, flat, coated_panel; constants
  BAY, PANE, OFFICE_STOREY, GROUND_STOREY, TOP_PIECE, CORNER, GLASS_TINT, SPANDREL.
- art/blender/assets/towers_industry/kit_glass_tower.py : the kit ('atlas': 1024).
- game/src/assets/registry/towersAndIndustry.js : entry kit_glass_tower + TOWER_KIT_MODULES
  (the assembler's table: slot, width, height, sign/light anchors, note; and `tiles`).
  registry/index.js has its import line and spread.

## kit_glass_tower as built (262,740 bytes; lod0 686 tris / 60 draws, lod1 106 tris / 44 draws;
## atlas 1024 base+ORM+normal, emissive 512, three 512 tile sets; texel density 37 px/m)
Modules (each <module>_lod0 and <module>_lod1): upper_window_4_a/_b/_c,
upper_window_2_a/_b/_c (narrow: two 1.0 m panes), upper_mechanical_4_a, corner_upper_a,
top_parapet_4_a, top_parapet_2_a, corner_top_a, top_crown_4_a, top_crown_2_a,
ground_entrance_8_a, ground_shop_4_a, corner_ground_a. Node tile_swatches (no levels) carries
tile_wall (2 m, paint finish baked near white: assembler sets its color to the wall paint),
tile_roof_flat (2 m, floor), tile_curtain_wall (4 m, one storey of design a).
Anchors: anchor_sign_top_crown_4_a, anchor_sign_ground_entrance_8_a,
anchor_light_ground_entrance_8_a, anchor_sign_ground_shop_4_a, anchor_light_ground_shop_4_a.
Materials: atlas, paint_wall, paint_trim, lamp_window_a/b/c, lamp_crown, tile_wall,
tile_roof_flat, tile_curtain_wall. Budget override: draws 160, bytes 940000.

## Decisions and why
- Office grid: storey 4.0, ground 4.2, top 1.2, pane pitch 1.333 m in 4 m modules (2 m bays:
  1.0 m panes, edges NARROW = -1, 0, 1). Glass groups are spread per pane.
- Catalogue row along X; node translation is not part of the grid (registry comment).
- Cards baked on a second row (Y = 14) from a second build of each Mesher; paint_trim twin
  `trim_baked` keeps mullions dark on cards; wall areas of cards are paint_wall quads.
- Spandrel (corrected this shift after the far proof): back-painted glass, dark and mostly
  dielectric (SPANDREL 0.085/0.10/0.12, metallic 0.25, roughness 0.16). With metallic 0.9
  it mirrored the same sky as the vision glass and the storey bands vanished at 1 km.
- Vision glass: metallic 1, roughness 0.05, mid-tone GLASS_TINT, per-pane value 0.84..1.12.
  Glass tint by the game: multiply material.color of lamp_window_*.
- Mechanical floor: void 0.05 (0.02 read as a black slot), louvre metal 0.58.
- Tiles must change names only in a build that lands in the same shift: the registry test
  compares materials and anchors exactly (extra nodes are tolerated).

## Proof pictures (looked at)
- /tmp/marazul/towers/proof_build3.jpg : top = 30/22/26-storey towers from 1 km, lod1 cards;
  bottom = street corner, baked lod0. Both read as real glass towers: storey bands, sky in
  the glass, fins and corner relief, crowns, mechanical floors, podium.
- tower_live.jpg / tower_livefar.jpg: live procedural materials (no bake) for quick checks.
- /tmp/marazul/towers/viewer_lod1_day.jpg : engine viewer, lod1 card, lamps off: glass mirrors
  the environment as a mid-tone (not black), dark spandrel band, joints visible. NB the viewer
  turns lamps ON by default (milky lit windows): pass lamps=0 for daytime.
- Images read so far: 9 of about 45.

## Next steps in order
1. Double-height lobby ground_entrance_8_b (8.4 m) with a revolving door and stone base;
   corner_ground for 8.4 m (corner posts are one storey: two corner_ground_a stacked work).
2. roof_prop pieces: lift overrun, cooling tower, mast with lamp_beacon (new material: the
   registry must change in the same shift as the build that lands it), spire base.
3. Richer bays (100 to 400 triangles allowed): slab-edge shadow boxes, transom caps, fin end
   caps; corner_upper_b for design b (paint_wall band); hotel variant with balconies.
4. 2048 atlas when the kit is complete (texel density is only 37 px/m at 1024).
5. Then kit_residential_tower (3.2 m storeys), kit_concrete_civic, kit_industrial_port on the
   same helpers (_kit.py Mesher/card/Kit work for any kit).

## Commands (from the repository root)
- Dry run (seconds): `/opt/marazul-blender/bin/python /tmp/marazul/towers/dryrun.py kit_glass_tower`
- Build (about 4.5 min warm): `/opt/marazul-tools/gpu-run --timeout 1200 --
  /opt/marazul-blender/bin/python art/build_assets.py build kit_glass_tower --preview
  --view=20,8@3@8,0,2 --view=20,8@3@40,0,2 --view=20,8@2.6@62,0,2.1` (log to
  /tmp/marazul/towers/buildN.log; let it finish; if it only prints `poll failed: 404` the
  worker lost the job: resubmit)
- Proof: `/opt/marazul-blender/bin/python /tmp/marazul/towers/tower_scene.py live|livefar|near|far [samples]`
  (CPU, 20 to 40 s each; near/far need the built .glb)
- Engine: `node tools/capture.mjs --root . --size 960x540 --page
  "tools/preview/asset-viewer.html?asset=kit_glass_tower&lod=1&lamps=0&view=18,10@24@14,2.5,0&hud=0"
  --out /tmp/marazul/towers/viewer_lod1_day.jpg`
- Tests: `node --test "tools/tests/assets/*.test.mjs"`
