# assets/sound/

All audio for Sallow. The complete production guide and catalog is `docs/SOUND_DESIGN.md`; this folder holds the finished files.

**1068 entries / 2306 files** in the catalog (650 core, 1275 important, 381 polish). Every one of them exists as a placeholder WAV (mono, 8 kHz, 8-bit, capped length: the game's own synthesized sound where it has one, otherwise a click and a soft tone of the right length class; loops are 10-12 s).

**Format:** `.m4a` (AAC), 48 kHz; SFX mono 96 kbps; music, beds and stingers stereo 96 kbps; loops seamless; music -16 LUFS. Full spec in the guide.

**Naming:** lowercase snake_case; variations `name.m4a`, `name_2.m4a`, `name_3.m4a`…; names are unique across all folders.

**Replacing a placeholder:** save your file over it with the same name - `.m4a`, `.mp3` or `.wav`, any of them (a `name.m4a` next to the placeholder `name.wav` wins). It goes live on the next push, or run `tools/scan-assets.ps1` to test locally. Sub-folders are supported; the name is the file name, the folder only decides the load bank. See the workflow in `assets/README.md`.

| Folder | Files |
|---|---:|
| `sfx/` | 1945 |
| `ui/` | 141 |
| `ambience/` | 143 |
| `music/` | 45 |
| `stingers/` | 32 |
