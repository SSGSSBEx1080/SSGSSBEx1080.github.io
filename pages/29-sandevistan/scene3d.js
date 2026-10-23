/* The arena is illustrative. The 100 captured poses, .6-block back offset,
 * 1.05 scale, cyan->yellow RGB/alpha and four-per-tick fade follow ClientHandler.
 * Six instanced meshes render up to 200 afterimages without hundreds of draw calls. */
import * as T from '../../shared/vendor/three/three.module.js';
const host=document.querySelector('#arena'),canvas=document.querySelector('#arena3d');
try{
 if(!document.createElement('canvas').getContext('webgl2'))throw Error('WebGL2 unavailable');
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.3));renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();scene.background=new T.Color(0x07111b);scene.fog=new T.FogExp2(0x07111b,.017);const camera=new T.PerspectiveCamera(48,1,.08,180);
 scene.add(new T.HemisphereLight(0xb5f3e0,0x183448,2));const sun=new T.DirectionalLight(0xe4f6b3,2);sun.position.set(-6,12,8);scene.add(sun);
 const loader=new T.TextureLoader();function tex(url){const t=loader.load(url);t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;t.minFilter=T.NearestMipmapNearestFilter;return t;}
 const playerTex=tex('../../assets/textures/mc/p2/entity_steve.png'),mobTex=tex('../../assets/textures/mc/p2/entity_zombie_zombie.png');
 const playerMat=new T.MeshLambertMaterial({map:playerTex,alphaTest:.15}),mobMat=new T.MeshLambertMaterial({map:mobTex,alphaTest:.15});
 const floor=new T.Mesh(new T.PlaneGeometry(90,90),new T.MeshLambertMaterial({color:0x102b35}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;scene.add(floor);
 const grid=new T.GridHelper(90,45,0x3b898b,0x16424d);grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
 const yellowMat=new T.MeshBasicMaterial({color:0xe8ee3e}),cyanMat=new T.MeshBasicMaterial({color:0x35cdbc}),buildingMat=new T.MeshLambertMaterial({color:0x0b1928});
 for(let i=0;i<28;i++){const h=4+(i*17%11),side=i%2?1:-1,x=side*(26+i%4*4),z=-45+i*3.8;const b=new T.Mesh(new T.BoxGeometry(3.1,h,3.5),buildingMat);b.position.set(x,h/2,z);scene.add(b);if(i%3===0){const stripe=new T.Mesh(new T.BoxGeometry(.05,h*.7,.1),i%2?cyanMat:yellowMat);stripe.position.set(x-side*1.57,h*.53,z-1.8);scene.add(stripe);}}
 const zone=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(40.6,.04,40.6)),new T.LineBasicMaterial({color:0x45e6d3,transparent:true,opacity:.42}));zone.position.y=.02;scene.add(zone);
 const defs=[{name:'body',size:[8,12,4],origin:[-4,12,-2],pivot:[0,0,0],uv:[16,16]},{name:'head',size:[8,8,8],origin:[-4,0,-4],pivot:[0,24,0],uv:[0,0]},
  {name:'rightArm',size:[4,12,4],origin:[-2,-11,-2],pivot:[-6,23,0],uv:[40,16]},{name:'leftArm',size:[4,12,4],origin:[-2,-11,-2],pivot:[6,23,0],uv:[32,48]},
  {name:'rightLeg',size:[4,12,4],origin:[-2,-12,-2],pivot:[-2,12,0],uv:[0,16]},{name:'leftLeg',size:[4,12,4],origin:[-2,-12,-2],pivot:[2,12,0],uv:[16,48]}];
 const order=['east','west','up','down','south','north'];
 function geometry(d,legacy=false){const [w,h,z]=d.size,[u,v]=legacy&&d.name==='leftArm'?[40,16]:legacy&&d.name==='leftLeg'?[0,16]:d.uv;
  const rect={east:[u,v+z,u+z,v+z+h],north:[u+z,v+z,u+z+w,v+z+h],west:[u+z+w,v+z,u+2*z+w,v+z+h],south:[u+2*z+w,v+z,u+2*z+2*w,v+z+h],up:[u+z,v,u+z+w,v+z],down:[u+z+w,v+z,u+z+2*w,v]};
  const g=new T.BoxGeometry(w/16,h/16,z/16),uv=g.attributes.uv;for(let f=0;f<6;f++){const r=rect[order[f]];for(let i=f*4;i<f*4+4;i++)uv.setXY(i,(r[0]+uv.getX(i)*(r[2]-r[0]))/64,1-(r[3]-uv.getY(i)*(r[3]-r[1]))/64);}g.translate(...d.origin.map((x,i)=>(x+d.size[i]/2)/16));return g;
 }
 const geos=defs.map(d=>geometry(d)),legacyGeos=defs.map(d=>geometry(d,true));
 function humanoid(mat,legacy=false){const root=new T.Group(),parts=[];for(let i=0;i<defs.length;i++){const pivot=new T.Group();pivot.position.set(...defs[i].pivot.map(x=>x/16));const mesh=new T.Mesh((legacy?legacyGeos:geos)[i],mat);pivot.add(mesh);root.add(pivot);parts.push(pivot);}root.scale.setScalar(.9);scene.add(root);return{root,parts};}
 function pose(parts,swing,amount,zombie=false){const a=Math.cos(swing*.6662)*amount;parts[2].rotation.x=zombie?1.35:-a;parts[3].rotation.x=zombie?1.35:a;parts[4].rotation.x=a*1.4;parts[5].rotation.x=-a*1.4;}
 const live=humanoid(playerMat),mob=humanoid(mobMat,true),peer=humanoid(playerMat),corner=humanoid(mobMat,true),rigs=[mob,peer,corner];
 // A faithful translucent skin, not a replacement silhouette texture.
 const ghostMat=new T.MeshBasicMaterial({map:playerTex,transparent:true,depthWrite:false,alphaTest:.02});ghostMat.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float trailAlpha; varying float vTrailAlpha;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTrailAlpha=trailAlpha;');
  shader.fragmentShader='varying float vTrailAlpha;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vTrailAlpha;');
 };
 const alpha=new T.InstancedBufferAttribute(new Float32Array(200),1),ghosts=geos.map(g=>{const geo=g.clone();geo.setAttribute('trailAlpha',alpha);const mesh=new T.InstancedMesh(geo,ghostMat,200);mesh.count=0;mesh.frustumCulled=false;scene.add(mesh);return mesh;});
 const cube=(color,size)=>new T.Mesh(new T.BoxGeometry(...size),new T.MeshLambertMaterial({color}));
 const tnt=cube(0xb64f4f,[.65,.65,.65]);scene.add(tnt);const tntLabel=new T.Sprite(new T.SpriteMaterial({color:0xffd96a}));tntLabel.scale.set(.12,.12,1);tnt.add(tntLabel);tntLabel.position.y=.42;
 const arrow=new T.Group();arrow.add(cube(0x938865,[.8,.035,.035]));const tip=cube(0xd4e7d2,[.16,.1,.1]);tip.position.x=.38;arrow.add(tip);scene.add(arrow);
 const spine=new T.Group();for(let i=0;i<4;i++){const b=cube(0x45524a,[.16,.12,.08]);b.position.set(0,.86+i*.14,.15);spine.add(b);const led=new T.Mesh(new T.BoxGeometry(.06,.045,.01),new T.MeshBasicMaterial({color:0x8dfb50}));led.position.set(0,.87+i*.14,.197);spine.add(led);}live.root.add(spine);
 const matrix=new T.Matrix4(),rotation=new T.Matrix4(),translation=new T.Matrix4(),scale=new T.Matrix4(),limb=new T.Matrix4(),pivot=new T.Matrix4(),color=new T.Color();
 const label=document.createElement('div');label.className='world-target-label';host.append(label);
 let seen=false,last=0;new IntersectionObserver(es=>seen=es[0].isIntersecting,{rootMargin:'80px'}).observe(host);
 const target=new T.Vector3(),eye=new T.Vector3();let cameraStarted=false;
 function frame(now){requestAnimationFrame(frame);if(!seen||document.hidden||now-last<40)return;last=now;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
  const d=Math.min(devicePixelRatio||1,1.3);if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const s=P29.model.state,p=s.player,theta=p.yaw*Math.PI/180,rootAngle=Math.PI-theta,forward=new T.Vector3(-Math.sin(theta),0,Math.cos(theta));
  live.root.visible=s.alive;live.root.position.set(p.x,p.y,p.z);live.root.rotation.y=rootAngle;spine.visible=s.chest==='sandevistan';pose(live.parts,s.t*.3,Math.min(1,(p.speed||0)*3));
  const center=new T.Vector3(p.x,p.y+1.0,p.z).addScaledVector(forward,2),wanted=new T.Vector3(p.x,p.y+6.4,p.z).addScaledVector(forward,-10.5);wanted.x+=5;
  if(!cameraStarted){target.copy(center);eye.copy(wanted);cameraStarted=true;}target.lerp(center,.18);eye.lerp(wanted,.12);camera.position.copy(eye);camera.lookAt(target);
  zone.visible=s.accelerating;zone.position.x=p.x;zone.position.z=p.z;
  s.targets.forEach((e,i)=>{const r=rigs[i];r.root.visible=e.alive;r.root.position.set(e.x,e.y,e.z);const yaw=Math.atan2(-e.vx,e.vz);r.root.rotation.y=Math.PI-yaw;pose(r.parts,(e.freeze?e.poseTick:s.t)*.3,.15,e.kind==='mob');});
  tnt.visible=!!s.tnt?.alive;if(s.tnt){tnt.position.set(s.tnt.x,.33,s.tnt.z);tntLabel.material.color.setHex(s.tnt.freeze?0x39e9da:0xffd96a);}arrow.visible=!!s.arrow?.alive;if(s.arrow)arrow.position.set(s.arrow.x,s.arrow.y,s.arrow.z);
  let count=0;for(const list of[s.trail,s.peerTrail||[]]){for(let i=0;i<list.length&&count<200;i++,count++){const image=list[i],progress=i/list.length,fade=s.accelerating&&list===s.trail||s.targets[1].active>0&&list===s.peerTrail?1:list.length/100;
    alpha.setX(count,progress*.5*fade);color.setRGB(progress,1,1-progress,T.LinearSRGBColorSpace);
    translation.makeTranslation(image.x,image.y,image.z);rotation.makeRotationY(Math.PI-image.yaw*Math.PI/180);scale.makeScale(.945,.945,.945);const base=translation.clone().multiply(rotation).multiply(scale),a=Math.cos(image.swing*.6662)*image.amount;
    const angles=[0,0,-a,a,a*1.4,-a*1.4];for(let k=0;k<defs.length;k++){pivot.makeTranslation(...defs[k].pivot.map(x=>x/16));limb.makeRotationX(angles[k]);matrix.copy(base).multiply(pivot).multiply(limb);ghosts[k].setMatrixAt(count,matrix);ghosts[k].setColorAt(count,color);}
   }}
  alpha.needsUpdate=true;for(const mesh of ghosts){mesh.count=P29.motion?count:0;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  const e=s.targets[0],pos=new T.Vector3(e.x,e.y+2.3,e.z).project(camera);label.hidden=!e.alive||Math.abs(pos.x)>1.1||Math.abs(pos.y)>1.1;label.style.left=(pos.x*.5+.5)*w+'px';label.style.top=(-pos.y*.5+.5)*h+'px';label.textContent=e.freeze?'FROZEN / '+s.targetHP.toFixed(1)+' HP':'TARGET / '+s.targetHP.toFixed(1)+' HP';
  renderer.render(scene,camera);
 }
 host.dataset.renderer='three';P29.scene={event:()=>{},reset:()=>cameraStarted=false,get stats(){return{renderer:'three',ghosts:ghosts[0].count,instanceMeshes:ghosts.length,captureLimit:100,offset:.6,scale:1.05};}};requestAnimationFrame(frame);
}catch(error){host.dataset.renderer='fallback';console.warn('Sandevistan uses the same 2D stand:',error.message);}
