// Dev tool (not part of the entry). usage: node tools/budget.ts
// How many judged bytes index.html + JS take, and the room left under the 163,840-byte cap before style.css.
import { execSync } from 'node:child_process';
import { buildDossier } from '/home/user/Makefun-project/vendor/makefun-threejs.ts';
execSync('rm -rf /tmp/campanile-budget && mkdir -p /tmp/campanile-budget && MAKEFUN_OUTPUT_DIR=/tmp/campanile-budget node /home/user/Makefun-project/main.ts', { stdio: 'ignore' });
const t = JSON.parse(new TextDecoder().decode(buildDossier('/tmp/campanile-budget', { text_max_bytes: 400000, screenshots: { max: 4, max_bytes: 262144 } }))).text as string;
const at = Buffer.byteLength(t.slice(0, t.indexOf('### game/style.css')));
console.log(`index.html + JS take ${at} bytes; room under the cap (less ~75 for the cut line): ${163840 - at - 75}`);
