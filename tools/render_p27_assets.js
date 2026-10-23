/* Render presentation assets FROM the supplied GeckoLib and item resources.
 * Start tools/serve.py first. Browser env matches test_revision_browser.js.
 * No AI image, guessed weapon geometry, or manual bone mirror is involved. */
const fs=require('node:fs');
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const options={headless:true,args:['--no-sandbox']};
 if(process.env.SPARTICUZ_MODULE){const c=(await import(process.env.SPARTICUZ_MODULE)).default;options.executablePath=await c.executablePath();options.args=c.args.filter(x=>x!=='--single-process');}
 if(process.env.CHROMIUM_PATH)options.executablePath=process.env.CHROMIUM_PATH;
 const browser=await chromium.launch(options),p=await browser.newPage({viewport:{width:640,height:900},deviceScaleFactor:1});
 const base=(process.env.TEST_BASE_URL||'http://127.0.0.1:8765').replace(/\/$/,'');p.setDefaultTimeout(45000);
 try{
  await p.goto(base+'/pages/27-chigur/',{waitUntil:'networkidle'});
  const data=await p.evaluate(async base=>{
   document.body.innerHTML='<canvas id="poster"></canvas>';document.body.style='padding:0;margin:0;background:transparent;';
   const cv=document.querySelector('#poster');cv.style='width:640px;height:900px;display:block';
   const scene=ZMGeo.create(cv,{geo:ZM.P27G.geo,anim:ZM.P27G.anim,tex:base+'/assets/textures/p27/anton_chigur.png',idle:'animation.chigur.stalk',lit:.32,mip:true,keep:true,exclusive:true,cam:{yaw:195,pitch:3,dist:54,target:[0,15,0],fov:40}});
   await new Promise((resolve,reject)=>{const im=new Image();im.onload=resolve;im.onerror=reject;im.src=base+'/assets/textures/p27/anton_chigur.png';});
   await new Promise(r=>setTimeout(r,150));scene.tick(.35);scene.render();
   const out=document.createElement('canvas');out.width=cv.width;out.height=cv.height;const g=out.getContext('2d');g.drawImage(cv,0,0);
   const pixels=g.getImageData(0,0,out.width,out.height).data;let x0=out.width,y0=out.height,x1=0,y1=0;
   for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++)if(pixels[(y*out.width+x)*4+3]>10){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
   const crop=document.createElement('canvas');crop.width=x1-x0+25;crop.height=y1-y0+25;crop.getContext('2d').drawImage(out,x0,y0,x1-x0+1,y1-y0+1,12,12,x1-x0+1,y1-y0+1);return crop.toDataURL('image/png').split(',')[1];
  },base);
  fs.writeFileSync('assets/textures/p27/anton_stalk.png',Buffer.from(data,'base64'));
  await p.setViewportSize({width:640,height:320});
  const model=JSON.parse(fs.readFileSync('mod-src/models/item/chigur_shotgun.json','utf8'));
  await p.evaluate(({model,base})=>{
   document.body.innerHTML='<div id="item"></div>';document.body.style='padding:0;margin:0;background:transparent';
   const style=document.createElement('style');style.textContent='html{background:transparent!important}#item{position:fixed;inset:0;perspective:1500px}.m3d{position:absolute;left:50%;top:50%;transform-style:preserve-3d}.m3d-rig{position:absolute;left:0;top:0;transform-style:preserve-3d}.m3d-f{display:block;position:absolute;left:0;top:0;width:100px;height:100px;transform-origin:0 0;background-repeat:no-repeat;image-rendering:pixelated;backface-visibility:hidden}';document.head.appendChild(style);
   model.textures={0:'chigur_shotgun'};const view=ZMModel3D.build(model,base+'/assets/textures/p27/',{unit:29});view.rig.style.transform='rotateX(8deg) rotateY(-70deg) rotateZ(180deg)';document.querySelector('#item').append(view.el);
  },{model,base});
  await p.waitForTimeout(600);await p.screenshot({path:'assets/textures/p27/shotgun_side.png',omitBackground:true,timeout:45000});
  console.log('Rendered original stalk animation and native item side view.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
