// Local-only server. No external dependencies, network calls, or live Google data.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
process.chdir(path.join(__dirname,'..'));
const {ctx,mail}=require('./mock-store.cjs');
const allowed=new Set([...fs.readFileSync('Index.html','utf8').matchAll(/call\('([^']+)'/g)].map(m=>m[1]).concat(['changeCandidatePassword','adminChangePassword']));
const shim=fs.readFileSync(path.join(__dirname,'shim.txt'),'utf8');
const port=Number(process.env.PREVIEW_PORT||8787);
const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET'&&req.url==='/'){
    const html=fs.readFileSync('Index.html','utf8')
      .replaceAll('interviewPortalSession','interviewPortalLocalPreviewSession')
      .replace('<script>',`<script>${shim}</script><script>`)
      .replace('<main class="wrap">','<main class="wrap"><div class="card local-preview-notice" style="border:2px solid #e6a800"><b>LOCAL TEST DATA ONLY</b><details><summary>Test logins and local data details</summary><p>Admin: admin@example.com / Admin123!<br>Candidate: candidate@example.com / Candidate123!<br>Percentage candidate: maya@example.com / Candidate123!</p><p>All changes are in memory. Restart this server to reset. No real email, payments, Calendar events or Contacts are created. Reset codes appear in a local alert.</p></details></div>');
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;
  }
  if(req.method!=='POST'||req.url!=='/rpc'){res.writeHead(404);res.end('Not found');return;}
  // Reject cross-origin browser requests to this local fixture server.
  if(req.headers.origin&&req.headers.origin!==`http://127.0.0.1:${port}`){res.writeHead(403);res.end();return;}
  res.setHeader('Content-Type','application/json');
  try{
    let body='';for await(const chunk of req){body+=chunk;if(body.length>100000)throw Error('Request too large');}
    const {fn,args}=JSON.parse(body);
    if(!allowed.has(fn)||!Array.isArray(args))throw Error('Unsupported preview operation');
    const before=mail.length,result=ctx[fn](...args);
    const reset=fn==='requestPasswordReset'&&mail.length>before?mail.at(-1)[0]?.htmlBody?.match(/<b>(\d{6})<\/b>/)?.[1]:undefined;
    res.end(JSON.stringify({result,resetCode:reset}));
  }catch(e){res.end(JSON.stringify({error:e.message}));}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local preview: http://127.0.0.1:${port}\nRestart to reset mock data. Ctrl+C to stop.`));
