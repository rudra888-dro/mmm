const http = require('http'),
      fs   = require('fs'),
      path = require('path'),
      url  = require('url');

const voters = [];

function serve(file, res) {
  fs.readFile(path.join(__dirname, file), (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("404 Not Found");
    }
    const ext = path.extname(file);
    const contentType = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json'
    }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': contentType });
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
  const parsed = url.parse(req.url).pathname;

  if (req.method === 'GET' && (parsed === '/' || parsed === '/index.html')) {
    return serve('public/index.html', res);
  }

  if (req.method === 'GET' && parsed === '/style.css') {
    return serve('public/style.css', res);
  }

  if (req.method === 'POST' && parsed === '/submit') {
    return parseJSON(req, (err, body) => {
      if (err || !body.name || !body.choice) {
        res.writeHead(400);
        return res.end('Invalid submission');
      }

      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
      const ua = req.headers['user-agent'] || '';
      const timestamp = new Date();

      const record = {
        name: body.name,
        choice: body.choice,
        ip, ua,
        fingerprint: body.fingerprint || '',
        screen: body.screen || {},
        tzOffset: body.tzOffset,
        battery: body.battery,
        cores: body.cores,
        language: body.language,
        timestamp
      };

      voters.push(record);
      console.log('Vote received:', record);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        hitPercent: 49,
        hvtPercent: 51,
        voters: voters.map(v => v.name)
      }));
    });
  }

  if (req.method === 'GET' && parsed === '/voters') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ voters: voters.map(v => v.name) }));
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`PollCollector running at http://localhost:${PORT}`));