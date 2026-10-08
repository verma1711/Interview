function calculateCharge_(durationMinutes){
  const block=Number(getSetting_('PRICE_BLOCK_MINUTES',60)), threshold=Number(getSetting_('PRICE_SHORT_THRESHOLD_MINUTES',30)), short=Number(getSetting_('PRICE_SHORT_USD',50)), long=Number(getSetting_('PRICE_LONG_USD',70));
  if(!Number.isFinite(block)||block<=0||!Number.isFinite(threshold)||threshold<0||threshold>block||![short,long].every(n=>Number.isFinite(n)&&n>=0))throw new Error('Invalid pricing settings. Contact Admin.');
  if(!Number.isFinite(durationMinutes)||durationMinutes<=0) throw new Error('Duration must be greater than zero.'); const full=Math.floor(durationMinutes/block),remainder=durationMinutes%block;
  const total=full*(block<=threshold?short:long)+(remainder>0?(remainder<=threshold?short:long):0);
  if(!Number.isFinite(total))throw new Error('Invalid pricing settings.');return money_(total);
}
// Public projection: never expose booking/candidate identifiers or payment data.
function getPublicBookedTimes(dateStr,timezone){
  const date=clean_(dateStr),tz=clean_(timezone)||businessTimezone_();
  if(!validateTimezone_(tz))throw new Error('Select a valid timezone.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Select a valid date.');
  const check=new Date(date+'T12:00:00Z');
  if(!Number.isFinite(check.getTime())||check.toISOString().slice(0,10)!==date)throw new Error('Select a valid date.');
  const booked=rowsAsObjects_(sh_(APP.SHEETS.INTERVIEWS)).filter(b=>{
    if(b.BookingStatus!=='CONFIRMED')return false;
    const start=new Date(b.StartUTC),end=new Date(b.EndUTC);
    if(!Number.isFinite(+start)||!Number.isFinite(+end)||end<=start)return false;
    // Compare local calendar dates; end is exclusive. Handles 23/25-hour days
    // and zones where midnight itself is skipped by a clock transition.
    const first=localKey_(partsInZone_(start,tz)).slice(0,10);
    const last=localKey_(partsInZone_(new Date(+end-1),tz)).slice(0,10);
    return first<=date&&last>=date;
  }).sort((a,b)=>new Date(a.StartUTC)-new Date(b.StartUTC))
    .map(b=>{
      const start=new Date(b.StartUTC),end=new Date(b.EndUTC);
      const day=d=>new Intl.DateTimeFormat('en-GB',{timeZone:tz,day:'2-digit',month:'short',year:'numeric'}).format(d);
      const time=d=>new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',minute:'2-digit'}).format(d);
      return {from:formatInZone_(b.StartUTC,tz),to:formatInZone_(b.EndUTC,tz),date:day(start),start:time(start),end:time(end)+(day(start)!==day(end)?' ('+day(end)+')':'')};
    });
  return {date,timezone:tz,booked};
}
function quoteBooking(token,data){
  const sess=requireSession_(token,'candidate'), c=findOne_(sh_(APP.SHEETS.CANDIDATES),'CandidateID',sess.candidateId);
  const quote=quoteForCandidate_(c,data,false);
  if(quote.available&&quote.paymentRequired){
    const upi=clean_(getSetting_('UPI_ID','')),qr=clean_(getSetting_('UPI_QR_URL',''));
    quote.upiId=upi&&upi!=='CHANGE_ME@upi'?upi:'';
    quote.upiQrUrl=paymentQrImageUrl_(qr);
    quote.upiQrLink=quote.upiQrUrl?qr:'';
  }
  return quote;
}
function paymentQrImageUrl_(value){
  const url=clean_(value);
  if(!url)return '';
  if(!/^https:\/\/[^\s]+$/i.test(url))throw new Error('QR image URL must use HTTPS.');

  const imageExt=/\.(png|jpe?g|gif|webp|bmp|svg)(?:[?#]|$)/i;
  if(!/^https:\/\/drive\.google\.com(?:\/|$)/i.test(url)) {
    return imageExt.test(url) ? url : '';
  }

  if(/\/folders\//i.test(url))throw new Error('Use the Drive link to your QR image file, not a folder.');

  const file=/\/file\/d\/([\w-]+)(?:\/|[?#]|$)/.exec(url)
    ||/[?&](?:id|documentid)=([\w-]+)(?:&|#|$)/i.exec(url)
    ||/\/open\?id=([\w-]+)(?:&|#|$)/i.exec(url)
    ||/\/thumbnail\?id=([\w-]+)(?:&|#|$)/i.exec(url);
  if(!file) {
    if(/\/uc\?/.test(url) || /\/thumbnail\?/.test(url) || /\/open\?/.test(url)) return url;
    return '';
  }

  const resource=/[?&]resourcekey=([\w-]+)(?:&|#|$)/i.exec(url);
  return 'https://drive.google.com/thumbnail?id='+encodeURIComponent(file[1])+'&sz=w1000'+(resource?'&resourcekey='+encodeURIComponent(resource[1]):'');
}
function quoteForCandidate_(c,data,adminOverride){
  if(!data||!clean_(data.date)||!clean_(data.startTime)||!clean_(data.endTime)) throw new Error('Select a date, start time and end time before checking availability.');
  const date=clean_(data.date),startTime=clean_(data.startTime),endTime=clean_(data.endTime),tz=c.Timezone;
  const start=zonedLocalToUtc_(date,startTime,tz),end=zonedLocalToUtc_(bookingEndDate_(date,startTime,endTime,data.overnightConfirmed===true),endTime,tz);
  if(end<=start) throw new Error('End time must be after start time.');
  if(start.getTime()<=Date.now())throw new Error('Choose a future interview time.');
  const duration=minutesBetween_(start,end); const check=checkAvailability_(start,end,null,!!adminOverride); if(!check.ok) return {available:false,reason:check.reason};
  const calc=calculateCharge_(duration), paymentRequired=String(c.CandidateType).toUpperCase()==='REGULAR';
  return {available:true,startUTC:start.toISOString(),endUTC:end.toISOString(),durationMinutes:duration,calculatedChargeUSD:calc,finalChargeUSD:calc,paymentRequired,candidateDisplay:`${formatInZone_(start.toISOString(),tz)} - ${formatInZone_(end.toISOString(),tz)}`,adminDisplay:`${formatBusinessTime_(start.toISOString())} - ${formatBusinessTime_(end.toISOString())}`};
}
function getAvailabilityForDate(token,dateStr){const sess=requireSession_(token,'candidate'),c=findOne_(candidateSheet_(),'CandidateID',sess.candidateId);return {timezone:c.Timezone,booked:getPublicBookedTimes(dateStr,c.Timezone).booked.map(b=>({from:b.from,to:b.to,status:'BOOKED'}))};}
function submitCandidateBooking(token,data){return authLock_(()=>submitCandidateBooking_(token,data));}
function submitCandidateBooking_(token,data){
  const sess=requireSession_(token,'candidate'), c=findOne_(sh_(APP.SHEETS.CANDIDATES),'CandidateID',sess.candidateId), q=quoteForCandidate_(c,data,false); if(!q.available) throw new Error(q.reason);
  const isRegular=String(c.CandidateType).toUpperCase()==='REGULAR'; if(isRegular && !clean_(data.utr)) throw new Error('UTR/reference number is required for a regular candidate.');
  if(isRegular && rowsAsObjects_(sh_(APP.SHEETS.PAYMENTS)).some(p=>clean_(p.UTR).toUpperCase()===clean_(data.utr).toUpperCase())) throw new Error('This UTR/reference number has already been used.');
  {
    const paid=isRegular?nonNegativeNumber_(data.amountPaid==null||data.amountPaid===''?q.calculatedChargeUSD:data.amountPaid,'Amount paid'):0;
    if(isRegular&&paid<=0)throw new Error('Enter the amount paid.');
    if(data.expectedStartUTC&&(data.expectedStartUTC!==q.startUTC||data.expectedEndUTC!==q.endUTC||Number(data.expectedCharge)!==q.finalChargeUSD||data.expectedPaymentRequired!==q.paymentRequired))throw new Error('Booking details or pricing changed. Check availability and price again.');
    const recheck=checkAvailability_(new Date(q.startUTC),new Date(q.endUTC),null,false); if(!recheck.ok) throw new Error('This slot was just taken. Please choose another time.');
    const bookingId=uuid_('INT'), finalCharge=q.calculatedChargeUSD, paymentStatus=isRegular?'SUBMITTED':'NOT_REQUIRED';
    appendObject_(sh_(APP.SHEETS.INTERVIEWS),{BookingID:bookingId,CandidateID:c.CandidateID,Name:c.Name,Email:c.Email,InterviewType:clean_(data.interviewType)||'Interview',StartUTC:q.startUTC,EndUTC:q.endUTC,DurationMinutes:q.durationMinutes,CandidateTimezone:c.Timezone,CalculatedChargeUSD:q.calculatedChargeUSD,FinalChargeUSD:finalCharge,AmountPaidUSD:paid,PercentageSnapshot:String(c.CandidateType).toUpperCase()==='PERCENTAGE'?Number(c.Percentage||0):'',BookingStatus:'CONFIRMED',PaymentStatus:paymentStatus,UTR:isRegular?clean_(data.utr):'',CalendarEventID:'',RefundStatus:'NOT_REQUIRED',Remark:'',CreatedAtUTC:nowIso_(),CancelledAtUTC:'',LegacySource:''});
    if(isRegular) appendObject_(sh_(APP.SHEETS.PAYMENTS),{PaymentID:uuid_('PAY'),BookingID:bookingId,CandidateID:c.CandidateID,ExpectedAmountUSD:finalCharge,SubmittedAmountUSD:paid,UTR:clean_(data.utr),SubmittedAtUTC:nowIso_(),Status:'SUBMITTED',VerifiedAtUTC:'',Remark:''});
    queueBookingWork_(bookingId,'calendar',{c});
    queueBookingWork_(bookingId,'email',{c,q,regular:isRegular});
    audit_(c.CandidateID,'BOOKING_CREATE','INTERVIEW',bookingId,{paymentStatus}); return {ok:true,bookingId,display:q.candidateDisplay,charge:finalCharge,paymentStatus};
  }
}

function checkAvailability_(start,end,ignoreBookingId,adminOverride){
  if(!adminOverride){ const wh=withinWorkingHours_(start,end); if(!wh.ok) return wh; }
  const before=adminOverride?0:Number(getSetting_('BUFFER_BEFORE_MINUTES',30)), after=adminOverride?0:Number(getSetting_('BUFFER_AFTER_MINUTES',30));
  if(![before,after].every(n=>Number.isFinite(n)&&n>=0))throw new Error('Invalid buffer settings. Contact Admin.');
  const requestedProtectedStart=addMinutes_(start,-before), requestedProtectedEnd=addMinutes_(end,after);
  for(const x of rowsAsObjects_(sh_(APP.SHEETS.INTERVIEWS))){ if(x.BookingStatus!=='CONFIRMED'||x.BookingID===ignoreBookingId) continue; const es=addMinutes_(new Date(x.StartUTC),-before), ee=addMinutes_(new Date(x.EndUTC),after); if(requestedProtectedStart<ee && requestedProtectedEnd>es) return {ok:false,reason:'Slot is not available because it overlaps another interview or its preparation buffer.'}; }
  return {ok:true};
}
// Sheets can return date/time cells as Date objects. Read their wall-clock
// values in the spreadsheet timezone; availability uses BUSINESS_TIMEZONE later.
function availabilityRules_(){
  const sheetTimezone=getSS_().getSpreadsheetTimeZone();
  return rowsAsObjects_(sh_(APP.SHEETS.AVAILABILITY)).filter(r=>clean_(r.RuleType)).map(r=>{
    const rule=Object.assign({},r);
    ['Date','StartTime','EndTime'].forEach(key=>{
      const value=rule[key];
      rule[key]=value instanceof Date?Utilities.formatDate(value,sheetTimezone,key==='Date'?'yyyy-MM-dd':'HH:mm'):clean_(value);
    });
    return rule;
  });
}
function withinWorkingHours_(start,end){
  const tz=String(getSetting_('BUSINESS_TIMEZONE','America/New_York')), startParts=partsInZone_(start,tz), endParts=partsInZone_(new Date(end.getTime()-1),tz);
  const date=`${startParts.year}-${startParts.month}-${startParts.day}`, endDate=`${endParts.year}-${endParts.month}-${endParts.day}`;
  if(endDate!==date&&endDate!==addLocalDays_(date,1)) return {ok:false,reason:'Interview must end by the following local day.'};
  const intervalDates=endDate===date?[date]:[date,endDate];
  const rules=availabilityRules_().filter(r=>asBool_(r.Enabled));
  const blockDates=[addLocalDays_(date,-1),...intervalDates];
  const blocks=rules.filter(r=>r.RuleType==='BLOCK'&&blockDates.includes(clean_(r.Date)));
  for(const b of blocks){
    if(!b.StartTime&&!b.EndTime){if(intervalDates.includes(clean_(b.Date)))return {ok:false,reason:'This date is blocked by Admin.'};continue;}
    const blockEndDate=bookingEndDate_(clean_(b.Date),clean_(b.StartTime),clean_(b.EndTime),true);
    const bs=zonedLocalToUtc_(clean_(b.Date),clean_(b.StartTime),tz),be=zonedLocalToUtc_(blockEndDate,clean_(b.EndTime),tz);
    if(start<be&&end>bs)return {ok:false,reason:'This time is blocked by Admin.'};
  }
  const previousDate=addLocalDays_(date,-1),previousWeekday=partsInZone_(zonedLocalToUtc_(previousDate,'12:00',tz),tz).weekday;
  const weekly=rules.filter(r=>r.RuleType==='WEEKLY'&&(r.Weekday===startParts.weekday||r.Weekday===previousWeekday));
  if(!weekly.length)return {ok:false,reason:'Admin is not available on this day.'};
  for(const r of weekly){
    const ruleDate=r.Weekday===startParts.weekday?date:previousDate;
    const windowEndDate=bookingEndDate_(ruleDate,clean_(r.StartTime),clean_(r.EndTime),true);
    const ws=zonedLocalToUtc_(ruleDate,clean_(r.StartTime),tz),we=zonedLocalToUtc_(windowEndDate,clean_(r.EndTime),tz);
    if(start>=ws&&end<=we)return {ok:true};
  }
  return {ok:false,reason:'Requested interview is outside Admin availability.'};
}
function candidateBookings_(c){
  return rowsAsObjects_(sh_(APP.SHEETS.INTERVIEWS)).filter(x=>x.CandidateID===c.CandidateID).sort((a,b)=>new Date(b.StartUTC)-new Date(a.StartUTC)).map(x=>({bookingId:x.BookingID,type:x.InterviewType,start:formatInZone_(x.StartUTC,c.Timezone),end:formatInZone_(x.EndUTC,c.Timezone),startUTC:x.StartUTC,status:x.BookingStatus,paymentStatus:x.PaymentStatus,refundStatus:x.RefundStatus,charge:Number(x.FinalChargeUSD||0),canCancel:x.BookingStatus==='CONFIRMED'&&new Date()<new Date(x.StartUTC)}));
}
function cancelCandidateBooking(token,bookingId){return authLock_(()=>{const sess=requireSession_(token,'candidate'),b=findOne_(sh_(APP.SHEETS.INTERVIEWS),'BookingID',bookingId);if(!b||b.CandidateID!==sess.candidateId)throw new Error('Booking not found.');return cancelBookingInternal_(b,sess.candidateId);});}

function createCalendarEvent_(bookingId,c,type,startIso,endIso,calendarName){
  const name=calendarName||String(getSetting_('CALENDAR_NAME','Interview Bookings'));
  let cal=CalendarApp.getCalendarsByName(name)[0];if(!cal)cal=CalendarApp.createCalendar(name);
  const marker='Booking: '+bookingId;
  const existing=cal.getEvents(new Date(startIso),new Date(endIso)).find(e=>e.getDescription().split('\n')[0]===marker);
  const ev=existing||cal.createEvent('Interview - '+c.CandidateID+' - '+(clean_(type)||'Interview'),new Date(startIso),new Date(endIso),{description:marker+'\nCandidate: '+c.CandidateID+'\nName: '+c.Name+'\nEmail: '+c.Email+'\nPhone: '+c.PhoneE164});
  return cal.getId()+'|'+ev.getId();
}
function deleteCalendarEvent_(reference){
  if(!reference)return;
  const separator=String(reference).indexOf('|');
  const cal=separator>=0?CalendarApp.getCalendarById(String(reference).slice(0,separator)):CalendarApp.getCalendarsByName(String(getSetting_('CALENDAR_NAME','Interview Bookings')))[0];
  if(!cal)throw new Error('Booking calendar is unavailable. Restore access and retry pending work.');
  const ev=cal.getEventById(separator>=0?String(reference).slice(separator+1):reference);if(ev)ev.deleteEvent();
}

function sendBookingEmails_(c,b,q,isRegular,utr){ MailApp.sendEmail({to:c.Email,subject:`Booking confirmed - ${b.BookingID}`,htmlBody:`<p>Hello ${escapeHtml_(c.Name)},</p><p>Your booking is confirmed.</p><p><b>${escapeHtml_(q.candidateDisplay)}</b></p><p>Interview type: ${escapeHtml_(b.InterviewType)}</p><p>Booking ID: ${b.BookingID}</p>${isRegular?`<p>Payment reference submitted: ${escapeHtml_(utr)}. Payment verification is pending.</p>`:''}`}); notifyAdmin_('New interview booking',`Booking ${b.BookingID}\nCandidate ${c.CandidateID} - ${c.Name}\n${q.adminDisplay}\n${isRegular?'UTR: '+utr:'Percentage candidate - no payment required'}`); }
function notifyAdmin_(subject,body){ MailApp.sendEmail(String(getSetting_('ADMIN_NOTIFICATION_EMAIL',getSetting_('ADMIN_EMAIL',''))),subject,body); }
