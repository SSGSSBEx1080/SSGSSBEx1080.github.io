/* Сгенерировано tools/build_data.py, руками не править */
window.ZM = window.ZM || {};
ZM.P01 = {
 "point": 1,
 "title": "Цифроблоки",
 "added": "26.10.2025",
 "blocks": [
  {
   "id": "one",
   "digit": 1,
   "name": "Единица",
   "registry": "zitraksmode:one",
   "texture": "assets/textures/block/one.png",
   "recipe": {
    "type": "shaped",
    "grid": [
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:quartz",
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:coal"
    ],
    "result": "zitraksmode:one",
    "count": 1
   }
  },
  {
   "id": "two",
   "digit": 2,
   "name": "Двойка",
   "registry": "zitraksmode:two",
   "texture": "assets/textures/block/two.png",
   "recipe": {
    "type": "shaped",
    "grid": [
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:quartz",
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:quartz",
     "minecraft:coal",
     "minecraft:coal"
    ],
    "result": "zitraksmode:two",
    "count": 1
   }
  },
  {
   "id": "three",
   "digit": 3,
   "name": "Тройка",
   "registry": "zitraksmode:three",
   "texture": "assets/textures/block/three.png",
   "recipe": {
    "type": "shaped",
    "grid": [
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:quartz",
     "minecraft:quartz",
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:quartz"
    ],
    "result": "zitraksmode:three",
    "count": 1
   }
  },
  {
   "id": "four",
   "digit": 4,
   "name": "Четвёрка",
   "registry": "zitraksmode:four",
   "texture": "assets/textures/block/four.png",
   "recipe": {
    "type": "shaped",
    "grid": [
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:quartz",
     "minecraft:coal"
    ],
    "result": "zitraksmode:four",
    "count": 1
   }
  },
  {
   "id": "five",
   "digit": 5,
   "name": "Пятёрка",
   "registry": "zitraksmode:five",
   "texture": "assets/textures/block/five.png",
   "recipe": {
    "type": "shaped",
    "grid": [
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:coal"
    ],
    "result": "zitraksmode:five",
    "count": 1
   }
  },
  {
   "id": "six",
   "digit": 6,
   "name": "Шестёрка",
   "registry": "zitraksmode:six",
   "texture": "assets/textures/block/six.png",
   "recipe": {
    "type": "shaped",
    "grid": [
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:quartz"
    ],
    "result": "zitraksmode:six",
    "count": 1
   }
  },
  {
   "id": "seven",
   "digit": 7,
   "name": "Семёрка",
   "registry": "zitraksmode:seven",
   "texture": "assets/textures/block/seven.png",
   "recipe": {
    "type": "shaped",
    "grid": [
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:quartz",
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:quartz",
     "minecraft:coal"
    ],
    "result": "zitraksmode:seven",
    "count": 1
   }
  },
  {
   "id": "eight",
   "digit": 8,
   "name": "Восьмёрка",
   "registry": "zitraksmode:eight",
   "texture": "assets/textures/block/eight.png",
   "recipe": {
    "type": "shaped",
    "grid": [
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:coal"
    ],
    "result": "zitraksmode:eight",
    "count": 1
   }
  },
  {
   "id": "nine",
   "digit": 9,
   "name": "Девятка",
   "registry": "zitraksmode:nine",
   "texture": "assets/textures/block/nine.png",
   "recipe": {
    "type": "shaped",
    "grid": [
     "minecraft:quartz",
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:quartz",
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:coal",
     "minecraft:coal"
    ],
    "result": "zitraksmode:nine",
    "count": 1
   }
  },
  {
   "id": "zero",
   "digit": 0,
   "name": "Ноль",
   "registry": "zitraksmode:zero",
   "texture": "assets/textures/block/zero.png",
   "recipe": {
    "type": "shaped",
    "grid": [
     "zitraksmode:one",
     "zitraksmode:two",
     "zitraksmode:three",
     "zitraksmode:four",
     "zitraksmode:five",
     "zitraksmode:six",
     "zitraksmode:seven",
     "zitraksmode:eight",
     "zitraksmode:nine"
    ],
    "result": "zitraksmode:zero",
    "count": 1
   }
  }
 ],
 "advancements": [
  {
   "id": "zitraksmode:01_numbers/one",
   "key": "one",
   "parent": "zitraksmode:root",
   "frame": "task",
   "hidden": true,
   "xp": 5,
   "icon": "one",
   "title": {
    "text": "Единица",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "description": {
    "text": "Одна извилина",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "condition": "Получить в инвентарь: «Единица»"
  },
  {
   "id": "zitraksmode:01_numbers/two",
   "key": "two",
   "parent": "zitraksmode:01_numbers/one",
   "frame": "task",
   "hidden": true,
   "xp": 5,
   "icon": "two",
   "title": {
    "text": "Двойка",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "description": {
    "text": "2 подбородка",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "condition": "Получить в инвентарь: «Двойка»"
  },
  {
   "id": "zitraksmode:01_numbers/three",
   "key": "three",
   "parent": "zitraksmode:01_numbers/two",
   "frame": "task",
   "hidden": true,
   "xp": 5,
   "icon": "three",
   "title": {
    "text": "Тройка",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "description": {
    "text": "3 героя в пуле",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "condition": "Получить в инвентарь: «Тройка»"
  },
  {
   "id": "zitraksmode:01_numbers/four",
   "key": "four",
   "parent": "zitraksmode:01_numbers/three",
   "frame": "task",
   "hidden": true,
   "xp": 5,
   "icon": "four",
   "title": {
    "text": "Четвёрка",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "description": {
    "text": "4 песни в плейлисте",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "condition": "Получить в инвентарь: «Четвёрка»"
  },
  {
   "id": "zitraksmode:01_numbers/five",
   "key": "five",
   "parent": "zitraksmode:01_numbers/four",
   "frame": "task",
   "hidden": true,
   "xp": 5,
   "icon": "five",
   "title": {
    "text": "Пятёрка",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "description": {
    "text": "5 размер сисек",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "condition": "Получить в инвентарь: «Пятёрка»"
  },
  {
   "id": "zitraksmode:01_numbers/six",
   "key": "six",
   "parent": "zitraksmode:01_numbers/five",
   "frame": "task",
   "hidden": true,
   "xp": 5,
   "icon": "six",
   "title": {
    "text": "Шестёрка",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "description": {
    "text": "Шестая позиция",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "condition": "Получить в инвентарь: «Шестёрка»"
  },
  {
   "id": "zitraksmode:01_numbers/seven",
   "key": "seven",
   "parent": "zitraksmode:01_numbers/six",
   "frame": "task",
   "hidden": true,
   "xp": 5,
   "icon": "seven",
   "title": {
    "text": "Семёрка",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "description": {
    "text": "7см хуй",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "condition": "Получить в инвентарь: «Семёрка»"
  },
  {
   "id": "zitraksmode:01_numbers/eight",
   "key": "eight",
   "parent": "zitraksmode:01_numbers/seven",
   "frame": "task",
   "hidden": true,
   "xp": 5,
   "icon": "eight",
   "title": {
    "text": "Восьмёрка",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "description": {
    "text": "8 лет условка",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "condition": "Получить в инвентарь: «Восьмёрка»"
  },
  {
   "id": "zitraksmode:01_numbers/nine",
   "key": "nine",
   "parent": "zitraksmode:01_numbers/eight",
   "frame": "task",
   "hidden": true,
   "xp": 5,
   "icon": "nine",
   "title": {
    "text": "Девятка",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "description": {
    "text": "9 классов образования",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "condition": "Получить в инвентарь: «Девятка»"
  },
  {
   "id": "zitraksmode:01_numbers/zero",
   "key": "zero",
   "parent": "zitraksmode:01_numbers/nine",
   "frame": "challenge",
   "hidden": true,
   "xp": 20,
   "icon": "zero",
   "title": {
    "text": "БЛОК НОЛЬ",
    "color": "dark_purple",
    "bold": true,
    "obfuscated": false
   },
   "description": {
    "text": "0 импакта",
    "color": null,
    "bold": false,
    "obfuscated": false
   },
   "condition": "Получить в инвентарь: «Ноль»"
  },
  {
   "id": "zitraksmode:01_numbers/secret_1488",
   "key": "secret_1488",
   "parent": "zitraksmode:01_numbers/zero",
   "frame": "challenge",
   "hidden": true,
   "xp": 50,
   "icon": "one",
   "redacted": true
  }
 ],
 "names": {
  "minecraft:coal": "Уголь",
  "minecraft:quartz": "Кварц незера",
  "zitraksmode:one": "Единица",
  "zitraksmode:two": "Двойка",
  "zitraksmode:three": "Тройка",
  "zitraksmode:four": "Четвёрка",
  "zitraksmode:five": "Пятёрка",
  "zitraksmode:six": "Шестёрка",
  "zitraksmode:seven": "Семёрка",
  "zitraksmode:eight": "Восьмёрка",
  "zitraksmode:nine": "Девятка",
  "zitraksmode:zero": "Ноль"
 },
 "props": {
  "material": "STONE",
  "sound": "STONE",
  "hardness": 2.9,
  "resistance": 3.4,
  "requiresTool": false,
  "stack": 64,
  "light": 0,
  "source": "ModBlocks.registerNumberBlock(): strength(2.9f, 3.4f), Material.STONE, SoundType.STONE"
 }
};
