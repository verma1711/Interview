const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('Index.html','utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
assert(html.includes("candTab('booked')\">Blocked Schedules"));
assert(html.includes("adminTab('booked')\">Blocked Schedules"));
assert(html.includes('data-admin-page="booked"'));
const bookedUi=vm.createContext({businessTimezoneOptions:timezone=>`<option selected>${timezone}</option>`,esc:value=>String(value??'')});
const bookedUiStart=script.indexOf('function renderBookedTimes('),bookedUiEnd=script.indexOf('\nasync function loadBookedTimes',bookedUiStart);
vm.runInContext(script.slice(bookedUiStart,bookedUiEnd),bookedUi);
const candidateBookedView=bookedUi.renderBookedTimes('candidateBooked','America/New_York');
assert(candidateBookedView.includes('id="candidateBookedDate"'));
assert(candidateBookedView.includes('id="candidateBookedTimezone"'));
assert(candidateBookedView.includes('America/New_York'));
assert(bookedUi.renderBookedTimesResult({timezone:'America/New_York',booked:[{date:'28 Sept 2026',start:'10:00 PM',end:'10:30 PM'}]}).includes('10:00 PM'));
const data={candidates:[{candidateId:'AV-1',name:'Anurag Verma',email:'test@example.com',active:true}],bookings:[{bookingId:'INT-1',candidateId:'AV-1',startIST:'Sep 28 2026',type:'Technical',status:'CONFIRMED'}],payments:[{PaymentID:'PAY-1',BookingID:'INT-1',CandidateID:'AV-1',UTR:'TEST-BOOKING-001',SubmittedAmountUSD:50,Status:'VERIFIED'}],refunds:[{RefundID:'REF-1',BookingID:'INT-1',CandidateID:'AV-1',AmountUSD:50,Status:'REFUNDED'}]};
const row={dataset:{searchIndex:'0'},classList:{toggle(_,hidden){row.hidden=hidden;}},unsavedValue:'75'};
const empty={classList:{toggle(_,hidden){empty.hidden=hidden;}}};
const ctx=vm.createContext({zones:['Asia/Kolkata','America/New_York'],document:{},withoutGmtOffset:s=>String(s??''),adminData:data,esc:s=>String(s??'').replaceAll('<','&lt;'),el:id=>id.startsWith('searchTable_')?{querySelectorAll:()=>[row]}:empty});
vm.runInContext(script.slice(script.indexOf('function adminBusinessTimezone('),script.indexOf('function showSignedOut(')),ctx);
for(const kind of ['candidates','bookings','payments','refunds']){
  assert(ctx.adminRecordMatches(kind,data[kind][0],'ANURAG test@example.com'));
  assert(!ctx.adminRecordMatches(kind,data[kind][0],'missing'));
  assert(ctx.adminRecordMatches(kind,data[kind][0],'   '));
  ctx.filterAdminRecords(kind,'missing');assert(row.hidden);assert.equal(empty.hidden,false);
  ctx.filterAdminRecords(kind,'anurag');assert.equal(row.hidden,false);assert(empty.hidden);assert.equal(row.unsavedValue,'75');
  const rendered=ctx['render'+kind[0].toUpperCase()+kind.slice(1)]();
  assert(rendered.includes('oninput="filterAdminRecords'));
  assert(rendered.includes('data-search-index="0"'));
}
assert(ctx.adminRecordMatches('payments',data.payments[0],'50 verified test-booking'));
assert(ctx.adminRecordMatches('refunds',data.refunds[0],'sep 28 refunded'));
assert(!ctx.renderCreate().includes('acSearch'));
assert(ctx.renderCreate().includes('Anurag Verma (AV-1)'));
assert(!ctx.renderCreate().includes('test@example.com'));
assert(!fs.readFileSync('04_Admin.js','utf8').includes('.slice(0,100)'));
const confirmed=data.bookings[0];
assert(ctx.bookingActions({...confirmed,startUTC:new Date(Date.now()+60000).toISOString()}).includes('Cancel booking'));
assert(!ctx.bookingActions({...confirmed,startUTC:new Date(Date.now()-60000).toISOString()}).includes('Cancel booking'));
const expiredButton={dataset:{cancelStart:new Date(Date.now()-1000).toISOString()},classList:{add(){expiredButton.hidden=true;}}};
ctx.document.querySelectorAll=()=>[expiredButton];ctx.hideExpiredCancelButtons();assert(expiredButton.hidden);
assert(ctx.bookingActions(confirmed).includes('>Edit</button>'));
assert(ctx.bookingActions(confirmed).includes('class="small hidden" onclick="saveBooking'));
assert(!ctx.bookingActions({...confirmed,status:'CANCELLED'}).includes('<button'));
assert.equal(ctx.bookingAmountCell({...confirmed,status:'CANCELLED'},'fc',50),'$50.00');
assert(ctx.bookingAmountCell(confirmed,'fc',50).includes('class="hidden"'));
assert(!ctx.renderPayments().includes('payAction('));
data.payments[0].Status='SUBMITTED';assert(ctx.renderPayments().includes('payAction('));
console.log('PASS confirmed booking Edit/hidden Save, read-only cancelled bookings and verified payment actions');
console.log('PASS live search across four tabs, related candidate/booking fields, case-insensitive terms, empty results, preserved edits and clean candidate dropdown');
const originalEl=ctx.el,fields=new Map();
ctx.el=id=>{if(!fields.has(id))fields.set(id,{value:'original',disabled:true,classList:{toggle(_,hidden){fields.get(id).hidden=hidden;}}});return fields.get(id);};
for(const key of ['candidate_AV-1','settings','timezone']){
  const ids=['field_'+key];
  ctx.toggleFields(key,ids,true);assert.equal(ctx.el(ids[0]).disabled,false);
  assert.equal(ctx.el('actions_'+key).hidden,false);
  ctx.el(ids[0]).value='unsaved';ctx.toggleFields(key,ids,false);
  assert.equal(ctx.el(ids[0]).value,'original');assert(ctx.el(ids[0]).disabled);
  assert.equal(ctx.el('actions_'+key).hidden,true);assert.equal(ctx.el('edit_'+key).hidden,false);
}
ctx.el=originalEl;data.settings={};
data.settings.BUSINESS_TIMEZONE='Europe/London';
assert(ctx.renderBookings().includes('all times shown in Europe/London'));
assert(ctx.renderCreate().includes('id="acTz" readonly value="Europe/London"'));
assert(ctx.renderCandidates().includes('id="ct_AV-1" disabled'));
assert(ctx.renderSettings().includes('<select disabled id="sTZ"'));
assert(ctx.businessTimezoneOptions('Asia/Kolkata').includes('value="Asia/Kolkata" selected'));
assert(ctx.businessTimezoneOptions('Pacific/Chatham').includes('value="Pacific/Chatham" selected'));
assert(ctx.businessTimezoneOptions('UTC').includes('value="UTC" selected')); 
assert(html.includes('id="cTz" disabled>'));
console.log('PASS candidate/settings/timezone edit mode, Cancel restores values, and read-only defaults');
const candidateUi=vm.createContext({
  home:{profile:{name:'Candidate',candidateId:'AV-1',type:'REGULAR',timezone:'UTC'},bookings:[
    {bookingId:'INT-PENDING',type:'Technical',start:'Jan 1, 2035, 10:00 AM',end:'Jan 1, 2035, 10:30 AM',status:'CONFIRMED',paymentStatus:'SUBMITTED',refundStatus:'NOT_REQUIRED',charge:50,canCancel:false},
    {bookingId:'INT-VERIFIED',type:'Coding',start:'Jan 2, 2035, 11:00 AM',end:'Jan 2, 2035, 11:30 AM',status:'CONFIRMED',paymentStatus:'VERIFIED',refundStatus:'NOT_REQUIRED',charge:50,canCancel:false},
    {bookingId:'INT-NO-PAYMENT',type:'HR',start:'Jan 3, 2035, 12:00 PM',end:'Jan 3, 2035, 12:30 PM',status:'CANCELLED',paymentStatus:'NOT_REQUIRED',refundStatus:'NOT_REQUIRED',charge:0,canCancel:false},
    {bookingId:'INT-FAILED',type:'HR',start:'Jan 4, 2035, 1:00 PM',end:'Jan 4, 2035, 1:30 PM',status:'CONFIRMED',paymentStatus:'FAILED',refundStatus:'REQUESTED',charge:50,canCancel:false},
    {bookingId:'INT-REFUNDED',type:'HR',start:'Jan 5, 2035, 2:00 PM',end:'Jan 5, 2035, 2:30 PM',status:'CANCELLED',paymentStatus:'VERIFIED',refundStatus:'REFUNDED',charge:50,canCancel:false},
    {bookingId:'INT-UPCOMING',type:'Technical',start:'Jan 6, 2035, 3:00 PM',end:'Jan 6, 2035, 3:30 PM',status:'CONFIRMED',paymentStatus:'VERIFIED',refundStatus:'NOT_REQUIRED',charge:50,canCancel:true,startUTC:'2099-01-06T15:00:00Z'}
  ]},
  zones:['UTC'],esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
  editControls:()=>'',withoutGmtOffset:value=>value,el:()=>({set innerHTML(value){candidateUi.html=value;}})
});
const candidateUiStart=script.indexOf('function candidateStatusBadge('),candidateUiEnd=script.indexOf('async function saveTz(',candidateUiStart);
vm.runInContext(script.slice(candidateUiStart,candidateUiEnd),candidateUi);
candidateUi.renderCandidateHome();
for(const label of ['Payment pending','Paid &amp; verified','No payment required','Payment failed','Refund requested','Refunded','No refund','Confirmed','Cancelled'])assert(candidateUi.html.includes(label),`candidate booking view should show ${label}`);
for(const tone of ['pending','verified','not-required','failed','cancelled'])assert(candidateUi.html.includes(`candidate-status-${tone}`),`candidate booking view should style ${tone} distinctly`);
assert(candidateUi.html.includes('Filter interviews by payment and refund status'));
assert(candidateUi.html.includes("sortCandidateInterviews('refundStatus')"));
assert(candidateUi.html.includes('candidate-booking-id">INT-PENDING</span>'));
for(const key of ['date','start','end'])assert(candidateUi.html.includes("sortCandidateInterviews('"+key+"')"));
assert(candidateUi.html.includes('<td>Jan 1, 2035</td><td>10:00 AM</td><td>10:30 AM</td>'));
candidateUi.setCandidateInterviewFilter('payment:SUBMITTED');
assert(candidateUi.html.includes('candidate-booking-id">INT-PENDING</span>'));
assert(!candidateUi.html.includes('candidate-booking-id">INT-VERIFIED</span>'));
assert(candidateUi.html.includes('aria-pressed="true" onclick="setCandidateInterviewFilter(\'payment:SUBMITTED\')"'));
candidateUi.setCandidateInterviewFilter('refund:REFUNDED');
assert(candidateUi.html.includes('candidate-booking-id">INT-REFUNDED</span>'));
assert(!candidateUi.html.includes('candidate-booking-id">INT-PENDING</span>'));
candidateUi.setCandidateInterviewFilter('payment:FAILED');
assert(candidateUi.html.includes('candidate-booking-id">INT-FAILED</span>'));
candidateUi.setCandidateInterviewFilter('refund:REQUESTED');
assert(candidateUi.html.includes('candidate-booking-id">INT-FAILED</span>'));
candidateUi.setCandidateInterviewFilter('payment:UNKNOWN');
assert(candidateUi.html.includes('No interviews match this filter.'));
candidateUi.setCandidateInterviewFilter('ALL');
assert(candidateUi.html.includes('candidate-booking-id">INT-PENDING</span>'));
assert(candidateUi.html.includes('candidate-booking-id">INT-REFUNDED</span>'));
assert.equal(candidateUi.candidateDateTime('Jan 2, 2035, 12:30 AM GMT+5:30').time,'12:30 AM');
assert(candidateUi.html.includes('data-cancel-start="2099-01-06T15:00:00Z"'));
assert(candidateUi.html.includes('onclick="cancelBooking(\'INT-UPCOMING\')"'));
const candidateCancelButton={dataset:{cancelStart:'2099-01-06T15:00:00Z'},classList:{add(){candidateCancelButton.hidden=true;}}};
candidateUi.document={querySelectorAll:()=>[candidateCancelButton]};
const cancelGuardStart=script.indexOf('function hideExpiredCancelButtons('),cancelGuardEnd=script.indexOf('\nif(typeof setInterval',cancelGuardStart);
assert(cancelGuardStart>=0&&cancelGuardEnd>cancelGuardStart,'candidate cancellation visibility guard should exist');
vm.runInContext(script.slice(cancelGuardStart,cancelGuardEnd),candidateUi);
candidateUi.hideExpiredCancelButtons();
assert.notEqual(candidateCancelButton.hidden,true,'upcoming candidate cancel button should remain visible');
console.log('PASS candidate booking and refund labels, legend and distinct pending, verified, no-payment, failed and cancelled styles');
const avFields=new Map();
const avElement=key=>{if(!avFields.has(key))avFields.set(key,{value:'keep',classList:{toggle(_,hidden){avFields.get(key).hidden=hidden;}}});return avFields.get(key);};
const select={value:'BLOCK',closest:()=>({querySelector:avElement})};
ctx.updateAvailabilityFields(select);
assert(avElement('.avWeekdayField').hidden);assert(avElement('.avDay').disabled);
assert.equal(avElement('.avDateField').hidden,false);assert.equal(avElement('.avDate').disabled,false);
select.value='WEEKLY';ctx.updateAvailabilityFields(select);
assert.equal(avElement('.avWeekdayField').hidden,false);assert.equal(avElement('.avDay').disabled,false);
assert(avElement('.avDateField').hidden);assert(avElement('.avDate').disabled);
assert.equal(avElement('.avDay').value,'keep');
assert(ctx.avRow({RuleType:'BLOCK'},0).includes('class="avWeekdayField hidden"'));
assert(ctx.avRow({RuleType:'WEEKLY'},0).includes('class="avDateField hidden"'));
console.log('PASS availability field visibility on initial render and rule-type changes');
data.settings.BUSINESS_TIMEZONE='America/New_York';data.nowUTC='2026-09-29T02:00:00Z';
data.bookings=[
 {name:'Later',status:'CONFIRMED',startUTC:'2026-09-29T01:00:00Z',endUTC:'2026-09-29T01:30:00Z',duration:30},
 {name:'Earlier',status:'CONFIRMED',startUTC:'2026-09-28T22:30:00Z',endUTC:'2026-09-28T23:00:00Z',duration:30},
 {name:'Tomorrow',status:'CONFIRMED',startUTC:'2026-09-29T14:00:00Z'},
 {name:'Cancelled',status:'CANCELLED',startUTC:'2026-09-28T21:00:00Z'}
];
assert.equal(ctx.todaysAdminBookings().length,2);
assert.equal(ctx.todaysAdminBookings()[0].name,'Earlier');
assert(ctx.renderTodayBookings().includes('2026-09-28'));
assert(ctx.renderTodayBookings().includes('30 min'));
assert(!ctx.renderTodayBookings().includes('Cancelled'));
assert.equal(ctx.todaysAdminBookings('2026-09-29').length,1);
assert.equal(ctx.todaysAdminBookings('2026-09-29')[0].name,'Tomorrow');
assert.equal(ctx.todaysAdminBookings('2026-09-30').length,0);
assert(ctx.renderTodayBookings().includes('value="2026-09-28"'));
data.bookings=[];assert(ctx.renderTodayBookings('2026-09-30').includes('value="2026-09-30"'));
assert(ctx.renderTodayBookings().includes('No confirmed bookings for this date'));
console.log('PASS today dashboard: business-date boundary, time order, duration, cancelled exclusion and empty state');

assert(!candidateUi.html.includes('<h3>My Interviews</h3>'));
candidateUi.sortCandidateInterviews('charge');
assert(candidateUi.html.indexOf('candidate-booking-id">INT-NO-PAYMENT')<candidateUi.html.indexOf('candidate-booking-id">INT-PENDING'));
candidateUi.sortCandidateInterviews('charge');
assert(candidateUi.html.indexOf('candidate-booking-id">INT-PENDING')<candidateUi.html.indexOf('candidate-booking-id">INT-NO-PAYMENT'));
candidateUi.sortCandidateInterviews('date');
assert(candidateUi.html.indexOf('candidate-booking-id">INT-PENDING')<candidateUi.html.indexOf('candidate-booking-id">INT-REFUNDED'));
candidateUi.sortCandidateInterviews('date');
assert(candidateUi.html.indexOf('candidate-booking-id">INT-REFUNDED')<candidateUi.html.indexOf('candidate-booking-id">INT-PENDING'));
assert.equal(candidateUi.candidateSortValue({start:'Jan 1, 2035, 12:05 AM'},'start'),5);
assert.equal(candidateUi.candidateSortValue({end:'Jan 1, 2035, 12:05 PM'},'end'),725);
candidateUi.setCandidateInterviewFilter('refund:REFUNDED');
assert(candidateUi.html.includes('candidate-booking-id">INT-REFUNDED'));
assert(!candidateUi.html.includes('candidate-booking-id">INT-PENDING'));
assert(candidateUi.html.includes('aria-sort="descending"'));
console.log('PASS candidate column sorting: numeric charge, chronological dates, AM/PM times, direction toggles and filters');

const navButtons=['home','booked','book','password'].map(page=>({dataset:{candidatePage:page},classList:{toggle(_,active){this.active=active;}},setAttribute(name,value){this[name]=value;}}));
const navPanels=new Map();
const navContext=vm.createContext({document:{querySelectorAll:()=>navButtons},el:id=>{if(!navPanels.has(id))navPanels.set(id,{classList:{toggle(_,hidden){this.hidden=hidden;}}});return navPanels.get(id);},loadBooked(){},loadBookedTimes(){}});
const navStart=script.indexOf('function candTab('),navEnd=script.indexOf(' async function loadBooked()',navStart);
vm.runInContext(script.slice(navStart,navEnd),navContext);
navContext.candTab('password');
assert.equal(navButtons[3].classList.active,true);
assert.equal(navButtons[3]['aria-current'],'page');
assert.equal(navButtons[0].classList.active,false);
assert.equal(navPanels.get('candHome').classList.hidden,true);
assert.equal(navPanels.get('candPassword').classList.hidden,false);
navContext.candTab('home');
assert.equal(navButtons[0].classList.active,true);
assert.equal(navButtons[3].classList.active,false);
assert.equal(navPanels.get('candHome').classList.hidden,false);
console.log('PASS candidate navigation active state follows selected page');

const filterNow='2035-01-02T12:00:00Z';
candidateUi.setCandidateInterviewFilter('ALL');
candidateUi.setCandidateDateFilter('TODAY');
assert(candidateUi.candidateMatchesDate(candidateUi.home.bookings[1],filterNow));
assert(!candidateUi.candidateMatchesDate(candidateUi.home.bookings[0],filterNow));
candidateUi.setCandidateDateFilter('YESTERDAY');
assert(candidateUi.candidateMatchesDate(candidateUi.home.bookings[0],filterNow));
candidateUi.setCandidateDateFilter('TOMORROW');
assert(candidateUi.candidateMatchesDate(candidateUi.home.bookings[2],filterNow));
assert.equal(candidateUi.candidateShiftDay('2026-12-31',1),'2027-01-01');
assert.equal(candidateUi.candidateShiftDay('2028-03-01',-1),'2028-02-29');
candidateUi.home.profile.timezone='America/New_York';
assert.equal(candidateUi.candidateDayKey('2026-10-10T02:00:00Z','America/New_York'),'2026-10-09');
candidateUi.setCandidateDateFilter('TODAY');
assert(candidateUi.candidateMatchesDate({startUTC:'2026-10-10T01:00:00Z'},'2026-10-10T02:00:00Z'));
candidateUi.home.profile.timezone='UTC';
candidateUi.setCandidateDateFilter('RANGE');
const rangeFields={candidateDateFrom:{value:'2035-01-01'},candidateDateTo:{value:'2035-01-05'},candidateDateError:{textContent:''}};
const homeEl=candidateUi.el;candidateUi.el=id=>rangeFields[id]||homeEl(id);
candidateUi.applyCandidateDateRange();
assert(candidateUi.html.includes('candidate-booking-id">INT-PENDING'));
assert(candidateUi.html.includes('candidate-booking-id">INT-REFUNDED'));
assert(!candidateUi.html.includes('candidate-booking-id">INT-UPCOMING'));
candidateUi.setCandidateInterviewFilter('refund:REFUNDED');
assert(candidateUi.html.includes('candidate-booking-id">INT-REFUNDED'));
assert(!candidateUi.html.includes('candidate-booking-id">INT-PENDING'));
rangeFields.candidateDateFrom.value='2035-01-06';candidateUi.applyCandidateDateRange();
assert(rangeFields.candidateDateError.textContent.includes('End date'));
rangeFields.candidateDateFrom.value='';candidateUi.applyCandidateDateRange();
assert(rangeFields.candidateDateError.textContent.includes('both dates'));
candidateUi.setCandidateDateFilter('ALL');candidateUi.setCandidateInterviewFilter('ALL');
assert(candidateUi.html.includes('candidate-booking-id">INT-UPCOMING'));
console.log('PASS candidate date filters: timezone midnight, relative days, inclusive range, validation and status combination');

const scheduleResults=new Map();bookedUi.el=id=>({set innerHTML(value){scheduleResults.set(id,value);}});
const schedules={timezone:'UTC',booked:[{date:'9 Oct 2026',start:'11:00 PM',end:'12:30 AM (10 Oct 2026)'},{date:'9 Oct 2026',start:'9:00 AM',end:'10:00 AM'}]};
let scheduleHtml=bookedUi.renderBookedTimesResult(schedules,'publicBooked');
assert(scheduleHtml.indexOf('9:00 AM')<scheduleHtml.indexOf('11:00 PM'));
assert(scheduleHtml.includes("sortBlockedSchedules('publicBooked','date')"));
bookedUi.sortBlockedSchedules('publicBooked','start');
scheduleHtml=scheduleResults.get('publicBooked');
assert(scheduleHtml.indexOf('11:00 PM')<scheduleHtml.indexOf('9:00 AM'));
assert(scheduleHtml.includes('aria-sort="descending"'));
bookedUi.sortBlockedSchedules('publicBooked','end');
scheduleHtml=scheduleResults.get('publicBooked');
assert(scheduleHtml.indexOf('10:00 AM')<scheduleHtml.indexOf('12:30 AM (10 Oct 2026)'));
bookedUi.renderBookedTimesResult(schedules,'candidateBookedResult');
bookedUi.sortBlockedSchedules('candidateBookedResult','start');
assert(scheduleResults.get('candidateBookedResult').includes('aria-sort="descending"'));
assert(bookedUi.renderBookedTimesResult(schedules,'publicBooked').includes('aria-sort="ascending"'));
assert.equal(schedules.booked[0].start,'11:00 PM');
console.log('PASS blocked schedule sorting: AM/PM, overnight end dates, toggles, independent welcome/candidate state and preserved source data');
