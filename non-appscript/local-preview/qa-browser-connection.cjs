// Local browser inspection helper; requires Edge with remote debugging on 9333.
const fs=require('node:fs'),path=require('node:path');
async function connect(port=8787){
  const tabs=await (await fetch('http://127.0.0.1:9333/json/list')).json();
  const tab=tabs.find(t=>t.type==='page'&&t.url.startsWith('http://127.0.0.1:'+port))||tabs.find(t=>t.type==='page'&&t.url==='about:blank');
  if(!tab)throw Error('No local test tab');
  const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let id=0;const waiting=new Map(),errors=[],dialogs=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=waiting.get(m.id);if(p){waiting.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);else if(m.method==='Page.javascriptDialogOpening'){dialogs.push(m.params.message);send('Page.handleJavaScriptDialog',{accept:true,promptText:'BROWSER-REFUND'});}};
  function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id;waiting.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});}
  async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
  async function wait(expression,timeout=45000){const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,150));}throw Error('Timed out waiting for '+expression);}
  async function click(selector){const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing target');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await new Promise(r=>setTimeout(r,120));await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});}
  async function fill(selector,value){await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
  async function idle(){await wait("typeof pendingCalls!=='undefined'&&pendingCalls===0&&!document.querySelector('#loader').classList.contains('visible')");await new Promise(r=>setTimeout(r,100));}
  async function screenshot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(__dirname,name+'.png'),Buffer.from(r.data,'base64'));}
  await send('Page.enable');await send('Runtime.enable');
  return {send,evaluate,wait,click,fill,idle,screenshot,errors,dialogs,close:()=>ws.close()};
}
module.exports={connect};
