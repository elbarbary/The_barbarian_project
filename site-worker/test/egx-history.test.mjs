import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchHistories, frame, parseMessages, statusOf, completedTradeBars } from '../../scripts/egx_history.mjs';

// A chart socket that answers the way TradingView's did on 15 Sep 2026, by
// listing: `live` sends bars then series_completed; `dead` — a listing that has
// never traded, during the session — sends series_completed with
// data_completed "end" and no timescale_update at all; `hang` never answers;
// `invalid` sends symbol_error. Every remove_series is followed, as on the real
// socket, by an empty timescale_update for the removed series.
function server(kinds) {
  const opened = [];
  class Socket {
    constructor(url, options) {
      this.listeners = {};
      this.symbols = {};
      this.origin = options?.headers?.Origin;
      opened.push(this);
      setTimeout(() => this.emit('open', {}), 0);
    }
    addEventListener(type, listener) {
      (this.listeners[type] ||= []).push(listener);
    }
    emit(type, event) {
      for (const listener of this.listeners[type] || []) listener(event);
    }
    reply(...messages) {
      setTimeout(() => {
        if (!this.closed) this.emit('message', { data: messages.map(([m, p]) => frame(m, p)).join('') });
      }, 1);
    }
    send(text) {
      for (const raw of parseMessages(text)) {
        const { m, p } = JSON.parse(raw);
        if (m === 'resolve_symbol') this.symbols[p[1]] = JSON.parse(p[2].slice(1)).symbol;
        if (m === 'create_series') {
          const [session, series, , symbolId] = p;
          const symbol = this.symbols[symbolId];
          const kind = kinds[symbol] ?? 'live';
          if (kind === 'live') {
            const bars = Array.from({ length: 3 }, (_, i) => ({ v: [1789000000 + i * 86400, 1, 2, 0.5, 1.5 + i, 100] }));
            this.reply(['series_loading', [session, series, series]],
                       ['symbol_resolved', [session, symbolId, {}]],
                       ['timescale_update', [session, { [series]: { s: bars } }]],
                       ['series_completed', [session, series, 'delayed_streaming_900', series, {}]]);
          } else if (kind === 'dead') {
            this.reply(['series_loading', [session, series, series]],
                       ['symbol_resolved', [session, symbolId, {}]],
                       ['series_completed', [session, series, 'delayed_streaming_900', series, { data_completed: 'end' }]]);
          } else if (kind === 'invalid') {
            this.reply(['symbol_error', [session, symbolId, 'invalid symbol']]);
          }
        }
        if (m === 'remove_series') {
          this.reply(['timescale_update', [p[0], { [p[1]]: { s: [] } }]], ['series_deleted', [p[0], p[1], p[1]]]);
        }
      }
    }
    close() {
      if (this.closed) return;
      this.closed = true;
      setTimeout(() => this.emit('close', {}), 0);
    }
  }
  return { Socket, opened };
}

const QUICK = { url: 'wss://example.invalid', origin: 'https://www.tradingview.com', symbolTimeoutMs: 40, gapMs: 1, pauseMs: 1 };

function listings(entries) {
  return entries.map(([ticker, averageVolume = 5000]) => ({ symbol: `EGX:${ticker}`, ticker, scannerAverageVolume30d: averageVolume, volume: 0 }));
}

test('a listing that has never traded does not stall the companies queued behind it', async () => {
  // ACFR first in its batch cost SWDY, ISPH, CLHO and ALCN their history on
  // 15 Sep: the old scan waited for bars that were never coming.
  const { Socket, opened } = server({ 'EGX:ACFR': 'dead' });
  const records = listings([['ACFR', null], ['SWDY'], ['ISPH'], ['CLHO'], ['ALCN']]);
  const { answers } = await fetchHistories(records, { ...QUICK, WebSocket: Socket });
  assert.deepEqual(records.map(r => statusOf(r, answers)), ['none', 'fetched', 'fetched', 'fetched', 'fetched']);
  assert.equal(answers.get('EGX:SWDY').length, 3);
  assert.equal(opened.length, 1, 'one socket, no retry: nothing was lost');
});

test('the empty update that follows remove_series is not the next listing\'s answer', async () => {
  const { Socket } = server({});
  const records = listings([['COMI'], ['HRHO'], ['ETEL']]);
  const { answers } = await fetchHistories(records, { ...QUICK, WebSocket: Socket });
  for (const record of records) assert.equal(answers.get(record.symbol).length, 3, record.ticker);
});

test('a listing that never answers costs nothing but itself', async () => {
  // Every pass puts the hanging listing first and loses its batch; the last
  // pass asks one symbol per socket and gets the rest.
  const { Socket } = server({ 'EGX:HANG': 'hang' });
  const records = listings([['HANG'], ['SWDY'], ['ISPH'], ['CLHO'], ['ALCN']]);
  const { answers, warnings } = await fetchHistories(records, { ...QUICK, WebSocket: Socket });
  assert.deepEqual(records.map(r => statusOf(r, answers)), ['missing', 'fetched', 'fetched', 'fetched', 'fetched']);
  assert.ok(warnings.some(w => /no answer for HANG/.test(w.message)));
});

test('no pass starts after the deadline, and what it would have asked is named', async () => {
  const { Socket, opened } = server({ 'EGX:HANG': 'hang' });
  const records = listings([['HANG'], ['SWDY']]);
  const { answers, warnings } = await fetchHistories(records, { ...QUICK, deadlineMs: 0, WebSocket: Socket });
  assert.equal(opened.length, 1);
  assert.deepEqual(records.map(r => statusOf(r, answers)), ['missing', 'missing']);
  assert.ok(warnings.some(w => /deadline/.test(w.message) && w.symbols.includes('SWDY')));
});

test('no sessions for a company the scanner says trades is missing, not empty', async () => {
  // The scanner's own thirty-day average volume contradicts the answer, so it
  // is asked again every pass and counted as missing at the end — never
  // published as a company with no past.
  const { Socket, opened } = server({ 'EGX:SWDY': 'dead', 'EGX:GROV': 'dead' });
  const records = listings([['SWDY', 394405], ['GROV', null]]);
  const { answers } = await fetchHistories(records, { ...QUICK, WebSocket: Socket });
  assert.equal(statusOf(records[0], answers), 'missing');
  assert.equal(statusOf(records[1], answers), 'none');
  assert.equal(opened.length, 4, 'asked in every pass');
});

test('a symbol the chart does not know is an answer, judged by the scanner', async () => {
  const { Socket } = server({ 'EGX:EGS65861C014': 'invalid', 'EGX:ADCI': 'invalid' });
  const records = listings([['EGS65861C014', null], ['ADCI', 120000]]);
  const { answers } = await fetchHistories(records, { ...QUICK, WebSocket: Socket });
  assert.equal(statusOf(records[0], answers), 'none');
  assert.equal(statusOf(records[1], answers), 'missing');
});

test('a socket that is refused outright is given up after one pass', async () => {
  const opened = [];
  class Refused {
    constructor() { this.listeners = {}; opened.push(this); setTimeout(() => this.emit('error', { message: 'Unexpected server response: 403' }), 0); }
    addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
    emit(type, event) { for (const listener of this.listeners[type] || []) listener(event); }
    send() {}
    close() {}
  }
  const records = listings(Array.from({ length: 12 }, (_, i) => [`T${i}`]));
  const { answers, warnings } = await fetchHistories(records, { ...QUICK, WebSocket: Refused });
  assert.equal(opened.length, 3, 'twelve symbols, five a socket, one pass');
  assert.ok(records.every(r => statusOf(r, answers) === 'missing'));
  assert.ok(warnings.every(w => w.pass === 1 && /403/.test(w.message)));
});


test('night placeholders and morning omissions give the same completed trade history', () => {
  const trade = { timestamp: Date.parse('2026-09-09T07:00:00Z') / 1000, close: 23, volume: 250 };
  const zero = { timestamp: Date.parse('2026-09-10T07:00:00Z') / 1000, close: 23, volume: 0 };
  const unknown = { timestamp: Date.parse('2026-09-08T07:00:00Z') / 1000, close: 23 };
  assert.deepEqual(completedTradeBars([unknown, trade, zero], '2026-09-11'), [unknown, trade]);
  assert.deepEqual(completedTradeBars([unknown, trade], '2026-09-11'), [unknown, trade]);
  assert.deepEqual(completedTradeBars([trade], '2026-09-09'), []);
  // Equal positive bars alone are not proof of a replay: both trades survive.
  assert.equal(completedTradeBars([trade, { ...zero, volume: 250 }], '2026-09-11').length, 2);
});
