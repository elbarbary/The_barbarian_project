import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';

/* What the simulator costs a reader who never opens it.
 *
 * Measured in Chromium against this tree, before and after:
 *
 *              page        simulator modules
 *   Home       5.57 MB  →  4.13 MB  →  3 KB (its stylesheet)
 *   Tools      5.52 MB  →  4.13 MB  →  134 KB (index + one company)
 *
 * Two causes. `logic.js` imported the tool at the top, so every screen paid
 * for it; and the data arrived as two ES modules — a 1.6 MB directory and a
 * 2.5 MB intraday set — which are fetched whole even though the panel reads
 * ONE company. Three of the directory's four price arrays had no reader at
 * all.
 */
const web = (p) => new URL(`../../public/esthmr/${p}`, import.meta.url);
const logic = await readFile(web('logic.js'), 'utf8');
const template = await readFile(web('template.html'), 'utf8');
const simulator = await readFile(web('simulator.js'), 'utf8');

test('no screen but the tools screen loads the simulator', async () => {
  // A static import is the whole bug: it makes Home fetch the tool.
  assert.doesNotMatch(logic, /^import .*from '\.\/simulator\.js'/m,
    'logic.js imports simulator.js at the top, so every screen downloads it');
  assert.match(logic, /import\('\.\/simulator\.js'\)/,
    'nothing loads simulator.js at all');
  // And the import is reached only from the tools branch.
  const at = logic.indexOf("simulatorWhenReady");
  const callSite = logic.slice(logic.indexOf('const wantsSim'), logic.indexOf('const simPending'));
  assert.ok(at > 0, 'the deferred loader is gone');
  assert.match(callSite, /st\.screen === 'tools'/,
    'the simulator is loaded regardless of which screen is open');
});

test('the panel waits for its module instead of drawing a blank frame', () => {
  assert.match(logic, /showToolsSim:[^\n]*Boolean\(simModule\)/,
    'the panel renders before its module exists');
  for (const flag of ['simPending', 'simUnavailable']) {
    assert.ok(template.includes(`{{ ${flag} }}`), `the template never shows ${flag}`);
  }
  assert.match(logic, /simPendingLabel:[\s\S]{0,120}جارٍ/, 'no Arabic waiting label');
  assert.match(logic, /simUnavailableLabel:[\s\S]{0,200}تعذّر/, 'no Arabic failure label');
});

test('the simulator reads one company, not every company', async () => {
  assert.doesNotMatch(simulator, /from '\.\/simulator-intraday-data\.js'/,
    'the 2.5 MB intraday bundle is imported again');
  assert.doesNotMatch(simulator, /SIM_STOCKS[^\n]*from '\.\/simulator-data\.js'/,
    'the 1.6 MB directory is imported again');
  assert.match(simulator, /from '\.\/simulator-store\.js'/, 'the store is not used');

  // Nothing the browser imports may be large. The app's own two files are the
  // exception and are named, so a new bundle cannot hide behind the rule.
  const dir = new URL('../../public/esthmr/', import.meta.url);
  const APP = new Set(['logic.js', 'template.html', 'simulator.js']);
  for (const name of await readdir(dir)) {
    if (!/\.(js|css)$/.test(name) || APP.has(name)) continue;
    const { size } = await stat(new URL(name, dir));
    assert.ok(size < 200_000, `${name} is ${Math.round(size / 1024)} KB of eager payload`);
  }
});

test('the picker index carries names, never price series', async () => {
  const doc = JSON.parse(await readFile(web('sim/index.json'), 'utf8'));
  assert.ok(doc.companies.length >= 50, 'the index lost its companies');
  const bytes = JSON.stringify(doc).length;
  assert.ok(bytes < 60_000, `the index is ${Math.round(bytes / 1024)} KB; it is fetched by everyone who opens the tab`);
  for (const entry of doc.companies) {
    for (const heavy of ['sessions', 'intraday_sessions', 'monthly', 'daily2Y', 'recentDaily']) {
      assert.ok(!(heavy in entry), `the index carries ${heavy} for ${entry.ticker}`);
    }
    assert.equal(typeof entry.intraday, 'boolean', 'the picker cannot say who has intraday');
  }
});

test('the store fetches a company once and remembers it', async () => {
  const store = await import('../../public/esthmr/simulator-store.js');
  store.reset();
  const asked = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const name = String(url).split('/').pop();
    asked.push(name);
    const body = name === 'index.json'
      ? { companies: [{ ticker: 'AAAA', nameEn: 'A', nameAr: 'أ', firstDate: '2024-01-01', lastDate: '2026-01-01', intraday: true }] }
      : { ticker: 'AAAA', sessions: [['2024-01-01', 1, 1, 1]], intraday: null };
    return { ok: true, json: async () => body };
  };
  try {
    const redraw = () => {};
    assert.equal(store.indexOfCompanies(redraw), null, 'the index was not fetched, it was assumed');
    await new Promise((r) => setTimeout(r, 10));
    assert.ok(store.indexOfCompanies(redraw).AAAA, 'the index never landed');

    assert.equal(store.seriesOf('AAAA', redraw), null, 'a company was served before its file arrived');
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(store.seriesOf('AAAA', redraw).sessions.length, 1, 'the company never landed');
    store.seriesOf('AAAA', redraw);
    store.seriesOf('AAAA', redraw);
    assert.deepEqual(asked, ['index.json', 'AAAA.json'],
      `each company must be fetched once; asked for ${asked.join(', ')}`);
  } finally {
    globalThis.fetch = real;
    store.reset();
  }
});

test('the research downloads stay out of the repository', async () => {
  const ignore = await readFile(new URL('../../.gitignore', import.meta.url), 'utf8');
  for (const path of ['data-source/intraday-research/', 'data-source/simulator/']) {
    assert.ok(ignore.includes(path), `${path} would be committed`);
  }
});
