# ==========================================
#  ☠ СМЕРТЬ ОТ КИБЕРПСИХОЗА ☠
# ==========================================

playsound minecraft:entity.ender_dragon.death master @s ~ ~ ~ 1.0 0.3
playsound minecraft:entity.wither.spawn master @s ~ ~ ~ 1.0 0.5
playsound minecraft:entity.phantom.hurt master @s ~ ~ ~ 1.0 1.2
playsound minecraft:ambient.cave master @s ~ ~ ~ 1.0 0.8
playsound minecraft:block.beacon.deactivate master @s ~ ~ ~ 1.0 0.2

particle minecraft:flash ~ ~1 ~ 0 0 0 0 100 force @s
particle minecraft:explosion_emitter ~ ~1 ~ 0 0 0 0 15 force @s
particle minecraft:firework ~ ~1 ~ 1 1 1 0.5 400 force @s
particle minecraft:dust 1 0 0 1 ~ ~1 ~ 0.5 0.5 0.5 1 300 force @s

title @s times 0 50 20
title @s title {"text":"☠ КИБЕРПСИХОЗ ☠","color":"dark_red","bold":true,"obfuscated":true}
title @s subtitle {"text":"⚡ СИСТЕМА РАЗРУШЕНА ⚡","color":"red","italic":true}

tellraw @s ["",{"text":"☠ ","color":"dark_red"},{"text":"КИБЕРПСИХОЗ","color":"red","bold":true},{"text":" — сознание потеряно.","color":"gray"}]
tellraw @s ["",{"text":"▸ ","color":"dark_gray"},{"text":"Имплант уничтожил хозяина.","color":"dark_red","italic":true}]

title @s actionbar {"text":"⚠️ СБОЙ СИСТЕМЫ","color":"dark_red","bold":true}

kill @s