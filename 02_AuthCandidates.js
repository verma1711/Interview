function registerCandidate(data) {
  data=data||{}; const email=normEmail_(data.email), name=clean_(data.name), tz=clean_(data.timezone), phone=clean_(data.phone), cc=clean_(data.countryCode), password=String(data.password||'');
  if(!name||!email||!phone||!cc||!tz||!password) throw new Error('Name, email, country code, phone, timezone and password are required.');
  if(email===normEmail_(getSetting_('ADMIN_EMAIL',''))) throw new Error('This email is reserved for Admin. Please use a different email.');
  validatePassword_(password); if(!validateTimezone_(tz)) throw new Error('Invalid timezone.');
  if(candidateByIdentifier_(email)) throw new Error('A candidate account already exists for this email. Please use Candidate Login.');
  const nationalPhone=phone.replace(/[\s()-]/g,'');
  if(!/^\+[1-9]\d{0,2}$/.test(cc)||!/^\d+$/.test(nationalPhone)) throw new Error('Enter a valid phone number using digits and the selected country code.');
  const phoneE164=cc+nationalPhone;
  if(!/^\+[1-9]\d{6,14}$/.test(phoneE164)) throw new Error('Enter a complete phone number with 7 to 15 digits including the country code.');
  const c=createCandidateInternal_({name,email,phone:phoneE164,countryCode:cc,timezone:tz,type:'REGULAR',password});
  try { c.ContactResourceName=syncGoogleContact_(c); const row=findOne_(sh_(APP.SHEETS.CANDIDATES),'CandidateID',c.CandidateID); updateObjectRow_(sh_(APP.SHEETS.CANDIDATES),row._row,{ContactResourceName:c.ContactResourceName}); } catch(e){ audit_('SYSTEM','CONTACT_SYNC_FAILED','CANDIDATE',c.CandidateID,e.message); }
  const token=authLock_(()=>newSession_({role:'candidate',candidateId:c.CandidateID,email:c.Email})); audit_(c.CandidateID,'REGISTER','CANDIDATE',c.CandidateID,{email});
  return {ok:true,candidateId:c.CandidateID,token,profile:publicCandidate_(c),message:'Registration complete.'};
}
function createCandidateInternal_(x) {
  if(!clean_(x.name)||!/^\S+@\S+\.\S+$/.test(normEmail_(x.email)))throw new Error('A name and valid email are required.');
  if(!validateTimezone_(x.timezone||APP.ADMIN_TZ))throw new Error('Invalid timezone.');
  if(!['REGULAR','PERCENTAGE'].includes(clean_(x.type||'REGULAR').toUpperCase()))throw new Error('Invalid candidate type.');
  nonNegativeNumber_(x.percentage||0,'Percentage',100);
  const fields=x.password?passwordFields_(x.password):{};
  return authLock_(()=>{
    const s=candidateSheet_();
    if(candidateByIdentifier_(x.email)) throw new Error('A candidate account already exists for this email.');
    const id=uuid_('AV');
    const c={CandidateID:id,Name:clean_(x.name),Email:normEmail_(x.email),PhoneE164:clean_(x.phone),CountryCode:clean_(x.countryCode),CandidateType:clean_(x.type||'REGULAR').toUpperCase(),Percentage:Number(x.percentage||0),Timezone:clean_(x.timezone||'Asia/Kolkata'),Active:true,ContactResourceName:'',CreatedAtUTC:nowIso_(),UpdatedAtUTC:nowIso_()};
    CANDIDATE_AUTH_COLUMNS.forEach(k=>c[k]='');
    Object.assign(c,fields,{AuthVersion:1,ResetAttempts:0,LoginAttempts:0});
    appendObject_(s,c); return c;
  });
}
function validatePassword_(p){ if(typeof p!=='string'||p.length<8||p.length>1024) throw new Error('Password must be between 8 and 1024 characters.'); }
function passwordKey_(id){ return 'CANDIDATE_PASSWORD_'+clean_(id); }
function candidateLogin(identifier,password){
  return authLock_(()=>{
    const c=candidateByIdentifier_(identifier);
    const invalid=()=>{throw new Error('Invalid Candidate ID/email or password.');};
    if(!c||!asBool_(c.Active)) return invalid();
    if(new Date(c.LoginLockedUntilUTC).getTime()>Date.now()) throw new Error('Too many login attempts. Try again in 15 minutes.');
    if(!verifyCandidatePassword_(c,password)) {
      const attempts=Number(c.LoginAttempts||0)+1;
      updateObjectRow_(candidateSheet_(),c._row,{LoginAttempts:attempts>=5?0:attempts,LoginLockedUntilUTC:attempts>=5?new Date(Date.now()+900000).toISOString():''});
      return invalid();
    }
    updateObjectRow_(candidateSheet_(),c._row,{LoginAttempts:0,LoginLockedUntilUTC:''});
    return {token:newSession_({role:'candidate',candidateId:c.CandidateID,email:c.Email}),profile:publicCandidate_(c)};
  });
}
function requestPasswordReset(identifier,email){
  return authLock_(()=>{
    const c=candidateByIdentifier_(identifier);
    if(!c||!asBool_(c.Active)||normEmail_(c.Email)!==normEmail_(email)) throw new Error('Candidate details not found.');
    if(new Date(c.ResetSentAtUTC).getTime()+60000>Date.now()) throw new Error('Please wait one minute before requesting another code.');
    const otp=newResetCode_();
    updateObjectRow_(candidateSheet_(),c._row,{ResetHash:resetDigest_(c.CandidateID,otp),ResetExpiresUTC:new Date(Date.now()+APP.OTP_SECONDS*1000).toISOString(),ResetAttempts:0,ResetSentAtUTC:nowIso_()});
    try { MailApp.sendEmail({to:c.Email,subject:'Interview portal password reset code',htmlBody:'<p>Hello '+escapeHtml_(c.Name)+',</p><p>Your password reset code is <b>'+otp+'</b>.</p><p>It expires in 10 minutes.</p>'}); }
    catch(e){updateObjectRow_(candidateSheet_(),c._row,Object.assign(emptyReset_(),{ResetSentAtUTC:''}));throw new Error('Unable to send reset email. Please try again.');}
    return {ok:true,candidateId:c.CandidateID};
  });
}
function resetCandidatePassword(candidateId,otp,newPassword){
  validatePassword_(newPassword);
  return authLock_(()=>{
    const c=findOne_(candidateSheet_(),'CandidateID',clean_(candidateId));
    const invalid=()=>{throw new Error('Invalid or expired reset code.');};
    if(!c||!asBool_(c.Active)||!c.ResetHash||!(new Date(c.ResetExpiresUTC).getTime()>Date.now())) return invalid();
    const attempts=Number(c.ResetAttempts||0)+1;
    if(attempts>5||!equalSecret_(c.ResetHash,resetDigest_(c.CandidateID,clean_(otp)))) {
      updateObjectRow_(candidateSheet_(),c._row,attempts>=5?emptyReset_():{ResetAttempts:attempts}); return invalid();
    }
    writePassword_(c,passwordFields_(newPassword));
    audit_(c.CandidateID,'PASSWORD_RESET','CANDIDATE',c.CandidateID,'Password reset'); return {ok:true};
  });
}
function changeCandidatePassword(token,currentPassword,newPassword){
  validatePassword_(newPassword);
  return authLock_(()=>{
    const s=requireSession_(token,'candidate'), c=findOne_(candidateSheet_(),'CandidateID',s.candidateId);
    if(!verifyCandidatePassword_(c,currentPassword)) throw new Error('Current password is incorrect.');
    writePassword_(findOne_(candidateSheet_(),'CandidateID',s.candidateId),passwordFields_(newPassword));
    audit_(s.candidateId,'PASSWORD_CHANGE','CANDIDATE',s.candidateId,'Password changed'); return true;
  });
}
function adminChangePassword(token,currentPassword,newPassword){
  validatePassword_(newPassword);
  return authLock_(()=>{
    const sess=requireSession_(token,'admin'), props=PropertiesService.getScriptProperties();
    if(!verifyAdminPassword_(currentPassword)) throw new Error('Current password is incorrect.');
    saveAdminPassword_(newPassword);props.deleteProperty('ADMIN_PASSWORD_RESET');
    props.deleteProperty('ADMIN_LOGIN_ATTEMPTS');props.deleteProperty('ADMIN_LOCKED_UNTIL');
    audit_(sess.email,'PASSWORD_CHANGE','ADMIN',sess.email,'Password changed');
    rowsAsObjects_(sh_(APP.SHEETS.SESSIONS)).filter(s=>s.Role==='admin').forEach(s=>updateObjectRow_(sh_(APP.SHEETS.SESSIONS),s._row,{TokenHash:'',ExpiresAtUTC:''}));
    return true;
  });
}
function adminLogin(email,password){return authLock_(()=>{
  const props=PropertiesService.getScriptProperties();
  if(normEmail_(email)!==normEmail_(getSetting_('ADMIN_EMAIL','')))throw new Error('Invalid admin credentials.');
  if(Number(props.getProperty('ADMIN_LOCKED_UNTIL')||0)>Date.now())throw new Error('Too many login attempts. Try again in 15 minutes.');
  if(!verifyAdminPassword_(password)){
    const attempts=Number(props.getProperty('ADMIN_LOGIN_ATTEMPTS')||0)+1;
    props.setProperty('ADMIN_LOGIN_ATTEMPTS',String(attempts>=5?0:attempts));
    if(attempts>=5)props.setProperty('ADMIN_LOCKED_UNTIL',String(Date.now()+900000));
    throw new Error('Invalid admin credentials.');
  }
  props.deleteProperty('ADMIN_LOGIN_ATTEMPTS');props.deleteProperty('ADMIN_LOCKED_UNTIL');
  return {token:newSession_({role:'admin',email:normEmail_(email)}),adminTimezone:businessTimezone_()};
});}

function logout(token){ return authLock_(()=>{const s=sh_(APP.SHEETS.SESSIONS), r=findOne_(s,'TokenHash',hash_(clean_(token))); if(r)updateObjectRow_(s,r._row,{TokenHash:'',ExpiresAtUTC:''}); return true;}); }
function validateSession(token){ const s=requireSession_(token); return {ok:true,role:s.role}; }
function getCandidateHome(token){ const sess=requireSession_(token,'candidate'), c=findOne_(sh_(APP.SHEETS.CANDIDATES),'CandidateID',sess.candidateId); return {profile:publicCandidate_(c),bookings:candidateBookings_(c)}; }
function publicCandidate_(c){ return {candidateId:c.CandidateID,name:c.Name,email:c.Email,phone:c.PhoneE164,type:c.CandidateType,percentage:Number(c.Percentage||0),timezone:c.Timezone}; }
function updateCandidateTimezone(token,tz){ const sess=requireSession_(token,'candidate'); if(!validateTimezone_(tz)) throw new Error('Invalid timezone.'); const c=findOne_(sh_(APP.SHEETS.CANDIDATES),'CandidateID',sess.candidateId); updateObjectRow_(sh_(APP.SHEETS.CANDIDATES),c._row,{Timezone:tz,UpdatedAtUTC:nowIso_()}); audit_(sess.candidateId,'TIMEZONE_CHANGE','CANDIDATE',sess.candidateId,tz); return true; }
function syncGoogleContact_(c){ const person={names:[{givenName:c.Name}],emailAddresses:[{value:c.Email}],phoneNumbers:c.PhoneE164?[{value:c.PhoneE164}]:[],biographies:[{value:`Candidate ID: ${c.CandidateID}`} ]}; const res=People.People.createContact(person); return res.resourceName||''; }
function escapeHtml_(s){ return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function requestAdminPasswordReset(email){return authLock_(()=>{
  const address=normEmail_(email),expected=normEmail_(getSetting_('ADMIN_EMAIL',''));
  if(!address||address!==expected)return {ok:true};
  const props=PropertiesService.getScriptProperties(),previous=JSON.parse(props.getProperty('ADMIN_PASSWORD_RESET')||'{}');
  if(Number(previous.sentAt||0)+60000>Date.now())throw new Error('Please wait one minute before requesting another code.');
  const code=newResetCode_(),state={email:address,hash:resetDigest_('ADMIN:'+address,code),expires:Date.now()+APP.OTP_SECONDS*1000,attempts:0,sentAt:Date.now()};
  props.setProperty('ADMIN_PASSWORD_RESET',JSON.stringify(state));
  try{MailApp.sendEmail({to:expected,subject:'Admin password reset code',htmlBody:'<p>Your admin password reset code is <b>'+code+'</b>.</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>'});}
  catch(e){props.deleteProperty('ADMIN_PASSWORD_RESET');throw new Error('Unable to send reset email. Please try again.');}
  return {ok:true};
});}
function resetAdminPassword(email,code,newPassword){
  validatePassword_(newPassword);
  return authLock_(()=>{
    const props=PropertiesService.getScriptProperties(),state=JSON.parse(props.getProperty('ADMIN_PASSWORD_RESET')||'{}'),address=normEmail_(email);
    const invalid=()=>{throw new Error('Invalid or expired reset code.');};
    if(!state.hash||state.email!==address||address!==normEmail_(getSetting_('ADMIN_EMAIL',''))||!(state.expires>Date.now()))return invalid();
    state.attempts=Number(state.attempts||0)+1;
    if(state.attempts>5||!equalSecret_(state.hash,resetDigest_('ADMIN:'+address,clean_(code)))){
      if(state.attempts>=5){delete state.hash;delete state.expires;}
      props.setProperty('ADMIN_PASSWORD_RESET',JSON.stringify(state));return invalid();
    }
    saveAdminPassword_(newPassword);props.deleteProperty('ADMIN_PASSWORD_RESET');props.deleteProperty('ADMIN_LOGIN_ATTEMPTS');props.deleteProperty('ADMIN_LOCKED_UNTIL');
    rowsAsObjects_(sh_(APP.SHEETS.SESSIONS)).filter(s=>s.Role==='admin').forEach(s=>updateObjectRow_(sh_(APP.SHEETS.SESSIONS),s._row,{TokenHash:'',ExpiresAtUTC:''}));
    audit_(address,'PASSWORD_RESET','ADMIN',address,'Password reset');return {ok:true};
  });
}
