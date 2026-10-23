# №28 — source trail

Primary source: the complete mod supplied by the author at
https://drive.google.com/drive/folders/1uGlkREioLv2-AJRRFSkUEjEnXWYXZchH

## Original resources, unchanged

- `models/item/medusa.json` → `item/generated` and `textures/item/medusa.png`.
  This is a generated **item texture**, not an invented native 3D model.
- `MedusaWaveClientRenderer.java` → `textures/misc/medusa_wave.png`, a textured
  48-longitude × 32-latitude sphere, both sides, full brightness, RGBA
  **125, 238, 190, 170**. Its growth follows the server's **1.6 blocks/tick**.
- `LivingEntityRendererMedusaMixin.java` → `textures/misc/petrified_stone.png`.
  It replaces the living model's texture, not its geometry or pose.
  `EyesLayerMedusaMixin` suppresses emissive eyes while petrified.
- Recipe: `IRI / RDR / IRI`, with iron blocks, redstone blocks and a diamond.
- All five JSON advancements and all five reward `.mcfunction` files are kept in
  `mod-src`. Their native names, descriptions, parents, item icons and **175 XP**
  are reproduced. The parent chain is NOT an instruction to auto-award previous
  criteria: an ordinary throw does not grant the hand-countdown achievement.

The three supplied image hashes and original item-model hash are independently
recorded in `tools/test_p28.js`. No AI-generated item, sphere, stone or audio is
substituted for these resources.

## Rules traced through Java

`MedusaItem` supplies radius 2–32 (default 8), delay 2–1200 ticks (default 60,
step 2), absolute `MedusaDetonateAt`, one charge in `MedusaCharged`, a minimum
3-tick throw, and Science Power caps 64/128/256/512. Changing the delay does not
rewrite an armed deadline. Throwing and pickup preserve it. The thrown stack is
a copy, not a live link to later hand settings.

`MedusaOrbEntity` supplies the heavy throw, drag, Magnus force, charged/empty
bounce coefficients and pickup checks. An activation consumes the charge, not the
physical object. A spent orb falls and remains recoverable.

`PetrificationManager` supplies the maximum-AABB candidate snapshot, body-centre
sphere test without a wall raycast, owner susceptibility, max(old,new) end time,
15%-maximum-health healing each second, effect suspension/removal, damage
multipliers, gravity and zombie-villager conversion after release.

Player duration is `round(900*(1-min(.8,min(.7,xp*.0125)+min(.3,armor*.009+
 toughness*.006))))` ticks, with a nominal lower clamp of 160. The combined .8
cap means its actual reachable minimum is **180 ticks / 9 seconds**, not 8.
Mobs use `max(300,1200-floor(maxHP/20)*20)` ticks.

`MedusaAnvilHandler` copies a discharged stack, preserves settings/enchantments,
restores charge, clears the old timer, and costs **one diamond + one XP level**.
The supplied `ModItems` registers vanilla durability 1024; activation logic does
not decrement that value. The actual charge is NBT, so this page does not invent
a 1024-use charge meter from that registration or treat a stale comment as code.

## Transitive vanilla resources

Skin/portrait and inventory icons are the wiki's Minecraft 1.19.2 assets.
The zombie-villager skin and native sound-event samples come from the same
vanilla version, archived at `InventivetalentDev/minecraft-assets`, ref `1.19.2`.
`data/p28_audio.js` records the exact vanilla sound events named by the supplied
Java and reward functions, with their volume and pitch. MP3s are codec conversions
of the OGGs, not replacement sound performances.

## Scope of the stand

The small specimen rigs, terrain, camera and simplified collision surfaces are
illustrations, not a recreation of the Minecraft renderer/engine. The native
item/sphere/stone resources and the ported timers/formulas drive one shared model,
including the non-WebGL cross-section. The virtual 20-TPS world pauses in hidden
tabs, saves its clock/deadlines, and can be fast-forwarded explicitly. Starting a
**new stand** is a new demonstration, not an in-game timer-cancellation mechanic.

Formatting note: trailing whitespace in the copied `ModItems.java` was removed
for repository hygiene. Its declarations and logic are unchanged. Original
texture, model and advancement JSON bytes are preserved.
