const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const tabs=await(await fetch('http://127.0.0.1:9333/json/list')).json();
 let tab=tabs.find(t=>t.type==='page'&&t.url.includes('script.google.com/macros/s/'));
 const browser=await(await fetch('http://127.0.0.1:9333/json/version')).json();
 async function openSocket(url){const w=new WebSocket(url);await new Promise((r,j)=>{w.onopen=r;w.onerror=j;});let id=0;const queue=new Map();w.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=queue.get(m.id);if(p){queue.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}}};return {w,send:(method,params={})=>new Promise((resolve,reject)=>{const n=++id;queue.set(n,{resolve,reject});w.send(JSON.stringify({id:n,method,params}));})};}
 if(!tab){const c=await openSocket(browser.webSocketDebuggerUrl);const r=await c.send('Target.createTarget',{url:'https://script.google.com/macros/s/AKfycbxZIpx_VhaMuRtATw1D14Bl6xjxQSL8eVbO_0RJV-7WLp0izAsrTi1tyswDgbZPHz2c/exec'});c.w.close();await new Promise(r=>setTimeout(r,2500));tab=(await(await fetch('http://127.0.0.1:9333/json/list')).json()).find(t=>t.id===r.targetId);}
 const frames=await(await fetch('http://127.0.0.1:9333/json/list')).json();
 const frame=frames.find(t=>t.type==='iframe'&&t.url.includes('script.googleusercontent.com'));
 const page=await openSocket(tab.webSocketDebuggerUrl),contexts=[],errors=[];
 const d=await openSocket((frame||tab).webSocketDebuggerUrl);
 d.w.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.executionContextCreated')contexts.push(m.params.context);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);});
 try{
 await page.send('Page.bringToFront');await d.send('Page.enable');await d.send('Runtime.enable');
 async function ev(expression,contextId){const r=await d.send('Runtime.evaluate',{expression,contextId,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
 let ctx;
 for(const candidate of contexts.filter(x=>x.auxData?.isDefault)){try{const text=await ev('document.body?.innerText||""',candidate.id);if(text.includes('Interview Booking Portal')){ctx=candidate.id;if(text.includes('Candidate Login')||text.includes('Dashboard'))break;}}catch{}}
 let action=process.argv[2],downloadControl;
 if(action==='export'){downloadControl=await openSocket(browser.webSocketDebuggerUrl);const folder=path.join(__dirname,'qa-live-downloads');fs.mkdirSync(folder,{recursive:true});downloadControl.w.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method?.startsWith('Browser.download'))console.log(JSON.stringify(m));});await downloadControl.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:folder,eventsEnabled:true});action='textclick';process.argv[3]='Export Excel';}
 if(action==='downloads'){const folder=path.join(__dirname,'qa-live-downloads');fs.mkdirSync(folder,{recursive:true});const control=await openSocket(browser.webSocketDebuggerUrl);await control.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:folder});control.w.close();console.log(folder);}
 if(action==='geometry'){console.log(JSON.stringify(await page.send('Page.getFrameTree')));console.log(JSON.stringify(await d.send('Page.getFrameTree')));console.log(await ev('JSON.stringify([...document.querySelectorAll("button")].filter(e=>e.innerText==="Admin").map(e=>({rect:e.getBoundingClientRect().toJSON(),win:[innerWidth,innerHeight,scrollX,scrollY]})))',ctx));}
 if(action==='size')await page.send('Emulation.setDeviceMetricsOverride',{width:Number(process.argv[3]),height:Number(process.argv[4]),deviceScaleFactor:1,mobile:false});
 if(action==='contexts'){console.log(JSON.stringify(contexts.map(x=>({id:x.id,origin:x.origin,name:x.name,aux:x.auxData}))));}
 if(!ctx){console.log('No portal context yet');console.log(await ev('document.body.innerText'));return;}
 if(action==='wait'){const start=Date.now();while(await ev("document.body.innerText.startsWith('Please wait')",ctx)){if(Date.now()-start>45000)throw Error('Loading did not finish within 45 seconds');await new Promise(r=>setTimeout(r,250));}}
 if(action==='read'||action==='record'){
  const data=await ev(`({text:document.body.innerText,controls:[...document.querySelectorAll('button,input,select,summary')].filter(e=>e.getBoundingClientRect().width).map(e=>({tag:e.tagName,id:e.id,text:e.innerText,type:e.type,value:e.type==='password'?'[hidden]':e.value,aria:e.getAttribute('aria-label'),disabled:e.disabled}))})`,ctx);
  if(action==='record')fs.appendFileSync(path.join(__dirname,'qa-live-20261011-observations.jsonl'),JSON.stringify({time:new Date().toISOString(),label:process.argv[3],...data})+'\n');
  console.log(JSON.stringify(action==='record'?{text:data.text,fields:data.controls.filter(e=>['INPUT','SELECT'].includes(e.tag))}:data));
 }
 if(action==='timestamps'){const data=await ev(`([...document.querySelectorAll('[data-timestamp]')].filter(e=>e.getBoundingClientRect().width).map(e=>({text:e.innerText,...e.dataset})))`,ctx);fs.appendFileSync(path.join(__dirname,'qa-live-20261011-observations.jsonl'),JSON.stringify({time:new Date().toISOString(),label:process.argv[3],timestamps:data})+'\n');console.log(JSON.stringify(data));}
 if(action==='click'||action==='textclick'||action==='type'){
  const select=action==='textclick'?`[...document.querySelectorAll('button,summary')].find(e=>e.getBoundingClientRect().width&&e.innerText.trim().replace(/_/g,' ')===${JSON.stringify(process.argv[3].replace(/_/g,' '))})`:`document.querySelector(${JSON.stringify(process.argv[3])})`;
  const point=await ev(`(()=>{const e=${select};if(!e)throw Error('Visible target missing');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`,ctx);
  // Apps Script puts the portal inside nested cross-origin frames. Derive
  // screen coordinates from the frame owner boxes, without changing app state.
  if(frame){
   const owner=await page.send('DOM.getFrameOwner',{frameId:frame.id});
   const box=await page.send('DOM.getBoxModel',{backendNodeId:owner.backendNodeId});
   point.x+=box.model.content[0];point.y+=box.model.content[1];
   const target=contexts.find(x=>x.id===ctx);
   if(target?.auxData?.frameId!==frame.id){const inner=await d.send('DOM.getFrameOwner',{frameId:target.auxData.frameId});const ib=await d.send('DOM.getBoxModel',{backendNodeId:inner.backendNodeId});point.x+=ib.model.content[0];point.y+=ib.model.content[1];}
  }
  await new Promise(r=>setTimeout(r,120));
  await page.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
  if(action==='type'){await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',windowsVirtualKeyCode:8});await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Backspace',windowsVirtualKeyCode:8});await page.send('Input.insertText',{text:process.argv[4]??''});}
 }
 if(action==='key'){await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:process.argv[3]});await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:process.argv[3]});}
 if(action==='screenshot'){await page.send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});await new Promise(r=>setTimeout(r,250));const r=await page.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(__dirname,process.argv[3]+'.png'),Buffer.from(r.data,'base64'));}
 if(action==='reload'){await page.send('Page.reload');}
 if(['click','textclick','type','reload'].includes(action)){await new Promise(r=>setTimeout(r,250));const started=Date.now();while(await ev("document.body.innerText.startsWith('Please wait')",ctx)){if(Date.now()-started>45000)throw Error('Loading exceeded 45 seconds');await new Promise(r=>setTimeout(r,250));}}
 console.log('portalErrorsDuringConnection',errors.length);
 if(downloadControl){await new Promise(r=>setTimeout(r,1500));downloadControl.w.close();}
 }finally{d.w.close();page.w.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});


