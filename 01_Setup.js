function setupInterviewPortal(adminEmail, adminPassword) {
  requireSetupOwner_();
  if(!adminEmail || !adminPassword || String(adminPassword).length<8) throw new Error('Provide admin email and password of at least 8 characters.');
  const ss=getSS_();
  const defs={
    Candidates:['CandidateID','Name','Email','PhoneE164','CountryCode','CandidateType','Percentage','Timezone','Active','ContactResourceName','CreatedAtUTC','UpdatedAtUTC'].concat(CANDIDATE_AUTH_COLUMNS),
    AuthSessions:AUTH_SESSION_COLUMNS,
    InterviewsV3:['BookingID','CandidateID','Name','Email','InterviewType','StartUTC','EndUTC','DurationMinutes','CandidateTimezone','CalculatedChargeUSD','FinalChargeUSD','AmountPaidUSD','PercentageSnapshot','BookingStatus','PaymentStatus','UTR','CalendarEventID','RefundStatus','Remark','CreatedAtUTC','CancelledAtUTC','LegacySource'],
    Payments:['PaymentID','BookingID','CandidateID','ExpectedAmountUSD','SubmittedAmountUSD','UTR','SubmittedAtUTC','Status','VerifiedAtUTC','Remark'],
    Refunds:['RefundID','BookingID','CandidateID','AmountUSD','RequestedAtUTC','Status','RefundedAtUTC','RefundUTR','AdminRemark'],
    Settings:['Key','Value'],
    Availability:['RuleID','RuleType','Weekday','Date','StartTime','EndTime','Enabled','Note'],
    'Audit Log':['TimestampUTC','Actor','Action','Entity','EntityID','Details']
  };
  Object.keys(defs).forEach(name=>{
    let s=ss.getSheetByName(name); if(!s) s=ss.insertSheet(name);
    ensureColumns_(s,defs[name]);
    s.setFrozenRows(1); s.getRange(1,1,1,defs[name].length).setFontWeight('bold').setBackground('#e8f0fe');
  });
  const defaults={
    ADMIN_EMAIL:normEmail_(adminEmail), ADMIN_TIMEZONE:APP.ADMIN_TZ, BUSINESS_TIMEZONE:'America/New_York',
    BUFFER_BEFORE_MINUTES:'30',BUFFER_AFTER_MINUTES:'30',UPI_ID:'CHANGE_ME@upi',UPI_QR_URL:'',ADMIN_NOTIFICATION_EMAIL:normEmail_(adminEmail),
    PRICE_BLOCK_MINUTES:'60',PRICE_SHORT_THRESHOLD_MINUTES:'30',PRICE_SHORT_USD:'50',PRICE_LONG_USD:'70',
    CURRENCY:'USD',CALENDAR_NAME:'Interview Bookings',OTP_MINUTES:'10'
  };
  Object.keys(defaults).forEach(k=>{if(!findOne_(sh_(APP.SHEETS.SETTINGS),'Key',k))setSetting_(k,defaults[k]);});
  if(!PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD_HASH')&&!PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD_CREDENTIAL')) saveAdminPassword_(adminPassword);
  seedWeeklyAvailability_();
  audit_('SYSTEM','SETUP','SYSTEM','PORTAL','Initial setup completed');
  return {ok:true,message:'Setup complete. Change UPI ID, business timezone and availability in Admin Settings.'};
}

function seedWeeklyAvailability_(){
  const s=sh_(APP.SHEETS.AVAILABILITY); if(s.getLastRow()>1) return;
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>appendObject_(s,{RuleID:uuid_('AVL'),RuleType:'WEEKLY',Weekday:d,Date:'',StartTime:'12:00',EndTime:'20:00',Enabled:true,Note:'Default - edit in Admin'}));
}

function migrateLegacyInterviews() {
  requireSetupOwner_();
  const ss=getSS_(), target=sh_(APP.SHEETS.INTERVIEWS), excluded=Object.values(APP.SHEETS).concat(['Dashboard']); let imported=0, skipped=0;
  ss.getSheets().forEach(s=>{
    if(excluded.includes(s.getName()) || s.getLastRow()<2) return;
    const h=s.getRange(1,1,1,s.getLastColumn()).getDisplayValues()[0].map(x=>clean_(x));
    const idx=n=>h.findIndex(x=>x.toLowerCase()===n.toLowerCase());
    const ni=idx('Name'), di=idx('Date'), fi=idx('From'), ti=idx('To'); if(ni<0||di<0||fi<0||ti<0) return;
    const vals=s.getRange(2,1,s.getLastRow()-1,s.getLastColumn()).getValues();
    vals.forEach((r,i)=>{
      if(!r[ni]||!r[di]||!r[fi]||!r[ti]) return;
      const legacy=`${s.getName()}!${i+2}`; if(rowsAsObjects_(target).some(x=>x.LegacySource===legacy)){skipped++;return;}
      try {
        const tz=String(getSetting_('BUSINESS_TIMEZONE','America/New_York'));
        const date=Utilities.formatDate(new Date(r[di]),getSS_().getSpreadsheetTimeZone(),'yyyy-MM-dd');
        const f=r[fi] instanceof Date?Utilities.formatDate(r[fi],getSS_().getSpreadsheetTimeZone(),'HH:mm'):clean_(r[fi]);
        const t=r[ti] instanceof Date?Utilities.formatDate(r[ti],getSS_().getSpreadsheetTimeZone(),'HH:mm'):clean_(r[ti]);
        const start=zonedLocalToUtc_(date,f,tz), end=zonedLocalToUtc_(date,t,tz); if(end<=start) throw new Error('end <= start');
        const emailIdx=idx('Email'), idIdx=idx('ID'), typeIdx=idx('Interview Type'), chargeIdx=idx('Charge'), pctIdx=idx('Percentage'), statusIdx=idx('Status'), remarkIdx=idx('Remark');
        const email=emailIdx>=0?normEmail_(r[emailIdx]):''; let cid=idIdx>=0?clean_(r[idIdx]):'';
        if(!cid && email){ const c=findOne_(sh_(APP.SHEETS.CANDIDATES),'Email',email); cid=c?c.CandidateID:createCandidateInternal_({name:r[ni],email:email,phone:'',countryCode:'',timezone:tz,type:'REGULAR'}).CandidateID; }
        appendObject_(target,{BookingID:uuid_('LEG'),CandidateID:cid,Name:r[ni],Email:email,InterviewType:typeIdx>=0?r[typeIdx]:'Legacy',StartUTC:start.toISOString(),EndUTC:end.toISOString(),DurationMinutes:minutesBetween_(start,end),CandidateTimezone:tz,CalculatedChargeUSD:chargeIdx>=0?r[chargeIdx]:'',FinalChargeUSD:chargeIdx>=0?r[chargeIdx]:'',AmountPaidUSD:'',PercentageSnapshot:pctIdx>=0?r[pctIdx]:'',BookingStatus:statusIdx>=0?clean_(r[statusIdx])||'CONFIRMED':'CONFIRMED',PaymentStatus:'LEGACY',UTR:'',CalendarEventID:'',RefundStatus:'NOT_REQUIRED',Remark:remarkIdx>=0?r[remarkIdx]:'',CreatedAtUTC:nowIso_(),CancelledAtUTC:'',LegacySource:legacy}); imported++;
      } catch(e){ skipped++; }
    });
  });
  audit_('SYSTEM','MIGRATE','INTERVIEW','LEGACY',{imported,skipped}); return {imported,skipped};
}

function runInitialSetup() {
  requireSetupOwner_();
  const props=PropertiesService.getScriptProperties();
  return setupInterviewPortal(props.getProperty('INITIAL_ADMIN_EMAIL'),props.getProperty('INITIAL_ADMIN_PASSWORD'));
}

// Editor entry point. The implementation enforces the same owner check as setup.
function resetInterviewPortalForTesting() {
  return resetInterviewPortalForTesting_();
}

// Destructive test reset. Deletes only the reserved APP.SHEETS tab names.
function resetInterviewPortalForTesting_() {
  requireSetupOwner_();
  return authLock_(()=>{
    const ss=getSS_(), names=Object.values(APP.SHEETS);
    const targets=ss.getSheets().filter(s=>names.includes(s.getName()));
    // Google Sheets requires at least one tab in the spreadsheet.
    if(targets.length && targets.length===ss.getSheets().length) ss.insertSheet('Portal Reset');
    const deletedSheets=[];
    targets.forEach(s=>{const name=s.getName();ss.deleteSheet(s);deletedSheets.push(name);});
    const props=PropertiesService.getScriptProperties();
    Object.keys(props.getProperties()).forEach(key=>{
      if(key==='ADMIN_PASSWORD_RESET'||key==='ADMIN_PASSWORD_CREDENTIAL'||key==='AUTH_SESSION_CLEANUP_AT'||key==='ADMIN_PASSWORD_HASH'||key==='ADMIN_LOGIN_ATTEMPTS'||key==='ADMIN_LOCKED_UNTIL'||key.startsWith('BOOKING_WORK_')||key==='RESET_HMAC_SECRET'||key.startsWith('CANDIDATE_PASSWORD_')) props.deleteProperty(key);
    });
    return {ok:true,deletedSheets,message:'Portal data and authentication cleared. Run runInitialSetup() to recreate the portal sheets.'};
  });
}
