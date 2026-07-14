// Local MITM relay so headless Chromium can reach external HTTPS from a Claude Code
// cloud container whose egress proxy (HTTPS_PROXY) resets Chromium's tunneled TLS.
//
// Chromium points at this HTTP proxy (127.0.0.1:PORT) with certificate errors ignored.
// For each CONNECT we terminate Chromium's TLS locally with a self-signed cert, then
// re-issue every request via Node fetch() (which traverses HTTPS_PROXY correctly, given
// NODE_USE_ENV_PROXY=1). Responses stream back.
//
// Run:  NODE_USE_ENV_PROXY=1 RELAY_PORT=8899 node relay.js
// Certs: RELAY_KEY / RELAY_CERT env vars, or ./relay-key.pem / ./relay-cert.pem.
const http = require('http');
const tls = require('tls');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.RELAY_PORT || 8899);
const keyPath = process.env.RELAY_KEY || path.join(__dirname, 'relay-key.pem');
const certPath = process.env.RELAY_CERT || path.join(__dirname, 'relay-cert.pem');
const key = fs.readFileSync(keyPath);
const cert = fs.readFileSync(certPath);

const HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade', 'content-encoding', 'content-length']);

// Internal HTTP server that handles the decrypted requests coming from Chromium.
const inner = http.createServer();
inner.on('request', async (req, res) => {
  const host = req.headers.host;
  const scheme = req.socket.encrypted ? 'https' : 'http';
  const url = `${scheme}://${host}${req.url}`;
  try {
    let body;
    if (!['GET', 'HEAD'].includes(req.method)) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      body = Buffer.concat(chunks);
      if (body.length === 0) body = undefined;
    }
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!HOP.has(k.toLowerCase())) headers[k] = v;
    }
    const upstream = await fetch(url, { method: req.method, headers, body, redirect: 'manual' });
    const outHeaders = {};
    upstream.headers.forEach((v, k) => { if (!HOP.has(k.toLowerCase())) outHeaders[k] = v; });
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, outHeaders);
    res.end(buf);
  } catch (e) {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end('relay upstream error: ' + e.message);
  }
});

const proxy = http.createServer();
proxy.on('request', (req, res) => { inner.emit('request', req, res); });
proxy.on('connect', (req, clientSocket, head) => {
  clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
  const tlsSocket = new tls.TLSSocket(clientSocket, { isServer: true, key, cert });
  tlsSocket.on('error', () => { try { clientSocket.destroy(); } catch (_) {} });
  if (head && head.length) tlsSocket.unshift(head);
  inner.emit('connection', tlsSocket);
});
proxy.on('clientError', (err, sock) => { try { sock.destroy(); } catch (_) {} });
proxy.listen(PORT, '127.0.0.1', () => console.log('relay listening on 127.0.0.1:' + PORT));
