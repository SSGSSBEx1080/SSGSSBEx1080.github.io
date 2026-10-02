#!/usr/bin/env python3
"""Готовит маленький JS-модуль из оригинальных Bedrock JSON №26. Никакой ручной замены текстур/геометрии."""
import json, re
from pathlib import Path
R = Path(__file__).resolve().parents[1]
read = lambda path: json.loads((R / path).read_text(encoding='utf-8-sig'))
model = read('mod-src/geo/p26_vacuum.geo.json')['minecraft:geometry'][0]
raw_anim = read('mod-src/animations/p26_vacuum.animation.json')['animations']

def tracks(data):
    if isinstance(data, dict):
        if 'vector' in data: return [[0, data['vector']]]
        return [[float(t), v.get('post',v.get('vector',v)) if isinstance(v,dict) else v] for t,v in data.items()]
    return [[0, data]] if isinstance(data, list) else []
anim = {}
for full, spec in raw_anim.items():
    name = full.rsplit('.',1)[-1]
    bones = {}
    for bone, channels in spec.get('bones',{}).items():
        bones[bone] = {k:tracks(v) for k,v in channels.items() if k in ('rotation','position','scale') and tracks(v)}
    anim[name] = {'len': float(spec.get('animation_length',1)), 'loop': spec.get('loop') is True, 'bones': bones}
geo = {'tw':model['description']['texture_width'], 'th':model['description']['texture_height'], 'bones':model['bones']}
(R/'data/p26_geo.js').write_text('/* Оригинальные vacuum.geo.json + vacuum.animation.json; сборка: python3 tools/build_p26.py */\nwindow.ZM=window.ZM||{};ZM.P26G='+json.dumps({'geo':geo,'anim':anim},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')

entries = [('crafted',10,'vacuum_icon','task','Получи пылесос: собери рецепт в верстаке или подбери готовый предмет. В игре проверяется наличие в инвентаре.'),('max_power_60s',50,'vacuum_icon','goal','Держи ЛКМ при силе 10 без перерывов 60 секунд (1200 игровых тиков). Если отпустить или уменьшить силу, счётчик обнуляется.'),('airuhan_3',100,'enchanted_book','challenge','Получи пылесос с зачарованием «Воздухан» III. Только этот предмет принимает чары, максимум III.')]
adv=[]
colors={'0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9','a':'a','b':'b','c':'c','d':'d','e':'e','f':'f'}
for key,xp,icon,frame,how in entries:
    source=read(f'mod-src/advancements/26_vacuum/{key}.json')
    d=source['display']
    def render(text):
        if isinstance(text,dict):return text.get('text','')
        return re.sub(r'§[0-9a-fklmnor]','',text)
    title0=d['title'];desc0=d['description']
    match=re.match(r'^((?:§[0-9a-fklmnor])*)',title0 if isinstance(title0,str) else '')
    codes=re.findall(r'§(.)',match.group(0)) if match else []
    col=next((c for c in reversed(codes) if c in colors),'f')
    adv.append({'key':key,'free':True,'title':render(title0),'color':col,'bold':'l' in codes,'frame':frame,'xp':xp,'icon':icon,'desc':render(desc0),'how':how,'parent':(lambda p: None if p in ('','root') else p)(source.get('parent','').split('/')[-1].split(':')[-1])})
(R/'data/p26_adv.js').write_text('/* Достижения №26: оригинальные тексты из mod-src/advancements/26_vacuum, условия сверены с Java. */\nwindow.ZM=window.ZM||{};ZM.P26={advancements:'+json.dumps(adv,ensure_ascii=False,separators=(',',':'))+'};\n',encoding='utf-8')
print('№26:',len(geo['bones']),'костей,',list(anim),'анимации,',len(adv),'достижения')
