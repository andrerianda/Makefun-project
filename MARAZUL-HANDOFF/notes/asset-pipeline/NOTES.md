# asset-pipeline handoff note (shift 8, 09:29-09:54 UTC 18 Nov). SHIFT BRIEF FINISHED.

## Finished (in the tree; sealed in WIP commits 3f7e334/eda203c except the last README/runner edits)
- Preview of built (Draco) files works. lib/glb.py Document.decompress() (+ _set_plain): decodes
  every Draco primitive with DracoPy into plain accessors (types as the game's DRACOLoader gives),
  drops the extension, re-adds KHR_mesh_quantization only if needed. lib/preview.py plain_copy()
  writes /tmp/marazul/assets/preview/plain/<id>.glb and import_glb() imports it; import_glb also
  skips the importer's bone-shape Icosphere (collection glTF_not_exported), which used to count as
  visible (framing) for skinned assets. Blender's bpy build here has no libbf_intern_draco_bridge.so;
  installing it was not an option (no downloads), decoding is exact anyway.
- build_assets.py: worker_build catches a preview failure (Exception/SystemExit), prints the
  traceback, records 'preview' / 'preview_error' in the result JSON, exits 0; command_build lists
  "previews" under the table (PREVIEW FAILED separately), row stays 'built', exit 0.
  library_hash() skips lib/preview.py (PREVIEW_ONLY). --jobs default 1 -> 2.
  This shift's edits stale every asset once (glb.py + runner are in the hash).
- tools/tests/assets/preview.test.mjs: plain_copy on the first .glb of characters/vehicles/buildings;
  each attribute and the indices bit-identical to the vendored game decoder; Blender import triangle
  count == file's. 360/360 asset tests pass (09:47).
- art/README.md: preview paragraph and timings under Commands, preview-failure paragraph,
  --jobs 2 default, decompress() in "Geometry compression".
- REQUESTS.md "Added ~09:52 UTC by asset-pipeline": notice to every artist.

## GPU proof (09:35-09:48), sheets looked at
- build compact_hatch kit_glass_tower --gpu --jobs 2 --preview (4 views): exit 0, 399 s wall.
  compact_hatch 65.3 s build (bake 61.5) + 10 s preview, job 77.8 s; kit_glass_tower 256.6 s
  (bake 254.3) + 11 s, job 269.8 s. Sheets: /tmp/marazul/assets/preview/compact_hatch_sheet.jpg
  (good), kit_glass_tower_sheet.jpg (correct, but a kit row of 15 modules reads small: use
  --view=35,16@5 close-ups for kits).
- preview dez_tolliver --gpu (4 views, built file, no rebuild): 10.3 s on the GPU, 556 s wall
  (waiting for a slot). /tmp/marazul/assets/preview/dez_tolliver_sheet.jpg: skinned bind pose, atlas OK.
- Logs: /tmp/marazul/asset-pipeline/shift8/gpu-build.log, gpu-preview-person.log.
- Recorded build times of 42 assets sum to ~70 min -> build all ~37-40 min with --jobs 2.

## Possible follow-ups
- gpu-run brings back /tmp/marazul/assets/work/* PNGs (62 files for a kit) and other agents' files;
  the runner could delete the work dir after a GPU build (MARAZUL_GPU=1) to shorten the pull, if no
  one reads those PNGs.
- Decoded attributes are Float32 in the game (+~12 B/vertex VRAM); could re-quantise after decode.
- art/blender/lib/__pycache__/{__init__,naming,report}.cpython-313.pyc are tracked in git (orchestrator).

## Commands
- node --test "tools/tests/assets/*.test.mjs"
- /opt/marazul-blender/bin/python -B art/build_assets.py build <ids> --gpu --preview --view=three_quarter --view=side --view=back --view=top
- /opt/marazul-blender/bin/python -B art/build_assets.py preview <id> --gpu --view=three_quarter --view=front
- decode a file: python -B -c "import sys; sys.path.insert(0,'art/blender'); from lib import glb; d=glb.Document.read(P); d.decompress(); d.write(OUT)"
