import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';
installDom();

/* Every screen must render, in both languages, whatever arrived.
 *
 * `renderVals()` throwing does not degrade one card — it takes the page. The
 * screen stops repainting and every control goes dead, which reads to a
 * reader as a site that has stopped responding. That is what one shorthand
 * property did: the company screen's insider block returned `actionColor`
 * while the variable was `actColor`, and 89 of 284 company screens died, by
 * every route to them. Nothing in the suite rendered a screen, so a plain
 * ReferenceError reached production.
 *
 * The sweep below is the cheap guard that would have caught it on the first
 * company, and it covers the other half of the problem too: a screen that
 * works with every document present and throws when one loader failed.
 * `main.js` loads eleven documents independently and tolerates any of them
 * failing, so each one absent is a state real readers reach.
 */
const ROOT = new URL('../../', import.meta.url);
globalThis.fetch = async (url) => {
  const path = new URL('public' + String(url).replace(/^https?:\/\/[^/]+/, '').split('?')[0], ROOT);
  try { return new Response(await readFile(path), { status: 200 }); }
  catch { return new Response('', { status: 404 }); }
};
const data = await import('../../public/esthmr/data.js');
const { Component } = await import('../../public/esthmr/logic.js');

/** Every screen the router will route to, and the sub-states that change what
 *  each draws. A view mode is a screen for this purpose: the bug that prompted
 *  this was only reachable through one. */
const SCREENS = ['home', 'scenarios', 'market', 'company', 'today', 'investors', 'heat', 'watchlist',
  'sectors', 'calendar', 'exchange', 'tools', 'research', 'crossings', 'pairs', 'valuation'];
const SUB = {
  investors: [{ investorTab: 'insiders', insiderViewMode: 'table' },
              { investorTab: 'insiders', insiderViewMode: 'map' },
              { investorTab: 'insiders', insiderViewMode: 'flow' },
              { investorTab: 'both' }],
  tools: [{ toolsTab: 'sim' }, { toolsTab: 'calc' }, { toolsTab: 'guide' }],
  today: [{ storyPeriod: 'today' }, { storyPeriod: 'month' }, { storyKind: 'filing' }],
  heat: [{ heat: 'ALL' }],
  market: [{ sort: 'cap' }],
};

/** The dataset main.js assembles: the live base, then eleven documents that
 *  each load on their own and are each allowed to fail. */
async function dataset() {
  const D = await data.live();
  const add = async (fn, map) => { try { Object.assign(D, map(await fn())); } catch { /* optional */ } };
  await Promise.all([
    add(data.insiders, (v) => ({ insiders: v })),
    add(data.investors, (v) => ({ investors: v })),
    add(data.sectors, (v) => ({ sectorCards: v })),
    add(data.news, (v) => ({ feed: v })),
    add(data.connections, (v) => ({ crossings: v })),
    add(data.disclosureMeanings, (v) => ({ disclosureMeanings: v })),
    add(data.filedMonths, (v) => ({ filedMonths: v })),
    add(data.newsProvenance, (v) => ({ newsProvenance: v })),
    add(data.calendar, (c) => ({ filedEvents: c.filed, expectedEvents: c.expected })),
    add(data.exchange, (e) => ({ rates: e.rates, seriesTo: e.seriesTo, macro: e.macro })),
    add(data.attention, (a) => ({ breadth: a.breadth })),
    add(data.indices, (i) => ({ indexMembers: i.list })),
  ]);
  return D;
}

/** Render every screen and sub-state in both languages. Returns what threw. */
function sweep(D) {
  const dead = [];
  for (const screen of SCREENS) {
    for (const sub of (SUB[screen] || [{}])) {
      for (const lang of ['ar', 'en']) {
        const c = new Component({});
        Object.assign(c.state, { lang, screen }, sub);
        if (screen === 'company') {
          c.state.ticker = (D.companies && D.companies[0] && D.companies[0].ticker) || 'COMI';
        }
        const where = `${screen}${Object.keys(sub).length ? ' ' + JSON.stringify(sub) : ''} [${lang}]`;
        try { c.setData(D); c.renderVals(); }
        catch (error) { dead.push(`${where}: ${error.constructor.name}: ${error.message}`); }
      }
    }
  }
  return dead;
}

const FULL = await dataset();

test('every screen renders on the published documents', () => {
  assert.ok(FULL.companies.length > 100, 'the directory is too small to be a real test');
  assert.deepEqual(sweep(FULL).slice(0, 5), [], 'a screen threw, which blanks the whole page');
});

test('every screen renders for a signed-out reader', () => {
  assert.deepEqual(sweep(data.demo()).slice(0, 5), [], 'a screen threw on the demo tree');
});

/* Each of these is loaded on its own by main.js and each is allowed to fail.
 * A screen that dies when one is missing takes the page down with it, so the
 * reader loses every OTHER screen too because one document timed out. */
const OPTIONAL = ['insiders', 'investors', 'sectorCards', 'feed', 'crossings',
  'disclosureMeanings', 'filedMonths', 'newsProvenance', 'filedEvents',
  'expectedEvents', 'rates', 'macro', 'breadth', 'indexMembers', 'indices'];

for (const missing of OPTIONAL) {
  test(`every screen renders when ${missing} failed to load`, () => {
    const D = { ...FULL };
    delete D[missing];
    assert.deepEqual(sweep(D).slice(0, 5), [],
      `a screen threw with ${missing} absent; one failed document must not blank the site`);
  });
}

test('every screen renders on the barest dataset live() can leave', () => {
  // What a caught error in main.js leaves behind: the directory and nothing else.
  assert.deepEqual(sweep({ demo: false, companies: FULL.companies, series: [], fins: [] }).slice(0, 5), []);
  assert.deepEqual(sweep({ demo: false, companies: [], series: [], fins: [] }).slice(0, 5), []);
});

/* ── the template's own bindings ─────────────────────────────────────────
 *
 * `renderVals()` returning cleanly is only half of it. The template then
 * READS those values, and `{{ investors.dateline }}` against a null
 * `investors` does not throw — `dc.js` catches it, logs "could not evaluate"
 * to a console nobody is watching, and silently drops that subtree. The card
 * is simply not there, for exactly the readers whose documents were slow.
 *
 * That is a class of bug, not an incident: any `{{ a.b }}` read OUTSIDE the
 * `sc-if` that proves `a` arrived. `mount()` needs a real HTML parser and the
 * stub here has none, so this reads the template instead — tracking which
 * `sc-if` conditions and `sc-for` aliases are in scope at each binding — and
 * checks every dotted root against the values each screen really produces
 * when one document failed to load.
 */
const ALWAYS = new Set(['L', 'Math', 'JSON', 'String', 'Number']);

/** Every `{{ a.b }}` in the template, with what was guarding it. */
function dottedBindings(template) {
  const out = [];
  const guards = [];   // sc-if conditions still open
  const aliases = [];  // sc-for aliases still in scope
  const token = /<sc-if\b[^>]*value="\{\{([^}]*)\}\}"|<sc-for\b[^>]*as="([^"]*)"|<\/sc-(if|for)>|\{\{([^}]*)\}\}/g;
  for (const m of template.matchAll(token)) {
    if (m[1] !== undefined) { guards.push(m[1]); continue; }
    if (m[2] !== undefined) { aliases.push(m[2]); continue; }
    if (m[3] === 'if') { guards.pop(); continue; }
    if (m[3] === 'for') { aliases.pop(); continue; }
    const expr = (m[4] || '').trim();
    const dot = /^([A-Za-z_$][\w$]*)\s*\./.exec(expr);
    if (!dot) continue;
    const root = dot[1];
    if (ALWAYS.has(root) || aliases.includes(root)) continue;
    /* A guard counts when it names the thing: `{{ investors }}` or the
       site's companion-boolean idiom, `{{ hasDebt }}` around `debt.*`. */
    const named = root.toLowerCase();
    if (guards.some((g) => g.toLowerCase().includes(named))) continue;
    out.push({ expr, root });
  }
  return out;
}

test('no binding reads through a document that has not arrived', async () => {
  const template = await readFile(new URL('public/esthmr/template.html', ROOT), 'utf8');
  const reads = dottedBindings(template);
  assert.ok(reads.length > 5, 'the template scan found nothing, so it is testing nothing');

  const broken = new Set();
  // Every optional document absent in turn: the state a slow loader produces.
  for (const missing of ['', ...OPTIONAL, 'flowTrackers', 'sectorOwnership', 'top5', 'scenarios', 'picks']) {
    const D = { ...FULL };
    if (missing) delete D[missing];
    for (const screen of SCREENS) {
      for (const lang of ['ar', 'en']) {
        const c = new Component({});
        Object.assign(c.state, { lang, screen });
        if (screen === 'company') c.state.ticker = (D.companies?.[0]?.ticker) || 'COMI';
        c.setData(D);
        let vals;
        try { vals = c.renderVals(); } catch { continue; }
        for (const { expr, root } of reads) {
          if (!(root in vals)) continue;          // never built on this screen
          const value = vals[root];
          if (value === null || value === undefined) {
            broken.add(`{{ ${expr} }} — ${root} is ${value} on ${screen} without ${missing || 'nothing'}`);
          }
        }
      }
    }
  }
  assert.deepEqual([...broken].slice(0, 6), [],
    'a binding reads a field off a value that is null, and dc.js drops its subtree without throwing');
});

/* ── two bindings in one text node ──────────────────────────────────────── */

test('a second binding on the line below the first does not delete them both', async () => {
  /* Half this site's screens are assembled as element trees and handed to the
     template through a `{{ binding }}` — the AI card, the sector table, every
     chart. `interpolate` returns an element only when the binding is ALONE in
     its text node, so two of them in one text node fell to string
     interpolation, where an element becomes the text "[object HTMLDivElement]".
     Writing `{{ changedToday }}` on the line under `{{ aiCards }}` was enough
     to delete both, and nothing failed: the page rendered cleanly without
     either card, on every screen that shows one. */
  const { pieces } = await import('../../public/esthmr/dc.js');
  const doc = globalThis.document;
  const one = doc.createElement('div'); one.className = 'first';
  const two = doc.createElement('div'); two.className = 'second';
  const out = pieces('\n  {{ one }}\n  {{ two }}\n  {{ plain }}\n', { one, two, plain: 'a word' }, null);
  assert.ok(out.includes(one), 'the first element binding was stringified away');
  assert.ok(out.includes(two), 'the second element binding was stringified away');
  const text = out.map((n) => (n.text !== undefined ? n.text : '')).join('');
  assert.doesNotMatch(text, /\[object /, 'an element was rendered as its own type name');
  assert.match(text, /a word/, 'the plain binding beside them was lost');
  // The whitespace between them is kept, or the cards run together.
  assert.equal(out.length, 7, out.length);
});

test('one binding alone in its text node still comes back as itself', async () => {
  const { pieces } = await import('../../public/esthmr/dc.js');
  const card = globalThis.document.createElement('section');
  assert.deepEqual(pieces('{{ card }}', { card }, null), [card]);
  // And the hook still runs over a scalar: Arabic figures need their isolate.
  const wrapped = pieces('{{ n }}', { n: '43%' }, (v) => `<${v}>`);
  assert.equal(wrapped[0].text, '<43%>');
});

test('the template does not rely on a binding being alone on its line', async () => {
  // Belt and braces: if the rule ever comes back, this names the file to fix.
  const template = await readFile(new URL('public/esthmr/template.html', ROOT), 'utf8');
  const crowded = [...template.matchAll(/\{\{[^}]*\}\}[^<\n]*\{\{[^}]*\}\}/g)];
  assert.ok(crowded.length > 0,
    'the scan found no text node with two bindings, so it is proving nothing');
});
