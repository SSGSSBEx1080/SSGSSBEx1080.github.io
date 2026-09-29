"""Иконка щита как в инвентаре: пластина 12×22×1 из entity/shield_base_nopattern, поворот gui [15,-25,-5] из models/item/shield.json."""
import math,sys
sys.path.insert(0,'tools')
from vanilla import base
from PIL import Image, ImageDraw
B=base(); t=Image.open(B/'textures/entity/shield_base_nopattern.png').convert('RGBA')
def R(ax,ay,az):
    ax,ay,az=[math.radians(a) for a in (ax,ay,az)]
    def mx(a):c,s=math.cos(a),math.sin(a);return [[1,0,0],[0,c,-s],[0,s,c]]
    def my(a):c,s=math.cos(a),math.sin(a);return [[c,0,s],[0,1,0],[-s,0,c]]
    def mz(a):c,s=math.cos(a),math.sin(a);return [[c,-s,0],[s,c,0],[0,0,1]]
    def mul(a,b):return [[sum(a[i][k]*b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
    return mul(mx(ax),mul(my(ay),mz(az)))
M=R(15,-25,-5); S=9; W=256
im=Image.new('RGBA',(W,W),(0,0,0,0)); d=ImageDraw.Draw(im)
def P(p):
    x,y,z=p; q=[sum(M[i][k]*p[k] for k in range(3)) for i in range(3)]
    return (W/2+q[0]*S, W/2-q[1]*S, q[2])
quads=[]
# plate: x -6..6, y -11..11, z -0.5..0.5 ; front z=+0.5 uv(1,1); side x=+6 uv(13,1) ; top y=11 uv(1,0); side x=-6 uv(0,1)
def face(corner,du,dv,u0,v0,nu,nv):
    for i in range(nu):
        for j in range(nv):
            c=t.getpixel((u0+i,v0+j))
            if c[3]<10: continue
            p0=[corner[k]+du[k]*i+dv[k]*j for k in range(3)]
            pts=[p0,[p0[k]+du[k] for k in range(3)],[p0[k]+du[k]+dv[k] for k in range(3)],[p0[k]+dv[k] for k in range(3)]]
            pp=[P(p) for p in pts]
            quads.append((sum(p[2] for p in pp)/4,[(p[0],p[1]) for p in pp],c))
face([-6,11,0.5],[1,0,0],[0,-1,0],1,1,12,22)      # front
face([6,11,0.5],[0,0,-1],[0,-1,0],13,1,1,22)      # right side
face([-6,11,-0.5],[0,0,1],[0,-1,0],0,1,1,22)      # left side
face([-6,11,-0.5],[1,0,0],[0,0,1],1,0,12,1)       # top
def shade(c,k):return tuple(int(v*k) for v in c[:3])+(255,)
for z,pts,c in sorted(quads,key=lambda q:q[0]):
    d.polygon(pts,fill=c[:3]+(255,))
bb=im.getbbox(); im=im.crop(bb)
sz=max(im.size); out=Image.new('RGBA',(sz+8,sz+8),(0,0,0,0)); out.paste(im,((sz+8-im.width)//2,(sz+8-im.height)//2))
out.resize((128,128),Image.LANCZOS).save('assets/textures/p12/shield_item.png'); print(bb)
