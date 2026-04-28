# Changelog

Player-facing changes to Blocky Strategery, newest first. Versions track
`android.versionCode` in `app.json`.

## v14 — 2026-04-28

### Combat
- Replaced the old `stat + d6` combat formula with a strength-ratio
  formula: `P(attacker wins) = atk² / (atk² + def²)`. Small absolute
  differences in stats now actually decide fights instead of being
  drowned out by d6 noise. A Footman vs a Serf used to be ~58% defender
  win (basically a coin flip); it's now ~80% attacker win, which
  matches what "trained soldier vs civilian" should feel like. The
  battle log now shows raw strengths rather than dice rolls.

## v13 — 2026-04-28

### Exploration / fog
- Auto-explorers now fan out from each other. Previously a Footman
  built after another Footman had walked NW would still see the
  closest unexplored frontier (NW) and trail it. The picker now
  treats other explorers' current positions as repulsion points, so
  the second Footman will pick a different bearing.
- Fog of war: explored-but-not-currently-visible tiles get a cool gray
  wash instead of a black darken. Terrain is still readable through
  it but visibly drained of color, matching the classic "you remember
  it but don't see it now" feel.

## v12 — 2026-04-28

### Cultures / colors
- Fixed five player colors that clashed with terrain on the map: Picts
  dark olive → woad sky-blue, Irish emerald → lime, Cornish mid grey →
  silver, Cumbrians blue → magenta-purple, Islesmen sea teal → bright
  cyan. Heraldic intent preserved where possible.

## v11 — 2026-04-28

### Diplomacy depth
- Gold tribute when offering peace (0/25/50/100g chips) — bribes can
  cancel a winning AI's score lead.
- Tech trade — pick one of yours, request one of theirs; AI weighs
  relative tech costs minus its grudge against you.
- Peace timer: signing peace sets a 10-turn cooldown; AI won't
  spontaneously break a treaty during that window. Human can break
  early, but it's a heavy grudge hit (10 vs the usual 5 for declaring
  war on someone you were already at war with).
- Grudge: persists per pair, decays slowly, shows in the Diplomacy
  screen as "forgiving / cautious / resentful / vengeful" — high
  grudge means even bribes won't get you peace.

## v10 — 2026-04-28

### Per-tribe unique units
- Every culture now has a signature unit that replaces a base kind
  with the same map sprite but a different name and stat bonus:
  Anglo-Saxon Huscarl (+1 def Footman), Norman Knight (+1 atk
  Horseman), Welsh Longbowman (+1 atk Footman), Scots Highlander (+1
  atk Spearman), Pict Painted Warrior (+1 def Footman), Irish
  Gallowglass (+1 def Swordsman), Cornish Marauder (+1 move Footman),
  Cumbrian Hammerman (+1 atk Spearman), Danish Berserker (+2 atk
  Footman, scary), Hebridean Birlinn (+1 atk +1 move Galley).

## v9 — 2026-04-28

### Tech tree
- Expanded from 8 to 20 techs. New: pottery, masonry, alphabet,
  the_wheel, code_of_laws, construction, literacy, monarchy,
  engineering, astronomy, banking, theology.
- New buildings: observatory (+50% sci, stacks), university (+50%
  sci, stacks), bank (+50% gold, stacks with marketplace), cathedral
  (+2 happy).
- Wonder prereqs moved to natural fits: Pyramids → pottery, Great
  Wall → masonry, Hanging Gardens → engineering, Great Library →
  literacy.
- Aqueduct + Courthouse now gated behind mid-game techs
  (construction, code_of_laws). Philosophy victory needs literacy +
  iron_working + mathematics — slightly longer but more satisfying
  win path.

### Pan crash (Android)
- Fixed a hard JS crash on every pan: `pinchActive` shared value was
  declared after the pan gesture, so its worklet captured the value
  as `undefined` at gesture-builder evaluation time and threw
  `Cannot read property 'value' of undefined` on every finger
  movement. Hoisted the declaration above pan.

## v8 — 2026-04-28

### Pinch zoom (Android)
- Bug fix: previous pinch handler caused exponential NaN feedback in
  the Skia transform via shared anchor variables, crashing the app
  with SIGSEGV. Resolution from Gemini diagnostic: each gesture now
  has its own startTx/startTy anchor, every worklet guards
  translation/scale with `Number.isFinite`, and the Skia
  `useDerivedValue` falls back to safe values if any non-finite
  number ever slips through. Pinch focal locked to screen center
  rather than computed from raw touches (the onTouches API was
  introducing more crashes than it fixed).
