const {connect}=require('./qa-browser-connection.cjs');
(async()=>{
 const b=await connect(Number(process.env.QA_PREVIEW_PORT||8787));
 try{
 const action=process.argv[2];
 if(action==='textclick'){
  const point=await b.evaluate(`(()=>{const e=[...document.querySelectorAll('button,summary')].find(e=>e.getBoundingClientRect().width&&e.innerText.trim()===${JSON.stringify(process.argv[3])});if(!e)throw Error('Visible control not found');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await b.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
  await b.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
 }
 if(action==='click')await b.click(process.argv[3]);
 if(action==='type'){
  await b.click(process.argv[3]);
  await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});
  await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});
  await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
  await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
  await b.send('Input.insertText',{text:process.argv[4]});
 }
 if(action==='reload'){await b.send('Page.reload');await new Promise(r=>setTimeout(r,1000));}
 if(action==='key'){
  await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:process.argv[3]});
  await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:process.argv[3]});
 }
 if(action==='wait'){await new Promise(r=>setTimeout(r,300));await b.wait(`!document.body.innerText.startsWith('Please wait')`);}
 if(action==='brief'||action==='record'){
  const snap=await b.evaluate(`({text:document.body.innerText,fields:[...document.querySelectorAll('input,select')].filter(e=>e.getBoundingClientRect().width).map(e=>({id:e.id,type:e.type,value:e.type==='password'?'[hidden]':e.value,disabled:e.disabled})),pickers:[...document.querySelectorAll('.picker-trigger')].filter(e=>e.getBoundingClientRect().width).map(e=>({id:e.id,text:e.innerText,label:e.getAttribute('aria-label'),disabled:e.disabled}))})`);
  if(action==='record')require('node:fs').appendFileSync(require('node:path').join(__dirname,'qa-20261011-observations.jsonl'),JSON.stringify({time:new Date().toISOString(),label:process.argv[3],...snap})+'\n');
  console.log(JSON.stringify(snap));
 }
 if(action==='inspect')console.log(await b.evaluate(`document.querySelector(${JSON.stringify(process.argv[3])})?.outerHTML`));
 if(action==='read')console.log(await b.evaluate(`JSON.stringify({text:document.body.innerText,controls:[...document.querySelectorAll('button,input,select,summary')].filter(e=>e.getBoundingClientRect().width).map(e=>({tag:e.tagName,id:e.id,text:e.innerText,type:e.type,aria:e.getAttribute('aria-label'),value:e.type==='password'?'[hidden]':e.value,disabled:e.disabled,cls:e.className,onclick:e.getAttribute('onclick')}))})`));
 if(action==='screenshot')await b.screenshot(process.argv[3]);
 console.log('browserErrors',b.errors.length,'nativeDialogs',b.dialogs.length);
 }finally{b.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
