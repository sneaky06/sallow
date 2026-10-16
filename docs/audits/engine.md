# Audit — engine (`src/engine`, `G.engine`)

Read-only outside review, 2026-10-15, `main` @ cd5dc23. Read: core, input, assets, audio, fx, icons, gear (tail), render (all), and
the ART_SPEC / ART_CATALOG / SOUND_DESIGN format sections against the loader. Probed in the running game (no saves written).

## 1. Correctness bugs and edge cases

| # | Sev | Where | Finding | Fix |
|---|---|---|---|---|
| EN-1 | **high** (when art lands) | `assets.js:310`, `:253`, `:261`, `:319` | **The loader does not accept everything the catalogs document** — full list in §2. The two that bite first: `i < 3000` silently drops the tail of `assets.js` (ART_CATALOG counts ~3,026 files), and the sound regex rejects sub-folders, so the whole SOUND_DESIGN tree (2,306 files) is ignored. | See §2 fixes. |
| EN-2 | medium | `audio.js:32`, `:106`, `:297` | iOS audio never recovers after an interruption. WebKit moves the context to `interrupted` (call, Siri, lock, route change) — not `suspended`. `unlock()` resumes only `suspended`; `E.sfx` and `tickBed` return when `state !== 'running'`, so sound is silent until the app is killed. (WebKit-specific, not reproducible on desktop.) | `if (ac.state !== 'running') ac.resume().catch(noop)` in `unlock()`; call it on `visibilitychange`→visible and `pageshow`; add `ac.onstatechange`. |
| EN-3 | medium | `audio.js:197-202`, `:297` | `tickVolumes()` calls `setTargetAtTime` on three buses **every frame** (via `U.audio.tick`). Each call adds an AudioParam event; 180 events/s accumulate on the timeline. | Apply only when a setting changed (listen to `settings:changed`, or compare cached values). |
| EN-4 | medium | `core.js:284-314`, `:324`, `fx.js:136` | The 5×7 bitmap font has no `×`, `…`, `▲`, `▼`, `·`, `'`-variants, accents; any other glyph draws `?`. In-world text from game uses `×` and `…` (`deep.js:375`, `pillars.js:37`, `bosses.js:74`, `deep.js:248`, `campaign.js:125`) — "CLOSE CALL ×2" renders "CLOSE CALL ?2". Player-chosen names with accents render `?`. | Add the missing glyphs (4 lines of data) and map accents to base letters. |
| EN-5 | medium | `fx.js:129-138`, `core.js:316-342` | Every distinct damage number allocates a canvas (`U.text` cache keyed by string, cleared wholesale at 500 entries). With uncapped late-game numbers (10⁴-10⁶) nearly every hit is a new string → a new `<canvas>` per hit, GC churn and iOS canvas-memory pressure. | Pre-render one 0-9 glyph strip per colour and draw digits with `drawImage` (zero allocation), abbreviate ≥ 10 000 ("143k"). |
| EN-6 | medium | `render.js:525-535` | `dashInfo()` calls `G.game.getClassAction()` every frame (allocates a result object + `icon` copy, `player.js:331`). Also `drawGaps` (`:926`) and the cleave painter (`fx.js:193`) allocate closures/arrays per frame while visible. | Cache `getClassAction` for ≥ 100 ms (the HUD already polls at 4 Hz) or expose a plain `G.game.ctl` snapshot; hoist the closures. |
| EN-7 | low | `assets.js:150` | Trailing-empty-frame trimming inspects only row 0 (direction S). A sheet whose S row ends blank but other rows do not is cut short; a legitimately blank last frame (flicker) is trimmed. | Check all rows of the column. |
| EN-8 | low | `render.js:1472`, `render.js:1444-1481` | `mapPick` looks for `map.events`; nothing in world/game sets it, so timed events (R16.2 lists "event") can never be identified on the map. | Game exposes `getEvent()` position (beacon/vault) to `mapPick`, or world pushes `map.events`. |
| EN-9 | low | `fx.js:53-60`, `constants.js:63` | `cleave` fx type and its painter exist but nothing emits it (`K.swing` uses `slash`); `FX_TYPES` omits it. Dead code or an unfinished hook. | Emit it from basic melee or delete it. |
| EN-10 | low | `icons.js:153-169`, `assets.js:211`, `:340-348` | Icon caches clear **everything** past 400 entries; hand-drawn icon loads call `iconCache.clear(); urlCache.clear()` per file (3,000 loads ⇒ 3,000 clears during boot). | LRU or per-key eviction; batch the clear after the load burst. |

## 2. Does the asset loader accept every documented format?

Checked `assets.js` line by line against `ART_SPEC.md`, `docs/ART_CATALOG.md` (§1, §2, §5) and `docs/SOUND_DESIGN.md` (§2, §3, §7.1).

**Accepted as documented**
- Tiles `tiles/<theme>[_<variant>].png`: exactly 256×1344 (2×) or 128×672 (1×), 4×14 cells, rows 0-13 per spec, variant tint fallback. ✓
- Character sheets `sprites/<id>/<anim>.png`: any square cell (height ÷ 5 rows, or ÷ 8 with `_8`), any frame count, `idle walk attack cast hit die`, cast↔attack fallback, trailing empty frames ignored, 1× legacy 640×80 sheet. ✓ (192 cell bosses fine up to the 4096 px texture limit = 21 frames.)
- `sprites/player_base` and `<class>_base`, gear `gear/<key>/<anim>.png` (HD) and 1× overlays. ✓
- Props 96×128 frames (or 48×64 legacy), `gate` mirror, look-keyed props (`props/<look>.png`). ✓
- Icons square ≥ 16 (64×64 spec, 32/16 legacy), `potion_hp/potion_mp` colour variants. ✓
- Projectiles square ≥ 16 (32×32), 16 rotations. FX strips (square frames, any size ≥ 16). Portraits square ≥ 48 (96×96), class / `npc_<role>` / monster id. ✓
- UI: `ui/joystick_base.png`, `ui/joystick_knob.png`. ✓
- Sound: `.mp3 .m4a .aac .ogg .wav` directly under `sound/`, `_2/_3…` variations, `amb_<bed>`, `music_<track>` with fallbacks (`echo→boss`, `rift→abyss`). ✓

**Not accepted / mis-handled (mismatches)**

| # | Documented | Loader behaviour | Fix |
|---|---|---|---|
| L1 | ~3,026 art files (ART_CATALOG §0) | `i < 3000` (`assets.js:310`) silently ignores the rest of `assets.js` | raise the cap, or better load per theme/act (see L10) |
| L2 | Sound tree `sound/sfx/player/…`, `ambience/…`, `music/…` (SOUND_DESIGN §3, `assets/sound/*/README.md`) | `^sound\/[a-z0-9_]+\.ext$` (`assets.js:261`) and `addFile` (`audio.js:121`) reject any sub-folder → every file in the documented tree is ignored | `^sound\/(?:[a-z0-9_]+\/)*([a-z0-9_]+)\.(mp3\|m4a\|aac\|ogg\|wav)$`; basename must be globally unique (warn on duplicates: `files[name]` last writer wins) |
| L3 | Keyed icons `icons/items/<id>`, `icons/uniques/…`, `icons/gems/…`, `ui/frames/…`, `ui/markers/…` (ART_CATALOG E1/E5, folder READMEs) | the art regex allows only `group/name[/anim].png`. `icons/items/heavy_helm_1.png` parses as group `icons`, name `items`, anim `heavy_helm_1` → **registers an icon called `items`** (`HANDLERS.icons('items', …)`); for `ui/frames/x.png` each file overwrites `ui['frames']`. They are not ignored, they are mis-bound | reject unknown nesting explicitly (log), then implement E1 (`getIcon(desc, size, id)` lookup order id → shape) |
| L4 | per-file timing `{ file, fps }` in `assets.js` (R17, ART_CATALOG E2a) | `typeof list[i] === 'string'` (`assets.js:310`) — object entries are skipped silently (`sw.js:29` would still precache their quoted strings) | accept `{file, fps, loop}` and store on the record; document the array format in ART_SPEC |
| L5 | Boss phase sheets `<anim>_p2/_p3` (E7) | `HD.ANIMS.indexOf('walk_p2') < 0` → rejected | extend the anim grammar |
| L6 | Hand-drawn `icons/<shape>.png` (ART_SPEC §5) | replaces **every** icon of that shape untinted (all gems, all bloodstones, all 8 materials, every weapon tier look identical); catalog calls this out as E1 | tint-by-descriptor or keyed lookup |
| L7 | Gear overlays must match the base's frame count (E2b) | `gear.js` clamps to the last frame (`Math.min(f, n-1)`) instead of resampling → a 10-frame overlay on a 12-frame body freezes for 2 frames | resample by `f * n / base.n` |
| L8 | Water/lava animation with > 4 columns (E2c), `props/<type>_<theme>` (E6), two-handed overlays (E6) | not supported; extra columns are ignored, theme props never looked up, 2H weapons reuse one-hand overlays | as listed in E-table |
| L9 | `ui/` art other than the joystick pair (K section, 144 files) | accepted into `ui[name]` but **nothing reads it** except `joystick_*` (`render.js:1325`); CSS skinning hook (E5) does not exist | implement E5 or stop listing them as "Loader: Yes" |
| L10 | "Loader supports today: 2,168 files" with decoded sizes of ≈ 8 MB per monster set, ≈ 40 MB per boss, ≈ 10 MB player | **Everything listed is fetched and decoded at boot** (`assets.js:303-315`), each kept as a full-size work canvas plus a temporary `getImageData` copy (`:19-22`, `:123`, `:147`); never unloaded. iOS Safari caps total canvas memory (~256 MB; lower on old devices) | per-theme/act manifests, load on entering an act and release on leaving; skip the `getImageData` work copy except for `empty()`/`top` probing (do that on a 1-row strip) |
| L11 | "A wrong-size file is ignored" | silent; the usual "why does my art not show" | `?assetdebug=1` logs every rejected path with the reason and the expected size; show a count in the FPS overlay |
| L12 | SOUND_DESIGN 7.1: banks, loops, fallbacks, ducking, music as buffers | not present: all sfx fetched and decoded at unlock (`audio.js:129-143`; docs estimate 374 MB RAM for the full set), music through `<audio loop>` (iOS gap at the loop point) | banks first (core at boot, per act), then buffer-looped music |

Net: the loader is correct for the art that exists today (the repo has no hand-drawn files yet — `assets/assets.js` is empty); it will silently under-deliver for the catalog as written (L1, L2, L3, L10 are the first problems an artist hits).

## 3. Cross-team mismatches

- `G.game.getClassAction()` shape: engine accepts `maxCharges|chargesMax|charges.max`, `charges` number or `{cur,max}`; game provides `{charges, maxCharges, cdRemaining, cooldown}` — fine, but the three-way tolerance hides drift; pick one.
- `map.route`, `map.openings`, `map.landmarks[].gap`, `map.taint`, `map.fissures`, `map.camps`, `map.revealed`: all produced by world/game; **`map.events` is not** (EN-8). `map.floorName`, `variant.*` consumed correctly (verified `U.variant.get`).
- `G.items.lootFilterAllows` is consumed with a 0.5 s cache (`render.js:382-394`) but always returns `true` because of the settings-shape mismatch (items.md IT-1); the engine's own label threshold uses the legacy `settings.lootFilter`.
- `G.meta.npcQuestState` is polled per NPC at 2 Hz (`render.js:399-410`, good) but it rebuilds the whole quest list per call (`getQuests`).
- Events: engine emits `input:tap/skill/potion/attack/classaction/ui`; `input:longpress` is listened to by game (`player.js:625`) and never emitted (the LOOT button hold in `hud.js` does the job). `boss:blackout`, `echo:rise`, `scavenger:race` are emitted by game with no engine listener (SOUND_DESIGN 7.1 wants `boss:blackout` for ducking).
- `settings.lowFx`/`showFps` now exist (DESIGN §15.15 is stale); `E.lowFx` is exported, nothing else uses it.

## 4. iOS input review

Good: touch events with `preventDefault` for the stick (immune to the iOS pinch-recognition cancel); id-tracked single stick; stale-stick release on `touchstart`/`touchend` (`hasTouch`); `touchcancel`, `blur`, `visibilitychange` reset; `touch-action:none`; `gesturestart/change` blocked; pointer events only for mouse/pen; audio unlock on `touchend/pointerup/click` in capture phase; fixed-stick config clamped on screen.

Gaps:
1. EN-2 (audio `interrupted`).
2. A tap while the stick is held is accepted by the engine (`start()` → `tap`) but the game discards it the same frame (`player.js:892-894` clears `ctl.intent` whenever the stick is active), so loot/chest/NPC taps with the other thumb do nothing until the stick is released (game.md GM-9).
3. Taps fire on `touchstart` (no slop/drag cancel): a scroll-like swipe that starts in the tap zone issues a world tap (attack-move / loot).
4. Floating-stick zone is the left 40 % (or right 60 % when `hud.joystick.x ≥ 0.5`); the other half is tap-only, no second stick.
5. Context menu is prevented on the canvas only; UI buttons rely on `user-select:none`/`-webkit-touch-callout:none` in CSS (present in `index.html`).
6. Orientation: `resize` + `orientationchange` + `visualViewport`, but `V.left/top` are cached from `getBoundingClientRect` at resize time; a safe-area change without a resize event skews `screenToWorld` (taps land off by the inset). Recompute in `tap()`.

## 5. Sorting, fog, lowFx, per-frame cost

- **Depth sort** (`render.js:1112`): one pooled array, `Array.prototype.sort` with `(diag, x+y+bias)`; interleaved with the wall pass by diagonal (`:1116-1150`). Correct for 1×1 occluders; 2-tile-tall sprites and bosses (scale 1.5-2.0, 192 cells) can be overdrawn by a prop on the same diagonal with a larger `x+y`; acceptable. Sort is O(n log n) per frame with n ≤ ~300 visible. `seen` (drop-hop map) clears at 500 and replays every hop at once (`:639`).
- **Fog / revealed**: `map.explored` and `map.visible` are Uint8Arrays of the exact tile count (checked `length === tiles.length`, otherwise the whole map draws unfogged — a latent trap: any world code that returns a differently sized array shows the entire map, which is the symptom R16.3 reported). The Wren fix is sound: `map.revealed` is drawn only on the minimap (`:1361-1372`) and never touches `explored`, so explored % and the clear grade stay honest. `V.info` (wall heights) is rebuilt only when the tile count changes; no code mutates tiles at runtime today, so this is safe.
- **lowFx** (`fr.low`): trims lights 40→14, particles to 40 %, trails 2×, atmosphere 40 %, no vignette/Pallor/rift washes, no soft light smoothing. Not covered: `drawRoute` (loops every route cell with a `Math.sin` per cell, `:355`), `drawGaps`, spills, beams, HD smoothing toggles, 80×80 minimap rebuild at 5 Hz. `V.autoLow` (auto resolution drop after 4 s < 42 fps, `:23-30`) never sets `lowFx`; make the auto-drop do both and let the player undo it.
- **Per-frame allocation**: pools are good (draw list, lights, bars, labels, beams, particles, texts, spills). Remaining: EN-6, `U.text` key strings (`color + '|' + str`) per name per frame, `Object.assign` in `echoTrail`, `ctx.save/restore` per mirrored sprite, `E.mapPick` closures (tap only), `emberLights` loop. None is large; EN-5 and EN-6 matter on old phones.
- **Unbounded caches**: `U.text` (500, wholesale clear), icon caches (400, wholesale), `gear.sheetFor` cache (3 HD / 24 1× sheets, wholesale clear — HD overlay compose is the expensive operation and it re-runs on any gear change once painted art exists), `tintedProps` (80), `ghosts` WeakMap, `lfCache`/`qCache` (600/64 clear). Wholesale clears cause periodic spikes; prefer LRU.

## 6. Dead code, duplication, methodology gaps

- Dead: `cleave` fx (EN-9), `E.lowFx` export, `rarityGlow` duplicates `C.RARITY.glow` logic (`GLOW_KEY` fallback table), unused `FX_TYPES` entries.
- Duplication: colour helpers `tone/mix/rgbOf` repeated in `core.js`, `sprites.js:39-47`, `props.js`, `gear.js:81-84`; four hand-rolled iso projections (`(x-y)*HW`, `(x+y)*HH`) instead of one helper.
- `tests/engine.html` is mostly visual; only its touch tests are automated (`all.html`). Nothing asserts: loader accept/reject rules (L1-L12), font coverage vs strings in `src/` (EN-4), frame budget on a slow device (the only timing test is desktop: `world.html` 80 monsters 0.3 ms), or audio state transitions. A 40-line `assets.inject`-based test that feeds every catalog path/size through the loader would have caught L1-L3.
