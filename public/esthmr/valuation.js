/**
 * Sector Valuation & Debt Map Explorer
 * Plots P/E for all companies per sector with Debt-to-Equity factored in.
 * Offers two views:
 * 1. 2D Valuation vs. Leverage Matrix (Scatter/Bubble Plot: P/E vs. Debt/Equity)
 * 2. Debt-Adjusted Enterprise Valuation Ranking (EV / Net Profit Multiple)
 * Enhanced with interactive Zoom & Detail Controls, crisp SVG coordinate scaling,
 * dynamic gridlines, anti-collision map-pin labels, and an interactive Inspector HUD.
 */
export function valuationExplorer(component, D, ar, React) {
  const st = component.state;
  const activeSector = st.valSector || 'All';
  const valView = st.valView || 'matrix'; // 'matrix' | 'ranking'
  const valSort = st.valSort || 'pe_adj'; // 'pe_adj' | 'pe' | 'de' | 'cap'

  // Zoom & Pan state
  const zoom = Math.max(1, Math.min(4, typeof st.valZoom === 'number' ? st.valZoom : (parseFloat(st.valZoom) || 1.0)));
  const panX = Math.max(0, Math.min(1, typeof st.valPanX === 'number' ? st.valPanX : (parseFloat(st.valPanX) || 0.0)));
  const selectedTicker = st.valSelectedTicker || null;

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

  // ── Build 2D Bubble Matrix SVG with Dynamic Zoom & Detail ──
  const W = 1000;
  const H = 500;
  const padL = 65;
  const padR = 30;
  const padT = 35;
  const padB = 48;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // Full Market Outer Bounds
  const baseMaxPe = Math.min(50, Math.max(30, ...filtered.map(c => c.pe)) * 1.1);
  const baseMaxDe = Math.min(8.0, Math.max(3.0, ...filtered.map(c => c.de)) * 1.15);

  // Dynamic visible span based on Zoom
  const spanPe = baseMaxPe / zoom;
  const spanDe = baseMaxDe / zoom;

  // Window bounds based on panX
  const maxPanPe = Math.max(0, baseMaxPe - spanPe);
  const minPe = Math.round(maxPanPe * panX * 10) / 10;
  const maxPe = Math.round((minPe + spanPe) * 10) / 10;

  const minDe = 0;
  const maxDe = Math.round(spanDe * 10) / 10;

  // Companies currently in visible window
  const inViewCompanies = withQuadrant.filter(c => c.pe >= minPe && c.pe <= maxPe && c.de >= minDe && c.de <= maxDe);
  const outliersRight = withQuadrant.filter(c => c.pe > maxPe).length;
  const outliersTop = withQuadrant.filter(c => c.de > maxDe).length;

  const getX = (pe) => padL + Math.max(0, Math.min(1, (pe - minPe) / spanPe)) * innerW;
  const getY = (de) => padT + (1 - Math.max(0, Math.min(1, (de - minDe) / spanDe))) * innerH;

  const medianClampedX = Math.max(padL, Math.min(padL + innerW, getX(medianPe)));
  const thresholdClampedY = Math.max(padT, Math.min(padT + innerH, getY(1.0)));

  const leftW = Math.max(0, medianClampedX - padL);
  const rightW = Math.max(0, (padL + innerW) - medianClampedX);
  const topH = Math.max(0, thresholdClampedY - padT);
  const bottomH = Math.max(0, (padT + innerH) - thresholdClampedY);

  // Dynamic Ticks for X and Y Grid
  let peStep = 10;
  if (spanPe <= 12) peStep = 2;
  else if (spanPe <= 22) peStep = 4;
  else if (spanPe <= 32) peStep = 5;

  const startTickPe = Math.ceil(minPe / peStep) * peStep;
  const endTickPe = Math.floor(maxPe / peStep) * peStep;
  const peTicks = [];
  for (let t = startTickPe; t <= endTickPe; t += peStep) {
    if (t >= minPe && t <= maxPe) peTicks.push(t);
  }

  let deStep = 1.0;
  if (spanDe <= 1.5) deStep = 0.25;
  else if (spanDe <= 3.0) deStep = 0.5;
  else if (spanDe <= 5.0) deStep = 1.0;

  const startTickDe = Math.ceil(minDe / deStep) * deStep;
  const endTickDe = Math.floor(maxDe / deStep) * deStep;
  const deTicks = [];
  for (let t = startTickDe; t <= endTickDe; t += deStep) {
    if (t >= minDe && t <= maxDe) deTicks.push(t);
  }

  const gridElements = [
    ...peTicks.map((t, idx) => {
      const xPos = getX(t);
      return [
        React.createElement('line', {
          key: `x_grid_${idx}`,
          x1: xPos, y1: padT, x2: xPos, y2: padT + innerH,
          stroke: 'var(--rule2)', strokeWidth: 1, strokeDasharray: '3 3'
        }),
        React.createElement('text', {
          key: `x_tick_${idx}`,
          x: xPos, y: H - 12,
          textAnchor: 'middle', fill: 'var(--faint)', fontSize: 10.5, fontFamily: 'monospace'
        }, `${t}x`)
      ];
    }).flat(),
    ...deTicks.map((t, idx) => {
      const yPos = getY(t);
      return [
        React.createElement('line', {
          key: `y_grid_${idx}`,
          x1: padL, y1: yPos, x2: padL + innerW, y2: yPos,
          stroke: 'var(--rule2)', strokeWidth: 1, strokeDasharray: '3 3'
        }),
        React.createElement('text', {
          key: `y_tick_${idx}`,
          x: padL - 8, y: yPos + 4,
          textAnchor: 'end', fill: 'var(--faint)', fontSize: 10.5, fontFamily: 'monospace'
        }, `${t.toFixed(1)}x`)
      ];
    }).flat()
  ];

  // Max Cap for bubble sizing (clamp 5.5px to 26px)
  const maxCap = Math.max(1, ...filtered.map(c => c.cap));
  const getRadius = (cap) => {
    const norm = Math.sqrt(Math.max(0, cap) / maxCap);
    const baseR = 5.5;
    const maxR = 22;
    return Math.max(baseR, Math.min(maxR, baseR + norm * (maxR - baseR)));
  };

  // Label collision guard
  const topCapThreshold = zoom >= 2.0 ? 0 : zoom >= 1.5 ? 55 : 30;
  const topCapTickers = new Set(
    inViewCompanies.slice().sort((a, b) => b.cap - a.cap).slice(0, topCapThreshold).map(c => c.ticker)
  );

  let matrixNode = null;
  if (filtered.length > 0) {
    const bubbles = inViewCompanies.map((c, i) => {
      const cx = getX(c.pe);
      const cy = getY(c.de);
      const r = getRadius(c.cap);

      let color = 'var(--up)';
      if (c.quadrant === 'leveraged_value') color = '#E69F00';
      else if (c.quadrant === 'quality_clean') color = 'var(--iris)';
      else if (c.quadrant === 'fragile_expensive') color = 'var(--down)';

      const isSelected = selectedTicker === c.ticker;
      const showLabel = isSelected || topCapTickers.has(c.ticker) || zoom >= 2.0;

      const pillW = Math.max(34, c.ticker.length * 7.5 + 8);
      const pillH = 16;
      const pillX = cx - pillW / 2;
      const pillY = (cy - r - 17 < padT + 2) ? cy + r + 4 : cy - r - 17;

      return React.createElement('g', {
        key: `bubble_g_${i}`,
        'data-valuation-point': `${cx},${cy}`,
        'data-company-name': c.name,
        onClick: (e) => {
          if (e && e.stopPropagation) e.stopPropagation();
          component.setState({ valSelectedTicker: isSelected ? null : c.ticker });
        },
        style: { cursor: 'pointer' }
      }, [
        React.createElement('circle', {
          key: `b_${i}`,
          cx, cy, r,
          fill: color,
          fillOpacity: isSelected ? 0.96 : (selectedTicker ? 0.35 : 0.76),
          stroke: isSelected ? 'var(--accent)' : 'var(--surface)',
          strokeWidth: isSelected ? 3.5 : 1.5,
          style: { transition: 'all .15s' }
        }),
        isSelected ? React.createElement('circle', {
          key: `b_ring_${i}`,
          cx, cy, r: r + 5.5,
          fill: 'none',
          stroke: 'var(--accent)',
          strokeWidth: 1.5,
          strokeDasharray: '3 3',
          opacity: 0.9
        }) : null,
        React.createElement('rect', {
          key: `bl_bg_${i}`,
          'data-point-label': 'true',
          style: { display: showLabel ? '' : 'none' },
          x: pillX,
          y: pillY,
          width: pillW,
          height: pillH,
          rx: 4,
          fill: isSelected ? 'var(--accent)' : 'var(--surface)',
          fillOpacity: isSelected ? 0.96 : 0.92,
          stroke: isSelected ? 'var(--accent)' : 'var(--rule2)',
          strokeWidth: 0.8
        }),
        React.createElement('text', {
          key: `bt_${i}`,
          'data-point-label': 'true',
          style: { display: showLabel ? '' : 'none' },
          x: cx,
          y: pillY + 11.5,
          textAnchor: 'middle',
          fill: isSelected ? 'var(--surface)' : 'var(--ink)',
          fontSize: 10,
          fontWeight: 600,
          fontFamily: 'monospace'
        }, c.ticker),
        React.createElement('title', {}, `${c.ticker} · ${c.name} · P/E ${c.pe}x · D/E ${c.de}x`),
        (showLabel && zoom >= 2.5 && cy + r + 24 <= padT + innerH) ? React.createElement('text', {
          key: `bpe_${i}`,
          'data-point-detail': 'true',
          x: cx,
          y: cy + r + 12,
          textAnchor: 'middle',
          fill: 'var(--t2)',
          fontSize: 9.5,
          fontWeight: 500,
          fontFamily: 'monospace'
        }, c.name) : null
      ]);
    });

    const matrixElements = [
      // Background click-to-deselect area
      React.createElement('rect', {
        x: padL, y: padT, width: innerW, height: innerH,
        fill: 'var(--sunk)', fillOpacity: 0.35, rx: 8,
        onClick: () => {
          if (selectedTicker) component.setState({ valSelectedTicker: null });
        },
        style: { cursor: 'default' }
      }),

      // Quadrant background tints
      // Bottom-Left: Safe Value (Green Tint)
      leftW > 0 && bottomH > 0 ? React.createElement('rect', {
        x: padL, y: thresholdClampedY,
        width: leftW, height: bottomH,
        fill: 'var(--up)', fillOpacity: 0.045, rx: 6
      }) : null,
      // Top-Left: Leveraged Value (Amber Tint)
      leftW > 0 && topH > 0 ? React.createElement('rect', {
        x: padL, y: padT,
        width: leftW, height: topH,
        fill: '#E69F00', fillOpacity: 0.045, rx: 6
      }) : null,
      // Bottom-Right: Quality Clean (Blue/Iris Tint)
      rightW > 0 && bottomH > 0 ? React.createElement('rect', {
        x: medianClampedX, y: thresholdClampedY,
        width: rightW, height: bottomH,
        fill: 'var(--iris)', fillOpacity: 0.045, rx: 6
      }) : null,
      // Top-Right: Fragile Expensive (Red Tint)
      rightW > 0 && topH > 0 ? React.createElement('rect', {
        x: medianClampedX, y: padT,
        width: rightW, height: topH,
        fill: 'var(--down)', fillOpacity: 0.045, rx: 6
      }) : null,

      // Dynamic Grid Lines
      ...gridElements,

      // Quadrant Dividing Lines
      (medianPe >= minPe && medianPe <= maxPe) ? React.createElement('line', {
        x1: medianClampedX, y1: padT, x2: medianClampedX, y2: padT + innerH,
        stroke: 'var(--rule)', strokeWidth: 1.6, strokeDasharray: '4 4'
      }) : null,
      (1.0 >= minDe && 1.0 <= maxDe) ? React.createElement('line', {
        x1: padL, y1: thresholdClampedY, x2: padL + innerW, y2: thresholdClampedY,
        stroke: 'var(--rule)', strokeWidth: 1.6, strokeDasharray: '4 4'
      }) : null,

      // Adaptive Quadrant Watermark Labels (only if box is spacious)
      (leftW > 140 && bottomH > 40) ? React.createElement('text', {
        x: padL + 12, y: padT + innerH - 12,
        textAnchor: 'start', fill: 'var(--up)', fontSize: 11.5, fontWeight: 600, opacity: 0.85
      }, ar ? '🟢 قيمة حقيقية (مكرر منخفض وديون آمنة)' : '🟢 Deep Value (Low P/E & Safe Debt)') : null,

      (leftW > 140 && topH > 40) ? React.createElement('text', {
        x: padL + 12, y: padT + 22,
        textAnchor: 'start', fill: '#C97D00', fontSize: 11.5, fontWeight: 600, opacity: 0.85
      }, ar ? '🟡 قيمة مثقلة بالديون (مخاطر فخ القيمة)' : '🟡 Leveraged Value (Value Trap Risk)') : null,

      (rightW > 140 && bottomH > 40) ? React.createElement('text', {
        x: padL + innerW - 12, y: padT + innerH - 12,
        textAnchor: 'end', fill: 'var(--iris)', fontSize: 11.5, fontWeight: 600, opacity: 0.85
      }, ar ? '🔵 نمو وجودة بميزانية حصينة' : '🔵 Quality Compounders (Clean Debt)') : null,

      (rightW > 140 && topH > 40) ? React.createElement('text', {
        x: padL + innerW - 12, y: padT + 22,
        textAnchor: 'end', fill: 'var(--down)', fontSize: 11.5, fontWeight: 600, opacity: 0.85
      }, ar ? '🔴 تقييم متضخم وديون مرتفعة' : '🔴 Fragile & Stretched (High P/E & Debt)') : null,

      // Threshold annotation labels
      (medianPe >= minPe && medianPe <= maxPe) ? React.createElement('text', {
        x: medianClampedX + 6, y: padT + 12,
        textAnchor: 'start', fill: 'var(--faint)', fontSize: 10, fontFamily: 'monospace'
      }, `${ar ? 'وسيط P/E' : 'Median P/E'}: ${medianPe}x`) : null,

      (1.0 >= minDe && 1.0 <= maxDe && thresholdClampedY > padT + 20) ? React.createElement('text', {
        x: padL + innerW - 6, y: thresholdClampedY - 6,
        textAnchor: 'end', fill: 'var(--faint)', fontSize: 10, fontFamily: 'monospace'
      }, `${ar ? 'حد الدين الآمن' : 'Safe Debt Ceiling'}: 1.0x D/E`) : null,

      // Bubbles
      ...bubbles,

      // Axis Titles
      React.createElement('text', {
        x: padL + innerW / 2, y: H - 12,
        textAnchor: 'middle', fill: 'var(--t2)', fontSize: 12, fontWeight: 500
      }, ar ? 'مكرر الربحية (P/E) ← الأغلى يميناً' : 'P/E Multiple (Valuation) →'),

      React.createElement('text', {
        x: padL - 6, y: padT - 10,
        textAnchor: 'end', fill: 'var(--faint)', fontSize: 10, fontFamily: 'monospace', fontWeight: 600
      }, 'D/E')
    ].filter(Boolean);

    matrixNode = React.createElement('svg', {
      viewBox: `0 0 ${W} ${H}`,
      style: { width: '100%', height: 'auto', display: 'block', maxHeight: '500px', direction: 'ltr', shapeRendering: 'geometricPrecision', textRendering: 'geometricPrecision' }
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
      React.createElement('rect', {
        key: `rbg_${i}`,
        x: 210, y: y + 4, width: barWMax, height: 18,
        fill: 'var(--sunk)', rx: 4
      }),
      React.createElement('rect', {
        key: `rb_${i}`,
        x: 210, y: y + 4, width: baseW, height: 18,
        fill: 'var(--accent)', rx: 4
      }),
      React.createElement('rect', {
        key: `rd_${i}`,
        x: 210 + baseW, y: y + 4, width: debtW, height: 18,
        fill: '#E69F00', fillOpacity: 0.65, rx: 4
      }),
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

  // Selected Company Inspector Card HUD
  let selectedCompany = null;
  if (selectedTicker) {
    const found = measurable.find(c => c.ticker === selectedTicker);
    if (found) {
      selectedCompany = {
        ...found,
        capText: `${component.num(found.cap / 1e9, 2)}B EGP`,
        profitText: `${component.num(found.profit, 1)}M EGP`,
        peText: `${found.pe}x`,
        deText: `${found.de}x`,
        peAdjText: `${found.peAdj}x`,
        badgeColor: found.quadrant === 'safe_value' ? 'var(--up)' : found.quadrant === 'leveraged_value' ? '#E69F00' : found.quadrant === 'quality_clean' ? 'var(--iris)' : 'var(--down)',
        badgeBg: found.quadrant === 'safe_value' ? 'var(--upTint)' : found.quadrant === 'leveraged_value' ? 'rgba(230,159,0,0.12)' : found.quadrant === 'quality_clean' ? 'var(--irisTint)' : 'var(--downTint)',
        badgeLabel: found.quadrant === 'safe_value' ? (ar ? 'قيمة حقيقية آمنة' : 'Safe Deep Value') : found.quadrant === 'leveraged_value' ? (ar ? 'رافعة مالية مرتفعة' : 'Leveraged Value Trap') : found.quadrant === 'quality_clean' ? (ar ? 'نمو بميزانية حصينة' : 'Quality Compounder') : (ar ? 'تقييم متضخم وديون مرتفعة' : 'Fragile & Stretched'),
        explanation: found.quadrant === 'safe_value'
          ? (ar ? 'مكرر ربحية مغرٍ مع ميزانية خالية من أعباء الديون، مما يمنح المستثمر هامش أمان متين.' : 'Trades at an attractive earnings multiple backed by conservative leverage and clean balance sheet.')
          : found.quadrant === 'leveraged_value'
          ? (ar ? 'يبدو السهم رخيصاً بمكرر الربحية المجرد، لكن الديون الضخمة ترفع المضاعف الفعلي ومخاطر خدمة الدين.' : 'Looks cheap on equity P/E alone, but significant debt raises enterprise cost and financing sensitivity.')
          : found.quadrant === 'quality_clean'
          ? (ar ? 'مكرر ربحية فوق المتوسط يعكس تسعيراً لجودة الشركة وقوتها التسعيرية دون مخاطر ديون.' : 'Commands a quality valuation premium supported by robust cash flows and negligible balance sheet debt.')
          : (ar ? 'تقييم متضخم مصحوباً بعبء مديونية ثقيل؛ الشركة تفتقر لهامش الأمان من الجانبين.' : 'High valuation multiple paired with heavy borrowing; lacks fundamental margin of safety.'),
        closeCompany: () => component.setState({ valSelectedTicker: null }),
        goToCompany: () => component.setState({ screen: 'company', ticker: found.ticker })
      };
    }
  }

  // Zoom Presets
  const zoomPresets = [
    {
      id: 'all',
      label: ar ? '١٫٠× السوق بالكامل' : '1.0x Full Market',
      selected: zoom === 1.0 && panX === 0,
      go: () => component.setState({ valZoom: 1.0, valPanX: 0.0 })
    },
    {
      id: 'core',
      label: ar ? '٢٫٠× العنقود الأساسي' : '2.0x Core Cluster',
      selected: zoom === 2.0 && panX === 0,
      go: () => component.setState({ valZoom: 2.0, valPanX: 0.0 })
    },
    {
      id: 'deep_value',
      label: ar ? '٣٫٥× قيمة عميقة' : '3.5x Deep Value',
      selected: zoom === 3.5 && panX === 0,
      go: () => component.setState({ valZoom: 3.5, valPanX: 0.0 })
    },
    {
      id: 'quality',
      label: ar ? '٢٫٠× شركات النمو' : '2.0x Growth & Quality',
      selected: zoom === 2.0 && panX > 0.3,
      go: () => component.setState({ valZoom: 2.0, valPanX: 0.5 })
    }
  ];

  return {
    title: ar ? 'خريطة التقييم والديون حسب القطاع' : 'Sector Valuation & Debt Map',
    lead: ar
      ? 'مضاعف الربحية (P/E) يسعّر حقوق الملكية فقط ويتجاهل ديون الشركة. توضح هذه الخريطة موقع كل شركة عند دمج حجم الرافعة المالية، لتفريق القيمة الحقيقية عن فخاخ الديون.'
      : 'Standard P/E only prices equity, ignoring corporate borrowings. This map factors debt-to-equity leverage into earnings multiples to separate genuine bargains from debt traps.',
    activeSector,
    sectorLabel: activeSector === 'All' ? (ar ? 'جميع القطاعات' : 'All Sectors') : activeSector,
    sectors: [
      { id: 'All', label: ar ? 'جميع القطاعات' : 'All Sectors', selected: activeSector === 'All', go: () => component.setState({ valSector: 'All', valSelectedTicker: null }) },
      ...availableSectors.map(s => ({
        id: s,
        label: s,
        selected: s === activeSector,
        go: () => component.setState({ valSector: s, valSelectedTicker: null })
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

    // Zoom & Pan Tools
    zoomLevel: zoom,
    zoomText: `${zoom.toFixed(1)}x`,
    panX,
    hasPan: zoom > 1.15,
    peRangeLabel: `${minPe.toFixed(1)}x – ${maxPe.toFixed(1)}x P/E`,
    inViewCountText: ar ? `${inViewCompanies.length} شركة في هذا الإطار` : `${inViewCompanies.length} in view`,
    outliersText: (outliersRight > 0 || outliersTop > 0)
      ? (ar ? `(خارج الإطار: ${outliersRight} بمكرر أعلى، ${outliersTop} بديون أعلى)` : `(${outliersRight} higher P/E outliers, ${outliersTop} higher debt)`)
      : '',
    canReset: zoom > 1.0 || panX > 0.05 || Boolean(selectedTicker),
    onZoomChange: (e) => {
      const val = parseFloat(e && e.target ? e.target.value : e) || 1.0;
      component.setState({ valZoom: Math.max(1, Math.min(4, Math.round(val * 10) / 10)) });
    },
    onPanChange: (e) => {
      const val = parseFloat(e && e.target ? e.target.value : e) || 0.0;
      component.setState({ valPanX: Math.max(0, Math.min(1, Math.round(val * 100) / 100)) });
    },
    zoomIn: () => {
      component.setState({ valZoom: Math.min(4, Math.round((zoom + 0.5) * 10) / 10) });
    },
    zoomOut: () => {
      component.setState({ valZoom: Math.max(1, Math.round((zoom - 0.5) * 10) / 10) });
    },
    resetZoom: () => {
      component.setState({ valZoom: 1.0, valPanX: 0.0, valSelectedTicker: null });
    },
    zoomPresets,
    zoomLabel: ar ? 'التقريب والتفاصيل:' : 'ZOOM & DETAIL:',
    horizonLabel: ar ? 'أفق مضاعف الربحية:' : 'P/E HORIZON:',
    resetLabel: ar ? 'إعادة ضبط' : 'Reset View',
    inspectHint: ar ? 'اضغط على أي شركة لإظهار بياناتها التفصيلية' : 'Click any company bubble to inspect metrics',

    selectedCompany,
    matrixFootnote1: ar
      ? 'مساحة كل فقاعة تمثل القيمة السوقية. اضغط على أي شركة للانتقال إلى شاشتها أو فحص مضاعفاتها.'
      : 'Bubble area represents Market Capitalization. Click any company to inspect metrics or view details.',
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
