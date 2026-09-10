import { React as R } from './react-shim.js';

const h = R.createElement;
const finite = v => typeof v === 'number' && Number.isFinite(v);
const signed = v => finite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(2)}%` : '—';
const compact = v => finite(v) ? new Intl.NumberFormat('en', { notation:'compact', maximumFractionDigits:2 }).format(v) : '—';
const tone = v => v > 0 ? 'var(--up)' : v < 0 ? 'var(--down)' : 'var(--t2)';
const direction = action => ({bought:1, sold:-1, treasury_purchase:1, treasury_sale:-1})[action] || 0;
const safeLink = link => /^https:\/\/(www\.)?egx\.com\.eg\//i.test(link || '') ? link : null;

export function sectorWindow(sector, count = 20) {
  const history = (sector?.history || []).slice(-count);
  const values = history.filter(b => finite(b.value));
  const upValues = history.filter(b => finite(b.upValue));
  const downValues = history.filter(b => finite(b.downValue));
  const totalUp = upValues.length ? upValues.reduce((s, b) => s + b.upValue, 0) : null;
  const totalDown = downValues.length ? downValues.reduce((s, b) => s + b.downValue, 0) : null;
  const changes = history.map(b => b.change).filter(finite);
  const avgChange = changes.length ? changes.reduce((s, c) => s + c, 0) / changes.length : null;

  return {
    history,
    value: values.length ? values.reduce((s, b) => s + b.value, 0) : null,
    upValue: totalUp,
    downValue: totalDown,
    avgChange,
    latest: history.at(-1) || {},
    from: history[0]?.date || '',
    to: history.at(-1)?.date || ''
  };
}

export function ownershipRows(data, {ticker='', kind='all', investor='', count=90, sort='date'} = {}) {
  const end = data.insidersAsOf || data.asOf;
  const start = /^\d{4}-\d{2}-\d{2}$/.test(end || '')
    ? new Date(Date.parse(end+'T00:00:00Z') - (count-1)*86400000).toISOString().slice(0,10) : '';
  const filtered = (data.events || []).filter(r => (!ticker || r.ticker === ticker)
    && (!investor || r.investorName === investor)
    && (!start || (r.date && r.date >= start && r.date <= end))
    && (kind === 'all' || (kind === 'treasury' ? r.action?.startsWith('treasury_') : !r.action?.startsWith('treasury_'))));

  if (sort === 'stake') {
    return filtered.sort((a, b) => (b.referencePercent || 0) - (a.referencePercent || 0)
      || (b.date || '').localeCompare(a.date || '')
      || String(a.id).localeCompare(String(b.id)));
  }
  if (sort === 'value') {
    return filtered.sort((a, b) => (b.currentMarkedValue || 0) - (a.currentMarkedValue || 0)
      || (b.date || '').localeCompare(a.date || '')
      || String(a.id).localeCompare(String(b.id)));
  }
  return filtered.sort((a,b)=>(b.date || '').localeCompare(a.date || '') || String(a.id).localeCompare(String(b.id)));
}

// One dated observation per column. Missing values break the line, never zero-fill.
export function linePath(points, key) {
  const vals = (points || []).map(p => p[key]).filter(finite);
  if (!vals.length) return '';
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  let open = false;
  return points.map((p, i) => {
    if (!finite(p[key])) { open = false; return ''; }
    const command = open ? 'L' : 'M';
    open = true;
    return `${command}${(8 + (i / Math.max(1, points.length - 1)) * 584).toFixed(2)} ${(108 - ((p[key] - lo) / span) * 96).toFixed(2)}`;
  }).filter(Boolean).join(' ');
}

function areaPath(points, key) {
  const vals = (points || []).map(p => p[key]).filter(finite);
  if (vals.length < 2) return '';
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const segments = [];
  let current = [];
  points.forEach((p, i) => {
    if (finite(p[key])) {
      const x = 8 + (i / Math.max(1, points.length - 1)) * 584;
      const y = 108 - ((p[key] - lo) / span) * 96;
      current.push({ x, y });
    } else if (current.length) {
      segments.push(current);
      current = [];
    }
  });
  if (current.length) segments.push(current);
  return segments.map(seg => {
    if (seg.length < 2) return '';
    const first = seg[0], last = seg[seg.length - 1];
    const cmds = seg.map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(' ');
    return `${cmds} L${last.x.toFixed(2)} 112 L${first.x.toFixed(2)} 112 Z`;
  }).filter(Boolean).join(' ');
}

function sparklineSvg(points, key, width = 84, height = 24, stroke = 'var(--accent)') {
  if (!points || points.length < 2) return null;
  const vals = points.map(p => p[key]).filter(finite);
  if (vals.length < 2) return null;
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const pts = points.map((p, i) => {
    if (!finite(p[key])) return null;
    const x = (3 + (i / Math.max(1, points.length - 1)) * (width - 6)).toFixed(1);
    const y = (height - 3 - ((p[key] - lo) / span) * (height - 6)).toFixed(1);
    return `${x},${y}`;
  }).filter(Boolean).join(' ');
  if (!pts) return null;
  return h('svg', { className: 'ft-sparkline', viewBox: `0 0 ${width} ${height}`, width, height, role: 'img', 'aria-hidden': 'true' },
    h('polyline', { fill: 'none', stroke, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', points: pts })
  );
}

function chart(points, key, title, format = compact, stroke = 'var(--accent)', withArea = true) {
  const valid = (points || []).filter(p => finite(p[key]));
  if (valid.length < 2) return h('div', { className: 'ft-chart-shell' }, h('p', { className: 'ft-empty' }, title + ' · —'));
  const vals = valid.map(p => p[key]);
  const lPath = linePath(points, key);
  const aPath = withArea ? areaPath(points, key) : '';
  return h('div', { className: 'ft-chart-shell' },
    h('figure', { className: 'ft-chart', 'data-chart-title': title },
      h('figcaption', null,
        h('span', null, title),
        h('b', { dir: 'ltr' }, `${format(Math.min(...vals))} – ${format(Math.max(...vals))}`)
      ),
      h('svg', { viewBox: '0 0 600 120', role: 'img', 'aria-label': `${title}: ${points[0].date} → ${points.at(-1).date}` },
        [24, 64, 108].map(y => h('line', { key: y, x1: 8, x2: 592, y1: y, y2: y, stroke: 'var(--rule2)', strokeWidth: 1 })),
        aPath ? h('path', { d: aPath, fill: 'currentColor', opacity: 0.08, style: { color: stroke } }) : null,
        lPath ? h('path', { d: lPath, fill: 'none', stroke, strokeWidth: 2.5, vectorEffect: 'non-scaling-stroke' }) : null
      ),
      h('div', { className: 'ft-chart-dates', dir: 'ltr' },
        h('span', null, points[0].date),
        h('span', null, points.at(-1).date)
      )
    )
  );
}

function dualChart(points, keyUp, keyDown, title, labelUp, labelDown, format = compact) {
  const validUp = (points || []).map(p => p[keyUp]).filter(finite);
  const validDown = (points || []).map(p => p[keyDown]).filter(finite);
  const allVals = [...validUp, ...validDown];
  if (allVals.length < 2) return h('div', { className: 'ft-chart-shell' }, h('p', { className: 'ft-empty' }, title + ' · —'));
  const lo = 0;
  const hi = Math.max(...allVals, 1);
  const span = hi - lo || 1;

  const pathFor = (key) => {
    let open = false;
    return points.map((p, i) => {
      if (!finite(p[key])) { open = false; return ''; }
      const cmd = open ? 'L' : 'M';
      open = true;
      return `${cmd}${(8 + (i / Math.max(1, points.length - 1)) * 584).toFixed(2)} ${(108 - ((p[key] - lo) / span) * 96).toFixed(2)}`;
    }).filter(Boolean).join(' ');
  };

  const pathUp = pathFor(keyUp);
  const pathDown = pathFor(keyDown);

  return h('div', { className: 'ft-chart-shell ft-chart-dual' },
    h('figure', { className: 'ft-chart', 'data-chart-title': title },
      h('figcaption', null,
        h('span', null, title),
        h('div', { className: 'ft-chart-legend' },
          h('span', { className: 'ft-legend-item ft-up-legend' }, h('i', { 'aria-hidden': 'true' }), labelUp),
          h('span', { className: 'ft-legend-item ft-down-legend' }, h('i', { 'aria-hidden': 'true' }), labelDown)
        )
      ),
      h('svg', { viewBox: '0 0 600 120', role: 'img', 'aria-label': `${title}: ${points[0].date} → ${points.at(-1).date}` },
        [24, 64, 108].map(y => h('line', { key: y, x1: 8, x2: 592, y1: y, y2: y, stroke: 'var(--rule2)', strokeWidth: 1 })),
        pathUp ? h('path', { d: pathUp, fill: 'none', stroke: 'var(--up)', strokeWidth: 2.2, vectorEffect: 'non-scaling-stroke' }) : null,
        pathDown ? h('path', { d: pathDown, fill: 'none', stroke: 'var(--down)', strokeWidth: 2.2, vectorEffect: 'non-scaling-stroke' }) : null
      ),
      h('div', { className: 'ft-chart-dates', dir: 'ltr' },
        h('span', null, points[0].date),
        h('span', null, points.at(-1).date)
      )
    )
  );
}

function metric(label, value, sub, toneVal = null) {
  return h('div', { className: 'ft-metric' },
    h('span', null, label),
    h('strong', { dir: 'ltr', style: toneVal ? { color: tone(toneVal) } : null }, value),
    sub && h('small', null, sub)
  );
}

function button(label, fn, active = false) {
  return h('button', { type: 'button', className: 'ft-pill', onClick: fn, 'aria-pressed': String(active) }, label);
}

function select(label, value, options, onChange) {
  return h('label', { className: 'ft-select' },
    h('span', null, label),
    h('select', { value, onChange: e => onChange(e.target.value) },
      options.map(([id, name]) => h('option', { key: id, value: id, selected: id === value ? 'selected' : null }, name))
    )
  );
}

function band(sec, latest) {
  const total = sec.cap || 1;
  const upW = Math.min(100, Math.max(0, ((latest.upCap || 0) / total) * 100));
  const downW = Math.min(100 - upW, Math.max(0, ((latest.downCap || 0) / total) * 100));
  return h('div', { className: 'ft-band', 'aria-hidden': 'true' },
    h('i', { style: { width: `${upW.toFixed(1)}%`, background: 'var(--up)' } }),
    h('i', { style: { width: `${downW.toFixed(1)}%`, background: 'var(--down)' } })
  );
}

export function flowTrackers(component, data, ar) {
  const t = (en, arabic) => ar ? arabic : en;
  const st = component.state;
  const d = data.flowTrackers;
  const go = screen => component.setState({ screen });
  const sectorTitle = t('Sector pulse', 'نبض سيولة القطاعات');
  const ownerTitle = t('Ownership lens', 'عدسة الملكية');
  const ready = d?.schemaVersion === 1;
  const preview = ready ? d : data.flowPreview;
  const sectors = preview?.sectors || [];
  const titleOf = s => ar ? s.nameAr : s.name;
  const topSectors = [...sectors].sort((a, b) => (b.history?.at(-1)?.value || 0) - (a.history?.at(-1)?.value || 0)).slice(0, 4);
  const totalFlow = topSectors.reduce((s, x) => s + (x.history?.at(-1)?.value || 0), 0);
  const topEvents = preview?.topEvents || (d?.events ? d.events.filter(r => finite(r.referencePercent) || finite(r.currentMarkedValue)).slice(0, 8) : []);

  const home = h('section', { className: 'ft-portals', 'aria-label': t('Follow the money and ownership', 'تتبّع التداول والملكية') },
    // 1. Sector Liquidity Portal Button (Double-Bezel)
    h('button', {
      type: 'button',
      className: 'ft-portal ft-portal-sector',
      onClick: () => go('liquidity'),
      'aria-label': t('Explore sector liquidity', 'استكشف سيولة القطاعات')
    },
      h('div', { className: 'ft-portal-shell' },
        h('div', { className: 'ft-portal-core' },
          h('div', { className: 'ft-portal-header' },
            h('div', { className: 'ft-eyebrow-line' },
              h('span', { className: 'ft-eyebrow' }, t('SECTOR PULSE & LIQUIDITY', 'نبض وسيولة القطاعات')),
              h('span', { className: 'ft-pulse-badge' }, h('i', { className: 'ft-pulse-dot', 'aria-hidden': 'true' }), t('FLOW RADAR', 'رادار السيولة'))
            ),
            h('h2', null, sectorTitle),
            h('p', null, t('Where activity meets market size · Advancing vs declining capital.', 'حجم التداول بجوار وزن القطاع · رأس المال الصاعد مقابل الهابط.'))
          ),
          h('div', { className: 'ft-portal-visual' },
            topSectors.length ? h('div', { className: 'ft-preview-grid' },
              topSectors.map(s => {
                const lat = s.history?.at(-1) || {};
                const hist = s.history || [];
                return h('div', { key: s.id, className: 'ft-preview-item' },
                  h('div', { className: 'ft-preview-info' },
                    h('span', { className: 'ft-preview-name' }, titleOf(s)),
                    h('b', { className: 'ft-preview-val', dir: 'ltr' }, compact(lat.value) + ' EGP')
                  ),
                  h('div', { className: 'ft-preview-row-center' },
                    band(s, lat),
                    h('strong', { className: 'ft-preview-badge', dir: 'ltr', style: { color: tone(lat.change) } }, signed(lat.change))
                  ),
                  hist.length > 2 ? sparklineSvg(hist, 'value', 84, 20, lat.change > 0 ? 'var(--up)' : 'var(--accent)') : null
                );
              })
            ) : h('div', { className: 'ft-empty-mini' }, t('Sector size · trading value · price movement', 'حجم القطاع · قيمة التداول · حركة السعر'))
          ),
          h('div', { className: 'ft-portal-meta' },
            h('span', null, t('Size in rising / falling stocks · ', 'الحجم في الأسهم الصاعدة / الهابطة · ') + (preview?.asOf || '')),
            totalFlow > 0 ? h('span', { className: 'ft-market-turnover', dir: 'ltr' }, t('Top flow: ', 'إجمالي النشط: ') + compact(totalFlow) + ' EGP') : null
          ),
          h('div', { className: 'ft-portal-foot' },
            h('span', null, t('Explore sector liquidity', 'استكشف سيولة القطاعات')),
            h('span', { className: 'ft-arrow-pill', 'aria-hidden': 'true' }, '↗')
          )
        )
      )
    ),
    // 2. Ownership Lens Portal Button (Double-Bezel)
    h('button', {
      type: 'button',
      className: 'ft-portal ft-portal-owner',
      onClick: () => go('ownership'),
      'aria-label': t('See stake & value context', 'شاهد سياق الحصة والقيمة')
    },
      h('div', { className: 'ft-portal-shell' },
        h('div', { className: 'ft-portal-core' },
          h('div', { className: 'ft-portal-header' },
            h('div', { className: 'ft-eyebrow-line' },
              h('span', { className: 'ft-eyebrow' }, t('INSIDER DEALING & STAKES', 'تعاملات الداخليين والحصص')),
              h('span', { className: 'ft-tag-pill' }, t('% Stake > Share Count', 'النسبة أهم من عدد الأسهم'))
            ),
            h('h2', null, ownerTitle),
            h('p', null, t('Tracking when insiders change their percentage in companies over time.', 'تتبّع تغير حصص الداخليين في الشركات عبر الزمن.'))
          ),
          h('div', { className: 'ft-portal-visual ft-owner-stream' },
            topEvents.length ? h('div', { className: 'ft-stake-feed' },
              topEvents.slice(0, 3).map(ev => {
                const dir = direction(ev.action);
                const pct = ev.referencePercent;
                const val = ev.currentMarkedValue;
                const rel = ar ? (ev.relationshipLabelAr || ev.relationship) : (ev.relationshipLabel || ev.relationship);
                return h('div', { key: ev.id, className: 'ft-stake-feed-item' },
                  h('div', { className: 'ft-feed-top' },
                    h('span', { className: 'ft-feed-ticker' }, ev.ticker),
                    h('span', { className: 'ft-feed-rel' }, rel || ev.company),
                    h('time', { className: 'ft-feed-date' }, ev.date)
                  ),
                  h('div', { className: 'ft-feed-bottom' },
                    finite(pct) ? h('span', { className: 'ft-stake-badge', style: { color: tone(dir), borderColor: tone(dir) }, dir: 'ltr' },
                      `${dir > 0 ? '+' : dir < 0 ? '−' : ''}${pct.toFixed(2)}% ` + t('of Co', 'من الشركة')
                    ) : h('span', { className: 'ft-stake-badge' }, ev.actionLabel || t('Disclosure', 'إفصاح')),
                    finite(val) ? h('b', { className: 'ft-feed-value', dir: 'ltr' }, compact(val) + ' EGP') : null
                  )
                );
              })
            ) : h('div', { className: 'ft-orbit-wrap' },
              h('div', { className: 'ft-orbit', 'aria-hidden': 'true' }, h('span', null, '%')),
              h('div', null,
                h('strong', null, compact(preview?.eventCount || 0)),
                h('span', null, t('disclosures to explore', 'إفصاح للاستكشاف'))
              )
            )
          ),
          h('div', { className: 'ft-portal-meta' },
            h('span', null, t('Denominator is company share capital · Marked at current price', 'المقام هو إجمالي أسهم الشركة · مقيمة بسعر اليوم'))
          ),
          h('div', { className: 'ft-portal-foot' },
            h('span', null, t('See stake & value context', 'شاهد سياق الحصة والقيمة')),
            h('span', { className: 'ft-arrow-pill', 'aria-hidden': 'true' }, '↗')
          )
        )
      )
    )
  );

  const header = title => h('header', { className: 'ft-heading' },
    h('span', { className: 'ft-eyebrow' }, 'ESTHMR / ' + t('MARKET OBSERVATORY', 'مرصد السوق')),
    h('h1', null, title),
    h('p', null, t('Published observations, not investment instructions.', 'بيانات منشورة، وليست توجيهات استثمارية.'))
  );

  if (!ready) {
    return {
      home,
      screen: h('section', { className: 'ft-screen' },
        header(st.screen === 'ownership' ? ownerTitle : sectorTitle),
        h('div', { className: 'ft-empty', role: 'status' },
          data.demo
            ? t('Sign in to explore published sector and ownership data. No invented holdings are shown here.', 'سجّل الدخول لاستكشاف بيانات القطاعات والملكية المنشورة. لا نعرض حصصاً افتراضية هنا.')
            : st.flowLoading
              ? t('Loading the published history…', 'جارٍ تحميل التاريخ المنشور…')
              : t('The tracker data has not arrived. Retry to load the published snapshot.', 'لم تصل بيانات المتتبّع بعد. أعد المحاولة لتحميل اللقطة المنشورة.')
        ),
        !data.demo && !st.flowLoading && button(t('Retry data', 'إعادة التحميل'), () => component.onRetryData?.())
      )
    };
  }

  // ══════════════════════════════════════════════
  // SCREEN: SECTOR LIQUIDITY
  // ══════════════════════════════════════════════
  if (st.screen === 'liquidity') {
    const count = [1, 5, 20, 60, 120].includes(st.flowRange) ? st.flowRange : 20;
    const sort = st.flowSort || 'value';
    const rows = sectors.map(s => ({ ...s, ...sectorWindow(s, count) })).sort((a, b) => {
      if (sort === 'cap') return (b.cap || 0) - (a.cap || 0);
      if (sort === 'change') return (b.latest.change ?? -Infinity) - (a.latest.change ?? -Infinity);
      if (sort === 'velocity') return (b.latest.turnoverToCap ?? -Infinity) - (a.latest.turnoverToCap ?? -Infinity);
      return (b.latest.value || 0) - (a.latest.value || 0);
    });

    const selected = rows.find(s => s.id === st.flowSector) || rows[0];

    // Summary market breadth across all covered sectors
    const totalTradedAcross = rows.reduce((acc, s) => acc + (s.latest.value || 0), 0);
    const totalAdvancingVal = rows.reduce((acc, s) => acc + (s.latest.upValue || 0), 0);
    const totalDecliningVal = rows.reduce((acc, s) => acc + (s.latest.downValue || 0), 0);

    const openSector = id => {
      component.setState({ flowSector: id });
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          const panel = document.getElementById('ft-sector-detail');
          panel?.scrollIntoView({ block: 'start', behavior: 'instant' });
          panel?.focus({ preventScroll: true });
        });
      }
    };

    const details = selected && h('section', { className: 'ft-detail', id: 'ft-sector-detail', tabIndex: '-1' },
      h('div', { className: 'ft-section-heading' },
        h('div', null,
          h('span', { className: 'ft-eyebrow' }, t('SECTOR DEEP DIVE', 'تفاصيل القطاع')),
          h('h2', null, titleOf(selected))
        ),
        h('span', { className: 'ft-range-badge', dir: 'ltr' }, `${selected.from} → ${selected.to}`)
      ),
      h('div', { className: 'ft-metrics' },
        metric(t('Market size · EGP', 'القيمة السوقية · ج.م'), compact(selected.cap), `${selected.capCount}/${selected.members.length} ` + t('companies sized', 'شركة لها قيمة سوقية')),
        metric(t('Traded value · EGP', 'قيمة التداول · ج.م'), compact(selected.value), t('Selected window; estimates included', 'الفترة المختارة؛ تشمل تقديرات')),
        metric(t('Latest size-weighted move', 'آخر حركة مرجّحة بالحجم'), signed(selected.latest.change), t('Current market-cap weights', 'أوزان القيمة السوقية الحالية'), selected.latest.change),
        metric(t('Latest turnover / size', 'آخر تداول / حجم القطاع'), selected.cap && finite(selected.latest.value) ? (selected.latest.value / selected.cap * 100).toFixed(2) + '%' : '—', t('Activity, not net inflow', 'نشاط تداول، وليس صافي تدفق'))
      ),
      h('div', { className: 'ft-metrics ft-metrics-sub' },
        metric(t('Bought in advancing stocks', 'مشتريات الأسهم الصاعدة'), compact(selected.latest.upValue) + ' EGP', `${selected.latest.upCount || 0} ` + t('gainers', 'أسهم رابحة'), 1),
        metric(t('Sold in declining stocks', 'مبيعات الأسهم الهابطة'), compact(selected.latest.downValue) + ' EGP', `${selected.latest.downCount || 0} ` + t('decliners', 'أسهم خاسرة'), -1),
        metric(t('Gaining capital size', 'رأس مال الأسهم الصاعدة'), compact(selected.latest.upCap) + ' EGP', t('Weighted breadth', 'اتساع مرجّح')),
        metric(t('Falling capital size', 'رأس مال الأسهم الهابطة'), compact(selected.latest.downCap) + ' EGP', t('Weighted risk', 'مخاطر مرجّحة'))
      ),
      h('div', { className: 'ft-charts-heading' },
        h('h3', null, t('Historical Liquidity & Move Trajectories', 'مسارات السيولة وحركة الأسعار التاريخية')),
        h('p', null, t('Variation in daily turnover, weighted moves, and advancing vs declining liquidity.', 'تغير قيمة التداول اليومية والحركة المرجّحة وتوزيع السيولة الصاعدة والهابطة.'))
      ),
      h('div', { className: 'ft-charts' },
        chart(selected.history, 'value', t('Daily traded value · EGP (estimated where needed)', 'قيمة التداول اليومية · ج.م (تقديرية عند الحاجة)'), compact, 'var(--accent)', true),
        chart(selected.history, 'change', t('Daily price move · current size weights', 'حركة السعر اليومية · بأوزان الحجم الحالي'), signed, tone(selected.latest.change), false),
        dualChart(selected.history, 'upValue', 'downValue', t('Bought amount (up stocks) vs Sold amount (down stocks) · EGP', 'المشتريات (أسهم صاعدة) مقابل المبيعات (أسهم هابطة) · ج.م'), t('Advancing turnover', 'سيولة الأسهم الصاعدة'), t('Declining turnover', 'سيولة الأسهم الهابطة'), compact),
        dualChart(selected.history, 'upCap', 'downCap', t('Advancing market cap vs Declining market cap · EGP', 'رأس المال الصاعد مقابل الهابط · ج.م'), t('Advancing cap', 'رأس مال صاعد'), t('Declining cap', 'رأس مال هابط'), compact)
      ),
      h('div', { className: 'ft-stock-breakdown' },
        h('div', { className: 'ft-section-heading' },
          h('div', null,
            h('h3', null, t('Stock Movements Relative to Size', 'حركة الأسهم بالنسبة لحجمها')),
            h('p', { className: 'ft-note' }, t('How much each stock went up or down and its weighted impact on the sector.', 'كيف تحرك كل سهم ومقدار أثره المرجّح في عائد القطاع.'))
          )
        ),
        h('div', { className: 'ft-stock-grid' },
          selected.members.map(m => {
            const mName = m.name ? (ar ? m.name.ar : m.name.en) : m.ticker;
            return h('div', { key: m.ticker, className: 'ft-stock-card' },
              h('div', { className: 'ft-stock-top' },
                h('button', {
                  type: 'button',
                  className: 'ft-stock-ticker-btn',
                  onClick: () => component.setState({ screen: 'company', ticker: m.ticker })
                }, m.ticker),
                h('span', { className: 'ft-stock-name' }, mName)
              ),
              h('div', { className: 'ft-stock-metrics' },
                h('div', null,
                  h('span', null, t('Size / Weight', 'الحجم / الوزن')),
                  h('strong', { dir: 'ltr' }, compact(m.cap) + ' EGP'),
                  finite(m.weight) ? h('small', { dir: 'ltr' }, `${m.weight.toFixed(1)}% ` + t('of sector', 'من القطاع')) : null
                ),
                h('div', null,
                  h('span', null, t('Move', 'الحركة')),
                  h('strong', { dir: 'ltr', style: { color: tone(m.change) } }, signed(m.change)),
                  finite(m.impact) ? h('small', { dir: 'ltr', style: { color: tone(m.impact) } }, `${signed(m.impact)} ` + t('impact', 'أثر')) : null
                ),
                h('div', null,
                  h('span', null, t('Turnover', 'التداول')),
                  h('strong', { dir: 'ltr' }, compact(m.value) + ' EGP')
                )
              )
            );
          })
        )
      ),
      h('div', { className: 'ft-balanced' },
        metric(t('Total matched purchases', 'إجمالي المشتريات المقابلة'), compact(selected.value) + ' EGP'),
        h('b', { 'aria-hidden': 'true' }, '='),
        metric(t('Total matched sales', 'إجمالي المبيعات المقابلة'), compact(selected.value) + ' EGP')
      ),
      h('p', { className: 'ft-note' }, t('Every executed trade has a buyer and seller. These are two sides of the same turnover, not separate inflows/outflows. Buyer-initiated versus seller-initiated value is not available in this feed.',
        'لكل صفقة منفذة مشترٍ وبائع. هذان جانبا قيمة التداول نفسها، وليسا تدفقاً داخلاً وخارجاً. لا يحدد المصدر قيمة الصفقات التي بدأها المشترون مقابل البائعين.')),
      h('details', null,
        h('summary', null, t('Companies & calculation notes', 'الشركات وتفاصيل الحساب')),
        h('div', { className: 'ft-company-list' },
          selected.members.map(m => button(m.ticker, () => component.setState({ screen: 'company', ticker: m.ticker })))
        ),
        h('p', null, t('Historical turnover uses close × volume when actual traded value is unavailable. Daily price moves use today’s fixed market-cap weights: this is not a historical sector index or investment return. Moves over 30% are withheld for corporate-action review. Missing observations stay missing.',
          'نقدّر التداول التاريخي بسعر الإغلاق × الحجم عند غياب القيمة الفعلية. حركة السعر اليومية تستخدم أوزان القيمة السوقية الحالية الثابتة: ليست مؤشراً تاريخياً للقطاع أو عائداً استثمارياً. تُحجب التحركات فوق ٣٠٪ لمراجعة إجراءات الشركات، وتظل البيانات المفقودة غير متاحة.')),
        h('p', null, `${t('Latest coverage', 'تغطية آخر جلسة')}: ${selected.latest.valueCount || 0}/${selected.members.length} · ${t('Estimated values', 'قيم تقديرية')}: ${selected.latest.estimatedCount || 0} · ${t('Weight coverage', 'تغطية الأوزان')}: ${compact(selected.latest.weightCoverage)}% · ${t('Flagged moves', 'تحركات للمراجعة')}: ${selected.latest.flagged || 0}`),
        h('p', null, t('Historical market size is not reconstructed without dated share-capital records. Non-EGP listings excluded: ', 'لا نعيد بناء الحجم السوقي التاريخي دون سجلات رأس مال مؤرخة. مستبعدة لاختلاف العملة: ') + d.excludedCurrencyCount)
      )
    );

    return {
      home,
      screen: h('section', { className: 'ft-screen' },
        header(sectorTitle),
        h('div', { className: 'ft-market-ribbon' },
          h('div', { className: 'ft-ribbon-card' },
            h('span', null, t('Market Covered Turnover', 'إجمالي تداول السوق المغطى')),
            h('strong', { dir: 'ltr' }, compact(totalTradedAcross) + ' EGP')
          ),
          h('div', { className: 'ft-ribbon-card' },
            h('span', null, t('Advancing Capital Flow', 'سيولة رأس المال الصاعد')),
            h('strong', { dir: 'ltr', style: { color: 'var(--up)' } }, compact(totalAdvancingVal) + ' EGP')
          ),
          h('div', { className: 'ft-ribbon-card' },
            h('span', null, t('Declining Capital Flow', 'سيولة رأس المال الهابط')),
            h('strong', { dir: 'ltr', style: { color: 'var(--down)' } }, compact(totalDecliningVal) + ' EGP')
          )
        ),
        h('div', { className: 'ft-toolbar' },
          h('div', { className: 'ft-pills' },
            [1, 5, 20, 60, 120].map(n => button(n + ' ' + t('sessions', 'جلسة'), () => component.setState({ flowRange: n }), count === n))
          ),
          select(t('Sort sectors', 'ترتيب القطاعات'), sort, [
            ['value', t('Latest trading value', 'آخر قيمة تداول')],
            ['cap', t('Market size', 'القيمة السوقية')],
            ['change', t('Latest weighted move', 'آخر حركة مرجّحة')],
            ['velocity', t('Turnover / Cap ratio', 'كثافة التداول للحجم')]
          ], v => component.setState({ flowSort: v }))
        ),
        h('p', { className: 'ft-note' }, `${d.asOf} · ${d.isClose ? t('Published close', 'إغلاق منشور') : t('Provisional snapshot', 'لقطة غير نهائية')} · ` + t('Bars: market size in rising / falling stocks; grey includes flat or missing moves.', 'الشريط: الحجم السوقي للأسهم الصاعدة / الهابطة؛ الرمادي يشمل الثابت وغير المتاح.')),
        h('div', { className: 'ft-sector-grid' },
          rows.map(s => {
            const lat = s.latest;
            const hist = s.history || [];
            return h('button', {
              key: s.id,
              type: 'button',
              className: 'ft-sector-tile',
              onClick: () => openSector(s.id),
              'aria-pressed': String(selected?.id === s.id)
            },
              h('div', { className: 'ft-tile-header' },
                h('span', { className: 'ft-tile-title' }, titleOf(s)),
                h('strong', { dir: 'ltr', style: { color: tone(lat.change) } }, signed(lat.change))
              ),
              band(s, lat),
              h('div', { className: 'ft-tile-spark-row' },
                hist.length > 2 ? sparklineSvg(hist, 'value', 110, 24, lat.change > 0 ? 'var(--up)' : 'var(--accent)') : null,
                lat.turnoverToCap ? h('span', { className: 'ft-velocity-pill', dir: 'ltr' }, `${lat.turnoverToCap.toFixed(2)}% ` + t('turnover', 'دوران')) : null
              ),
              h('div', { className: 'ft-tile-meta' },
                h('span', null, t('Size', 'الحجم') + ' ' + compact(s.cap)),
                h('b', null, t('Traded', 'تداول') + ' ' + compact(lat.value))
              ),
              h('small', { className: 'ft-tile-action' }, (lat.date || '—') + ' · ' + t('Open breakdown ↓', 'افتح التفاصيل ↓'))
            );
          })
        ),
        details,
        selected && h('details', { className: 'ft-method' },
          h('summary', null, t('Read the chart values', 'اقرأ أرقام الرسم')),
          h('div', { className: 'ft-table-wrap' },
            h('table', { className: 'ft-table' },
              h('thead', null,
                h('tr', null,
                  [t('Session', 'الجلسة'), t('Traded EGP', 'تداول ج.م'), t('Weighted move', 'حركة مرجّحة'), t('Bought (Up)', 'شراء (صاعد)'), t('Sold (Down)', 'بيع (هابط)'), t('Companies with value', 'شركات بقيمة تداول')].map(label => h('th', { key: label, scope: 'col' }, label))
                )
              ),
              h('tbody', null,
                [...selected.history].reverse().map(b => h('tr', { key: b.date },
                  h('th', { scope: 'row' }, b.date),
                  h('td', null, compact(b.value)),
                  h('td', null, signed(b.change)),
                  h('td', null, compact(b.upValue)),
                  h('td', null, compact(b.downValue)),
                  h('td', null, b.valueCount)
                ))
              )
            )
          )
        )
      )
    };
  }

  // ══════════════════════════════════════════════
  // SCREEN: OWNERSHIP LENS / INSIDER DEALING
  // ══════════════════════════════════════════════
  if (st.screen !== 'ownership') return { home, screen: null };

  const profiles = d.profiles || {};
  const ticker = st.ownershipTicker || '';
  const kind = st.ownershipKind || 'all';
  const sort = st.ownershipSort || 'date';
  const count = [7, 30, 90, 365].includes(st.ownershipRange) ? st.ownershipRange : 90;
  const investor = st.ownershipInvestor || '';
  const rows = ownershipRows(d, { ticker, kind, investor, count, sort });
  const profile = profiles[ticker];
  const investors = [...new Set((d.events || []).filter(r => !ticker || r.ticker === ticker).map(r => r.investorName).filter(Boolean))].sort();
  const dates = [...new Set(rows.map(r => r.date).filter(Boolean))].sort();

  const timeline = dates.map(date => {
    const events = rows.filter(r => r.date === date);
    const known = events.filter(r => direction(r.action) && finite(r.shares));
    const valued = known.filter(r => finite(r.currentMarkedValue) && (profiles[r.ticker]?.currency === 'EGP' || ticker));
    return {
      date,
      value: valued.length ? valued.reduce((s, r) => s + direction(r.action) * r.currentMarkedValue, 0) : null,
      change: profile?.shares && known.length ? (known.reduce((s, r) => s + direction(r.action) * r.shares, 0) / profile.shares) * 100 : null
    };
  });

  // Calculate cumulative net stake progression over time when a company is selected
  let runningStake = 0;
  const stakeTimeline = dates.map(date => {
    const events = rows.filter(r => r.date === date);
    const known = events.filter(r => direction(r.action) && finite(r.shares));
    if (profile?.shares && known.length) {
      const dayPct = known.reduce((s, r) => s + direction(r.action) * r.shares, 0) / profile.shares * 100;
      runningStake += dayPct;
    }
    return { date, stake: runningStake };
  });

  const stakeRows = rows.filter(r => finite(r.ownershipAfterPercent));
  const stakeHistory = ticker && investor ? [...stakeRows].reverse().map(r => ({ date: r.date, stake: r.ownershipAfterPercent })) : [];
  const names = new Set(rows.map(r => r.investorName).filter(Boolean));
  const currency = profile?.currency || 'EGP';
  const priceFrom = new Date(Date.parse(d.asOf + 'T00:00:00Z') - (count - 1) * 86400000).toISOString().slice(0, 10);
  const pricePoints = (profile?.prices || []).filter(p => p.date >= priceFrom);

  const actions = {
    bought: t('Purchase', 'مشتريات'),
    sold: t('Sale', 'مبيعات'),
    treasury_purchase: t('Treasury purchase', 'شراء خزينة'),
    treasury_sale: t('Treasury sale', 'بيع خزينة')
  };

  // Aggregates for the selected company
  const companyPurchases = rows.filter(r => direction(r.action) > 0 && finite(r.shares));
  const companySales = rows.filter(r => direction(r.action) < 0 && finite(r.shares));
  const totalBoughtShares = companyPurchases.reduce((s, r) => s + r.shares, 0);
  const totalSoldShares = companySales.reduce((s, r) => s + r.shares, 0);
  const netCompanyShares = totalBoughtShares - totalSoldShares;
  const netCompanyStakePct = profile?.shares ? (netCompanyShares / profile.shares) * 100 : null;
  const netCompanyMarkedVal = profile?.close ? netCompanyShares * profile.close : null;

  const tableRow = r => {
    const p = profiles[r.ticker] || {};
    const pct = r.referencePercent;
    const actual = finite(r.ownershipBeforePercent) && finite(r.ownershipAfterPercent);
    const dir = direction(r.action);
    const rel = ar ? (r.relationshipLabelAr || r.relationship) : (r.relationshipLabel || r.relationship);

    return h('article', { key: r.id, className: 'ft-event' },
      h('div', { className: 'ft-event-head' },
        h('time', null, r.date || t('Date not supplied', 'التاريخ غير متاح')),
        h('span', { className: 'ft-direction', style: { color: tone(dir) } }, actions[r.action] || t('Disclosure', 'إفصاح'))
      ),
      h('div', { className: 'ft-event-party' },
        h('button', {
          type: 'button',
          className: 'ft-company-link',
          disabled: !profiles[r.ticker],
          onClick: () => component.setState({ screen: 'company', ticker: r.ticker, companyPanel: 'filings' })
        }, r.ticker || r.company || '—'),
        h('span', { className: 'ft-party-label' }, r.investorName || (r.action?.startsWith('treasury_') ? t('Company treasury', 'خزينة الشركة') : t('Investor not named', 'اسم المتعامل غير منشور'))),
        h('span', { className: 'ft-rel-pill' }, rel)
      ),
      h('div', { className: 'ft-event-numbers' },
        metric(
          actual ? t('Disclosed ownership', 'الملكية المفصح عنها') : t('Trade / current share capital', 'الصفقة / عدد الأسهم الحالي'),
          actual ? `${r.ownershipBeforePercent}% → ${r.ownershipAfterPercent}%` : finite(pct) ? pct.toFixed(4) + '%' : '—',
          actual ? t('Before → after', 'قبل ← بعد') : t('Reference scale, not ownership change', 'مقياس مرجعي، وليس تغير الملكية'),
          dir
        ),
        metric(t('At latest published price', 'بسعر السهم المنشور الأخير'), compact(r.currentMarkedValue) + ' ' + (p.currency || ''), p.date || ''),
        metric(t('Disclosed shares', 'الأسهم المفصح عنها'), compact(r.shares))
      ),
      h('div', { className: 'ft-stake-track', 'aria-hidden': 'true' },
        h('i', { style: { width: finite(pct) ? Math.min(100, Math.max(0, pct)) + '%' : '0%', background: tone(dir) } })
      ),
      h('small', { className: 'ft-note' }, t('Track is 0–100% of current shares. Marked value is not the execution amount.', 'الشريط من ٠–١٠٠٪ من الأسهم الحالية. القيمة بسعر اليوم ليست مبلغ التنفيذ.')),
      safeLink(r.link) ? h('a', { href: safeLink(r.link), target: '_blank', rel: 'noopener noreferrer', className: 'ft-source' }, t('Official disclosure ↗', 'الإفصاح الرسمي ↗')) : null
    );
  };

  const pageSize = 24;
  const page = Math.min(Math.max(0, st.ownershipPage || 0), Math.max(0, Math.ceil(rows.length / pageSize) - 1));

  return {
    home,
    screen: h('section', { className: 'ft-screen' },
      header(ownerTitle),
      h('div', { className: 'ft-thesis-banner' },
        h('div', { className: 'ft-thesis-icon', 'aria-hidden': 'true' }, '%'),
        h('div', { className: 'ft-thesis-text' },
          h('strong', null, t('Percentage Stake > Raw Share Count', 'نسبة الملكية في الشركة أهم من عدد الأسهم')),
          h('p', null, t('A trade of 1,000,000 shares in a company with 10M shares is 10% of ownership. In a company with 10B shares, it is 0.01%. Ownership percentage and market value provide the true picture.',
            'تداول مليون سهم في شركة ذات ١٠ ملايين سهم يمثل ١٠٪ من ملكية الشركة، بينما في شركة بـ ١٠ مليارات سهم يمثل ٠.٠١٪ فقط. نسبة الملكية والقيمة السوقية هما المقياس الحقيقي.'))
        )
      ),
      h('div', { className: 'ft-toolbar' },
        select(t('Company', 'الشركة'), ticker, [
          ['', t('All companies', 'كل الشركات')],
          ...Object.keys(profiles).filter(k => d.events.some(r => r.ticker === k)).sort().map(k => [k, k + ' · ' + (profiles[k].name?.[ar ? 'ar' : 'en'] || k)])
        ], v => component.setState({ ownershipTicker: v, ownershipInvestor: '', ownershipPage: 0 })),
        select(t('Party type', 'نوع الطرف'), kind, [
          ['all', t('All disclosures', 'كل الإفصاحات')],
          ['insiders', t('Insiders & shareholders', 'داخليون ومساهمون')],
          ['treasury', t('Company treasury', 'خزينة الشركة')]
        ], v => component.setState({ ownershipKind: v, ownershipPage: 0 })),
        investors.length > 0 ? select(t('Named investor', 'اسم المتعامل'), investor, [
          ['', t('All disclosed names', 'كل الأسماء المنشورة')],
          ...investors.map(name => [name, name])
        ], v => component.setState({ ownershipInvestor: v, ownershipPage: 0 })) : null,
        select(t('Sort disclosures', 'ترتيب الإفصاحات'), sort, [
          ['date', t('Latest date', 'الأحدث')],
          ['stake', t('Highest stake % of company', 'أعلى نسبة من الشركة')],
          ['value', t('Highest marked value', 'أعلى قيمة تداول')]
        ], v => component.setState({ ownershipSort: v, ownershipPage: 0 })),
        h('div', { className: 'ft-pills' },
          [7, 30, 90, 365].map(n => button(n + ' ' + t('days', 'يوماً'), () => component.setState({ ownershipRange: n, ownershipPage: 0 }), count === n))
        )
      ),
      h('p', { className: 'ft-note' }, t('Window ends at latest disclosure: ', 'تنتهي الفترة عند أحدث إفصاح: ') + d.insidersAsOf),
      ticker && profile ? h('div', { className: 'ft-company-ownership-card' },
        h('div', { className: 'ft-section-heading' },
          h('div', null,
            h('span', { className: 'ft-eyebrow' }, t('COMPANY OWNERSHIP PROFILE', 'ملف ملكية الشركة')),
            h('h2', null, (profile.name?.[ar ? 'ar' : 'en'] || ticker) + ` (${ticker})`)
          ),
          h('span', { className: 'ft-range-badge', dir: 'ltr' }, compact(profile.cap) + ' EGP')
        ),
        h('div', { className: 'ft-metrics' },
          metric(t('Shares outstanding (Denominator)', 'إجمالي الأسهم (المقام المرجعي)'), compact(profile.shares), profile.sharesDate || t('Latest verified', 'آخر تحديث')),
          metric(t('Latest share price', 'آخر سعر للسهم'), (profile.close ? profile.close.toFixed(2) : '—') + ' ' + currency, t('Published close', 'إغلاق منشور')),
          metric(t('Net insider stake change', 'صافي تغير حصة الداخليين'), signed(netCompanyStakePct), `${compact(netCompanyShares)} ` + t('net shares', 'صافي أسهم'), netCompanyStakePct),
          metric(t('Net marked capital value', 'صافي القيمة السوقية المنفذة'), compact(netCompanyMarkedVal) + ' ' + currency, t('At latest price', 'بسعر اليوم'), netCompanyMarkedVal)
        )
      ) : h('div', { className: 'ft-metrics' },
        metric(t('Disclosures in view', 'إفصاحات في العرض'), compact(rows.length)),
        metric(t('Named investors', 'متعاملون بأسماء منشورة'), compact(names.size)),
        metric(t('Disclosed ownership stakes', 'حصص ملكية مفصح عنها'), compact(stakeRows.length)),
        metric(t('Current reference share count', 'عدد الأسهم المرجعي الحالي'), compact(profile?.shares), profile?.sharesDate || t('Choose a company', 'اختر شركة'))
      ),
      h('div', { className: 'ft-charts' },
        chart(timeline, 'value', t('Daily disclosed net trades · marked at latest price, ', 'صافي الصفقات المفصح عنها يومياً · بسعر اليوم، ') + currency, compact, 'var(--accent)', true),
        ticker ? (
          stakeTimeline.length > 1
            ? chart(stakeTimeline, 'stake', t('Cumulative insider net stake % of company', 'تراكمي صافي حصة الداخليين من أسهم الشركة ٪'), signed, tone(netCompanyStakePct), true)
            : chart(timeline, 'change', t('Daily net shares / current share capital', 'صافي الأسهم اليومي / عدد الأسهم الحالي'), signed, tone(netCompanyStakePct), false)
        ) : h('div', { className: 'ft-explain' },
          h('span', { className: 'ft-orbit-small' }, '%'),
          h('h2', null, t('Ownership needs a denominator.', 'النسبة أهم… وتحتاج مقاماً صحيحاً.')),
          h('p', null, t('Choose one company to compare disclosed trades with its current total shares. Percentages across different companies cannot be added.',
            'اختر شركة لمقارنة صفقاتها بعدد أسهمها الحالي. لا يصح جمع نسب شركات مختلفة.'))
        )
      ),
      ticker ? chart(pricePoints, 'close', t('Published share price history · ', 'تاريخ سعر السهم المنشور · ') + currency, v => v.toFixed(2), 'var(--accent)', true) : null,
      stakeHistory.length > 1 ? chart(stakeHistory, 'stake', t('Disclosed stake history · ', 'تاريخ الحصة المفصح عنها · ') + investor, v => v.toFixed(2) + '%', 'var(--accent)', true) : null,
      h('details', { className: 'ft-method' },
        h('summary', null, t('What this can—and cannot—tell you', 'ما الذي توضحه هذه البيانات وما الذي لا توضحه؟')),
        h('p', null, t('This is a disclosure timeline, not a shareholder register. We do not reconstruct a person’s holdings from unnamed trades. Exact ownership changes require verified before/after stakes. A trade divided by today’s shares is only a scale reference: splits, capital changes and treasury cancellations can change that denominator.',
          'هذا تسلسل للإفصاحات وليس سجل المساهمين. لا نستنتج ملكية شخص من صفقات مجهولة الاسم. التغير الدقيق يحتاج نسباً موثقة قبل وبعد. قسمة الصفقة على أسهم اليوم مقياس للحجم فقط؛ التجزئة وزيادات رأس المال وإلغاء الخزينة قد تغير المقام.')),
        h('p', null, t('Charts include known share counts only. Missing amounts and days without disclosures are not zero activity. Current-price values are not execution proceeds or historical portfolio values. Cross-company EGP charts exclude non-EGP shares.',
          'تشمل الرسوم أعداد الأسهم المتاحة فقط. غياب المبلغ أو الإفصاح لا يعني عدم التداول. قيم سعر اليوم ليست حصيلة التنفيذ أو قيمة محفظة تاريخية. رسوم الجنيه عبر الشركات تستبعد الأسهم بعملات أخرى.'))
      ),
      rows.length ? h('div', { className: 'ft-event-grid' }, rows.slice(page * pageSize, (page + 1) * pageSize).map(tableRow)) :
        h('p', { className: 'ft-empty' }, t('No disclosures in this window. Try a longer period or another company.', 'لا توجد إفصاحات بهذه الفترة. جرّب فترة أطول أو شركة أخرى.')),
      h('div', { className: 'ft-pagination' },
        h('button', { type: 'button', disabled: page === 0, onClick: () => component.setState({ ownershipPage: page - 1 }) }, t('Previous', 'السابق')),
        h('span', null, `${page + 1} / ${Math.max(1, Math.ceil(rows.length / pageSize))}`),
        h('button', { type: 'button', disabled: (page + 1) * pageSize >= rows.length, onClick: () => component.setState({ ownershipPage: page + 1 }) }, t('Next', 'التالي'))
      )
    )
  };
}

