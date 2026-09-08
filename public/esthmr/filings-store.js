/* A company's whole filing archive, fetched when somebody opens the tab.
 *
 * The company screen showed six filings — `companyExtras` sliced the recent
 * document to `.slice(0, 6)` — while the exchange's own archive for that
 * company sits beside it with every document since 2010 and a link on every
 * row: 704 for CIB, 1,140 for Heliopolis Housing, a median of 50.
 *
 * It is not loaded with the company, because the archive is a median 346 KB
 * and most readers never open the tab. It is fetched the first time the
 * Filings panel is drawn, cached per ticker, and a redraw follows. The
 * archive falls back to the recent document for the 35 companies that have
 * no archive, and 5 companies have neither.
 */

const ROOT = '/data/v1/disclosures/documents/';

const held = new Map();       // ticker -> rows
const pending = new Map();
const failed = new Set();

/** Fill the store directly. Tests use this instead of the network. */
export function prime(ticker, rows) { held.set(ticker, rows); }
export function reset() { held.clear(); pending.clear(); failed.clear(); }
export function archiveFailed(ticker) { return failed.has(ticker); }

async function read(path) {
  const response = await fetch(path, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

/** Every filing this company has, newest first. Null until it lands. */
export function archiveOf(ticker, redraw) {
  if (!ticker) return null;
  if (held.has(ticker)) return held.get(ticker);
  if (!pending.has(ticker) && typeof fetch === 'function') {
    // The archive first; the recent document is the fallback, not the source.
    const load = read(`${ROOT}${ticker}-all.json`)
      .catch(() => read(`${ROOT}${ticker}.json`))
      .then((doc) => {
        const rows = (doc.items || []).map((r) => ({
          id: r.id || '',
          date: r.date || '',
          title: r.title_en || r.title || '',
          titleAr: r.title || r.title_en || '',
          href: r.link || '',
          // The classified type where the pipeline set one, and the exchange's
          // own section for the rest — 42,356 of the archive's rows carry no
          // `event`, and almost all of them carry a `section` that says the
          // same thing in the exchange's words.
          event: r.event || '',
          section: r.section || '',
          attachments: Array.isArray(r.attachments) ? r.attachments.length : 0,
        }));
        // Newest first, and stable: the archive is stored oldest-first.
        rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
        held.set(ticker, rows);
        redraw();
      })
      .catch(() => { failed.add(ticker); held.set(ticker, []); redraw(); });
    pending.set(ticker, load);
  }
  return null;
}
