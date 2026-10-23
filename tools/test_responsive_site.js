/* Smoke every live point at phone/tablet/desktop widths. Internal horizontal
 * scrollers are allowed; the document itself must never become wider. */
const fs=require('node:fs'),vm=require('node:vm');const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const c={};c.window=c;vm.runInNewContext(fs.readFileSync('shared/points.js','utf8'),c);const points=c.ZM.POINTS.filter(x=>x.page);
 const options={headless:true,args:['--no-sandbox']};if(process.env.SPARTICUZ_MODULE){const x=(await import(process.env.SPARTICUZ_MODULE)).default;options.executablePath=await x.executablePath();options.args=x.args.filter(a=>a!=='--single-process');}if(process.env.CHROMIUM_PATH)options.executablePath=process.env.CHROMIUM_PATH;
 const b=await chromium.launch(options),p=await b.newPage({viewport:{width:375,height:844}}),failures=[];p.setDefaultNavigationTimeout(45000);
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
 try{for(const width of[375,768,1440]){await p.setViewportSize({width,height:width===1440?1000:844});for(const pt of points){await p.goto(base+'/'+pt.page,{waitUntil:'domcontentloaded'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(150);
 const report=await p.evaluate(()=>{const excess=document.documentElement.scrollWidth-innerWidth;return{excess,elements:excess>1?[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+2&&r.width>15&&getComputedStyle(e).position!=='fixed'&&!e.closest('[style*="overflow"]');}).slice(0,6).map(e=>e.tagName+'.'+String(e.className).slice(0,80)):[]};});if(report.excess>1)failures.push({point:pt.n,width,...report});}
 console.log(width+'px: '+points.length+' point pages checked.');}
 if(failures.length){console.error(JSON.stringify(failures,null,2));process.exitCode=1;}else console.log('All live points: no document overflow at 375/768/1440.');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
