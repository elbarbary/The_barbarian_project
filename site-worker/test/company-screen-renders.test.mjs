import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';
installDom();
const { Component } = await import('../../public/esthmr/logic.js');

/* Every company screen must render.
 *
 * `renderVals()` throwing does not degrade one card — it takes the page with
 * it. The screen stops repainting, every control goes dead, and the reader
 * sees a site that has stopped responding. That is what a shorthand property
 * did here: the block that draws a company's insider rows returned
 * `actionColor` while the variable above it was called `actColor`, so the
 * moment a company had an insider row to draw, the whole app died. It killed
 * 89 of 284 company screens, reachable from the treemap, from search, from a
 * crossing — from anywhere.
 *
 * Cheap to run and it would have caught it on the first company.
 */
/* The dataset is built through `data.live()`, the way main.js builds it: the
 * raw documents are not the shape the screens read (the directory's rows carry
 * `name_ar`, the screens want `name.ar`), so hand-feeding JSON would test a
 * fixture rather than the site. `fetch` is pointed at the published files.
 */
const ROOT = new URL('../../', import.meta.url);
globalThis.fetch = async (url) => {
  const path = new URL('public' + String(url).replace(/^https?:\/\/[^/]+/, '').split('?')[0], ROOT);
  try { return new Response(await readFile(path), { status: 200 }); }
  catch { return new Response('', { status: 404 }); }
};
const data = await import('../../public/esthmr/data.js');

test('every company screen renders, including the ones with insider rows', async () => {
  const D = await data.live();
  D.insiders = await data.insiders();
  assert.ok(D.companies.length > 100, 'the directory is too small to be a real test');

  const withRows = new Set((D.insiders.items || []).map((r) => r.ticker).filter(Boolean));
  const covered = D.companies.filter((c) => withRows.has(c.ticker));
  assert.ok(covered.length > 0,
    'no company in the directory has an insider row, so this test proves nothing');

  const dead = [];
  for (const lang of ['ar', 'en']) {
    for (const c of D.companies) {
      const comp = new Component({});
      comp.state.lang = lang; comp.state.screen = 'company'; comp.state.ticker = c.ticker;
      comp.setData(D);
      try { comp.renderVals(); } catch (error) {
        dead.push(`${c.ticker}/${lang}: ${error.constructor.name}: ${error.message}`);
      }
    }
  }
  assert.deepEqual(dead.slice(0, 5), [],
    `${dead.length} company screens throw, and a throw here blanks the whole page`);
});

test('the insider block on a company returns the variables it computed', async () => {
  const logic = await readFile(new URL('../../public/esthmr/logic.js', import.meta.url), 'utf8');
  const at = logic.indexOf('const companyInsiderItems');
  assert.ok(at > 0, 'the company insider block is gone');
  const block = logic.slice(at, logic.indexOf(': [];', at));
  // Shorthand here is always a bug: the locals are act*, the fields action*.
  for (const field of ['actionColor', 'actionBadgeBg', 'actionBadgeBorder']) {
    assert.doesNotMatch(block, new RegExp(`\\n\\s*${field},`),
      `${field} is returned as a shorthand property, but no such variable exists`);
    assert.match(block, new RegExp(`${field}:\\s*act`),
      `${field} is not assigned from the local it was computed into`);
  }
});
