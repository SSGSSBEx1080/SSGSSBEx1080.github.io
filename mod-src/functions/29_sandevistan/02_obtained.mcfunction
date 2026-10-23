# ==========================================
#  ✦ УСТАНОВКА САНДЕВИСТАНА ✦
# ==========================================

playsound minecraft:block.beacon.activate master @s ~ ~ ~ 1.2 1.5
playsound minecraft:entity.evoker.prepare_wololo master @s ~ ~ ~ 1.0 0.8
playsound minecraft:entity.lightning_bolt.thunder master @s ~ ~ ~ 1.5 0.5
playsound minecraft:entity.wither.spawn master @s ~ ~ ~ 1.5 0.3

particle minecraft:flash ~ ~1 ~ 0 0 0 0 80 force @s
particle minecraft:end_rod ~ ~1 ~ 0.3 0.3 0.3 0.05 300 force @s
particle minecraft:enchant ~ ~0.5 ~ 0.5 0.5 0.5 0.05 300 force @s
particle minecraft:explosion_emitter ~ ~1 ~ 0 0 0 0 5 force @s

title @s times 0 40 20
title @s title {"text":"✦ САНДЕВИСТАН ✦","color":"aqua","bold":true}
title @s subtitle {"text":"⚡ ИМПЛАНТ УСТАНОВЛЕН ⚡","color":"gold","italic":true}

tellraw @s ["",{"text":"▸ ","color":"dark_gray"},{"text":"Сандевистан","color":"aqua","bold":true},{"text":" активирован. Время замедляется.","color":"gray"}]

title @s actionbar {"text":"⚡ СИСТЕМА: АКТИВНА","color":"aqua","bold":true}