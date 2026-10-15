# assets/sound/sfx/bosses/hearthking/

15 entries · 29 files · core 18 / important 8 / polish 3.

Drop the finished `.m4a` files here under exactly these names (see `docs/SOUND_DESIGN.md` for the spec; AAC, 48 kHz, mono unless the Fmt says stereo). Variations are separate files: `name.m4a`, `name_2.m4a`, … The game uses a file when it exists and the synthesised sound or a fallback when it does not. List each file you add in `assets/assets.js` (`'sound/sfx/bosses/hearthking/<name>.m4a'`).

| File(s) | Length | Fmt | Prio | Notes |
|---|---:|---|---|---|
| `boss_hearthking_alert.m4a` | 5s | stereo · one-shot | core | He stands from his throne in the founding hearth: a heavy sigh, a sword drawn, a warm hearth-fire roar that does not belong in this place.… |
| `boss_hearthking_swing.m4a` … `boss_hearthking_swing_4.m4a` | 0.6s | mono · one-shot | important | Phase I swordsman: a clean, heavy blade swing, a ring-bright metal singing. |
| `boss_hearthking_combo.m4a` … `boss_hearthking_combo_3.m4a` | 1.4s | mono · one-shot | core | The Founder's three-hit combo (glowing landing circles): three distinct strokes of rising weight: swing, swing, crash; the final one with… |
| `boss_hearthking_roots.m4a` | 3s | mono · one-shot | core | Phase II (60%): roots tear him open: wood and flesh tearing apart, a huge crack, then the first pulse of the Ember (see below). |
| `boss_hearthking_ember_pulse.m4a` … `boss_hearthking_ember_pulse_3.m4a` | 1s | mono · one-shot | core | Ember pulses: a deep heartbeat with a hot swell, the ember glowing; this is the damage-window cue. |
| `boss_hearthking_ember_exposed.m4a` | 1.5s | mono · one-shot | core | THE EMBER IS EXPOSED: the heart is out in the open: a bell-bright tone, a clear window; the sound rewards a quick alert reaction. |
| `boss_hearthking_ember_close.m4a` | 1s | mono · one-shot | important | The window closes: the heart is hidden again, a heavy thud. |
| `boss_hearthking_giant_rise.m4a` | 4s | stereo · one-shot | core | Phase III (25%): the giant's body; the floor heaves. A colossal groan of a body grown too big to move: a rock-slide and wet flesh. |
| `boss_hearthking_pulse_in.m4a` … `boss_hearthking_pulse_in_3.m4a` | 1s | mono · one-shot | core | The floor inverts on each heartbeat: an INWARD pulse (the danger is the middle), a suck and thump; low, long. |
| `boss_hearthking_pulse_out.m4a` … `boss_hearthking_pulse_out_3.m4a` | 1s | mono · one-shot | core | An OUTWARD pulse (the danger is on the rim): a bass swell and a shock-ring that expands; clearly different in shape from the inward one. |
| `boss_hearthking_factor_tick.m4a`, `boss_hearthking_factor_tick_2.m4a` | 0.4s | mono · one-shot | important | The man in grey counting dashes: a dry pencil tick on a wooden desk. (His voice lines belong to the later dialogue pass.) |
| `boss_hearthking_hurt.m4a` … `boss_hearthking_hurt_3.m4a` | 0.7s | mono · one-shot | polish | He is struck: a deep, labouring grunt of an old man that was a king. |
| `boss_hearthking_die.m4a` | 8s | stereo · one-shot | core | He falls: the sword hits the floor, the giant's body shudders and goes still, a last ember sigh. The room's warmth collapses to a hush.… |
| `rift_core_loop.m4a` | 4s | stereo · loop | important | The `rift_core` heart prop (2 tiles from the exit stairs on depth 30): a huge slow heartbeat with a warm pulse; the finale begins when you… |
| `rift_core_touch.m4a` | 6s | stereo · one-shot | core | You take the Ember: a heartbeat, a rushing in, the world's warmth moves into your chest; the man in grey bows (cloth only). The sound of a… |
