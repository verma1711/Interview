const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),vm=require('node:vm');
const {ctx,sheets}=require('../local-preview/mock-store.cjs');
const props=ctx.PropertiesService.getScriptProperties();
// Legacy credentials migrate only on a correct login and preserve the password.
props.deleteProperty('ADMIN_PASSWORD_CREDENTIAL');props.setProperty('ADMIN_PASSWORD_HASH',ctx.hash_('Admin123!'));
assert.throws(()=>ctx.adminLogin('admin@example.com','wrong-password'),/credentials/);assert(!props.getProperty('ADMIN_PASSWORD_CREDENTIAL'));
const admin=ctx.adminLogin('admin@example.com','Admin123!').token,credential=JSON.parse(props.getProperty('ADMIN_PASSWORD_CREDENTIAL'));
assert(!props.getProperty('ADMIN_PASSWORD_HASH'));
assert.equal(credential.PasswordHash,crypto.pbkdf2Sync('Admin123!',credential.PasswordSalt,600000,32,'sha256').toString('base64'));
const candidate=ctx.candidateByIdentifier_('candidate@example.com'),session=ctx.newSession_({role:'candidate',candidateId:candidate.CandidateID,email:candidate.Email});
for(const fn of ['getAdminOverview','getAdminCandidateChoices','getAdminPage','adminRetryBookingWork'])assert.throws(()=>ctx[fn](session,{kind:'candidates'}),/authorized/);
// Amount corrections are validated before writes and propagate to payment/refund.
const booking=ctx.findOne_(sheets.get('InterviewsV3'),'BookingID','INT-DEMO-1'),payment=ctx.findOne_(sheets.get('Payments'),'BookingID',booking.BookingID);
assert.throws(()=>ctx.adminUpdateBooking(session,{bookingId:booking.BookingID,amountPaid:90}),/authorized/);
assert.throws(()=>ctx.adminUpdateBooking(admin,{bookingId:booking.BookingID,finalCharge:110,amountPaid:-1}),/Amount paid/);
assert.equal(ctx.findOne_(sheets.get('InterviewsV3'),'BookingID',booking.BookingID).FinalChargeUSD,50);
ctx.adminUpdateBooking(admin,{bookingId:booking.BookingID,finalCharge:110,amountPaid:90});
let p=ctx.findOne_(sheets.get('Payments'),'PaymentID',payment.PaymentID);assert.equal(p.ExpectedAmountUSD,110);assert.equal(p.SubmittedAmountUSD,90);
ctx.updateObjectRow_(sheets.get('InterviewsV3'),booking._row,{StartUTC:new Date(Date.now()+86400000).toISOString()});
ctx.adminCancelBooking(admin,booking.BookingID);assert.equal(ctx.findOne_(sheets.get('Refunds'),'BookingID',booking.BookingID).AmountUSD,90);
ctx.adminVerifyPayment(admin,p.PaymentID,'VERIFIED','Checked payment');
assert.throws(()=>ctx.adminVerifyPayment(session,p.PaymentID,'FAILED','reason'),/authorized/);
assert.throws(()=>ctx.adminVerifyPayment(admin,p.PaymentID,'FAILED',''),/reason/);
ctx.adminVerifyPayment(admin,p.PaymentID,'FAILED','Wrong reference');
const audit=ctx.rowsAsObjects_(sheets.get('Audit Log')).filter(r=>r.Action==='PAYMENT_FAILED').at(-1),details=JSON.parse(audit.Details);
assert.equal(details.before,'VERIFIED');assert.equal(details.after,'FAILED');assert.equal(details.reason,'Wrong reference');assert.equal(audit.Actor,'admin@example.com');
// Missing payment record is created when an admin records a payment.
const noPayment=ctx.findOne_(sheets.get('InterviewsV3'),'BookingID','INT-DEMO-7');const ps=sheets.get('Payments');const existing=ctx.findOne_(ps,'BookingID',noPayment.BookingID);if(existing)ctx.updateObjectRow_(ps,existing._row,{BookingID:'old-record'});
ctx.adminUpdateBooking(admin,{bookingId:noPayment.BookingID,amountPaid:25});assert.equal(ctx.findOne_(ps,'BookingID',noPayment.BookingID).SubmittedAmountUSD,25);
// Retry failures remain visible, can be retried by admins, and retain booking data.
const emailBooking=ctx.findOne_(sheets.get('InterviewsV3'),'BookingID','INT-DEMO-4'),savedMail=ctx.MailApp.sendEmail;
ctx.MailApp.sendEmail=()=>{throw Error('Temporary mail failure');};ctx.queueBookingWork_(emailBooking.BookingID,'email',{c:candidate,q:{candidateDisplay:'time',adminDisplay:'time'},regular:true});
const work=ctx.getAdminOverview(admin).work;assert.equal(work.total,1);assert.equal(work.jobs[0].attempts,1);assert.match(work.jobs[0].error,/Temporary mail failure/);
assert.equal(ctx.adminRetryBookingWork(admin,work.jobs[0].key).jobs[0].attempts,2);ctx.MailApp.sendEmail=savedMail;assert.equal(ctx.adminRetryBookingWork(admin,work.jobs[0].key).total,0);assert(ctx.findOne_(sheets.get('InterviewsV3'),'BookingID',emailBooking.BookingID));
// Global sorting/search precedes pagination, including editable candidate fields.
for(let i=0;i<121;i++)ctx.appendObject_(sheets.get('Candidates'),{CandidateID:'AV-PAGE-'+i,Name:'Page '+i,Email:'page'+String(i).padStart(3,'0')+'@example.com',PhoneE164:'+91900000'+String(i).padStart(3,'0'),CandidateType:i%2?'PERCENTAGE':'REGULAR',Percentage:i%101,Timezone:'UTC',Active:true});
const first=ctx.getAdminPage(admin,{kind:'candidates',page:1,size:50,sort:{column:2,ascending:true}}),second=ctx.getAdminPage(admin,{kind:'candidates',page:2,size:50,sort:{column:2,ascending:true}});
assert.equal(first.items.length,50);assert.equal(first.total,124);assert.equal(first.pages,3);assert.equal(second.items.length,50);assert(!first.items.some(a=>second.items.some(b=>a.candidateId===b.candidateId)));
assert(!JSON.stringify(first).includes('PasswordHash'));assert.equal(ctx.getAdminPage(admin,{kind:'candidates',query:'page120@example.com'}).total,1);
const numeric=ctx.getAdminPage(admin,{kind:'candidates',query:'Page',sort:{column:5,ascending:false}});assert.equal(numeric.items[0].percentage,100);
const capped=ctx.getAdminPage(admin,{kind:'candidates',size:10000,page:999});assert.equal(capped.size,100);assert.equal(capped.page,2);
const phones=ctx.getAdminPage(admin,{kind:'candidates',query:'Page',sort:{column:3,ascending:false}});assert.equal(phones.items[0].phone,'+91900000120');
assert.equal(ctx.getAdminOverview(admin).candidates.length,0);
ctx.updateObjectRow_(sheets.get('InterviewsV3'),emailBooking._row,{StartUTC:'2035-01-01T18:30:00Z',EndUTC:'2035-01-01T19:00:00Z'});
assert.equal(ctx.getAdminPage(admin,{kind:'bookings',query:'02-01-35'}).total,1);
assert.equal(ctx.getAdminPage(admin,{kind:'bookings',date:'RANGE',from:'2035-01-01',to:'2035-01-01'}).total,0);
assert.equal(ctx.getAdminPage(admin,{kind:'bookings',date:'RANGE',from:'2035-01-02',to:'2035-01-02'}).total,1);
ctx.setSetting_('BUSINESS_TIMEZONE','America/New_York');assert.equal(ctx.getAdminPage(admin,{kind:'bookings',query:'01-01-35'}).total,1);ctx.setSetting_('BUSINESS_TIMEZONE','Asia/Kolkata');
// Session compaction preserves an active session and custom columns.
ctx.ensureColumns_(sheets.get('AuthSessions'),['Custom']);const active=ctx.findOne_(sheets.get('AuthSessions'),'TokenHash',ctx.hash_(admin));ctx.updateObjectRow_(sheets.get('AuthSessions'),active._row,{Custom:'keep'});ctx.appendObject_(sheets.get('AuthSessions'),{TokenHash:'expired',Role:'admin',ExpiresAtUTC:'2000-01-01T00:00:00Z'});props.deleteProperty('AUTH_SESSION_CLEANUP_AT');ctx.authLock_(()=>ctx.pruneAuthSessions_());assert.equal(ctx.validateSession(admin).role,'admin');assert.equal(ctx.findOne_(sheets.get('AuthSessions'),'TokenHash',ctx.hash_(admin)).Custom,'keep');assert(!ctx.findOne_(sheets.get('AuthSessions'),'TokenHash','expired'));
// Timezone/format display uses the original UTC timestamp and scoped markers.
const html=require('../local-preview/read-ui.cjs').readUi(),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const rawHtml=fs.readFileSync('Index.html','utf8');assert(rawHtml.includes('<style>'),'raw previews must receive the CSS directly');assert(!rawHtml.includes('<?!='),'raw previews must not receive unexpanded client includes');
const time=vm.createContext({Intl,Date,preferredTimeFormat:()=> '24',esc:v=>String(v)});vm.runInContext(script.slice(script.indexOf('// Display comes from UTC'),script.indexOf('function candidateStatusBadge(')),time);
assert.equal(time.portalDateTime('2035-01-01T18:30:00Z','Asia/Kolkata').date,'02-01-35');assert.equal(time.portalDateTime('2035-01-01T18:30:00Z','Asia/Kolkata').time,'00:00');assert.equal(time.portalDateTime('2035-01-01T18:30:00Z','Asia/Kolkata','12').time,'12:00 AM');assert.equal(time.portalDateTime('2035-01-01T18:30:00Z','America/New_York').time,'13:30');
assert(!script.includes('createTreeWalker'));assert(!html.includes('<?!='));
console.log('PASS admin hash migration, role enforcement, payment reconciliation/audit, external retries, global paginated sorting/search, session cleanup and canonical timezone/format display');

// Older servers return startUTC but no endUTC. Compare normalized local dates,
// rather than comparing the canonical start label with a legacy end label.
time.home={profile:{name:'Demo',candidateId:'AV-TEST',type:'REGULAR',timezone:'Asia/Kolkata'},bookings:[]};time.zones=['Asia/Kolkata'];time.editControls=()=>'';time.withoutGmtOffset=s=>s;time.el=()=>({set innerHTML(value){time.rendered=value;}});
vm.runInContext(script.slice(script.indexOf('function formatPreferredTime('),script.indexOf('function applyPreferredTimeFormat(')),time);
vm.runInContext(script.slice(script.indexOf('function candidateStatusBadge('),script.indexOf('async function saveTz(')),time);
const mixed={bookingId:'MIXED',type:'Technical',startUTC:'2027-01-10T10:00:00Z',start:'Jan 10, 2027, 3:30 PM',end:'Jan 10, 2027, 4:00 PM IST',charge:50};
time.home.bookings=[mixed];time.renderCandidateHome();assert(!time.rendered.includes('<br><small>'),'same-day legacy end must not repeat the date');
time.home.bookings=[{...mixed,endUTC:'2027-01-10T10:30:00Z'}];time.renderCandidateHome();assert(!time.rendered.includes('<br><small>'),'same-day canonical endpoints must not repeat the date');
time.home.bookings=[{...mixed,startUTC:'2027-01-10T18:00:00Z',end:'Jan 11, 2027, 12:30 AM IST'}];time.renderCandidateHome();assert(time.rendered.includes('<br><small>'),'legacy overnight end must retain its date');assert(time.rendered.includes('11-01-27'));
time.home.bookings=[{...mixed,startUTC:'2027-01-10T18:00:00Z',endUTC:'2027-01-10T19:00:00Z'}];time.renderCandidateHome();assert(time.rendered.includes('<br><small>'),'canonical overnight end must retain its date');
console.log('PASS candidate same-day end-date suppression and true overnight dates for old/new server projections');

