/* Spatial illustration of the source sphere. Exactly 48×32 segments, the native
 * medusa_wave.png, RGB(125,238,190), alpha 170 and both sides, as in Java.
 * The small vanilla-style specimen rigs/terrain are the wiki's diagnostic stand. */
const THREE = window.THREE;
const host=document.querySelector('#worldViewport'),cv=document.querySelector('#world3d');
try{
 if(!document.createElement('canvas').getContext('webgl2'))throw Error('WebGL2 unavailable');
 const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x101d17);scene.fog=new THREE.FogExp2(0x101d17,.012);
 const camera=new THREE.PerspectiveCamera(42,1,.08,1800),loader=new THREE.TextureLoader();
 const texture=(url,pixel=true)=>{const t=loader.load(ZM.tex(url));t.colorSpace=THREE.SRGBColorSpace;t.magFilter=pixel?THREE.NearestFilter:THREE.LinearFilter;t.minFilter=pixel?THREE.NearestMipmapNearestFilter:THREE.LinearMipmapLinearFilter;return t;};
 const stoneTex=texture('../../assets/textures/p28/petrified_stone.png',false),stoneMat=new THREE.MeshLambertMaterial({map:stoneTex});
 const skin={player:texture('../../assets/textures/mc/p2/entity_steve.png'),mob:texture('../../assets/textures/mc/p2/entity_zombie_zombie.png'),zombieVillager:texture('../../assets/textures/p28/zombie_villager.png'),villager:texture('../../assets/textures/mc/p2/entity_villager_villager.png')};
 const skinMats=Object.fromEntries(Object.entries(skin).map(([key,map])=>[key,new THREE.MeshLambertMaterial({map,alphaTest:.3})]));
 const groundTex=texture('../../assets/textures/mc/stone.png');groundTex.wrapS=groundTex.wrapT=THREE.RepeatWrapping;groundTex.repeat.set(20,14);
 const groundMat=new THREE.MeshLambertMaterial({map:groundTex,color:0x7d897b}),baseMat=new THREE.MeshLambertMaterial({color:0x2b3f2e});
 const base=new THREE.Mesh(new THREE.BoxGeometry(40,.45,28),[baseMat,baseMat,groundMat,baseMat,baseMat,baseMat]);base.position.set(3,-.275,0);scene.add(base);
 const grid=new THREE.GridHelper(40,40,0x748264,0x586749);grid.position.y=.006;grid.material.transparent=true;grid.material.opacity=.18;scene.add(grid);
 scene.add(new THREE.HemisphereLight(0xd4eadc,0x30402d,1.8));const light=new THREE.DirectionalLight(0xf5f0d7,2.2);light.position.set(-9,18,-14);scene.add(light);
 const wallTex=groundTex.clone();wallTex.repeat.set(1,5);wallTex.needsUpdate=true;
 const wall=new THREE.Mesh(new THREE.BoxGeometry(.3,2.7,7),new THREE.MeshLambertMaterial({map:wallTex,color:0x74836b}));wall.position.set(2,1.35,0);scene.add(wall);
 const frame=new THREE.LineSegments(new THREE.EdgesGeometry(wall.geometry),new THREE.LineBasicMaterial({color:0x53644a}));wall.add(frame);
 const pad=new THREE.Mesh(new THREE.CircleGeometry(.65,20),new THREE.MeshBasicMaterial({color:0x07130b,transparent:true,opacity:.42,depthWrite:false}));pad.rotation.x=-Math.PI/2;
 const selection=new THREE.Mesh(new THREE.RingGeometry(.68,.72,40),new THREE.MeshBasicMaterial({color:0xa9d199,side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));selection.rotation.x=-Math.PI/2;selection.position.y=.014;scene.add(selection);
 function uvBox(w,h,d,u,v){return{east:[u,v+d,u+d,v+d+h],north:[u+d,v+d,u+d+w,v+d+h],west:[u+d+w,v+d,u+2*d+w,v+d+h],south:[u+2*d+w,v+d,u+2*d+2*w,v+d+h],up:[u+d,v,u+d+w,v+d],down:[u+d+w,v+d,u+d+2*w,v]};}
 const faces=['east','west','up','down','south','north'];
 function box(parent,origin,size,uv,mat){const geo=new THREE.BoxGeometry(...size.map(x=>x/16)),rects=uvBox(...size,...uv),a=geo.attributes.uv;
  for(let f=0;f<6;f++){const r=rects[faces[f]];for(let i=f*4;i<f*4+4;i++){const x=a.getX(i),y=a.getY(i);a.setXY(i,(r[0]+x*(r[2]-r[0]))/64,1-(r[3]-y*(r[3]-r[1]))/64);}}a.needsUpdate=true;
  const mesh=new THREE.Mesh(geo,mat);mesh.position.set(...origin.map((x,i)=>(x+size[i]/2)/16));parent.add(mesh);return mesh;}
 const labelLayer=document.createElement('div');labelLayer.className='world-labels';host.append(labelLayer);const rigs=new Map();
 function rig(e){const root=new THREE.Group(),material=skinMats[e.kind]||skinMats.mob,parts=[],groups={};
  const villager=e.kind==='villager';
  const npc=e.kind!=='player',tallHead=e.kind==='villager'||e.kind==='zombieVillager';
  const torso=box(root,[-4,12,-2],[8,12,4],villager?[16,20]:[16,16],material);parts.push(torso);
  // NPC arms point along +Z in this stand's Y-up rig. Rotate the complete
  // head (nose included), not its image/UV, by PI to match that direction.
  const head=new THREE.Group();head.position.set(0,24/16,0);head.rotation.y=npc?Math.PI:0;root.add(head);groups.head=head;
  parts.push(box(head,[-4,0,-4],[8,tallHead?10:8,8],[0,0],material));
  if(tallHead)parts.push(box(head,[-1,0,-6],[2,4,2],[24,0],material));
  if(npc)torso.rotation.y=Math.PI;
  for(const [name,x,uv]of[['rightArm',-6,[40,16]],['leftArm',6,e.kind==='player'?[32,48]:[40,16]],['rightLeg',-2,[0,16]],['leftLeg',2,e.kind==='player'?[16,48]:[0,16]]]){
   const g=new THREE.Group(),arm=name.includes('Arm');g.position.set(x/16,(arm?23:12)/16,0);root.add(g);parts.push(box(g,[-2,-(arm?11:12),-2],[4,12,4],uv,material));groups[name]=g;
  }
  root.scale.setScalar((e.kind==='villager'||e.kind==='zombieVillager')?e.height/(34/16):e.height/2);root.rotation.y=.17;root.position.set(e.x,e.y,e.z);root.userData.id=e.id;scene.add(root);
  parts.forEach(p=>p.userData.id=e.id);const shadow=pad.clone();shadow.position.set(e.x,.013,e.z);scene.add(shadow);
  const tag=document.createElement('button');tag.type='button';tag.className='world-label';tag.dataset.actor=e.id;tag.textContent=e.name;tag.addEventListener('click',()=>P28.select(e.id));labelLayer.append(tag);
  return{root,groups,parts,material,shadow,tag,kind:e.kind,stone:false};
 }
 const waves=new Map(),waveGeo=new THREE.SphereGeometry(1,48,32),waveTex=texture('../../assets/textures/p28/medusa_wave.png',false);
 const waveMat=new THREE.MeshBasicMaterial({map:waveTex,color:0x7deebe,opacity:170/255,transparent:true,side:THREE.DoubleSide,depthWrite:false,fog:false});
 const item=new THREE.Sprite(new THREE.SpriteMaterial({map:texture('../../assets/textures/p28/medusa.png',false),alphaTest:.1}));item.scale.set(.67,.67,1);scene.add(item);
 const motes=[],pointMat=new THREE.PointsMaterial({color:0xa7e7b2,size:.11,transparent:true,opacity:.8,depthWrite:false});
 function particles(count=24){const e=P28.model.owner,points=[];for(let i=0;i<count;i++)points.push(e.x+(Math.random()-.5)*1.8,e.y+Math.random()*2+.3,e.z+(Math.random()-.5)*1.8);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));const object=new THREE.Points(geometry,pointMat);scene.add(object);motes.push({object,life:1});}
 let yaw=3.62,pitch=.61,distance=31,drag=null,seen=false,last=0;const target=new THREE.Vector3(3,.7,0);
 const resetCamera=()=>{yaw=3.62;pitch=.61;distance=31;target.set(3,.7,0);};
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw,pitch};cv.setPointerCapture(e.pointerId);});
 cv.addEventListener('pointermove',e=>{if(!drag)return;yaw=drag.yaw-(e.clientX-drag.x)*.007;pitch=Math.max(.18,Math.min(1.2,drag.pitch+(e.clientY-drag.y)*.004));});
 cv.addEventListener('pointerup',e=>{if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6){const r=cv.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects([...rigs.values()].flatMap(r=>r.parts))[0];if(hit)P28.select(hit.object.userData.id);}drag=null;});
 cv.addEventListener('pointercancel',()=>drag=null);cv.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(15,Math.min(65,distance+e.deltaY*.02));},{passive:false});
 cv.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();yaw+=e.key==='ArrowLeft' ? .15 : -.15;}if(e.key==='Home'){e.preventDefault();resetCamera();}});
 new IntersectionObserver(es=>seen=es[0].isIntersecting,{rootMargin:'100px'}).observe(host);
 const setRigType=(id,r)=>{scene.remove(r.root,r.shadow);r.root.traverse(x=>x.geometry?.dispose());r.tag.remove();rigs.delete(id);};
 let old=performance.now();
 function frameLoop(now){requestAnimationFrame(frameLoop);if(!seen||document.hidden||now-last<40)return;const dt=Math.min(.1,(now-old)/1000);old=now;last=now;
  const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;const dpr=Math.min(devicePixelRatio||1,1.5);if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const dist=distance*Math.max(1,1.1/camera.aspect);camera.position.set(target.x+Math.sin(yaw)*dist*Math.cos(pitch),target.y+Math.sin(pitch)*dist,target.z+Math.cos(yaw)*dist*Math.cos(pitch));camera.lookAt(target);
  const state=P28.model.state;
  for(const e of state.entities){let r=rigs.get(e.id);if(r&&r.kind!==e.kind){setRigType(e.id,r);r=null;}if(!r){r=rig(e);rigs.set(e.id,r);}
   r.root.visible=e.alive;r.shadow.visible=e.alive;r.root.position.set(e.x,e.y,e.z);r.shadow.position.set(e.x,.013,e.z);
   const phase=e.stone?e.lockWalk:e.walk,walk=Math.sin(phase)*.22;
   r.groups.rightLeg.rotation.x=walk;r.groups.leftLeg.rotation.x=-walk;
   r.groups.rightArm.rotation.x=e.kind==='player'?-walk:e.kind==='villager'?-.9:-1.35+walk*.2;r.groups.leftArm.rotation.x=e.kind==='player'?walk:e.kind==='villager'?-.9:-1.35-walk*.2;
   if(e.stone!==r.stone){r.stone=e.stone;r.parts.forEach(p=>p.material=e.stone?stoneMat:r.material);}
   r.tag.textContent=e.name;r.tag.classList.toggle('stone',e.stone);r.tag.classList.toggle('selected',e.id===P28.selected);
   const p=new THREE.Vector3(e.x,e.y+e.height+.65,e.z).project(camera);r.tag.hidden=!e.alive||p.z>1||Math.abs(p.x)>1.1||Math.abs(p.y)>1.1;r.tag.style.left=(p.x*.5+.5)*w+'px';r.tag.style.top=(-p.y*.5+.5)*h+'px';
   if(e.id===P28.selected){selection.visible=e.alive;selection.position.set(e.x,.016,e.z);}
  }
  const keys=new Set(state.waves.map(w=>w.start+':'+w.radius));
  for(const[key,m]of waves)if(!keys.has(key)){scene.remove(m);waves.delete(key);}
  for(const wave of state.waves){const key=wave.start+':'+wave.radius;let m=waves.get(key);if(!m){m=new THREE.Mesh(waveGeo,waveMat);scene.add(m);waves.set(key,m);}m.position.set(wave.x,wave.y,wave.z);m.scale.setScalar(Math.max(.001,wave.current||.001));}
  const o=state.orb;item.visible=!!o||state.item.owned&&P28.model.owner.alive;
  if(o){item.position.set(o.x,o.y+.28,o.z);item.material.rotation=o.age*.13*o.spin;item.material.color.setHex(o.charged?0xffffff:0x7e8d7b);}else{item.position.set(P28.model.owner.x+.5,P28.model.owner.y+1.15,P28.model.owner.z-.3);item.material.rotation=-.2;item.material.color.setHex(state.item.charged?0xffffff:0x7e8d7b);}
  for(let i=motes.length-1;i>=0;i--){const p=motes[i];p.life-=dt;const a=p.object.geometry.attributes.position;for(let k=0;k<a.count;k++)a.setY(k,a.getY(k)+dt*.45);a.needsUpdate=true;if(p.life<=0){scene.remove(p.object);p.object.geometry.dispose();motes.splice(i,1);}}
  renderer.render(scene,camera);
 }
 host.dataset.renderer='three';document.querySelector('#cameraReset').hidden=false;document.querySelector('#worldCaption').textContent='Оригинальная текстура сферы · перетащи для обзора';P28.scene={resetCamera,reset:()=>{resetCamera();},reward:key=>particles(key.startsWith('05')?72:key.startsWith('03')?48:24),event:()=>{},get stats(){return{sphereSegments:[48,32],nativeAlpha:170,nativeColor:[125,238,190],actors:rigs.size,waves:waves.size,heads:Object.fromEntries([...rigs].map(([id,r])=>[id,r.groups.head.rotation.y]))};}};
 requestAnimationFrame(frameLoop);
}catch(error){host.dataset.renderer='fallback';console.warn('Medusa uses its playable 2D cross-section:',error.message);}
