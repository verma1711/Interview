const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
class Sheet {
  constructor(name){this.name=name;this.data=[];this.width=26;}
  getName(){return this.name;} getLastRow(){return this.data.length;}
  getLastColumn(){return this.data.reduce((n,r)=>Math.max(n,r.length),0);}
  getMaxColumns(){return this.width;} insertColumnsAfter(_,n){this.width+=n;}
  setFrozenRows(){} appendRow(row){this.data.push([...row]);}
  getRange(r,c,n=1,m=1){const s=this;return {
    getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>s.data[r+i-1]?.[c+j-1]??'')),
    getDisplayValues(){return this.getValues().map(r=>r.map(String));},
    setValues(rows){rows.forEach((row,i)=>row.forEach((v,j)=>{s.data[r+i-1]??=[];s.data[r+i-1][c+j-1]=v;}));return this;},
    setFontWeight(){return this;},setBackground(){return this;},clearContent(){return this.setValues(Array.from({length:n},()=>Array(m).fill('')));}
  };}
}
const sheets=new Map(),props=new Map(),mail=[],events=[];
const ss={getSpreadsheetTimeZone:()=> 'UTC',getSheetByName:n=>sheets.get(n),insertSheet:n=>{const s=new Sheet(n);sheets.set(n,s);return s;},deleteSheet:s=>{assert(sheets.size>1);sheets.delete(s.getName());},getSheets:()=>[...sheets.values()]};
const bytes=x=>typeof x==='string'?Buffer.from(x):Buffer.from(x.map(b=>b&255));
const signed=b=>Array.from(b,x=>x>127?x-256:x);
const ctx=vm.createContext({console,Intl,Date,Math,Session:{getActiveUser:()=>({getEmail:()=> 'owner@example.com'}),getEffectiveUser:()=>({getEmail:()=> 'owner@example.com'})},
  SpreadsheetApp:{getActiveSpreadsheet:()=>ss,flush(){}},
  Utilities:{getUuid:()=>crypto.randomUUID(),newBlob:s=>({getBytes:()=>signed(Buffer.from(s))}),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},
    computeDigest:(_,s)=>signed(crypto.createHash('sha256').update(bytes(s)).digest()),base64Encode:b=>bytes(b).toString('base64'),
    computeHmacSha256Signature:(v,k)=>signed(crypto.createHmac('sha256',bytes(k)).update(bytes(v)).digest())},
  PropertiesService:{getScriptProperties:()=>({getProperties:()=>Object.fromEntries(props),getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)})},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  MailApp:{sendEmail:(...x)=>mail.push(x)},People:{People:{createContact:()=>({resourceName:'people/test'})}},
  CalendarApp:{getCalendarById:()=>({getEventById:()=>({deleteEvent(){}})}),getCalendarsByName:()=>[{getId:()=> 'calendar-test',getEvents:()=>[],createEvent:(...x)=>{events.push(x);return {getId:()=> 'event1'};},getEventById:()=>({deleteEvent(){}})}]}
});
const files=fs.readdirSync('.').filter(f=>/^\d.*\.js$/.test(f));
for(const file of files)vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const run=s=>vm.runInContext(s,ctx);
// Fail every unrecognized write in every sheet, including all Candidates paths.
run(`const originalAppend_=appendObject_,originalUpdate_=updateObjectRow_;
function checkKeys_(s,o){for(const k of Object.keys(o))if(!headers_(s).includes(k))throw new Error('Unknown column '+s.getName()+'.'+k);}
appendObject_=function(s,o){checkKeys_(s,o);return originalAppend_(s,o);};
updateObjectRow_=function(s,r,o){checkKeys_(s,o);return originalUpdate_(s,r,o);};`);
ctx.setupInterviewPortal('admin@example.com','admin-password');
// Capture every column/default from fresh setup, then exercise the actual reset/setup pair.
const expectedSchema=Object.fromEntries([...sheets].map(([n,s])=>[n,Array.from(ctx.headers_(s))]));
const expectedSettings=JSON.stringify(ctx.getAllSettings_());
const unrelated=ss.insertSheet('Unrelated notes');unrelated.appendRow(['Keep this data']);
props.set('INITIAL_ADMIN_EMAIL','admin@example.com');props.set('INITIAL_ADMIN_PASSWORD','admin-password');
props.set('UNRELATED_PROPERTY','keep');props.set('CANDIDATE_PASSWORD_AV-OLD','legacy');props.set('RESET_HMAC_SECRET','secret');
const oldToken=ctx.adminLogin('admin@example.com','admin-password').token;
const rejectExternal=new Proxy({}, {get(){throw Error('Reset/setup must not access Calendar or Contacts');}});
const savedCalendar=ctx.CalendarApp,savedPeople=ctx.People;ctx.CalendarApp=rejectExternal;ctx.People=rejectExternal;
ctx.resetInterviewPortalForTesting();
assert.deepEqual([...sheets.keys()],['Unrelated notes']);assert.deepEqual(unrelated.data,[['Keep this data']]);
assert.deepEqual([...props.keys()].sort(),['INITIAL_ADMIN_EMAIL','INITIAL_ADMIN_PASSWORD','UNRELATED_PROPERTY'].sort());
ctx.runInitialSetup();
assert.deepEqual([...sheets.keys()].filter(n=>n!=='Unrelated notes').sort(),Object.keys(expectedSchema).sort());
for(const [name,columns] of Object.entries(expectedSchema))assert.deepEqual(Array.from(ctx.headers_(sheets.get(name))),columns,name);
assert.equal(JSON.stringify(ctx.getAllSettings_()),expectedSettings);
const availability=ctx.rowsAsObjects_(sheets.get('Availability'));
assert.equal(availability.length,7);
assert.deepEqual(Array.from(availability,r=>r.Weekday),['Sun','Mon','Tue','Wed','Thu','Fri','Sat']);
assert(availability.every(r=>r.RuleType==='WEEKLY'&&r.StartTime==='12:00'&&r.EndTime==='20:00'&&r.Enabled===true));
for(const name of ['Candidates','InterviewsV3','Payments','Refunds','AuthSessions'])assert.equal(sheets.get(name).getLastRow(),1,name);
assert.equal(ctx.rowsAsObjects_(sheets.get('Audit Log'))[0].Action,'SETUP');
assert.equal(props.get('ADMIN_PASSWORD_HASH'),ctx.hash_('admin-password'));
assert.throws(()=>ctx.validateSession(oldToken),/Session expired/);
assert.equal(ctx.validateSession(ctx.adminLogin('admin@example.com','admin-password').token).role,'admin');
ctx.CalendarApp=savedCalendar;ctx.People=savedPeople;
assert.equal(props.get('UNRELATED_PROPERTY'),'keep');
console.log('PASS reset -> runInitialSetup: every sheet/column/default, weekly availability, admin login, old-session rejection and external-data preservation');
const cols=ctx.headers_(sheets.get('Candidates'));
// Check all candidate property reads in all production files against setup.
for(const file of files)for(const m of fs.readFileSync(file,'utf8').matchAll(/\bc\.([A-Z]\w*)/g))assert(cols.includes(m[1]),file+': '+m[1]);
ctx.setSetting_('UPI_ID','keep@upi');
ctx.setupInterviewPortal('other@example.com','different-password');
assert.equal(ctx.getSetting_('UPI_ID'),'keep@upi');
assert.equal(ctx.getSetting_('ADMIN_EMAIL'),'admin@example.com');
// Independent PBKDF2 reference vectors, including Unicode and long passwords.
for(const p of ['password','päss🔑','x'.repeat(100)])assert.equal(ctx.derivePassword_(p,'salt',3),crypto.pbkdf2Sync(p,'salt',3,32,'sha256').toString('base64'));
console.log('PASS setup/schema and PBKDF2 reference vectors');
const start=Date.now();
const reg=ctx.registerCandidate({name:'Test',email:'TEST@example.com',phone:'9999999999',countryCode:'+91',timezone:'Asia/Kolkata',password:'my-password'});
const id=reg.candidateId;
let c=ctx.candidateByIdentifier_(id);
assert.equal(c.PasswordHash,crypto.pbkdf2Sync('my-password',c.PasswordSalt,600000,32,'sha256').toString('base64'));
assert(!JSON.stringify(reg).includes(c.PasswordHash));assert.equal(c.ContactResourceName,'people/test');
assert.throws(()=>ctx.registerCandidate({name:'Test',email:'test@example.com',phone:'1',countryCode:'+1',timezone:'UTC',password:'my-password'}),/already exists/);
assert.equal(ctx.candidateLogin(id.toLowerCase(),'my-password').profile.candidateId,id);
assert.equal(ctx.candidateLogin('TEST@example.com','my-password').profile.candidateId,id);
assert.throws(()=>ctx.candidateLogin(id,'wrong'),/Invalid/);
assert.equal(ctx.validateSession(reg.token).role,'candidate'); // No CacheService exists in mock.
assert.equal(ctx.getCandidateHome(reg.token).profile.email,'test@example.com');
ctx.updateCandidateTimezone(reg.token,'America/New_York');
assert.equal(ctx.getCandidateHome(reg.token).profile.timezone,'America/New_York');
const admin=ctx.adminLogin('admin@example.com','admin-password');
ctx.setSetting_('BUSINESS_TIMEZONE','America/New_York');
assert.equal(ctx.adminLogin('admin@example.com','admin-password').adminTimezone,'America/New_York');
const summer=ctx.adminBookingView_({StartUTC:'2026-07-01T16:00:00Z',EndUTC:'2026-07-01T16:30:00Z'});
const winter=ctx.adminBookingView_({StartUTC:'2026-12-01T16:00:00Z',EndUTC:'2026-12-01T16:30:00Z'});
assert(summer.startAdmin.includes('12:00 PM'));assert(winter.startAdmin.includes('11:00 AM'));
ctx.setSetting_('BUSINESS_TIMEZONE','Asia/Kolkata');
assert(ctx.adminBookingView_({StartUTC:'2026-07-01T16:00:00Z',EndUTC:'2026-07-01T16:30:00Z'}).startAdmin.includes('9:30 PM'));
assert.throws(()=>ctx.adminUpdateSettings(admin.token,{BUSINESS_TIMEZONE:'Invalid/Zone'}),/Invalid business timezone/);
assert.equal(ctx.getSetting_('BUSINESS_TIMEZONE'),'Asia/Kolkata');
assert.throws(()=>ctx.zonedLocalToUtc_('2026-03-08','02:30','America/New_York'),/does not exist/);
assert.throws(()=>ctx.zonedLocalToUtc_('2026-11-01','01:30','America/New_York'),/ambiguous/);
console.log('PASS business-zone Admin display, summer/winter offsets, DST transition rejection and settings validation');
ctx.adminUpdateCandidate(admin.token,{candidateId:id,type:'PERCENTAGE',percentage:15});
assert.equal(ctx.candidateByIdentifier_(id).PasswordHash,c.PasswordHash);
assert(!JSON.stringify(ctx.getAdminDashboard(admin.token)).includes(c.PasswordHash));
ctx.requestPasswordReset(id,'test@example.com');
const code=mail.at(-1)[0].htmlBody.match(/<b>(\d{6})<\/b>/)[1];
assert.throws(()=>ctx.candidateLogin(id,code),/Invalid/);
assert.throws(()=>ctx.requestPasswordReset(id,'test@example.com'),/one minute/);
ctx.resetCandidatePassword(id,code,'new-password');
assert.throws(()=>ctx.resetCandidatePassword(id,code,'new-password'),/Invalid/);
assert.throws(()=>ctx.validateSession(reg.token),/Session expired/);
assert.throws(()=>ctx.candidateLogin(id,'my-password'),/Invalid/);
const login=ctx.candidateLogin(id,'new-password');
ctx.logout(login.token);assert.throws(()=>ctx.validateSession(login.token),/Session expired/);
// Admin and imported accounts can establish a password using recovery.
const legacy=ctx.adminCreateCandidate(admin.token,{name:'Legacy',email:'legacy@example.com',timezone:'UTC'});
props.set('CANDIDATE_PASSWORD_'+legacy.candidateId,'old-salt:'+ctx.hash_('old-saltlegacy-password'));
assert(ctx.candidateLogin(legacy.candidateId,'legacy-password').token);
assert(!props.has('CANDIDATE_PASSWORD_'+legacy.candidateId));
ctx.requestPasswordReset(legacy.candidateId,'legacy@example.com');
for(let i=0;i<5;i++)assert.throws(()=>ctx.resetCandidatePassword(legacy.candidateId,'bad','another-password'),/Invalid/);
assert.equal(ctx.candidateByIdentifier_(legacy.candidateId).ResetHash,'');
const legacyRow=ctx.candidateByIdentifier_(legacy.candidateId);
ctx.updateObjectRow_(sheets.get('Candidates'),legacyRow._row,{ResetSentAtUTC:''});
ctx.requestPasswordReset(legacy.candidateId,'legacy@example.com');
const expiredCode=mail.at(-1)[0].htmlBody.match(/<b>(\d{6})<\/b>/)[1];
ctx.updateObjectRow_(sheets.get('Candidates'),legacyRow._row,{ResetExpiresUTC:'2000-01-01T00:00:00Z'});
assert.throws(()=>ctx.resetCandidatePassword(legacy.candidateId,expiredCode,'another-password'),/Invalid/);
const change=ctx.candidateLogin(legacy.candidateId,'legacy-password');
ctx.changeCandidatePassword(change.token,'legacy-password','changed-password');
assert.throws(()=>ctx.validateSession(change.token),/Session expired/);
assert.notEqual(ctx.candidateByIdentifier_(legacy.candidateId).PasswordSalt,legacyRow.PasswordSalt);
const expired=ctx.newSession_({role:'candidate',candidateId:legacy.candidateId,email:'legacy@example.com'});
const sessionRow=ctx.findOne_(sheets.get('AuthSessions'),'TokenHash',ctx.hash_(expired));
ctx.updateObjectRow_(sheets.get('AuthSessions'),sessionRow._row,{ExpiresAtUTC:'2000-01-01T00:00:00Z'});
assert.throws(()=>ctx.validateSession(expired),/Session expired/);
ctx.updateObjectRow_(sheets.get('Candidates'),legacyRow._row,{LoginAttempts:4});
assert.throws(()=>ctx.candidateLogin(legacy.candidateId,'wrong'),/Invalid/);
assert.throws(()=>ctx.candidateLogin(legacy.candidateId,'changed-password'),/Too many/);
// Booking, calendar, payment, refunds and admin operations retain their contracts.
const fresh=ctx.candidateLogin(id,'new-password');
ctx.adminUpdateCandidate(admin.token,{candidateId:id,type:'REGULAR',percentage:0,timezone:'Asia/Kolkata'});
ctx.setSetting_('BUSINESS_TIMEZONE','Asia/Kolkata');
const data={date:'2030-01-07',startTime:'13:00',endTime:'13:30',interviewType:'Technical',utr:'test-utr',amountPaid:50};
assert.equal(ctx.quoteBooking(fresh.token,data).finalChargeUSD,50);
ctx.adminUpdateSettings(admin.token,{UPI_ID:'test@upi',UPI_QR_URL:'https://example.com/qr.png'});
assert.equal(ctx.quoteBooking(fresh.token,data).upiId,'test@upi');
assert.equal(ctx.quoteBooking(fresh.token,data).upiQrUrl,'https://example.com/qr.png');
ctx.adminUpdateSettings(admin.token,{UPI_QR_URL:'https://drive.google.com/file/d/qr_file-123/view?usp=sharing&resourcekey=key-123'});
assert.equal(ctx.quoteBooking(fresh.token,data).upiQrUrl,'https://drive.google.com/thumbnail?id=qr_file-123&sz=w1000&resourcekey=key-123');
assert.equal(ctx.paymentQrImageUrl_('https://drive.google.com/open?id=qr_file-123'),'https://drive.google.com/thumbnail?id=qr_file-123&sz=w1000');
assert.throws(()=>ctx.adminUpdateSettings(admin.token,{UPI_QR_URL:'https://drive.google.com/drive/folders/folder123'}),/not a folder/);
assert.throws(()=>ctx.adminUpdateSettings(admin.token,{UPI_QR_URL:'javascript:alert(1)'}),/QR image URL/);
ctx.setSetting_('UPI_ID','CHANGE_ME@upi');ctx.setSetting_('UPI_QR_URL','');
assert.equal(ctx.quoteBooking(fresh.token,data).upiId,'');
const booking=ctx.submitCandidateBooking(fresh.token,data);assert.equal(events.length,1);
const payment=ctx.rowsAsObjects_(sheets.get('Payments'))[0];ctx.adminVerifyPayment(admin.token,payment.PaymentID,'VERIFIED','');
ctx.cancelCandidateBooking(fresh.token,booking.bookingId);
const refund=ctx.rowsAsObjects_(sheets.get('Refunds'))[0];ctx.adminMarkRefunded(admin.token,refund.RefundID,'refund-utr','');
assert.equal(ctx.getCandidateHome(fresh.token).bookings[0].refundStatus,'REFUNDED');
ctx.adminSaveAvailability(admin.token,['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(weekday=>({ruleType:'WEEKLY',weekday,startTime:'22:00',endTime:'02:00',enabled:true})));
const overnightData={date:'2030-01-09',startTime:'23:00',endTime:'01:00',interviewType:'Overnight test',utr:'overnight-utr',amountPaid:50,overnightConfirmed:true};
assert.throws(()=>ctx.quoteBooking(fresh.token,{...overnightData,overnightConfirmed:false}),/Confirm that this is an overnight booking/);
const overnightQuote=ctx.quoteBooking(fresh.token,overnightData);
assert.equal(overnightQuote.durationMinutes,120);
assert.equal(overnightQuote.endUTC,'2030-01-09T19:30:00.000Z');
const overnightBooking=ctx.submitCandidateBooking(fresh.token,overnightData);
const overnightBookingRow=ctx.findOne_(sheets.get('InterviewsV3'),'BookingID',overnightBooking.bookingId);
assert.equal(overnightBookingRow.StartUTC,'2030-01-09T17:30:00.000Z');
assert.equal(overnightBookingRow.EndUTC,'2030-01-09T19:30:00.000Z');
assert.throws(()=>ctx.adminCreateBooking(admin.token,{candidateId:id,date:'2030-01-08',startTime:'23:00',endTime:'01:00',interviewType:'Admin test',override:true,overnightConfirmed:false}),/Confirm that this is an overnight booking/);
const adminBooking=ctx.adminCreateBooking(admin.token,{candidateId:id,date:'2030-01-08',startTime:'23:00',endTime:'01:00',interviewType:'Admin test',override:true,overnightConfirmed:true});
const adminBookingRow=ctx.findOne_(sheets.get('InterviewsV3'),'BookingID',adminBooking.bookingId);
assert.equal(adminBookingRow.DurationMinutes,120);
assert.equal(adminBookingRow.StartUTC,'2030-01-08T17:30:00.000Z');
assert.equal(adminBookingRow.EndUTC,'2030-01-08T19:30:00.000Z');
ctx.updateObjectRow_(sheets.get('InterviewsV3'),adminBookingRow._row,{StartUTC:'2000-01-01T00:00:00Z'});
assert.throws(()=>ctx.adminCancelBooking(admin.token,adminBooking.bookingId),/no longer be cancelled/);
assert.equal(ctx.findOne_(sheets.get('InterviewsV3'),'BookingID',adminBooking.bookingId).BookingStatus,'CONFIRMED');
ctx.updateObjectRow_(sheets.get('InterviewsV3'),adminBookingRow._row,{StartUTC:adminBookingRow.StartUTC});
ctx.adminUpdateBooking(admin.token,{bookingId:adminBooking.bookingId,finalCharge:60});
ctx.adminCancelBooking(admin.token,adminBooking.bookingId);
assert.throws(()=>ctx.adminUpdateBooking(admin.token,{bookingId:adminBooking.bookingId,finalCharge:99}),/Cancelled bookings/);
const cancelledAt=ctx.findOne_(sheets.get('InterviewsV3'),'BookingID',adminBooking.bookingId).CancelledAtUTC;
ctx.adminCancelBooking(admin.token,adminBooking.bookingId);
assert.equal(ctx.findOne_(sheets.get('InterviewsV3'),'BookingID',adminBooking.bookingId).CancelledAtUTC,cancelledAt);
assert.throws(()=>ctx.adminVerifyPayment(admin.token,payment.PaymentID,'FAILED',''),/already verified/);
assert.equal(ctx.findOne_(sheets.get('InterviewsV3'),'BookingID',adminBooking.bookingId).BookingStatus,'CANCELLED');
assert.equal(ctx.migrateLegacyInterviews().imported,0);
ctx.adminUpdateCandidate(admin.token,{candidateId:id,type:'REGULAR',active:false});
assert.throws(()=>ctx.getCandidateHome(fresh.token),/Session expired/);
ctx.adminUpdateCandidate(admin.token,{candidateId:id,type:'REGULAR',active:true});
assert.throws(()=>ctx.getCandidateHome(fresh.token),/Session expired/);
// Existing sheet upgrades append auth fields without moving custom columns or rows.
const original=sheets.get('Candidates'),old=new Sheet('Candidates');
old.data=[['Email','CandidateID','Custom'],['old@example.com','AV-OLD','keep']];sheets.set('Candidates',old);
ctx.upgradeCandidateAuthentication();ctx.upgradeCandidateAuthentication();
assert.deepEqual(old.data[0].slice(0,3),['Email','CandidateID','Custom']);assert.deepEqual(old.data[1],['old@example.com','AV-OLD','keep']);
assert.equal(new Set(old.data[0]).size,old.data[0].length);sheets.set('Candidates',original);
// Client script parses, and all RPC names have matching server endpoints.
const html=fs.readFileSync('Index.html','utf8'),client=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(client);
for(const m of client.matchAll(/call\('([^']+)'/g))assert.equal(typeof ctx[m[1]],'function',m[1]);
assert(client.includes('role=validated.role'));
// Execute actual browser restoration against sheet-backed server sessions.
async function browserChecks(){
  const session=ctx.newSession_({role:'candidate',candidateId:id,email:'test@example.com'});
  const storage=new Map([['interviewPortalSession',JSON.stringify({token:session,role:'admin'})]]);
  const elements=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',add(){},addEventListener(){},classList:{items:new Set(),toggle(k,on){if(on)this.items.add(k);else this.items.delete(k);},add(k){this.items.add(k);},remove(k){this.items.delete(k);},contains(k){return this.items.has(k);}}});return elements.get(id);};
  const browser=vm.createContext({console,Intl,Date,JSON,Promise,setTimeout,Option:function(){},alert(){},document:{getElementById:element,querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
  vm.runInContext(client.replace(/restoreSession\(\);\s*$/,''),browser);
  browser.serverCall=async(fn,...args)=>ctx[fn](...args);
  vm.runInContext('call=serverCall',browser);
  assert(!html.includes('id="fId"'));
  element('lId').value=id;element('lMsg').innerHTML='Invalid Candidate ID/email or password';
  browser.showForgot();assert.equal(element('fEmail').value,'');assert.equal(element('lMsg').innerHTML,'');
  element('lId').value='test@example.com';browser.showForgot();
  assert.equal(element('fEmail').value,'test@example.com');
  let resetArgs;
  browser.recoveryCall=async(fn,...args)=>{
    if(fn==='requestPasswordReset'){assert.deepEqual(args,['test@example.com','test@example.com']);return {candidateId:id};}
    assert.equal(fn,'resetCandidatePassword');resetArgs=args;return {ok:true};
  };
  vm.runInContext('call=recoveryCall',browser);
  await browser.sendReset();element('fOtp').value='123456';element('fPass').value='new-password';element('fPass2').value='new-password';
  element('lMsg').innerHTML='Old login error';await browser.doReset();
  assert.deepEqual(resetArgs,[id,'123456','new-password']);
  assert(element('lMsg').innerHTML.includes('Password reset successfully'));
  assert(!element('lMsg').innerHTML.includes('Old login error'));
  assert(!element('candidateLogin').classList.contains('hidden'));
  assert(element('forgot').classList.contains('hidden'));
  assert.equal(element('fPass').value,'');assert.equal(element('lPass').value,'');
  vm.runInContext('call=serverCall',browser);
  console.log('PASS email-only recovery form and clean login screen after password reset');
  await browser.restoreSession();
  assert.equal(vm.runInContext('role',browser),'candidate');
  assert.equal(JSON.parse(storage.get('interviewPortalSession')).token,session);
  assert(element('topUser').textContent.includes(id));
  await browser.logoutNow();
  assert(!storage.has('interviewPortalSession'));
  assert.throws(()=>ctx.validateSession(session),/Session expired/);
  assert(element('candidateApp').classList.contains('hidden'));
  assert(element('adminApp').classList.contains('hidden'));
  assert(!element('landing').classList.contains('hidden'));
  assert.equal(element('topUser').textContent,'');
  assert.equal(vm.runInContext('home',browser),null);
  const adminSession=ctx.adminLogin('admin@example.com','admin-password').token;
  storage.set('interviewPortalSession',JSON.stringify({token:adminSession}));
  await browser.restoreSession();await browser.logoutNow();
  assert(element('adminApp').classList.contains('hidden'));
  assert(!element('landing').classList.contains('hidden'));
  assert.throws(()=>ctx.validateSession(adminSession),/Session expired/);
  const changeToken=ctx.adminLogin('admin@example.com','admin-password').token;
  const anotherAdminToken=ctx.adminLogin('admin@example.com','admin-password').token;
  assert.throws(()=>ctx.adminChangePassword(changeToken,'wrong-password','new-admin-password'),/Current password is incorrect/);
  assert.throws(()=>ctx.adminChangePassword(changeToken,'admin-password','short'),/between 8 and 1024/);
  ctx.adminChangePassword(changeToken,'admin-password','new-admin-password');
  assert.throws(()=>ctx.validateSession(changeToken),/Session expired/);
  assert.throws(()=>ctx.validateSession(anotherAdminToken),/Session expired/);
  assert.throws(()=>ctx.adminLogin('admin@example.com','admin-password'),/Invalid admin credentials/);
  const newAdminToken=ctx.adminLogin('admin@example.com','new-admin-password').token;
  assert.equal(ctx.validateSession(newAdminToken).role,'admin');
  assert.throws(()=>ctx.adminChangePassword(changeToken,'admin-password','another-password'),/Session expired/);
  storage.set('interviewPortalSession',JSON.stringify({token:session}));
  await browser.restoreSession();assert(!storage.has('interviewPortalSession'));
  console.log('PASS candidate/admin logout returns to welcome screen without reload and revokes sessions');
  storage.set('interviewPortalSession','malformed');await browser.restoreSession();assert(!storage.has('interviewPortalSession'));
  assert(html.includes("candTab('password')\">Change Password"));
  assert(html.includes("renderPasswordChange('adminPassword','Change Password')"));
  assert(html.includes("role==='admin'?'adminChangePassword':'changeCandidatePassword'"));
  console.log('PASS browser refresh, server-authoritative role, revoked session and malformed storage');
  console.log('PASS admin password change verifies current password, enforces policy, replaces login password and revokes admin sessions');
}
browserChecks().catch(e=>{console.error(e);process.exitCode=1;});
console.log('PASS authentication, migration, recovery, sessions, Candidates read/write schema, booking/payment/refund/calendar/contacts/admin and client RPC checks');
console.log('Mock runtime: '+((Date.now()-start)/1000).toFixed(1)+'s; Apps Script performance requires a deployed smoke test.');
