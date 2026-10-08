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

ctx.setupInterviewPortal('admin@example.com','Admin123!');
ctx.setSetting_('BUSINESS_TIMEZONE','Asia/Kolkata');
ctx.setSetting_('UPI_QR_URL',process.env.PREVIEW_UPI_QR_URL||'https://drive.google.com/file/d/1a7I0arBtGLk5I_-P5B98nfd_KFAX6891/view');
const makeCandidate=(name,email,type)=>{
 const c=ctx.createCandidateInternal_({name,email,phone:'+919000000001',countryCode:'+91',timezone:'Asia/Kolkata',type,percentage:type==='PERCENTAGE'?20:0});
 props.set('CANDIDATE_PASSWORD_'+c.CandidateID,'preview:'+ctx.hash_('previewCandidate123!'));
 return c;
};
const candidates=[makeCandidate('Anurag Demo','candidate@example.com','REGULAR'),makeCandidate('Maya Demo','maya@example.com','PERCENTAGE'),makeCandidate('Alex Demo','alex@example.com','REGULAR')];
for(let i=0;i<9;i++){
 const c=candidates[i%3],start=new Date();start.setUTCHours(7+i,0,0,0);start.setUTCDate(start.getUTCDate()+Math.floor(i/3));
 const bid='INT-DEMO-'+(i+1),percentage=c.CandidateType==='PERCENTAGE',cancelled=i===2;
 ctx.appendObject_(sheets.get('InterviewsV3'),{BookingID:bid,CandidateID:c.CandidateID,Name:c.Name,Email:c.Email,InterviewType:['Technical','Coding','HR'][i%3],StartUTC:start.toISOString(),EndUTC:new Date(+start+1800000).toISOString(),DurationMinutes:30,CandidateTimezone:c.Timezone,CalculatedChargeUSD:50,FinalChargeUSD:50,AmountPaidUSD:percentage?0:50,PercentageSnapshot:percentage?20:'',BookingStatus:cancelled?'CANCELLED':'CONFIRMED',PaymentStatus:percentage?'NOT_REQUIRED':i%2?'VERIFIED':'SUBMITTED',UTR:percentage?'':'DEMO-UTR-'+i,CalendarEventID:'',RefundStatus:cancelled?'REQUESTED':'NOT_REQUIRED',CreatedAtUTC:new Date().toISOString()});
 if(!percentage)ctx.appendObject_(sheets.get('Payments'),{PaymentID:'PAY-DEMO-'+i,BookingID:bid,CandidateID:c.CandidateID,ExpectedAmountUSD:50,SubmittedAmountUSD:50,UTR:'DEMO-UTR-'+i,Status:i%2?'VERIFIED':'SUBMITTED',SubmittedAtUTC:new Date().toISOString()});
 if(cancelled)ctx.appendObject_(sheets.get('Refunds'),{RefundID:'REF-DEMO-'+i,BookingID:bid,CandidateID:c.CandidateID,AmountUSD:50,Status:'REQUESTED',RequestedAtUTC:new Date().toISOString()});
}
module.exports={ctx,mail,sheets};
