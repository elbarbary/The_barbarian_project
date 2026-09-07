/**
 * Sector Valuation & Debt Map Explorer
 * Plots P/E for all companies per sector with Debt-to-Equity factored in.
 * Offers two views:
 * 1. 2D Valuation vs. Leverage Matrix (Scatter/Bubble Plot: P/E vs. Debt/Equity)
 * 2. Debt-Adjusted Enterprise Valuation Ranking (EV / Net Profit Multiple)
 */
export function valuationExplorer(component, D, ar, React) {
  const st = component.state;
  const activeSector = st.valSector || 'All';
  const valView = st.valView || 'matrix'; // 'matrix' | 'ranking'
  const valSort = st.valSort || 'pe_adj'; // 'pe_adj' | 'pe' | 'de' | 'cap'

  const companies = D.companies || [];

  // Filter companies with measurable, positive P/E (filter out non-meaningful outliers > 120x for clean plotting)
  const measurable = companies.filter(c => {
    const pe = c.pe;
    return typeof pe === 'number' && Number.isFinite(pe) && pe > 0.5 && pe < 120;
  }).map(c => {
    const de = (c.ratios && typeof c.ratios.debt_equity === 'number' && Number.isFinite(c.ratios.debt_equity))
      ? Math.max(0, c.ratios.debt_equity)
      : 0;
    const pe = c.pe;
    const peAdj = Math.round(pe * (1 + de) * 10) / 10;
    const cap = c.cap || 0;
    const profit = c.profit || (c.cap && c.pe ? c.cap / c.pe / 1e6 : 0);

    return {
      ticker: c.ticker,
      name: component.nm(c.name),
      sector: c.sector,
      sectorAr: c.sectorAr || c.sector,
      close: c.close || 0,
      cap,
      profit,
      pe: Math.round(pe * 10) / 10,
      de: Math.round(de * 100) / 100,
      peAdj,
      go: () => component.setState({ screen: 'company', ticker: c.ticker })
    };
  });

  // Extract distinct sectors that have measurable companies
  const sectorCounts = new Map();
  measurable.forEach(c => {
    sectorCounts.set(c.sector, (sectorCounts.get(c.sector) || 0) + 1);
  });

  const availableSectors = Array.from(sectorCounts.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([sec]) => sec);

  // Filter by selected sector
  const filtered = activeSector === 'All'
    ? measurable
    : measurable.filter(c => c.sector === activeSector);

  // Sector Medians
  const peList = filtered.map(c => c.pe).sort((a, b) => a - b);
  const deList = filtered.map(c => c.de).sort((a, b) => a - b);
  const medianPe = peList.length ? peList[Math.floor(peList.length / 2)] : 10;
  const medianDe = deList.length ? deList[Math.floor(deList.length / 2)] : 1.0;

  // Classify quadrants
  const withQuadrant = filtered.map(c => {
    let q = 'safe_value';
    if (c.pe <= medianPe && c.de <= 1.0) q = 'safe_value';
    else if (c.pe <= medianPe && c.de > 1.0) q = 'leveraged_value';
    else if (c.pe > medianPe && c.de <= 1.0) q = 'quality_clean';
    else q = 'fragile_expensive';
    return { ...c, quadrant: q };
  });

  // Sort for ranking view
  const sorted = withQuadrant.slice().sort((a, b) => {
    if (valSort === 'pe_adj') return a.peAdj - b.peAdj;
    if (valSort === 'pe') return a.pe - b.pe;
    if (valSort === 'de') return a.de - b.de;
    return b.cap - a.cap;
  });

  // Counts
  const countSafeValue = withQuadrant.filter(c => c.quadrant === 'safe_value').length;
  const countLeveragedValue = withQuadrant.filter(c => c.quadrant === 'leveraged_value').length;
  const countQualityClean = withQuadrant.filter(c => c.quadrant === 'quality_clean').length;
  const countFragile = withQuadrant.filter(c => c.quadrant === 'fragile_expensive').length;

  // ── Build 2D Bubble Matrix SVG ──
  const W = 1000;
  const H = 480;
  const padL = 60;
  const padR = 30;
  const padT = 30;
  const padB = 45;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // Max bounds
  const maxPe = Math.min(50, Math.max(30, ...filtered.map(c => c.pe)) * 1.1);
  const maxDe = Math.min(8.0, Math.max(3.0, ...filtered.map(c => c.de)) * 1.15);

  const getX = (pe) => padL + (Math.min(pe, maxPe) / maxPe) * innerW;
  const getY = (de) => padT + (1 - Math.min(de, maxDe) / maxDe) * innerH;

  const medianX = getX(medianPe);
  const deThresholdY = getY(1.0); // 1.0 D/E threshold line

  // Max Cap for bubble sizing (clamp 5px to 22px)
  const maxCap = Math.max(1, ...filtered.map(c => c.cap));
  const getRadius = (cap) => {
    const norm = Math.sqrt(Math.max(0, cap) / maxCap);
    return Math.max(5.5, Math.min(22, 5.5 + norm * 16.5));
  };

  let matrixNode = null;
  if (filtered.length > 0) {
    const bubbles = withQuadrant.map((c, i) => {
      const cx = getX(c.pe);
      const cy = getY(c.de);
      const r = getRadius(c.cap);

      let color = 'var(--up)';
      if (c.quadrant === 'leveraged_value') color = '#E69F00';
      else if (c.quadrant === 'quality_clean') color = 'var(--iris)';
      else if (c.quadrant === 'fragile_expensive') color = 'var(--down)';

      return [
        React.createElement('circle', {
          key: `b_${i}`,
          cx, cy, r,
          fill: color,
          fillOpacity: 0.72,
          stroke: 'var(--surface)',
          strokeWidth: 1.5,
          style: { cursor: 'pointer', transition: 'transform .15s' }
        }),
        React.createElement('text', {
          key: `bt_${i}`,
          x: cx,
          y: cy - r - 4,
          textAnchor: 'middle',
          fill: 'var(--ink)',
          fontSize: 11.5,
          fontWeight: 600,
          fontFamily: 'monospace'
        }, c.ticker)
      ];
    }).flat();

    const matrixElements = [
      // Quadrant background tints
      // Bottom-Left: Safe Value (Green Tint)
      React.createElement('rect', {
        x: padL, y: deThresholdY,
        width: Math.max(0, medianX - padL), height: Math.max(0, (padT + innerH) - deThresholdY),
        fill: 'var(--up)', fillOpacity: 0.04, rx: 6
      }),
      // Top-Left: Leveraged Value (Amber Tint)
      React.createElement('rect', {
        x: padL, y: padT,
        width: Math.max(0, medianX - padL), height: Math.max(0, deThresholdY - padT),
        fill: '#E69F00', fillOpacity: 0.04, rx: 6
      }),
      // Bottom-Right: Quality Clean (Blue/Iris Tint)
      React.createElement('rect', {
        x: medianX, y: deThresholdY,
        width: Math.max(0, (padL + innerW) - medianX), height: Math.max(0, (padT + innerH) - deThresholdY),
        fill: 'var(--iris)', fillOpacity: 0.04, rx: 6
      }),
      // Top-Right: Fragile Expensive (Red Tint)
      React.createElement('rect', {
        x: medianX, y: padT,
        width: Math.max(0, (padL + innerW) - medianX), height: Math.max(0, deThresholdY - padT),
        fill: 'var(--down)', fillOpacity: 0.04, rx: 6
      }),

      // Quadrant Dividing Lines
      React.createElement('line', {
        x1: medianX, y1: padT, x2: medianX, y2: padT + innerH,
        stroke: 'var(--rule)', strokeWidth: 1.6, strokeDasharray: '4 4'
      }),
      React.createElement('line', {
        x1: padL, y1: deThresholdY, x2: padL + innerW, y2: deThresholdY,
        stroke: 'var(--rule)', strokeWidth: 1.6, strokeDasharray: '4 4'
      }),

      // Quadrant Watermark Labels
      React.createElement('text', {
        x: padL + 12, y: padT + innerH - 12,
        textAnchor: 'start', fill: 'var(--up)', fontSize: 12, fontWeight: 600, opacity: 0.85
      }, ar ? '🟢 قيمة حقيقية (مكرر منخفض وديون آمنة)' : '🟢 Deep Value (Low P/E & Safe Debt)'),

      React.createElement('text', {
        x: padL + 12, y: padT + 22,
        textAnchor: 'start', fill: '#C97D00', fontSize: 12, fontWeight: 600, opacity: 0.85
      }, ar ? '🟡 قيمة مثقلة بالديون (مخاطر فخ القيمة)' : '🟡 Leveraged Value (Value Trap Risk)'),

      React.createElement('text', {
        x: padL + innerW - 12, y: padT + innerH - 12,
        textAnchor: 'end', fill: 'var(--iris)', fontSize: 12, fontWeight: 600, opacity: 0.85
      }, ar ? '🔵 نمو وجودة بميزانية حصينة' : '🔵 Quality Compounders (Clean Debt)'),

      React.createElement('text', {
        x: padL + innerW - 12, y: padT + 22,
        textAnchor: 'end', fill: 'var(--down)', fontSize: 12, fontWeight: 600, opacity: 0.85
      }, ar ? '🔴 تقييم متضخم وديون مرتفعة' : '🔴 Fragile & Stretched (High P/E & Debt)'),

      // Threshold annotation labels
      React.createElement('text', {
        x: medianX + 6, y: padT + 12,
        textAnchor: 'start', fill: 'var(--faint)', fontSize: 10, fontFamily: 'monospace'
      }, `${ar ? 'وسيط P/E' : 'Median P/E'}: ${medianPe}x`),

      React.createElement('text', {
        x: padL + innerW - 6, y: deThresholdY - 6,
        textAnchor: 'end', fill: 'var(--faint)', fontSize: 10, fontFamily: 'monospace'
      }, `${ar ? 'حد الدين الآمن' : 'Safe Debt Ceiling'}: 1.0x D/E`),

      // Bubbles
      ...bubbles,

      // Axis Ticks & Titles
      React.createElement('text', {
        x: padL, y: H - 12,
        textAnchor: 'start', fill: 'var(--faint)', fontSize: 11, fontFamily: 'monospace'
      }, '0x P/E'),
      React.createElement('text', {
        x: padL + innerW / 2, y: H - 12,
        textAnchor: 'middle', fill: 'var(--t2)', fontSize: 12, fontWeight: 500
      }, ar ? 'مكرر الربحية (P/E) ← الأغلى يميناً' : 'P/E Multiple (Valuation) →'),
      React.createElement('text', {
        x: padL + innerW, y: H - 12,
        textAnchor: 'end', fill: 'var(--faint)', fontSize: 11, fontFamily: 'monospace'
      }, `${Math.round(maxPe)}x P/E`),

      React.createElement('text', {
        x: padL - 8, y: padT + innerH + 4,
        textAnchor: 'end', fill: 'var(--faint)', fontSize: 10.5, fontFamily: 'monospace'
      }, '0.0x'),
      React.createElement('text', {
        x: padL - 8, y: padT + 12,
        textAnchor: 'end', fill: 'var(--faint)', fontSize: 10.5, fontFamily: 'monospace'
      }, `${maxDe.toFixed(1)}x D/E`)
    ];

    matrixNode = React.createElement('svg', {
      viewBox: `0 0 ${W} ${H}`,
      style: { width: '100%', height: 'auto', display: 'block', maxHeight: '480px', direction: 'ltr' }
    }, ...matrixElements);
  }

  // ── Build Debt-Adjusted Ranking Bar Chart ──
  const barTop = sorted.slice(0, 16);
  const maxAdj = Math.max(1, ...barTop.map(c => c.peAdj));
  const BH = Math.max(300, barTop.length * 36 + 40);

  const rankingBars = barTop.map((c, i) => {
    const y = 30 + i * 36;
    const barWMax = 420;
    const baseW = (c.pe / maxAdj) * barWMax;
    const adjW = (c.peAdj / maxAdj) * barWMax;
    const debtW = Math.max(0, adjW - baseW);

    return [
      // Company Label
      React.createElement('text', {
        key: `rt_${i}`,
        x: 10, y: y + 16,
        fill: 'var(--ink)', fontSize: 13, fontWeight: 600, fontFamily: 'monospace'
      }, c.ticker),
      React.createElement('text', {
        key: `rn_${i}`,
        x: 68, y: y + 16,
        fill: 'var(--t2)', fontSize: 12
      }, c.name.length > 18 ? c.name.slice(0, 18) + '…' : c.name),
      // Track Background
      React.createElement('rect', {
        key: `rbg_${i}`,
        x: 210, y: y + 4, width: barWMax, height: 18,
        fill: 'var(--sunk)', rx: 4
      }),
      // Solid Equity PE bar
      React.createElement('rect', {
        key: `rb_${i}`,
        x: 210, y: y + 4, width: baseW, height: 18,
        fill: 'var(--accent)', rx: 4
      }),
      // Stacked Debt Burden extension bar
      React.createElement('rect', {
        key: `rd_${i}`,
        x: 210 + baseW, y: y + 4, width: debtW, height: 18,
        fill: '#E69F00', fillOpacity: 0.65, rx: 4
      }),
      // Values label
      React.createElement('text', {
        key: `rv_${i}`,
        x: 210 + adjW + 10, y: y + 17,
        fill: 'var(--ink)', fontSize: 11.5, fontWeight: 600, fontFamily: 'monospace'
      }, `${c.peAdj}x ${ar ? 'معدل' : 'adj'} (${c.pe}x + ${c.de}x D/E)`)
    ];
  }).flat();

  const rankingNode = React.createElement('svg', {
    viewBox: `0 0 ${W} ${BH}`,
    style: { width: '100%', height: 'auto', display: 'block', direction: 'ltr' }
  }, ...rankingBars);

  return {
    title: ar ? 'خريطة التقييم والديون حسب القطاع' : 'Sector Valuation & Debt Map',
    lead: ar
      ? 'مضاعف الربحية (P/E) يسعّر حقوق الملكية فقط ويتجاهل ديون الشركة. توضح هذه الخريطة موقع كل شركة عند دمج حجم الرافعة المالية، لتفريق القيمة الحقيقية عن فخاخ الديون.'
      : 'Standard P/E only prices equity, ignoring corporate borrowings. This map factors debt-to-equity leverage into earnings multiples to separate genuine bargains from debt traps.',
    activeSector,
    sectorLabel: activeSector === 'All' ? (ar ? 'جميع القطاعات' : 'All Sectors') : activeSector,
    sectors: [
      { id: 'All', label: ar ? 'جميع القطاعات' : 'All Sectors', selected: activeSector === 'All', go: () => component.setState({ valSector: 'All' }) },
      ...availableSectors.map(s => ({
        id: s,
        label: s,
        selected: s === activeSector,
        go: () => component.setState({ valSector: s })
      }))
    ],
    views: [
      { id: 'matrix', label: ar ? 'مصفوفة التقييم والرافعة (2D)' : '2D Matrix (P/E vs Debt)', selected: valView === 'matrix', go: () => component.setState({ valView: 'matrix' }) },
      { id: 'ranking', label: ar ? 'ترتيب المضاعف المعدل بالديون' : 'Debt-Adjusted EV Multiple', selected: valView === 'ranking', go: () => component.setState({ valView: 'ranking' }) }
    ],
    isMatrix: valView === 'matrix',
    isRanking: valView === 'ranking',
    matrixNode,
    rankingNode,
    totalCount: filtered.length,
    countSafeValue,
    countLeveragedValue,
    countQualityClean,
    countFragile,
    safeLabel: ar ? 'آمنة' : 'Safe',
    leveragedLabel: ar ? 'رافعة' : 'Leveraged',
    qualityLabel: ar ? 'جودة' : 'Quality',
    fragileLabel: ar ? 'مخاطر' : 'Fragile',
    matrixFootnote1: ar
      ? 'مساحة كل فقاعة تمثل القيمة السوقية. اضغط على أي شركة للانتقال إلى شاشتها.'
      : 'Bubble area represents Market Capitalization. Click any company to view details.',
    matrixFootnote2: ar
      ? `وسيط P/E للقطاع: ${medianPe}x · وسيط الديون/الملكية: ${medianDe}x`
      : `Median Sector P/E: ${medianPe}x · Median Sector D/E: ${medianDe}x`,
    rankingFootnote: ar
      ? 'الشريط الأزرق يمثل مكرر ربحية حقوق الملكية. الجزء البرتقالي يوضح تضخم المضاعف بسبب عبء الديون: EV Multiple ≈ P/E × (1 + D/E).'
      : 'Solid blue represents Equity P/E multiple. Orange segment represents EV multiple expansion due to Debt-to-Equity load: EV Multiple ≈ P/E × (1 + D/E).',
    companiesBreakdownTitle: ar
      ? `تفاصيل شركات ${activeSector === 'All' ? 'جميع القطاعات' : activeSector}`
      : `${activeSector === 'All' ? 'All Sectors' : activeSector} Companies Breakdown`,
    trackedCountText: ar
      ? `${filtered.length} شركة مدرجة`
      : `${filtered.length} tracked`,
    medianPe: `${medianPe}x`,
    medianDe: `${medianDe}x`,
    companies: sorted.map(c => ({
      ...c,
      capText: `${component.num(c.cap / 1e9, 2)}B`,
      profitText: `${component.num(c.profit, 1)}M`,
      peText: `${c.pe}x`,
      deText: `${c.de}x`,
      peAdjText: `${c.peAdj}x`,
      badgeColor: c.quadrant === 'safe_value' ? 'var(--up)' : c.quadrant === 'leveraged_value' ? '#E69F00' : c.quadrant === 'quality_clean' ? 'var(--iris)' : 'var(--down)',
      badgeBg: c.quadrant === 'safe_value' ? 'var(--upTint)' : c.quadrant === 'leveraged_value' ? 'rgba(230,159,0,0.12)' : c.quadrant === 'quality_clean' ? 'var(--irisTint)' : 'var(--downTint)',
      badgeLabel: c.quadrant === 'safe_value' ? (ar ? 'قيمة آمنة' : 'Safe Value') : c.quadrant === 'leveraged_value' ? (ar ? 'رافعة مرتفعة' : 'Leveraged') : c.quadrant === 'quality_clean' ? (ar ? 'جودة حصينة' : 'Quality') : (ar ? 'مخاطر مضاعفة' : 'Fragile')
    }))
  };
}
