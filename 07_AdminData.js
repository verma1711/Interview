// Bounded browser responses. Sheets still scans records for global counts/search.
function getAdminOverview(token){
  requireSession_(token,'admin');
  const bookings=rowsAsObjects_(sh_(APP.SHEETS.INTERVIEWS)),payments=rowsAsObjects_(sh_(APP.SHEETS.PAYMENTS)),refunds=rowsAsObjects_(sh_(APP.SHEETS.REFUNDS));
  return {remote:true,availabilityTimezoneEditable:true,nowUTC:nowIso_(),counts:{candidates:rowsAsObjects_(sh_(APP.SHEETS.CANDIDATES)).length,upcoming:bookings.filter(b=>b.BookingStatus==='CONFIRMED'&&Date.parse(b.StartUTC)>Date.now()).length,pendingPayments:payments.filter(p=>p.Status==='SUBMITTED').length,refunds:refunds.filter(r=>r.Status==='REQUESTED').length},settings:getAllSettings_(),availability:availabilityRules_().map(stripRow_),bookings:[],candidates:[],payments:[],refunds:[],work:getBookingWorkStatus_(20)};
}
function adminCandidateView_(c){return {candidateId:c.CandidateID,name:c.Name,email:c.Email,phone:c.PhoneE164,type:c.CandidateType,percentage:Number(c.Percentage||0),timezone:c.Timezone,active:asBool_(c.Active)};}
function getAdminCandidateChoices(token){requireSession_(token,'admin');return rowsAsObjects_(sh_(APP.SHEETS.CANDIDATES)).filter(c=>asBool_(c.Active)).map(c=>({candidateId:c.CandidateID,name:c.Name,email:c.Email,active:true}));}
function getAdminPage(token,options){
  requireSession_(token,'admin');options=options||{};
  const kind=clean_(options.kind);if(!['dashboard','bookings','candidates','payments','refunds'].includes(kind))throw new Error('Invalid table.');
  const bookings=kind==='candidates'?[]:rowsAsObjects_(sh_(APP.SHEETS.INTERVIEWS)).map(b=>adminBookingView_(b,true)),candidates=rowsAsObjects_(sh_(APP.SHEETS.CANDIDATES)).map(adminCandidateView_);
  const bookingMap=new Map(bookings.map(b=>[b.bookingId,b])),candidateMap=new Map(candidates.map(c=>[c.candidateId,c]));
  let records=kind==='dashboard'||kind==='bookings'?bookings:kind==='candidates'?candidates:rowsAsObjects_(sh_(kind==='payments'?APP.SHEETS.PAYMENTS:APP.SHEETS.REFUNDS)).map(stripRow_);
  const query=clean_(options.query).toLowerCase().split(/\s+/).filter(Boolean),tz=businessTimezone_(),mode=options.date||'ALL',status=options.status||'ALL';
  if(mode==='RANGE'&&(!/^\d{4}-\d{2}-\d{2}$/.test(options.from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(options.to||'')||options.from>options.to))throw new Error('Select a valid start and end date.');
  const dayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}),dayCache=new Map();
  const day=iso=>{if(!iso||!Number.isFinite(Date.parse(iso)))return '';if(!dayCache.has(iso)){const p=Object.fromEntries(dayFormatter.formatToParts(new Date(iso)).map(p=>[p.type,p.value]));dayCache.set(iso,p.year+'-'+p.month+'-'+p.day);}return dayCache.get(iso);};
  const now=nowIso_(),today=day(now),relative=new Date(today+'T12:00:00Z');relative.setUTCDate(relative.getUTCDate()+(mode==='TOMORROW'?1:mode==='YESTERDAY'?-1:0));const target=relative.toISOString().slice(0,10);
  records=records.filter(r=>{
    const b=['payments','refunds'].includes(kind)?bookingMap.get(r.BookingID):r,c=candidateMap.get(r.candidateId||r.CandidateID||b?.candidateId);
    if(kind==='dashboard'&&r.status!=='CONFIRMED')return false;
    if(options.upcoming&&!(r.status==='CONFIRMED'&&Date.parse(r.startUTC)>Date.parse(now)))return false;
    if(status!=='ALL'&&![r.status,r.paymentStatus,r.refundStatus,r.Status].includes(status))return false;
    if(kind!=='candidates'&&mode!=='ALL'){const d=day(b?.startUTC);if(!d||(mode==='RANGE'?d<options.from||d>options.to:d!==target))return false;}
    const d=query.length?day(b?.startUTC):'',displayDate=d?d.slice(8)+'-'+d.slice(5,7)+'-'+d.slice(2,4):'';
    const text=[r,b,c].filter(Boolean).flatMap(x=>Object.values(x)).concat(d,displayDate).join(' ').toLowerCase();return query.every(q=>text.includes(q));
  });
  const keys={dashboard:['name','date','start','end','duration'],bookings:['bookingId','name','date','start','end','type','finalCharge','amountPaid','paymentStatus','status','refundStatus'],candidates:['candidateId','name','email','phone','type','percentage','timezone'],payments:['PaymentID','BookingID','ExpectedAmountUSD','SubmittedAmountUSD','UTR','Status'],refunds:['RefundID','BookingID','AmountUSD','Status']};
  const key=keys[kind][Number(options.sort?.column)]||(kind==='dashboard'?'start':kind==='bookings'?'start':keys[kind][0]);
  const ascending=options.sort?options.sort.ascending!==false:kind!=='bookings';
  const numeric=new Set(['duration','finalCharge','amountPaid','percentage','ExpectedAmountUSD','SubmittedAmountUSD','AmountUSD']);
  const value=r=>['date','start','end'].includes(key)?Date.parse(r[key==='end'?'endUTC':'startUTC'])||0:numeric.has(key)?Number(r[key])||0:String(r[key]||'');
  records.sort((a,b)=>{const x=value(a),y=value(b);return (ascending?1:-1)*(typeof x==='number'?x-y:x.localeCompare(y,undefined,{numeric:true,sensitivity:'base'}));});
  const size=Math.min(100,Math.max(1,Math.floor(Number(options.size)||50))),total=records.length,pages=Math.max(1,Math.ceil(total/size)),page=Math.min(pages,Math.max(1,Math.floor(Number(options.page)||1)));
  const items=records.slice((page-1)*size,page*size),relatedIds=new Set(items.map(r=>r.BookingID)),relatedBookings=['payments','refunds'].includes(kind)?bookings.filter(b=>relatedIds.has(b.bookingId)):kind==='candidates'?[]:items;
  const candidateIds=new Set(items.map(r=>r.candidateId||r.CandidateID));
  return {kind,items,page,pages,total,size,nowUTC:now,timezone:tz,bookings:relatedBookings,candidates:kind==='candidates'?items:candidates.filter(c=>candidateIds.has(c.candidateId))};
}
