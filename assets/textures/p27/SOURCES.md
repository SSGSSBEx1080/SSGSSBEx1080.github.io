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

`pages/27-chigur/item-model.js` now builds actual Three.js cuboids from the
original Java item elements. It maps all six native faces, honors negative/rotated
UV rectangles, element pivots/rescale and planar geometry. Minecraft Java face UVs
are normalized to 16; the Blockbench `texture_size` is not a second normalization.
No source JSON or texture is altered.

The former CSS-face stack is no longer used on this page. Its face winding and
zero-width transforms could hide surfaces while orbiting. A planar trigger guard
now has two oppositely facing real faces rather than two doubled CSS sheets.
The shotgun has 32 drawable native faces; the thin coin has all six, including
its edge and its separate north/south atlas rectangles. The live coin toss rotates
that model, not an image of the atlas.

`tools/render_p27_assets.js` reproduces the static item/coin snapshots and icons
through the same WebGL meshes. The actor's existing `anton_stalk.png` remains a
render of its original animation at t = 0.35 s. Unsupported WebGL browsers see
proper rendered item views, never the unfolded atlas.
