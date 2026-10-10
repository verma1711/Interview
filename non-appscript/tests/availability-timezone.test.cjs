const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const settings={BUSINESS_TIMEZONE:'America/New_York',BUFFER_BEFORE_MINUTES:0,BUFFER_AFTER_MINUTES:0,PRICE_SHORT_USD:50,PRICE_LONG_USD:70,PRICE_SHORT_THRESHOLD_MINUTES:30,PRICE_BLOCK_MINUTES:60,CALENDAR_NAME:'Interviews'};
let rules=[{RuleType:'WEEKLY',Weekday:'Mon',StartTime:'12:00',EndTime:'20:00',Enabled:true}];
const ctx=vm.createContext({Date,Intl,console});for(const file of ['00_Config.js','03_Bookings.js','04_Admin.js','06_BookingIntegrity.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
ctx.getSetting_=(key,fallback)=>settings[key]??fallback;ctx.getAllSettings_=()=>({...settings});ctx.setSetting_=(key,value)=>{settings[key]=value};ctx.requireSession_=()=>({email:'admin'});ctx.authLock_=fn=>fn();ctx.audit_=()=>{};ctx.sh_=()=>({});ctx.getSS_=()=>({getSpreadsheetTimeZone:()=> 'Asia/Kolkata'});ctx.rowsAsObjects_=()=>rules;
const start=new Date('2030-01-07T17:00:00Z'),end=new Date('2030-01-07T17:30:00Z');assert(ctx.withinWorkingHours_(start,end).ok);
ctx.adminUpdateSettings('admin',{BUSINESS_TIMEZONE:'Asia/Kolkata'});assert.equal(settings.AVAILABILITY_TIMEZONE,'America/New_York');assert(ctx.withinWorkingHours_(start,end).ok);assert(!ctx.withinWorkingHours_(new Date('2030-01-07T06:30:00Z'),new Date('2030-01-07T07:00:00Z')).ok);
ctx.adminUpdateSettings('admin',{BUSINESS_TIMEZONE:'Europe/London'});assert.equal(settings.AVAILABILITY_TIMEZONE,'America/New_York');assert(ctx.withinWorkingHours_(start,end).ok);assert.throws(()=>ctx.adminSaveAvailability('admin',[],'Asia/Kolkata'),/timezone changed/);
const html=fs.readFileSync('Index.html','utf8');const client=vm.createContext({Date,Intl,Map,adminData:{nowUTC:'2030-01-07T12:00:00Z',settings:{BUSINESS_TIMEZONE:'Asia/Kolkata',AVAILABILITY_TIMEZONE:'America/New_York'},availability:rules},preferredTimeFormat:()=> '24',adminBusinessTimezone:()=> 'Asia/Kolkata',esc:String});
vm.runInContext(html.slice(html.indexOf('const portalFormatters='),html.indexOf('function quoteTimeMarkup(')),client);vm.runInContext(html.slice(html.indexOf('function availabilitySourceTimezone('),html.indexOf(' function avRow(')),client);
assert.equal(client.availabilityLocalUTC('2030-01-07','12:00','America/New_York'),'2030-01-07T17:00:00.000Z');assert.equal(client.availabilityLocalUTC('2030-07-08','12:00','America/New_York'),'2030-07-08T16:00:00.000Z');assert.throws(()=>client.availabilityLocalUTC('2030-03-10','02:30','America/New_York'),/Clock change/);assert.throws(()=>client.availabilityLocalUTC('2030-11-03','01:30','America/New_York'),/Clock change/);
let view=client.renderAvailabilityPreview('2030-01-07');assert(view.includes('22:30'));assert(view.includes('06:30'));assert(view.includes('08-01-30'));view=client.renderAvailabilityPreview('2030-07-08');assert(view.includes('21:30'));
client.adminData.availability=[{RuleType:'BLOCK',Date:'2030-01-07',StartTime:'',EndTime:'',Note:''}];view=client.renderAvailabilityPreview('2030-01-07');assert(view.includes('10:30'));assert(view.includes('08-01-30'));assert(!view.includes('Clock change'));
client.preferredTimeFormat=()=> '12';view=client.renderAvailabilityPreview('2030-01-07');assert(view.includes('AM'));
console.log('PASS availability timezone preservation, repeated timezone changes, stale save guard, winter/summer conversion, next-day dates, full-day blocks and DST edge rejection');


// An explicit availability timezone is saved separately from the general display zone.
const columns=['RuleID','RuleType','Weekday','Date','StartTime','EndTime','Enabled','Note'];
ctx.headers_=()=>columns;ctx.uuid_=()=> 'AVL-TEST';ctx.sheetValue_=v=>v;
ctx.sh_=()=>({getLastRow:()=>rules.length+1,getRange:()=>({setValues:values=>{rules=values.filter(row=>row[0]).map(row=>Object.fromEntries(columns.map((key,i)=>[key,row[i]])));}})});
assert.throws(()=>ctx.adminSaveAvailability('admin',[],'America/New_York','Invalid/Zone'),/valid availability business timezone/);
ctx.adminSaveAvailability('admin',[{ruleType:'WEEKLY',weekday:'Mon',startTime:'12:00',endTime:'20:00',enabled:true}],'America/New_York','Asia/Kolkata');
assert.equal(settings.AVAILABILITY_TIMEZONE,'Asia/Kolkata');assert.equal(settings.BUSINESS_TIMEZONE,'Europe/London');
assert(ctx.withinWorkingHours_(new Date('2030-01-07T06:30:00Z'),new Date('2030-01-07T07:00:00Z')).ok);
console.log('PASS independent availability business timezone selection, validation and booking checks');

vm.runInContext(html.slice(html.indexOf('function adminBookingTimePayload('),html.indexOf('function renderCreate(){')),client);
client.adminBusinessTimezone=()=> 'Asia/Kolkata';
let payload=client.adminBookingTimePayload('2030-01-07','12:00','13:00',false,'America/New_York');assert.equal(payload.startTime,'22:30');assert.equal(payload.endTime,'23:30');assert.equal(payload.timezone,'Asia/Kolkata');
payload=client.adminBookingTimePayload('2030-01-07','14:00','15:00',false,'America/New_York');assert.equal(payload.date,'2030-01-08');assert.equal(payload.startTime,'00:30');
payload=client.adminBookingTimePayload('2030-01-07','13:00','14:00',false,'America/New_York');assert.equal(payload.overnightConfirmed,true);assert.equal(payload.startTime,'23:30');assert.equal(payload.endTime,'00:30');
assert.throws(()=>client.adminBookingTimePayload('2030-01-07','23:00','01:00',false,'America/New_York'),/Confirm/);
client.adminBusinessTimezone=()=> 'America/New_York';assert.throws(()=>client.adminBookingTimePayload('2030-11-03','05:30','06:30',false,'UTC'),/Clock change/);
console.log('PASS Create Booking availability-zone input conversion, midnight/date shift and DST ambiguity guard');
