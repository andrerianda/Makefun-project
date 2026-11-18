# MARAZUL — handoff to a new orchestrator session (18 Nov 2026, ~11:30 UTC)

Read this first, then `orchestrator/STATE.md` (full history), `briefs/UPDATE.md` (rules + every owner direction, newest last), `briefs/SHOTS-PLAN.md`, `briefs/REQUESTS.md` (open cross-owner items, newest at the end), and each area's `notes/<area>/NOTES.md`.

## The entry
- Game repo: https://github.com/andrerianda/Gta6-01, branch `claude/eager-archimedes-dasmi2` (the entry). make.fun account @niki-willy, competition `gta6-01`, deadline 24 Nov 2026 15:00 UTC.
- Owner (GitHub andrerianda) writes casual Indonesian from a phone, wants short reports and few questions, wants screenshots of progress. Do NOT submit or claim without the owner's go-ahead.
- Validity: `node tools/release/checkEntry.mjs` (offline; all scorer rows pass as of 11:20). README.md written. main.ts has authored header lines (it must never go back to the kit starter bytes).

## Sealed recordings (all enterable; pass every id at submit with --recording id1,id2,...)
01a1ea81-a42d-73fd-84f0-fa799a944e08, 01a1ece5-20e8-740b-89ae-ed260ea904b5, 01a1ed01-6c91-70dd-b0c9-8637e3b59cce, 01a1ed30-6111-76e3-9db1-0e0d134a0521, 01a1ed4f-e0e8-77d5-8773-bfd2fd8aa7e5, 01a1ed84-79a4-73ad-ad97-b9d4ff3d7083, 01a1ed93-017e-772f-8179-1dc9ec508e2e, 01a1edc5-f1c7-7069-b883-d54ae83a7a24, 01a1edfb-bfff-72cd-aca1-ba16b2e657bd, 01a1ee25-4dd4-702b-a543-7a956f1cb38b, 01a1ee52-3731-723f-b458-651cafed003e (shift 10).
VOID (never submit): 01a1ea7c-..., 01a1ecc7-8410-769c-9cab-0ddba96b1e38.

## Who does what (owner decision, 18 Nov 11:50)
- The NEW session (other Claude account) continues the game work in the repo. It must NEVER run `submit` or `claim`.
- The ORIGINAL session (the one holding ~/.makefun with the payout wallet keypair) does the final submit, only with the owner's go-ahead.
- Recordings sealed in the new container still count: `submit --recording <ids>` fetches any recording sealed by the same make.fun account from make.fun by id (kit `sealedFilesOf`: GET /api/recordings, POST /api/recordings/<id>/finish), so no receipt file has to move.
- New-session setup: download the kit from the competition page, then `NODE_USE_ENV_PROXY=1 NODE_NO_WARNINGS=1 node cli/makefun.mjs login` and have the owner approve it on the page while signed in as @niki-willy (this gives that machine its own agent key; it never touches the payout wallet). Then record every shift with `makefun record --competition gta6-01 --source <its checkout of Gta6-01>`.
- After every seal, append the recording id and its "N of N witnessed" line to `MARAZUL-HANDOFF/orchestrator/RECORDINGS.md` (Makefun-project repo, branch claude/eager-archimedes-dasmi2) AND tell the owner the id, so the submitting session can pass every id.
- The new session's Claude account needs GitHub access to andrerianda/Gta6-01; push only to branch claude/eager-archimedes-dasmi2, never rewrite history. In the old container the entry checkout lives at /home/user/Makefun-project with origin set to Gta6-01 — run `git pull` there before the submit.

## Strict-transcript rules that keep the entry valid
1. Start `makefun record --competition gta6-01 --source <repo>` BEFORE launching any agent; the orchestrator (main) session itself began before the recording, so it NEVER writes repository text files — only commits, pushes and deletes. Every repo file must be typed by a recorded subagent with Write/Edit (no sed/python/cp into the repo).
2. Launch FRESH Agent-tool subagents each recording (never resume an agent across recordings; Workflow agents are not recorded — never use Workflow for repo work).
3. When all agents have handed back: `kill $(cat ~/.makefun/record-gta6-01.pid)`, wait for "sealed at", check every session "N of N records witnessed", commit + push.
4. If the container restarts mid-recording: `record --finish <id>`; if it cannot enter, restore the tree to the last sealed commit before the next recording. After a restart the git origin may reset — always check `git remote get-url origin` is .../Gta6-01 before pushing.
5. The owner asked for effort "medium" on agents and ~12 agents per shift (launch-focused).

## Tools (copy `tools/` to /opt/marazul-tools/)
- `gpu-run` (Blender builds on a RunPod GPU), `gpu-capture capture|smoke` (hardware WebGL captures), `gpu_pod.py status|terminate`, `gpu_worker.py` (skips queued jobs whose caller stopped polling), `pod-browser-setup.sh`. RunPod key goes in /root/.config/marazul/runpod.key (mode 600; the owner has it; never print it, never give it to agents). Pods self-terminate after 30 idle min; terminate both at shift end. Balance ~$3.8 at 11:30.
- The make.fun kit: download from the competition page (/c/gta6-01/kit) and run its CLI with NODE_USE_ENV_PROXY=1 NODE_NO_WARNINGS=1.

## State of the game (18 Nov 11:30)
Judged set installed (screenshots/, all ≥85 luminance): 1 golden-hour chase with a burning wreck, 2 Barrio Hierro firefight, 3 dusk on foot with neon, 4 sunset skyline with speedboat and news helicopter. Aim view matches the owner's reference (camera at neck height, ~27° side angle, two-handed stance, feet 0.47 m apart). Boats and helicopters drivable. New game starts 18:15 (golden hour). Own loading screen and menus.
Open, in priority order (see REQUESTS.md tail and STATE.md): grip-pose hands + arm deformation (characters, in progress at handoff); firefight crew should raise guns; dusk street lamps faint; helicopter camera/keys, boat boarding at the swim platform; owner's 1-minute gameplay video (record with Playwright recordVideo on the GPU, convert to MP4 with ffmpeg, send); mock judge (needs the owner's OpenRouter key); final review and submit only with the owner's go-ahead.
