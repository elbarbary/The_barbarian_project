#!/usr/bin/env python3
"""Small, reproducible sector/ownership read model. Local published inputs only.

No inferred buyer/seller aggression, historical holdings, execution prices or
historical share capital. Unknowns remain null; estimates are explicitly named.
"""
import json
import math
from collections import defaultdict, OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def positive(v):
    return number(v) and v > 0


# The share of a sector's companies that must have traded in a month before
# that month is published. Price history reaches back years for a handful of
# companies and eight months for nearly all of them: aggregated without a
# floor, the exchange's traded value appears to grow twentyfold in August 2025,
# which is the archive filling up and not money arriving.
MONTH_COVERAGE_FLOOR = 0.6


def monthly(days, member_count, as_of):
    """A sector's traded value by calendar month, with what it was measured on.

    Turnover is money changing hands, so summing a month of it is sound in a
    way that summing a month of price moves is not — the weighted daily move
    already exists and compounding it across a month with fixed current weights
    would state a return this project does not claim. So months carry value,
    the sessions behind it, and the companies that reported, and nothing else.
    """
    buckets = OrderedDict()
    for date in sorted(days):
        rows = days[date]
        values = [b['value'] for _, b in rows if b['value'] is not None]
        month = buckets.setdefault(date[:7], dict(month=date[:7], value=0.0,
            sessions=0, tickers=set(), first=date, last=date,
            upValue=0.0, downValue=0.0))
        month['sessions'] += 1
        month['last'] = date
        month['value'] += sum(values)
        month['tickers'].update(m['ticker'] for m, b in rows if b['value'] is not None)
        month['upValue'] += sum(b['value'] or 0 for m, b in rows
                                if number(b['change']) and b['change'] > 0)
        month['downValue'] += sum(b['value'] or 0 for m, b in rows
                                  if number(b['change']) and b['change'] < 0)
    out = []
    for month in buckets.values():
        companies = len(month.pop('tickers'))
        first, last = month.pop('first'), month.pop('last')
        out.append(dict(month=month['month'], sessions=month['sessions'],
            companies=companies,
            coverage=round(companies / member_count * 100, 1) if member_count else None,
            # A month the reader can only half compare: the one still running,
            # or one the archive joins or leaves in the middle of.
            partial=(month['month'] == (as_of or '')[:7]
                     or int(first[8:10]) > 5 or int(last[8:10]) < 25),
            value=round(month['value'], 2),
            upValue=round(month['upValue'], 2),
            downValue=round(month['downValue'], 2)))
    return out


def trim_months(sectors, as_of):
    """One shared first month for every sector, and the reason it is that one.

    Sectors joined the archive at different times, so trimming each to its own
    coverage would put thirty series on one axis starting in thirty different
    months and invite a reader to compare a full sector against a third of
    another. The exchange's own coverage decides, once, for all of them.
    """
    counted = defaultdict(lambda: [0, 0])
    for sec in sectors:
        members = len(sec['members']) or 1
        for month in sec.get('months', ()):
            counted[month['month']][0] += month['companies']
            counted[month['month']][1] += members
    good = [m for m, (have, want) in sorted(counted.items())
            if want and have / want >= MONTH_COVERAGE_FLOOR]
    start = good[0] if good else None
    for sec in sectors:
        sec['months'] = [m for m in sec.get('months', ())
                         if start and m['month'] >= start]
    months = []
    for month, (have, want) in sorted(counted.items()):
        if start and month < start:
            continue
        value = sum(m['value'] for sec in sectors for m in sec['months']
                    if m['month'] == month)
        sessions = max((m['sessions'] for sec in sectors for m in sec['months']
                        if m['month'] == month), default=0)
        months.append(dict(month=month, value=round(value, 2), sessions=sessions,
            companies=have, coverage=round(have / want * 100, 1) if want else None,
            partial=any(m['partial'] for sec in sectors for m in sec['months']
                        if m['month'] == month)))
    return dict(months=months, from_=start, coverageFloor=MONTH_COVERAGE_FLOOR * 100,
                held=sorted(m for m in counted if start and m < start))


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
            daily_bars = m.pop('daily', [])
            latest_b = daily_bars[-1] if daily_bars else {}
            m['name'] = profiles.get(m['ticker'], {}).get('name')
            m['change'] = latest_b.get('change')
            m['value'] = latest_b.get('value')
            m['weight'] = round(m['cap'] / sec['cap'] * 100, 2) if positive(m['cap']) and positive(sec['cap']) else None
            m['impact'] = round(m['weight'] * m['change'] / 100, 4) if positive(m['weight']) and number(m['change']) else None
            for b in daily_bars:
                days[b['date']].append((m, b))
        sec['members'].sort(key=lambda x: (x['cap'] is not None, x['cap'] or 0), reverse=True)
        sec['months'] = monthly(days, len(members), as_of)
        for date, rows in sorted(days.items())[-130:]:
            values = [b['value'] for _, b in rows if b['value'] is not None]
            weighted = [(m['cap'], b['change']) for m, b in rows
                        if positive(m['cap']) and number(b['change'])]
            denom = sum(w for w, _ in weighted)
            up = sum(m['cap'] or 0 for m, b in rows if number(b['change']) and b['change'] > 0)
            down = sum(m['cap'] or 0 for m, b in rows if number(b['change']) and b['change'] < 0)
            up_val = sum(b['value'] or 0 for m, b in rows if number(b['change']) and b['change'] > 0 and b['value'] is not None)
            down_val = sum(b['value'] or 0 for m, b in rows if number(b['change']) and b['change'] < 0 and b['value'] is not None)
            flat_val = sum(b['value'] or 0 for m, b in rows if number(b['change']) and b['change'] == 0 and b['value'] is not None)
            up_cnt = sum(1 for m, b in rows if number(b['change']) and b['change'] > 0)
            down_cnt = sum(1 for m, b in rows if number(b['change']) and b['change'] < 0)
            flat_cnt = sum(1 for m, b in rows if number(b['change']) and b['change'] == 0)
            sec_val = round(sum(values), 2) if values else None
            turnover_to_cap = round(sec_val / sec['cap'] * 100, 4) if (sec_val is not None and positive(sec['cap'])) else None
            sec['history'].append(dict(date=date, value=sec_val,
                valueCount=len(values), estimatedCount=sum(b['estimated'] for _, b in rows),
                change=round(sum(w*r for w, r in weighted)/denom, 5) if denom else None,
                weightCoverage=round(denom / sec['cap'] * 100, 2) if sec['cap'] else None,
                upCap=up, downCap=down, flagged=sum(b['flagged'] for _, b in rows),
                upValue=round(up_val, 2) if up_val > 0 else 0,
                downValue=round(down_val, 2) if down_val > 0 else 0,
                flatValue=round(flat_val, 2) if flat_val > 0 else 0,
                upCount=up_cnt, downCount=down_cnt, flatCount=flat_cnt,
                turnoverToCap=turnover_to_cap))
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

    # Pre-calculate stake history per company profile
    stake_histories = defaultdict(list)
    for it in sorted(events, key=lambda x: x.get('date') or ''):
        t = it.get('ticker')
        sh = it.get('shares')
        if not t or not sh or t not in profiles:
            continue
        p = profiles[t]
        tot_shares = p.get('shares')
        cls = p.get('close') or 0
        act = it.get('action')
        sign = 1 if act in ('bought', 'treasury_purchase') else -1
        signed_shares = sign * sh
        delta_pct = round(signed_shares / tot_shares * 100, 4) if positive(tot_shares) else None
        val = round(sh * cls, 2) if cls > 0 else None
        prev_cum = stake_histories[t][-1]['cumulativeStake'] if stake_histories[t] else 0
        cum_pct = round(prev_cum + (delta_pct or 0), 4)
        stake_histories[t].append({
            'id': it.get('id'),
            'date': it.get('date'),
            'action': act,
            'actionLabel': it.get('actionLabel'),
            'actionLabelAr': it.get('actionLabelAr'),
            'relationship': it.get('relationship'),
            'relationshipLabel': it.get('relationshipLabel'),
            'relationshipLabelAr': it.get('relationshipLabelAr'),
            'shares': sh,
            'signedShares': signed_shares,
            'stakeDeltaPercent': delta_pct,
            'cumulativeStake': cum_pct,
            'markedValue': val,
            'close': cls,
        })

    for t, hist in stake_histories.items():
        if t in profiles:
            profiles[t]['stakeHistory'] = hist
            profiles[t]['netInsiderShares'] = sum(h['signedShares'] for h in hist)
            profiles[t]['netStakeChangePercent'] = hist[-1]['cumulativeStake'] if hist else None
            profiles[t]['netMarkedValue'] = round(profiles[t]['netInsiderShares'] * (profiles[t].get('close') or 0), 2) if profiles[t].get('close') else None

        # Compute relational ownership graph with ACTUAL NAMED ENTITIES (entity -> company links)
    conn_map = defaultdict(lambda: {'buyShares': 0, 'sellShares': 0, 'events': 0, 'latestDate': '', 'sourceLabel': '', 'sourceLabelAr': ''})
    named_entities_dict = {}

    for it in events:
        t = it.get('ticker')
        if not t:
            continue
        sh = it.get('shares') or 0
        rel = it.get('relationship') or 'insider'
        act = it.get('action') or ''
        dt = it.get('date') or ''
        p = profiles.get(t, {})
        co_name = (p.get('name') or {}).get('en') or it.get('company') or t
        co_ar = (p.get('name') or {}).get('ar') or it.get('companyAr') or t
        inv = it.get('investorName')

        if inv and 'disclosed' not in inv.lower() and 'investor not named' not in inv.lower():
            ent_id = f"inv-{t}"
            label = inv
            label_ar = inv
        elif 'treasury' in act or rel == 'treasury':
            ent_id = f"treasury-{t}"
            label = f"{co_name} Treasury"
            label_ar = f"خزينة {co_ar}"
        elif rel == 'major_holder' or 'major' in str(it.get('relationshipLabel', '')).lower():
            ent_id = f"major-{t}"
            label = f"{co_name} Major Shareholders"
            label_ar = f"كبار مساهمي {co_ar}"
        elif rel == 'related_party' or 'related' in str(it.get('relationshipLabel', '')).lower():
            ent_id = f"related-{t}"
            label = f"{co_name} Connected Group"
            label_ar = f"المجموعة المرتبطة بشركة {co_ar}"
        else:
            ent_id = f"insider-{t}"
            label = f"{co_name} Board & Insiders"
            label_ar = f"داخليو ومجلس إدارة {co_ar}"

        named_entities_dict[ent_id] = {
            'id': ent_id,
            'label': label,
            'labelAr': label_ar,
            'ticker': t,
        }

        c = conn_map[(ent_id, t)]
        c['events'] += 1
        c['sourceLabel'] = label
        c['sourceLabelAr'] = label_ar
        if dt > c['latestDate']:
            c['latestDate'] = dt
        if act in ('bought', 'treasury_purchase'):
            c['buyShares'] += sh
        else:
            c['sellShares'] += sh

    ownership_links = []
    for (ent_id, t), c in conn_map.items():
        p = profiles.get(t, {})
        tot_shares = p.get('shares')
        cls = p.get('close') or 0
        net_sh = c['buyShares'] - c['sellShares']
        stake_pct = round(net_sh / tot_shares * 100, 3) if positive(tot_shares) and net_sh != 0 else None
        gross_pct = round((c['buyShares'] + c['sellShares']) / tot_shares * 100, 3) if positive(tot_shares) and (c['buyShares'] + c['sellShares']) > 0 else None
        val = round(abs(net_sh) * cls, 2) if cls > 0 and net_sh != 0 else None
        co_name = p.get('name', {}).get('en') or t
        co_ar = p.get('name', {}).get('ar') or t
        act_summary = 'bought' if net_sh > 0 else ('sold' if net_sh < 0 else ('treasury' if 'treasury' in ent_id else 'disclosure'))
        ownership_links.append({
            'source': ent_id,
            'sourceLabel': c['sourceLabel'],
            'sourceLabelAr': c['sourceLabelAr'],
            'target': t,
            'company': co_name,
            'companyAr': co_ar,
            'sector': p.get('sector') or '',
            'action': act_summary,
            'netShares': net_sh,
            'stakePercent': stake_pct,
            'grossStakePercent': gross_pct,
            'markedValue': val,
            'eventCount': c['events'],
            'latestDate': c['latestDate'],
        })

    # Sort links by economic magnitude: largest stake % or value first
    ownership_links.sort(key=lambda l: (abs(l['stakePercent'] or 0), l['markedValue'] or 0, l['eventCount']), reverse=True)

    # Attach summary stats to each sector
    for s in sectors.values():
        if s['history']:
            latest = s['history'][-1]
            s['boughtAmount'] = latest.get('upValue') or 0
            s['soldAmount'] = latest.get('downValue') or 0
            s['flatAmount'] = latest.get('flatValue') or 0
            s['netFlow'] = round(s['boughtAmount'] - s['soldAmount'], 2)
            s['sizeWeightedReturn'] = latest.get('change')
            s['velocity'] = latest.get('turnoverToCap')

    # Money by month, once the archive is deep enough to compare months.
    months = trim_months(list(sectors.values()), as_of)

    # Top entities for graph visualization
    top_entity_ids = [l['source'] for l in ownership_links]
    entities_list = [named_entities_dict[eid] for eid in dict.fromkeys(top_entity_ids) if eid in named_entities_dict]

    ownership_graph = {
        'entities': entities_list,
        'links': ownership_links,
    }

    return dict(schemaVersion=1, asOf=as_of, isClose=market.get('is_close') is True,
        insidersAsOf=insiders.get('asOf'), source='Published company histories and official EGX insider disclosures',
        excludedCurrencyCount=sum(p['currency'] != 'EGP' for p in profiles.values()),
        sectors=list(sectors.values()), profiles=profiles, events=events,
        ownershipGraph=ownership_graph, monthly=months)


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="Validate without writing")
    args = ap.parse_args()

    base = ROOT / 'public/data/v1'
    read = lambda p: json.loads(p.read_text())
    directory = read(base / 'companies.json')
    docs = {c['ticker']: read(base / 'companies' / (c['ticker'] + '.json'))
            for c in directory['companies'] if (base / 'companies' / (c['ticker'] + '.json')).exists()}
    result = build(directory, read(base / 'market.json'), docs, read(base / 'insiders.json'))

    if args.check:
        print(f"Flow trackers: {len(result['sectors'])} sectors, {len(result['events'])} disclosures, {len(result['ownershipGraph']['links'])} ownership links (check ok)")
        return 0

    out = base / 'flow-trackers.json'
    # Atomic publication: readers never see half a JSON document.
    tmp = out.with_suffix('.tmp')
    tmp.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')
    tmp.replace(out)

    top_events = [e for e in result['events'] if number(e.get('referencePercent')) or number(e.get('currentMarkedValue'))]
    top_events.sort(key=lambda e: (e.get('date') or '', e.get('referencePercent') or 0), reverse=True)

    summary = dict(schemaVersion=1, asOf=result['asOf'], eventCount=len(result['events']),
        topEvents=top_events[:12],
        topOwnershipLinks=result['ownershipGraph']['links'][:16],
        ownershipEntities=result['ownershipGraph']['entities'],
        sectors=[dict(id=s['id'], name=s['name'], nameAr=s['nameAr'], cap=s['cap'],
                      capCount=s['capCount'],
                      boughtAmount=s.get('boughtAmount', 0),
                      soldAmount=s.get('soldAmount', 0),
                      netFlow=s.get('netFlow', 0),
                      sizeWeightedReturn=s.get('sizeWeightedReturn'),
                      velocity=s.get('velocity'),
                      history=s['history'][-15:],
                      topMembers=[dict(ticker=m['ticker'], name=m.get('name'), cap=m['cap'],
                                       weight=m.get('weight'), change=m.get('change'),
                                       impact=m.get('impact'), value=m.get('value'))
                                  for m in s['members'][:5]])
                 for s in result['sectors']])
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
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
