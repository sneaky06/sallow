# assets/sound/sfx/monsters/abyss/

13 entries · 35 files · core 0 / important 33 / polish 2.

Save your finished sound over the placeholder with the same name: `.m4a`, `.mp3` or `.wav`, any of them (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files (`name`, `name_2`, `name_3`, …). The game uses your file when it exists and the synthesised sound or a fallback when it does not; a file that is still the placeholder is never played. It goes live on the next push, or run `tools/scan-assets.ps1` to try it locally.

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `mon_void_wraith_blink.m4a` … `mon_void_wraith_blink_3.m4a` | 0.6s | mono · one-shot | important | Void Wraith teleports behind you: a swallow of air and a high whisper. Must come BEFORE it appears, ~0.2 s warning, a fair-play tell ("is… |
| `mon_void_wraith_alert.m4a`, `mon_void_wraith_alert_2.m4a` | 1.5s | mono · one-shot | important | A hollow moan, a more broken tone than the Crypt wraith. |
| `mon_abyss_stalker_skitter.m4a` … `mon_abyss_stalker_skitter_3.m4a` | 0.8s | mono · one-shot | important | A deeper, wetter skitter than the cave spider: too many legs, a rhythm that does not quite line up. |
| `mon_abyss_stalker_alert.m4a`, `mon_abyss_stalker_alert_2.m4a` | 0.8s | mono · one-shot | important | A click-click-click and a rasp. |
| `mon_gazer_charge.m4a` … `mon_gazer_charge_3.m4a` | 0.6s | mono · one-shot | important | Gazer charging its eye: a rising static whine and a blinking click. |
| `mon_gazer_hum.m4a`, `mon_gazer_hum_2.m4a` | 1.5s | mono · one-shot | polish | A low wheezing hum while hovering. |
| `mon_gazer_die.m4a` … `mon_gazer_die_3.m4a` | 0.9s | mono · one-shot | important | The eye bursts: a wet pop followed by a descending electronic fade. |
| `mon_void_caller_open.m4a` … `mon_void_caller_open_3.m4a` | 0.9s | mono · one-shot | important | Void Caller opens a small cold hole: a spatial *pop* inward, then an echoing hum. This is the zone tele start. |
| `mon_dread_knight_step.m4a` … `mon_dread_knight_step_3.m4a` | 0.7s | mono · one-shot | important | Dread Knight: an armoured step with a creak, a chain slither. |
| `mon_dread_knight_alert.m4a`, `mon_dread_knight_alert_2.m4a` | 1.4s | mono · one-shot | important | A deep voice-less hollow groan from inside the armour, and a drawn sword. |
| `mon_dread_knight_die.m4a` … `mon_dread_knight_die_3.m4a` | 1.4s | mono · one-shot | important | An armoured collapse: plate falling, then silence; something leaves it. |
| `mon_shadowling_hiss.m4a` … `mon_shadowling_hiss_3.m4a` | 0.7s | mono · one-shot | important | Shadowling: a whisper chord of many tiny voices, thin hisses. |
| `mon_shadowling_die.m4a` … `mon_shadowling_die_3.m4a` | 0.5s | mono · one-shot | important | Dissipates with a sigh. |
