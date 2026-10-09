const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const names=['Candidates','AuthSessions','InterviewsV3','Payments','Refunds','Settings','Availability','Audit Log'];
const sheets=new Map(),props=new Map();let owner=true;
const insert=name=>{assert(!sheets.has(name));const s={getName:()=>name};sheets.set(name,s);return s;};
const ss={getSheets:()=>[...sheets.values()],insertSheet:insert,deleteSheet:s=>{assert(sheets.size>1);sheets.delete(s.getName());}};
const ctx=vm.createContext({APP:{SHEETS:Object.fromEntries(names.map(n=>[n,n]))},
  requireSetupOwner_:()=>{if(!owner)throw Error('owner required');},authLock_:fn=>fn(),getSS_:()=>ss,
  PropertiesService:{getScriptProperties:()=>({getProperties:()=>Object.fromEntries(props),deleteProperty:k=>props.delete(k)})}
});
vm.runInContext(fs.readFileSync('01_Setup.js','utf8'),ctx);
names.forEach(insert);insert('My legacy data');
for(const key of ['ADMIN_PASSWORD_HASH','RESET_HMAC_SECRET','CANDIDATE_PASSWORD_AV-123','INITIAL_ADMIN_EMAIL','INITIAL_ADMIN_PASSWORD','OTHER'])props.set(key,'value');
owner=false;assert.throws(()=>ctx.resetInterviewPortalForTesting(),/owner/);assert.equal(sheets.size,9);assert.equal(props.size,6);
owner=true;props.set('ADMIN_PASSWORD_RESET','pending-code');assert.equal(ctx.resetInterviewPortalForTesting().deletedSheets.length,8);
assert.deepEqual([...sheets.keys()],['My legacy data']);
assert.deepEqual([...props.keys()],['INITIAL_ADMIN_EMAIL','INITIAL_ADMIN_PASSWORD','OTHER']);
assert.equal(ctx.resetInterviewPortalForTesting().deletedSheets.length,0);
sheets.clear();names.forEach(insert);ctx.resetInterviewPortalForTesting();
assert.deepEqual([...sheets.keys()],['Portal Reset']);
names.forEach(insert);ctx.resetInterviewPortalForTesting();assert.deepEqual([...sheets.keys()],['Portal Reset']);
console.log('PASS reset: owner guard, portal-only deletion, auth cleanup, preserved setup properties, last-tab protection and repeated runs');
