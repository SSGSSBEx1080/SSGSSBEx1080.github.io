/* №26 · камера: исходная Bedrock-геометрия и атлас в Three.js, а не абстрактная замена модели.
   Группы костей и коробочная UV-развёртка преобразованы из vacuum.geo.json.
   Физика предметов — НАГЛЯДНАЯ браузерная модель конуса/фильтра из VacuumServerEvents.java. */
import * as THREE from '../../shared/vendor/three/three.module.js';

const host=document.querySelector('#chamberCanvas'),chamber=document.querySelector('#chamber');
if(host&&chamber&&window.P26APP&&window.ZM?.P26G){
  try{
    const app=window.P26APP,S=app.state;
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.45;
    renderer.setClearColor(0x000000,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
    const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x0b2728,.034);
    const camera=new THREE.PerspectiveCamera(42,1,.1,120);
    scene.add(new THREE.HemisphereLight(0xa9fae2,0x26504c,2.5));
    const key=new THREE.DirectionalLight(0xf6f4d4,3.8);key.position.set(3,12,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-11;key.shadow.camera.right=11;key.shadow.camera.top=11;key.shadow.camera.bottom=-11;key.shadow.bias=-.0002;scene.add(key);
    const rim=new THREE.PointLight(0x64ffe0,15,14,2);rim.position.set(-3,2,1);scene.add(rim);
    const rear=new THREE.PointLight(0xff9d64,9,11,2);rear.position.set(2,3,7);scene.add(rear);
    const floor=new THREE.Mesh(new THREE.CircleGeometry(17,90),new THREE.MeshStandardMaterial({color:0x143a38,roughness:.9,metalness:.08}));floor.rotation.x=-Math.PI/2;floor.position.y=-.23;floor.receiveShadow=true;scene.add(floor);
    const grid=new THREE.GridHelper(34,34,0x618f7a,0x29564d);grid.position.y=-.212;grid.material.transparent=true;grid.material.opacity=.32;scene.add(grid);
    const well=new THREE.Mesh(new THREE.CylinderGeometry(2.55,2.75,.23,64),new THREE.MeshStandardMaterial({color:0x132e30,metalness:.65,roughness:.4}));well.position.set(0,-.1,2.5);well.receiveShadow=true;scene.add(well);
    const edg=new THREE.Mesh(new THREE.TorusGeometry(2.55,.027,7,96),new THREE.MeshBasicMaterial({color:0x7ce9c2}));edg.rotation.x=Math.PI/2;edg.position.set(0,.023,2.5);scene.add(edg);
    const marker=new THREE.Group();scene.add(marker);
    const lineMat=new THREE.LineBasicMaterial({color:0x7ce9cd,transparent:true,opacity:.24,depthWrite:false});
    const pointerBaseZ=-.55;
    let lastGeometry='';
    function rebuildCone(){const k=S.power+'/'+S.enchant;if(k===lastGeometry)return;lastGeometry=k;while(marker.children.length){const x=marker.children[0];marker.remove(x);x.geometry.dispose();}
      const len=Math.max(.5,app.range()*.47),angle=.30+S.power*.025;
      for(let j=1;j<=5;j++){
        const d=len*j/5,r=Math.tan(angle)*d;
        const points=Array.from({length:65},(_,i)=>new THREE.Vector3(Math.cos(i/64*Math.PI*2)*r,.95+Math.sin(i/64*Math.PI*2)*r,pointerBaseZ-d));
        marker.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),lineMat));
      }
      for(let i=0;i<9;i++){const a=i/9*Math.PI*2,d=len,r=Math.tan(angle)*d;marker.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,.95,pointerBaseZ),new THREE.Vector3(Math.cos(a)*r,.95+Math.sin(a)*r,pointerBaseZ-d)]),lineMat));}
    }
    const loader=new THREE.TextureLoader();const modelTexture=loader.load('../../assets/textures/p26/vacuum.png');
    modelTexture.colorSpace=THREE.SRGBColorSpace;modelTexture.magFilter=THREE.NearestFilter;modelTexture.minFilter=THREE.NearestMipmapNearestFilter;
    const atlasMat=new THREE.MeshStandardMaterial({map:modelTexture,roughness:.8,metalness:.08,alphaTest:.45,side:THREE.DoubleSide});
    const {geo,anim}=ZM.P26G;
    const piv=b=>{const p=b.pivot||[0,0,0];return new THREE.Vector3(-p[0],p[1],p[2]);};
    function boxUV(u,v,w,h,d){return{east:[u,v+d,u+d,v+d+h],north:[u+d,v+d,u+d+w,v+d+h],west:[u+d+w,v+d,u+2*d+w,v+d+h],south:[u+2*d+w,v+d,u+2*d+2*w,v+d+h],up:[u+d,v,u+d+w,v+d],down:[u+d+w,v+d,u+d+2*w,v]};}
    function euler(x,y,z){return new THREE.Euler(-x*Math.PI/180,-y*Math.PI/180,z*Math.PI/180,'ZYX');}
    function cube(c,bone){const o=c.origin,s=c.size,inf=c.inflate||0;
      const geometry=new THREE.BoxGeometry(s[0]+inf*2,s[1]+inf*2,s[2]+inf*2);
      const rects=Array.isArray(c.uv)?boxUV(c.uv[0],c.uv[1],Math.floor(s[0]+1e-6),Math.floor(s[1]+1e-6),Math.floor(s[2]+1e-6)):c.uv;
      const face=['east','west','up','down','south','north'],uv=geometry.attributes.uv;
      face.forEach((f,j)=>{let r=Array.isArray(c.uv)?rects[f]:rects[f]?[...rects[f].uv,rects[f].uv[0]+rects[f].uv_size[0],rects[f].uv[1]+rects[f].uv_size[1]]:null;
        if(!r)return;let [u1,v1,u2,v2]=r;if((c.mirror??bone.mirror)&&Array.isArray(c.uv)){const pair=f==='east'?'west':f==='west'?'east':f;r=rects[pair];[u1,v1,u2,v2]=r;[u1,u2]=[u2,u1];}
        for(let i=0;i<4;i++){const n=j*4+i,a=uv.getX(n),b=uv.getY(n);uv.setXY(n,(u1+(u2-u1)*a)/geo.tw,1-(v1+(v2-v1)*(1-b))/geo.th);}
      });uv.needsUpdate=true;
      const mesh=new THREE.Mesh(geometry,atlasMat);const center=new THREE.Vector3(-o[0]-s[0]/2,o[1]+s[1]/2,o[2]+s[2]/2);
      if(c.rotation&&c.pivot){const group=new THREE.Group(),cp=new THREE.Vector3(-c.pivot[0],c.pivot[1],c.pivot[2]);group.position.copy(cp).sub(piv(bone));mesh.position.copy(center).sub(cp);group.rotation.copy(euler(...c.rotation));group.add(mesh);mesh.castShadow=true;return group;}
      mesh.position.copy(center).sub(piv(bone));mesh.castShadow=true;return mesh;
    }
    const root3D=new THREE.Group(),bones={};root3D.scale.setScalar(.27);root3D.position.set(0,.08,2.5);scene.add(root3D);
    for(const b of geo.bones){const node=new THREE.Group();node.name=b.name;node.position.copy(piv(b));if(b.parent){const par=geo.bones.find(x=>x.name===b.parent);node.position.sub(piv(par));bones[b.parent].add(node);}else root3D.add(node);bones[b.name]=node;
      if(b.rotation)node.rotation.copy(euler(...b.rotation));for(const c of b.cubes||[])node.add(cube(c,b));}
    const items=[],MAX=85;
    const sprites=new Map();for(const item of app.items){const tex=loader.load('../../assets/textures/p26/v/'+item.id+'.png');tex.colorSpace=THREE.SRGBColorSpace;tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;sprites.set(item.id,new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,alphaTest:.13,color:0xffffff}));}
    function spawn(count=16){for(let i=0;i<count&&items.length<MAX;i++){
      const item=app.items[(Math.random()*app.items.length)|0],sprite=new THREE.Sprite(sprites.get(item.id));
      const d=1.3+Math.random()*9.5,x=(Math.random()-.5)*Math.max(2.0,d*.9),z=pointerBaseZ-d;
      sprite.position.set(x,.32+Math.random()*.9,z);sprite.scale.setScalar(.46+Math.random()*.16);sprite.material=sprites.get(item.id);scene.add(sprite);
      items.push({item,sprite,phase:Math.random()*10,d,idle:Math.random()*1.3,speed:0,spin:Math.random()*10});
    }}
    function remove(x){scene.remove(x.sprite);const i=items.indexOf(x);if(i>=0)items.splice(i,1);}
    let active=false;const api={setActive(v){active=v},spawn,get count(){return items.length},get model(){return bones},debug:{range:app.range,angles:()=>.3+S.power*.025}};window.P26CHAMBER=api;spawn(30);
    chamber.classList.add('three-ready');
    const cam={yaw:.68,pitch:.34,dist:18.5},target=new THREE.Vector3(0,1.05,-2),drag={v:false};
    renderer.domElement.addEventListener('pointerdown',e=>{drag.v=true;drag.x=e.clientX;drag.y=e.clientY;drag.yaw=cam.yaw;drag.pitch=cam.pitch;renderer.domElement.setPointerCapture(e.pointerId);});
    renderer.domElement.addEventListener('pointermove',e=>{if(!drag.v)return;cam.yaw=drag.yaw+(e.clientX-drag.x)*.006;cam.pitch=Math.max(-.15,Math.min(1.25,drag.pitch+(e.clientY-drag.y)*.005));});
    renderer.domElement.addEventListener('pointerup',()=>{drag.v=false});renderer.domElement.addEventListener('pointercancel',()=>{drag.v=false});
    let visible=true;new IntersectionObserver(entries=>visible=entries[0].isIntersecting,{rootMargin:'250px'}).observe(chamber);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');let last=performance.now(),lastStatus=0;
    function frame(t){requestAnimationFrame(frame);const dt=Math.min(.06,(t-last)/1000);last=t;if(!visible||document.hidden)return;
      const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;const d=Math.min(devicePixelRatio||1,1.65);
      if(renderer.domElement.width!==Math.round(w*d)||renderer.domElement.height!==Math.round(h*d)){renderer.setPixelRatio(d);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
      rebuildCone();lineMat.opacity=active?.30+.14*Math.sin(t*.008):.13;
      const hold=active&&S.mode==='custom'&&S.custom==='vacuum_icon';
      const animSpec=anim[active?'suck':'idle'];const a=t/1000%animSpec.len;
      // Оригинальные ключевые кадры GeckoLib: root слегка качается, fan вращается при suck.
      const sample=(tracks,time)=>{if(!tracks||!tracks.length)return[0,0,0];for(let i=1;i<tracks.length;i++)if(tracks[i][0]>=time){const q=tracks[i-1],r=tracks[i],k=(time-q[0])/Math.max(.0001,r[0]-q[0]);return q[1].map((v,j)=>v+(r[1][j]-v)*k);}return tracks.at(-1)[1];};
      for(const [name,ch] of Object.entries(animSpec.bones)){const spec=geo.bones.find(b=>b.name===name);const rot=sample(ch.rotation,a),base=spec?.rotation||[0,0,0];bones[name].rotation.copy(euler(base[0]+rot[0],base[1]+rot[1],base[2]+rot[2]));}
      const rangeWorld=app.range()*.47,limitAngle=.30+S.power*.025;
      for(const x of [...items]){
        const p=x.sprite.position,dx=p.x,dy=p.y-.95,dz=pointerBaseZ-p.z,dist=Math.hypot(dx,dy,dz),within=dz>0&&dist<=rangeWorld&&Math.acos(Math.max(-1,Math.min(1,dz/Math.max(.01,dist))))<=limitAngle;
        if(active&&within&&app.matches(x.item)&&!hold){x.speed=Math.min(5.5,x.speed+dt*(.85+S.power*.12));p.x+=(-p.x)*Math.min(.22,x.speed*dt/Math.max(.3,dist));p.z+=Math.min(dz,x.speed*dt);p.y+=(1.1-p.y)*dt*1.3;
          if(p.z>pointerBaseZ-.29){const n=app.insert(x.item.id,1);if(n){remove(x);if(t-lastStatus>480){app.log(`${x.item.name} втянут. Ячеек занято: ${app.capacity()-app.free()}/${app.capacity()}.`);lastStatus=t;}}else{x.speed=0;p.z=pointerBaseZ-.8;if(t-lastStatus>1300){app.log('Хранилище заполнено. Установи сундук или перенеси предметы.');lastStatus=t;}}}
        }else{x.speed=0;if(!reduced.matches){p.y+=Math.sin(t*.0016+x.phase)*dt*.04;x.sprite.material.rotation=Math.sin(t*.0004+x.spin)*.14;}}
      }
      if(active&&!reduced.matches){rim.intensity=15+Math.sin(t*.008)*4;edg.material.color.setHex(t%700<350?0xa5efd8:0x57bca9);}else{rim.intensity=11;edg.material.color.setHex(0x7ce9c2);}
      camera.position.set(target.x+Math.sin(cam.yaw)*cam.dist*Math.cos(cam.pitch),target.y+Math.sin(cam.pitch)*cam.dist,target.z+Math.cos(cam.yaw)*cam.dist*Math.cos(cam.pitch));camera.lookAt(target);
      renderer.render(scene,camera);
    }
    requestAnimationFrame(frame);
  }catch(err){console.error('[P26] камера WebGL:',err);chamber.classList.add('chamber-error');}
}
