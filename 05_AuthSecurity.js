// Candidate authentication is persisted in Sheets. Never return these fields to clients.
const CANDIDATE_AUTH_COLUMNS = Object.freeze([
  'PasswordSalt','PasswordHash','PasswordAlgorithm','PasswordIterations','AuthVersion',
  'ResetHash','ResetExpiresUTC','ResetAttempts','ResetSentAtUTC',
  'LoginAttempts','LoginLockedUntilUTC'
]);
const AUTH_SESSION_COLUMNS = Object.freeze(['TokenHash','Role','CandidateID','Email','AuthVersion','ExpiresAtUTC']);
const PASSWORD_ITERATIONS = 600000;

function authLock_(work) {
  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try { return work(); } finally { try { SpreadsheetApp.flush(); } finally { lock.releaseLock(); } }
}
function ensureColumns_(sheet, required) {
  const existing=headers_(sheet), missing=required.filter(k=>!existing.includes(k));
  if(!missing.length) return;
  const end=existing.length+missing.length;
  if(end>sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(),end-sheet.getMaxColumns());
  sheet.getRange(1,existing.length+1,1,missing.length).setValues([missing]);
}
// Run from the Apps Script editor for an existing installation; no settings are reset.
function upgradeCandidateAuthentication() {
  requireSetupOwner_();
  return authLock_(()=>{
    ensureColumns_(sh_(APP.SHEETS.CANDIDATES),CANDIDATE_AUTH_COLUMNS);
    const ss=getSS_(); let s=ss.getSheetByName('AuthSessions');
    if(!s) s=ss.insertSheet('AuthSessions');
    ensureColumns_(s,AUTH_SESSION_COLUMNS); s.setFrozenRows(1);
    return {ok:true};
  });
}
function requireSetupOwner_() {
  const active=normEmail_(Session.getActiveUser().getEmail());
  const effective=normEmail_(Session.getEffectiveUser().getEmail());
  if(!active || active!==effective) throw new Error('Run setup from the Apps Script editor as the script owner.');
}
function candidateSheet_() {
  const s=sh_(APP.SHEETS.CANDIDATES), h=headers_(s);
  if(CANDIDATE_AUTH_COLUMNS.some(k=>!h.includes(k))) throw new Error('Run upgradeCandidateAuthentication() from the Apps Script editor first.');
  return s;
}
function candidateByIdentifier_(identifier) {
  const q=clean_(identifier); if(!q) return null;
  return rowsAsObjects_(candidateSheet_()).find(c=>clean_(c.CandidateID).toUpperCase()===q.toUpperCase() || normEmail_(c.Email)===normEmail_(q))||null;
}
function equalSecret_(a,b) {
  a=String(a||''); b=String(b||''); let diff=a.length^b.length;
  for(let i=0;i<Math.max(a.length,b.length);i++) diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);
  return diff===0;
}
// PBKDF2-HMAC-SHA256, one 32-byte block. U1 uses Google's native HMAC.
// Remaining rounds use fixed-size SHA-256 blocks locally to avoid 600,000
// Apps Script service calls. Reference-vector tests cover both implementations.
function derivePassword_(password,salt,iterations) {
  let key=Utilities.newBlob(String(password)).getBytes();
  if(key.length>64) key=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,key);
  let u=Utilities.computeHmacSha256Signature(Utilities.newBlob(salt).getBytes().concat([0,0,0,1]),key);
  const words=b=>{const w=Array(16).fill(0);b.forEach((v,i)=>w[i>>>2]|=(v&255)<<(24-(i%4)*8));return w;};
  const pad=Array(64).fill(0);key.forEach((v,i)=>pad[i]=v&255);
  const initial=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const inner=initial.slice(),outer=initial.slice(),work=new Int32Array(64);
  sha256Block_(inner,words(pad.map(v=>v^0x36)),work);
  sha256Block_(outer,words(pad.map(v=>v^0x5c)),work);
  let current=words(u).slice(0,8);const out=current.slice(),block=Array(16).fill(0);
  block[8]=0x80000000;block[15]=768; // 64-byte pad + 32-byte digest.
  for(let n=1;n<iterations;n++) {
    for(let j=0;j<8;j++)block[j]=current[j];
    const a=inner.slice();sha256Block_(a,block,work);
    for(let j=0;j<8;j++)block[j]=a[j];
    current=outer.slice();sha256Block_(current,block,work);
    for(let j=0;j<8;j++)out[j]^=current[j];
  }
  const result=[];out.forEach(w=>{for(let shift=24;shift>=0;shift-=8){const b=(w>>>shift)&255;result.push(b>127?b-256:b);}});
  return Utilities.base64Encode(result);
}
const SHA256_K = Object.freeze([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
]);
function sha256Block_(state,block,w) {
  for(let i=0;i<16;i++)w[i]=block[i];
  for(let i=16;i<64;i++){
    const x=w[i-15],y=w[i-2];
    w[i]=w[i-16]+((x>>>7|x<<25)^(x>>>18|x<<14)^(x>>>3))+w[i-7]+((y>>>17|y<<15)^(y>>>19|y<<13)^(y>>>10));
  }
  let [a,b,c,d,e,f,g,h]=state;
  for(let i=0;i<64;i++){
    const t1=(h+((e>>>6|e<<26)^(e>>>11|e<<21)^(e>>>25|e<<7))+((e&f)^(~e&g))+SHA256_K[i]+w[i])|0;
    const t2=(((a>>>2|a<<30)^(a>>>13|a<<19)^(a>>>22|a<<10))+((a&b)^(a&c)^(b&c)))|0;
    h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;
  }
  [a,b,c,d,e,f,g,h].forEach((v,i)=>state[i]=(state[i]+v)|0);
}
function passwordFields_(password) {
  validatePassword_(password);
  const salt=Utilities.getUuid()+Utilities.getUuid();
  return {PasswordSalt:salt,PasswordHash:derivePassword_(password,salt,PASSWORD_ITERATIONS),PasswordAlgorithm:'PBKDF2-HMAC-SHA256',PasswordIterations:PASSWORD_ITERATIONS};
}
function emptyReset_() { return {ResetHash:'',ResetExpiresUTC:'',ResetAttempts:0}; }
function writePassword_(c,fields) {
  updateObjectRow_(candidateSheet_(),c._row,Object.assign({},fields,emptyReset_(),{
    AuthVersion:Number(c.AuthVersion||0)+1,LoginAttempts:0,LoginLockedUntilUTC:'',UpdatedAtUTC:nowIso_()
  }));
  PropertiesService.getScriptProperties().deleteProperty(passwordKey_(c.CandidateID));
}
function verifyCandidatePassword_(c,password) {
  if(typeof password!=='string'||password.length>1024) return false;
  if(c.PasswordHash) {
    if(c.PasswordAlgorithm!=='PBKDF2-HMAC-SHA256'||Number(c.PasswordIterations)!==PASSWORD_ITERATIONS||!c.PasswordSalt) return false;
    return equalSecret_(c.PasswordHash,derivePassword_(password,String(c.PasswordSalt),Number(c.PasswordIterations)));
  }
  // Upgrade the original Script Properties hash only after proof of the old password.
  const old=PropertiesService.getScriptProperties().getProperty(passwordKey_(c.CandidateID));
  if(!old) return false; const split=old.indexOf(':');
  if(split<1||!equalSecret_(old.slice(split+1),hash_(old.slice(0,split)+password))) return false;
  writePassword_(c,passwordFields_(password)); return true;
}
function resetDigest_(id,otp) {
  const props=PropertiesService.getScriptProperties(); let secret=props.getProperty('RESET_HMAC_SECRET');
  if(!secret){secret=Utilities.getUuid()+Utilities.getUuid();props.setProperty('RESET_HMAC_SECRET',secret);}
  return Utilities.base64Encode(Utilities.computeHmacSha256Signature(id+':'+otp,secret));
}
function newResetCode_() {
  // Rejection sampling avoids modulo bias. UUID randomness replaces Math.random.
  let n; do {n=parseInt(Utilities.getUuid().replace(/-/g,'').slice(0,8),16);} while(n>=4294000000);
  return String(n%1000000).padStart(6,'0');
}

// Admin credentials share the candidate password implementation. A verified
// legacy login migrates storage without changing the password.
function saveAdminPassword_(password) {
  const fields=passwordFields_(password), props=PropertiesService.getScriptProperties();
  props.setProperty('ADMIN_PASSWORD_CREDENTIAL',JSON.stringify(fields));
  props.deleteProperty('ADMIN_PASSWORD_HASH');
}
function verifyAdminPassword_(password) {
  if(typeof password!=='string'||password.length>1024)return false;
  const props=PropertiesService.getScriptProperties(),raw=props.getProperty('ADMIN_PASSWORD_CREDENTIAL');
  if(raw){
    const c=JSON.parse(raw);
    return c.PasswordAlgorithm==='PBKDF2-HMAC-SHA256'&&Number(c.PasswordIterations)===PASSWORD_ITERATIONS&&!!c.PasswordSalt&&equalSecret_(derivePassword_(password,c.PasswordSalt,PASSWORD_ITERATIONS),c.PasswordHash);
  }
  const legacy=props.getProperty('ADMIN_PASSWORD_HASH');
  if(!legacy||!equalSecret_(hash_(password),legacy))return false;
  saveAdminPassword_(password);return true;
}
// Called under the authentication lock. Preserve custom columns and active sessions.
function pruneAuthSessions_(){
  const props=PropertiesService.getScriptProperties();
  if(Date.now()-Number(props.getProperty('AUTH_SESSION_CLEANUP_AT')||0)<86400000)return;
  const sheet=sh_(APP.SHEETS.SESSIONS),count=sheet.getLastRow()-1,h=headers_(sheet);
  if(count>0){
    const token=h.indexOf('TokenHash'),expiry=h.indexOf('ExpiresAtUTC');
    const kept=sheet.getRange(2,1,count,h.length).getValues().filter(r=>r[token]&&Date.parse(r[expiry])>Date.now());
    if(kept.length<count){while(kept.length<count)kept.push(h.map(()=>''));sheet.getRange(2,1,count,h.length).setValues(kept);}
  }
  props.setProperty('AUTH_SESSION_CLEANUP_AT',String(Date.now()));
}
