/* №24 · Реальная структура из scooter_station.nbt: координаты и палитра data/p24_station.js.
   Оригинальные грани charging_port_* из текстур мода, остальные — ванильные текстуры сайта. */
import * as THREE from '../../shared/vendor/three/three.module.js';
const host=document.querySelector('#stationView'), canvas=document.querySelector('#station3d');
if(host && canvas && window.ZM?.P24ST){
 try{
  const root='../../assets/textures/';
  const load=new THREE.TextureLoader();
  function tex(path){const t=load.load(root+path);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestMipmapNearestFilter;return t;}
  const mat=(path,opt={})=>new THREE.MeshStandardMaterial({map:tex(path),roughness:.96,metalness:0,...opt});
  const mc=(name)=>mat('mc/p2/block_'+name+'.png');
  const M={cobblestone:mc('cobblestone'),polished_andesite:mat('p4/vanilla/andesite.png'),iron_block:mc('iron_block'),tuff:mat('p4/vanilla/tuff.png'),light_gray_concrete:new THREE.MeshStandardMaterial({color:0xa2a8a6,roughness:1}),stone_brick_stairs:mat('p3/vanilla/stone_bricks.png'),cobblestone_stairs:mc('cobblestone'),polished_diorite_stairs:mat('p4/vanilla/andesite.png'),diorite_wall:mat('p4/vanilla/andesite.png'),stone_brick_wall:mat('p3/vanilla/stone_bricks.png'),stone_brick_slab:mat('p3/vanilla/stone_bricks.png'),iron_bars:mc('iron_block'),oak_wall_sign:mc('oak_planks'),lantern:new THREE.MeshStandardMaterial({color:0xfad998,emissive:0xffa02a,emissiveIntensity:1.8})};
  const portSide=mat('p24/charging_port_side.png'),portFront=mat('p24/charging_port_front.png',{emissive:0x003528,emissiveIntensity:.13}),portTop=mat('p24/charging_port_top.png'),portBottom=mat('p24/charging_port_bottom.png');
  const portMaterials=[portFront,portSide,portTop,portBottom,portSide,portSide];
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x101b21);scene.fog=new THREE.FogExp2(0x101b21,.019);
  const camera=new THREE.PerspectiveCamera(36,1,.1,100);const target=new THREE.Vector3(0,1.4,0);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.9;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene.add(new THREE.HemisphereLight(0xd7edf0,0x465460,2.7));
  const sun=new THREE.DirectionalLight(0xffe8bf,2.9);sun.position.set(-4,13,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.normalBias=.04;scene.add(sun);
  const teal=new THREE.PointLight(0x28e6cb,15,10,2);teal.position.set(-3,2.7,0);scene.add(teal);
  const groundTex=tex('p4/vanilla/tuff.png');groundTex.wrapS=groundTex.wrapT=THREE.RepeatWrapping;groundTex.repeat.set(8,8);
  const groundMat=new THREE.MeshStandardMaterial({map:groundTex,roughness:1});
  const base=new THREE.Mesh(new THREE.BoxGeometry(17,.7,18),[M.polished_andesite,M.polished_andesite,groundMat,M.tuff,M.cobblestone,M.cobblestone]);base.position.set(0,-.47,0);base.receiveShadow=true;scene.add(base);
  const grid=new THREE.GridHelper(100,100,0x324e4d,0x223a3d);grid.position.y=-.105;grid.material.transparent=true;grid.material.opacity=.38;scene.add(grid);
  const shape=new Map();const box=(w,h,d)=>{const key=[w,h,d].join('/');if(!shape.has(key))shape.set(key,new THREE.BoxGeometry(w,h,d));return shape.get(key);};
  const structure=ZM.P24ST,ports=[],allMeshes=[];
  function block(name,x,y,z,py=.5,h=1,dx=1,dz=1){const material=name==='charging_port'?portMaterials:M[name]||M.cobblestone;
   const mesh=new THREE.Mesh(box(dx,h,dz),material);mesh.position.set(x-4.5, y+py, z-5);mesh.castShadow=y>0;mesh.receiveShadow=true;scene.add(mesh);allMeshes.push(mesh);return mesh;}
  for(const [x,y,z,i] of structure.blocks){let n=structure.palette[i].split(':')[1];if(n==='air')continue;
   if(n==='charging_port'){const mesh=block(n,x,y,z);mesh.userData.port=ports.length;ports.push(mesh);
    const glow=new THREE.PointLight(0xffe8d4,1.3,2.6);glow.position.set(x-3.85,y+.5,z-5);scene.add(glow);
   } else if(n.endsWith('_stairs')){block(n,x,y,z,.23,.46);block(n,x,y,z+.24,.69,.46,1,.5);
   }else if(n.endsWith('_slab')) block(n,x,y,z,.25,.5);
   else if(n.endsWith('_wall'))block(n,x,y,z,.5,1,.57,.57);
   else if(n==='iron_bars')block(n,x,y,z,.5,1,.17,.17);
   else if(n==='oak_wall_sign')block(n,x,y,z,.57,.5,.08,.85);
   else if(n==='lantern'){block(n,x,y,z,.34,.58,.48,.48);const l=new THREE.PointLight(0xffbc6c,4.5,7);l.position.set(x-4.5,y+.8,z-5);scene.add(l);}
   else block(n,x,y,z);
  }
  let chosen=0;
  const selected=new THREE.BoxHelper(ports[0],0x76f5da);selected.material.transparent=true;selected.material.opacity=.8;scene.add(selected);
  function pick(i){chosen=Math.max(0,Math.min(ports.length-1,i));selected.setFromObject(ports[chosen]);window.dispatchEvent(new CustomEvent('p24-port',{detail:chosen}));}
  window.P24Station={select:pick, count:ports.length, blocks:structure.blocks.length};
  let yaw=1.34,pitch=.32,distance=22,down=null,interactive=false;
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,yaw,pitch};interactive=true;canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!down)return;yaw=down.yaw+(e.clientX-down.x)*.0065;pitch=Math.max(-.06,Math.min(1.15,down.pitch+(e.clientY-down.y)*.005));});
  canvas.addEventListener('pointerup',e=>{if(!down)return;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)<7){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(ports)[0];if(hit)pick(hit.object.userData.port);}down=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(13,Math.min(34,distance+e.deltaY*.015));},{passive:false});
  canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){yaw+=e.key==='ArrowLeft'?.2:-.2;e.preventDefault();}if(e.key==='+'||e.key==='-'){distance=Math.max(13,Math.min(34,distance+(e.key==='+'?-2:2)));e.preventDefault();}});
  document.querySelector('#stationReset')?.addEventListener('click',()=>{yaw=1.34;pitch=.32;distance=22;interactive=false;});
  const mq=matchMedia('(prefers-reduced-motion: reduce)');let visible=true;
  new IntersectionObserver(e=>{visible=e[0].isIntersecting},{rootMargin:'180px'}).observe(host);
  function frame(t){requestAnimationFrame(frame);if(!visible||document.hidden)return;
   const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
   const d=Math.min(devicePixelRatio||1,1.6);if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){renderer.setPixelRatio(d);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
   const a=yaw+(!mq.matches&&!interactive?Math.sin(t*.00025)*.13:0);camera.position.set(target.x+Math.sin(a)*distance*Math.cos(pitch),target.y+Math.sin(pitch)*distance,target.z+Math.cos(a)*distance*Math.cos(pitch));camera.lookAt(target);
   if(!mq.matches){selected.material.opacity=.54+Math.sin(t*.004)*.28;teal.intensity=14+Math.sin(t*.002)*2;}
   renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);pick(0);
 }catch(e){console.error('Station 3D:',e);host.classList.add('station-fallback');host.querySelector('.station-fail').hidden=false;}
}
