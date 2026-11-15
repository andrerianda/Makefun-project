// CAMPANILE's hand-in program for make.fun's threejs-fps-02 bounty (Node 22, standard library only).
// The game is the static files under game/. This copies them and the screenshots to the output directory and
// writes the dossier the judge reads, using the kit's own library so the gate's rebuild matches byte for byte.
//
//   play it:    python3 -m http.server --directory game 8080   then open http://localhost:8080
//   hand it in: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-threejs.ts';

const root = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const isShot = (name: string) => /\.(png|jpe?g)$/i.test(name);

mkdirSync(out, { recursive: true });
for (const dir of ['game', 'screenshots']) rmSync(join(out, dir), { recursive: true, force: true }); // a rerun starts clean
cpSync(join(root, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'));
const shots = readdirSync(join(root, 'screenshots')).filter(isShot).sort();
for (const name of shots) cpSync(join(root, 'screenshots', name), join(out, 'screenshots', name));

// The limits are the scorer's own: 160 KiB of source text, four screenshots of 256 KiB, 993 files and 48 MiB of game.
const dossier = buildDossier(out, {
  text_max_bytes: 160 * 1024,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`CAMPANILE handed in: ${shots.length} screenshots, a dossier of ${dossier.length} bytes`);
