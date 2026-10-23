# №29 — Sandevistan / original resource trail

Primary source: the author's complete mod shared in the supplied Google Drive
folder. `mod-src/java/p29` contains the relevant capability, events, packet,
items, recipe, client HUD/trail and armor-rendering classes. This is a curated
reference subset, not a standalone Forge project.

## Resources

- Item models: `sandevistan.json`, `immunosuppressant.json`; original item PNGs
  remain byte-identical. The implant preview uses `SandevistanArmorModel`'s
  `geo/sandevistan.geo.json` and `textures/armor/sandevistan.png`. The model's
  animation resource is **null** — no animation file is invented.
- The native `sandevistan_hud.png` is used inside the stand's viewport. Native
  names include **SANDEVISTAN OS v3.0**, TOLERANCE and NEURAL LOAD.
- All four original custom OGGs are kept unchanged: activate, deactivate,
  injection and psychosis. MP3 files are codec conversions only.
- `data/p29_audio.js` records the vanilla sound events, volumes and pitches from
  the installation Java and the two original reward `.mcfunction` files.
  Transitive vanilla samples use the Minecraft 1.19.2 archive at
  `InventivetalentDev/minecraft-assets`, ref `1.19.2`.
- All six native advancement JSONs, parents, icons and **150 XP** are preserved.
  Their descriptions are presented as attributed quotations of the original mod,
  not new editorial comments. The first criterion is *inventory_changed*, not a
  brewing-specific trigger.

## Exact gameplay distinctions

`SandevistanTogglePacket` handles V, validates the equipped chest item, grants the
activation criterion and plays the activation/deactivation sound only on a real
state transition. `SandevistanCapability` provides 100-tick activity, 100-tick
cooldown, +0.2f load/tick and the irreversible psychosis latch at 100.

**Java Float32 arithmetic is retained.** Five complete pulses produce
99.99961853027344f, so a subsequent active tick crosses the threshold. The HUD
number in the wiki is floored for display; the model never rounds its threshold.
There is no passive psychosis decay or invented cooldown-spam penalty.

The freeze query is the player's bounding box inflated by 20, **not a sphere**.
It includes entity bounding-box intersections and applies to items/projectiles,
TNT and other players. Only another *accelerating* player is excluded. A 3-tick
refreshed tail restores stored motion/gravity/AI, removes slowness/mining fatigue
and gives living entities 60 ticks of blindness. Blocks and world time do not
stop.

Installation: every 20 ticks, check a valid END_CITY structure, a **netherite
chestplate** and one immunosuppressant in **each hand**. Not a full armor set and
not specifically an End ship. Two doses are consumed. At cutscene tick 99 the
implant is equipped/awarded; the scene ends after tick 100. The item normally
adds Binding and Vanishing, guarded by the absence of Binding.

Brewing uses a normal POTION of STRONG_REGENERATION plus ENDER_EYE. A normal
three-bottle brewing-stand batch yields three doses. No crafted implant recipe is
invented.

Injection takes 32 ticks, only starts while equipped and not accelerating. It
queues `50*tolerance` points, consumed at at most one point/tick. Efficacy loses
0.05f per effective application and recovers 0.05f each 6000 ticks of the counter
reset by **activation**, not injection. Starting V during an existing injection
can waste the dose; after psychosis starts a new dose still consumes/animates but
does not clear the latch. Pre-existing queued reduction does not clear it either.

During critical psychosis: a growing area attack every 5 ticks, self-magic damage
every 10, and forced implant removal/death by tick 200 if still alive. A default
20-HP subject can die earlier. **No Adam Smasher entity is spawned** by the code;
that name belongs to the advancement description.

## Visual and stand scope

Native trails capture a pose each client tick, offset it 0.6 blocks behind, retain
up to 100, enlarge it 1.05x, tint `(p,1,1-p)` with alpha `p*0.5`, and remove four
old frames/tick after activity. Six instanced meshes reproduce the pose stream
without hundreds of separate draw calls. The arena/rigs, prepared materials and
camera are illustrative; they are not a full Minecraft environment. Native
FOV is not faked by a speed zoom. Weapon attack recovery is separate from the
reset target invulnerability frames.

Decorative flashes are deliberately suppressed/reducible for accessibility; the
clinical timers and outcomes continue unchanged. The header uses an explicit-UV
copy only to stabilize zero-width native box-UV samples at texel boundaries; raw
geometry/texture files remain unchanged. Source Java is preserved semantically;
trailing whitespace is normalized for repository hygiene.
