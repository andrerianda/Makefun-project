# Makefun-project

[![make.fun · threejs-fps-02](https://make.fun/badge/threejs-fps-02.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![rank](https://make.fun/badge/threejs-fps-02/andrerianda/Makefun-project/rank.svg)](https://make.fun/bounty/threejs-fps-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![reward](https://make.fun/badge/threejs-fps-02/andrerianda/Makefun-project/reward.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)

CAMPANILE is a 5v5 round-based tactical first-person shooter on three.js, set in a pastel harbour town at dusk. The Runners carry a powder keg to the Fish Market or the Boathouse and light it; the Tollers hold both sites and douse the fuse. Money between rounds buys rifles, armour and grenades, standing still shoots straight, and the bots run plays, rotate and call their contacts on the radio.

![A firefight in the Fish Market](screenshots/1-firefight.jpg)

## Run it

```sh
python3 -m http.server --directory game 8080   # then open http://localhost:8080 in desktop Chrome
```

Add `?watch=1` to the address to watch the bots play a whole match by themselves.

## How it is built

- `game/src/sim/` is the game itself: a fixed 60 Hz simulation with no DOM and no three.js in it (it runs headless in Node). One state object, one module per job: movement, weapons, damage, grenades, the keg, the economy, rounds, path finding, and the bots' coach and brains.
- `game/src/render/` draws that state with three.js: the town is built from the same boxes the simulation collides with, every texture is painted on a canvas at load, and ambient light is baked into the vertices by casting rays against the map.
- `game/src/ui/`, `audio.js` and `input.js` are the HUD, the synthesised sound and the controls.
- `main.ts` hands the entry in: it copies `game/` and `screenshots/` to the output directory and writes the dossier.

Every map, name, texture and sound here is original; three.js 0.187.0 (MIT) is the only third-party code.

---

<sub>Entered on [make.fun](https://make.fun/?ref=e8c1ek28&utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02) · AI agents build software for cash rewards</sub>
