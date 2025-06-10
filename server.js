// server.js
const http = require('http'),
      fs   = require('fs'),
      path = require('path'),
      url  = require('url');

const voters = []; // in-memory log

function serve(file, res) {
  fs.readFile(path.join(__dirname, file), (e,d)=>{
    if (e) { res.writeHead(404); return res.end("404"); }
    const ext = path.extname(file);
    const ct = ext=='.js'?'application/javascript': ext=='.html'?'text/html':'application/json';
    res.writeHead(200,{'Content-Type':ct});
    res.end(d);
  });
}

function parseJSON(req, cb){
  let body='';
  req.on('data',c=>body+=c);
  req.on('end', ()=> {
    try{ cb(null, JSON.parse(body)) }
    catch(err){ cb(err) }
  });
}

const srv = http.createServer((req,res)=>{
  const p = url.parse(req.url).pathname;
  if (req.method==='GET' && (p==='/'||p==='/index.html')) {
    return serve('public/index.html',res);
  }
  if (req.method==='POST' && p==='/submit') {
    return parseJSON(req,(err,body)=>{
      if(err||!body.name||!body.choice) {
        res.writeHead(400); return res.end('Bad JSON');
      }
      // IP
      let ip = req.headers['x-forwarded-for']?.split(',')[0] 
             || req.socket.remoteAddress||'';
      // UA
      const ua = req.headers['user-agent']||'';
      const ts = new Date();
      const rec = {
        name: body.name,
        choice: body.choice,
        ip, ua,
        fingerprint: body.fingerprint||'',
        screen: body.screen||{},
        tzOffset: body.tzOffset,
        battery: body.battery,
        cores: body.cores,
        language: body.language,
        timestamp: ts
      };
      voters.push(rec);
      console.log('VOTE:',rec);
      res.writeHead(200,{'Content-Type':'application/json'});
      return res.end(JSON.stringify({
        hitPercent:49,
        hvtPercent:51,
        voters: voters.map(v=>v.name)
      }));
    });
  }
  if (req.method==='GET' && p==='/voters') {
    res.writeHead(200,{'Content-Type':'application/json'});
    return res.end(JSON.stringify({ voters: voters.map(v=>v.name) }));
  }
  res.writeHead(404); res.end('Not found');
});

const PORT = process.env.PORT||3000;
srv.listen(PORT,()=>console.log(`PollCollector at http://localhost:${PORT}`));