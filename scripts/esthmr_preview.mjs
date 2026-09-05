/* Local UI, real email authentication and gated data. Never a deployment.
 * Watchlist changes stay in memory here, separate from the live account.
 * No credentials, codes, cookies or request bodies are written to disk/logs.
 */
import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const UPSTREAM = 'https://esthmr.com';
const ORIGINS = new Set(['http://localhost:8438', 'http://127.0.0.1:8438']);
const TYPES = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};

export function permittedPath(path, method) {
  if (path === '/esthmr/api/watchlist') return ['GET', 'PUT'].includes(method);
  if (path === '/esthmr/api/auth/me') return method === 'GET';
  if (['/esthmr/api/auth/request','/esthmr/api/auth/verify','/esthmr/api/auth/signout'].includes(path)) return method === 'POST';
  if (path === '/esthmr/api/image') return method === 'GET';
  return path.startsWith('/data/v1/') && method === 'GET' && path.endsWith('.json');
}

export function previewServer(upstreamFetch = fetch) {
  const lists = new Map();
  return createServer(async (req, res) => {
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('x-frame-options', 'DENY');
    const reply = (status, body) => {
      res.writeHead(status, {'content-type':'application/json'});
      res.end(JSON.stringify(body));
    };
    const origin = 'http://' + req.headers.host;
    if (!ORIGINS.has(origin)) return reply(403, {error:'Local preview only'});
    if (req.headers.origin && req.headers.origin !== origin) return reply(403, {error:'Cross-origin request refused'});
    if (!['GET','HEAD'].includes(req.method) && req.headers.origin !== origin) return reply(403, {error:'Same-origin form required'});
    try {
      const url = new URL(req.url, origin);
      const remote = url.pathname.startsWith('/esthmr/api/') || url.pathname.startsWith('/data/');
      if (remote) {
        if (!permittedPath(url.pathname, req.method)) return reply(405, {error:'Preview route not allowed'});
        const headers = new Headers({'accept':'application/json', origin});
        // Forward only this app's session, never unrelated localhost cookies.
        const cookie = (req.headers.cookie || '').split(';').map(s => s.trim())
          .find(s => s.startsWith('esthmr_session='));
        if (cookie) headers.set('cookie', cookie);
        if (req.headers['content-type']) headers.set('content-type', req.headers['content-type']);
        let body;
        if (!['GET','HEAD'].includes(req.method)) {
          const chunks=[]; let bytes=0;
          for await (const chunk of req) {
            bytes += chunk.length;
            if (bytes > 16384) return reply(413, {error:'Request too large'});
            chunks.push(chunk);
          }
          body=Buffer.concat(chunks);
        }
        const ask = (path, method='GET', data) => upstreamFetch(UPSTREAM + path, {
          method, headers, body:data, redirect:'manual', signal:AbortSignal.timeout(30000),
        });
        if (url.pathname === '/esthmr/api/watchlist') {
          if (!cookie) return reply(401, {error:'signed out'});
          const who = await ask('/esthmr/api/auth/me');
          if (!who.ok) return reply(401, {error:'signed out'});
          const key = createHash('sha256').update(cookie).digest('hex');
          if (req.method === 'PUT') {
            let sent; try { sent=JSON.parse(body).tickers; } catch {}
            if (!Array.isArray(sent) || sent.length>60 || sent.some(t => typeof t!=='string' || !/^[A-Za-z0-9._-]{1,24}$/.test(t))) return reply(400,{error:'tickers'});
            if (lists.size >= 128 && !lists.has(key)) lists.delete(lists.keys().next().value);
            lists.set(key, [...new Set(sent)]);
          } else if (!lists.has(key)) {
            const upstream = await ask('/esthmr/api/watchlist');
            if (!upstream.ok) return reply(upstream.status, {error:'Could not load watchlist'});
            lists.set(key, (await upstream.json()).tickers || []);
          }
          return reply(200, {tickers:lists.get(key), preview:true});
        }
        const upstream = await ask(url.pathname + url.search, req.method, body);
        // Do not turn this into an arbitrary redirect/cookie-forwarding proxy.
        if (upstream.status >= 300 && upstream.status < 400) return reply(502, {error:'Unexpected upstream redirect'});
        const cookies=upstream.headers.getSetCookie().filter(c => c.startsWith('esthmr_session='));
        if (cookies.length) res.setHeader('set-cookie', cookies);
        res.writeHead(upstream.status, {'content-type':upstream.headers.get('content-type') || 'application/json'});
        res.end(Buffer.from(await upstream.arrayBuffer()));
        return;
      }
      if (!['GET','HEAD'].includes(req.method)) return reply(405,{error:'Read only'});
      if (url.pathname === '/') { res.writeHead(302,{location:'/esthmr/'}); res.end(); return; }
      const path=decodeURIComponent(url.pathname);
      if (!path.startsWith('/esthmr/') && path !== '/favicon.svg') return reply(404,{error:'Esthmr preview only'});
      const target=await realpath(resolve(ROOT, '.' + path + (path.endsWith('/') ? 'index.html' : '')));
      if (!target.startsWith(resolve(ROOT,'esthmr') + sep) && target !== resolve(ROOT,'favicon.svg')) return reply(403,{error:'Path refused'});
      const mime=TYPES[extname(target)];
      if (!mime) return reply(404,{error:'Not a preview asset'});
      let content=await readFile(target);
      if (target.endsWith('/esthmr/index.html')) {
        content=Buffer.from(content.toString().replace('<body data-signed="no">', '<body data-signed="no"><div style="padding:8px 16px;text-align:center;background:#e5eefb;color:#283e60;font:12px/1.6 sans-serif" role="note">معاينة محلية · تسجيل دخول حقيقي · تعديلات المتابعة محلية فقط<br>Local preview · real sign-in · watchlist edits stay local</div>'));
      }
      res.writeHead(200,{'content-type':mime});
      res.end(req.method==='HEAD' ? undefined : content);
    } catch (error) {
      reply(error.code === 'ENOENT' ? 404 : 502, {error:error.code === 'ENOENT' ? 'Not found' : 'Preview connection failed. Please retry.'});
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  previewServer().listen(8438, '127.0.0.1', () => {
    console.log('Esthmr local preview: http://localhost:8438/esthmr/');
    console.log('Real email login/data; watchlist changes isolated in memory. Nothing is deployed.');
  });
}
