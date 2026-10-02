#!/usr/bin/env python3
"""Produce the №27 browser data from the original Chigur GeckoLib model and 5 advancements."""
import json
from pathlib import Path
R = Path(__file__).resolve().parents[1]
def read(p): return json.loads((R / p).read_text(encoding='utf-8-sig'))
model = read('mod-src/geo/p27_anton_chigur.geo.json')['minecraft:geometry'][0]
raw = read('mod-src/animations/p27_anton_chigur.animation.json')['animations']
def tracks(v):
    if isinstance(v,dict):
        if 'vector' in v:return [[0,v['vector']]]
        return sorted([[float(t),frame.get('post',frame.get('vector',frame)) if isinstance(frame,dict) else frame] for t,frame in v.items()],key=lambda x:x[0])
    return [[0,v]] if isinstance(v,(list,int,float)) else []
anim={}
for name,spec in raw.items():
    anim[name]={'len':spec.get('animation_length',1),'loop':spec.get('loop') is True,'bones':{bone:{axis:tracks(ch) for axis,ch in channels.items() if axis in ('rotation','position','scale') and tracks(ch)} for bone,channels in spec.get('bones',{}).items()}}
geo={'tw':model['description']['texture_width'],'th':model['description']['texture_height'],'bones':model['bones']}
(R/'data/p27_geo.js').write_text('/* Generated from original anton_chigur.geo.json and anton_chigur.animation.json. */\nwindow.ZM=window.ZM||{};ZM.P27G='+json.dumps({'geo':geo,'anim':anim},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
info=[('first_meeting',10,'anton_portrait','Approach within 5 blocks; spawning alone does not grant this.'),('dialogue_mistake',20,'anton_portrait','Choose «Откуда ты?» in the first dialogue.'),('night_visit',50,'anton_portrait','Try to sleep during the personal night hunt.'),('coin_luck',70,'coin_face','Win the coin toss after standing still and ignoring Chigur.'),('hunter',100,'chigur_shotgun_render','Defeat Chigur and claim the dropped shotgun.')]
list=[]
for key,xp,icon,how in info:
    d=read('mod-src/advancements/27_chigur/'+key+'.json');disp=d['display'];p=d.get('parent','').split('/')[-1].replace('zitraksmode:','');list.append(dict(key=key,title=disp['title'],color='6',frame=disp['frame'],xp=xp,icon=icon,desc=disp['description'],how=how,parent=None if p=='root' else p,free=True))
(R/'data/p27_adv.js').write_text('/* Original advancement names and descriptions from the mod; XP values are site exploration scores, not claimed game XP. */\nwindow.ZM=window.ZM||{};ZM.P27={advancements:'+json.dumps(list,ensure_ascii=False,separators=(',',':'))+'};\n',encoding='utf-8')
print('Built №27:',len(geo['bones']),'bones,',len(anim),'animations,',len(list),'achievements')
