# tests/ — the pre-push gate

**`tests/all.html` is the one page to run before every push.** It ends in a single verdict (PASS / FAIL, also in the tab
title and `window.__ALL`), a table with one row per check, and a **Copy report** button.

## Running it

Normal tab (needs the folder served over http, like the other pages):

```
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8377      # or use the "game" entry in .claude/launch.json
```
then open <http://localhost:8377/tests/all.html>. It starts by itself (about 1½ minutes); keep the tab in the foreground.
**Run it in a private window / a profile you don't mind**: the scripted run plays through localStorage, so it clears the
`emberdeep.save*` keys while it works. It snapshots localStorage first and restores it at the end, but a crash mid-run can
leave a test hero behind.

Headless (CLI, exit code 0 = PASS, 1 = FAIL, 2 = could not run; no Node/Python needed, uses Chrome or Edge via the DevTools
protocol; starts `serve.ps1` itself if nothing listens on the port):

```
powershell -ExecutionPolicy Bypass -File tests/run-headless.ps1
powershell -ExecutionPolicy Bypass -File tests/run-headless.ps1 -Query "only=load,contract"
```

Query options (work in both): `only=load,contract,run,harness` · `skip=run` · `classes=warrior,ranger` · `depths=1,5` ·
`noauto=1` (wait for the Run button) · `index=path/to/copy-of-index.html` (test a modified loader).

## What it checks

1. **Load check** — fetches `index.html`, runs it in an iframe (with an error hook installed before the loader) and fails on:
   anything in `#boot-error`, any window error / unhandled rejection / `console.error` while loading, any
   manifest-listed file (or `manifest.js`) that 404s, any missing namespace (`G.engine world items game ui meta scenes state C input`).
2. **Contract check**
   - *API*: every name in `tests/contract.json` (derived from `docs/DESIGN.md`'s API sections) must exist on the live `G`.
     Add a name to the JSON when you document one; use `"optional"` for things DESIGN marks as maybe-absent.
   - *Events*: every `G.emit('x'` / `G.on('x'` in the loaded source files. Fails for events emitted with no listener,
     listeners for events nothing emits, and §13 events used nowhere. Intentional ones go in `tests/contract-allow.json`
     as `name: reason`. Computed names (`G.on(name, …)` in a loop) are credited from `"a:b"` string literals just before the call.
     Undocumented events are listed as notes only.
   - *Calls*: `G.items.foo(` (also through aliases such as `const I = G.items`) where `foo` does not exist at runtime.
     Calls that the same file also reads without calling (`if (G.items.foo)`, `typeof`, `&&`) count as guarded optional
     calls and are listed as notes; unguarded ones fail.
3. **Scripted run** — for every class in `G.game.CLASSES` (fresh page each): new game → town → every panel (and every tab
   in it) → every vendor role and tab → level-up, auto-build, loot into the bag → depths 1, 5, 12, 25, 30 with simulated play
   (attack held, walking at enemies and loot, taps, dashes, skills, potions) → dungeon panels, **die → death screen → respawn →
   return to the corpse floor**, **town portal out and back**, stairs up/down → **save → reload → Continue**, compared
   field by field. Fails on any error (window/console/rejection), a non-finite player position/hp, or `undefined`,
   `NaN`, `[object`, `Infinity` in *visible* UI text or label attributes (checked after every step). The game is stepped
   by the page itself (50 ms steps), so it does not depend on `requestAnimationFrame` in a background tab.
4. **Team harnesses** — `engine.html` (its touch tests; the rest of that page is visual), `world.html` (automated checks),
   `items.html`, `combat.html` (Run tests), `ui.html` (its two "run checks" buttons) and `ui-smoke.html`, each loaded in a
   hidden iframe, driven and counted. Their own failure lines are copied into the report. `assets.html` is a generator, not a test.

## Notes

- A section with failures is FAIL; the overall verdict is PASS only if every non-skipped section passes.
- The service worker is not registered (the game runs in a `srcdoc` iframe), so the PWA path is not covered.
- Canvas rendering is not inspected, only DOM text and errors.
- The run uses real game code with random play; a hero can die (that is handled and noted). Kills/levels vary between runs.

## Balance harness (not part of the gate)

`tests/balance.html` measures the game's difficulty with the real items + game code (R18, `docs/BALANCE.md`): synthetic best-of-N
kits per class × auto-build × level, hits-to-kill, fight times for packs / elites / bosses, time-to-death standing in a pack, DPS
parity, average vs skilled play. Open it over `serve.ps1` and press **Run** (or add `?auto`); about 1 minute for the full matrix.
Query: `levels=10,20` `classes=warrior` `modes=single,aoe` `gear=typical,strong` `skill=avg,skilled` `reps=6` `t=20` `noboss=1` `quick=1`.
Console helpers: `balQuick()` (parity digest), `balCurve('1,5,10')` (per-level fit quantities), `balSkills(40)` (each skill alone).
- `tests/firstrun.html`: plays a scripted new player for every class and prints the first-ten-minutes timeline. Not part of the release gate.
