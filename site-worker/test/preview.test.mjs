import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { previewServer, permittedPath } from '../../scripts/esthmr_preview.mjs';

test('preview only permits known auth and read-only data routes', () => {
  assert.equal(permittedPath('/esthmr/api/auth/request','POST'),true);
  assert.equal(permittedPath('/data/v1/companies.json','GET'),true);
  assert.equal(permittedPath('/data/v1/companies.json','PUT'),false);
  assert.equal(permittedPath('/esthmr/api/admin','POST'),false);
});

test('local preview isolates writes and rejects foreign origins', async () => {
  const calls=[];
  const server=previewServer(async (url, options) => {
    calls.push({url,method:options.method,origin:options.headers.get('origin'),cookie:options.headers.get('cookie')});
    if (url.endsWith('/watchlist')) return Response.json({tickers:['COMI']});
    if (url.endsWith('/auth/me')) return Response.json({email:'test@example.invalid'});
    return Response.json({error:'signed out'},{status:401});
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const request=(path, options={}) => new Promise((resolve,reject) => {
    const req=httpRequest(base+path,{...options,headers:{
      host:'localhost:8438',origin:'http://localhost:8438',cookie:'unrelated=private; esthmr_session=test',
      ...options.headers,
    }}, answer => {
      const chunks=[];
      answer.on('data',c=>chunks.push(c));
      answer.on('end',()=>resolve(new Response(Buffer.concat(chunks), {status:answer.statusCode,headers:answer.headers})));
    });
    req.on('error',reject);
    req.end(options.body);
  });
  try {
    const forbidden=await request('/esthmr/api/auth/request',{method:'POST',headers:{origin:'https://foreign.invalid'}});
    assert.equal(forbidden.status,403);
    assert.equal(calls.length,0);
    const initial=await request('/esthmr/api/watchlist');
    assert.deepEqual((await initial.json()).tickers,['COMI']);
    const update=await request('/esthmr/api/watchlist',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({tickers:['ABUK']})});
    assert.equal(update.status,200);
    assert.deepEqual((await (await request('/esthmr/api/watchlist')).json()).tickers,['ABUK']);
    assert.ok(calls.every(c => c.method==='GET'));
    assert.ok(calls.every(c => c.origin==='http://localhost:8438' && c.cookie==='esthmr_session=test'));
    assert.equal((await request('/data/v1/companies.json')).status,401);
    assert.equal((await request('/esthmr/../../scripts/esthmr_preview.mjs')).status,404);
    const page=await request('/esthmr/');
    assert.equal(page.headers.get('cache-control'),'no-store');
    assert.match(await page.text(),/watchlist edits stay local/);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
