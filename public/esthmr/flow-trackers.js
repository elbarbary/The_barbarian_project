import { React as R } from './react-shim.js';

import * as OM from './ownership-map.js';
import * as SL from './sector-lens.js';

const h = R.createElement;
const finite = v => typeof v === 'number' && Number.isFinite(v);
const signed = v => finite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(2)}%` : '—';
const compact = v => finite(v) ? new Intl.NumberFormat('en', { notation:'compact', maximumFractionDigits:2 }).format(v) : '—';
const tone = v => v > 0 ? 'var(--up)' : v < 0 ? 'var(--down)' : 'var(--t2)';
// `1 filed stakes` is a typo the reader sees every time a sector holds one.
const plural = (n, word) => (n === 1 ? word : `${word}s`);
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
  return filtered.sort((a, b) => {
    const aHasShares = finite(a.shares) && a.shares > 0 ? 1 : 0;
    const bHasShares = finite(b.shares) && b.shares > 0 ? 1 : 0;
    return (bHasShares - aHasShares)
      || (b.date || '').localeCompare(a.date || '')
      || String(a.id).localeCompare(String(b.id));
  });
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
    const x = (8 + (i / Math.max(1, points.length - 1)) * 584).toFixed(2);
    const y = (108 - ((p[key] - lo) / span) * 96).toFixed(2);
    return `${command}${x} ${y}`;
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

function stepLinePath(points, key, width = 600, height = 120, pad = 12) {
  const vals = (points || []).map(p => p[key]).filter(finite);
  if (!vals.length) return '';
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  let d = '';
  let prevX = null, prevY = null;
  points.forEach((p, i) => {
    if (!finite(p[key])) return;
    const x = pad + (i / Math.max(1, points.length - 1)) * (width - 2 * pad);
    const y = (height - pad) - ((p[key] - lo) / span) * (height - 2 * pad);
    if (prevX === null) {
      d += `M${x.toFixed(2)} ${y.toFixed(2)}`;
    } else {
      d += ` L${x.toFixed(2)} ${prevY.toFixed(2)} L${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    prevX = x; prevY = y;
  });
  return d;
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
      const x = (8 + (i / Math.max(1, points.length - 1)) * 584).toFixed(2);
      const y = (108 - ((p[key] - lo) / span) * 96).toFixed(2);
      return `${cmd}${x} ${y}`;
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

// ══════════════════════════════════════════════════════════════
// DRAWING: SECTOR CAPITAL GRAVITATIONAL FLOW MAP (INTERACTIVE)
// ══════════════════════════════════════════════════════════════
function renderSectorFlowMap(sectors, selectedSector, onSelectSector, ar, t) {
  if (!sectors || !sectors.length) return null;
  const activeSector = selectedSector || sectors[0];
  const members = activeSector.members || [];
  const topMembers = members.slice(0, 6);

  const displaySectors = sectors.slice(0, 8);
  const maxCap = Math.max(...displaySectors.map(s => s.cap || 1), 1);

  // Layout hubs along an aesthetic orbital plane
  const hubs = displaySectors.map((s, idx) => {
    const isSelected = s.id === activeSector.id;
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const cx = 110 + col * 230;
    const cy = 80 + row * 150;
    const normCap = Math.sqrt((s.cap || 1e9) / maxCap);
    const r = Math.max(34, Math.min(62, normCap * 58));
    const net = s.netFlow || 0;
    const chg = s.latest?.change || 0;
    return { sector: s, cx, cy, r, isSelected, net, chg };
  });

  return h('div', { className: 'ft-drawing-container' },
    h('div', { className: 'ft-drawing-header' },
      h('div', null,
        h('span', { className: 'ft-drawing-tag' }, t('INTERACTIVE FLOW SYSTEM', 'نظام التدفق التفاعلي')),
        h('h3', null, t('Capital Gravitational Map & Member Satellites', 'خريطة الجاذبية الرأسمالية وتوزيع الأسهم')),
        h('p', null, t('Node size represents Sector Market Cap. Flow conduits stream Inflow (Bought) vs Outflow (Sold). Orbiting satellites show member stocks sized by weight and colored by return.',
          'حجم الدائرة يمثل القيمة السوقية للقطاع. مسارات السيولة توضح التدفق الداخل (المشتريات) والخارج (المبيعات). الأقمار المدارية تظهر الأسهم بوزنها وعائدها.'))
      ),
      h('div', { className: 'ft-drawing-legend' },
        h('span', { className: 'ft-legend-item' }, h('i', { style: { background: 'var(--up)' } }), t('Bought / Inflow', 'شراء / تدفق داخل')),
        h('span', { className: 'ft-legend-item' }, h('i', { style: { background: 'var(--down)' } }), t('Sold / Outflow', 'بيع / تدفق خارج')),
        h('span', { className: 'ft-legend-item' }, h('i', { style: { background: 'var(--accent)' } }), t('Market Cap Weight', 'وزن القيمة السوقية'))
      )
    ),
    h('svg', {
      viewBox: '0 0 920 310',
      className: 'ft-flow-svg',
      role: 'img',
      'aria-label': t('Capital Gravitational Map', 'خريطة التدفق الرأسمالي')
    },
      h('defs', null,
        h('radialGradient', { id: 'hubGlowUp', cx: '50%', cy: '50%', r: '50%' },
          h('stop', { offset: '0%', stopColor: 'var(--up)', stopOpacity: 0.35 }),
          h('stop', { offset: '100%', stopColor: 'var(--up)', stopOpacity: 0 })
        ),
        h('radialGradient', { id: 'hubGlowDown', cx: '50%', cy: '50%', r: '50%' },
          h('stop', { offset: '0%', stopColor: 'var(--down)', stopOpacity: 0.35 }),
          h('stop', { offset: '100%', stopColor: 'var(--down)', stopOpacity: 0 })
        )
      ),
      // Connection conduits between hubs
      h('g', { className: 'ft-conduits', 'aria-hidden': 'true' },
        hubs.map((hub, idx) => {
          if (idx >= hubs.length - 1) return null;
          const next = hubs[idx + 1];
          const d = `M ${hub.cx.toFixed(1)} ${hub.cy.toFixed(1)} Q ${((hub.cx + next.cx) / 2).toFixed(1)} ${(Math.min(hub.cy, next.cy) - 20).toFixed(1)} ${next.cx.toFixed(1)} ${next.cy.toFixed(1)}`;
          return h('path', {
            key: `conduit-${idx}`,
            d,
            fill: 'none',
            stroke: 'var(--edgeIn)',
            strokeWidth: 1.2,
            strokeDasharray: '4 4',
            opacity: 0.6
          });
        }).filter(Boolean)
      ),
      // Sized Sector Hubs
      h('g', { className: 'ft-hubs' },
        hubs.map(hub => {
          const s = hub.sector;
          const name = ar ? (s.nameAr || s.name) : s.name;
          const shortName = name.length > 18 ? name.slice(0, 16) + '…' : name;
          const toneColor = hub.net >= 0 ? 'var(--up)' : 'var(--down)';

          return h('g', {
            key: s.id,
            className: `ft-hub-node ${hub.isSelected ? 'ft-hub-selected' : ''}`,
            onClick: () => onSelectSector(s.id),
            style: { cursor: 'pointer' },
            role: 'button',
            tabIndex: 0,
            'aria-label': `${name}: Cap ${compact(s.cap)}, Net Flow ${compact(hub.net)}`
          },
            // Ambient glow on selected
            hub.isSelected ? h('circle', {
              cx: hub.cx,
              cy: hub.cy,
              r: hub.r + 14,
              fill: hub.net >= 0 ? 'url(#hubGlowUp)' : 'url(#hubGlowDown)'
            }) : null,
            // Inflow curve arc (Buy side)
            h('path', {
              d: `M ${(hub.cx - hub.r).toFixed(1)} ${hub.cy.toFixed(1)} A ${hub.r.toFixed(1)} ${hub.r.toFixed(1)} 0 0 1 ${(hub.cx + hub.r).toFixed(1)} ${hub.cy.toFixed(1)}`,
              fill: 'none',
              stroke: 'var(--up)',
              strokeWidth: hub.isSelected ? 3.5 : 2.2,
              strokeLinecap: 'round'
            }),
            // Outflow curve arc (Sell side)
            h('path', {
              d: `M ${(hub.cx + hub.r).toFixed(1)} ${hub.cy.toFixed(1)} A ${hub.r.toFixed(1)} ${hub.r.toFixed(1)} 0 0 1 ${(hub.cx - hub.r).toFixed(1)} ${hub.cy.toFixed(1)}`,
              fill: 'none',
              stroke: 'var(--down)',
              strokeWidth: hub.isSelected ? 3.5 : 2.2,
              strokeLinecap: 'round'
            }),
            // Hub Core Circle
            h('circle', {
              cx: hub.cx,
              cy: hub.cy,
              r: Math.max(22, hub.r - 4),
              fill: 'var(--surface)',
              stroke: hub.isSelected ? toneColor : 'var(--edge)',
              strokeWidth: hub.isSelected ? 2 : 1
            }),
            // Hub Labels
            h('text', {
              x: hub.cx,
              y: hub.cy - 10,
              textAnchor: 'middle',
              className: 'ft-hub-label',
              fontSize: 10.5,
              fontWeight: 700,
              fill: 'var(--ink)'
            }, shortName),
            h('text', {
              x: hub.cx,
              y: hub.cy + 4,
              textAnchor: 'middle',
              className: 'ft-hub-cap',
              fontSize: 9.5,
              fill: 'var(--t2)',
              fontFamily: 'monospace'
            }, compact(s.cap)),
            h('text', {
              x: hub.cx,
              y: hub.cy + 17,
              textAnchor: 'middle',
              className: 'ft-hub-net',
              fontSize: 9.5,
              fontWeight: 700,
              fill: toneColor
            }, (hub.net > 0 ? '+' : '') + compact(hub.net))
          );
        })
      )
    ),
    // Focused Sector Telemetry Capsule
    h('div', { className: 'ft-focus-capsule' },
      h('div', { className: 'ft-focus-head' },
        h('div', null,
          h('span', { className: 'ft-focus-eyebrow' }, t('ACTIVE GRAVITATIONAL HUB', 'القطاع المالي النشط')),
          h('h4', null, ar ? (activeSector.nameAr || activeSector.name) : activeSector.name)
        ),
        h('div', { className: 'ft-focus-actions' },
          h('span', { className: 'ft-focus-pill', style: { color: tone(activeSector.netFlow || 0) } },
            t('Net Flow: ', 'صافي التدفق: ') + signed(activeSector.latest?.change || 0) + ' · ' + compact(activeSector.netFlow || 0) + ' EGP'
          )
        )
      ),
      h('div', { className: 'ft-focus-satellites' },
        h('div', { className: 'ft-satellites-title' },
          h('span', null, t('Member Stock Satellites (Weight in Sector vs Return Impact)', 'أقمار الأسهم التابعة (الوزن في القطاع مقابل أثر العائد)'))
        ),
        h('div', { className: 'ft-satellites-row' },
          topMembers.map(m => {
            const mName = ar ? (m.name?.ar || m.ticker) : (m.name?.en || m.ticker);
            const mImpact = m.impact ?? 0;
            return h('div', { key: m.ticker, className: 'ft-satellite-card' },
              h('div', { className: 'ft-satellite-top' },
                h('strong', { className: 'ft-sat-ticker' }, m.ticker),
                h('span', { className: 'ft-sat-weight', dir: 'ltr' }, `${(m.weight || 0).toFixed(1)}% ` + t('wt', 'وزن'))
              ),
              h('div', { className: 'ft-satellite-mid' },
                h('span', { className: 'ft-sat-name' }, mName)
              ),
              h('div', { className: 'ft-satellite-bottom' },
                h('span', { className: 'ft-sat-chg', style: { color: tone(m.change) }, dir: 'ltr' }, signed(m.change)),
                h('span', { className: 'ft-sat-impact', style: { color: tone(mImpact) }, dir: 'ltr' },
                  t('Impact: ', 'الأثر: ') + signed(mImpact)
                )
              )
            );
          })
        )
      )
    )
  );
}

// ══════════════════════════════════════════════════════════════
// DRAWING: BIPARTITE RELATIONAL CONNECTION WEB (INTERACTIVE)
// ══════════════════════════════════════════════════════════════

function renderStakeProgressionCurve(stakeHistory, pricePoints, ticker, currency, ar, t) {
  if (!stakeHistory || stakeHistory.length < 1) return null;

  const validStakes = stakeHistory.map(p => p.stake).filter(finite);
  const minStake = validStakes.length ? Math.min(...validStakes) : 0;
  const maxStake = validStakes.length ? Math.max(...validStakes) : 1;

  const stepD = stepLinePath(stakeHistory, 'stake', 800, 110, 16);

  return h('div', { className: 'ft-drawing-container ft-trajectory-container' },
    h('div', { className: 'ft-drawing-header' },
      h('div', null,
        h('span', { className: 'ft-drawing-tag' }, t('TEMPORAL STAKE TRAJECTORY', 'مسار الحصة عبر الزمن')),
        h('h3', null, `${ticker} · ` + t('Cumulative Insider Stake % Progression vs Share Price', 'تراكمي نسبة الملكية عبر الزمن مقابل سعر السهم')),
        h('p', null, t('Stepped curve traces how insider ownership evolved chronologically, aligned against the published stock price trajectory.',
          'المنحنى المتدرج يوضح كيف تغيرت نسبة ملكية الداخليين زمنياً مع كل إفصاح مقارنة بمسار سعر السهم.'))
      ),
      h('div', { className: 'ft-trajectory-legend' },
        h('span', { className: 'ft-legend-item' }, h('i', { style: { background: 'var(--accent)' } }), t('Cumulative Stake %', 'تراكمي نسبة الملكية ٪')),
        h('span', { className: 'ft-legend-item' }, h('i', { style: { background: 'var(--ink)' } }), t('Share Price', 'سعر السهم'))
      )
    ),
    h('svg', {
      viewBox: '0 0 800 130',
      className: 'ft-trajectory-svg',
      role: 'img',
      'aria-label': `${ticker} Stake % Progression`
    },
      [20, 65, 110].map(y => h('line', { key: y, x1: 16, x2: 784, y1: y, y2: y, stroke: 'var(--rule2)', strokeWidth: 1 })),
      stepD ? h('path', {
        d: stepD,
        fill: 'none',
        stroke: 'var(--accent)',
        strokeWidth: 3,
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      }) : null,
      // Data point nodes
      stakeHistory.map((p, idx) => {
        if (!finite(p.stake)) return null;
        const x = 16 + (idx / Math.max(1, stakeHistory.length - 1)) * 768;
        const y = 110 - ((p.stake - minStake) / (maxStake - minStake || 1)) * 90;
        return h('g', { key: `pt-${idx}` },
          h('circle', { cx: x, cy: y, r: 5, fill: 'var(--surface)', stroke: 'var(--accent)', strokeWidth: 2.5 }),
          h('text', {
            x,
            y: y - 8,
            textAnchor: 'middle',
            fontSize: 10,
            fontWeight: 700,
            fill: 'var(--ink)',
            fontFamily: 'monospace'
          }, `${p.stake.toFixed(2)}%`)
        );
      }).filter(Boolean)
    ),
    h('div', { className: 'ft-trajectory-footer', dir: 'ltr' },
      h('span', null, stakeHistory[0]?.date || ''),
      h('span', null, `${t('Range: ', 'المدى: ')}${minStake.toFixed(2)}% → ${maxStake.toFixed(2)}%`),
      h('span', null, stakeHistory.at(-1)?.date || '')
    )
  );
}

// ══════════════════════════════════════════════════════════════
// HOME MINI PREVIEWS (LIVING VISUAL DRAWINGS)
// ══════════════════════════════════════════════════════════════
function renderHomeSectorConstellation(sectors, ar, t) {
  const top = (sectors || []).slice(0, 5);
  return h('div', { className: 'ft-mini-drawing' },
    h('svg', { viewBox: '0 0 380 90', className: 'ft-mini-constellation', role: 'img', 'aria-hidden': 'true' },
      // Curved constellation arcs
      h('path', { d: 'M 40 45 Q 110 15 190 45 T 340 45', fill: 'none', stroke: 'var(--edgeIn)', strokeWidth: 1.5, strokeDasharray: '3 3' }),
      top.map((s, i) => {
        const x = 40 + i * 75;
        const y = 45 + (i % 2 === 0 ? -16 : 16);
        const r = Math.max(12, Math.min(22, Math.sqrt((s.cap || 1e9) / 1e11) * 20));
        const color = (s.netFlow || 0) >= 0 ? 'var(--up)' : 'var(--down)';
        return h('g', { key: s.id || i },
          h('circle', { cx: x, cy: y, r: r + 3, fill: 'none', stroke: color, strokeWidth: 1.5, opacity: 0.5 }),
          h('circle', { cx: x, cy: y, r, fill: 'var(--surface)', stroke: 'var(--edge)', strokeWidth: 1 }),
          h('text', { x, y: y + 3, textAnchor: 'middle', fontSize: 8.5, fontWeight: 700, fill: 'var(--ink)' }, s.name?.slice(0, 3).toUpperCase() || 'SEC')
        );
      })
    )
  );
}

function renderHomeOwnershipWeb(links, ar, t) {
  const topLinks = (links || []).slice(0, 4);
  return h('div', { className: 'ft-mini-drawing' },
    h('svg', { viewBox: '0 0 380 90', className: 'ft-mini-web-svg', role: 'img', 'aria-hidden': 'true' },
      topLinks.map((link, i) => {
        const y1 = 20 + i * 18;
        const y2 = 25 + ((i * 2) % 4) * 16;
        const d = `M 40 ${y1} C 140 ${y1}, 240 ${y2}, 340 ${y2}`;
        const strokeColor = link.action === 'bought' ? 'var(--up)' : 'var(--down)';
        return h('g', { key: i },
          h('path', { d, fill: 'none', stroke: strokeColor, strokeWidth: 2, opacity: 0.75, strokeLinecap: 'round' }),
          h('circle', { cx: 40, cy: y1, r: 4, fill: 'var(--accent)' }),
          h('circle', { cx: 340, cy: y2, r: 4, fill: 'var(--ink)' })
        );
      })
    )
  );
}


/* ── The people, and what their stake did ─────────────────────────────────────
 *
 * The daily EGX summary names the RELATIONSHIP and never the party: every row
 * reads "insider" or "related parties of insider". The individual
 * post-execution form is the only document that carries a name, a price, and
 * the stake before and after — and it is a scan, so it is read through the
 * model and checked before it is published.
 *
 * A stake is a percentage OF ONE COMPANY, so a person who traded two issuers
 * gets no headline move: adding 6% of one company to 2% of another produces a
 * number that means nothing. The row says which company instead.
 */
function renderNamedPeople(doc, ar, t, onPick) {
  const people = (doc && doc.people) || [];
  if (!people.length) return null;

  const row = (p) => {
    const move = p.singleCompanyMove;
    const primary = ar ? (p.name || p.nameEn) : (p.nameEn || p.name);
    const secondary = ar ? (p.nameEn && p.nameEn !== primary ? p.nameEn : '') : (p.name !== primary ? p.name : '');
    const delta = move ? move.change : null;
    return h('button', {
      key: p.id,
      type: 'button',
      className: 'ft-person-row',
      onClick: () => p.tickers.length === 1 && onPick(p.tickers[0]),
      title: p.tickers.join(', ')
    },
      h('span', { className: 'ft-person-id' },
        h('b', null, primary),
        secondary ? h('small', { dir: p.script === 'ar' ? 'rtl' : 'ltr' }, secondary) : null
      ),
      h('span', { className: 'ft-person-where' },
        p.tickers.slice(0, 3).map(tk => h('code', { key: tk }, tk)),
        p.tickers.length > 3 ? h('small', null, `+${p.tickers.length - 3}`) : null
      ),
      // The percentage, said as a journey rather than a number, because the
      // journey is the thing the share count cannot tell you.
      move ? h('span', { className: 'ft-person-move', dir: 'ltr' },
        h('span', { className: 'ft-stake-from' }, move.from.toFixed(2) + '%'),
        h('span', { className: 'ft-stake-arrow', 'aria-hidden': 'true' }, '→'),
        h('span', { className: 'ft-stake-to', style: { color: tone(delta) } }, move.to.toFixed(2) + '%')
      ) : h('span', { className: 'ft-person-move ft-person-multi' },
        t(`${p.tickers.length} companies`, `${p.tickers.length} شركات`)),
      h('span', { className: 'ft-person-count', dir: 'ltr' },
        p.boughtCount ? h('i', { className: 'ft-tick-buy' }, `▲${p.boughtCount}`) : null,
        p.soldCount ? h('i', { className: 'ft-tick-sell' }, `▼${p.soldCount}`) : null
      )
    );
  };

  return h('div', { className: 'ft-detail ft-people-panel' },
    h('div', { className: 'ft-section-heading' },
      h('div', null,
        h('span', { className: 'ft-eyebrow' }, t('NAMED IN THE FILING', 'أسماء وردت في الإفصاح')),
        h('h3', null, t('Who traded, and what it did to their stake',
                        'من تعامل، وماذا فعل ذلك بحصته'))
      ),
      h('span', { className: 'ft-range-badge', dir: 'ltr' },
        `${doc.peopleCount} · ${doc.tradeCount} · ${doc.tickerCount}`)
    ),
    h('p', { className: 'ft-note' }, ar ? doc.basisAr : doc.basis),
    h('div', { className: 'ft-people-list' }, people.slice(0, 24).map(row)),
    h('p', { className: 'ft-note' }, t(
      'Read from the scanned form and kept only when the direction of the stake agrees with the direction of the trade. A person trading more than one company shows no combined figure: percentages of different companies cannot be added.',
      'مقروءة من النموذج الممسوح ضوئياً، ولا تُحفظ إلا إذا اتفق اتجاه تغير الحصة مع اتجاه الصفقة. من تعامل في أكثر من شركة لا يظهر له رقم مجمَّع: لا يصح جمع نسب شركات مختلفة.'))
  );
}


/* ── The ownership map ────────────────────────────────────────────────────────
 *
 * Built with the DOM rather than through `h`, because the SVG is redrawn on a
 * month change and on every focus, and rebuilding a few hundred nodes through
 * the component's render on each of those would redraw the whole screen with
 * them. The panel around it is `h` like everything else; only the picture
 * manages itself.
 */
function renderOwnershipMap(doc, ar, t, component) {
  const st = component.state || {};
  const people = (doc && doc.people) || [];
  // Every position ever filed, INCLUDING the ones read down to zero. A company
  // whose only named holder has since sold out still belongs on the board as
  // an empty ring: "nobody discloses a stake here now" and "nobody ever did"
  // are different facts, and dropping it also loses the week in which they
  // left — which is exactly the week a reader would want to see.
  const positions = (doc && doc.positions) || [];
  // Who sits on each board, by ticker. A director is not a shareholder and
  // gets no dot on the map; the register shows the two lists apart.
  const boards = {};
  ((doc && doc.boards) || []).forEach((b) => { boards[b.ticker] = b; });
  const holdings = OM.standing(doc);
  if (!people.length || positions.length < 2) return null;

  const weeks = OM.periodsOf(doc);

  // The CLIENT's shape, not companies.json's. `data.live()` renames
  // `market_cap` to `cap` and folds the two names into `name:{en,ar}` — read
  // from the file's field names and every ring comes out at the floor size
  // with "value unknown" under it, which is exactly what the first draft did.
  const co = {};
  ((component.data() || {}).companies || []).forEach((c) => {
    if (!c || !c.ticker) return;
    const nm = c.name || {};
    co[c.ticker] = {
      cap: finite(c.cap) ? c.cap : null,
      sector: (ar ? c.sectorAr : c.sector) || c.sector || t('Unclassified', 'غير مصنّف'),
      name: (ar ? (nm.ar || nm.en) : (nm.en || nm.ar)) || c.ticker,
    };
  });

  const label = {};
  const kindOf = {};
  people.forEach((p) => {
    label[p.id] = ar ? (p.name || p.nameEn) : (p.nameEn || p.name);
    kindOf[p.id] = p.kind;
  });
  const labelOf = (id) => label[id] || (co[id] && co[id].name) || id;

  // One row per company that anybody has filed a named stake in.
  const byTicker = new Map();
  positions.forEach((p) => {
    const row = byTicker.get(p.ticker) || {
      ticker: p.ticker,
      name: (co[p.ticker] && co[p.ticker].name) || p.ticker,
      sector: (co[p.ticker] && co[p.ticker].sector) || t('Unclassified', 'غير مصنّف'),
      cap: co[p.ticker] ? co[p.ticker].cap : null,
      disclosed: 0,
      holders: [],
    };
    row.disclosed += Math.max(p.percent || 0, 0);
    row.holders.push(p);
    byTicker.set(p.ticker, row);
  });
  const rows = [...byTicker.values()];
  if (!rows.length) return null;

  // A holder in more than one company. Fifty-nine of the sixty-six are in
  // exactly one, and for those the slice on the ring already says everything.
  const spread = new Map();
  positions.forEach((p) => {
    const list = spread.get(p.holder) || [];
    if (!list.includes(p.ticker)) list.push(p.ticker);
    spread.set(p.holder, list);
  });
  // A bridge is a stake somebody still has. Where they have sold out, the
  // curve would draw a link that no longer exists.
  const live = new Map();
  holdings.forEach((p) => {
    const list = live.get(p.holder) || [];
    if (!list.includes(p.ticker)) list.push(p.ticker);
    live.set(p.holder, list);
  });
  const bridges = [...live.entries()]
    .filter(([, tickers]) => tickers.length > 1)
    .map(([holder, tickers]) => ({ holder, tickers }));

  // ONE atlas, laid out once. Full screen shows the same board larger; it
  // does not lay it out again.
  //
  // It used to: a wider shape made the sector cells bigger, which made room
  // for more names. That was worth having only while names were chosen by
  // what fitted — and choosing them that way was the thing wrong with the
  // screen. Re-running the treemap moved every company between the inline
  // board and the full-screen one, which breaks the promise this map is built
  // on: nothing moves unless the data moved.
  const model = OM.layout(rows, OM.VIEW);
  const valueOf = (p) => (finite(co[p.ticker] && co[p.ticker].cap)
    ? (p.percent / 100) * co[p.ticker].cap : null);

  // ── the widget ────────────────────────────────────────────────────────────
  //
  // Real DOM rather than `h`, because the board is redrawn on every week and
  // every focus, and pushing either through the component's render would
  // repaint the whole screen with it. Playback in particular would re-render
  // the page once a second for as long as it ran.
  // A stable parent for the board, so full screen can borrow the host and
  // hand it back to the same place.
  const slot = document.createElement('div');
  slot.className = 'om-map-wrap';
  const host = document.createElement('div');
  host.className = 'om-map-host';
  const strip = document.createElement('div');
  strip.className = 'om-periods';
  const stage = document.createElement('div');
  stage.className = 'om-map-slot';
  // The scroller is inside the framed box, so the hint under it stays put
  // while the board pans rather than sliding off with it.
  const scroller = document.createElement('div');
  scroller.className = 'om-map-scroll';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'om-map-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', t('Map of disclosed EGX ownership', 'خريطة الملكية المفصح عنها في البورصة'));
  scroller.appendChild(svg);
  const hint = document.createElement('p');
  hint.className = 'om-pan-hint';
  hint.textContent = t('Drag the board sideways to see the rest of the market.',
                       'اسحب اللوحة جانباً لرؤية بقية السوق.');
  stage.append(scroller, hint);
  const side = document.createElement('div');
  side.className = 'om-side';
  const cards = document.createElement('div');
  cards.className = 'om-side-cards';
  side.appendChild(cards);
  host.append(strip, stage, side);
  slot.appendChild(host);

  // The chosen week lives in the component for the same reason focus does:
  // picking a holder scopes the list below, which is a `setState`, which
  // rebuilds this panel. Left in the closure, choosing a week and then a
  // holder snapped the board back to Standing and the spokes came out solid.
  let week = st.ownershipWeek || null;   // null is the standing board
  // Focus lives in the component, not in this closure.
  //
  // Picking a company also scopes the disclosure list below, and that is a
  // `setState` — which rebuilds this whole panel and would hand the board a
  // fresh closure with nothing selected. The symptom was a board showing one
  // holder's spokes beside a register that had forgotten them.
  let focus = st.ownershipFocus || null;
  let named = st.ownershipNamed || null;   // the one dot whose label is pinned
  let query = '';
  let timer = null;
  let big = false;
  // The window on the board, in the board's own units. Zooming moves this
  // rather than scaling the element: the vectors stay sharp and, more to the
  // point, a click still lands where the reader aimed it.
  //
  // And it lives in the component for the third time on this panel, for the
  // reason focus and the week already do: picking a company scopes the list
  // below, which is a `setState`, which builds this whole board again. Left in
  // the closure, a reader who zoomed in to find a company and then pressed it
  // was thrown back out to the whole exchange by the press itself.
  let win = st.ownershipWin && finite(st.ownershipWin.w)
    ? { ...st.ownershipWin } : null;
  const board = () => OM.VIEW;
  const wholeBoard = () => ({ x: 0, y: 0, w: OM.VIEW.w, h: OM.VIEW.h });

  const buttons = [];
  const chip = (key, text, sub) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'om-period';
    b.dataset.key = key === null ? '' : key;
    const strong = document.createElement('strong');
    strong.textContent = text;
    b.appendChild(strong);
    if (sub) {
      const small = document.createElement('small');
      small.textContent = sub;
      b.appendChild(small);
    }
    b.addEventListener('click', () => {
      stop(); week = key;
      component.state.ownershipWeek = week;   // survives the next re-render
      paint();
    });
    buttons.push(b);
    strip.appendChild(b);
    return b;
  };
  chip(null, t('Standing', 'الوضع الحالي'), t('all disclosed', 'كل ما أُفصح عنه'));
  weeks.forEach((w) => chip(w.start, ar ? w.labelAr : w.label,
                            t(`${w.moves.length} moved`, `${w.moves.length} تحرّك`)));

  const tool = (glyph, label, onClick, className = 'om-tool') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    b.textContent = glyph;
    b.setAttribute('aria-label', label);
    b.title = label;
    b.addEventListener('click', onClick);
    return b;
  };
  const zoomLabel = document.createElement('output');
  zoomLabel.className = 'om-zoom-level';
  zoomLabel.setAttribute('aria-live', 'polite');
  const zoomIn = tool('+', t('Zoom in', 'تكبير'), () => zoomBy(1.4));
  const zoomOut = tool('−', t('Zoom out', 'تصغير'), () => zoomBy(1 / 1.4));
  const resetZoom = tool('⤢', t('Fit the whole board', 'ملء اللوحة'),
                         () => { win = wholeBoard(); applyWindow(); });
  const expand = tool('⛶', t('Explore full screen', 'استكشف بملء الشاشة'),
                      () => toggleFull(), 'om-tool om-expand');

  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'om-play';
  const setPlayLabel = () => {
    play.textContent = timer ? '❙❙' : '▶';
    play.setAttribute('aria-label', timer
      ? t('Pause', 'إيقاف مؤقت') : t('Play the weeks in order', 'تشغيل الأسابيع بالترتيب'));
  };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } setPlayLabel(); };
  play.addEventListener('click', () => {
    if (timer) { stop(); return; }
    if (!weeks.length) return;
    week = weeks[0].start;
    paint();
    timer = setInterval(() => {
      // Nothing here owns an unmount hook, so the timer checks whether the
      // board it draws into is still on the page and stops itself when a
      // language or screen change has replaced it.
      if (!host.isConnected) { stop(); return; }
      const at = weeks.findIndex((w) => w.start === week);
      if (at >= weeks.length - 1) { stop(); return; }
      week = weeks[at + 1].start;
      paint();
    }, 1600);
    setPlayLabel();
  });
  setPlayLabel();
  const tools = document.createElement('div');
  // NOT `om-tools`: the shell already owns that class for the rail's own
  // language and theme controls, and `journal.css` hides it outright with
  // `#app .om-tools { display: none !important }`. Named that, every zoom
  // control on this board was present, styled, and invisible.
  tools.className = 'om-map-tools';
  if (weeks.length > 1) tools.appendChild(play);
  tools.append(zoomOut, zoomLabel, zoomIn, resetZoom, expand);
  strip.appendChild(tools);

  // Wheel to zoom, drag to pan — the same gestures the chart explorer uses,
  // and the reason the map keeps its own instead of borrowing that one: the
  // explorer works on a CLONE with its listeners stripped, and half of what
  // this board is for is clicking a company to see who is in it.
  scroller.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !big && Math.abs(e.deltaY) < 40) return;
    e.preventDefault();
    const box = svg.getBoundingClientRect();
    if (!win) win = wholeBoard();
    zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, {
      x: win.x + ((e.clientX - box.left) / box.width) * win.w,
      y: win.y + ((e.clientY - box.top) / box.height) * win.h,
    });
  }, { passive: false });

  /* Pan, without eating the click.
   *
   * The capture used to be taken on pointerdown. `setPointerCapture` sends
   * every later pointer event to the element that took it, so once the board
   * was zoomed in the SVG swallowed them all and no company underneath ever
   * saw a click — the one state where a reader most wants to press something.
   *
   * The capture is now taken only once the pointer has actually travelled far
   * enough to be a pan. A press that does not move is a press.
   */
  const PAN_SLOP = 4;                 // CSS pixels before it counts as a drag
  let drag = null;
  svg.addEventListener('pointerdown', (e) => {
    if (!win || win.w >= board().w) return;      // nothing to pan at full fit
    drag = { x: e.clientX, y: e.clientY, from: { ...win }, moved: false, id: e.pointerId };
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < PAN_SLOP) return;
      drag.moved = true;
      try { svg.setPointerCapture(drag.id); } catch { /* pointer already gone */ }
    }
    const box = svg.getBoundingClientRect();
    win.x = drag.from.x - (e.clientX - drag.x) / box.width * win.w;
    win.y = drag.from.y - (e.clientY - drag.y) / box.height * win.h;
    applyWindow();
  });
  const endDrag = (e) => {
    if (!drag) return;
    const moved = drag.moved;
    if (moved) {
      try { svg.releasePointerCapture(drag.id); } catch { /* already released */ }
    }
    drag = null;
    // A drag that moved is a pan, not a click on whatever was under the
    // finger when it stopped.
    if (moved) e.stopPropagation();
  };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  // Full screen holds the LIVE board, not a copy of it. The map answers
  // "who is in this company" by being clicked, and a clone cannot be.
  const sheet = document.createElement('div');
  sheet.className = 'om-sheet';
  sheet.hidden = true;
  const onKey = (e) => { if (e.key === 'Escape' && big) toggleFull(); };
  function toggleFull() {
    big = !big;
    expand.textContent = big ? '✕' : '⛶';
    expand.title = big ? t('Close', 'إغلاق') : t('Explore full screen', 'استكشف بملء الشاشة');
    expand.setAttribute('aria-label', expand.title);
    if (big) {
      sheet.hidden = false;
      sheet.appendChild(host);
      document.body.appendChild(sheet);
      document.body.classList.add('om-sheet-open');
      document.addEventListener('keydown', onKey);
    } else {
      slot.appendChild(host);
      sheet.hidden = true;
      sheet.remove();
      document.body.classList.remove('om-sheet-open');
      document.removeEventListener('keydown', onKey);
    }
    paint();
  }

  // The handle the last draw returned, so a zoom can resize its marks
  // instead of asking for the board again.
  let painted = null;

  const clampWindow = () => {
    const full = board();
    const min = 0.14;                       // about seven times in
    win.w = Math.max(full.w * min, Math.min(full.w, win.w));
    win.h = win.w * (full.h / full.w);
    win.x = Math.max(0, Math.min(full.w - win.w, win.x));
    win.y = Math.max(0, Math.min(full.h - win.h, win.y));
  };

  const applyWindow = () => {
    if (!win) win = wholeBoard();
    clampWindow();
    svg.setAttribute('viewBox', `${win.x} ${win.y} ${win.w} ${win.h}`);
    const full = board();
    const times = full.w / win.w;
    // Zoomed in, the marks are drawn smaller. Growing everything by the zoom
    // factor put three rings across the screen and hid exactly the crowding
    // a reader zoomed in to see through.
    if (painted) painted.rescale(OM.markFor(times));
    component.state.ownershipWin = { ...win };
    if (zoomOut) zoomOut.disabled = times <= 1.001;
    if (zoomLabel) zoomLabel.textContent = `${times.toFixed(1)}×`;
  };

  const zoomBy = (factor, at) => {
    if (!win) win = wholeBoard();
    const before = { ...win };
    win.w = before.w / factor;
    win.h = before.h / factor;
    // Keep the point under the cursor under the cursor.
    const fx = at ? (at.x - before.x) / before.w : 0.5;
    const fy = at ? (at.y - before.y) / before.h : 0.5;
    win.x = before.x + fx * before.w - fx * win.w;
    win.y = before.y + fy * before.h - fy * win.h;
    applyWindow();
  };

  const paint = () => {
    buttons.forEach((b) => {
      const on = (b.dataset.key || null) === week;
      b.classList.toggle('om-period-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    painted = OM.renderMap(svg, model, {
      holdings: positions, bridges, labelOf, focus, t, ar, named,
      moves: week ? OM.movesIn(doc, week) : null,
      onPick: (id) => {
        focus = focus === id ? null : id;
        named = null;
        // The disclosure list further down this screen has always had a
        // company filter; nothing was setting it. Picking a company on the
        // board now scopes that list to it, so the two halves of the screen
        // are looking at the same company instead of at each other.
        scopeDealings(focus);
        paint();
      },
    });
    applyWindow();
    drawSide();
    drawRegister();
  };

  /* ── the register ─────────────────────────────────────────────────────────
   *
   * The board is a map. This is the index to it, and between them every filed
   * name is reachable: alphabetically, by search, or by pointing at a dot.
   *
   * Alphabetical on purpose. Any other order — by stake, by value, by number
   * of companies — is a ranking of named parties, and this project does not
   * publish one. The order is stated at the top so a reader knows it is not a
   * league table.
   */
  const collator = new Intl.Collator(ar ? 'ar' : 'en', { sensitivity: 'base' });
  // The map's own formatter, so the board and the panel beside it cannot
  // disagree about the same holding.
  const stake = OM.stakeText;
  const everyHolder = [...new Set(positions.filter((p) => p.percent > 0)
                                           .map((p) => p.holder))]
    .map((id) => ({
      id,
      label: labelOf(id),
      kind: kindOf[id] || 'person',
      tickers: positions.filter((p) => p.holder === id && p.percent > 0)
                        .map((p) => p.ticker),
    }))
    .sort((a, b) => collator.compare(a.label, b.label) || (a.id < b.id ? -1 : 1));

  const register = document.createElement('div');
  register.className = 'om-register';
  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'om-search';
  search.placeholder = t('Search every filed name', 'ابحث في كل الأسماء');
  search.setAttribute('aria-label', search.placeholder);
  search.addEventListener('input', () => { query = search.value.trim(); drawRegister(); });
  const crumb = document.createElement('div');
  crumb.className = 'om-crumb';
  const list = document.createElement('div');
  list.className = 'om-register-list';
  const count = document.createElement('p');
  count.className = 'om-register-count';
  register.append(search, crumb, count, list);
  // Appended here rather than beside `cards` above, where `register` is still
  // in its temporal dead zone and reading it threw before the panel drew.
  side.appendChild(register);

  const registerRow = (parent, { colour, title, sub, right, onClick, on }) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = on ? 'om-reg-row om-reg-row-on' : 'om-reg-row';
    const dot = document.createElement('i');
    dot.style.background = colour;
    const text = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = title;
    text.appendChild(strong);
    if (sub) {
      const small = document.createElement('small');
      small.textContent = sub;
      text.appendChild(small);
    }
    const b = document.createElement('b');
    b.dir = 'ltr';
    b.textContent = right || '';
    el.append(dot, text, b);
    el.addEventListener('click', onClick);
    parent.appendChild(el);
    return el;
  };

  const matches = (holder) => {
    if (!query) return true;
    const needle = query.toLowerCase();
    return holder.label.toLowerCase().includes(needle)
        || holder.id.toLowerCase().includes(needle)
        || holder.tickers.some((tk) => tk.toLowerCase().includes(needle));
  };

  /* Point the disclosure list below the map at whatever the board is showing.
   *
   * A company scopes it to that company. A holder scopes it to the one company
   * they hold, when they hold exactly one — a list filtered to a holder in
   * three companies would be three companies' dealings under one name, which
   * is not what the filter says it does. Clearing the board clears the list.
   */
  const scopeDealings = (id) => {
    let ticker = '';
    if (id && byTicker.has(id)) ticker = id;
    else if (id && spread.has(id)) {
      const mine = [...new Set(positions.filter((p) => p.holder === id && p.percent > 0)
                                        .map((p) => p.ticker))];
      if (mine.length === 1) [ticker] = mine;
    }
    const patch = {
      ownershipFocus: focus, ownershipNamed: named, ownershipWeek: week,
      ownershipWin: win ? { ...win } : null,
    };
    if ((component.state.ownershipTicker || '') !== ticker) {
      patch.ownershipTicker = ticker;
      patch.ownershipPage = 0;
    }
    component.setState(patch);
  };

  const drawRegister = () => {
    crumb.textContent = '';
    list.textContent = '';

    // Scope: a company narrows the register to its own holders, a holder to
    // their own companies. Both are reversible from the breadcrumb, so a
    // reader is never stuck inside a selection they did not mean to make.
    const scope = focus && byTicker.has(focus) ? 'company'
      : focus && spread.has(focus) ? 'holder' : 'all';
    if (scope !== 'all') {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'om-crumb-clear';
      back.textContent = scope === 'company'
        ? `${focus} · ${t('clear', 'إلغاء')}`
        : `${labelOf(focus)} · ${t('clear', 'إلغاء')}`;
      back.addEventListener('click', () => {
        focus = null; named = null; scopeDealings(null); paint();
      });
      crumb.appendChild(back);
    }

    if (scope === 'company') {
      const row = byTicker.get(focus);
      const holders = row.holders.filter((h) => h.percent > 0)
        .sort((a, b) => collator.compare(labelOf(a.holder), labelOf(b.holder)));
      count.textContent = t(
        `${holders.length} disclosed holders of ${focus}, A–Z`,
        `${holders.length} مالك معلوم في ${focus}، أبجدياً`);
      holders.forEach((h) => registerRow(list, {
        colour: OM.hueOf(h.holder),
        title: labelOf(h.holder),
        sub: `${h.asOf} · ${basisWord(h.basis)}`,
        right: stake(h.percent),
        on: named && named.holder === h.holder && named.ticker === h.ticker,
        onClick: () => {
          named = { holder: h.holder, ticker: h.ticker };
          focus = h.holder;
          scopeDealings(focus);
          paint();
        },
      }));
      const seats = (boards[focus] || {}).seats || [];
      if (seats.length) {
        const head = document.createElement('p');
        head.className = 'om-reg-head';
        head.textContent = t(`Board of ${focus} — ${seats.length} seats`,
                             `مجلس إدارة ${focus} — ${seats.length} مقعداً`);
        list.appendChild(head);
        seats.forEach((seat) => {
          const el = document.createElement('div');
          // Not `om-seat`. That class already names the SVG group a holder
          // sits in out on the water, and both were picking up both rule
          // sets — `display: grid` landing on a `<g>`, a list row inheriting
          // the board's hover. The same collision that made every zoom
          // control on this panel invisible for a day.
          el.className = 'om-board-seat';
          const nm = document.createElement('strong');
          nm.textContent = seat.name;
          el.appendChild(nm);
          if (seat.role) {
            const r = document.createElement('small');
            r.textContent = seat.representing && seat.representing !== seat.name
              ? `${seat.role} · ${seat.representing}` : seat.role;
            el.appendChild(r);
          }
          list.appendChild(el);
        });
      }
      return;
    }

    const shown = (scope === 'holder'
      ? everyHolder.filter((h) => h.id === focus)
      : everyHolder.filter(matches));
    count.textContent = scope === 'holder'
      ? t('Every company this holder is filed in', 'كل شركة ورد فيها اسم هذا المالك')
      : t(`${shown.length} of ${everyHolder.length} filed names, A–Z`,
          `${shown.length} من ${everyHolder.length} اسماً، أبجدياً`);

    if (scope === 'holder') {
      const mine = positions.filter((p) => p.holder === focus && p.percent > 0)
        .sort((a, b) => collator.compare(a.ticker, b.ticker));
      mine.forEach((p) => registerRow(list, {
        colour: OM.hueOf(focus),
        title: `${p.ticker} · ${(co[p.ticker] && co[p.ticker].name) || ''}`,
        sub: `${p.asOf} · ${basisWord(p.basis)}`,
        right: stake(p.percent),
        on: named && named.ticker === p.ticker,
        onClick: () => { named = { holder: focus, ticker: p.ticker }; paint(); },
      }));
      return;
    }

    if (!shown.length) {
      const none = document.createElement('p');
      none.className = 'om-reg-none';
      none.textContent = t('No filed name matches that.', 'لا اسم مطابق.');
      list.appendChild(none);
      return;
    }
    shown.forEach((h) => registerRow(list, {
      colour: OM.hueOf(h.id),
      title: h.label,
      sub: h.tickers.length > 1
        ? t(`${h.tickers.length} companies`, `${h.tickers.length} شركات`)
        : h.tickers[0],
      right: h.kind === 'firm' ? t('firm', 'شركة') : t('person', 'فرد'),
      onClick: () => { focus = h.id; named = null; scopeDealings(focus); paint(); },
    }));
  };

  const basisWord = (basis) => (basis === 'register'
    ? t('filed register', 'سجل مودع') : t('after a trade', 'بعد صفقة'));

  const card = (title, body) => {
    const el = document.createElement('div');
    el.className = 'om-card';
    const h4 = document.createElement('h4');
    h4.textContent = title;
    el.appendChild(h4);
    body(el);
    cards.appendChild(el);
    return el;
  };
  const row = (parent, colour, text, right, onClick) => {
    const el = document.createElement(onClick ? 'button' : 'div');
    el.className = 'om-holder-row';
    if (onClick) { el.type = 'button'; el.addEventListener('click', onClick); }
    const dot = document.createElement('i');
    if (colour) dot.style.background = colour; else dot.style.visibility = 'hidden';
    const name = document.createElement('span');
    name.textContent = text;
    const val = document.createElement('b');
    val.dir = 'ltr';
    val.textContent = right;
    el.append(dot, name, val);
    parent.appendChild(el);
  };

  const drawSide = () => {
    cards.textContent = '';
    const moves = week ? OM.movesIn(doc, week) : null;
    const chosen = week ? weeks.find((w) => w.start === week) : null;

    if (focus && byTicker.has(focus)) {
      const r = byTicker.get(focus);
      // A listed fund's certificates carry a code and no company record, so
      // the heading would otherwise read "KASABF · KASABF".
      card(r.name === r.ticker ? r.ticker : `${r.ticker} · ${r.name}`, (el) => {
        const meta = document.createElement('p');
        meta.className = 'om-card-meta';
        meta.textContent = finite(r.cap)
          ? t(`${compact(r.cap)} EGP market value`, `${compact(r.cap)} ج.م قيمة سوقية`)
          : t('no published market value', 'لا قيمة سوقية منشورة');
        el.appendChild(meta);
        const bar = document.createElement('strong');
        bar.dir = 'ltr';
        bar.textContent = `${r.disclosed.toFixed(2)}%`;
        el.appendChild(bar);
        const small = document.createElement('small');
        // Said plainly rather than left to a tooltip. A ring that adds to more
        // than its company is two documents naming one party twice — usually a
        // register in English against a trade form in Arabic — and a reader
        // looking at both names can see it where no string comparison can.
        small.textContent = r.disclosed > 100.0001
          ? t('which is more than the company. Two filings almost certainly name one holder twice, under a name each spells differently.',
              'وهو أكثر من الشركة نفسها. على الأرجح يذكر إفصاحان مالكاً واحداً مرتين باسمين مختلفي الكتابة.')
          : t('of the company is in hands a filing has named',
              'من الشركة في أيدٍ ذكرها إفصاح');
        if (r.disclosed > 100.0001) small.className = 'om-card-warn';
        el.appendChild(small);
      });
      card(t('Named holders', 'الملاك المعروفون'), (el) => {
        r.holders.slice().sort((a, b) => b.percent - a.percent).forEach((p) => {
          const mv = moves && moves.get(OM.keyOf(p.holder, p.ticker));
          const change = mv && finite(mv.change)
            ? `  ${mv.change > 0 ? '+' : ''}${mv.change.toFixed(2)}` : '';
          row(el, OM.hueOf(p.holder),
              `${labelOf(p.holder)} · ${p.asOf}`,
              `${stake(p.percent)}${change}`,
              () => { focus = p.holder; paint(); });
        });
      });
      return;
    }

    if (focus && spread.has(focus)) {
      const mine = positions.filter((p) => p.holder === focus);
      card(labelOf(focus), (el) => {
        const meta = document.createElement('p');
        meta.className = 'om-card-meta';
        meta.textContent = kindOf[focus] === 'firm'
          ? t('a company or fund', 'شركة أو صندوق')
          : t('an individual named in the filing', 'شخص ورد اسمه في الإفصاح');
        el.appendChild(meta);
        const strong = document.createElement('strong');
        strong.dir = 'ltr';
        const worth = mine.map(valueOf).filter(finite).reduce((s, v) => s + v, 0);
        strong.textContent = worth > 0 ? `${compact(worth)} EGP` : '—';
        el.appendChild(strong);
        const small = document.createElement('small');
        // The one figure that CAN be added across companies. Percentages
        // cannot: they are shares of different things.
        small.textContent = t('market value of the stakes below',
                              'القيمة السوقية للحصص أدناه');
        el.appendChild(small);
      });
      card(t('Stakes held', 'الحصص المملوكة'), (el) => {
        mine.slice().sort((a, b) => b.percent - a.percent).forEach((p) => {
          row(el, OM.hueOf(focus),
              `${p.ticker} · ${(co[p.ticker] && co[p.ticker].name) || ''}`,
              stake(p.percent),
              () => { focus = p.ticker; paint(); });
        });
      });
      return;
    }

    card(chosen ? (ar ? chosen.labelAr : chosen.label)
                : t('Everything disclosed', 'كل ما أُفصح عنه'), (el) => {
      const strong = document.createElement('strong');
      strong.dir = 'ltr';
      strong.textContent = chosen
        ? `${compact(chosen.value)} EGP`
        : `${holdings.length}`;
      el.appendChild(strong);
      const small = document.createElement('small');
      // The companies that carry one, not the companies on the board: three of
      // the rings are there because a named holder has since sold out of them.
      const withStake = new Set(holdings.map((p) => p.ticker)).size;
      small.textContent = chosen
        ? t(`${chosen.moves.length} holdings moved over ${chosen.sessions} sessions`,
            `${chosen.moves.length} حصة تحركت خلال ${chosen.sessions} جلسة`)
        : t(`standing stakes across ${withStake} companies`
            + (rows.length > withStake
               ? `, and ${rows.length - withStake} more a named holder has left`
               : ''),
            `حصة قائمة في ${withStake} شركة`
            + (rows.length > withStake
               ? `، و${rows.length - withStake} أخرى خرج منها مالك معلوم`
               : ''));
      el.appendChild(small);
    });

    if (chosen) {
      card(t('What moved', 'ما الذي تحرّك'), (el) => {
        chosen.moves.slice(0, 7).forEach((m) => {
          row(el, OM.hueOf(m.holder),
              `${m.ticker} · ${labelOf(m.holder)}`,
              finite(m.change) ? `${m.change > 0 ? '+' : ''}${m.change.toFixed(2)}pp` : '—',
              () => { focus = m.ticker; paint(); });
        });
        if (chosen.moves.length > 7) {
          const more = document.createElement('small');
          more.className = 'om-card-more';
          more.textContent = t(`and ${chosen.moves.length - 7} more`,
                               `و${chosen.moves.length - 7} غيرها`);
          el.appendChild(more);
        }
      });
      return;
    }

    card(t('Who the holders are', 'من هم الملاك'), (el) => {
      row(el, 'var(--own2)', t('individuals', 'أفراد'), String(doc.personCount || 0));
      row(el, 'var(--own4)', t('companies and funds', 'شركات وصناديق'), String(doc.firmCount || 0));
      row(el, 'var(--accent)', t('in more than one company', 'في أكثر من شركة'), String(bridges.length));
    });
  };

  paint();
  svg.addEventListener('click', () => {
    if (!focus) return;
    focus = null; named = null; scopeDealings(null); paint();
  });

  const held = holdings.map(valueOf).filter(finite).reduce((s, v) => s + v, 0);

  return h('div', { className: 'ft-detail om-panel' },
    h('div', { className: 'ft-section-heading' },
      h('div', null,
        h('span', { className: 'ft-eyebrow' }, t('WHO OWNS THE EXCHANGE', 'من يملك البورصة')),
        h('h3', null, t('Named ownership across the EGX, and what moved',
                        'الملكية المعلومة في البورصة، وما الذي تحرّك'))
      ),
      h('span', { className: 'ft-range-badge', dir: 'ltr' },
        `${rows.length} · ${doc.peopleCount} · ${compact(held)} EGP`)
    ),
    h('p', { className: 'ft-note' }, t(
      'Every company a filing has named a holder in, at the stake that stands today. Most come from the board-and-shareholder-structure form, which prints a company\u2019s whole register at once; the rest from post-execution forms, which print what one trade left behind. Point at a holder to read their name, pick one to see every company they are in, and choose a week to light the holdings that changed in it. The board itself never moves.',
      '\u0643\u0644 \u0634\u0631\u0643\u0629 \u0648\u0631\u062f \u0641\u064a \u0625\u0641\u0635\u0627\u062d \u0627\u0633\u0645 \u0645\u0627\u0644\u0643 \u0641\u064a\u0647\u0627\u060c \u0628\u0627\u0644\u062d\u0635\u0629 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u064a\u0648\u0645. \u0645\u0639\u0638\u0645\u0647\u0627 \u0645\u0646 \u0646\u0645\u0648\u0630\u062c \u0645\u062c\u0644\u0633 \u0627\u0644\u0625\u062f\u0627\u0631\u0629 \u0648\u0647\u064a\u0643\u0644 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u064a\u0646\u060c \u0627\u0644\u0630\u064a \u064a\u0637\u0628\u0639 \u0633\u062c\u0644 \u0627\u0644\u0634\u0631\u0643\u0629 \u0643\u0627\u0645\u0644\u0627\u064b\u060c \u0648\u0628\u0642\u064a\u062a\u0647\u0627 \u0645\u0646 \u0646\u0645\u0627\u0630\u062c \u0627\u0644\u0625\u0641\u0635\u0627\u062d \u0628\u0639\u062f \u0627\u0644\u062a\u0646\u0641\u064a\u0630. \u0623\u0634\u0631 \u0625\u0644\u0649 \u0645\u0627\u0644\u0643 \u0644\u062a\u0642\u0631\u0623 \u0627\u0633\u0645\u0647\u060c \u0648\u0627\u062e\u062a\u0631\u0647 \u0644\u062a\u0631\u0649 \u0643\u0644 \u0634\u0631\u0643\u0627\u062a\u0647\u060c \u0648\u0627\u062e\u062a\u0631 \u0623\u0633\u0628\u0648\u0639\u0627\u064b \u0644\u062a\u0636\u064a\u0621 \u0627\u0644\u062d\u0635\u0635 \u0627\u0644\u062a\u064a \u062a\u063a\u064a\u0651\u0631\u062a \u0641\u064a\u0647. \u0648\u0627\u0644\u0644\u0648\u062d\u0629 \u0646\u0641\u0633\u0647\u0627 \u0644\u0627 \u062a\u062a\u062d\u0631\u0643 \u0623\u0628\u062f\u0627\u064b.')),
    slot,
    h('div', { className: 'om-legend' },
      h('span', { className: 'om-key om-key-ring' },
        t('A ring is a company, sized by market value; the coloured slices are the holders a filing has named.',
          'الحلقة شركة، حجمها بالقيمة السوقية، والشرائح الملوّنة ملّاك ذكرهم إفصاح.')),
      h('span', { className: 'om-key om-key-none' },
        t('The grey remainder is ownership nobody had to disclose — not free float.',
          'الجزء الرمادي ملكية لم يُلزم أحد بالإفصاح عنها — وليس أسهماً حرة.')),
      h('span', { className: 'om-key om-key-arc' },
        t('An outer arc is what that holding gained or gave up in the chosen week.',
          'القوس الخارجي هو ما اكتسبته الحصة أو تخلّت عنه في الأسبوع المختار.')),
      h('span', { className: 'om-key om-key-dot' },
        t('A dot is one holder\u2019s stake in one company. Point at it for the name.',
          '\u0627\u0644\u0646\u0642\u0637\u0629 \u062d\u0635\u0629 \u0645\u0627\u0644\u0643 \u0648\u0627\u062d\u062f \u0641\u064a \u0634\u0631\u0643\u0629 \u0648\u0627\u062d\u062f\u0629. \u0623\u0634\u0631 \u0625\u0644\u064a\u0647\u0627 \u0644\u064a\u0638\u0647\u0631 \u0627\u0644\u0627\u0633\u0645.')),
      h('span', { className: 'om-key om-key-bridge' },
        t('Pick a holder and a spoke runs to each company they are in, tagged with the stake they hold of it.',
          '\u0627\u062e\u062a\u0631 \u0645\u0627\u0644\u0643\u0627\u064b \u064a\u0645\u062a\u062f \u062e\u0637 \u0625\u0644\u0649 \u0643\u0644 \u0634\u0631\u0643\u0629 \u0647\u0648 \u0641\u064a\u0647\u0627\u060c \u0645\u0639\u0644\u0651\u0645\u0627\u064b \u0628\u062d\u0635\u062a\u0647 \u0645\u0646\u0647\u0627.'))
    ),
    h('p', { className: 'ft-note' }, t(
      'A stake is a percentage of ONE company: nothing here adds two of them together, and a holder in three companies is drawn three times with no combined percentage. Each figure is the closing stake on the most recent form filed for it, not a running total of trades. A company with no published market value is drawn at the smallest size with a dashed centre rather than dropped.',
      'الحصة نسبة من شركة واحدة: لا شيء هنا يجمع نسبتين، ومن يملك في ثلاث شركات يُرسم ثلاث مرات بلا نسبة مجمّعة. وكل رقم هو الحصة الختامية في أحدث نموذج أُودع عنها، لا حاصل جمع الصفقات. والشركة التي لا تُنشر قيمتها السوقية تُرسم بأصغر حجم وبمركز متقطع بدلاً من استبعادها.'))
  );
}


/* ── the sector lens ──────────────────────────────────────────────────────────
 *
 * Three blocks that answer one question between them: where does the money on
 * this exchange actually go? Months first, because "how much moves" has a
 * denominator; then how the shares of it changed, which is rotation and is a
 * record; then which sectors own each other, which is the register's answer to
 * the same question.
 *
 * The section says out loud that it does not forecast. Asked for a predicted
 * next sector, this is what can honestly be built instead: the publisher is
 * not licensed by the FRA, and a named sector presented as the next one is a
 * recommendation however it is worded.
 */
const monthName = (month, ar) => {
  const { name, year } = SL.monthLabel(month, ar);
  return `${name} 20${year}`;
};

function renderMonthsOfMoney(d, sectors, selected, month, mode, ar, t, onPickMonth, onPickMode) {
  const monthly = d.monthly;
  if (!monthly || !Array.isArray(monthly.months) || monthly.months.length < 2) return null;
  const rows = SL.monthRows(monthly, selected);
  const at = rows.find((r) => r.month === month) || rows[rows.length - 1];
  const chart = SL.monthsChart(monthly, selected, {
    ar, t, mode, month: at.month, onPick: onPickMonth,
  });
  const total = rows.reduce((n, r) => n + (r.value || 0), 0);
  const sectorName = selected ? (ar ? (selected.nameAr || selected.name) : selected.name) : null;

  return h('section', { className: 'ft-detail sl-block' },
    h('div', { className: 'ft-section-heading' },
      h('div', null,
        h('span', { className: 'ft-eyebrow' }, t('MONTHS OF MONEY', 'المال شهراً بشهر')),
        h('h2', null, t('How much traded, month by month', 'كم تداولت السوق شهراً بشهر'))
      ),
      h('span', { className: 'ft-range-badge', dir: 'ltr' },
        `${rows[0].month} → ${rows[rows.length - 1].month}`)
    ),
    h('p', { className: 'ft-note' }, t(
      `EGP ${compact(total)} changed hands across ${rows.length} months in the sectors this site covers. `
      + (mode === 'sector'
        ? 'Each column is one month of the sector named above, on its own scale. '
        : 'Each column is one month of the whole covered exchange; the filled part is the sector selected below. ')
      + 'Hatched columns are months that cannot be compared with a whole one — the month still running, '
      + 'or one the archive joins partway through.',
      `تداولت السوق ${compact(total)} جنيه خلال ${rows.length} شهراً في القطاعات التي يغطيها الموقع. `
      + 'كل عمود شهر كامل للسوق المغطاة، والجزء المملوء هو القطاع المختار أدناه. '
      + 'الأعمدة المهشّرة شهور لا تُقارن بشهر كامل: الشهر الجاري، أو شهر يبدأ فيه السجل من منتصفه.')),
    h('div', { className: 'ft-pills sl-scale' },
      button(t('Whole market', 'السوق كلها'), () => onPickMode('market'), mode !== 'sector'),
      selected && button(
        ar ? (selected.nameAr || selected.name) : selected.name,
        () => onPickMode('sector'), mode === 'sector')
    ),
    chart,
    h('div', { className: 'ft-metrics' },
      metric(t('Month', 'الشهر'), monthName(at.month, ar),
        `${at.sessions} ${t('sessions', 'جلسة')} · ${at.companies} ${t('companies traded', 'شركة تداولت')}`
        + (at.partial ? ` · ${t('part month', 'شهر ناقص')}` : '')),
      metric(t('Traded that month · EGP', 'تداول الشهر · ج.م'), compact(at.value),
        `${t('Coverage', 'التغطية')} ${at.coverage}%`),
      sectorName ? metric(sectorName, compact(at.part),
        finite(at.share) ? `${at.share.toFixed(1)}% ${t('of the month', 'من الشهر')}` : '—') : null,
      metric(t('Months published', 'شهور منشورة'), String(rows.length),
        monthly.held && monthly.held.length
          ? `${monthly.held.length} ${t('earlier months held back for thin coverage', 'شهراً سابقاً محجوبة لضعف التغطية')}`
          : t('every month the archive can compare', 'كل شهر يمكن مقارنته'))
    )
  );
}

function renderRotation(d, sectors, month, ar, t, onPickSector, selectedId) {
  const monthly = d.monthly;
  if (!monthly || !Array.isArray(monthly.months) || monthly.months.length < 2) return null;
  const { rows, now, before } = SL.rotation(monthly, sectors, month, ar);
  if (!rows.length || !before) return null;
  const widest = Math.max(...rows.map((r) => Math.abs(r.change || 0)), 0.5);

  return h('section', { className: 'ft-detail sl-block' },
    h('div', { className: 'ft-section-heading' },
      h('div', null,
        h('span', { className: 'ft-eyebrow' }, t('WHERE IT ROTATED', 'إلى أين تحوّل')),
        h('h2', null, t('Share of the month\u2019s trading, against the month before',
                        'نصيب القطاع من تداول الشهر، مقابل الشهر السابق'))
      ),
      h('span', { className: 'ft-range-badge', dir: 'ltr' }, `${before.month} → ${now.month}`)
    ),
    h('p', { className: 'ft-note' }, t(
      'Every sector with a figure in either month, in alphabetical order. '
      + 'This is a record of where trading has already been, and nothing here says which sector is next: '
      + 'ESTHMR is not licensed by the Financial Regulatory Authority and publishes no forecast or recommendation. '
      + 'A share can rise because a sector traded more or because the rest of the market traded less.',
      'كل قطاع له رقم في أي من الشهرين، بالترتيب الأبجدي. '
      + 'هذا سجل لما تداولته السوق فعلاً، ولا شيء هنا يقول أي قطاع هو التالي: '
      + 'استثمر غير مرخّص من الهيئة العامة للرقابة المالية ولا ينشر توقعات أو توصيات. '
      + 'وقد يرتفع النصيب لأن القطاع تداول أكثر أو لأن بقية السوق تداولت أقل.')),
    h('div', { className: 'sl-rotation' },
      rows.map((r) => h('button', {
        key: r.id, type: 'button',
        className: `sl-rot-row${selectedId === r.id ? ' sl-rot-on' : ''}`,
        onClick: () => onPickSector(r.id),
        'aria-pressed': String(selectedId === r.id),
      },
        h('span', { className: 'sl-rot-name' }, r.name),
        h('span', { className: 'sl-rot-share', dir: 'ltr' },
          finite(r.share) ? `${r.share.toFixed(1)}%` : '—'),
        h('span', { className: 'sl-rot-bar', 'aria-hidden': 'true' },
          h('i', {
            className: finite(r.change) && r.change < 0 ? 'sl-neg' : 'sl-pos',
            style: {
              width: `${Math.min(50, Math.abs(r.change || 0) / widest * 50)}%`,
              [finite(r.change) && r.change < 0 ? 'right' : 'left']: '50%',
            },
          })),
        h('span', {
          className: 'sl-rot-delta', dir: 'ltr',
          style: { color: tone(r.change) },
        }, finite(r.change)
          ? `${r.change > 0 ? '+' : ''}${r.change.toFixed(2)} pp`
          : t('new', 'جديد'))
      ))
    )
  );
}

function renderSectorsInsideSectors(doc, ar, t, focus, onPick, onCompany) {
  if (!doc || !Array.isArray(doc.links)) return null;
  if (!doc.links.length) {
    return h('section', { className: 'ft-detail sl-block' },
      h('h2', null, t('Sectors inside sectors', 'قطاعات داخل قطاعات')),
      h('p', { className: 'ft-note' }, t(
        'No filed register names one listed company as a holder of another yet.',
        'لا يوجد سجل مُفصح عنه يسمّي شركة مقيدة مالكةً في شركة مقيدة أخرى بعد.')));
  }
  const shown = focus
    ? doc.links.filter((l) => l.ownerSector === focus || l.heldSector === focus)
    : doc.links;
  const valued = shown.filter((l) => finite(l.value));
  const byOwner = new Map();
  shown.forEach((l) => {
    if (!byOwner.has(l.owner)) byOwner.set(l.owner, []);
    byOwner.get(l.owner).push(l);
  });

  return h('section', { className: 'ft-detail sl-block' },
    h('div', { className: 'ft-section-heading' },
      h('div', null,
        h('span', { className: 'ft-eyebrow' }, t('SECTORS INSIDE SECTORS', 'قطاعات داخل قطاعات')),
        h('h2', null, t('Which sectors own each other', 'أي القطاعات تملك بعضها'))
      ),
      h('span', { className: 'ft-range-badge', dir: 'ltr' },
        `${doc.linkCount} ${t('stakes', 'حصة')}`)
    ),
    h('p', { className: 'ft-note' }, t(
      `${doc.linkCount} ${plural(doc.linkCount, 'filed stake')} are one listed `
      + 'company\u2019s holding in another. '
      + 'A line runs from the owner to the owned and is weighted by what the stake is worth — '
      + 'percentages belong to one company each and are never added together, but money can be. '
      + `${doc.outsideHolderCount} other disclosed corporate holders are not companies listed here.`,
      `${doc.linkCount} حصة مُفصح عنها تملكها شركة مقيدة في شركة مقيدة أخرى. `
      + 'يمتد الخط من المالك إلى المملوك وسماكته بقيمة الحصة، '
      + 'فالنسب تخص شركة واحدة ولا تُجمع، أما المبالغ فتُجمع. '
      + `و${doc.outsideHolderCount} من المالكين المُفصح عنهم ليسوا شركات مقيدة هنا.`)),
    SL.ownershipRing(doc, { ar, t, focus, onPick }),
    focus && h('button', {
      type: 'button', className: 'ft-chip', onClick: () => onPick(null),
    }, t('Show every sector', 'اعرض كل القطاعات')),
    h('div', { className: 'sl-links' },
      [...byOwner.entries()].map(([owner, links]) => h('div', {
        key: owner, className: 'sl-owner',
      },
        h('div', { className: 'sl-owner-head' },
          h('button', {
            type: 'button', className: 'ft-stock-ticker-btn',
            onClick: () => onCompany(owner),
          }, owner),
          h('span', { className: 'sl-owner-name' },
            ar ? links[0].ownerNameAr : links[0].ownerName),
          h('small', null, ar ? links[0].ownerSectorAr : links[0].ownerSector)
        ),
        links.map((l) => h('div', { key: `${l.owner}-${l.held}`, className: 'sl-link' },
          h('span', { className: 'sl-arrow', 'aria-hidden': 'true' }, '→'),
          h('button', {
            type: 'button', className: 'ft-stock-ticker-btn',
            onClick: () => onCompany(l.held),
          }, l.held),
          h('span', { className: 'sl-held-name' }, ar ? l.heldNameAr : l.heldName),
          h('span', { className: 'sl-held-sector' }, ar ? l.heldSectorAr : l.heldSector),
          h('strong', { dir: 'ltr' }, `${l.percent.toFixed(2)}%`),
          h('span', { className: 'sl-held-value', dir: 'ltr' },
            finite(l.value) ? `${compact(l.value)} EGP` : t('no published size', 'بلا قيمة منشورة')),
          h('small', { dir: 'ltr' }, l.asOf || ''),
          safeLink(l.source) && h('a', {
            href: safeLink(l.source), target: '_blank', rel: 'noopener noreferrer',
          }, t('form', 'النموذج'))
        ))
      ))
    ),
    h('p', { className: 'ft-note' },
      `${valued.length}/${shown.length} ` + t(
        'of the stakes shown have a published market value behind them; the rest are drawn without one rather than estimated.',
        'من الحصص المعروضة لها قيمة سوقية منشورة، والباقي يُرسم بدونها بدلاً من تقديرها.')
      + (doc.refused && doc.refused.length
        ? ` ${doc.refused.length} ` + t(
          `${plural(doc.refused.length, 'candidate holder')} `
          + (doc.refused.length === 1 ? 'was' : 'were')
          + ' refused because a name alone could not prove which company they are.',
          'مالكاً محتملاً مرفوضاً لأن الاسم وحده لا يثبت أي شركة هو.')
        : ''))
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
  const titleOf = s => ar ? (s.nameAr || s.name) : s.name;
  const topSectors = [...sectors].sort((a, b) => (b.history?.at(-1)?.value || 0) - (a.history?.at(-1)?.value || 0)).slice(0, 5);
  const totalFlow = topSectors.reduce((s, x) => s + (x.history?.at(-1)?.value || 0), 0);
  const topEvents = preview?.topEvents || (d?.events ? d.events.filter(r => finite(r.referencePercent) || finite(r.currentMarkedValue)).slice(0, 8) : []);
  const topOwnershipLinks = preview?.topOwnershipLinks || (d?.ownershipGraph?.links || []);

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
            renderHomeSectorConstellation(sectors, ar, t),
            topSectors.length ? h('div', { className: 'ft-preview-grid' },
              topSectors.slice(0, 3).map(s => {
                const lat = s.history?.at(-1) || {};
                return h('div', { key: s.id, className: 'ft-preview-item' },
                  h('div', { className: 'ft-preview-info' },
                    h('span', { className: 'ft-preview-name' }, titleOf(s)),
                    h('b', { className: 'ft-preview-val', dir: 'ltr' }, compact(lat.value) + ' EGP')
                  ),
                  h('div', { className: 'ft-preview-row-center' },
                    band(s, lat),
                    h('strong', { className: 'ft-preview-badge', dir: 'ltr', style: { color: tone(lat.change) } }, signed(lat.change))
                  )
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
            renderHomeOwnershipWeb(topOwnershipLinks, ar, t),
            topEvents.length ? h('div', { className: 'ft-stake-feed' },
              topEvents.slice(0, 2).map(ev => {
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
    // The month the reader has picked out of the months chart, and the sector
    // they have picked out of the ownership ring. Both default to what the
    // published data ends on rather than to nothing, so the blocks below read
    // as a finished statement on first sight.
    const monthList = (d.monthly && d.monthly.months) || [];
    const month = monthList.some(m => m.month === st.flowMonth)
      ? st.flowMonth
      : (monthList.length ? monthList[monthList.length - 1].month : null);
    const ringFocus = st.flowRingSector || null;
    const monthMode = st.flowMonthView === 'sector' ? 'sector' : 'market';

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
        renderMonthsOfMoney(d, rows, selected, month, monthMode, ar, t,
          (m) => component.setState({ flowMonth: m }),
          (v) => component.setState({ flowMonthView: v })),
        renderRotation(d, rows, month, ar, t, openSector, selected && selected.id),
        renderSectorsInsideSectors(data.sectorOwnership, ar, t, ringFocus,
          (id) => component.setState({ flowRingSector: id }),
          (ticker) => component.setState({ screen: 'company', ticker })),
        renderSectorFlowMap(rows, selected, openSector, ar, t),
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
  // Its own document, loaded with the extras rather than behind this screen's
  // lazy fetch: 38 KB, and the only one that carries a person's name.
  const people = data.insiderPeople || null;
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
  const stakeHistory = ticker && investor ? [...stakeRows].reverse().map(r => ({ date: r.date, stake: r.ownershipAfterPercent })) : (profile?.stakeHistory || []);
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
    const hasShares = finite(r.shares) && r.shares > 0;
    const pct = r.referencePercent;
    const actual = finite(r.ownershipBeforePercent) && finite(r.ownershipAfterPercent);
    const dir = direction(r.action);
    const rel = ar ? (r.relationshipLabelAr || r.relationship) : (r.relationshipLabel || r.relationship);
    const partyName = ar ? (r.investorNameAr || r.investorName) : (r.investorName || r.investorNameAr);

    if (hasShares) {
      return h('article', { key: r.id, className: 'ft-event' },
        h('div', { className: 'ft-event-head' },
          h('time', null, r.date || t('Date not supplied', 'التاريخ غير متاح')),
          h('span', { className: 'ft-direction', style: { color: tone(dir) } }, actions[r.action] || r.actionLabel || t('Disclosure', 'إفصاح'))
        ),
        h('div', { className: 'ft-event-party' },
          h('button', {
            type: 'button',
            className: 'ft-company-link',
            disabled: !profiles[r.ticker],
            onClick: () => component.setState({ screen: 'company', ticker: r.ticker, companyPanel: 'filings' })
          }, r.ticker || r.company || '—'),
          h('span', { className: 'ft-party-label' }, partyName || (r.action?.startsWith('treasury_') ? t('Company treasury', 'خزينة الشركة') : t('Insider', 'داخلي'))),
          h('span', { className: 'ft-rel-pill' }, rel)
        ),
        h('div', { className: 'ft-event-numbers' },
          metric(
            actual ? t('Disclosed ownership', 'الملكية المفصح عنها') : t('Trade / current share capital', 'الصفقة / عدد الأسهم الحالي'),
            actual ? `${r.ownershipBeforePercent}% → ${r.ownershipAfterPercent}%` : finite(pct) ? pct.toFixed(4) + '%' : '—',
            actual ? t('Before → after', 'قبل ← بعد') : t('Reference scale, not ownership change', 'مقياس مرجعي، وليس تغير الملكية'),
            dir
          ),
          metric(t('At latest published price', 'بسعر السهم المنشور الأخير'), compact(r.currentMarkedValue) + ' ' + (p.currency || 'EGP'), p.date || ''),
          metric(t('Disclosed shares', 'الأسهم المفصح عنها'), compact(r.shares))
        ),
        h('div', { className: 'ft-stake-track', 'aria-hidden': 'true' },
          h('i', { style: { width: finite(pct) ? Math.min(100, Math.max(0, pct)) + '%' : '0%', background: tone(dir) } })
        ),
        h('small', { className: 'ft-note' }, t('Track is 0–100% of current shares. Marked value is not the execution amount.', 'الشريط من ٠–١٠٠٪ من الأسهم الحالية. القيمة بسعر اليوم ليست مبلغ التنفيذ.')),
        safeLink(r.link) ? h('a', { href: safeLink(r.link), target: '_blank', rel: 'noopener noreferrer', className: 'ft-source' }, t('Official disclosure ↗', 'الإفصاح الرسمي ↗')) : null
      );
    }

    const noticeTypeLabel = r.action === 'treasury_purchase'
      ? t('Treasury Purchase Notice', 'إخطار شراء أسهم خزينة')
      : r.action === 'treasury_sale'
        ? t('Treasury Sale Notice', 'إخطار بيع أسهم خزينة')
        : r.action === 'treasury_cancel'
          ? t('Treasury Cancellation Notice', 'إخطار إعدام أسهم خزينة')
          : (r.actionLabel || t('Regulatory Filing Notice', 'إخطار إفصاح رسمي'));

    return h('article', { key: r.id, className: 'ft-event ft-event-notice' },
      h('div', { className: 'ft-event-head' },
        h('time', null, r.date || t('Date not supplied', 'التاريخ غير متاح')),
        h('span', { className: 'ft-notice-badge' }, noticeTypeLabel)
      ),
      h('div', { className: 'ft-event-party' },
        h('button', {
          type: 'button',
          className: 'ft-company-link',
          disabled: !profiles[r.ticker],
          onClick: () => component.setState({ screen: 'company', ticker: r.ticker, companyPanel: 'filings' })
        }, r.ticker || r.company || '—'),
        h('span', { className: 'ft-party-label' }, partyName || (r.action?.startsWith('treasury_') ? t('Company treasury', 'خزينة الشركة') : t('Insider', 'داخلي'))),
        h('span', { className: 'ft-rel-pill' }, rel)
      ),
      h('div', { className: 'ft-notice-content' },
        h('div', { className: 'ft-notice-title' }, ar ? (r.title || r.titleEn) : (r.titleEn || r.title || noticeTypeLabel)),
        h('p', { className: 'ft-notice-callout' }, t(
          'Official market filing announcement. Execution tranches, prices, and volume details are contained in the published filing document.',
          'إفصاح رسمي منشور عبر البورصة المصرية. تفاصيل كميات التنفيذ والأسعار مدرجة بنص الإشعار الرسمي المرفق.'
        ))
      ),
      h('div', { className: 'ft-notice-footer' },
        h('span', { className: 'ft-filing-ref' }, t('Filing Ref: #', 'رقم الإفصاح: #') + (r.filingId || 'EGX')),
        safeLink(r.link) ? h('a', {
          href: safeLink(r.link),
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'ft-source-btn'
        }, t('Read Official EGX Filing ↗', 'الاطلاع على الإفصاح الرسمي ↗')) : null
      )
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
      // The picture, then the same facts as a list. The map answers "who is
      // around this company" at a glance; the list answers "what happened to
      // this person's stake", which a picture cannot say in numbers.
      renderOwnershipMap(people, ar, t, component),

      // This is the only place on the site that names a holder.
      renderNamedPeople(people, ar, t,
        tk => component.setState({ ownershipTicker: tk, ownershipInvestor: '', ownershipPage: 0 })),

      // The bipartite connection web stood here and is gone. It drew the same
      // three facts the list above states outright — who, which company, what
      // the stake did — as curved splines between two rails of boxes, and a
      // spline cannot say "2.61% to 7.96%". Its labels also grew out of the
      // panel in RTL, which is what sent me to read it; fixing them made it
      // legible without making it useful.
      // Temporal Stake % Progression Curve vs Share Price (Interactive Drawing)
      ticker && stakeHistory.length > 0 ? renderStakeProgressionCurve(stakeHistory, pricePoints, ticker, currency, ar, t) : null,
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
      stakeHistory.length > 1 && investor ? chart(stakeHistory, 'stake', t('Disclosed stake history · ', 'تاريخ الحصة المفصح عنها · ') + investor, v => v.toFixed(2) + '%', 'var(--accent)', true) : null,
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
