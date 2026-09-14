/* A delisted company keeps its page, and says it trades over the counter.
 *
 * Nile Cotton Ginning left the exchange in June 2021 (EGX NewsID 211501) and
 * still changes hands on the over-the-counter system. Taking it off the site
 * hid a real share from the people who hold it; showing it like an exchange
 * listing was the bug that started this. The pipeline puts a `listing` note on
 * the directory row and the company document (apply_listing_status.py), and
 * these tests hold the site to drawing it — and to leaving an OTC print off
 * the busiest-session block, as the pipeline's own unusual-volume document
 * does.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';

installDom();
const { Component } = await import('../../public/esthmr/logic.js');
const data = await import('../../public/esthmr/data.js');

const LISTING = {
  status: 'delisted', market: 'OTC', delisted_on: '2021-06-14', news_id: 211501,
  link: 'https://www.egx.com.eg/en/NewsDetails.aspx?NewsID=211501', kind: 'voluntary',
  note: 'Delisted from the Egyptian Exchange — final delisting notice of 2021-06-14 '
    + '(EGX NewsID 211501). Its shares trade over the counter, not on the exchange.',
  note_ar: 'مشطوبة من البورصة المصرية — إخطار الشطب النهائي بتاريخ 2021-06-14 (رقم 211501). '
    + 'تُتداول أسهمها خارج المقصورة، وليس في البورصة.',
};

// Two companies, both past twice their usual volume: NCGC's 800 shares
// against 95 is its real 13 September 2026 print.
const DOCS = {
  'companies.json': { companies: [
    { ticker: 'NCGC', name_en: 'Nile Cotton Ginning', name_ar: 'النيل لحليج الاقطان',
      sector: 'Process Industries', market_cap: 2649625015, median_volume_20d: 95,
      listing: LISTING },
    { ticker: 'COMI', name_en: 'Commercial International Bank', sector: 'Banks',
      market_cap: 474267676058, median_volume_20d: 100 },
  ] },
  'market.json': { date: '2026-09-09', stocks: {
    NCGC: { close: 50, change_percent: 0, volume: 800 },
    COMI: { close: 139.28, change_percent: 0.01, volume: 1000 },
  } },
  'manifest.json': {},
};

async function withDocs(docs, fn) {
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const body = docs[String(url).replace('/data/v1/', '')];
    return body === undefined
      ? { ok: false, status: 404, json: async () => null }
      : { ok: true, status: 200, json: async () => body };
  };
  try { return await fn(); } finally { globalThis.fetch = real; }
}

function component(dataset, lang) {
  const c = new Component({ accent: 'var(--accent)' });
  c.state.lang = lang;
  c.setData(dataset);
  return c;
}

test('the directory keeps a delisted company and tags it as over the counter', async () => {
  const D = await withDocs(DOCS, () => data.live());
  const ncgc = D.companies.find((c) => c.ticker === 'NCGC');
  assert.ok(ncgc, 'the delisted company is gone from the directory');
  assert.equal(ncgc.listing.news_id, 211501);
  assert.equal(ncgc.cap, 2649625015, 'its figures went with the note');

  for (const [lang, tag] of [['en', 'OTC'], ['ar', 'خارج المقصورة']]) {
    const c = component(D, lang);
    c.state.screen = 'market';
    const rows = Object.fromEntries(c.renderVals().rows.map((r) => [r.ticker, r]));
    assert.equal(rows.NCGC.otc, true, `${lang}: no tag on the delisted row`);
    assert.equal(rows.NCGC.otcTag, tag);
    assert.equal(rows.COMI.otc, false, `${lang}: a listed company was tagged`);
  }
});

test('the company page keeps its price and says where the share trades', async () => {
  const D = await withDocs(DOCS, () => data.live());
  for (const [lang, note, exchange] of [['en', LISTING.note, 'OTC'],
    ['ar', LISTING.note_ar, 'خارج المقصورة']]) {
    const c = component(D, lang);
    c.state.screen = 'company';
    c.state.ticker = 'NCGC';
    c._co = { ticker: 'NCGC', name: { en: 'Nile Cotton Ginning', ar: 'النيل لحليج الاقطان' },
      profile: {}, listing: LISTING, close: 50, pct: 0 };
    const { co } = c.renderVals();
    assert.equal(co.delisted, true);
    assert.equal(co.listingNote, note);
    assert.equal(co.listingLink, LISTING.link);
    assert.equal(co.exchange, exchange, `${lang}: the chip still names the exchange it left`);
    assert.match(co.close, /50/, `${lang}: the price went with the note`);

    c.state.ticker = 'COMI';
    c._co = { ticker: 'COMI', name: { en: 'CIB', ar: 'التجاري الدولي' }, profile: {}, listing: null };
    const listed = c.renderVals().co;
    assert.equal(listed.delisted, false);
    assert.equal(listed.listingNote, '');
    assert.equal(listed.exchange, 'EGX');
  }
});

test('an over-the-counter print is not a busy session on the exchange', async () => {
  const D = await withDocs(DOCS, () => data.live());
  const v = component(D, 'en').renderVals();
  assert.deepEqual(v.busy.map((r) => r.ticker), ['COMI'],
    'NCGC 8.4x on an over-the-counter transfer was counted as a busy session');
});

test('the company document carries the note through to the screen', async () => {
  const docs = {
    'companies/NCGC.json': { ticker: 'NCGC', name: { en: 'Nile Cotton Ginning' }, listing: LISTING },
    'companies/COMI.json': { ticker: 'COMI', name: { en: 'CIB' } },
  };
  const delisted = await withDocs(docs, () => data.company('NCGC'));
  assert.equal(delisted.listing.news_id, 211501);
  const listed = await withDocs(docs, () => data.company('COMI'));
  assert.equal(listed.listing, null);
});

test('the template draws the note under the name and the tag beside the row', async () => {
  const tpl = await readFile(new URL('../../public/esthmr/template.html', import.meta.url), 'utf8');
  const note = tpl.slice(tpl.indexOf('<sc-if value="{{ co.delisted }}">'));
  assert.ok(tpl.includes('<sc-if value="{{ co.delisted }}">'), 'no block for the note');
  const block = note.slice(0, note.indexOf('</sc-if>'));
  assert.match(block, /\{\{ co\.listingNote \}\}/);
  assert.match(block, /href="\{\{ co\.listingLink \}\}"/);
  assert.match(tpl, /<sc-if value="\{\{ r\.otc \}\}">[^]*?\{\{ r\.otcTag \}\}[^]*?<\/sc-if>/);
});
