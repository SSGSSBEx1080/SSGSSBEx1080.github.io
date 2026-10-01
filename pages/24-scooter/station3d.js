/* №24 · scooter_station.nbt: EVERY non-air block rendered with its exact palette state.
   Vanilla block/lantern/sign textures: official Minecraft 1.19.2; charging_port_*: user's mod.
   Roof, stairs (including outer corners), walls, bars, signs and hanging lantern are 3D.
   Only the small pedestal and atmospheric particles are presentation, not part of the NBT. */
import * as THREE from '../../shared/vendor/three/three.module.js';

const host=document.querySelector('#stationView'),canvas=document.querySelector('#station3d');
if(host&&canvas&&window.ZM?.P24ST){
 try{
  const source=ZM.P24ST,root='../../assets/textures/p24/station/';
  const loader=new THREE.TextureLoader();
  function texture(file){const t=loader.load(root+file+'.png');t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestMipmapNearestFilter;return t;}
  const materials={};
  for(const name of ['cobblestone','polished_andesite','iron_block','tuff','light_gray_concrete','stone_bricks','polished_diorite','iron_bars','oak_planks']){
   materials[name]=new THREE.MeshStandardMaterial({map:texture(name),roughness:1,metalness:0,side:name==='iron_bars'?THREE.DoubleSide:THREE.FrontSide,alphaTest:name==='iron_bars'?.45:0});
  }
  const S={cobblestone:materials.cobblestone,polished_andesite:materials.polished_andesite,iron_block:materials.iron_block,tuff:materials.tuff,light_gray_concrete:materials.light_gray_concrete,stone_brick_stairs:materials.stone_bricks,cobblestone_stairs:materials.cobblestone,polished_diorite_stairs:materials.polished_diorite,diorite_wall:materials.polished_diorite,stone_brick_wall:materials.stone_bricks,stone_brick_slab:materials.stone_bricks,iron_bars:materials.iron_bars};
  const modTexture=name=>{const t=loader.load('../../assets/textures/p24/charging_port_'+name+'.png');t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;return t;};
  const portMat={side:new THREE.MeshStandardMaterial({map:modTexture('side'),roughness:.78}),front:new THREE.MeshStandardMaterial({map:modTexture('front'),roughness:.78}),top:new THREE.MeshStandardMaterial({map:modTexture('top'),roughness:.78}),bottom:new THREE.MeshStandardMaterial({map:modTexture('bottom'),roughness:.78})};
  // THREE.BoxGeometry face order is +x, -x, +y, -y, +z, -z. Minecraft east = +x.
  const portFaces={east:[portMat.front,portMat.side,portMat.top,portMat.bottom,portMat.side,portMat.side],west:[portMat.side,portMat.front,portMat.top,portMat.bottom,portMat.side,portMat.side],south:[portMat.side,portMat.side,portMat.top,portMat.bottom,portMat.front,portMat.side],north:[portMat.side,portMat.side,portMat.top,portMat.bottom,portMat.side,portMat.front]};
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x101e21);scene.fog=new THREE.FogExp2(0x101e21,.013);
  const camera=new THREE.PerspectiveCamera(38,1,.08,130);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene.add(new THREE.HemisphereLight(0xcce3e0,0x405159,2.1));
  const sun=new THREE.DirectionalLight(0xffe9cb,2.45);sun.position.set(6,12,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.normalBias=.035;scene.add(sun);
  const fill=new THREE.DirectionalLight(0x68d9c6,.52);fill.position.set(-7,4,-5);scene.add(fill);
  const lanternLight=new THREE.PointLight(0xffb359,7,8,2);lanternLight.position.set(2.5,3.38,-3);scene.add(lanternLight);
  // Presentation base only: exact NBT starts at y = 0. The official tuff tile repeats once per block.
  const floorTex=texture('tuff');floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(12,13);
  const floorMat=new THREE.MeshStandardMaterial({map:floorTex,roughness:1});
  const base=new THREE.Mesh(new THREE.BoxGeometry(12,.5,13),[materials.cobblestone,materials.cobblestone,floorMat,materials.cobblestone,materials.cobblestone,materials.cobblestone]);base.position.y=-.37;base.receiveShadow=true;scene.add(base);
  const grid=new THREE.GridHelper(90,90,0x2e6562,0x244146);grid.position.y=-.107;grid.material.transparent=true;grid.material.opacity=.24;scene.add(grid);
  const cached=new Map(),instanced=new Map(),ports=[],signBoards=[];
  function form(bounds){const key=bounds.join('/');if(cached.has(key))return cached.get(key);
   const [x0,y0,z0,x1,y1,z1]=bounds;
   const geo=new THREE.BoxGeometry(x1-x0,y1-y0,z1-z0);
   const p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv;
   const cx=(x0+x1)/2,cy=(y0+y1)/2,cz=(z0+z1)/2;
   for(let k=0;k<p.count;k++){
    const x=p.getX(k)+cx,y=p.getY(k)+cy,z=p.getZ(k)+cz;
    const nx=n.getX(k),ny=n.getY(k),nz=n.getZ(k);
    // Map every partial block to its coordinates on a 16×16 Minecraft block face.
    // This keeps brick size consistent on half-slabs, staircase risers and narrow wall arms.
    let u,v;
    if(nx>.5){u=1-z;v=y;}else if(nx<-.5){u=z;v=y;}
    else if(nz>.5){u=x;v=y;}else if(nz<-.5){u=1-x;v=y;}
    else if(ny>.5){u=x;v=1-z;}else{u=x;v=z;}
    uv.setXY(k,u,v);
   }
   uv.needsUpdate=true;cached.set(key,geo);return geo;
  }
  function addPart(name,x,y,z,bounds){const key=name+':'+bounds.join('/');if(!instanced.has(key))instanced.set(key,{geo:form(bounds),mat:S[name]||materials.cobblestone,positions:[],name});
   const [x0,y0,z0,x1,y1,z1]=bounds;
   instanced.get(key).positions.push([x-4.5+(x0+x1)/2-.5,y+(y0+y1)/2,z-5+(z0+z1)/2-.5]);
  }
  function stairs(name,x,y,z,p){addPart(name,x,y,z,[0,0,0,1,.5,1]);
   const dir=p.facing||'east',shape=p.shape||'straight';let X=[0,1],Z=[0,1];
   if(dir==='east')X=[.5,1];else if(dir==='west')X=[0,.5];else if(dir==='north')Z=[0,.5];else Z=[.5,1];
   // Outer corners have only ONE raised quarter, on the state's left or right.
   if(shape.startsWith('outer_')){
    const left=shape==='outer_left';
    if(dir==='east')Z=left?[0,.5]:[.5,1];
    if(dir==='west')Z=left?[.5,1]:[0,.5];
    if(dir==='north')X=left?[0,.5]:[.5,1];
    if(dir==='south')X=left?[.5,1]:[0,.5];
   }
   addPart(name,x,y,z,[X[0],.5,Z[0],X[1],1,Z[1]]);
   if(shape.startsWith('inner_')){const left=shape==='inner_left';
    if(dir==='east'||dir==='west')addPart(name,x,y,z,[dir==='east'?0:.5,.5,(left===(dir==='east'))?0:.5,dir==='east'?.5:1,1,(left===(dir==='east'))?.5:1]);
    else addPart(name,x,y,z,[(left===(dir==='north'))?0:.5,.5,dir==='north'?.5:0,(left===(dir==='north'))?.5:1,1,dir==='north'?1:.5]);
   }
  }
  function wall(name,x,y,z,p){addPart(name,x,y,z,[.25,0,.25,.75,1,.75]);
   const h=d=>p[d]==='tall'?1:.875;
   if(p.north&&p.north!=='none')addPart(name,x,y,z,[.3125,0,0,.6875,h('north'),.25]);
   if(p.south&&p.south!=='none')addPart(name,x,y,z,[.3125,0,.75,.6875,h('south'),1]);
   if(p.east&&p.east!=='none')addPart(name,x,y,z,[.75,0,.3125,1,h('east'),.6875]);
   if(p.west&&p.west!=='none')addPart(name,x,y,z,[0,0,.3125,.25,h('west'),.6875]);
  }
  function bars(x,y,z,p){const n='iron_bars';addPart(n,x,y,z,[.4375,0,.4375,.5625,1,.5625]);
   if(p.north==='true')addPart(n,x,y,z,[.4375,0,0,.5625,1,.5]);
   if(p.south==='true')addPart(n,x,y,z,[.4375,0,.5,.5625,1,1]);
   if(p.east==='true')addPart(n,x,y,z,[.5,0,.4375,1,1,.5625]);
   if(p.west==='true')addPart(n,x,y,z,[0,0,.4375,.5,1,.5625]);
  }
  function makeSign(x,y,z,lines){const group=new THREE.Group();group.position.set(x-4.5+.44,y+.55,z-5);
   const board=new THREE.Mesh(new THREE.BoxGeometry(.105,.5,.99),materials.oak_planks);board.castShadow=true;group.add(board);
   const mount=new THREE.Mesh(new THREE.BoxGeometry(.22,.09,.19),materials.oak_planks);mount.position.x=-.16;group.add(mount);
   // Sign texture comes from Minecraft's entity/signs/oak.png; the two lines are
   // copied verbatim from the two NBT block entities, NOT decorative text.
   const face=document.createElement('canvas');face.width=384;face.height=192;const ctx=face.getContext('2d');ctx.fillStyle='#ad8650';ctx.fillRect(0,0,384,192);
   const signTex=new THREE.CanvasTexture(face);signTex.colorSpace=THREE.SRGBColorSpace;signTex.magFilter=THREE.NearestFilter;
   const plaque=new THREE.Mesh(new THREE.PlaneGeometry(.97,.47),new THREE.MeshBasicMaterial({map:signTex,side:THREE.DoubleSide}));plaque.rotation.y=Math.PI/2;plaque.position.x=.056;group.add(plaque);
   const image=new Image();image.onload=()=>{ctx.imageSmoothingEnabled=false;ctx.drawImage(image,2,2,24,12,0,0,384,192);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#242016';ctx.shadowColor='#ead3a6';ctx.shadowBlur=2;
    for(const [i,text] of lines.filter(Boolean).entries()){let fs=i?65:53;ctx.font=`900 ${fs}px Arial,sans-serif`;while(ctx.measureText(text).width>340){fs-=2;ctx.font=`900 ${fs}px Arial,sans-serif`;}
     ctx.fillText(text,192,i?138:67);}
    signTex.needsUpdate=true;};image.src=root+'oak_sign.png';
   scene.add(group);signBoards.push(group);
  }
  function lampFace(geo,face,rect){const uv=geo.attributes.uv;for(let i=face*4;i<(face+1)*4;i++){
   const u=uv.getX(i),v=uv.getY(i);uv.setXY(i,(rect[0]+u*(rect[2]-rect[0]))/16,1-(rect[3]-v*(rect[3]-rect[1]))/16);
  }uv.needsUpdate=true;}
  function makeLantern(x,y,z){const center=new THREE.Group();center.position.set(x-4.5,y,z-5);
   const lampTex=texture('lantern');const glowMat=new THREE.MeshStandardMaterial({map:lampTex,emissiveMap:lampTex,emissive:0xffb66a,emissiveIntensity:.45,roughness:.85,alphaTest:.25,side:THREE.DoubleSide});
   function el(from,to,side,up){const g=new THREE.BoxGeometry((to[0]-from[0])/16,(to[1]-from[1])/16,(to[2]-from[2])/16);
    for(let f=0;f<6;f++)lampFace(g,f,f===2||f===3?up:side);
    const m=new THREE.Mesh(g,glowMat);m.position.set((from[0]+to[0])/32-.5,(from[1]+to[1])/32,(from[2]+to[2])/32-.5);center.add(m);m.castShadow=true;return m;}
   // Exact element bounds/UV from Minecraft 1.19.2 block/template_hanging_lantern.json.
   el([5,1,5],[11,8,11],[0,2,6,9],[0,9,6,15]);
   el([6,8,6],[10,10,10],[1,0,5,2],[1,10,5,14]);
   function chain(w,h,rect,angle){const g=new THREE.PlaneGeometry(w,h);const a=g.attributes.uv;for(let i=0;i<a.count;i++)a.setXY(i,(rect[0]+a.getX(i)*(rect[2]-rect[0]))/16,1-(rect[3]-a.getY(i)*(rect[3]-rect[1]))/16);
    const m=new THREE.Mesh(g,glowMat);m.rotation.y=angle;m.position.y=.805;center.add(m);}
   chain(.1875,.25,[11,1,14,5],Math.PI/4);chain(.1875,.375,[11,6,14,12],-Math.PI/4);
   scene.add(center);
   // A modest halo keeps the lantern visible at default orbit distance.
   const halo=new THREE.Mesh(new THREE.SphereGeometry(.33,12,8),new THREE.MeshBasicMaterial({color:0xffca78,transparent:true,opacity:.13,depthWrite:false}));halo.position.set(x-4.5,y+.35,z-5);scene.add(halo);
  }
  for(const [x,y,z,state] of source.blocks){const {name:full,props:p}=source.palette[state],n=full.split(':')[1];
   if(n==='charging_port'){
    const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),portFaces[p.facing]||portFaces.east);
    m.position.set(x-4.5,y+.5,z-5);m.castShadow=true;m.receiveShadow=true;m.userData.port=ports.length;scene.add(m);ports.push(m);
   }else if(n.endsWith('_stairs'))stairs(n,x,y,z,p);
   else if(n.endsWith('_wall'))wall(n,x,y,z,p);
   else if(n==='stone_brick_slab')addPart(n,x,y,z,p.type==='top'?[0,.5,0,1,1,1]:[0,0,0,1,.5,1]);
   else if(n==='iron_bars')bars(x,y,z,p);
   else if(n==='oak_wall_sign'){const sign=source.signs.find(s=>s.pos[0]===x&&s.pos[1]===y&&s.pos[2]===z);makeSign(x,y,z,sign?.lines||[]);}
   else if(n==='lantern')makeLantern(x,y,z);
   else addPart(n,x,y,z,[0,0,0,1,1,1]);
  }
  const dummy=new THREE.Object3D();
  for(const {geo,mat,positions,name} of instanced.values()){
   const mesh=new THREE.InstancedMesh(geo,mat,positions.length);
   positions.forEach(([x,y,z],i)=>{dummy.position.set(x,y,z);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
   mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=name!=='iron_bars';mesh.receiveShadow=true;scene.add(mesh);
  }
  // Subtle electric dust, not part of the NBT building.
  const stars=[];for(let i=0;i<32;i++)stars.push((Math.sin(i*121.1)*56)%15,(i*5.93)%7+.3,(Math.sin(i*41.4)*64)%16);
  const dustG=new THREE.BufferGeometry();dustG.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));
  const dust=new THREE.Points(dustG,new THREE.PointsMaterial({color:0x96d9bb,size:.055,transparent:true,opacity:.35,depthWrite:false}));scene.add(dust);
  const selected=new THREE.BoxHelper(ports[0],0x9affc9);selected.material.transparent=true;scene.add(selected);
  let chosen=0;
  function pick(i){chosen=Math.max(0,Math.min(ports.length-1,i));selected.setFromObject(ports[chosen]);window.dispatchEvent(new CustomEvent('p24-port',{detail:chosen}));}
  window.P24Station={select:pick,count:ports.length,blocks:source.blocks.length,signs:source.signs.length};
  const original={target:new THREE.Vector3(0,2.35,0),yaw:1.22,pitch:.34,dist:19.8};
  const cam={target:original.target.clone(),yaw:original.yaw,pitch:original.pitch,dist:original.dist};
  let focus=null,drag=null,lastTouch=0,visible=true;
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function goto(target,yaw,pitch,dist,label){focus={target:new THREE.Vector3(...target),yaw,pitch,dist};lastTouch=performance.now();
   const msg=document.querySelector('#stationFocus');if(msg)msg.textContent=label;}
  const reset=()=>{goto([0,2.35,0],1.22,.34,19.8,'СТАНЦИЯ · 198 БЛОКОВ / 3 ПОРТА / 2 ТАБЛИЧКИ / 1 ФОНАРЬ');};
  document.querySelector('#stationReset')?.addEventListener('click',reset);
  document.querySelector('#stationSign')?.addEventListener('click',()=>goto([-2,2.52,-3],Math.PI/2,.13,1.95,'ТАБЛИЧКА · «БЕНЗИНА НЕТ!» / ПОВЕРНИ ДЛЯ ВЫХОДА'));
  document.querySelector('#stationLamp')?.addEventListener('click',()=>goto([2.5,3.42,-3],1.1,.16,4.8,'ПОДВЕСНОЙ ФОНАРЬ · МОДЕЛЬ И АТЛАС MINECRAFT 1.19.2'));
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw:cam.yaw,pitch:cam.pitch};focus=null;lastTouch=performance.now();canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;cam.yaw=drag.yaw+(e.clientX-drag.x)*.006;cam.pitch=Math.max(-.07,Math.min(1.3,drag.pitch+(e.clientY-drag.y)*.005));});
  canvas.addEventListener('pointerup',e=>{if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<7){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(ports)[0];if(hit)pick(hit.object.userData.port);}drag=null;lastTouch=performance.now()});
  canvas.addEventListener('pointercancel',()=>{drag=null});
  canvas.addEventListener('wheel',e=>{e.preventDefault();focus=null;cam.dist=Math.max(1.25,Math.min(36,cam.dist+e.deltaY*.012));lastTouch=performance.now()},{passive:false});
  canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){focus=null;cam.yaw+=e.key==='ArrowLeft'?.2:-.2;lastTouch=performance.now();e.preventDefault();}if(e.key==='+'||e.key==='-'||e.key==='ArrowUp'||e.key==='ArrowDown'){focus=null;cam.dist=Math.max(1.25,Math.min(36,cam.dist+(e.key==='+'||e.key==='ArrowUp'?-1:1)));lastTouch=performance.now();e.preventDefault();}});
  const mq=matchMedia('(prefers-reduced-motion: reduce)');new IntersectionObserver(es=>visible=es[0].isIntersecting,{rootMargin:'180px'}).observe(host);
  let last=performance.now();
  function frame(t){requestAnimationFrame(frame);const dt=Math.min(.25,(t-last)*.001);last=t;if(!visible||document.hidden)return;
   const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
   const d=Math.min(devicePixelRatio||1,1.6);if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){renderer.setPixelRatio(d);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
   if(focus){const k=mq.matches?1:1-Math.exp(-dt*3.8);cam.target.lerp(focus.target,k);let a=focus.yaw-cam.yaw;a=Math.atan2(Math.sin(a),Math.cos(a));cam.yaw+=a*k;cam.pitch+=(focus.pitch-cam.pitch)*k;cam.dist+=(focus.dist-cam.dist)*k;}
   const a=cam.yaw+(!mq.matches&&!drag&&!focus&&t-lastTouch>1400?Math.sin(t*.00021)*.035:0);
   camera.position.set(cam.target.x+Math.sin(a)*cam.dist*Math.cos(cam.pitch),cam.target.y+Math.sin(cam.pitch)*cam.dist,cam.target.z+Math.cos(a)*cam.dist*Math.cos(cam.pitch));camera.lookAt(cam.target);
   if(!mq.matches){selected.material.opacity=.43+.42*(Math.sin(t*.004)*.5+.5);lanternLight.intensity=6.6+Math.sin(t*.007)*.55;dust.rotation.y=t*.000016;}
   renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);pick(0);
 }catch(err){console.error('Station 3D:',err);host.classList.add('station-fallback');const fail=host.querySelector('.station-fail');if(fail)fail.hidden=false;}
}
