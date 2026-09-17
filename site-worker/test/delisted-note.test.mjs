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
  trading_days: ['monday', 'wednesday'],
  trading_days_link: 'https://www.egx.com.eg/en/OTC-Overview.aspx',
  note: 'Delisted from the Egyptian Exchange — final delisting notice of 2021-06-14 '
    + '(EGX NewsID 211501). Its shares trade over the counter, not on the exchange, '
    + 'and only on Mondays and Wednesdays.',
  note_ar: 'مشطوبة من البورصة المصرية — إخطار الشطب النهائي بتاريخ 2021-06-14 (رقم 211501). '
    + 'تُتداول أسهمها خارج المقصورة، وليس في البورصة، يومي الاثنين والأربعاء فقط.',
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

/* ── the two days it trades ───────────────────────────────────────────────
 *
 * The exchange's over-the-counter orders system for delisted shares runs on
 * Mondays and Wednesdays only. TORA's last trade before these tests were
 * written was Wednesday 16 September 2026, 61.13 on 10,685 shares, after
 * 64.00 on 18,100 on the Monday; the vendor still quoted exactly that on
 * Thursday the 17th, and the page printed it "as of" the Thursday.
 */
const TORA_LISTING = { ...LISTING, delisted_on: '2021-02-10', news_id: 206682,
  link: 'https://www.egx.com.eg/en/NewsDetails.aspx?NewsID=206682' };
const MONDAY = { date: '2026-09-14', close: 64, volume: 18100 };
const WEDNESDAY = { date: '2026-09-16', close: 61.13, volume: 10685 };

function toraPage(lang, marketDate, lastSession, quote) {
  const c = component({ demo: false, companies: [], series: [], fins: [], marketDate }, lang);
  c.state.screen = 'company';
  c.state.ticker = 'TORA';
  c._co = { ticker: 'TORA', name: { en: 'Tourah Cement Co', ar: 'اسمنت بورتلاند طرة' },
    profile: {}, listing: TORA_LISTING, lastSession, pct: -4.48, ...quote };
  return c.renderVals().co;
}

test('a Thursday price is dated by the Wednesday it traded, and the days are named', () => {
  const co = toraPage('en', '2026-09-17', WEDNESDAY, { close: 61.13, volume: 10685 });
  assert.equal(co.closeLabel, 'Last OTC price');
  assert.equal(co.closeWhen, 'Traded');
  assert.match(co.closeDate, /^Wednesday,? 16 September 2026$/,
    'a Wednesday trade was printed under the Thursday session date');
  assert.equal(co.otcDays, 'Mondays and Wednesdays only');
  assert.equal(co.otcRulesLink, 'https://www.egx.com.eg/en/OTC-Overview.aspx');
  // The volume is Wednesday's too, not "in the session" of a Thursday.
  const volume = co.stats.find((s) => s.label === 'Volume');
  assert.match(volume.note, /^on Wed,? 16 Sept?$/);

  const ar = toraPage('ar', '2026-09-17', WEDNESDAY, { close: 61.13, volume: 10685 });
  assert.equal(ar.closeLabel, 'آخر سعر خارج المقصورة');
  assert.equal(ar.otcDays, 'يومي الاثنين والأربعاء فقط');
  assert.match(ar.closeDate, /الأربعاء/);
});

test('on a Wednesday the quote is Monday\'s until the share trades, then it is today\'s', () => {
  // 07:40 UTC: the document's newest session is Monday and the quote is still it.
  assert.match(toraPage('en', '2026-09-16', MONDAY, { close: 64, volume: 18100 }).closeDate,
    /^Monday,? 14 September 2026$/);
  // 10:29 UTC: 63.50 on 6,037 shares, before the evening build writes the session.
  assert.match(toraPage('en', '2026-09-16', MONDAY, { close: 63.5, volume: 6037 }).closeDate,
    /^Wednesday,? 16 September 2026$/);
  // The same price again is still a trade when shares changed hands.
  assert.match(toraPage('en', '2026-09-16', MONDAY, { close: 64, volume: 500 }).closeDate,
    /^Wednesday,? 16 September 2026$/);
  // No shares, no trade — NCGC's quote reads volume 0 at its last price.
  assert.match(toraPage('en', '2026-09-16', MONDAY, { close: 64, volume: 0 }).closeDate,
    /^Monday,? 14 September 2026$/);
  // A quote that moves on a Tuesday is not a Tuesday trade.
  assert.match(toraPage('en', '2026-09-15', MONDAY, { close: 63, volume: 900 }).closeDate,
    /^Monday,? 14 September 2026$/);
});

test('a last print from before the notice stays a close on the exchange', () => {
  const co = toraPage('en', '2026-09-17', { date: '2020-12-24', close: 9.1, volume: 300 },
    { close: 9.1, volume: 300 });
  assert.equal(co.closeLabel, 'Last close');
  assert.equal(co.closeWhen, 'As of');
});

test('a listed company keeps its close and its session date', () => {
  const c = component({ demo: false, companies: [], series: [], fins: [], marketDate: '2026-09-17' }, 'en');
  c.state.screen = 'company';
  c.state.ticker = 'COMI';
  c._co = { ticker: 'COMI', name: { en: 'CIB' }, profile: {}, listing: null,
    lastSession: { date: '2026-09-16', close: 131.75, volume: 1 }, close: 133.6, volume: 2320708 };
  const co = c.renderVals().co;
  assert.equal(co.closeLabel, 'Last close');
  assert.equal(co.closeWhen, 'As of');
  assert.equal(co.closeDate, '2026-09-17');
  assert.equal(co.otcDays, '');
  assert.equal(co.stats.find((s) => s.label === 'Volume').note, 'in the session');
});

test('a delisted share is not among the session\'s largest moves', async () => {
  // Thursday 17 September 2026: ALEX's Wednesday −7.83% ranked fifth.
  const docs = { ...DOCS,
    'companies.json': { companies: [
      { ticker: 'ALEX', name_en: 'Alexandria Mineral Oils', listing: TORA_LISTING },
      { ticker: 'SAIB', name_en: 'Societe Arabe Internationale de Banque' },
      { ticker: 'COMI', name_en: 'Commercial International Bank' },
    ] },
    'market.json': { date: '2026-09-17', stocks: {
      ALEX: { close: 20, change_percent: -0.0783, volume: 5000 },
      SAIB: { close: 30, change_percent: -0.165, volume: 90000 },
      COMI: { close: 133.6, change_percent: 0.014, volume: 2320708 },
    } },
  };
  const D = await withDocs(docs, () => data.live());
  const c = component(D, 'en');
  const v = c.renderVals();
  assert.deepEqual(v.movers.map((r) => r.ticker), ['SAIB', 'COMI'],
    'an over-the-counter print from Wednesday was ranked among Thursday\'s moves');

  c.state.screen = 'market';
  const rows = Object.fromEntries(c.renderVals().rows.map((r) => [r.ticker, r]));
  assert.equal(rows.ALEX.otcTitle, 'OTC · Mondays and Wednesdays only');
  assert.equal(rows.COMI.otcTitle, '');
});

test('the price box binds the label, the trade date and the days', async () => {
  const tpl = await readFile(new URL('../../public/esthmr/template.html', import.meta.url), 'utf8');
  assert.match(tpl, /\{\{ co\.closeLabel \}\}/);
  assert.match(tpl, /\{\{ co\.closeWhen \}\} \{\{ co\.closeDate \}\}/);
  const block = tpl.slice(tpl.indexOf('<sc-if value="{{ co.otcDays }}">'));
  assert.ok(tpl.includes('<sc-if value="{{ co.otcDays }}">'), 'no line for the days');
  assert.match(block.slice(0, block.indexOf('</sc-if>')), /href="\{\{ co\.otcRulesLink \}\}"/);
  assert.match(tpl, /class="otc-tag" title="\{\{ r\.otcTitle \}\}"/);
});

test('the company document carries its newest session, volume included', async () => {
  const docs = { 'companies/TORA.json': { ticker: 'TORA', name: { en: 'Tourah Cement Co' },
    listing: TORA_LISTING, price_history: [MONDAY, WEDNESDAY] } };
  const doc = await withDocs(docs, () => data.company('TORA'));
  assert.deepEqual(doc.lastSession, WEDNESDAY);
});
