const APP = Object.freeze({
  SHEETS: {
    CANDIDATES: 'Candidates', INTERVIEWS: 'InterviewsV3', PAYMENTS: 'Payments',
    REFUNDS: 'Refunds', SETTINGS: 'Settings', AVAILABILITY: 'Availability', AUDIT: 'Audit Log', SESSIONS: 'AuthSessions'
  },
  ADMIN_TZ: 'Asia/Kolkata', SESSION_SECONDS: 21600, OTP_SECONDS: 600,
  BUFFER_MINUTES_DEFAULT: 30
});

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Interview Booking Portal')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }

function getSS_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sh_(name) { const s=getSS_().getSheetByName(name); if(!s) throw new Error('Missing sheet: '+name+'. Run setupInterviewPortal().'); return s; }
function nowIso_() { return new Date().toISOString(); }
function uuid_(prefix) {
  const targets={INT:[APP.SHEETS.INTERVIEWS,'BookingID'],LEG:[APP.SHEETS.INTERVIEWS,'BookingID'],PAY:[APP.SHEETS.PAYMENTS,'PaymentID'],REF:[APP.SHEETS.REFUNDS,'RefundID'],AVL:[APP.SHEETS.AVAILABILITY,'RuleID'],AV:[APP.SHEETS.CANDIDATES,'CandidateID']};
  const target=targets[prefix];
  for(let attempt=0;attempt<100;attempt++) {
    const suffix=parseInt(Utilities.getUuid().replace(/-/g,'').slice(0,8),16).toString(36).toUpperCase().padStart(6,'0').slice(-6);
    const id=prefix+'-'+(prefix==='AV'?suffix.slice(-5):suffix);
    if(!target||!findOne_(sh_(target[0]),target[1],id))return id;
  }
  throw new Error('Unable to allocate an ID. Please retry.');
}
function clean_(v) { return String(v == null ? '' : v).trim(); }
function normEmail_(v) { return clean_(v).toLowerCase(); }
function asBool_(v) { return v===true || String(v).toUpperCase()==='TRUE' || String(v)==='1'; }
function minutesBetween_(a,b) { return Math.round((b.getTime()-a.getTime())/60000); }
function addMinutes_(d,m) { return new Date(d.getTime()+m*60000); }
function money_(n) { return Number(Number(n||0).toFixed(2)); }

function headers_(sheet) { return sheet.getLastColumn() ? sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0] : []; }
function rowsAsObjects_(sheet) {
  if(sheet.getLastRow()<2) return [];
  const h=headers_(sheet), vals=sheet.getRange(2,1,sheet.getLastRow()-1,h.length).getValues();
  return vals.map((r,i)=>{ const o={_row:i+2}; h.forEach((k,j)=>o[k]=r[j]); return o; });
}
function appendObject_(sheet,obj) {
  const h=headers_(sheet); sheet.appendRow(h.map(k=>sheetValue_(obj[k]===undefined?'':obj[k]))); return sheet.getLastRow();
}
function sheetValue_(value){return typeof value==='string'&&value.startsWith('=')?"'"+value:value;}
function updateObjectRow_(sheet,row,obj) {
  const h=headers_(sheet);
  Object.keys(obj).forEach(k=>{if(!h.includes(k))throw new Error('Missing '+sheet.getName()+' column: '+k);});
  Object.keys(obj).forEach(k=>sheet.getRange(row,h.indexOf(k)+1,1,1).setValues([[sheetValue_(obj[k])]]));
}
function findOne_(sheet,key,val) { return rowsAsObjects_(sheet).find(r=>String(r[key])===String(val)) || null; }
function getSetting_(key, fallback) { const r=findOne_(sh_(APP.SHEETS.SETTINGS),'Key',key); return r ? r.Value : fallback; }
function setSetting_(key,val) { const s=sh_(APP.SHEETS.SETTINGS), r=findOne_(s,'Key',key); if(r) updateObjectRow_(s,r._row,{Value:val}); else appendObject_(s,{Key:key,Value:val}); }
function audit_(actor,action,entity,id,details) { appendObject_(sh_(APP.SHEETS.AUDIT),{TimestampUTC:nowIso_(),Actor:actor,Action:action,Entity:entity,EntityID:id,Details:typeof details==='string'?details:JSON.stringify(details||{})}); }

function validateTimezone_(tz) { try { new Intl.DateTimeFormat('en-US',{timeZone:tz}).format(new Date()); return true; } catch(e){ return false; } }
function partsInZone_(date,tz) {
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(date);
  const o={}; p.forEach(x=>{ if(x.type!=='literal') o[x.type]=x.value; }); return o;
}
function localKey_(p){ return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`; }
function addLocalDays_(dateStr,days) {
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if(!m) throw new Error('Invalid date.');
  const date=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]+days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
}
function bookingEndDate_(dateStr,startTime,endTime,overnightConfirmed) {
  const start=/^(\d{1,2}):(\d{2})$/.exec(startTime),end=/^(\d{1,2}):(\d{2})$/.exec(endTime);
  if(!start||!end) throw new Error('Invalid date or time.');
  const startMinutes=Number(start[1])*60+Number(start[2]),endMinutes=Number(end[1])*60+Number(end[2]);
  if(startMinutes===endMinutes) throw new Error('End time must be different from start time.');
  if(endMinutes<startMinutes&&overnightConfirmed!==true)throw new Error('Confirm that this is an overnight booking to continue.');
  return endMinutes<startMinutes?addLocalDays_(dateStr,1):dateStr;
}
function zonedLocalToUtc_(dateStr,timeStr,tz) {
  if(!validateTimezone_(tz)) throw new Error('Invalid timezone.');
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr), t=/^(\d{1,2}):(\d{2})$/.exec(timeStr);
  if(!m||!t) throw new Error('Invalid date or time.');
  const target=`${m[1]}-${m[2]}-${m[3]}T${String(t[1]).padStart(2,'0')}:${t[2]}`;
  const guess=Date.UTC(+m[1],+m[2]-1,+m[3],+t[1],+t[2]); const matches=[];
  for(let delta=-900;delta<=900;delta++) { const d=new Date(guess+delta*60000); if(localKey_(partsInZone_(d,tz))===target) matches.push(d); }
  const uniq=[...new Map(matches.map(d=>[d.getTime(),d])).values()];
  if(uniq.length===0) throw new Error('That local time does not exist because of a daylight-saving time change. Choose another time.');
  if(uniq.length>1) throw new Error('That local time is ambiguous because clocks change on this date. Choose another time.');
  return uniq[0];
}
function formatInZone_(iso,tz) { const d=new Date(iso); return new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'short',day:'2-digit',hour:'numeric',minute:'2-digit',hour12:true,timeZoneName:'short'}).format(d); }
function formatIST_(iso) { return formatInZone_(iso,APP.ADMIN_TZ); }

function requireSession_(token, role) {
  const r=clean_(token)?findOne_(sh_(APP.SHEETS.SESSIONS),'TokenHash',hash_(token)):null;
  if(!r || !(new Date(r.ExpiresAtUTC).getTime()>Date.now())) throw new Error('Session expired. Please sign in again.');
  const s={role:r.Role,candidateId:r.CandidateID,email:r.Email};
  if(role && s.role!==role) throw new Error('Not authorized.');
  if(s.role==='candidate') {
    const c=findOne_(candidateSheet_(),'CandidateID',s.candidateId);
    if(!c||!asBool_(c.Active)||Number(c.AuthVersion||0)!==Number(r.AuthVersion||0)) throw new Error('Session expired. Please sign in again.');
  }
  return s;
}
function newSession_(data) {
  const token=Utilities.getUuid()+Utilities.getUuid();
  const c=data.role==='candidate'?findOne_(candidateSheet_(),'CandidateID',data.candidateId):null;
  appendObject_(sh_(APP.SHEETS.SESSIONS),{TokenHash:hash_(token),Role:data.role,CandidateID:data.candidateId||'',Email:data.email,AuthVersion:c?Number(c.AuthVersion||0):'',ExpiresAtUTC:new Date(Date.now()+APP.SESSION_SECONDS*1000).toISOString()});
  return token;
}
function hash_(s) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s),Utilities.Charset.UTF_8)); }

function businessTimezone_(){ return String(getSetting_('BUSINESS_TIMEZONE','America/New_York')); }
function formatBusinessTime_(iso){ return formatInZone_(iso,businessTimezone_()); }
