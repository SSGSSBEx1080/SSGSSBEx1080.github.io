# №27 resource trail

The supplied mod is the primary source. No substitute character model, animation,
recorded voice, or weapon texture is used.

- `AntonChigurModel.java` → `geo/anton_chigur.geo.json`,
  `animations/anton_chigur.animation.json`, `textures/entity/anton_chigur.png`.
  The raw model and animation in `mod-src` and the served entity texture are
  byte-identical to the supplied resources. The shared renderer's handedness and
  Z→Y→X rotation order were checked against GeckoLib 3's `GeoBuilder`/`RenderUtils`;
  no bone is arbitrarily mirrored to correct a presentation image.
- `ModItems.java` → `ChigurShotgunItem`, `ChigurCoinItem` and the spawn egg
  (`0x18212A`, `0x9D7255`). Original item models live in `mod-src/models/item/`.
  `data/p27_items.js` contains those models for the rotatable trophy viewer.
- `27_chigur/*.json` specifies the five advancement items: Chigur spawn egg,
  written book, red bed, Chigur coin, Chigur shotgun. `tools/build_p27.py` now
  reads these IDs rather than substituting portraits. `i/` contains their web
  inventory renders. Coin and shotgun renders use the original model faces/UVs;
  the egg and written book reuse the existing Minecraft 1.19.2 wiki resources;
  the vanilla bed silhouette uses the red bed's canonical dye.
- `AntonChigurEntity.java`, `ChigurShotgunItem.java`, and the supplied `sounds.json`
  point at `chigur_speech_1`–`6`, `chigur_shot`, `chigur_reload`, `chigur_coin`,
  `chigur_airgun`, `chigur_vanish`, and `chigur_step`. All 12 original OGGs are
  served in `assets/sounds/p27/`. MP3 files are codec conversions of those same
  OGGs, not replacement performances. The page audio graph supplies visible mute,
  volume, playback errors, and a user-gesture unlock for scheduled dialogue.

An inventory render or a presentation camera is not a change to the game's model.
The firing-range illustration mirrors its raster gun so the muzzle faces the
actual target; inventory icons retain the original item's GUI orientation.

`tools/render_p27_assets.js` reproduces `anton_stalk.png` from the original
`animation.chigur.stalk` at t = 0.35 s (not a baked T-pose), and
`shotgun_side.png` from the original Java item model. The latter replaces the old
entity-bone-derived weapon illustration. No original source JSON is altered.
