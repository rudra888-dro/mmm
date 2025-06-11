const http=require('http'), fs=require('fs'), path=require('path'), url=require('url');
const voters=[];

function serveStatic(file,res){ fs.readFile(path.join(__dirname,'public',file),(e,data)=>{ if(e){ res.writeHead(404); return res.end('404'); } const ext=path.extname(file); const ct={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json'}[ext]||'text/plain'; res.writeHead(200,{'Content-Type':ct}); res.end(data); }); }

function parseJSON(req,cb){ let b=''; req.on('data',c=>b+=c); req.on('end',()=>{ try{ cb(null,JSON.parse(b)); }catch(e){ cb(e); } }); }

const server=http.createServer((req,res)=>{
  const p=url.parse(req.url).pathname;
  if(req.method==='GET'&&(p==='/'||p==='/index.html')) return serveStatic('index.html',res);
  if(req.method==='GET'&&p==='/style.css') return serveStatic('style.css',res);

  if(req.method==='POST'&&p==='/submit') return parseJSON(req,(err,body)=>{
    if(err||!body.name||!body.choice){ res.writeHead(400); return res.end('Invalid'); }
    const ip=(req.headers['x-forwarded-for']||'').split(',')[0]||req.socket.remoteAddress;
    const ua=req.headers['user-agent']||'';
    const rec={ name:body.name,choice:body.choice,ip,userAgent:ua,lat:body.lat||null,lon:body.lon||null,timestamp:new Date().toISOString() };
    voters.push(rec);
    res.writeHead(200,{'Content-Type':'application/json'});
    return res.end(JSON.stringify({ hitPercent:51,hvtPercent:49,voters:voters.map(v=>v.name) }));
  });

  if(req.method==='GET'&&p==='/voters'){ res.writeHead(200,{'Content-Type':'application/json'}); return res.end(JSON.stringify({voters:voters.map(v=>v.name)})); }
  res.writeHead(404); res.end('Not found');
});
const PORT=process.env.PORT||3000; server.listen(PORT,()=>console.log(`Listening on http://localhost:${PORT}`));