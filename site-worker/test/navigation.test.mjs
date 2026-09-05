import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readRoute, routeKey, connectNavigation } from '../../public/esthmr/navigation.js';

test('all destinations round-trip and malformed routes are safe', () => {
  for (const screen of ['home','market','company','today','investors','heat','watchlist','sectors','calendar','exchange','tools','research','crossings']) {
    assert.equal(readRoute(routeKey({screen, ticker:'COMI', companyPanel:'financials'})).screen, screen);
  }
  assert.deepEqual(readRoute('?view=bogus&ticker=<script>&panel=wrong'),
    {screen:'home', ticker:'', companyPanel:'overview', marketMode:'',rankMetric:'cap',rankPair:'',rankAscending:false});
  assert.equal(readRoute('?view=company&ticker=COMI&panel=financials').companyPanel, 'financials');
});

test('browser Back changes state without creating another history entry', () => {
  let back;
  const writes = [];
  const c = { state: {screen:'home'}, setState(s) {this.state = s; sync();} };
  const host = {location:{href:'https://example.test/esthmr/', search:'?view=market'},
    addEventListener(_, cb) {back=cb;}, scrollTo() {},
    history:{pushState(_, __, url) {writes.push(String(url));}}};
  const sync=connectNavigation(c,host);
  c.state.screen='tools'; sync(); sync();
  assert.equal(writes.length,1);
  back();
  assert.equal(c.state.screen,'market');
  assert.equal(writes.length,1);
});
