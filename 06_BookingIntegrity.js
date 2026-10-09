// Shared validation and recovery for the bound Google Apps Script project.
function nonNegativeNumber_(value,label,max) {
  const n=Number(value);
  if(clean_(value)===''||!Number.isFinite(n)||n<0||(max!=null&&n>max))throw new Error(label+' must be a valid non-negative number'+(max!=null?' no greater than '+max:'')+'.');
  return n;
}
function validDate_(value) {
  const d=new Date(value+'T12:00:00Z');
  return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(+d)&&d.toISOString().slice(0,10)===value;
}
function validTime_(value){return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);}
function validateSettings_(settings) {
  const merged=Object.assign({},getAllSettings_(),settings);
  if(!validateTimezone_(merged.BUSINESS_TIMEZONE))throw new Error('Invalid business timezone.');
  ['BUFFER_BEFORE_MINUTES','BUFFER_AFTER_MINUTES','PRICE_SHORT_USD','PRICE_LONG_USD','PRICE_SHORT_THRESHOLD_MINUTES'].forEach(k=>nonNegativeNumber_(merged[k],k));
  if(!(nonNegativeNumber_(merged.PRICE_BLOCK_MINUTES,'Price block')>0))throw new Error('Price block must be greater than zero.');
  if(Number(merged.PRICE_SHORT_THRESHOLD_MINUTES)>Number(merged.PRICE_BLOCK_MINUTES))throw new Error('Short threshold cannot exceed the price block.');
  if(!clean_(merged.CALENDAR_NAME))throw new Error('Calendar name is required.');
}
function validateAvailability_(rules){
  if(!Array.isArray(rules))throw new Error('Availability must be a list of rules.');
  rules.forEach((r,i)=>{
    const type=clean_(r.ruleType).toUpperCase(),start=clean_(r.startTime),end=clean_(r.endTime);
    const fail=()=>{throw new Error('Invalid availability rule '+(i+1)+'. Check the day, date and times.');};
    if(!['WEEKLY','BLOCK'].includes(type))fail();
    if(type==='WEEKLY'&&!['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].includes(r.weekday))fail();
    if(type==='BLOCK'&&!validDate_(clean_(r.date)))fail();
    if(type==='BLOCK'&&!start&&!end)return;
    if(!validTime_(start)||!validTime_(end)||start===end)fail();
  });
}
// Persist external work before attempting it. Failures do not undo saved bookings.
// Run retryPendingBookingWork() from the editor to retry failed Calendar/email work.
function queueBookingWork_(id,kind,payload){
  const key='BOOKING_WORK_'+id+'_'+kind;
  if(payload.c){const c=payload.c;payload=Object.assign({},payload,{c:{CandidateID:c.CandidateID,Name:c.Name,Email:c.Email,PhoneE164:c.PhoneE164}});}
  payload.calendarName=String(getSetting_('CALENDAR_NAME','Interview Bookings'));
  PropertiesService.getScriptProperties().setProperty(key,JSON.stringify({id,kind,payload}));
  runBookingWork_(key);
}
function runBookingWork_(key){
  const props=PropertiesService.getScriptProperties(),raw=props.getProperty(key);if(!raw)return;
  const job=JSON.parse(raw),b=findOne_(sh_(APP.SHEETS.INTERVIEWS),'BookingID',job.id);
  if(!b){props.deleteProperty(key);return;}
  try {
    if(job.kind==='calendar') {
      if(b.BookingStatus==='CONFIRMED'&&!b.CalendarEventID){
        const p=job.payload,eventId=createCalendarEvent_(b.BookingID,p.c,b.InterviewType,b.StartUTC,b.EndUTC,p.calendarName);
        updateObjectRow_(sh_(APP.SHEETS.INTERVIEWS),b._row,{CalendarEventID:eventId});
      }
    } else if(job.kind==='cancel')deleteCalendarEvent_(b.CalendarEventID);
    else if(job.kind==='email'&&b.BookingStatus==='CONFIRMED') {
      const p=job.payload;sendBookingEmails_(p.c,b,p.q,p.regular,b.UTR);
    } else if(job.kind==='refundEmail')notifyAdmin_('Refund requested','Booking '+b.BookingID+' was cancelled. Review its payment and refund records.');
    props.deleteProperty(key);
  } catch(e) {
    job.attempts=Number(job.attempts||0)+1;job.lastAttemptUTC=nowIso_();job.lastError=String(e.message||e).slice(0,500);props.setProperty(key,JSON.stringify(job));
    console.error('Pending booking work '+key+': '+e.message);
    try{audit_('SYSTEM','EXTERNAL_WORK_FAILED','INTERVIEW',job.id,{kind:job.kind,error:e.message});}catch(ignored){}
  }
}
function retryPendingBookingWork(){
  requireSetupOwner_();
  return authLock_(()=>{const keys=Object.keys(PropertiesService.getScriptProperties().getProperties()).filter(k=>k.startsWith('BOOKING_WORK_'));keys.forEach(runBookingWork_);return {attempted:keys.length};});
}
function ensureRefundRequest_(b){
  if(b.PaymentStatus==='NOT_REQUIRED'||b.PaymentStatus==='FAILED'||!(Number(b.AmountPaidUSD)>0))return false;
  const sheet=sh_(APP.SHEETS.REFUNDS),existing=findOne_(sheet,'BookingID',b.BookingID);
  if(!existing)appendObject_(sheet,{RefundID:uuid_('REF'),BookingID:b.BookingID,CandidateID:b.CandidateID,AmountUSD:nonNegativeNumber_(b.AmountPaidUSD,'Refund amount'),RequestedAtUTC:nowIso_(),Status:'REQUESTED',RefundedAtUTC:'',RefundUTR:'',AdminRemark:''});
  else if(existing.Status==='REJECTED')updateObjectRow_(sheet,existing._row,{Status:'REQUESTED',AdminRemark:''});
  updateObjectRow_(sh_(APP.SHEETS.INTERVIEWS),b._row,{RefundStatus:existing&&existing.Status==='REFUNDED'?'REFUNDED':'REQUESTED'});
  return !existing;
}
function cancelBookingInternal_(b,actor){
  if(b.BookingStatus!=='CANCELLED'&&(b.BookingStatus!=='CONFIRMED'||!(new Date(b.StartUTC)>new Date())))throw new Error('This booking can no longer be cancelled.');
  const refund=ensureRefundRequest_(b);
  updateObjectRow_(sh_(APP.SHEETS.INTERVIEWS),b._row,{BookingStatus:'CANCELLED',CancelledAtUTC:b.CancelledAtUTC||nowIso_()});
  queueBookingWork_(b.BookingID,'cancel',{});
  if(refund)queueBookingWork_(b.BookingID,'refundEmail',{});
  audit_(actor,'BOOKING_CANCEL','INTERVIEW',b.BookingID,{});return true;
}

function getBookingWorkStatus_(limit){
  const props=PropertiesService.getScriptProperties().getProperties(),keys=Object.keys(props).filter(k=>k.startsWith('BOOKING_WORK_'));
  const jobs=keys.map(key=>{try{const j=JSON.parse(props[key]);return {key,bookingId:j.id,kind:j.kind,attempts:Number(j.attempts||0),lastAttemptUTC:j.lastAttemptUTC||'',error:j.lastError||'Waiting to retry'};}catch(e){return {key,bookingId:'Unknown',kind:'invalid',attempts:0,lastAttemptUTC:'',error:'Invalid saved job. Owner review required.'};}});
  jobs.sort((a,b)=>(Date.parse(a.lastAttemptUTC)||0)-(Date.parse(b.lastAttemptUTC)||0));
  return {total:jobs.length,jobs:jobs.slice(0,limit||20)};
}
function adminRetryBookingWork(token,key){
  return authLock_(()=>{
    const sess=requireSession_(token,'admin');
    if(key){if(!key.startsWith('BOOKING_WORK_')||!PropertiesService.getScriptProperties().getProperty(key))throw new Error('Retry job not found.');runBookingWork_(key);}
    else getBookingWorkStatus_(10).jobs.forEach(j=>{if(j.kind!=='invalid')runBookingWork_(j.key);});
    const status=getBookingWorkStatus_(20);audit_(sess.email,'EXTERNAL_WORK_RETRY','SYSTEM',key||'BATCH',{remaining:status.total});return status;
  });
}
