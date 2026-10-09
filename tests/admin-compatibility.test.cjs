const assert=require('node:assert/strict'),vm=require('node:vm');
const script=require('../local-preview/read-ui.cjs').readUi().match(/<script>([\s\S]*?)<\/script>/)[1];
const elements=new Map(),calls=[];
const element=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',classList:{add(){},remove(){}}});return elements.get(id);};
const legacy={bookings:[{bookingId:'LEGACY-1'}],settings:{BUSINESS_TIMEZONE:'UTC'}};
const ctx=vm.createContext({console,clearTimeout,role:'admin',token:'session',adminData:{remote:true},document:{activeElement:null,querySelectorAll:()=>[]},el:element,esc:s=>String(s),adminBusinessTimezone:()=> 'UTC',adminViewState:()=>({}),paintAdminTab:t=>{ctx.painted=t;},saveSession(){},show:t=>{ctx.shown=t;},msg:(id,message)=>{element(id).textContent=message;},call:async(fn)=>{calls.push(fn);if(fn==='getAdminOverview'||fn==='getAdminPage'||fn==='getAdminCandidateChoices')throw Error('Unsupported preview operation');if(fn==='getAdminDashboard')return legacy;if(fn==='adminLogin')return {token:'session'};throw Error('Unexpected RPC');}});
vm.runInContext(script.slice(script.indexOf('function adminApiUnavailable('),script.indexOf('const adminPageNames=')),ctx);
vm.runInContext(script.slice(script.indexOf('let adminRequestVersion='),script.indexOf('function renderAdminPagination(')),ctx);
(async()=>{
 await ctx.refreshAdmin();assert.equal(ctx.adminData,legacy);assert.deepEqual(calls,['getAdminOverview','getAdminDashboard']);
 ctx.adminData={remote:true};calls.length=0;await ctx.loadAdminTab('bookings');assert.equal(ctx.painted,'bookings');assert.equal(ctx.adminData,legacy);assert.deepEqual(calls,['getAdminPage','getAdminDashboard']);
 ctx.adminData={remote:true};calls.length=0;await ctx.loadAdminTab('create');assert.equal(ctx.painted,'create');assert.deepEqual(calls,['getAdminCandidateChoices','getAdminDashboard']);
 calls.length=0;ctx.call=async(fn)=>{calls.push(fn);throw Error('Session expired. Please sign in again.');};await assert.rejects(ctx.refreshAdmin(),/Session expired/);assert.deepEqual(calls,['getAdminOverview']);
 vm.runInContext(script.split('\n').find(line=>line.startsWith('async function adminSignIn()')),ctx);
 ctx.call=async(fn)=>{if(fn==='adminLogin')return {token:'valid'};throw Error('Network unavailable');};await ctx.adminSignIn();assert.equal(ctx.shown,'adminLogin');assert.equal(element('aMsg').textContent,'Network unavailable');
 ctx.adminData={remote:true};await ctx.loadAdminTab('payments');assert(element('adminContent').innerHTML.includes('Network unavailable'));assert(element('adminContent').innerHTML.includes('Try again'));
 const bridge={withSuccessHandler(){return this;},withFailureHandler(){return this;}},rpc=vm.createContext({google:{script:{run:bridge}},setLoading:on=>{rpc.loading=(rpc.loading||0)+(on?1:-1);}});
 vm.runInContext(script.slice(script.indexOf('function isLocalPreview(){'),script.indexOf('function show(id)')),rpc);await assert.rejects(rpc.call('getAdminOverview'),/not a function/);assert.equal(rpc.loading,0);
 console.log('PASS older admin API compatibility, missing-page/create fallback, no fallback for auth failures, visible login failures and inline retryable table errors');
})().catch(e=>{console.error(e);process.exitCode=1;});

