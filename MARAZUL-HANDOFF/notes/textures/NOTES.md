# textures (B1 math + texture toolkit): handoff note

Shift 04:55 to 05:11 UTC, 18 Nov (stopped early on the coordinator's order: usage limit).
Everything below is in the tree; 42 tests pass (33 core-math, 9 textures); the preview captures
with no console errors (last capture 05:10, view=street&sliced=1).

## Done and usable
- game/src/core/random/ and game/src/core/math/: predecessor's work, untouched, tests pass.
- game/src/render/textures/ (predecessor's, verified): noise/ (tiling gradient, fractal, cellular,
  white; noiseFieldCache), fields/ (operations, filters, patterns), surfaces/ (surfacePainter = the
  painter; surfaceMapPacking = colour, normal from height, packed ORM; one recipe file per family;
  surfaceCatalog = names, tile sizes, sliced jobs), textureQuality.js, colorMath.js.
- NEW this shift:
  - surfaceMaterials.js: createSurfaceLibrary({ wetSurface, worker }) with getMaterial(name, options)
    (painted now, cached by key), requestMaterial (1x1 placeholder maps, painting queued, the same
    texture objects are refilled so no shader recompile), step(budgetMs), drain(), whenIdle(),
    pending, getTextures(), stats, dispose(). Textures carry repeat = 1 / tileMetres: mesh UVs are in
    METRES. `uvMetres: false` for 0..1 quads; `tint` for tintable surfaces; decals (road paint) are
    transparent, depthWrite off, polygon offset.
  - surfaces/roadMarkingSurfaces.js: paintRoadMarking (solidLine, dashedLine, doubleLine, stopBar,
    crosswalk, arrow straight/left/right), wear 0..1, alpha = coverage. Catalogue names:
    markingSolidLine, markingDashedLine, markingDoubleYellow, markingStopBar, markingCrosswalk,
    markingArrow (256 px; tile = [metres along u, metres across v]).
  - Catalogue: 34 surfaces. asphaltOld and asphaltPatched tile over 8 m (4 m showed the patches
    repeating); grass made greener and nearly closed (bare spots drew a grid).
  - signs/signPainter.js (canvas 2D, browser only): paintBrandSign, paintBillboard,
    paintStreetNamePlate, paintLicencePlate, generateLicencePlateText, createSignCanvas.
    signs/signMaterials.js: createSignLibrary() with brandSign(idOrBrand, options),
    billboard, streetNamePlate(name, { district }), licencePlate(text, { series }), setNight(n),
    dispose; each returns { material, aspect, glow, widthMetres }. Brands and styles come from
    game/src/catalog/brandsAndSignage.js. Neon styles get an emissive canvas; seen lit at 21.5 h.
  - tools/tests/textures/surfaceCatalog.test.mjs: 9 tests.
  - tools/preview/surfaces.html: views street, close, markings, ground, wall, signs; params time,
    weather, wet, quality, frames, seed, detail, sliced. Looked at: /tmp/marazul/textures/
    street.jpg, ground.jpg, close.jpg, signs.jpg, signs-night.jpg, ground2.jpg (6 of 15 images).

## NOT verified (written in the last minutes, opt-in, default paths unaffected)
- surfaces/surfaceWorker.js and the `worker: true` option of createSurfaceLibrary (paints
  requestMaterial() surfaces in a module worker, buffers transferred). Never run in a browser.
  First step for the successor: add `?worker=1` to the preview (createSurfaceLibrary({ wetSurface,
  worker: true }), use requestMaterial, `await surfaces.whenIdle()` in place of the step loop),
  capture, fix what breaks; add a Node test of paintSurfaceRequest (it is importable in Node).

## Decisions
- Recipes are generators over a painter of Float32Array fields; heights are in metres and the
  painter knows the tile size, so normals are physically scaled.
- wetSurface is injected into the library so render/textures does not depend on render/weather.
- Road paint is a separate decal layer (own meshes about 4 mm above the road).
- Signs are quads with 0..1 UVs; emissive intensity = glow x night factor via setNight().

## Timings (Node 22, one shared core; the software-rendered browser is similar)
512 surfaces: 25 to 75 ms warm, 55 to 125 ms cold noise cache; 1024 asphalt 140 to 200 ms warm, up
to 500 cold. The preview paints 38 texture sets in about 3.3 s. This is NOT the "few milliseconds
per 512" of the brief. Slicing works but steps are 5 to 45 ms (asphalt warm: 11 43 38 4 19 5 35 28
10 24): with step(4) the preview needed 183 slices averaging 20 ms. Hence the worker.

## Next, in order
1. Verify the worker path (above). If it works, make it what the game uses.
2. Speed on the main thread: split the big per-texel loops and finish() into row bands so no step
   exceeds about 4 ms; consider 512 asphalt plus a detail normal instead of 1024.
3. Anti-repeat helper in the material (stochastic or second-scale variation), most needed for
   asphalt on long roads, grass and sand.
4. Signs: stencilled road words, road signs, vehicle liveries (taxi, police, ambulance, bus), a
   normal map for embossed plates; the right-turn arrow's head is too small.
5. Decals: tyre marks, oil, bullet holes, blood, scorch, graffiti.
6. Look at view=wall and view=markings, and rain (weather=rain) on the surfaces.
7. The catalogue header comment in surfaceCatalog.js still says 29 surfaces and 150 MB: now 34,
   and the preview set is 177 MB at detail 1 (the four 1024 asphalts are 85 MB of it).

## Known problems
- Generation speed (above). Texture memory: request only what a district uses, or detail 0.5.
- surfaceMaterials.js, signPainter.js and signMaterials.js have no Node tests (three / canvas);
  they are exercised by the preview only.
- Headless Chromium here lacks the named fonts (Brush Script, Arial Black ...): signs fall back
  to generic families, so script styles look plainer than on a desktop.

## Commands
    node --test "tools/tests/core-math/*.test.mjs"
    node --test "tools/tests/textures/*.test.mjs"
    node /tmp/marazul/textures/bench-surfaces.mjs            # timings per surface (scratch)
    node /tmp/marazul/textures/profile-steps.mjs asphalt pavingSlabs   # per-step times (scratch)
    node tools/capture.mjs --root . --size 960x540 --timeout-ms 240000 \
      --page "tools/preview/surfaces.html?view=street" --out /tmp/marazul/textures/street.jpg
