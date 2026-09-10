#!/usr/bin/env python3
"""Small, reproducible sector/ownership read model. Local published inputs only.

No inferred buyer/seller aggression, historical holdings, execution prices or
historical share capital. Unknowns remain null; estimates are explicitly named.
"""
import json
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def positive(v):
    return number(v) and v > 0


def build(directory, market, documents, insiders):
    sectors = {}
    profiles = {}
    as_of = market.get('date')
    event_tickers = {r.get('ticker') for r in insiders.get('items', [])}
    # A return across a missing session is not that day's move.
    dates = sorted({b.get('date') for d in documents.values() for b in d.get('price_history', [])
                    if b.get('date') and b['date'] <= (as_of or '')} | ({as_of} if as_of else set()))
    prior_session = dict(zip(dates[1:], dates[:-1]))
    for co in directory.get('companies', []):
        ticker = co['ticker']
        doc = documents.get(ticker, {})
        profile = doc.get('profile', {})
        currency = co.get('currency') or 'EGP'
        quote = market.get('stocks', {}).get(ticker, {})
        cap = co.get('market_cap')
        close = quote.get('close')
        shares = profile.get('shares_outstanding')
        # The denominator is a current reference only, never a historic stake.
        profiles[ticker] = dict(ticker=ticker, name=doc.get('name') or
            {'en': co.get('name_en', ticker), 'ar': co.get('name_ar', ticker)},
            sector=co.get('sector'), currency=currency, close=close,
            date=as_of, shares=shares if positive(shares) else None,
            sharesDate=doc.get('market', {}).get('date'),
            sharesSource=profile.get('shares_outstanding_source'),
            cap=cap if positive(cap) else None)
        hist = {}
        for bar in doc.get('price_history', []):
            date = bar.get('date', '')
            if date and date <= (as_of or '') and positive(bar.get('close')):
                hist[date] = bar
        # Official current turnover can replace the estimate only for the same session.
        if positive(close):
            current = dict(hist.get(as_of, {}), date=as_of, close=close,
                           volume=quote.get('volume'))
            if doc.get('market', {}).get('date') == as_of and number(profile.get('turnover')):
                current['turnover'] = profile['turnover']
            hist[as_of] = current
        bars = sorted(hist.values(), key=lambda b: b['date'])
        if ticker in event_tickers:
            profiles[ticker]['prices'] = [dict(date=b['date'], close=b['close']) for b in bars[-130:]]
        # Single-company currency-labelled history is still available; only the
        # cross-company EGP sector totals exclude foreign-currency listings.
        if currency != 'EGP':
            continue
        key = co.get('sector') or 'Unclassified'
        sec = sectors.setdefault(key, dict(id=key, name=key,
            nameAr=co.get('sector_ar') or key, members=[], history=[]))
        daily = []
        for i, bar in enumerate(bars):
            v = bar.get('volume')
            exact = bar.get('turnover')
            is_exact = number(exact) and exact >= 0
            val = exact if is_exact else (
                bar['close'] * v if number(v) and v >= 0 else None)
            pct = (bar['close'] / bars[i-1]['close'] - 1) * 100 if (
                i and bars[i-1]['date'] == prior_session.get(bar['date'])) else None
            # Large discontinuities need corporate-action review, not a green spike.
            flagged = number(pct) and abs(pct) > 30
            daily.append(dict(date=bar['date'], value=val,
                estimated=val is not None and not is_exact,
                change=None if flagged else pct, flagged=flagged))
        sec['members'].append(dict(ticker=ticker, cap=cap if positive(cap) else None,
            close=close, daily=daily))
    for sec in sectors.values():
        members = sec['members']
        sec['cap'] = sum(m['cap'] or 0 for m in members) or None
        sec['capCount'] = sum(m['cap'] is not None for m in members)
        days = defaultdict(list)
        for m in members:
            for b in m.pop('daily'):
                days[b['date']].append((m, b))
        for date, rows in sorted(days.items())[-130:]:
            values = [b['value'] for _, b in rows if b['value'] is not None]
            weighted = [(m['cap'], b['change']) for m, b in rows
                        if positive(m['cap']) and number(b['change'])]
            denom = sum(w for w, _ in weighted)
            up = sum(m['cap'] or 0 for m, b in rows if number(b['change']) and b['change'] > 0)
            down = sum(m['cap'] or 0 for m, b in rows if number(b['change']) and b['change'] < 0)
            sec['history'].append(dict(date=date, value=round(sum(values), 2) if values else None,
                valueCount=len(values), estimatedCount=sum(b['estimated'] for _, b in rows),
                change=round(sum(w*r for w, r in weighted)/denom, 5) if denom else None,
                weightCoverage=round(denom / sec['cap'] * 100, 2) if sec['cap'] else None,
                upCap=up, downCap=down, flagged=sum(b['flagged'] for _, b in rows)))
    # Keep the source record intact; a generic filing is not a zero-share trade.
    events = []
    seen = set()
    for r in insiders.get('items', []):
        if r.get('id') and r['id'] in seen:
            continue
        if r.get('id'):
            seen.add(r['id'])
        p = profiles.get(r.get('ticker'), {})
        shares = r.get('shares')
        events.append({**r,
            'referencePercent': shares / p['shares'] * 100
                if number(shares) and shares >= 0 and positive(p.get('shares')) else None,
            'currentMarkedValue': shares * p['close']
                if number(shares) and shares >= 0 and positive(p.get('close')) else None})
    return dict(schemaVersion=1, asOf=as_of, isClose=market.get('is_close') is True,
        insidersAsOf=insiders.get('asOf'), source='Published company histories and official EGX insider disclosures',
        excludedCurrencyCount=sum(p['currency'] != 'EGP' for p in profiles.values()),
        sectors=list(sectors.values()), profiles=profiles, events=events)


def main():
    base = ROOT / 'public/data/v1'
    read = lambda p: json.loads(p.read_text())
    directory = read(base / 'companies.json')
    docs = {c['ticker']: read(base / 'companies' / (c['ticker'] + '.json'))
            for c in directory['companies'] if (base / 'companies' / (c['ticker'] + '.json')).exists()}
    result = build(directory, read(base / 'market.json'), docs, read(base / 'insiders.json'))
    out = base / 'flow-trackers.json'
    # Atomic publication: readers never see half a JSON document.
    tmp = out.with_suffix('.tmp')
    tmp.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')
    tmp.replace(out)
    summary = dict(schemaVersion=1, asOf=result['asOf'], eventCount=len(result['events']),
        sectors=[dict(id=s['id'], name=s['name'], nameAr=s['nameAr'], cap=s['cap'],
                      history=s['history'][-1:]) for s in result['sectors']])
    preview = base / 'flow-preview.json'
    preview_tmp = preview.with_suffix('.tmp')
    preview_tmp.write_text(json.dumps(summary, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')
    preview_tmp.replace(preview)
    # The manifest validates parity for every versioned resource.
    for source in (out, preview):
        fixture = ROOT / 'app/assets/fixtures' / source.name
        fixture.parent.mkdir(parents=True, exist_ok=True)
        staged = fixture.with_suffix('.tmp')
        staged.write_bytes(source.read_bytes())
        staged.replace(fixture)
    print(f"Flow trackers: {len(result['sectors'])} sectors, {len(result['events'])} disclosures")


if __name__ == '__main__':
    main()
