import assert from 'node:assert/strict';
import {faceUV,elementMatrix,THREE} from '../pages/27-chigur/item-model.js';
const close=(a,b)=>a.forEach((n,i)=>assert.ok(Math.abs(n-b[i])<1e-9,`${a} != ${b}`));
close(faceUV([.5,.5,6.5,6.5],0,1),[.5/16,1-.5/16]);
close(faceUV([.5,.5,6.5,6.5],1,0),[6.5/16,1-6.5/16]);
close(faceUV([6.5,.5,.5,0],1,0),[.5/16,1]);
close(faceUV([0,0,4,8],0,1,90),[0,.5]);
close(faceUV([0,0,4,8],1,1,90),[0,1]);
const point=new THREE.Vector3(0,1,0).applyMatrix4(elementMatrix({rotation:{origin:[0,0,0],axis:'x',angle:45,rescale:true}}));close(point.toArray(),[0,1,1]);
const pivot=new THREE.Vector3(.5,.5,.5).applyMatrix4(elementMatrix({rotation:{origin:[8,8,8],axis:'y',angle:-45}}));close(pivot.toArray(),[.5,.5,.5]);
// Correct outward winding is what the former CSS-face stack could not guarantee.
const box=new THREE.BoxGeometry(1,1,1),p=box.attributes.position,n=box.attributes.normal,index=box.index;
for(let side=0;side<6;side++){const a=new THREE.Vector3().fromBufferAttribute(p,index.getX(side*6)),b=new THREE.Vector3().fromBufferAttribute(p,index.getX(side*6+1)),c=new THREE.Vector3().fromBufferAttribute(p,index.getX(side*6+2)),normal=new THREE.Vector3().fromBufferAttribute(n,index.getX(side*6));assert.ok(b.sub(a).cross(c.sub(a)).dot(normal)>0);}
console.log('Native item math: normalized-16 atlas UV, mirrored/rotated faces, pivots/rescale and all-six-face outward winding: OK');
