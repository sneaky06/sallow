# assets/sound/

All audio for Sallow. The complete production guide and catalog is `docs/SOUND_DESIGN.md`; this folder holds the finished files.

**1068 entries / 2306 files** in the catalog (650 core, 1275 important, 381 polish). No audio files are checked in yet; the game synthesises every sound until files appear.

**Format:** `.m4a` (AAC), 48 kHz; SFX mono 96 kbps; music, beds and stingers stereo 96 kbps; loops seamless; music -16 LUFS. Full spec in the guide.

**Naming:** lowercase snake_case; variations `name.m4a`, `name_2.m4a`, `name_3.m4a`…; names are unique across all folders.

**Wiring:** list each file you add in `assets/assets.js` as `'sound/<folder>/<name>.m4a'`. NOTE: the current loader (`src/engine/audio.js addFile`) only accepts files directly in `sound/`; sub-folders need the one-line regex change in guide section 7.1. Until then, put files in `sound/` itself.

| Folder | Files |
|---|---:|
| `sfx/` | 1945 |
| `ui/` | 141 |
| `ambience/` | 143 |
| `music/` | 45 |
| `stingers/` | 32 |
