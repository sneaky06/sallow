// UI stylesheet, injected by G.ui.init (index.html is owned by the lead).
// Art direction: grim and grimy but readable. Bone/ash text on flat near-black; rusted iron frames, cracked stone and
// stained parchment live only in borders, headers and backdrops (--tx-* are tiny canvas textures made in core.js) and
// never behind body text. Saturated colour is reserved for blood (HP/danger), spectral blue (mana), ember (highlights)
// and the item rarity colours. Hard pixel edges everywhere: gradients use hard stops, shadows have no blur.
(function () {
  'use strict';
  const G = window.G;
  const ui = G.ui = G.ui || {};

  // The game's player-facing name (R4.6, working title). Change it here only; ids, save keys and cache keys never use it.
  ui.GAME_NAME = 'Sallow';

  ui._css = `
#ui{--bg:#08070a;--flat:#0d0b0f;--stone:#141217;--stone2:#1d1a1c;--iron:#2b2724;--iron-hi:#5d554c;--iron-lo:#0c0a09;--rust:#7a3d1c;--rust-lo:#4f2714;
  --bone:#e8dec6;--ash:#a89f8f;--blood:#8e1b1f;--blood-hi:#d12b30;--blood-lo:#3a0d10;--brass:#a8873a;--brass-hi:#dfc06a;
  --ember:#ff7a1f;--mana:#2f6fd6;--good:#6fd36a;--bad:#ff5a50;--parch:#d9cba3;--ink:#1a130d;
  --tx-stone:none;--tx-iron:none;--tx-parch:none;
  --sat:env(safe-area-inset-top,0px);--sar:env(safe-area-inset-right,0px);--sab:env(safe-area-inset-bottom,0px);--sal:env(safe-area-inset-left,0px);
  font:bold 12px/1.25 "Press Start 2P","Pixelify Sans","Perfect DOS VGA 437",ui-monospace,Menlo,Consolas,"Lucida Console","Courier New",monospace;
  color:var(--bone);-webkit-font-smoothing:none;font-smooth:never;-webkit-tap-highlight-color:transparent;letter-spacing:0}
#ui *{box-sizing:border-box}
#ui button{font:inherit;color:inherit;margin:0;padding:0;border-radius:0;-webkit-appearance:none;appearance:none;cursor:pointer;touch-action:manipulation}
#ui input,#ui textarea{font:inherit;border-radius:0;-webkit-appearance:none;appearance:none;-webkit-user-select:text;user-select:text}
.ed-layer{position:absolute;inset:0;pointer-events:none;isolation:isolate}
.ed-ico{display:block;width:32px;height:32px;background:center/100% 100% no-repeat;image-rendering:pixelated;image-rendering:crisp-edges;pointer-events:none;flex:none}
.ed-ico-fb{box-shadow:inset 0 0 0 2px #0008,inset 4px 4px 0 #fff3}
#ui canvas{image-rendering:pixelated;image-rendering:crisp-edges}

/* iron plate button: flat face for the label, rivets + rust in the corners, chipped corners */
.ed-btn{min-width:44px;min-height:44px;padding:4px 10px!important;color:var(--bone);text-transform:uppercase;pointer-events:auto;
  border:2px solid var(--iron-hi);
  background:radial-gradient(circle at 4px 4px,#8a8074 0 1px,#0000 1.5px),radial-gradient(circle at calc(100% - 4px) 4px,var(--rust) 0 1px,#0000 1.5px),
    radial-gradient(circle at 4px calc(100% - 4px),var(--rust-lo) 0 1px,#0000 1.5px),radial-gradient(circle at calc(100% - 4px) calc(100% - 4px),#8a8074 0 1px,#0000 1.5px),#1e1b1a;
  box-shadow:inset 0 0 0 1px var(--iron-lo),inset -3px -3px 0 #0c0a09,inset 3px 3px 0 #38322e;
  clip-path:polygon(3px 0,calc(100% - 2px) 0,100% 2px,100% calc(100% - 3px),calc(100% - 3px) 100%,2px 100%,0 calc(100% - 2px),0 3px)}
.ed-btn:active,.ed-btn.on{background:var(--blood-lo);border-color:var(--ember);box-shadow:inset 0 0 0 1px var(--iron-lo),inset 3px 3px 0 #0c0a09}
.ed-btn[disabled]{color:#6f685e;border-color:#3b3530}
.ed-btn.gold{border-color:var(--brass);color:var(--brass-hi)}
.ed-btn.gold[disabled]{color:#6f685e;border-color:#3b3530}
.ed-btn.danger{border-color:var(--blood);color:#ff8f86;background-color:#1e1213}
.ed-btn.big{min-height:52px;font-size:14px;padding:6px 18px!important}
.ed-x{flex:none;width:44px;padding:0!important}
.ed-gold{color:var(--brass-hi);white-space:nowrap}
.ed-dim{color:var(--ash)}.ed-good{color:var(--good)}.ed-bad{color:var(--bad)}.ed-ember{color:var(--ember)}

/* ---------- HUD ---------- */
.ed-hud{position:absolute;top:var(--sat);right:var(--sar);bottom:var(--sab);left:var(--sal);pointer-events:none}
.ed-hud button{pointer-events:auto}
.ed-xp{position:absolute;left:0;right:0;top:0;height:6px;background:#000;border-bottom:1px solid var(--iron-hi)}
.ed-xp i{display:block;height:100%;width:0;background:linear-gradient(#dfc06a 0 2px,#8a6a22 2px)}
.ed-area{position:absolute;left:8px;top:11px;text-shadow:1px 1px 0 #000,-1px 0 0 #000,0 -1px 0 #000;white-space:nowrap}
.ed-area small{display:block;font-size:10px;color:var(--brass-hi);margin-top:2px}
.ed-floor{color:#cfc5ae;font-size:10px;margin-top:2px;max-width:58vw;overflow:hidden;text-overflow:ellipsis}
.ed-pallor{display:flex;align-items:center;gap:5px;margin-top:3px;font-size:9px;color:#d8d4cc;text-transform:uppercase;letter-spacing:.5px}
.ed-palbar{width:64px;height:7px;background:#000;border:1px solid #8a857c;box-shadow:0 0 0 1px #000}
.ed-palbar i{display:block;height:100%;width:0;background:linear-gradient(#f4f1ea 0 2px,#b9b4aa 2px)}
.ed-pallor.t2 .ed-palbar{border-color:#cfcac0}.ed-pallor.t3,.ed-pallor.t4{color:#fff}
.ed-pallor.t4 .ed-palbar{border-color:#fff;animation:ed-blink 1.2s steps(2) infinite}
.ed-tracker{position:absolute;left:8px;top:var(--trk-top,44px);width:calc(100% - 112px);max-height:48px;overflow:hidden;font-size:10px;text-shadow:1px 1px 0 #000,-1px 0 0 #000,0 -1px 0 #000}
.ed-tracker div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ed-mm{position:absolute;right:8px;top:11px;width:84px;height:84px;border:2px solid var(--iron-hi)!important;background:#000d;
  box-shadow:0 0 0 1px var(--iron-lo),0 0 0 2px var(--rust-lo)}
.ed-mm canvas{display:block;width:80px;height:80px}
.ed-topbtns{position:absolute;right:8px;top:101px;display:flex;gap:3px}
.ed-top{position:relative;width:44px;height:44px;background:#0c0a09e6;border:2px solid var(--iron-hi);box-shadow:inset 0 0 0 1px var(--iron-lo),inset -2px -2px 0 #000;
  clip-path:polygon(2px 0,100% 0,100% calc(100% - 3px),calc(100% - 3px) 100%,0 100%,0 2px)}
.ed-top:active{border-color:var(--ember)}
.ed-top .ed-ico{width:24px;height:24px;margin:2px auto 0}
.ed-top span{display:block;font-size:8px;line-height:10px;text-align:center;color:var(--bone)}
.ed-badge{position:absolute;right:0;top:0;min-width:14px;height:13px;padding:0 1px;font-size:9px;line-height:12px;text-align:center;font-style:normal;
  background:var(--ember);color:#000;border:1px solid #000;display:none;animation:ed-blink 1s steps(2) infinite}
@keyframes ed-blink{50%{background:var(--brass-hi)}}
.ed-boss{position:absolute;left:50%;top:152px;width:240px;margin-left:-120px;text-align:center;text-shadow:1px 1px 0 #000,-1px -1px 0 #000;display:none}
.ed-boss b{display:block;color:#ff6a5a;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;letter-spacing:1px}
.ed-bossbar{height:14px;border:2px solid var(--iron-lo);outline:2px solid var(--iron-hi);background:#120305;box-shadow:0 0 0 3px var(--rust-lo)}
.ed-bossbar i{display:block;height:100%;width:100%;background:linear-gradient(#e0484c 0 2px,#a01d22 2px 60%,#5c0f13 60%)}
.ed-lock{position:absolute;left:50%;top:152px;width:240px;margin-left:-120px;text-align:center;background:#08070af2;border:2px solid var(--blood);padding:4px 6px;box-shadow:0 0 0 1px var(--iron-lo),0 0 0 2px var(--rust-lo)}
.ed-lock b{display:block;color:var(--blood-hi);text-transform:uppercase;letter-spacing:1px}
.ed-lock.clear{border-color:var(--brass)}.ed-lock.clear b{color:var(--brass-hi)}
/* loot feed: right-hand side above the action cluster, never in the joystick zone */
.ed-feed{position:absolute;right:8px;bottom:calc(18px + 160px * var(--bs));width:208px;font-size:11px;text-align:right;text-shadow:1px 1px 0 #000,-1px 0 0 #000,0 -1px 0 #000}
.ed-feed div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:15px}
.ed-feed div.myth{background:#08070a;border:1px solid var(--rc,#ff3b4e);padding:2px 4px;margin:2px 0;text-align:center;text-shadow:none}
.ed-feed div.tap{pointer-events:auto;cursor:pointer;min-height:44px;display:flex;align-items:center;justify-content:flex-end;gap:2px;background:#08070ae0;border:1px solid var(--good);padding:0 6px;margin:2px 0}
.ed-mods{color:#ff7a5a}
.ed-boss small{display:block;font-size:9px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.5px}
/* action pieces (R5.1): each one is placed on its own; --bs is the S/M/L button scale, --hop the HUD opacity */
.ed-hud{--bs:1;--hop:1}
.ed-mv{opacity:var(--hop)}
.ed-vitals{position:absolute;right:8px;bottom:calc(12px + 108px * var(--bs));display:flex;gap:3px;align-items:center}
.ed-skills{position:absolute;right:calc(12px + 96px * var(--bs));bottom:8px;display:grid;grid-template-columns:repeat(2,auto);gap:4px}
.ed-portal{position:absolute;right:196px;top:101px}
.ed-cust{right:auto!important;bottom:auto!important;margin:0!important;transform:translate(-50%,-50%)}
/* murky glass orb: liquid drawn in hard bands, glints and grime sit on the glass */
.ed-orb{position:relative;width:52px;height:52px;border:2px solid var(--iron-lo);border-radius:50%;background:#0a090b;overflow:hidden;box-shadow:0 0 0 2px var(--iron-hi),0 0 0 3px var(--rust-lo)}
.ed-orb i{position:absolute;left:0;right:0;bottom:0;height:100%}
.ed-orb.hp i{background:radial-gradient(circle at 62% 70%,#3d080b 0 3px,#0000 3.5px),radial-gradient(circle at 30% 82%,#3d080b 0 2px,#0000 2.5px),linear-gradient(#ee5a5c 0 2px,#b02026 2px 45%,#7a1418 45% 78%,#4a0b0e 78%)}
.ed-orb.mp i{background:radial-gradient(circle at 62% 70%,#0b1c4a 0 3px,#0000 3.5px),radial-gradient(circle at 30% 82%,#0b1c4a 0 2px,#0000 2.5px),linear-gradient(#7fb0ff 0 2px,#2f6fd6 2px 45%,#1f4a9a 45% 78%,#122c62 78%)}
.ed-orb::before{content:'';position:absolute;inset:0;z-index:1;border-radius:50%;
  background:radial-gradient(circle at 30% 26%,#ffffff70 0 3px,#0000 3.5px),radial-gradient(circle at 42% 18%,#ffffff40 0 1.5px,#0000 2px),
    radial-gradient(circle at 78% 64%,#00000055 0 7px,#0000 7.5px),radial-gradient(circle at 22% 70%,#00000040 0 4px,#0000 4.5px);
  box-shadow:inset 0 0 0 3px #00000066,inset -3px -4px 0 3px #00000040}
.ed-orb span{position:absolute;z-index:2;left:0;right:0;top:50%;margin-top:-7px;text-align:center;font-size:11px;color:#fff;text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000}
.ed-pot{position:relative;width:max(44px,calc(48px * var(--bs)));height:max(44px,calc(48px * var(--bs)));background:#0c0a09e6;border:2px solid var(--iron-hi);box-shadow:inset 0 0 0 1px var(--iron-lo),inset -2px -2px 0 #000;overflow:hidden}
.ed-pot .ed-ico{margin:5px auto 0}
.ed-pot b{position:absolute;z-index:2;right:2px;bottom:1px;font-size:11px;color:#fff;text-shadow:1px 1px 0 #000,-1px -1px 0 #000}
.ed-pot.empty .ed-ico{opacity:.25}.ed-pot.empty b{color:var(--bad)}
.ed-pot:active,.ed-skill:active{border-color:var(--ember)}
.ed-skill{position:relative;width:max(44px,calc(52px * var(--bs)));height:max(44px,calc(52px * var(--bs)));background:#0c0a09e6;border:2px solid var(--iron-hi);box-shadow:inset 0 0 0 1px var(--iron-lo),inset -2px -2px 0 #000;overflow:hidden}
.ed-skill .ed-ico{width:calc(40px * var(--bs));height:calc(40px * var(--bs));margin:calc(4px * var(--bs)) auto 0}
.ed-orb{width:calc(52px * var(--bs))!important;height:calc(52px * var(--bs))!important}
.ed-skill.empty .ed-ico{display:none}
.ed-skill.empty::after{content:'+';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--iron-hi)}
.ed-skill.nomana{border-color:#27408a}.ed-skill.nomana .ed-ico{opacity:.3}
.ed-skill em{position:absolute;z-index:2;left:2px;top:1px;font-size:9px;font-style:normal;color:var(--bone);text-shadow:1px 1px 0 #000}
.ed-cd{position:absolute;inset:0;display:none;background:conic-gradient(#000000d0 var(--cd,0deg),#0000 0)}
.cooling>.ed-cd{display:block}
.ed-skill u{position:absolute;inset:0;align-items:center;justify-content:center;text-decoration:none;font-size:14px;color:#fff;text-shadow:1px 1px 0 #000;display:none}
.ed-skill.cooling u{display:flex}
.ed-atk{position:absolute;right:8px;bottom:8px;width:calc(96px * var(--bs));height:calc(108px * var(--bs));border:3px solid var(--blood);font-size:13px;text-transform:uppercase;color:#ffb6aa;
  background:radial-gradient(circle at 6px 6px,var(--rust) 0 1.5px,#0000 2px),radial-gradient(circle at calc(100% - 6px) calc(100% - 6px),var(--rust-lo) 0 1.5px,#0000 2px),#1c0c0de6;
  box-shadow:inset 0 0 0 1px #000,inset -3px -3px 0 #0c0506,inset 3px 3px 0 #4a1518;
  clip-path:polygon(4px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 4px)}
.ed-atk .ed-ico{width:calc(48px * var(--bs));height:calc(48px * var(--bs));margin:0 auto 4px}
.ed-atk.on{background:#5a1418;border-color:var(--ember);box-shadow:inset 3px 3px 0 #0c0506}
/* toasts stay in the upper half; while a tooltip/dialog is open only the newest shows, in a strip above it */
.ed-toasts{position:absolute;left:10%;right:10%;top:calc(202px + var(--sat));text-align:center;pointer-events:none}
.ed-toast{display:table;margin:0 auto 4px;padding:5px 10px;background:#08070af2;border:2px solid var(--iron-hi);box-shadow:0 0 0 1px var(--iron-lo),inset 0 -2px 0 var(--blood-lo);animation:ed-pop .15s steps(3)}
@keyframes ed-pop{from{transform:translateY(6px)}to{transform:none}}
.ed-modal-open .ed-toasts{top:calc(2px + var(--sat))}
.ed-modal-open .ed-toast{padding:3px 8px;margin-bottom:0;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ed-modal-open .ed-toast:not(:last-child){display:none}

/* ---------- panels: cracked stone surround, iron header, flat reading surface ---------- */
.ed-panel{position:absolute;inset:0;display:flex;flex-direction:column;pointer-events:auto;padding:var(--sat) var(--sar) var(--sab) var(--sal);background:#0f0d11 var(--tx-stone)}
.ed-head{position:relative;z-index:1;flex:none;display:flex;align-items:center;gap:4px;min-height:50px;padding:2px 4px 3px 6px;background:var(--iron) var(--tx-iron);
  border-bottom:2px solid var(--iron-lo);box-shadow:inset 0 2px 0 var(--iron-hi),inset 0 -2px 0 var(--rust-lo)}
.ed-head::after{content:'';position:absolute;left:0;right:0;top:100%;height:10px;pointer-events:none;margin-top:2px;
  background:linear-gradient(#5e1014,#5e1014) 7% 0/2px 7px no-repeat,linear-gradient(#5e1014,#5e1014) calc(7% + 3px) 0/2px 3px no-repeat,
    linear-gradient(#4a0c10,#4a0c10) 31% 0/3px 4px no-repeat,linear-gradient(#5e1014,#5e1014) 58% 0/2px 9px no-repeat,
    linear-gradient(#5e1014,#5e1014) calc(58% + 4px) 0/2px 5px no-repeat,linear-gradient(#4a0c10,#4a0c10) 86% 0/2px 6px no-repeat}
.ed-ttl{font-size:13px;color:var(--bone);text-transform:uppercase;letter-spacing:1px;margin-right:4px;white-space:nowrap;padding:6px 8px;background:var(--iron-lo);
  border:1px solid var(--iron-hi);box-shadow:inset 0 -2px 0 var(--blood)}
.ed-sp{flex:1}
.ed-tabs{display:flex;gap:2px}
.ed-tab{position:relative;min-height:44px;min-width:44px;padding:2px 8px!important;background:var(--iron-lo);border:2px solid #4a433c;color:var(--ash);text-transform:uppercase;font-size:11px!important}
.ed-tab.on{background:var(--blood-lo);color:var(--bone);border-color:var(--brass)}
.ed-tab .ed-badge{display:block}
.ed-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;touch-action:pan-y;-webkit-overflow-scrolling:touch;padding:12px 6px 6px;margin:0 4px 4px;
  background:var(--flat);border:2px solid var(--iron-lo);border-top:0;box-shadow:inset 0 0 0 1px #262226}
.ed-foot{flex:none;display:flex;gap:4px;flex-wrap:wrap;align-items:center;padding:4px 6px;background:var(--iron) var(--tx-iron);border-top:2px solid var(--iron-lo);box-shadow:inset 0 2px 0 var(--iron-hi)}
.ed-foot .ed-note{background:var(--iron-lo);padding:3px 5px;color:var(--bone)}
.ed-box{background:var(--stone);border:1px solid #453e3a;box-shadow:inset 0 0 0 1px var(--iron-lo);padding:7px}
.ed-h{color:var(--brass-hi);text-transform:uppercase;letter-spacing:1px;margin:10px 0 4px;font-size:11px;padding-bottom:2px;border-bottom:1px solid var(--blood)}
.ed-h:first-child{margin-top:0}
.ed-note{color:var(--ash);font-size:10px;font-weight:normal}

.ed-modal{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#000000b8;pointer-events:auto;
  padding:calc(30px + var(--sat)) calc(8px + var(--sar)) calc(8px + var(--sab)) calc(8px + var(--sal))}
.ed-dialog{width:100%;max-width:330px;max-height:100%;display:flex;flex-direction:column;background:var(--iron) var(--tx-iron);padding:4px;border:2px solid var(--iron-lo);
  box-shadow:0 0 0 2px var(--iron-hi),0 0 0 3px var(--rust-lo),5px 5px 0 3px #000}
.ed-dialog .ed-scroll{overflow-y:auto;touch-action:pan-y;padding:9px;min-height:0;background:var(--flat);border:1px solid var(--iron-lo)}
.ed-acts{flex:none;display:flex;flex-wrap:wrap;gap:4px;padding:4px 0 0}
.ed-acts .ed-btn{flex:1 1 30%}
/* item tooltip: stained parchment edge, flat bone page, dark ink (line colours are darkened in JS); the name keeps its vivid rarity colour on a dark plate */
.ed-dialog.tip{background:#b7a67c var(--tx-parch)}
.ed-dialog.tip .ed-scroll{background:var(--parch);color:var(--ink);border:1px solid #6b5a3a;padding:0 0 8px}
.ed-tipname{font-size:13px;padding:8px 9px;margin-bottom:6px;background:var(--iron-lo);border-bottom:2px solid var(--blood);letter-spacing:.5px}
.ed-sub{display:table;margin-top:4px;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--bone);border:1px solid var(--rc,#888);padding:1px 4px}
.ed-sub.myth{background:var(--rc);color:#08070a;font-weight:bold}
.ed-tipline{font-weight:bold;line-height:16px;padding:0 9px}
.ed-hl{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;padding:2px 9px 6px;font-size:15px}
.ed-hl span{font-size:13px;font-weight:bold}
.ed-cmp{margin:7px 9px 0;padding-top:6px;border-top:2px dashed #6b5a3a}
.ed-cmp .ed-tipline{padding:0}
/* mythic effect: the one line on the page that keeps its full colour, on a dark plate */
.ed-fx{margin:6px 9px;padding:6px 8px;background:var(--iron-lo);border:2px solid #ff3b4e;color:#ff3b4e;font-weight:bold;line-height:16px}
.ed-fx small{display:block;color:var(--bone);font-weight:normal;font-size:11px;margin-top:2px}
.ed-dialog.tip .ed-note{color:#4a3d2a}
.ed-dialog.tip .ed-good{color:#17571b}.ed-dialog.tip .ed-bad{color:#8f1212}.ed-dialog.tip .ed-gold{color:#5e4705}

/* ---------- items ---------- */
.ed-cell{position:relative;width:44px;height:44px;background:#09080a;border:2px solid #2f2a2c;box-shadow:inset 0 0 0 1px #000;pointer-events:auto;overflow:hidden}
.ed-cell .ed-ico{margin:4px auto 0}
.ed-cell .q{position:absolute;right:2px;bottom:0;font-size:10px;color:#fff;text-shadow:1px 1px 0 #000,-1px -1px 0 #000}
.ed-cell .up{position:absolute;right:1px;top:0;font-size:10px;color:var(--good);text-shadow:1px 1px 0 #000,-1px -1px 0 #000}
.ed-cell .dn{position:absolute;right:1px;top:0;font-size:10px;color:var(--bad);text-shadow:1px 1px 0 #000,-1px -1px 0 #000}
.ed-cell.junk .ed-ico{opacity:.3}
.ed-cell .jk{position:absolute;left:1px;bottom:0;font-size:7px;text-transform:uppercase;color:#8a8074;text-shadow:1px 1px 0 #000}
.ed-cell .sl{position:absolute;inset:0;font-size:8px;line-height:40px;text-align:center;color:#8a8074;text-transform:uppercase}
.ed-cell:active{background:#2a1416}
/* lock mark (R5.8): a tiny pixel padlock in the bottom-left corner */
.ed-cell .lk{position:absolute;left:2px;bottom:2px;width:8px;height:6px;background:var(--brass-hi);box-shadow:0 0 0 1px #000}
.ed-cell .lk::before{content:'';position:absolute;left:1px;top:-5px;width:2px;height:3px;border:2px solid var(--brass-hi);border-bottom:0;box-shadow:0 -1px 0 #000}
.ed-mass{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:8px}
.ed-mass>.ed-note{grid-column:1/4}
.ed-mass .ed-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2px!important;font-size:11px}
.ed-mass .ed-btn small{font-size:9px;color:var(--bone);text-transform:none;margin-top:2px}
.ed-row.on{background:#1e1213}
.ed-pinfo{flex:none;width:44px;padding:0!important}
.ed-pilesheet{position:absolute;left:0;right:0;margin:0 auto;top:var(--sat);width:min(340px,96vw);max-height:max(35vmin,152px);display:flex;flex-direction:column;background:#0d0b0ff2;border:2px solid var(--iron-hi);box-shadow:0 0 0 1px var(--iron-lo),0 4px 0 #0008;pointer-events:auto}
.ps-head{flex:none;display:flex;gap:4px;align-items:center;padding:2px;background:var(--iron-lo)}
.ps-take{flex:1;min-height:52px;font-size:14px;letter-spacing:1px}
.ps-head{border-top:1px solid var(--iron-hi)}
.ps-fold{background:none;border:0;flex:none;max-width:34%;min-width:0;min-height:44px;padding:0 6px!important;text-align:left;color:var(--brass-hi);text-transform:uppercase;font-size:11px;pointer-events:auto}
.ps-list{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y}
.ed-pilesheet .ed-row{min-height:44px}
.ed-pile .ed-row{padding-right:0!important}
.ed-look{color:#3a2f5a}.ed-look.on{color:#17571b}
.ed-awake{color:#6a2a8a}
.ed-bleach{margin:6px 9px;padding:5px 8px;background:#e9e5dc;border:2px dashed #8a857c;color:#5a5650;font-weight:bold;letter-spacing:2px}
.ed-bleach small{display:block;letter-spacing:0;font-weight:normal;font-size:10px;margin-top:2px}
.ed-preview{display:flex;gap:6px;align-items:center;margin-bottom:4px}
.ed-pvname{min-width:0;overflow:hidden}
.ed-pvname div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ed-grid{display:grid;grid-template-columns:repeat(auto-fill,44px);gap:2px;justify-content:center;align-content:start}
.ed-inv{display:flex;flex-direction:column;gap:8px}
.ed-dollwrap{display:flex;gap:8px;justify-content:center}
.ed-doll{flex:none;display:grid;grid-template-columns:repeat(3,44px);gap:2px;grid-template-areas:". helm amulet" "weapon chest offhand" "gloves belt ring1" ". boots ring2"}
.ed-sum{flex:1;max-width:190px;font-size:11px;font-weight:normal;line-height:16px}
.ed-kv{display:flex;justify-content:space-between;gap:8px;font-weight:normal;line-height:17px}
.ed-kv span{color:var(--ash)}
.ed-kv b{font-weight:bold;color:var(--bone)}
.ed-kv b.ed-gold{color:var(--brass-hi)}
.ed-attr{display:flex;align-items:center;gap:8px;min-height:46px;border-bottom:1px solid #2c2729}
.ed-attr span{flex:1}
.ed-cols{display:grid;grid-template-columns:1fr;gap:8px}
.ed-row{display:flex;align-items:center;gap:8px;width:100%;min-height:48px;padding:2px 4px!important;background:none;border:0;border-bottom:1px solid #2c2729;text-align:left;pointer-events:auto}
.ed-row:active{background:#2a1416}
.ed-row .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ed-row .n small{display:block;font-weight:normal;color:var(--ash);font-size:10px;overflow:hidden;text-overflow:ellipsis}

/* ---------- skills ---------- */
.ed-auto{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:3px;padding:12px 6px 5px;margin:0 4px;background:var(--flat);border:2px solid var(--iron-lo);border-top:0;border-bottom:1px solid #3b3530}
.ed-autobtn{min-height:48px;padding:3px 6px!important;text-align:left;background:#1b1819;border:2px solid #4a433c;box-shadow:inset 0 0 0 1px var(--iron-lo),inset -2px -2px 0 #0c0a09}
.ed-autobtn b{display:block;text-transform:uppercase;font-size:11px;color:var(--bone)}
.ed-autobtn small{display:block;font-weight:normal;font-size:9px;line-height:10px;color:var(--ash)}
.ed-autobtn.on{background:var(--blood-lo);border-color:var(--brass);box-shadow:inset 0 0 0 1px var(--iron-lo),inset 2px 2px 0 #0c0a09}
.ed-autobtn.on b{color:var(--brass-hi)}.ed-autobtn.on b::before{content:'> ';color:var(--ember)}
.ed-autobtn.on small{color:var(--bone)}
.ed-skmain{flex:1;min-height:0;display:flex;flex-direction:column;background:var(--flat);margin:0 4px 4px;border:2px solid var(--iron-lo);border-top:0}
.ed-skleft{flex:1;min-height:0;display:flex;flex-direction:column}
.ed-sktabs{flex:none;display:flex;gap:2px;padding:4px 6px 0}
.ed-sktabs .ed-tab{flex:1;padding:2px!important}
.ed-treewrap{flex:1;min-height:0;overflow:auto;touch-action:pan-x pan-y;padding:8px}
.ed-tree{position:relative;margin:0 auto}
.ed-tree svg{position:absolute;left:0;top:0;pointer-events:none}
.ed-node{position:absolute;width:48px;height:48px;background:#09080a;border:2px solid #3b3530;box-shadow:inset 0 0 0 1px #000;pointer-events:auto;overflow:visible}
.ed-node .ed-ico{width:36px;height:36px;margin:4px auto 0}
.ed-node.locked .ed-ico{opacity:.3}
.ed-node.can{border-color:var(--ember);animation:ed-glow 1s steps(2) infinite}
@keyframes ed-glow{50%{border-color:var(--brass-hi)}}
.ed-node.has{border-color:var(--brass-hi)}
.ed-node.sel{outline:2px solid #fff;outline-offset:1px}
.ed-node em{position:absolute;left:-2px;right:-2px;bottom:-15px;font-size:9px;font-style:normal;text-align:center;color:var(--ash)}
.ed-node.has em{color:var(--brass-hi)}
.ed-node.passive{border-style:dashed}
.ed-skinfo{flex:none;height:178px;overflow-y:auto;touch-action:pan-y;padding:6px 8px;background:var(--stone);border-top:2px solid var(--iron-hi);font-weight:normal}
.ed-skinfo .ed-btn{font-weight:bold}
.ed-syn{margin:3px 0;padding:3px 6px;border-left:2px solid #3b3530;color:var(--ash)}
.ed-syn b{display:block;font-size:11px}
.ed-syn small{display:block;font-size:10px;line-height:12px}
.ed-syn.on{border-color:var(--good);color:var(--bone)}
.ed-syn.on b{color:var(--good)}
.ed-pips{display:inline-flex;gap:2px;vertical-align:middle;margin-left:6px}
.ed-pips i{width:8px;height:8px;border:1px solid var(--brass-hi);background:#000}
.ed-pips i.f{background:var(--brass-hi)}
.ed-slots{display:flex;gap:4px;align-items:center;margin-top:6px;flex-wrap:wrap}
.ed-slots .ed-btn{width:44px;padding:0!important;position:relative}
.ed-slots .ed-btn .ed-ico{width:28px;height:28px;margin:0 auto}

/* ---------- npc / quests / menus ---------- */
.ed-npc{flex:none;display:flex;gap:8px;align-items:center;padding:12px 8px 6px;margin:0 4px;background:var(--flat);border:2px solid var(--iron-lo);border-top:0;border-bottom:1px solid #3b3530}
.ed-npc+.ed-body{padding-top:6px}
.ed-npc canvas,.ed-pt{flex:none;width:48px;height:48px;border:2px solid var(--iron-hi);background:#000;box-shadow:0 0 0 1px var(--iron-lo)}
.ed-npc p{margin:2px 0 0;font-weight:normal;font-style:italic;color:var(--ash)}
.ed-quest{margin-bottom:6px}
.ed-quest .t{display:flex;justify-content:space-between;gap:6px}
.ed-quest p{margin:3px 0;font-weight:normal;color:#cfc5ae}
.ed-quest .ed-btn{margin-top:4px}
.ed-bar{height:8px;background:#000;border:1px solid var(--iron-hi);margin:3px 0}
.ed-bar i{display:block;height:100%;background:var(--brass-hi)}
.ed-st{font-size:10px;text-transform:uppercase;white-space:nowrap}
.ed-list{display:flex;flex-direction:column;gap:6px;max-width:420px;margin:0 auto}
.ed-list .ed-btn{width:100%;text-align:left;display:flex;justify-content:space-between;align-items:center;gap:8px}
.ed-center{max-width:420px;margin:0 auto;text-align:center}
.ed-death{justify-content:center;align-items:center;text-align:center;gap:14px;background:#160406 var(--tx-stone)}
.ed-death h1{margin:0;font-size:26px;color:var(--blood-hi);text-shadow:3px 3px 0 #000,-1px -1px 0 #000;text-transform:uppercase;letter-spacing:3px;padding:8px 14px;background:#08070a;border-top:2px solid var(--blood);border-bottom:2px solid var(--blood)}
.ed-death>div{background:#08070a;padding:3px 8px}
.ed-mapbig{display:block;margin:0 auto;width:min(82vw,calc(100vh - 130px));height:min(82vw,calc(100vh - 130px));border:2px solid var(--iron-hi);background:#000}
.ed-gamble{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:4px}

/* ---------- title: minimal, lets the engine's animated backdrop through ---------- */
.ed-title{position:absolute;inset:0;pointer-events:auto;overflow-y:auto;touch-action:pan-y;display:flex;flex-direction:column;align-items:center;
  padding:calc(12px + var(--sat)) calc(12px + var(--sar)) calc(12px + var(--sab)) calc(12px + var(--sal));
  background:linear-gradient(#08070ad9 0 8%,#08070a99 8% 16%,#08070a40 16% 30%,#08070a00 30% 50%,#08070a59 50% 70%,#08070aa6 70% 86%,#08070ae6 86%)}
.ed-title>*{flex:none}
.ed-title::before,.ed-title::after{content:'';flex:1}
.ed-logo{display:flex;flex-direction:column;align-items:center;gap:6px;margin-bottom:8px}
.ed-logo canvas{width:48px;height:48px}
.ed-logo h1{margin:0;font-size:30px;letter-spacing:6px;padding-left:6px;color:var(--bone);text-shadow:2px 2px 0 var(--blood),4px 4px 0 #000,-1px -1px 0 #000}
.ed-logo h1::after{content:'';display:block;height:2px;margin-top:6px;background:linear-gradient(90deg,#0000 0 10%,var(--blood) 10% 90%,#0000 90%)}
.ed-tag{color:var(--bone);font-weight:normal;margin-bottom:22px;text-align:center;letter-spacing:1px;text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000}
.ed-menu{display:flex;flex-direction:column;gap:8px;width:200px}
.ed-restore{width:min(320px,92vw);max-height:42vh;overflow-y:auto;margin:0 auto}
.ed-title .ed-btn{background-color:#0c0a09e0}
.ed-title .ed-ttl{margin:0 0 4px}
.ed-classes{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin:8px 0}
.ed-class{width:80px;min-height:84px;padding:4px 2px!important;background:#0c0a09ea;border:2px solid #4a433c;font-size:10px!important;text-transform:uppercase;color:var(--ash)}
.ed-class canvas,.ed-class .ed-pt{display:block;margin:0 auto 4px}
.ed-class.on{border-color:var(--brass);background:var(--blood-lo);color:var(--bone)}
.ed-cdesc{width:100%;max-width:400px;font-weight:normal;margin-bottom:8px;background:#0d0b0ff2}
.ed-cdesc b{color:var(--brass-hi)}
.ed-name{display:flex;gap:4px;width:100%;max-width:400px}
.ed-name input{flex:1;min-width:0;height:48px;padding:0 8px;background:#000;border:2px solid var(--iron-hi);color:var(--bone);font-size:16px;outline:none}
.ed-name input::placeholder{color:#8a8074}
.ed-name input:focus{border-color:var(--ember)}
.ed-ver{margin-top:14px;font-size:9px;color:var(--ash);font-weight:normal;text-shadow:1px 1px 0 #000}

/* ---------- story ---------- */
.ed-talk{align-self:flex-end;width:100%;max-width:520px;min-height:96px;display:flex;gap:10px;padding:10px;cursor:pointer;background:#08070af5;border:2px solid var(--iron-hi);box-shadow:0 0 0 2px var(--iron-lo),0 0 0 3px var(--rust-lo),inset 0 -2px 0 var(--blood-lo)}
.ed-talk-main{flex:1;min-width:0;display:flex;flex-direction:column}
.ed-talk-main b{color:var(--brass-hi);text-transform:uppercase;letter-spacing:1px;font-size:11px}
.ed-talk-text{margin:4px 0 6px;font-weight:normal;font-size:13px;line-height:18px;color:var(--bone)}
.ed-talk.narr .ed-talk-text{font-style:italic;text-align:center}
.ed-talk-more{align-self:flex-end;font-size:9px;color:var(--ash);text-transform:uppercase}
.ed-page{white-space:pre-line;font-weight:normal;line-height:18px;margin:6px 0}
.ed-dialog.tip .ed-page{padding:0 9px;color:var(--ink)}
.ed-banner{border-color:var(--bc,var(--iron-hi));padding:7px 12px}
.ed-banner b{display:block;text-transform:uppercase;letter-spacing:1px}
.ed-banner span{display:block;font-weight:normal;font-style:italic;margin-top:2px}
.ed-dash{position:absolute;right:8px;bottom:calc(16px + 160px * var(--bs));width:calc(96px * var(--bs));height:max(44px,calc(52px * var(--bs)));border:2px solid #2f6fd6;background:#0c0a09e6;color:#9cc2ff;text-transform:uppercase;font-size:12px;overflow:hidden;box-shadow:inset 0 0 0 1px #000,inset -2px -2px 0 #000;display:none}
.ed-dash .ed-ico{width:28px;height:28px;margin:0 auto}
.ed-dash span{position:relative;z-index:2;display:block;font-size:8px;line-height:9px;max-height:18px;overflow:hidden;white-space:normal;word-break:break-word;text-shadow:1px 1px 0 #000}
.ed-dash:active{border-color:var(--ember)}
.ed-hud.has-dash .ed-feed{bottom:calc(78px + 160px * var(--bs))}
/* ---------- HUD editor (R5.1) ---------- */
.ed-joy{position:absolute;display:none;border-radius:50%;border:2px dashed var(--brass-hi);background:#0008;pointer-events:none}
.ed-joy::after{content:'';position:absolute;left:50%;top:50%;width:40%;height:40%;margin:-20% 0 0 -20%;border-radius:50%;background:var(--iron-hi)}
.ed-editing .ed-joy,.ed-editing .ed-dash,.ed-editing .ed-portal{display:block!important}
.ed-editing .ed-mv{opacity:var(--hop)!important}
.ed-editing .ed-tracker{min-width:140px;min-height:44px}
.ed-editing .ed-feed,.ed-editing .ed-boss,.ed-editing .ed-lock{display:none!important}
.ed-editbg{position:absolute;inset:0;pointer-events:auto;background-color:#0006;
  background-image:linear-gradient(#ffffff14 1px,#0000 1px),linear-gradient(90deg,#ffffff14 1px,#0000 1px);background-size:16px 16px}
.ed-grab{position:absolute;pointer-events:auto;touch-action:none;border:2px dashed var(--ember);background:#ff7a1f22;display:flex;align-items:flex-start;justify-content:center;z-index:5}
.ed-grab span{background:#08070a;color:var(--ember);font-size:9px;padding:1px 3px;text-transform:uppercase;margin-top:-9px;white-space:nowrap}
.ed-grab.drag{border-style:solid;background:#ff7a1f44}
.ed-editbar{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(340px,calc(100% - 16px));pointer-events:auto;z-index:6;padding:4px;
  background:var(--iron) var(--tx-iron);border:2px solid var(--iron-lo);box-shadow:0 0 0 2px var(--iron-hi),4px 4px 0 2px #000}
.ed-editbar .ed-grip{display:flex;align-items:center;justify-content:space-between;min-height:30px;padding:0 6px;touch-action:none;cursor:move;background:var(--iron-lo);color:var(--bone);font-size:11px;text-transform:uppercase;margin-bottom:4px}
.ed-editbar .ed-grip small{color:var(--ash);font-size:9px}
.ed-editrow{display:flex;flex-wrap:wrap;gap:4px}
.ed-editrow .ed-btn{flex:1 1 calc(25% - 3px);padding:2px 4px!important;font-size:11px}
.ed-editrow .ed-btn.w2{flex-basis:calc(50% - 2px)}
@media (orientation:landscape){
  .ed-editbar{width:min(460px,calc(100% - 16px));left:42%;top:40%}
  .ed-editrow .ed-btn.w2{flex-basis:calc(25% - 3px)}
}
.ed-editrow .ed-btn.on{color:var(--brass-hi)}
/* R6.3 dash charges: one pip per charge; while charges remain the recharge sweep is faint (still usable) */
.ed-dash .ed-pips{position:absolute;z-index:3;left:0;right:0;top:3px;display:flex;justify-content:center;gap:3px;pointer-events:none}
.ed-dash .ed-pips b{width:8px;height:5px;background:#9cc2ff;box-shadow:1px 1px 0 #000}
.ed-dash .ed-pips b.off{background:#1a2438;box-shadow:inset 0 0 0 1px #3b5a8f}
.ed-dash.partial>.ed-cd{opacity:.4}
.ed-dash.empty{border-color:#27408a;color:#5d7bb0}
.ed-dash .ed-ico{position:relative;z-index:2}
/* R6.2 Echo: the boss bar in a ghostly cold blue */
.ed-boss.echo .ed-bossbar i{background:linear-gradient(#e8f6ff 0 2px,#7fb4d8 2px 60%,#3a5f80 60%)}
.ed-boss.echo .ed-bossbar{background:#06101a;box-shadow:0 0 0 3px #1d3550}
.ed-boss.echo b{text-shadow:1px 1px 0 #000,0 0 0 #000,2px 0 0 #7fb4d855}
/* R6.1 Go deeper? */
.ed-deeper{max-width:340px;border-color:#cfcac0}
.ed-dptitle{font-size:16px;text-transform:uppercase;letter-spacing:2px;color:#f4f1ea;text-align:center;text-shadow:2px 2px 0 #000}
.ed-dpdepth{font-size:10px;color:var(--ash);text-align:center;margin:4px 0 8px}
.ed-dprow{display:flex;justify-content:space-between;font-size:11px;text-transform:uppercase;margin-bottom:3px}
.ed-dpt{color:#d8d4cc}.ed-dpt.t2{color:#ece8e0}.ed-dpt.t3,.ed-dpt.t4{color:#fff}
.ed-dpbar{position:relative;height:12px;background:#000;border:1px solid #8a857c;box-shadow:0 0 0 1px #000;margin-bottom:8px}
.ed-dpbar i{position:absolute;top:0;bottom:0;left:0}
.ed-dpbar i.now{background:linear-gradient(#f4f1ea 0 2px,#b9b4aa 2px)}
.ed-dpbar i.add{background:repeating-linear-gradient(90deg,#f4f1ea 0 2px,#0000 2px 4px);animation:ed-dpb 1s steps(2) infinite}
@keyframes ed-dpb{50%{opacity:.35}}
.ed-dpbar b{position:absolute;top:-3px;bottom:-3px;width:1px;background:var(--ember)}
.ed-dpfx{font-size:11px;line-height:16px;padding-left:10px;text-indent:-10px;color:#f4f1ea}
.ed-dpfx::before{content:'+ ';color:var(--bad)}
.ed-dpfx.gold{color:var(--brass-hi)}.ed-dpfx.gold::before{color:var(--brass-hi)}
.ed-dpfx.dim{color:var(--ash)}.ed-dpfx.dim::before{content:'· ';color:var(--ash)}
.ed-dptick{display:flex!important;align-items:center;gap:8px;width:100%;margin-top:8px;font-size:10px;text-transform:none!important}
.ed-dptick i{width:16px;height:16px;flex:none;border:2px solid var(--iron-hi);background:#000}
.ed-dptick[aria-pressed=true] i{background:var(--brass-hi);box-shadow:inset 0 0 0 2px #000}
.ed-deeper .ed-acts .ed-btn{flex:1 1 45%}
/* R6.4 volume sliders */
.ed-vol{display:flex;align-items:center;gap:8px;min-height:44px;padding:0 8px;background:var(--flat);border:2px solid var(--iron-lo)}
.ed-vol span{flex:0 0 76px;text-transform:uppercase;font-size:11px}
.ed-vol b{flex:0 0 36px;text-align:right;font-size:11px;color:var(--brass-hi)}
#ui .ed-vol input{flex:1;min-width:0;height:44px;margin:0;background:transparent;pointer-events:auto;touch-action:none;cursor:pointer}
.ed-vol input::-webkit-slider-runnable-track{height:8px;background:linear-gradient(90deg,var(--brass) 0 var(--v,50%),#000 var(--v,50%));border:2px solid var(--iron-hi)}
.ed-vol input::-moz-range-track{height:8px;background:linear-gradient(90deg,var(--brass) 0 var(--v,50%),#000 var(--v,50%));border:2px solid var(--iron-hi)}
.ed-vol input::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:28px;margin-top:-12px;background:var(--iron-hi);border:2px solid #000;box-shadow:inset -2px -2px 0 var(--iron-lo),inset 2px 2px 0 #8a7f72}
.ed-vol input::-moz-range-thumb{width:16px;height:24px;border-radius:0;background:var(--iron-hi);border:2px solid #000}
.ed-vol.off{opacity:.45}
@media (orientation:landscape){
  .ed-dash{right:calc(20px + 200px * var(--bs));bottom:8px;width:max(44px,calc(52px * var(--bs)));height:calc(108px * var(--bs))}
  .ed-hud.has-dash .ed-feed{bottom:calc(18px + 160px * var(--bs))}
  .ed-tracker{width:200px}
  .ed-topbtns{top:11px;right:98px}
  .ed-portal{top:11px;right:286px}
  .ed-boss,.ed-lock{top:62px}
  .ed-toasts{top:calc(100px + var(--sat))}
  .ed-head{min-height:48px}
  .ed-inv{flex-direction:row;align-items:flex-start}
  .ed-inv>.ed-grid{flex:1}
  .ed-dollwrap{flex-direction:column;flex:none}
  .ed-sum{max-width:136px}
  .ed-cols{grid-template-columns:1fr 1fr}
  .ed-auto{grid-template-columns:repeat(4,1fr)}
  .ed-skmain{flex-direction:row}
  .ed-skinfo{height:auto;width:42%;border-top:0;border-left:2px solid var(--iron-hi)}
  .ed-logo{flex-direction:row;gap:12px}
  .ed-tag{margin-bottom:12px}
  .ed-death{gap:8px}
}
.ed-code{display:block;width:100%;min-height:120px;resize:none;padding:6px;background:#000;border:2px solid var(--iron-hi);color:var(--bone);font-size:12px;line-height:15px;word-break:break-all;outline:none;-webkit-user-select:text;user-select:text}
.ed-code:focus{border-color:var(--ember)}
/* ---------- Revision 7 ---------- */
/* rarity glow (R7.1): --rc is the tier colour, --gl the strength; the cell's own border carries the colour, the shadow the glow */
.ed-cell.rg1{box-shadow:inset 0 0 4px 0 var(--rc),0 0 3px 0 var(--rc)}
.ed-cell.rg2{box-shadow:inset 0 0 6px 1px var(--rc),0 0 5px 1px var(--rc)}
.ed-cell.rg25{box-shadow:inset 0 0 7px 1px var(--rc),0 0 6px 1px var(--rc)}
.ed-cell.rg3{box-shadow:inset 0 0 9px 2px var(--rc),0 0 8px 2px var(--rc)}
.ed-cell.rg4{box-shadow:inset 0 0 11px 3px var(--rc),0 0 10px 3px var(--rc);animation:ed-rift 2.6s ease-in-out infinite}
@keyframes ed-rift{50%{box-shadow:inset 0 0 4px 1px var(--rc),0 0 3px 1px var(--rc)}}
.ed-glow1{text-shadow:0 0 4px var(--rc),1px 1px 0 #000}
.ed-glow2{text-shadow:0 0 6px var(--rc),1px 1px 0 #000}
.ed-glow3{text-shadow:0 0 8px var(--rc),0 0 3px var(--rc),1px 1px 0 #000}
.ed-glow4{text-shadow:0 0 10px var(--rc),0 0 4px var(--rc),1px 1px 0 #000;animation:ed-riftt 2.6s ease-in-out infinite}
@keyframes ed-riftt{50%{text-shadow:0 0 3px var(--rc),1px 1px 0 #000}}
.ed-dialog.tip .ed-tipname.ed-glow1,.ed-dialog.tip .ed-tipname.ed-glow2,.ed-dialog.tip .ed-tipname.ed-glow3,.ed-dialog.tip .ed-tipname.ed-glow4{background:var(--iron-lo)}
/* socket pips (R7.3): top-left of a cell, one square per socket */
.ed-cell .sk{position:absolute;left:2px;top:2px;display:flex;gap:1px;pointer-events:none}
.ed-cell .sk b{display:block;width:5px;height:5px;border:1px solid #c9b8ff;background:#0008;box-shadow:0 0 0 1px #000}
.ed-cell .sk b.f{background:#b65bff;border-color:#f0dcff}
.ed-pips{display:inline-flex;gap:3px;vertical-align:middle;margin-left:6px}
.ed-pips b{display:block;width:8px;height:8px;border:2px solid #5a1c6e;background:#0000}
.ed-pips b.f{background:#8a3ab0}
/* collection book mark (R7.11): a tiny teal book, bottom-right of a cell; .bk is also used inline in lines */
.bk{display:inline-block;width:9px;height:8px;background:#2fb7a6;border:1px solid #000;box-shadow:inset 3px 0 0 #1a6f66;vertical-align:baseline;margin:0 3px 0 0}
.ed-cell .bk{position:absolute;right:2px;bottom:2px;margin:0;pointer-events:none}
/* Power headline (R7.2) */
.ed-hl .pw{font-size:15px}
.ed-hl small{flex-basis:100%;font-size:10px;font-weight:normal;color:#4a3d2a}
/* Curator + Collection Book */
.ed-cell.mk{outline:2px solid var(--ember);outline-offset:-2px;background:#2a1416}
.ed-cell .mkx{position:absolute;left:2px;top:0;font-size:12px;color:var(--ember);text-shadow:1px 1px 0 #000}
.ed-prog{height:8px;background:#000;border:1px solid var(--iron-hi);margin:3px 0}
.ed-prog i{display:block;height:100%;width:0;background:linear-gradient(#5fe0cf 0 2px,#2fb7a6 2px)}
.ed-prog.done i{background:linear-gradient(#ffe88a 0 2px,#dfc06a 2px)}
.ed-cur-act{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px}
.ed-cur-act .ed-btn{min-height:48px}
.ed-cur-act .wide{grid-column:1/3}
.ed-pg{display:block;width:100%;text-align:left;padding:6px 8px!important;min-height:48px;background:var(--stone);border:1px solid #453e3a;margin-bottom:4px;pointer-events:auto}
.ed-pg:active{background:#2a1416}
.ed-pg .t{display:flex;justify-content:space-between;gap:6px}
.ed-pg .t b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ed-pg.done{border-color:var(--brass)}
.ed-pg small{display:block;font-weight:normal;font-size:10px;color:var(--ash)}
.ed-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:4px;margin:6px 0}
.ed-slot{display:flex;align-items:center;gap:6px;padding:4px 6px;min-height:44px;background:#09080a;border:1px dashed #4a433c;font-weight:normal;font-size:11px}
.ed-slot.have{border:1px solid #2fb7a6;background:#0c1816}
.ed-slot small{display:block;font-size:9px;color:var(--ash)}
.ed-slot .ck{flex:none;width:16px;text-align:center;color:#5fe0cf}
.ed-tier{display:flex;align-items:center;gap:6px;min-height:36px;font-weight:normal;font-size:11px;border-bottom:1px solid #2c2729}
.ed-tier.on{color:var(--brass-hi)}.ed-tier span{flex:1}
.ed-seg{display:flex;gap:2px;margin-bottom:6px}
.ed-seg .ed-btn{flex:1;padding:2px 4px!important;font-size:11px}
/* relics (R7.10) */
.ed-relics{display:grid;grid-template-columns:1fr;gap:4px}
@media (orientation:landscape){.ed-relics{grid-template-columns:1fr 1fr}}
.ed-relic{display:flex;gap:8px;align-items:center;min-height:52px;padding:4px 6px;background:var(--stone);border:1px solid #453e3a;font-weight:normal;font-size:11px}
.ed-relic .sil{flex:none;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;background:#000;border:2px solid #3a3430;color:#3a3430}
.ed-relic.have{border-color:var(--brass)}.ed-relic.have .sil{border-color:var(--brass-hi);color:var(--brass-hi);box-shadow:0 0 6px #dfc06a80}
.ed-relic b{display:block;font-size:11px}.ed-relic small{display:block;font-size:10px;color:var(--ash)}
.ed-relic.have small.fx{color:#9ae6b4}
/* HUD: explored %, clear grade, timed event (R7.5) */
.ed-heat{margin-left:10px;color:#ff8a3a;font-size:10px;margin-top:2px;text-shadow:1px 1px 0 #000;letter-spacing:1px}
.ed-expl{color:#9fb7c8;font-size:10px;margin-top:2px}
.ed-expl i{display:inline-block;width:40px;height:5px;background:#000;border:1px solid #6a7d8a;margin-left:4px;vertical-align:middle}
.ed-expl i u{display:block;height:100%;background:#7fb4d4;text-decoration:none}
.ed-event{position:absolute;left:8px;top:max(calc(var(--trk-top,44px) + 52px),152px);width:min(176px,48vw);text-align:left;background:#08070af2;border:2px solid var(--ember);padding:4px 6px;display:none;
  box-shadow:0 0 0 1px var(--iron-lo),0 0 0 2px var(--rust-lo)}
.ed-event b{display:block;color:var(--ember);text-transform:uppercase;letter-spacing:1px;font-size:11px}
.ed-event span{display:block;font-size:10px;font-weight:normal;color:var(--bone);margin-top:1px}
@media (orientation:landscape){.ed-event{top:calc(var(--trk-top,44px) + 52px)}}
.ed-event .bar{height:6px;background:#000;border:1px solid var(--iron-hi);margin-top:3px}
.ed-event .bar i{display:block;height:100%;width:100%;background:var(--ember)}
.ed-event.warn{border-color:var(--bad)}.ed-event.warn b{color:var(--bad)}.ed-event.warn .bar i{background:var(--bad)}
.ed-event.ok{border-color:var(--brass)}.ed-event.ok b{color:var(--brass-hi)}
.ed-feed div .bk{margin-right:3px}
.ed-feed div.bkrow{border-color:#2fb7a6!important}
.ed-feed div.rg3,.ed-feed div.rg4{padding-right:2px}

.ed-tipbody{display:flex;gap:10px;align-items:flex-start}
.ed-tipbody .ed-h{margin-top:0;font-size:13px}
.ed-tipbody p{margin:4px 0 0;font-weight:normal;font-size:12px;line-height:17px}
.ed-tipdlg{max-width:320px}
.ed-tipcard{--tw:min(300px,86vw);position:absolute;left:calc(50% - var(--tw) / 2);top:calc(var(--sat) + 250px);width:var(--tw);min-height:44px;display:flex;gap:8px;align-items:center;text-align:left;padding:6px 8px!important;
  background:#08070af2;border:2px solid var(--brass);box-shadow:0 0 0 1px var(--iron-lo),0 3px 0 #0009;pointer-events:auto;animation:ed-pop .15s steps(3)}
.ed-tipcard b{display:block;color:var(--brass-hi);font-size:11px;text-transform:uppercase;letter-spacing:.5px}
.ed-tipcard small{display:block;font-size:10px;font-weight:normal;color:var(--bone);line-height:13px;margin-top:2px}
@media (orientation:landscape){.ed-tipcard{--tw:min(200px,30vw);top:auto;bottom:calc(var(--sab) + 8px)}}
@keyframes ed-pulse{50%{box-shadow:0 0 0 3px var(--ember),inset 0 0 8px var(--ember)}}
.ed-hud .ed-pulse{animation:ed-pulse .7s steps(2) infinite}
.ed-atk.loot{border-color:var(--brass-hi);color:var(--brass-hi);background:radial-gradient(circle at 6px 6px,var(--brass) 0 1.5px,#0000 2px),#1c160ae6}
.ed-bargain-strip{display:block;font-size:9px!important;color:#7fffd4!important;max-width:58vw;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.ed-bargain .ed-bg-row{display:flex;flex-direction:column;gap:2px;margin:6px 0;padding:6px 8px;background:var(--stone);border-left:4px solid currentColor;font-weight:normal;line-height:17px}
.ed-bargain .ed-bg-row b{font-size:10px;text-transform:uppercase;letter-spacing:1px}
.ed-bargain .ed-acts .ed-btn{min-height:56px;font-size:14px}
.ed-chain{position:absolute;left:0;right:0;top:56%;text-align:center;pointer-events:none;font-size:15px;letter-spacing:1px;text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000}
.ed-chain.pop{animation:ed-chainpop .35s steps(4)}
@keyframes ed-chainpop{from{transform:scale(1.7);opacity:.2}to{transform:none;opacity:1}}
@media (max-width:520px){.ed-ttl.opt{display:none}}
@media (max-width:350px){.ed-topbtns{gap:1px}}
`;
})();
