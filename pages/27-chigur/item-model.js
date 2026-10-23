/* Java/Blockbench item JSON -> real meshes. No CSS-face matrices or cropped atlas
 * planes. Minecraft UVs are normalized to 16, independent of texture_size. */
import * as THREE from '../../shared/vendor/three/three.module.js';
export { THREE };
const directions=['east','west','up','down','south','north'];
export function faceUV(rect,u,v,rotation=0){
 let x=u,y=1-v;
 for(let i=0;i<((rotation/90)%4+4)%4;i++)[x,y]=[y,1-x];
 return[(rect[0]+x*(rect[2]-rect[0]))/16,1-(rect[1]+y*(rect[3]-rect[1]))/16];
}
export function elementMatrix(element){
 const r=element.rotation||{},p=(r.origin||[8,8,8]).map(x=>x/16),axis=r.axis||'y',angle=(r.angle||0)*Math.PI/180;
 const rotation=new THREE.Matrix4()[axis==='x'?'makeRotationX':axis==='z'?'makeRotationZ':'makeRotationY'](angle);
 const scale=[1,1,1];if(r.rescale){const sec=1/Math.cos(angle);for(let i=0;i<3;i++)if(i!=={x:0,y:1,z:2}[axis])scale[i]=sec;}
 // FaceBakery rescales the rotated coordinates, then translates the pivot back.
 return new THREE.Matrix4().makeTranslation(...p).multiply(new THREE.Matrix4().makeScale(...scale)).multiply(rotation).multiply(new THREE.Matrix4().makeTranslation(...p.map(x=>-x)));
}
export async function buildItem(model,textureRoot='../../assets/textures/p27/'){
 const group=new THREE.Group(),content=new THREE.Group();group.add(content);
 const loader=new THREE.TextureLoader(),textures=new Map(),materials=new Map(),faces=[];
 const resolve=id=>{let name=model.textures[id.replace(/^#/,'')];let guard=0;while(name?.startsWith('#')&&guard++<20)name=model.textures[name.slice(1)];return name?.split('/').at(-1);};
 for(const e of model.elements){for(const f of Object.values(e.faces||{})){const name=resolve(f.texture||'#0');if(name&&!textures.has(name))textures.set(name,loader.loadAsync(textureRoot+name+'.png'));}}
 for(const[name,request]of textures){const map=await request;map.colorSpace=THREE.SRGBColorSpace;map.magFilter=THREE.NearestFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.anisotropy=4;
  materials.set(name,new THREE.MeshLambertMaterial({map,alphaTest:.1,side:THREE.FrontSide}));}
 const invisible=new THREE.MeshBasicMaterial({visible:false});
 for(const[elementIndex,e]of model.elements.entries()){
  const size=e.to.map((x,i)=>(x-e.from[i])/16),center=e.from.map((x,i)=>(x+e.to[i])/32),geo=new THREE.BoxGeometry(...size),uv=geo.attributes.uv,mats=[];
  for(let side=0;side<6;side++){
   const name=directions[side],f=e.faces?.[name],area=side<2?size[1]*size[2]:side<4?size[0]*size[2]:size[0]*size[1];
   const mat=f&&materials.get(resolve(f.texture||'#0'));mats.push(area>1e-12&&mat?mat:invisible);
   if(!f?.uv||!mat||area<=1e-12)continue;
   for(let i=side*4;i<side*4+4;i++){const value=faceUV(f.uv,uv.getX(i),uv.getY(i),f.rotation||0);uv.setXY(i,...value);}
   faces.push({element:elementIndex,side:name,uv:[...f.uv],rotation:f.rotation||0,area});
  }
  uv.needsUpdate=true;geo.translate(...center);geo.applyMatrix4(elementMatrix(e));
  const mesh=new THREE.Mesh(geo,mats);mesh.userData.element=elementIndex;content.add(mesh);
 }
 group.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(content),center=box.getCenter(new THREE.Vector3());content.position.sub(center);group.updateMatrixWorld(true);
 return{group,content,faces,textures:materials,source:model,get bounds(){group.updateMatrixWorld(true);return new THREE.Box3().setFromObject(group);}};
}
export function makeItemView(canvas,item,{alpha=true}={}){
 const renderer=new THREE.WebGLRenderer({canvas,alpha,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.add(item.group);scene.add(new THREE.HemisphereLight(0xffffff,0x647475,2));const light=new THREE.DirectionalLight(0xfff5e4,2.2);light.position.set(-3,5,6);scene.add(light);
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,50);let yaw=180,pitch=8;
 function render(){const w=canvas.clientWidth||canvas.width,h=canvas.clientHeight||canvas.height;if(!w||!h)return;
  const d=Math.min(devicePixelRatio||1,1.5);if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d))renderer.setSize(w,h,false);
  const y=yaw*Math.PI/180,p=pitch*Math.PI/180;camera.position.set(Math.sin(y)*4*Math.cos(p),Math.sin(p)*4,Math.cos(y)*4*Math.cos(p));camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
  const box=item.bounds,right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
  for(const x of[box.min.x,box.max.x])for(const yy of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z]){const v=new THREE.Vector3(x,yy,z),xx=v.dot(right),yp=v.dot(up);xmin=Math.min(xmin,xx);xmax=Math.max(xmax,xx);ymin=Math.min(ymin,yp);ymax=Math.max(ymax,yp);}
  const aspect=w/h,half=Math.max((ymax-ymin)/2,(xmax-xmin)/(2*aspect),.02)*1.16;
  camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.render(scene,camera);
 }
 return{renderer,scene,camera,item,render,setAngles(y,p){yaw=y;pitch=p;render();},get angles(){return[yaw,pitch];},dispose(){renderer.dispose();}};
}
