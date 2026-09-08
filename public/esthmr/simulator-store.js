/* The simulator's data, one company at a time.
 *
 * It used to arrive as two ES modules the tools screen imported: a 1.6 MB
 * company directory and a 2.5 MB intraday set. A module is fetched whole, so
 * opening the tab cost 4.13 MB to read ONE company — and because `logic.js`
 * imported the tool at the top, every other screen paid it too.
 *
 * Now `scripts/build_simulator_series.mjs` writes a 13 KB index for the
 * picker and one file per company under `sim/`, and this holds whichever the
 * reader has asked for. A miss starts a fetch, returns null, and redraws when
 * it lands; the caller draws a waiting line for that one frame.
 *
 * `prime()` is the same door without the network: tests fill the store from
 * disk and then call the explorer synchronously, which is why they can still
 * assert on real prices without a server.
 */

const ROOT = new URL('./sim/', import.meta.url);

let companies = null;              // ticker -> index entry
let indexPending = null;
const series = new Map();          // ticker -> { sessions, intraday }
const seriesPending = new Map();
let failed = false;

/** Fill the store directly. Used by tests, and by the fetches below. */
export function prime({ index, series: rows } = {}) {
  if (index) {
    companies = {};
    for (const entry of index) if (entry && entry.ticker) companies[entry.ticker] = entry;
  }
  if (rows) for (const [ticker, value] of Object.entries(rows)) series.set(ticker, value);
}

/** Forget everything. Tests use it to prove the explorer waits when empty. */
export function reset() {
  companies = null; indexPending = null; failed = false;
  series.clear(); seriesPending.clear();
}

export function loadFailed() { return failed; }

async function read(path) {
  const response = await fetch(new URL(path, ROOT), { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

/** The picker's directory: every company, no prices. Null until it lands. */
export function indexOfCompanies(redraw) {
  if (companies) return companies;
  if (!indexPending && typeof fetch === 'function') {
    indexPending = read('index.json')
      .then((doc) => { prime({ index: doc.companies || [] }); redraw(); })
      .catch(() => { indexPending = null; failed = true; redraw(); });
  }
  return null;
}

/** One company's prices. Null until that company's own file lands. */
export function seriesOf(ticker, redraw) {
  if (!ticker) return null;
  if (series.has(ticker)) return series.get(ticker);
  if (!seriesPending.has(ticker) && typeof fetch === 'function') {
    seriesPending.set(ticker, read(`${ticker}.json`)
      .then((doc) => { series.set(ticker, doc); redraw(); })
      // A company whose file is missing is empty rather than broken: the
      // panel says it has no sessions instead of showing another company's.
      .catch(() => { series.set(ticker, { ticker, sessions: [], intraday: null }); redraw(); }));
  }
  return null;
}
