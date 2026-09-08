// One file per company, so a reader downloads the one they picked.
//
// The simulator shipped as two modules the whole site imported: a 1.6 MB
// directory and a 2.5 MB intraday set. Measured on Home before this, 4.13 MB
// of it downloaded on every screen for a tool nobody had opened — and the
// tools screen itself paid the same 4.13 MB to read ONE company. Three of the
// directory's four price arrays (`monthly`, `daily2Y`, `recentDaily`, 0.91 MB
// together) had no reader at all.
//
// So the data is split the way it is read. The index below carries what the
// picker, the search box and the featured row need for all 57 companies —
// ticker, both names, sector, the first and last session — and nothing else.
// Each company's own file carries its daily sessions and, where the research
// pipeline reached it, its half-hour observations. `simulator.js` fetches one.
//
// Inputs are the generated modules (`build_simulator_intraday.mjs` writes the
// intraday one); this is the step after them. Re-runnable and deterministic:
// the same inputs produce byte-identical output, so a rebuild that changes
// nothing leaves the tree clean.
import fs from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const { SIM_STOCKS } = await import(new URL('data-source/simulator/directory.js', root));
let INTRADAY_STOCKS = {};
try {
  ({ INTRADAY_STOCKS } = await import(new URL('data-source/simulator/intraday.js', root)));
} catch {
  // The intraday module is optional: it is rebuilt from research downloads
  // that are deliberately not in the repository.
}

const out = new URL('public/esthmr/sim/', root);
await fs.mkdir(out, { recursive: true });

// Only these reach every reader. Keep it to what the picker actually draws.
const INDEX_FIELDS = ['ticker', 'nameEn', 'nameAr', 'sector', 'sectorAr',
  'firstDate', 'lastDate', 'firstClose', 'lastClose'];

const index = [];
let written = 0, bytes = 0;
for (const ticker of Object.keys(SIM_STOCKS).sort()) {
  const stock = SIM_STOCKS[ticker];
  const intraday = INTRADAY_STOCKS[ticker] || null;
  const entry = {};
  for (const field of INDEX_FIELDS) if (stock[field] !== undefined) entry[field] = stock[field];
  // The picker tells a reader which companies can be traded intraday before
  // they choose one, rather than after the panel redraws empty.
  entry.intraday = Boolean(intraday && intraday.sessions && intraday.sessions.length);
  index.push(entry);

  const body = JSON.stringify({
    ticker,
    // The daily series the directory carries: [date, open, noon, close].
    sessions: stock.sessions || [],
    // The half-hour observations, with the provenance they were fetched with.
    intraday,
  });
  await fs.writeFile(new URL(`${ticker}.json`, out), body);
  written++; bytes += body.length;
}

await fs.writeFile(new URL('index.json', out),
  JSON.stringify({ generated_at: null, companies: index }));

console.log(JSON.stringify({
  companies: written,
  indexKB: +(JSON.stringify(index).length / 1024).toFixed(1),
  perCompanyAvgKB: +(bytes / written / 1024).toFixed(1),
  totalMB: +(bytes / 1e6).toFixed(2),
}));
