/* Derive page snapshots from the SAME native WebGL meshes used in the page.
 * This intentionally does not use shared/model3d.js's CSS-face implementation.
 * Start tools/serve.py first; browser env matches the regression suites. */
const fs=require('node:fs');const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const options={headless:true,args:['--no-sandbox']};if(process.env.SPARTICUZ_MODULE){const c=(await import(process.env.SPARTICUZ_MODULE)).default;options.executablePath=await c.executablePath();options.args=c.args.filter(x=>x!=='--single-process');}if(process.env.CHROMIUM_PATH)options.executablePath=process.env.CHROMIUM_PATH;
 const browser=await chromium.launch(options),p=await browser.newPage({viewport:{width:720,height:360},deviceScaleFactor:1});p.setDefaultTimeout(45000);
 const base=(process.env.TEST_BASE_URL||'http://127.0.0.1:8765').replace(/\/$/,'');
 try{
  await p.goto(base+'/pages/27-chigur/',{waitUntil:'networkidle'});await p.waitForFunction(()=>window.P27NativeItems);
  for(const asset of[
   {type:'shotgun',file:'shotgun_side.png',w:720,h:360,yaw:70,pitch:8,roll:180},
   {type:'coin',file:'coin_model_heads.png',w:256,h:256,yaw:170,pitch:9,roll:0},
   {type:'coin',file:'coin_model_tails.png',w:256,h:256,yaw:-10,pitch:9,roll:0},
   {type:'coin',file:'i/chigur_coin.png',w:256,h:256,yaw:160,pitch:14,roll:0},
   {type:'shotgun',file:'i/chigur_shotgun.png',w:256,h:256,yaw:0,pitch:0,gui:true}
  ]){
   await p.setViewportSize({width:asset.w,height:asset.h});
   const result=await p.evaluate(async({asset,base})=>{
    let host=document.querySelector('#assetStage');if(host)host.remove();host=document.createElement('div');host.id='assetStage';host.style='position:fixed;inset:0;z-index:99999;';document.body.append(host);
    const canvas=document.createElement('canvas');canvas.style='display:block;width:100%;height:100%';host.append(canvas);
    const item=await P27NativeItems.buildItem(ZM.P27ITEMS[asset.type],base+'/assets/textures/p27/'),view=P27NativeItems.makeItemView(canvas,item);
    if(asset.gui){const r=ZM.P27ITEMS[asset.type].display.gui.rotation;item.group.rotation.set(...r.map(x=>x*Math.PI/180),'XYZ');}else item.group.rotation.z=asset.roll*Math.PI/180;
    view.setAngles(asset.yaw,asset.pitch);view.render();const data=canvas.toDataURL('image/png').split(',')[1];view.dispose();host.remove();return{data,faces:item.faces.length};
   },{asset,base});
   fs.writeFileSync('assets/textures/p27/'+asset.file,Buffer.from(result.data,'base64'));console.log(asset.file,result.faces+' native faces');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
