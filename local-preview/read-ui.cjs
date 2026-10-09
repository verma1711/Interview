// Expand the same trusted HTML partials as Apps Script's include helper.
const fs=require('node:fs');
function readUi(){return fs.readFileSync('Index.html','utf8').replace(/<\?!= include\('([A-Za-z0-9_]+)'\); \?>/g,(_,name)=>fs.readFileSync(name+'.html','utf8'));}
module.exports={readUi};
