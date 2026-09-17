// Mode switcher: Investor (Plain English) vs Quant (Institutional)
function setPageMode(mode) {
  const btnInv = document.getElementById('btnModeInvestor');
  const btnQnt = document.getElementById('btnModeQuant');
  const note = document.getElementById('modeNote');
  if (mode === 'quant') {
    document.body.classList.remove('mode-investor');
    document.body.classList.add('mode-quant');
    if (btnQnt) btnQnt.classList.add('is-active');
    if (btnInv) btnInv.classList.remove('is-active');
    if (note) note.textContent = "Showing institutional formulas, bypasses, Wilson CIs & parameter simulator.";
    // The timeline is drawn when the data arrives, while this view is still
    // hidden, which sizes its canvas to 0 by 0; only a resize drew it again.
    // Until 17 Sep 2026 the quantitative view opened with that chart blank.
    window.dispatchEvent(new Event('resize'));
  } else {
    document.body.classList.remove('mode-quant');
    document.body.classList.add('mode-investor');
    if (btnInv) btnInv.classList.add('is-active');
    if (btnQnt) btnQnt.classList.remove('is-active');
    if (note) note.textContent = "Showing plain English, EGP returns & visual breakdowns.";
  }
}
window.setPageMode = setPageMode;

(function() {
  'use strict';
  // Default to investor mode
  document.body.classList.add('mode-investor');

  const CRISIS_METADATA = [
    { id: 12, name: "2008 GFC Wave 1", onset: "2008-05-05", trough: "2008-07-06", dd: -0.2018, onset_idx: 82, trough_idx: 125 },
    { id: 13, name: "2008 Lehman Crash", onset: "2008-08-06", trough: "2008-10-26", dd: -0.4885, onset_idx: 147, trough_idx: 199 },
    { id: 14, name: "2009 GFC Aftershock", onset: "2009-01-05", trough: "2009-02-05", dd: -0.2836, onset_idx: 245, trough_idx: 267 },
    { id: 15, name: "2009 Summer Correction", onset: "2009-06-16", trough: "2009-07-13", dd: -0.1803, onset_idx: 357, trough_idx: 375 },
    { id: 16, name: "2009 Dubai Debt Shock", onset: "2009-10-26", trough: "2009-11-30", dd: -0.1905, onset_idx: 446, trough_idx: 469 },
    { id: 17, name: "2010 Eurozone Crisis", onset: "2010-04-27", trough: "2010-05-25", dd: -0.2191, onset_idx: 570, trough_idx: 590 },
    { id: 18, name: "2011 Jan 25 Revolution", onset: "2011-01-05", trough: "2011-01-27", dd: -0.2169, onset_idx: 743, trough_idx: 757 },
    { id: 19, name: "2011 Cabinet Reshuffle", onset: "2011-06-19", trough: "2011-08-09", dd: -0.2043, onset_idx: 817, trough_idx: 853 },
    { id: 20, name: "2011 Maspero Clashes", onset: "2011-09-12", trough: "2011-11-22", dd: -0.2031, onset_idx: 874, trough_idx: 921 },
    { id: 21, name: "2012 Post-Election Drift", onset: "2012-03-22", trough: "2012-06-19", dd: -0.2056, onset_idx: 1002, trough_idx: 1060 },
    { id: 22, name: "2012 Constitutional Turmoil", onset: "2012-09-26", trough: "2012-11-28", dd: -0.1933, onset_idx: 1127, trough_idx: 1168 },
    { id: 23, name: "2015 Foreign FX Squeeze", onset: "2015-05-24", trough: "2015-08-18", dd: -0.1889, onset_idx: 1775, trough_idx: 1831 },
    { id: 24, name: "2015 Oil Collapse & FX Cap", onset: "2015-10-21", trough: "2016-01-13", dd: -0.1909, onset_idx: 1872, trough_idx: 1930 },
    { id: 25, name: "2018 Emerging Markets Contagion", onset: "2018-08-30", trough: "2018-10-25", dd: -0.1865, onset_idx: 2570, trough_idx: 2608 },
    { id: 26, name: "2020 COVID-19 Pandemic", onset: "2020-02-09", trough: "2020-03-09", dd: -0.2215, onset_idx: 2923, trough_idx: 2944 },
    { id: 27, name: "2022 Ukraine War & Float", onset: "2022-03-23", trough: "2022-06-22", dd: -0.1815, onset_idx: 3441, trough_idx: 3499 },
    { id: 28, name: "2024 Post-Float Correction", onset: "2024-03-11", trough: "2024-03-31", dd: -0.1947, onset_idx: 3918, trough_idx: 3932 }
  ];

  // Sliders
  const slThEnter = document.getElementById('slThEnter');
  const slThExit = document.getElementById('slThExit');
  const slCooldown = document.getElementById('slCooldown');
  const slMinHold = document.getElementById('slMinHold');
  const slMaxHold = document.getElementById('slMaxHold');
  const slStress = document.getElementById('slStress');
  const slSlope = document.getElementById('slSlope');
  const chkTrans = document.getElementById('chkTrans');
  const chkDecoupled = document.getElementById('chkDecoupled');

  const vThEnter = document.getElementById('vThEnter');
  const vThExit = document.getElementById('vThExit');
  const vCooldown = document.getElementById('vCooldown');
  const vHold = document.getElementById('vHold');
  const vStress = document.getElementById('vStress');
  const vSlope = document.getElementById('vSlope');

  // KPIs
  const kpRecall = document.getElementById('kpRecall');
  const kpRecallBadge = document.getElementById('kpRecallBadge');
  const kpCi = document.getElementById('kpCi');
  const kpMiss = document.getElementById('kpMiss');
  const kpLate = document.getElementById('kpLate');
  const kpReact = document.getElementById('kpReact');
  const kpHardFa = document.getElementById('kpHardFa');
  const kpHardFaBadge = document.getElementById('kpHardFaBadge');
  const kpHardEp = document.getElementById('kpHardEp');
  const kpTotFa = document.getElementById('kpTotFa');
  const kpFalseEp = document.getElementById('kpFalseEp');
  const kpOcc = document.getElementById('kpOcc');
  const kpOccBadge = document.getElementById('kpOccBadge');
  const kpPrec = document.getElementById('kpPrec');
  const kpPrecBadge = document.getElementById('kpPrecBadge');
  const kpTrueEp = document.getElementById('kpTrueEp');
  const kpTotEp = document.getElementById('kpTotEp');
  const kpLead = document.getElementById('kpLead');
  const kpOpp = document.getElementById('kpOpp');
  const kpUtil = document.getElementById('kpUtil');

  const crGrid = document.getElementById('crGrid');
  const canvas = document.getElementById('timelineCanvas');
  const canvasWrap = document.getElementById('canvasWrap');
  const tooltip = document.getElementById('scrubberTooltip');

  let series = [];
  let episodes = CRISIS_METADATA;
  let T = 0;
  let evalYears = 18.07;
  let currentAlerts = null;

  function wilson(k, n) {
    if (n === 0) return [0, 0];
    const p = k / n;
    const z = 1.96;
    const denom = 1 + (z * z) / n;
    const center = (p + (z * z) / (2 * n)) / denom;
    const spread = (z / denom) * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
    return [Math.max(0, center - spread), Math.min(1, center + spread)];
  }

  function simulate(thEnter, thExit, minHold, maxHold, cooldown, minStress, minSlope, useTrans, useDecoupled) {
    if (!series || series.length === 0) return null;

    const al = new Uint8Array(T);
    let inRed = false;
    let redStart = 0;
    let lastExitRed = -999;

    for (let i = 2; i < T; i++) {
      const s = series[i][2];
      const sPrev = series[i - 1][2];
      const sSlope = series[i][3];
      const uInt = series[i][4];
      const uExt = series[i][5];
      const stressCnt = series[i][6];
      const hasTrans = series[i][7];
      const catComm = series[i].length > 9 ? series[i][9] : 0.0;
      const catRisk = series[i].length > 10 ? series[i][10] : 0.0;

      if (inRed) {
        al[i] = 1;
        const holdLen = i - redStart + 1;
        if (holdLen >= minHold) {
          if (useDecoupled) {
            const catExit = (s < thExit) && (catComm < 0.42) && (catRisk < 0.315);
            if (catExit || holdLen >= maxHold) {
              inRed = false;
              lastExitRed = i;
            }
          } else {
            if (s < thExit || holdLen >= maxHold) {
              inRed = false;
              lastExitRed = i;
            }
          }
        }
      } else {
        const inCooldown = useDecoupled ? ((i - lastExitRed) <= cooldown) : ((i - lastExitRed) < cooldown);
        if (inCooldown) continue;

        if (useDecoupled) {
          // Challenger C-v2: Decoupled Multi-Channel Escalation
          const sensCons = (s >= thEnter) && (sPrev >= thEnter);
          const sensTrig = sensCons && (sSlope >= minSlope) && (stressCnt >= minStress);
          const commTrig = (s >= 0.90) && (catComm >= 0.60) && (stressCnt >= 1);
          const riskTrig = (s >= 0.90) && (catRisk >= 0.45) && (stressCnt >= 1);

          if (!sensTrig && !commTrig && !riskTrig) continue;
        } else {
          // Standard V5 / Baseline
          if (series[i][2] < thEnter || series[i - 1][2] < thEnter) continue;
          if (sSlope < minSlope) continue;
          if (useTrans && uExt >= thEnter && uInt < thEnter) {
            if (hasTrans === 0) continue;
          }
          if (minStress > 0 && stressCnt < minStress) continue;
        }

        inRed = true;
        redStart = i;
        al[i] = 1;
      }
    }

    let earlyCount = 0, lateCount = 0, reactCount = 0, missCount = 0;
    const leads = [];
    const crisisResults = [];

    for (let c = 0; c < episodes.length; c++) {
      const ep = episodes[c];
      const ons = ep.onset_idx;
      const tr = ep.trough_idx;

      let hasEarly = false, earlyFirst = -1;
      const earlyStart = Math.max(0, ons - 25);
      const earlyEnd = Math.max(0, ons - 4);
      for (let k = earlyStart; k < earlyEnd; k++) {
        if (al[k] === 1) { hasEarly = true; earlyFirst = k; break; }
      }

      let hasLate = false, lateFirst = -1;
      for (let k = Math.max(0, ons - 4); k <= ons; k++) {
        if (al[k] === 1) { hasLate = true; lateFirst = k; break; }
      }

      let hasReact = false, reactFirst = -1;
      for (let k = ons + 1; k <= tr; k++) {
        if (al[k] === 1) { hasReact = true; reactFirst = k; break; }
      }

      let status = "MISSED", leadDays = -999, alertDate = null;
      if (hasEarly) {
        status = "EARLY"; leadDays = ons - earlyFirst; alertDate = series[earlyFirst][0];
        earlyCount++; leads.push(leadDays);
      } else if (hasLate) {
        status = "LATE"; leadDays = ons - lateFirst; alertDate = series[lateFirst][0];
        lateCount++;
      } else if (hasReact) {
        status = "REACTIVE"; leadDays = ons - reactFirst; alertDate = series[reactFirst][0];
        reactCount++;
      } else {
        missCount++;
      }

      crisisResults.push({ ...ep, status, leadDays, alertDate });
    }

    // Clusters
    const clusters = [];
    let inEp = false, st = 0, en = 0;
    for (let i = 0; i < T; i++) {
      if (al[i] === 1) {
        if (!inEp) { inEp = true; st = i; en = i; } else en = i;
      } else {
        if (inEp) {
          let nextD = 999;
          for (let k = i; k < Math.min(T, i + 6); k++) {
            if (al[k] === 1) { nextD = k - i; break; }
          }
          if (nextD > 5) { inEp = false; clusters.push([st, en]); }
        }
      }
    }
    if (inEp) clusters.push([st, en]);

    let falseClusters = 0, hardFalseClusters = 0, nearMissClusters = 0, trueClusters = 0;
    let falseWarningDays = 0;
    const oppCosts = [];
    const crisisHitCount = {};

    for (let i = 0; i < clusters.length; i++) {
      const cSt = clusters[i][0];
      const cEn = clusters[i][1];
      const dur = cEn - cSt + 1;
      let isValid = false, matchedEpId = null;

      for (let c = 0; c < episodes.length; c++) {
        const ep = episodes[c];
        if ((ep.onset_idx - 25) <= cEn && cSt <= ep.trough_idx) {
          isValid = true; matchedEpId = ep.id; break;
        }
      }

      if (!isValid) {
        falseClusters++;
        falseWarningDays += dur;
        let prod = 1.0;
        for (let k = cSt; k <= cEn; k++) prod *= (1.0 + series[k][8]);
        oppCosts.push(prod - 1.0);

        const basePrice = series[cSt][1];
        let minP = basePrice;
        for (let k = cSt; k < Math.min(T, cSt + 26); k++) {
          if (series[k][1] < minP) minP = series[k][1];
        }
        if ((minP / basePrice - 1.0) <= -0.08) nearMissClusters++;
        else hardFalseClusters++;
      } else {
        trueClusters++;
        crisisHitCount[matchedEpId] = (crisisHitCount[matchedEpId] || 0) + 1;
      }
    }

    let dupAlerts = 0;
    for (const k in crisisHitCount) if (crisisHitCount[k] > 1) dupAlerts += (crisisHitCount[k] - 1);

    let sumAl = 0;
    for (let i = 0; i < T; i++) sumAl += al[i];
    const occupancy = (sumAl / T) * 100;
    const precision = clusters.length > 0 ? (trueClusters / clusters.length) * 100 : 0;
    const faPerYear = falseClusters / evalYears;
    const hardFaPerYear = hardFalseClusters / evalYears;

    let avgOppCost = 0;
    if (oppCosts.length > 0) {
      let sum = 0;
      for (let i = 0; i < oppCosts.length; i++) sum += oppCosts[i];
      avgOppCost = (sum / oppCosts.length) * 100;
    }

    leads.sort((a, b) => a - b);
    const medianLead = leads.length > 0 ? leads[Math.floor(leads.length / 2)] : 0;
    const utility = 10.0 * earlyCount - 2.0 * falseClusters - 0.05 * falseWarningDays - 1.0 * dupAlerts - 2.0 * lateCount;

    return {
      alerts: al, clusters, earlyCount, lateCount, reactCount, missCount,
      totalCrises: episodes.length, occupancy, totalEpisodes: clusters.length,
      trueEpisodes: trueClusters, falseEpisodes: falseClusters, hardFalseEpisodes: hardFalseClusters,
      faPerYear, hardFaPerYear, precision, medianLead, oppCost: avgOppCost, utility, crisisResults
    };
  }

  function updateUI(res) {
    if (!res) return;

    kpRecall.innerHTML = `${res.earlyCount} / ${res.totalCrises} <small style="font-size:1.05rem; color:var(--fe-accent);">(${((res.earlyCount / res.totalCrises) * 100).toFixed(1)}%)</small>`;
    const ci = wilson(res.earlyCount, res.totalCrises);
    kpCi.textContent = `[${(ci[0] * 100).toFixed(1)}%, ${(ci[1] * 100).toFixed(1)}%]`;
    kpMiss.textContent = res.missCount;
    kpLate.textContent = res.lateCount;
    kpReact.textContent = res.reactCount;

    kpRecallBadge.className = res.earlyCount >= 15 ? "fe-badge-metric fe-b-good" : "fe-badge-metric fe-b-warn";
    kpRecallBadge.textContent = res.earlyCount >= 15 ? "Target Met" : "Sub-Optimal";

    kpHardFa.innerHTML = `${res.hardFaPerYear.toFixed(2)} <small style="font-size:0.85rem; color:var(--fe-faint);">/ yr</small>`;
    kpHardEp.textContent = res.hardFalseEpisodes;
    kpTotFa.textContent = `${res.faPerYear.toFixed(2)}/yr`;
    kpFalseEp.textContent = res.falseEpisodes;
    kpHardFaBadge.className = res.hardFaPerYear <= 1.0 ? "fe-badge-metric fe-b-good" : "fe-badge-metric fe-b-alert";

    kpOcc.textContent = `${res.occupancy.toFixed(2)}%`;
    kpOccBadge.className = res.occupancy <= 13.0 ? "fe-badge-metric fe-b-good" : "fe-badge-metric fe-b-warn";

    kpPrec.textContent = `${res.precision.toFixed(1)}%`;
    kpTrueEp.textContent = res.trueEpisodes;
    kpTotEp.textContent = res.totalEpisodes;
    kpPrecBadge.className = res.precision >= 50.0 ? "fe-badge-metric fe-b-good" : "fe-badge-metric fe-b-warn";

    kpLead.innerHTML = `${res.medianLead.toFixed(1)} <small style="font-size:0.85rem; color:var(--fe-faint);">days</small>`;
    kpOpp.textContent = `${res.oppCost >= 0 ? '+' : ''}${res.oppCost.toFixed(2)}%`;
    kpUtil.textContent = `${res.utility >= 0 ? '+' : ''}${res.utility.toFixed(2)}`;

    renderCrisisScoreboard(res.crisisResults);
    currentAlerts = res.alerts;
    drawTimeline();
  }

  function renderCrisisScoreboard(crises) {
    crGrid.innerHTML = "";
    crises.forEach(cr => {
      const card = document.createElement("div");
      card.className = "fe-cr-card";
      let bClass = "fe-b-good", bLbl = "Early Hit", lTxt = `${cr.leadDays}d early`;

      if (cr.status === "LATE") { bClass = "fe-b-warn"; bLbl = "Late"; lTxt = `${cr.leadDays}d late window`; }
      else if (cr.status === "REACTIVE") { bClass = "fe-b-alert"; bLbl = "Reactive"; lTxt = "Post-onset"; }
      else if (cr.status === "MISSED") { bClass = "fe-b-alert"; bLbl = "Missed"; lTxt = "No warning"; }

      card.innerHTML = `
        <div class="fe-cr-head">
          <div>
            <div class="fe-cr-name">${cr.name}</div>
            <div class="fe-cr-date">${cr.onset} &rarr; ${cr.trough}</div>
          </div>
          <span class="fe-cr-dd">${(cr.dd * 100).toFixed(1)}%</span>
        </div>
        <div class="fe-cr-foot">
          <span class="fe-badge-metric ${bClass}">${bLbl}</span>
          <span style="font-family:var(--fe-mono); font-size:0.75rem; color:var(--fe-t2);">${lTxt}</span>
        </div>
      `;
      crGrid.appendChild(card);
    });
  }

  function drawTimeline(hoverIdx = -1) {
    if (!canvas || !series || series.length === 0) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasWrap.getBoundingClientRect();
    const w = rect.width, h = rect.height;

    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const padL = 55, padR = 15, padT = 15, padB = 30;
    const cW = w - padL - padR, cH = h - padT - padB;

    let minP = Infinity, maxP = -Infinity;
    for (let i = 0; i < T; i++) {
      if (series[i][1] < minP) minP = series[i][1];
      if (series[i][1] > maxP) maxP = series[i][1];
    }
    const logMin = Math.log(minP * 0.9), logMax = Math.log(maxP * 1.1);
    function getX(i) { return padL + (i / (T - 1)) * cW; }
    function getY(p) { return padT + cH - ((Math.log(p) - logMin) / (logMax - logMin)) * cH; }

    // Shaded Alert Bands
    if (currentAlerts) {
      ctx.fillStyle = "rgba(163, 64, 47, 0.2)";
      let inBand = false, sX = 0;
      for (let i = 0; i < T; i++) {
        if (currentAlerts[i] === 1) {
          if (!inBand) { inBand = true; sX = getX(i); }
        } else {
          if (inBand) { inBand = false; ctx.fillRect(sX, padT, Math.max(2, getX(i) - sX), cH); }
        }
      }
      if (inBand) ctx.fillRect(sX, padT, Math.max(2, getX(T - 1) - sX), cH);
    }

    // Grid lines
    ctx.strokeStyle = "rgba(27, 25, 23, 0.08)";
    ctx.lineWidth = 1;
    ctx.font = "10.5px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "rgba(27, 25, 23, 0.5)";

    [5000, 10000, 20000, 40000].forEach(val => {
      if (val >= minP && val <= maxP) {
        const y = getY(val);
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
        ctx.fillText(val.toLocaleString(), 8, y + 3);
      }
    });

    // Years
    ["2008", "2011", "2014", "2017", "2020", "2023", "2026"].forEach(yr => {
      for (let i = 0; i < T; i++) {
        if (series[i][0].startsWith(yr + "-01")) {
          const x = getX(i);
          ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + cH + 4); ctx.stroke();
          ctx.fillText(yr, x - 12, padT + cH + 18);
          break;
        }
      }
    });

    // Price Line
    ctx.beginPath(); ctx.strokeStyle = "#126B75"; ctx.lineWidth = 1.75;
    for (let i = 0; i < T; i++) {
      const x = getX(i), y = getY(series[i][1]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Crisis Markers
    episodes.forEach(ep => {
      const x = getX(ep.onset_idx), y = getY(series[ep.onset_idx][1]);
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#3F6B52"; ctx.fill();
      ctx.strokeStyle = "white"; ctx.lineWidth = 1.5; ctx.stroke();
    });

    // Scrubber
    if (hoverIdx >= 0 && hoverIdx < T) {
      const hX = getX(hoverIdx), hY = getY(series[hoverIdx][1]);
      ctx.strokeStyle = "rgba(25, 44, 60, 0.5)"; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(hX, padT); ctx.lineTo(hX, padT + cH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(hX, hY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#A3402F"; ctx.fill();
      ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  canvasWrap.addEventListener('mousemove', e => {
    if (!series || series.length === 0) return;
    const rect = canvasWrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padL = 55, padR = 15;
    const cW = rect.width - padL - padR;

    if (x < padL || x > rect.width - padR) {
      tooltip.style.display = "none"; drawTimeline(-1); return;
    }

    const ratio = Math.max(0, Math.min(1, (x - padL) / cW));
    const idx = Math.floor(ratio * (T - 1));
    const row = series[idx];
    drawTimeline(idx);

    const isAl = currentAlerts && currentAlerts[idx] === 1;
    tooltip.style.display = "block";
    tooltip.style.left = `${Math.min(rect.width - 210, Math.max(10, x - 100))}px`;
    tooltip.innerHTML = `
      <strong>${row[0]}</strong><br>
      EGX 30: <b>${row[1].toLocaleString()}</b><br>
      Fragility: <b>${row[2].toFixed(3)}</b> | A: ${row[4].toFixed(2)} B: ${row[5].toFixed(2)}<br>
      ${row.length > 9 ? `Comm: <b>${row[9].toFixed(2)}</b> | Risk: <b>${row[10].toFixed(2)}</b><br>` : ''}
      Status: <b style="color:${isAl ? '#A3402F' : '#3F6B52'}">${isAl ? 'RED ALERT' : 'NORMAL'}</b>
    `;
  });

  canvasWrap.addEventListener('mouseleave', () => {
    tooltip.style.display = "none"; drawTimeline(-1);
  });

  function recompute() {
    const thEnter = parseFloat(slThEnter.value);
    const thExit = parseFloat(slThExit.value);
    const cooldown = parseInt(slCooldown.value);
    const minHold = parseInt(slMinHold.value);
    const maxHold = parseInt(slMaxHold.value);
    const minStress = parseInt(slStress.value);
    const minSlope = parseFloat(slSlope.value);
    const useTrans = chkTrans.checked;
    const useDecoupled = chkDecoupled ? chkDecoupled.checked : true;

    vThEnter.textContent = thEnter.toFixed(3);
    vThExit.textContent = thExit.toFixed(3);
    vCooldown.textContent = `${cooldown} days`;
    vHold.textContent = `${minHold} – ${maxHold} days`;
    vStress.textContent = `${minStress} group${minStress !== 1 ? 's' : ''}`;
    vSlope.textContent = minSlope.toFixed(3);

    const res = simulate(thEnter, thExit, minHold, maxHold, cooldown, minStress, minSlope, useTrans, useDecoupled);
    updateUI(res);
  }

  [slThEnter, slThExit, slCooldown, slMinHold, slMaxHold, slStress, slSlope].forEach(s => s.addEventListener('input', recompute));
  chkTrans.addEventListener('change', recompute);
  if (chkDecoupled) chkDecoupled.addEventListener('change', recompute);

  // Presets
  document.querySelectorAll('.fe-btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fe-btn-preset').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const p = btn.dataset.p;
      if (p === 'c-v2-main') {
        slThEnter.value = 0.930; slThExit.value = 0.885; slCooldown.value = 20;
        slMinHold.value = 5; slMaxHold.value = 8; slStress.value = 1; slSlope.value = 0.000;
        chkTrans.checked = true; if (chkDecoupled) chkDecoupled.checked = true;
      } else if (p === 'v5-rec') {
        slThEnter.value = 0.920; slThExit.value = 0.870; slCooldown.value = 35;
        slMinHold.value = 5; slMaxHold.value = 12; slStress.value = 1; slSlope.value = -0.005;
        chkTrans.checked = true; if (chkDecoupled) chkDecoupled.checked = false;
      } else if (p === 'v5-m16') {
        slThEnter.value = 0.925; slThExit.value = 0.875; slCooldown.value = 20;
        slMinHold.value = 5; slMaxHold.value = 12; slStress.value = 1; slSlope.value = 0.000;
        chkTrans.checked = true; if (chkDecoupled) chkDecoupled.checked = false;
      } else if (p === 'v5-sel') {
        slThEnter.value = 0.935; slThExit.value = 0.885; slCooldown.value = 50;
        slMinHold.value = 5; slMaxHold.value = 10; slStress.value = 1; slSlope.value = 0.000;
        chkTrans.checked = true; if (chkDecoupled) chkDecoupled.checked = false;
      } else if (p === 'v4-base') {
        slThEnter.value = 0.920; slThExit.value = 0.920; slCooldown.value = 20;
        slMinHold.value = 8; slMaxHold.value = 8; slStress.value = 0; slSlope.value = -0.050;
        chkTrans.checked = false; if (chkDecoupled) chkDecoupled.checked = false;
      } else if (p === 'b1-vol') {
        slThEnter.value = 0.880; slThExit.value = 0.880; slCooldown.value = 0;
        slMinHold.value = 1; slMaxHold.value = 15; slStress.value = 0; slSlope.value = -0.050;
        chkTrans.checked = false; if (chkDecoupled) chkDecoupled.checked = false;
      }
      recompute();
    });
  });

  // What-If Scenarios
  document.querySelectorAll('.fe-btn-sc').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fe-btn-sc').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const sc = btn.dataset.sc;
      const pill = document.getElementById('livePill');
      const scVal = document.getElementById('liveScore');
      const bar = document.getElementById('liveBar');
      const ea = document.getElementById('liveEngineA');
      const eb = document.getElementById('liveEngineB');
      const catCommEl = document.getElementById('liveCatComm');
      const catRiskEl = document.getElementById('liveCatRisk');
      const f5 = document.getElementById('fwd5');
      const f25 = document.getElementById('fwd25');

      const liveActionCard = document.getElementById('liveActionCard');
      const liveActionBadge = document.getElementById('liveActionBadge');
      const liveActionTitle = document.getElementById('liveActionTitle');
      const liveActionDesc = document.getElementById('liveActionDesc');
      const liveWMScore = document.getElementById('liveWMScore');
      const liveHedgeRatio = document.getElementById('liveHedgeRatio');

      if (sc === 'real') {
        pill.className = "fe-status-pill fe-pill-green";
        pill.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:#3F6B52;"></span> MARKET CALM & HEALTHY';
        scVal.textContent = "0.45"; bar.style.width = "45.3%";
        ea.textContent = "0.4528"; if (eb) eb.textContent = "0.2505";
        if (catCommEl) { catCommEl.textContent = "0.08 / 0.60"; catCommEl.style.color = "var(--fe-up)"; }
        if (catRiskEl) { catRiskEl.textContent = "0.14 / 0.45"; catRiskEl.style.color = "var(--fe-up)"; }
        f5.textContent = "3.2%"; f25.textContent = "9.8% (Benign)"; f25.style.color = "var(--fe-up)";
        if (liveWMScore) liveWMScore.textContent = "36.5%";
        if (liveHedgeRatio) liveHedgeRatio.textContent = "36.5%";
        if (liveActionCard) { liveActionCard.style.background = "#F0FDF4"; liveActionCard.style.borderColor = "rgba(63,107,82,0.25)"; }
        if (liveActionBadge) { liveActionBadge.className = "fe-badge-metric fe-b-good"; liveActionBadge.textContent = "No warning"; }
        if (liveActionTitle) { liveActionTitle.textContent = "100% In Egyptian Stocks · 0% In T-Bills"; liveActionTitle.style.color = "#166534"; }
        if (liveActionDesc) { liveActionDesc.textContent = "No crash alert is active. Market breadth and liquidity are healthy. Capital stays fully invested to grow with the market."; liveActionDesc.style.color = "#15803d"; }
      } else if (sc === 'comm') {
        pill.className = "fe-status-pill fe-pill-red";
        pill.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:#A3402F;"></span> Red Alert (Commodity Fast-Path)';
        scVal.textContent = "0.91"; bar.style.width = "91.0%";
        ea.textContent = "0.7200"; if (eb) eb.textContent = "0.9100";
        if (catCommEl) { catCommEl.textContent = "0.85 (SHOCK)"; catCommEl.style.color = "var(--fe-down)"; }
        if (catRiskEl) { catRiskEl.textContent = "0.22 / 0.45"; catRiskEl.style.color = "var(--fe-up)"; }
        f5.textContent = "26.4%"; f25.textContent = "68.5% (High Hazard)"; f25.style.color = "var(--fe-down)";
        if (liveWMScore) liveWMScore.textContent = "45.0%";
        if (liveHedgeRatio) liveHedgeRatio.textContent = "45.0%";
        if (liveActionCard) { liveActionCard.style.background = "#FEF2F2"; liveActionCard.style.borderColor = "rgba(163,64,47,0.3)"; }
        if (liveActionBadge) { liveActionBadge.className = "fe-badge-metric fe-b-alert"; liveActionBadge.textContent = "Defensive Shield Active"; }
        if (liveActionTitle) { liveActionTitle.textContent = "55% In Stocks · 45% In Egyptian T-Bills"; liveActionTitle.style.color = "#991B1B"; }
        if (liveActionDesc) { liveActionDesc.textContent = "Severe commodity inflation shock detected. 45% of portfolio shifted into safe Egyptian T-Bills earning daily interest."; liveActionDesc.style.color = "#B91C1C"; }
      } else if (sc === 'vix') {
        pill.className = "fe-status-pill fe-pill-red";
        pill.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:#A3402F;"></span> Red Alert (Contagion Fast-Path)';
        scVal.textContent = "0.90"; bar.style.width = "90.0%";
        ea.textContent = "0.5810"; if (eb) eb.textContent = "0.9250";
        if (catCommEl) { catCommEl.textContent = "0.15 / 0.60"; catCommEl.style.color = "var(--fe-up)"; }
        if (catRiskEl) { catRiskEl.textContent = "0.78 (SHOCK)"; catRiskEl.style.color = "var(--fe-down)"; }
        f5.textContent = "22.8%"; f25.textContent = "61.2% (High Hazard)"; f25.style.color = "var(--fe-down)";
        if (liveWMScore) liveWMScore.textContent = "50.0%";
        if (liveHedgeRatio) liveHedgeRatio.textContent = "50.0%";
        if (liveActionCard) { liveActionCard.style.background = "#FEF2F2"; liveActionCard.style.borderColor = "rgba(163,64,47,0.3)"; }
        if (liveActionBadge) { liveActionBadge.className = "fe-badge-metric fe-b-alert"; liveActionBadge.textContent = "Defensive Shield Active"; }
        if (liveActionTitle) { liveActionTitle.textContent = "50% In Stocks · 50% In Egyptian T-Bills"; liveActionTitle.style.color = "#991B1B"; }
        if (liveActionDesc) { liveActionDesc.textContent = "Global panic wave detected. Half of capital moved into safe Egyptian T-Bills to reduce equity beta."; liveActionDesc.style.color = "#B91C1C"; }
      } else if (sc === 'decay') {
        pill.className = "fe-status-pill fe-pill-red";
        pill.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:#A3402F;"></span> Red Alert (2-Day Consensus)';
        scVal.textContent = "0.94"; bar.style.width = "94.0%";
        ea.textContent = "0.9480"; if (eb) eb.textContent = "0.5100";
        if (catCommEl) { catCommEl.textContent = "0.18 / 0.60"; catCommEl.style.color = "var(--fe-up)"; }
        if (catRiskEl) { catRiskEl.textContent = "0.19 / 0.45"; catRiskEl.style.color = "var(--fe-up)"; }
        f5.textContent = "31.5%"; f25.textContent = "78.2% (High Hazard)"; f25.style.color = "var(--fe-down)";
        if (liveWMScore) liveWMScore.textContent = "40.0%";
        if (liveHedgeRatio) liveHedgeRatio.textContent = "40.0%";
        if (liveActionCard) { liveActionCard.style.background = "#FEF2F2"; liveActionCard.style.borderColor = "rgba(163,64,47,0.3)"; }
        if (liveActionBadge) { liveActionBadge.className = "fe-badge-metric fe-b-alert"; liveActionBadge.textContent = "Warning Active"; }
        if (liveActionTitle) { liveActionTitle.textContent = "60% In Stocks · 40% In Egyptian T-Bills"; liveActionTitle.style.color = "#991B1B"; }
        if (liveActionDesc) { liveActionDesc.textContent = "Internal Egyptian market fragility confirmed across 2 consecutive sessions. 40% hedged in T-Bills."; liveActionDesc.style.color = "#B91C1C"; }
      } else if (sc === 'cascade') {
        pill.className = "fe-status-pill fe-pill-red";
        pill.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:#A3402F;"></span> Red Alert (Dual Engine Shock)';
        scVal.textContent = "0.99"; bar.style.width = "99.0%";
        ea.textContent = "0.9920"; if (eb) eb.textContent = "0.9850";
        if (catCommEl) { catCommEl.textContent = "0.95 (SHOCK)"; catCommEl.style.color = "var(--fe-down)"; }
        if (catRiskEl) { catRiskEl.textContent = "0.98 (SHOCK)"; catRiskEl.style.color = "var(--fe-down)"; }
        f5.textContent = "48.9%"; f25.textContent = "91.5% (Imminent Crash)"; f25.style.color = "var(--fe-down)";
        if (liveWMScore) liveWMScore.textContent = "60.0%";
        if (liveHedgeRatio) liveHedgeRatio.textContent = "60.0%";
        if (liveActionCard) { liveActionCard.style.background = "#FEF2F2"; liveActionCard.style.borderColor = "rgba(163,64,47,0.3)"; }
        if (liveActionBadge) { liveActionBadge.className = "fe-badge-metric fe-b-alert"; liveActionBadge.textContent = "Maximum Defense Shield"; }
        if (liveActionTitle) { liveActionTitle.textContent = "40% In Stocks · 60% In Egyptian T-Bills"; liveActionTitle.style.color = "#991B1B"; }
        if (liveActionDesc) { liveActionDesc.textContent = "Severe systemic cascade across both domestic breadth and global markets. Maximum 60% defensive hedge deployed."; liveActionDesc.style.color = "#B91C1C"; }
      }
    });
  });

  window.addEventListener('resize', () => drawTimeline());

  // Resilient data loader for esthmr.com
  function loadData(url) {
    return fetch(url).then(r => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  loadData('/esthmr/backtest/v5_simulation_series.json')
    .catch(() => loadData('backtest/v5_simulation_series.json'))
    .catch(() => loadData('/data/v1/backtest/v5_simulation_series.json'))
    .catch(() => loadData('../data/v1/backtest/v5_simulation_series.json'))
    .catch(() => loadData('data/v1/backtest/v5_simulation_series.json'))
    .then(d => {
      series = d.series;
      if (d.episodes && d.episodes.length > 0) {
        episodes = d.episodes.map(ep => {
          const match = CRISIS_METADATA.find(m => m.id === ep.episode_id);
          return {
            id: ep.episode_id,
            name: match ? match.name : `Episode ${ep.episode_id}`,
            onset: ep.onset_date,
            trough: ep.trough_date,
            dd: ep.drawdown,
            onset_idx: ep.onset_idx_test,
            trough_idx: ep.trough_idx_test
          };
        });
      }
      T = series.length;
      evalYears = T / 250.0;
      // Default to Challenger C-v2 Primary Preset on initial load
      slThEnter.value = 0.930; slThExit.value = 0.885; slCooldown.value = 20;
      slMinHold.value = 5; slMaxHold.value = 8; slStress.value = 1; slSlope.value = 0.000;
      chkTrans.checked = true; if (chkDecoupled) chkDecoupled.checked = true;
      recompute();
    })
    .catch(err => {
      console.warn("Could not load simulation series:", err);
    });


  // ═══════════════════════════════════════════════════════════════
  // ALERT EPISODE AUDIT TABLE LOGIC
  // ═══════════════════════════════════════════════════════════════
  const C_V2_EPISODES = [{"id": 1, "start": "2008-01-03", "end": "2008-01-16", "dur": 8, "type": "NEAR_MISS", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -10.15, "mfe": 2.86, "opp": 1.11, "desc": "Near-Miss Sub-Threshold Correction (MAE25: -10.15%)"}, {"id": 2, "start": "2008-02-14", "end": "2008-02-25", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": 0.0, "mfe": 11.9, "opp": 10.47, "desc": "Hard False Alarm (MAE25: 0.0%, OppCost: 10.47%)"}, {"id": 3, "start": "2008-03-26", "end": "2008-04-06", "dur": 8, "type": "STRICT_EARLY", "crisis_id": 12, "crisis_name": "Crisis 12: 2008 GFC Wave 1", "lead": 25, "mae": 0.0, "mfe": 7.4, "opp": 3.68, "desc": "Hit: Crisis 12: 2008 GFC Wave 1 (25d early lead)"}, {"id": 4, "start": "2008-05-08", "end": "2008-05-19", "dur": 8, "type": "REACTIVE", "crisis_id": 12, "crisis_name": "Crisis 12: 2008 GFC Wave 1", "lead": -3, "mae": -11.93, "mfe": 0.0, "opp": -10.18, "desc": "Reactive Capital Protection during ongoing Crisis 12: 2008 GFC Wave 1"}, {"id": 5, "start": "2008-06-17", "end": "2008-06-26", "dur": 8, "type": "REACTIVE", "crisis_id": 12, "crisis_name": "Crisis 12: 2008 GFC Wave 1", "lead": -31, "mae": -12.54, "mfe": 0.0, "opp": -6.67, "desc": "Reactive Capital Protection during ongoing Crisis 12: 2008 GFC Wave 1"}, {"id": 6, "start": "2008-07-29", "end": "2008-08-07", "dur": 8, "type": "STRICT_EARLY", "crisis_id": 13, "crisis_name": "Crisis 13: 2008 Lehman Crash", "lead": 6, "mae": -15.17, "mfe": 0.65, "opp": -6.87, "desc": "Hit: Crisis 13: 2008 Lehman Crash (6d early lead)"}, {"id": 7, "start": "2008-09-07", "end": "2008-09-16", "dur": 8, "type": "REACTIVE", "crisis_id": 13, "crisis_name": "Crisis 13: 2008 Lehman Crash", "lead": -22, "mae": -34.33, "mfe": 1.66, "opp": -14.48, "desc": "Reactive Capital Protection during ongoing Crisis 13: 2008 Lehman Crash"}, {"id": 8, "start": "2008-10-22", "end": "2008-11-02", "dur": 8, "type": "REACTIVE", "crisis_id": 13, "crisis_name": "Crisis 13: 2008 Lehman Crash", "lead": -50, "mae": -27.89, "mfe": 4.92, "opp": -10.99, "desc": "Reactive Capital Protection during ongoing Crisis 13: 2008 Lehman Crash"}, {"id": 9, "start": "2008-12-01", "end": "2008-12-15", "dur": 8, "type": "STRICT_EARLY", "crisis_id": 14, "crisis_name": "Crisis 14: 2009 GFC Aftershock", "lead": 20, "mae": -2.11, "mfe": 17.62, "opp": 3.82, "desc": "Hit: Crisis 14: 2009 GFC Aftershock (20d early lead)"}, {"id": 10, "start": "2009-01-18", "end": "2009-01-27", "dur": 8, "type": "REACTIVE", "crisis_id": 14, "crisis_name": "Crisis 14: 2009 GFC Aftershock", "lead": -8, "mae": -21.19, "mfe": 0.0, "opp": -10.75, "desc": "Reactive Capital Protection during ongoing Crisis 14: 2009 GFC Aftershock"}, {"id": 11, "start": "2009-02-25", "end": "2009-03-08", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -1.26, "mfe": 22.5, "opp": 3.28, "desc": "Hard False Alarm (MAE25: -1.26%, OppCost: 3.28%)"}, {"id": 12, "start": "2009-04-07", "end": "2009-04-16", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -0.88, "mfe": 23.59, "opp": 3.15, "desc": "Hard False Alarm (MAE25: -0.88%, OppCost: 3.15%)"}, {"id": 13, "start": "2009-05-19", "end": "2009-05-28", "dur": 8, "type": "STRICT_EARLY", "crisis_id": 15, "crisis_name": "Crisis 15: 2009 Summer Correction", "lead": 20, "mae": -6.02, "mfe": 6.69, "opp": -1.69, "desc": "Hit: Crisis 15: 2009 Summer Correction (20d early lead)"}, {"id": 14, "start": "2009-06-30", "end": "2009-07-12", "dur": 8, "type": "REACTIVE", "crisis_id": 15, "crisis_name": "Crisis 15: 2009 Summer Correction", "lead": -10, "mae": -8.3, "mfe": 14.49, "opp": -4.46, "desc": "Reactive Capital Protection during ongoing Crisis 15: 2009 Summer Correction"}, {"id": 15, "start": "2009-08-11", "end": "2009-08-20", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -3.27, "mfe": 6.01, "opp": -2.83, "desc": "Hard False Alarm (MAE25: -3.27%, OppCost: -2.83%)"}, {"id": 16, "start": "2009-09-30", "end": "2009-10-12", "dur": 8, "type": "STRICT_EARLY", "crisis_id": 16, "crisis_name": "Crisis 16: 2009 Dubai Debt Shock", "lead": 17, "mae": -3.11, "mfe": 7.21, "opp": 0.35, "desc": "Hit: Crisis 16: 2009 Dubai Debt Shock (17d early lead)"}, {"id": 17, "start": "2009-11-10", "end": "2009-11-19", "dur": 8, "type": "REACTIVE", "crisis_id": 16, "crisis_name": "Crisis 16: 2009 Dubai Debt Shock", "lead": -11, "mae": -14.47, "mfe": 0.03, "opp": -7.75, "desc": "Reactive Capital Protection during ongoing Crisis 16: 2009 Dubai Debt Shock"}, {"id": 18, "start": "2009-12-22", "end": "2009-12-31", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -4.49, "mfe": 6.91, "opp": -3.17, "desc": "Hard False Alarm (MAE25: -4.49%, OppCost: -3.17%)"}, {"id": 19, "start": "2010-02-02", "end": "2010-02-11", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -5.09, "mfe": 1.96, "opp": 1.93, "desc": "Hard False Alarm (MAE25: -5.09%, OppCost: 1.93%)"}, {"id": 20, "start": "2010-03-24", "end": "2010-04-06", "dur": 8, "type": "STRICT_EARLY", "crisis_id": 17, "crisis_name": "Crisis 17: 2010 Eurozone Crisis", "lead": 21, "mae": 0.0, "mfe": 13.19, "opp": 5.89, "desc": "Hit: Crisis 17: 2010 Eurozone Crisis (21d early lead)"}, {"id": 21, "start": "2010-05-06", "end": "2010-05-17", "dur": 8, "type": "REACTIVE", "crisis_id": 17, "crisis_name": "Crisis 17: 2010 Eurozone Crisis", "lead": -7, "mae": -16.57, "mfe": 0.0, "opp": -7.45, "desc": "Reactive Capital Protection during ongoing Crisis 17: 2010 Eurozone Crisis"}, {"id": 22, "start": "2010-06-17", "end": "2010-06-28", "dur": 8, "type": "NEAR_MISS", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -8.85, "mfe": 2.01, "opp": -1.45, "desc": "Near-Miss Sub-Threshold Correction (MAE25: -8.85%)"}, {"id": 23, "start": "2010-07-28", "end": "2010-08-08", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": 0.0, "mfe": 4.51, "opp": 3.16, "desc": "Hard False Alarm (MAE25: 0.0%, OppCost: 3.16%)"}, {"id": 24, "start": "2010-09-06", "end": "2010-09-19", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -1.07, "mfe": 5.89, "opp": 0.61, "desc": "Hard False Alarm (MAE25: -1.07%, OppCost: 0.61%)"}, {"id": 25, "start": "2010-10-19", "end": "2010-10-28", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -3.07, "mfe": 2.28, "opp": -2.16, "desc": "Hard False Alarm (MAE25: -3.07%, OppCost: -2.16%)"}, {"id": 26, "start": "2010-12-01", "end": "2010-12-13", "dur": 8, "type": "STRICT_EARLY", "crisis_id": 18, "crisis_name": "Crisis 18: 2011 Jan 25 Revolution", "lead": 24, "mae": 0.0, "mfe": 7.9, "opp": 3.48, "desc": "Hit: Crisis 18: 2011 Jan 25 Revolution (24d early lead)"}, {"id": 27, "start": "2011-01-27", "end": "2011-03-31", "dur": 8, "type": "REACTIVE", "crisis_id": 18, "crisis_name": "Crisis 18: 2011 Jan 25 Revolution", "lead": -14, "mae": -12.32, "mfe": 0.0, "opp": -13.42, "desc": "Reactive Capital Protection during ongoing Crisis 18: 2011 Jan 25 Revolution"}, {"id": 28, "start": "2011-05-26", "end": "2011-06-06", "dur": 8, "type": "STRICT_EARLY", "crisis_id": 19, "crisis_name": "Crisis 19: 2011 Cabinet Reshuffle", "lead": 16, "mae": -2.36, "mfe": 4.0, "opp": 0.94, "desc": "Hit: Crisis 19: 2011 Cabinet Reshuffle (16d early lead)"}, {"id": 29, "start": "2011-07-19", "end": "2011-07-27", "dur": 6, "type": "REACTIVE", "crisis_id": 19, "crisis_name": "Crisis 19: 2011 Cabinet Reshuffle", "lead": -22, "mae": -12.95, "mfe": 0.0, "opp": -2.43, "desc": "Reactive Capital Protection during ongoing Crisis 19: 2011 Cabinet Reshuffle"}, {"id": 30, "start": "2011-08-25", "end": "2011-09-08", "dur": 8, "type": "STRICT_EARLY", "crisis_id": 20, "crisis_name": "Crisis 20: 2011 Maspero Clashes", "lead": 9, "mae": -13.91, "mfe": 1.68, "opp": 1.93, "desc": "Hit: Crisis 20: 2011 Maspero Clashes (9d early lead)"}, {"id": 31, "start": "2011-10-10", "end": "2011-10-16", "dur": 5, "type": "REACTIVE", "crisis_id": 20, "crisis_name": "Crisis 20: 2011 Maspero Clashes", "lead": -19, "mae": 0.0, "mfe": 13.07, "opp": 4.6, "desc": "Reactive Capital Protection during ongoing Crisis 20: 2011 Maspero Clashes"}, {"id": 32, "start": "2011-11-30", "end": "2011-12-06", "dur": 5, "type": "NEAR_MISS", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -10.79, "mfe": 1.69, "opp": 0.93, "desc": "Near-Miss Sub-Threshold Correction (MAE25: -10.79%)"}, {"id": 33, "start": "2012-01-15", "end": "2012-01-19", "dur": 5, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -0.2, "mfe": 34.18, "opp": 2.4, "desc": "Hard False Alarm (MAE25: -0.2%, OppCost: 2.4%)"}, {"id": 34, "start": "2012-02-29", "end": "2012-03-11", "dur": 8, "type": "STRICT_EARLY", "crisis_id": 21, "crisis_name": "Crisis 21: 2012 Post-Election Drift", "lead": 16, "mae": -9.56, "mfe": 1.91, "opp": 1.44, "desc": "Hit: Crisis 21: 2012 Post-Election Drift (16d early lead)"}, {"id": 35, "start": "2012-04-09", "end": "2012-04-22", "dur": 8, "type": "REACTIVE", "crisis_id": 21, "crisis_name": "Crisis 21: 2012 Post-Election Drift", "lead": -12, "mae": -0.76, "mfe": 10.66, "opp": 2.26, "desc": "Reactive Capital Protection during ongoing Crisis 21: 2012 Post-Election Drift"}, {"id": 36, "start": "2012-05-24", "end": "2012-06-04", "dur": 8, "type": "REACTIVE", "crisis_id": 21, "crisis_name": "Crisis 21: 2012 Post-Election Drift", "lead": -41, "mae": -18.91, "mfe": 0.0, "opp": -6.35, "desc": "Reactive Capital Protection during ongoing Crisis 21: 2012 Post-Election Drift"}, {"id": 37, "start": "2012-07-05", "end": "2012-07-16", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -5.07, "mfe": 2.02, "opp": -3.55, "desc": "Hard False Alarm (MAE25: -5.07%, OppCost: -3.55%)"}, {"id": 38, "start": "2012-09-02", "end": "2012-09-11", "dur": 8, "type": "STRICT_EARLY", "crisis_id": 22, "crisis_name": "Crisis 22: 2012 Constitutional Turmoil", "lead": 18, "mae": 0.0, "mfe": 10.04, "opp": 6.85, "desc": "Hit: Crisis 22: 2012 Constitutional Turmoil (18d early lead)"}, {"id": 39, "start": "2012-10-14", "end": "2012-10-23", "dur": 8, "type": "REACTIVE", "crisis_id": 22, "crisis_name": "Crisis 22: 2012 Constitutional Turmoil", "lead": -11, "mae": -5.47, "mfe": 2.97, "opp": -0.68, "desc": "Reactive Capital Protection during ongoing Crisis 22: 2012 Constitutional Turmoil"}, {"id": 40, "start": "2012-11-26", "end": "2012-12-05", "dur": 8, "type": "REACTIVE", "crisis_id": 22, "crisis_name": "Crisis 22: 2012 Constitutional Turmoil", "lead": -39, "mae": -4.75, "mfe": 8.23, "opp": 3.14, "desc": "Reactive Capital Protection during ongoing Crisis 22: 2012 Constitutional Turmoil"}, {"id": 41, "start": "2013-09-05", "end": "2013-09-16", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": 0.0, "mfe": 15.8, "opp": 6.79, "desc": "Hard False Alarm (MAE25: 0.0%, OppCost: 6.79%)"}, {"id": 42, "start": "2013-10-22", "end": "2013-10-31", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -2.11, "mfe": 4.78, "opp": 1.52, "desc": "Hard False Alarm (MAE25: -2.11%, OppCost: 1.52%)"}, {"id": 43, "start": "2013-12-10", "end": "2013-12-19", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": 0.0, "mfe": 11.41, "opp": 4.33, "desc": "Hard False Alarm (MAE25: 0.0%, OppCost: 4.33%)"}, {"id": 44, "start": "2014-01-26", "end": "2014-02-04", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": 0.0, "mfe": 12.6, "opp": 0.75, "desc": "Hard False Alarm (MAE25: 0.0%, OppCost: 0.75%)"}, {"id": 45, "start": "2014-03-05", "end": "2014-03-16", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -6.24, "mfe": 5.94, "opp": 2.43, "desc": "Hard False Alarm (MAE25: -6.24%, OppCost: 2.43%)"}, {"id": 46, "start": "2014-04-14", "end": "2014-04-28", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": 0.0, "mfe": 11.12, "opp": 3.69, "desc": "Hard False Alarm (MAE25: 0.0%, OppCost: 3.69%)"}, {"id": 47, "start": "2014-05-29", "end": "2014-06-10", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -4.22, "mfe": 6.11, "opp": 0.34, "desc": "Hard False Alarm (MAE25: -4.22%, OppCost: 0.34%)"}, {"id": 48, "start": "2014-07-10", "end": "2014-07-21", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -0.66, "mfe": 11.67, "opp": -0.29, "desc": "Hard False Alarm (MAE25: -0.66%, OppCost: -0.29%)"}, {"id": 49, "start": "2014-08-28", "end": "2014-09-08", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -0.08, "mfe": 3.99, "opp": 3.51, "desc": "Hard False Alarm (MAE25: -0.08%, OppCost: 3.51%)"}, {"id": 50, "start": "2014-10-13", "end": "2014-10-22", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -6.49, "mfe": 4.55, "opp": -3.84, "desc": "Hard False Alarm (MAE25: -6.49%, OppCost: -3.84%)"}, {"id": 51, "start": "2014-11-20", "end": "2014-12-01", "dur": 8, "type": "NEAR_MISS", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -12.24, "mfe": 3.45, "opp": 0.15, "desc": "Near-Miss Sub-Threshold Correction (MAE25: -12.24%)"}, {"id": 52, "start": "2014-12-30", "end": "2015-01-12", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -2.3, "mfe": 11.55, "opp": 1.69, "desc": "Hard False Alarm (MAE25: -2.3%, OppCost: 1.69%)"}, {"id": 53, "start": "2015-05-03", "end": "2015-05-12", "dur": 8, "type": "STRICT_EARLY", "crisis_id": 23, "crisis_name": "Crisis 23: 2015 Foreign FX Squeeze", "lead": 15, "mae": -3.53, "mfe": 6.53, "opp": 0.02, "desc": "Hit: Crisis 23: 2015 Foreign FX Squeeze (15d early lead)"}, {"id": 54, "start": "2015-07-27", "end": "2015-08-03", "dur": 6, "type": "REACTIVE", "crisis_id": 23, "crisis_name": "Crisis 23: 2015 Foreign FX Squeeze", "lead": -41, "mae": -15.64, "mfe": 3.85, "opp": 1.03, "desc": "Reactive Capital Protection during ongoing Crisis 23: 2015 Foreign FX Squeeze"}, {"id": 55, "start": "2015-09-07", "end": "2015-09-16", "dur": 8, "type": "EARLY_FRAGILITY_BUILDUP", "crisis_id": 24, "crisis_name": "Crisis 24: 2015 Oil Collapse & FX Cap", "lead": 27, "mae": -3.38, "mfe": 7.01, "opp": -0.1, "desc": "Early Buildup Hit: Crisis 24: 2015 Oil Collapse & FX Cap (27d lead)"}, {"id": 56, "start": "2015-12-03", "end": "2015-12-09", "dur": 5, "type": "REACTIVE", "crisis_id": 24, "crisis_name": "Crisis 24: 2015 Oil Collapse & FX Cap", "lead": -31, "mae": -5.67, "mfe": 4.57, "opp": -0.31, "desc": "Reactive Capital Protection during ongoing Crisis 24: 2015 Oil Collapse & FX Cap"}, {"id": 57, "start": "2016-01-17", "end": "2016-01-27", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -0.81, "mfe": 7.67, "opp": 1.76, "desc": "Hard False Alarm (MAE25: -0.81%, OppCost: 1.76%)"}, {"id": 58, "start": "2016-03-07", "end": "2016-03-16", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": 0.0, "mfe": 22.3, "opp": 16.31, "desc": "Hard False Alarm (MAE25: 0.0%, OppCost: 16.31%)"}, {"id": 59, "start": "2016-04-27", "end": "2016-05-09", "dur": 7, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -6.24, "mfe": 0.0, "opp": -3.05, "desc": "Hard False Alarm (MAE25: -6.24%, OppCost: -3.05%)"}, {"id": 60, "start": "2018-02-07", "end": "2018-02-13", "dur": 5, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -2.04, "mfe": 12.98, "opp": 0.08, "desc": "Hard False Alarm (MAE25: -2.04%, OppCost: 0.08%)"}, {"id": 61, "start": "2018-05-03", "end": "2018-05-14", "dur": 8, "type": "NEAR_MISS", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -10.79, "mfe": 0.0, "opp": -6.54, "desc": "Near-Miss Sub-Threshold Correction (MAE25: -10.79%)"}, {"id": 62, "start": "2018-06-20", "end": "2018-07-02", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -5.93, "mfe": 1.95, "opp": 1.83, "desc": "Hard False Alarm (MAE25: -5.93%, OppCost: 1.83%)"}, {"id": 63, "start": "2018-08-12", "end": "2018-08-16", "dur": 5, "type": "STRICT_EARLY", "crisis_id": 25, "crisis_name": "Crisis 25: 2018 EM Contagion", "lead": 10, "mae": -10.51, "mfe": 1.72, "opp": -3.94, "desc": "Hit: Crisis 25: 2018 EM Contagion (10d early lead)"}, {"id": 64, "start": "2018-10-09", "end": "2018-10-18", "dur": 8, "type": "REACTIVE", "crisis_id": 25, "crisis_name": "Crisis 25: 2018 EM Contagion", "lead": -26, "mae": -4.47, "mfe": 1.67, "opp": 0.3, "desc": "Reactive Capital Protection during ongoing Crisis 25: 2018 EM Contagion"}, {"id": 65, "start": "2018-11-26", "end": "2018-12-04", "dur": 7, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -6.97, "mfe": 2.07, "opp": -4.02, "desc": "Hard False Alarm (MAE25: -6.97%, OppCost: -4.02%)"}, {"id": 66, "start": "2019-09-23", "end": "2019-10-02", "dur": 8, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -4.24, "mfe": 5.41, "opp": 3.03, "desc": "Hard False Alarm (MAE25: -4.24%, OppCost: 3.03%)"}, {"id": 67, "start": "2020-01-06", "end": "2020-01-13", "dur": 5, "type": "STRICT_EARLY", "crisis_id": 26, "crisis_name": "Crisis 26: 2020 COVID-19 Pandemic", "lead": 23, "mae": 0.0, "mfe": 6.78, "opp": 3.12, "desc": "Hit: Crisis 26: 2020 COVID-19 Pandemic (23d early lead)"}, {"id": 68, "start": "2020-03-01", "end": "2020-03-10", "dur": 8, "type": "REACTIVE", "crisis_id": 26, "crisis_name": "Crisis 26: 2020 COVID-19 Pandemic", "lead": -15, "mae": -28.36, "mfe": 1.61, "opp": -13.91, "desc": "Reactive Capital Protection during ongoing Crisis 26: 2020 COVID-19 Pandemic"}, {"id": 69, "start": "2022-02-24", "end": "2022-03-07", "dur": 8, "type": "STRICT_EARLY", "crisis_id": 27, "crisis_name": "Crisis 27: 2022 Ukraine War & Float", "lead": 19, "mae": -4.54, "mfe": 7.83, "opp": -5.31, "desc": "Hit: Crisis 27: 2022 Ukraine War & Float (19d early lead)"}, {"id": 70, "start": "2022-04-26", "end": "2022-05-12", "dur": 8, "type": "REACTIVE", "crisis_id": 27, "crisis_name": "Crisis 27: 2022 Ukraine War & Float", "lead": -22, "mae": -6.53, "mfe": 4.0, "opp": 1.24, "desc": "Reactive Capital Protection during ongoing Crisis 27: 2022 Ukraine War & Float"}, {"id": 71, "start": "2023-02-26", "end": "2023-03-02", "dur": 5, "type": "NEAR_MISS", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -14.71, "mfe": 0.0, "opp": -0.92, "desc": "Near-Miss Sub-Threshold Correction (MAE25: -14.71%)"}, {"id": 72, "start": "2024-02-28", "end": "2024-03-05", "dur": 5, "type": "STRICT_EARLY", "crisis_id": 28, "crisis_name": "Crisis 28: 2024 Post-Float Correction", "lead": 8, "mae": -6.9, "mfe": 15.6, "opp": 5.01, "desc": "Hit: Crisis 28: 2024 Post-Float Correction (8d early lead)"}, {"id": 73, "start": "2024-04-21", "end": "2024-04-28", "dur": 5, "type": "NEAR_MISS", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -14.58, "mfe": 0.0, "opp": -13.04, "desc": "Near-Miss Sub-Threshold Correction (MAE25: -14.58%)"}, {"id": 74, "start": "2025-04-10", "end": "2025-04-16", "dur": 5, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": 0.0, "mfe": 5.0, "opp": 3.16, "desc": "Hard False Alarm (MAE25: 0.0%, OppCost: 3.16%)"}, {"id": 75, "start": "2025-06-19", "end": "2025-06-25", "dur": 5, "type": "HARD_FALSE_ALARM", "crisis_id": null, "crisis_name": null, "lead": null, "mae": 0.0, "mfe": 14.23, "opp": 7.02, "desc": "Hard False Alarm (MAE25: 0.0%, OppCost: 7.02%)"}, {"id": 76, "start": "2026-02-26", "end": "2026-03-09", "dur": 8, "type": "NEAR_MISS", "crisis_id": null, "crisis_name": null, "lead": null, "mae": -8.18, "mfe": 0.0, "opp": -5.3, "desc": "Near-Miss Sub-Threshold Correction (MAE25: -8.18%)"}];
  let currentEpFilter = "ALL";
  let currentEpSearch = "";

  const epTableBody = document.getElementById("epTableBody");
  const epFilteredCount = document.getElementById("epFilteredCount");
  const epSearchInput = document.getElementById("epSearchInput");
  const epFilterBar = document.getElementById("epFilterBar");

  function renderEpisodeTable() {
    if (!epTableBody) return;
    const q = currentEpSearch.toLowerCase().trim();
    const filtered = C_V2_EPISODES.filter(ep => {
      // Filter check
      if (currentEpFilter === "STRICT_EARLY" && ep.type !== "STRICT_EARLY" && ep.type !== "EARLY_FRAGILITY_BUILDUP") return false;
      if (currentEpFilter === "REACTIVE" && ep.type !== "REACTIVE") return false;
      if (currentEpFilter === "NEAR_MISS" && ep.type !== "NEAR_MISS") return false;
      if (currentEpFilter === "HARD_FALSE_ALARM" && ep.type !== "HARD_FALSE_ALARM") return false;

      // Search check
      if (q) {
        const str = `${ep.id} ${ep.start} ${ep.end} ${ep.type} ${ep.crisis_name || ''} ${ep.desc || ''}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });

    epFilteredCount.textContent = `Showing ${filtered.length} of 76`;

    epTableBody.innerHTML = filtered.map(ep => {
      let bClass = "fe-b-good", bLbl = "Early Hit";
      if (ep.type === "EARLY_FRAGILITY_BUILDUP") { bClass = "fe-b-good"; bLbl = "Buildup Hit"; }
      else if (ep.type === "REACTIVE") { bClass = "fe-b-warn"; bLbl = "Reactive Protection"; }
      else if (ep.type === "NEAR_MISS") { bClass = "fe-b-warn"; bLbl = "Near-Miss (-11% avg)"; }
      else if (ep.type === "HARD_FALSE_ALARM") { bClass = "fe-b-alert"; bLbl = "Hard False Alarm"; }

      const maeClass = ep.mae <= -18.0 ? "color:var(--fe-down); font-weight:700;" : (ep.mae <= -8.0 ? "color:#D97706; font-weight:600;" : "color:var(--fe-faint);");
      const oppClass = ep.opp > 2.0 ? "color:var(--fe-down);" : (ep.opp < -2.0 ? "color:var(--fe-up); font-weight:600;" : "color:var(--fe-ink);");

      return `
        <tr>
          <td style="font-family:var(--fe-mono); font-size:0.75rem; color:var(--fe-faint);">#${ep.id}</td>
          <td style="font-family:var(--fe-mono); font-size:0.8rem; font-weight:600; color:var(--fe-ink);">${ep.start}</td>
          <td style="font-family:var(--fe-mono); font-size:0.8rem; color:var(--fe-t2);">${ep.end}</td>
          <td style="font-family:var(--fe-mono); font-size:0.78rem;">${ep.dur}d</td>
          <td><span class="fe-badge-metric ${bClass}">${bLbl}</span></td>
          <td style="font-size:0.82rem; color:var(--fe-ink);">${ep.crisis_name || ep.desc}</td>
          <td style="font-family:var(--fe-mono); font-size:0.82rem; ${maeClass}">${ep.mae.toFixed(2)}%</td>
          <td style="font-family:var(--fe-mono); font-size:0.82rem; ${oppClass}">${ep.opp >= 0 ? '+' : ''}${ep.opp.toFixed(2)}%</td>
        </tr>
      `;
    }).join("");
  }

  if (epFilterBar) {
    epFilterBar.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        epFilterBar.querySelectorAll("button").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        currentEpFilter = btn.dataset.filter;
        renderEpisodeTable();
      });
    });
  }

  if (epSearchInput) {
    epSearchInput.addEventListener("input", (e) => {
      currentEpSearch = e.target.value;
      renderEpisodeTable();
    });
  }

  renderEpisodeTable();


  // ═══════════════════════════════════════════════════════════════
  // SCENARIO LAB & WORLD MONITOR JAVASCRIPT LOGIC
  // ═══════════════════════════════════════════════════════════════
  let currentCapital = 100000;
  let wmPayload = null;
  let tradesPayload = null;
  let currentScenario = 'full';
  let currentStrategy = 'cv2_cash_sma';

  let currentLedgerSystem = 'cv2_cash_sma';
  let currentLedgerRegime = 'ALL';
  let currentLedgerType = 'ALL';
  let currentLedgerSearch = '';
  let ledgerPage = 1;
  const ledgerPageSize = 15;
  let ledgerShowAll = false;

  const wealthCanvas = document.getElementById('wealthCanvas');
  const wealthCanvasWrap = document.getElementById('wealthCanvasWrap');
  const wealthScrubberTooltip = document.getElementById('wealthScrubberTooltip');

  // Load authoritative World Monitor simulation dataset
  function loadWMData() {
    loadData('/esthmr/backtest/world_monitor_simulation_series.json')
      .catch(() => loadData('backtest/world_monitor_simulation_series.json'))
      .catch(() => loadData('/data/v1/backtest/world_monitor_simulation_series.json'))
      .catch(() => loadData('../data/v1/backtest/world_monitor_simulation_series.json'))
      .catch(() => loadData('data/v1/backtest/world_monitor_simulation_series.json'))
      .then(d => {
        wmPayload = d;
        initScenarioLab();
        updateStickyBar(d.latest_live);
        updateScenarioView();
      })
      .catch(err => {
        console.warn("Could not load world monitor simulation series:", err);
      });
  }
  loadWMData();

  // Load authoritative Executed Trades Ledger dataset
  function loadTradesData() {
    loadData('/esthmr/backtest/executed_trades_history.json')
      .catch(() => loadData('backtest/executed_trades_history.json'))
      .catch(() => loadData('/data/v1/backtest/executed_trades_history.json'))
      .catch(() => loadData('../data/v1/backtest/executed_trades_history.json'))
      .catch(() => loadData('data/v1/backtest/executed_trades_history.json'))
      .then(d => {
        tradesPayload = d;
        initTradesLedger();
        renderTradesLedger();
      })
      .catch(err => {
        console.warn("Could not load executed trades history:", err);
      });
  }
  loadTradesData();

  function initCapitalController() {
    const capInput = document.getElementById('simCapitalInput');
    const capPresetBtns = document.getElementById('capitalPresetButtons');
    const readoutEl = document.getElementById('readoutCapVal');
    const ledgerCapEl = document.getElementById('ledgerActiveCapitalDisplay');

    function setCapital(val) {
      if (!val || isNaN(val) || val <= 0) val = 100000;
      currentCapital = val;
      if (capInput) capInput.value = Math.round(val).toLocaleString('en-US');
      if (readoutEl) readoutEl.textContent = `${Math.round(val).toLocaleString('en-US')} EGP`;
      if (ledgerCapEl) ledgerCapEl.textContent = `${Math.round(val).toLocaleString('en-US')} EGP`;

      if (capPresetBtns) {
        capPresetBtns.querySelectorAll('.fe-btn-cap-preset').forEach(btn => {
          if (parseInt(btn.dataset.cap, 10) === Math.round(val)) {
            btn.classList.add('is-active');
          } else {
            btn.classList.remove('is-active');
          }
        });
      }

      updateScenarioView();
      renderTradesLedger();
    }

    if (capInput) {
      capInput.addEventListener('change', () => {
        const raw = capInput.value.replace(/[^0-9.]/g, '');
        const num = parseFloat(raw);
        setCapital(num);
      });
      capInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          capInput.blur();
        }
      });
    }

    if (capPresetBtns) {
      capPresetBtns.querySelectorAll('.fe-btn-cap-preset').forEach(btn => {
        btn.addEventListener('click', () => {
          const v = parseInt(btn.dataset.cap, 10);
          setCapital(v);
        });
      });
    }
  }

  function updateStickyBar(live) {
    if (!live) return;
    const tkPrice = document.getElementById('tkPrice');
    const tkFragility = document.getElementById('tkFragility');
    const tkFragilityBadge = document.getElementById('tkFragilityBadge');
    const tkWM = document.getElementById('tkWM');
    const tkWMSub = document.getElementById('tkWMSub');
    const tkHedge = document.getElementById('tkHedge');
    const tkAlloc = document.getElementById('tkAlloc');
    const tkVolBrake = document.getElementById('tkVolBrake');

    if (tkPrice) tkPrice.textContent = Number(live.price).toLocaleString('en-US', { minimumFractionDigits: 2 });
    if (tkFragility) tkFragility.textContent = live.s_v4.toFixed(4);
    if (tkFragilityBadge) {
      if (live.al_v2 === 1) {
        tkFragilityBadge.className = 'fe-ticker-badge fe-b-alert';
        tkFragilityBadge.textContent = 'ALERT (ACTIVE)';
      } else {
        tkFragilityBadge.className = 'fe-ticker-badge fe-b-good';
        tkFragilityBadge.textContent = 'NORMAL (< 0.930)';
      }
    }
    if (tkWM) tkWM.textContent = live.wm_p.toFixed(2);
    if (tkWMSub) tkWMSub.textContent = `Gold: ${live.gold_stress.toFixed(2)} · Oil: ${live.petrol_stress.toFixed(2)} · Vol: ${live.vol_stress.toFixed(2)}`;
    if (tkHedge) tkHedge.textContent = `${live.dynamic_hedge_p.toFixed(1)}%`;
    if (tkAlloc) tkAlloc.textContent = `${live.active_equity_exposure.toFixed(1)}% Equity · ${(100 - live.active_equity_exposure).toFixed(1)}% T-Bills`;
    if (tkVolBrake) tkVolBrake.textContent = `${live.vol20.toFixed(1)}%`;
  }

  function initScenarioLab() {
    if (!wmPayload) return;
    initCapitalController();

    // 1. Populate Crisis Audit Table
    const crisisTbody = document.getElementById('crisisAuditTableBody');
    if (crisisTbody && wmPayload.crises) {
      crisisTbody.innerHTML = wmPayload.crises.map(c => `
        <tr>
          <td style="font-family:var(--fe-mono); font-weight:700; color:var(--fe-accent);">${c.id}</td>
          <td style="font-family:var(--fe-mono); font-size:0.78rem;">${c.onset}</td>
          <td style="font-family:var(--fe-mono); color:var(--fe-down); font-weight:700;">${c.drawdown.toFixed(1)}%</td>
          <td><span class="fe-badge-metric fe-b-good">YES</span></td>
          <td style="font-family:var(--fe-mono);">${c.G.toFixed(2)}</td>
          <td style="font-family:var(--fe-mono);">${c.P.toFixed(2)}</td>
          <td style="font-family:var(--fe-mono);">${c.V.toFixed(2)}</td>
          <td style="font-family:var(--fe-mono); font-weight:700;">${c.WM.toFixed(2)}</td>
          <td style="font-family:var(--fe-mono); font-weight:700; color:var(--fe-accent);">${c.hedge.toFixed(1)}% hedge</td>
          <td style="font-size:0.78rem; color:var(--fe-t2);">${c.desc}</td>
        </tr>
      `).join('');
    }

    // 2. Scenario selector events
    const scenarioTabs = document.getElementById('scenarioTabs');
    if (scenarioTabs) {
      scenarioTabs.querySelectorAll('.fe-btn-scen').forEach(btn => {
        btn.addEventListener('click', () => {
          scenarioTabs.querySelectorAll('.fe-btn-scen').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          currentScenario = btn.dataset.scen;
          updateScenarioView();
        });
      });
    }

    // Crisis jump shortcuts
    document.querySelectorAll('.fe-btn-cr-jump').forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = btn.dataset.crisis;
        currentScenario = `crisis_${cid}`;
        scenarioTabs.querySelectorAll('.fe-btn-scen').forEach(b => b.classList.remove('is-active'));
        updateScenarioView();
      });
    });

    // 3. Strategy chips events
    const strategyChips = document.getElementById('strategyChips');
    if (strategyChips) {
      strategyChips.querySelectorAll('.fe-chip-strat').forEach(chip => {
        chip.addEventListener('click', () => {
          strategyChips.querySelectorAll('.fe-chip-strat').forEach(c => c.classList.remove('is-active'));
          chip.classList.add('is-active');
          currentStrategy = chip.dataset.strat;
          updateScenarioView();
        });
      });
    }

    // 4. World Monitor live sandbox sliders
    const slG = document.getElementById('wmSliderG');
    const slP = document.getElementById('wmSliderP');
    const slV = document.getElementById('wmSliderV');

    function updateWMSandbox() {
      if (!slG || !slP || !slV) return;
      const g = parseFloat(slG.value);
      const p = parseFloat(slP.value);
      const v = parseFloat(slV.value);

      document.getElementById('wmValG').textContent = g.toFixed(2);
      document.getElementById('wmValP').textContent = p.toFixed(2);
      document.getElementById('wmValV').textContent = v.toFixed(2);

      const wm = 0.45 * g + 0.35 * p + 0.20 * v;
      const hedge = (0.25 + 0.35 * wm) * 100.0;
      const allocEq = 100.0 - hedge;

      document.getElementById('wmSimHedgeVal').textContent = `${hedge.toFixed(1)}%`;
      document.getElementById('wmSimScoreVal').textContent = wm.toFixed(2);
      document.getElementById('wmSimAllocVal').textContent = `${allocEq.toFixed(1)}% Equity / ${hedge.toFixed(1)}% T-Bills`;

      let cls = "Moderate Shock (Isolated)";
      if (wm >= 0.80) cls = "Maximum Global Collapse (60% Hedge)";
      else if (wm >= 0.50) cls = "High Contagion Threat";
      else if (wm < 0.20) cls = "Low Drag (Domestic Wobble)";
      document.getElementById('wmSimClassVal').textContent = cls;
    }

    if (slG && slP && slV) {
      slG.addEventListener('input', updateWMSandbox);
      slP.addEventListener('input', updateWMSandbox);
      slV.addEventListener('input', updateWMSandbox);
      updateWMSandbox();
    }

    updateScenarioView();
  }

  function getScenarioIndices(scenKey) {
    if (!wmPayload || !wmPayload.timeline) return { start: 0, end: 0, name: "Full Sample" };
    const T = wmPayload.timeline.length;

    if (scenKey === 'full') return { start: 0, end: T - 1, name: "Full Sample (2008–2026 · 18.07Y · 4,518 Sessions)" };
    if (scenKey === 'block3') {
      const s = wmPayload.timeline.findIndex(row => row[0] >= "2020-01-01");
      return { start: s >= 0 ? s : 0, end: T - 1, name: "Block 3: Modern Historical R&D (2020–2026 · 6.48Y · 1,620 Sessions)" };
    }
    if (scenKey === 'block2') {
      const s = wmPayload.timeline.findIndex(row => row[0] >= "2015-01-01");
      const e = wmPayload.timeline.findIndex(row => row[0] > "2019-12-31");
      return { start: s >= 0 ? s : 0, end: e >= 0 ? e - 1 : T - 1, name: "Block 2: Floatation Bull Run (2015–2019 · 4.88Y · 1,219 Sessions)" };
    }
    if (scenKey === 'block1') {
      const e = wmPayload.timeline.findIndex(row => row[0] > "2014-12-31");
      return { start: 0, end: e >= 0 ? e - 1 : 1678, name: "Block 1: GFC & Arab Spring (2008–2014 · 6.72Y · 1,679 Sessions)" };
    }
    if (scenKey.startsWith('crisis_')) {
      const cid = scenKey.replace('crisis_', '');
      const cr = wmPayload.crises.find(c => c.id === cid);
      if (cr) {
        const onsIdx = wmPayload.timeline.findIndex(row => row[0] >= cr.onset);
        if (onsIdx >= 0) {
          const st = Math.max(0, onsIdx - 20);
          const en = Math.min(T - 1, onsIdx + 70);
          return { start: st, end: en, name: `Crisis Scenario: ${cr.name} (${cr.onset} · Drop ${cr.drawdown.toFixed(1)}%)` };
        }
      }
    }
    return { start: 0, end: T - 1, name: "Full Sample (2008–2026)" };
  }

  function getStratIndexInTimeline(stratKey) {
    // Columns: [0..21 existing, 22:w_cv2_cash_sma, 23:w_cv2_ladder, 24:cum_cv2_cash_sma, 25:cum_cv2_ladder]
    switch (stratKey) {
      case 'cv2_cash_sma': return { wIdx: 22, cumIdx: 24, name: "C-v2 Cash until SMA20 (+1M Return)" };
      case 'cv2_ladder': return { wIdx: 23, cumIdx: 25, name: "C-v2 Drawdown Ladder (+1M Return)" };
      case 'cv5_p': return { wIdx: 12, cumIdx: 19, name: "C-v5-P World Monitor (+110k Return)" };
      case 'cv5_eq': return { wIdx: 11, cumIdx: 18, name: "C-v5-EQ Neutral (33/33/33)" };
      case 'cv5_t': return { wIdx: 13, cumIdx: 20, name: "C-v5-T Tail Control (30/50/20)" };
      case 'cv4': return { wIdx: 10, cumIdx: 17, name: "C-v4 Canonical Vol Brake" };
      case 'cv3': return { wIdx: 9, cumIdx: 16, name: "C-v3 40% Base Hedge" };
      case 's100': return { wIdx: 14, cumIdx: 21, name: "S100 Binary 100% Exit" };
      default: return { wIdx: 22, cumIdx: 24, name: "C-v2 Cash until SMA20 (+1M Return)" };
    }
  }


  // Storyteller descriptions for average investors
  const SCENARIO_STORIES = {
    'full': {
      badge: "HISTORICAL REGIME STORY",
      title: "Full 18-Year History (2008–2026): The Complete Compounding Journey",
      desc: "Covers every major event in modern Egyptian economic history: the 2008 global banking crash, the 2011 Jan 25 revolution (exchange shut for 2 months), the 2016 currency floatation, the 2020 COVID crash, and the 2024 floatation to 50 EGP/USD. The strategy did not stop the deep crashes (-67.4% vs -71.6%), but disciplined partial hedging generated +110,438 EGP in extra net wealth and +68.8 bps of timing alpha beyond static T-bill carry."
    },
    'block3': {
      badge: "MODERN R&D BLOCK (2020–2026)",
      title: "Modern Shocks: COVID-19, Ukraine War, and Historic Currency Floatation",
      desc: "This 6.5-year period featured intense volatility: nationwide COVID lockdowns, global food/energy spikes from the Ukraine war, and the historic devaluation to 50 EGP/USD. Here, the World Monitor achieved its peak performance: +455.3 bps in net timing alpha, reducing the maximum crash from -38.64% down to just -25.86%."
    },
    'block2': {
      badge: "FLOATATION BULL RUN (2015–2019)",
      title: "The 2016 Devaluation Boom: The Essential Macro Counterweight",
      desc: "Following the November 2016 currency floatation, the Egyptian market launched into an aggressive multi-year bull market. In powerful non-stop bull runs, defensive hedging can incur slight friction drag. Notice how C-v4 leads every C-v5 model here (9.01% vs 8.58% CAGR) because its volatility brake stayed patient and avoided unnecessary hedging."
    },
    'block1': {
      badge: "CRISIS REGIME (2008–2014)",
      title: "GFC & Arab Spring: When Capital Preservation Meant Survival",
      desc: "The darkest, most dangerous era in Egyptian financial history: the 2008 Lehman collapse followed by the 2011 revolution where the exchange froze for nearly 60 days. Buy & Hold plunged -71.60% (100k became 28k). The strategy shifted up to 55% into Egyptian T-bills, though severe structural drops meant its overall worst drawdown still reached -67.40% (100k became ~33k)."
    },
    'crisis_C13': {
      badge: "CRISIS 13 DEEP DIVE",
      title: "2008 Lehman Brothers Crash: Global Banking Meltdown",
      desc: "Global financial crisis contagion hit Cairo. Foreign institutional funds dumped Egyptian shares indiscriminately, crashing the EGX 30 by -48.8%. The World Monitor detected extreme global contagion (WM = 0.85) and deployed a heavy 54.8% defensive T-bill shield, preserving capital while retail accounts were wiped out."
    },
    'crisis_C18': {
      badge: "CRISIS 18 DEEP DIVE",
      title: "January 25, 2011 Revolution: Exchange Shutdown for 2 Months",
      desc: "Mass political protests erupted in Cairo, forcing the Egyptian Exchange to halt all trading for nearly two full months. The fragility engine sounded 24 trading days BEFORE the revolution, allowing investors to move 43.9% of their portfolio safely into T-bills before the exchange doors closed."
    },
    'crisis_C26': {
      badge: "CRISIS 26 DEEP DIVE",
      title: "2020 COVID-19 Pandemic: Worldwide Lockdown Panic",
      desc: "The fastest global market crash in history as countries closed borders and halted trade. The EGX 30 plunged -22.1%. The engine sounded 23 days early, shifting 46.6% of capital into safe assets and avoiding the panic-selling that trapped everyday investors at the March 2020 bottom."
    },
    'crisis_C27': {
      badge: "CRISIS 27 DEEP DIVE",
      title: "2022 Ukraine War Shock & First Major Floatation Wave",
      desc: "Russia invaded Ukraine, causing global wheat and crude oil prices to explode. Because Egypt is the world's largest wheat importer, the economic strain was immediate. The World Monitor triggered its maximum global score (WM = 1.00) and deployed its highest 60.0% defensive shield."
    },
    'crisis_C28': {
      badge: "CRISIS 28 DEEP DIVE",
      title: "March 2024 Post-Floatation Correction: Devaluation to 50 EGP",
      desc: "Egypt floated the pound to ~50 EGP/USD and raised interest rates by 600 bps. The market initially spiked, then suffered a sharp -19.5% correction. The engine fired 8 days before the peak drop, deploying a 44.1% shield to lock in profits."
    }
  };

  function updateScenarioView() {
    const story = SCENARIO_STORIES[currentScenario] || SCENARIO_STORIES['full'];
    const sBadge = document.getElementById('storyBadge');
    const sTitle = document.getElementById('storyTitle');
    const sDesc = document.getElementById('storyDesc');
    if (sBadge) sBadge.textContent = story.badge;
    if (sTitle) sTitle.textContent = story.title;
    if (sDesc) sDesc.textContent = story.desc;
    if (!wmPayload) return;

    const scenRange = getScenarioIndices(currentScenario);
    const stratMeta = getStratIndexInTimeline(currentStrategy);

    // Update Title & Legend
    const chartTitle = document.getElementById('chartScenarioTitle');
    if (chartTitle) chartTitle.textContent = scenRange.name;
    const legStratName = document.getElementById('legStratName');
    if (legStratName) legStratName.textContent = stratMeta.name;

    // Names in KPI labels
    ['kpiStratNameWealth', 'kpiStratNameCagr', 'kpiStratNameDD'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = stratMeta.name;
    });

    // Update Wealth title with current capital
    const elWealthTitle = document.getElementById('kpiWealthTitle');
    if (elWealthTitle) {
      const capStr = currentCapital >= 1000000 ? (currentCapital / 1000000).toFixed(1) + 'M' : (currentCapital / 1000).toFixed(0) + 'k';
      elWealthTitle.textContent = `Ending Wealth (${capStr} EGP Start)`;
    }
    const elExplainerCap = document.getElementById('kpiExplainerCap');
    if (elExplainerCap) {
      elExplainerCap.textContent = `${Math.round(currentCapital).toLocaleString('en-US')} EGP`;
    }

    // Update KPIs from precomputed stats if standard block, or calculate dynamically for crisis zooms
    let statsBlock = null;
    if (['full', 'block3', 'block2', 'block1'].includes(currentScenario)) {
      statsBlock = wmPayload.scenarios_stats[currentScenario];
    }

    if (statsBlock) {
      const holdStats = statsBlock['hold'];
      const stratStats = statsBlock[currentStrategy];

      const wealthHold = (holdStats.wealth_100k / 100000.0) * currentCapital;
      const wealthStrat = (stratStats.wealth_100k / 100000.0) * currentCapital;
      const wealthDelta = wealthStrat - wealthHold;

      const holdProfitVal = wealthHold - currentCapital;
      const stratProfitVal = wealthStrat - currentCapital;

      const elHold = document.getElementById('kpiWealthHold');
      const elStrat = document.getElementById('kpiWealthStrat');
      const elHoldRet = document.getElementById('kpiHoldRetPct');
      const elStratRet = document.getElementById('kpiStratRetPct');
      const elWealthBadge = document.getElementById('kpiWealthBadge');

      if (elHold) elHold.textContent = `EGP ${Math.round(wealthHold).toLocaleString('en-US')}`;
      if (elStrat) elStrat.textContent = `EGP ${Math.round(wealthStrat).toLocaleString('en-US')}`;
      if (elHoldRet) elHoldRet.textContent = `${holdProfitVal >= 0 ? '+' : ''}${Math.round(holdProfitVal).toLocaleString('en-US')} EGP (${holdStats.cum_ret_pct >= 0 ? '+' : ''}${holdStats.cum_ret_pct.toFixed(1)}%)`;
      if (elStratRet) elStratRet.textContent = `${stratProfitVal >= 0 ? '+' : ''}${Math.round(stratProfitVal).toLocaleString('en-US')} EGP (${stratStats.cum_ret_pct >= 0 ? '+' : ''}${stratStats.cum_ret_pct.toFixed(1)}%)`;
      if (elWealthBadge) {
        elWealthBadge.textContent = `${wealthDelta >= 0 ? '+' : ''}${Math.round(wealthDelta).toLocaleString('en-US')} EGP Edge`;
        elWealthBadge.className = wealthDelta >= 0 ? 'fe-badge-metric fe-b-good' : 'fe-badge-metric fe-b-alert';
      }

      document.getElementById('kpiCagrHold').textContent = `${holdStats.cagr.toFixed(2)}%`;
      document.getElementById('kpiCagrStrat').textContent = `${stratStats.cagr.toFixed(2)}%`;
      const cagrDelta = (stratStats.cagr - holdStats.cagr) * 100.0;
      document.getElementById('kpiCagrBadge').textContent = `${cagrDelta >= 0 ? '+' : ''}${cagrDelta.toFixed(0)} bps/yr`;
      document.getElementById('kpiCagrBadge').className = cagrDelta >= 0 ? 'fe-badge-metric fe-b-good' : 'fe-badge-metric fe-b-alert';

      document.getElementById('kpiDDHold').textContent = `${holdStats.max_dd.toFixed(2)}%`;
      document.getElementById('kpiDDStrat').textContent = `${stratStats.max_dd.toFixed(2)}%`;
      const ddSaved = stratStats.dd_saved_pts;
      document.getElementById('kpiDDBadge').textContent = `${ddSaved >= 0 ? '+' : ''}${ddSaved.toFixed(2)} pts Saved`;
      document.getElementById('kpiDDBadge').className = ddSaved >= 0 ? 'fe-badge-metric fe-b-good' : 'fe-badge-metric fe-b-alert';

      const holdTroughVal = currentCapital * (1.0 + holdStats.max_dd / 100.0);
      const stratTroughVal = currentCapital * (1.0 + stratStats.max_dd / 100.0);
      const elHoldSub = document.getElementById('kpiDDHoldSub');
      const elStratSub = document.getElementById('kpiDDStratSub');
      if (elHoldSub) elHoldSub.textContent = `trough: EGP ${Math.round(holdTroughVal).toLocaleString('en-US')}`;
      if (elStratSub) elStratSub.textContent = `trough: EGP ${Math.round(stratTroughVal).toLocaleString('en-US')}`;

      const timingAlpha = stratStats.timing_alpha_bps;
      document.getElementById('kpiAlphaBadge').textContent = `${timingAlpha >= 0 ? '+' : ''}${timingAlpha.toFixed(1)} bps Net`;
      document.getElementById('kpiAlphaBadge').className = timingAlpha >= 0 ? 'fe-badge-metric fe-b-good' : 'fe-badge-metric fe-b-alert';
      document.getElementById('kpiMeanEquity').textContent = `${stratStats.mean_equity_w.toFixed(1)}%`;
      document.getElementById('kpiCashPct').textContent = `${(100.0 - stratStats.mean_equity_w).toFixed(1)}% T-bills`;
      document.getElementById('kpiTurnover').textContent = `${stratStats.ann_turnover.toFixed(1)}%/yr`;
    } else {
      // Dynamic crisis zoom slice calculation
      const st = scenRange.start;
      const en = scenRange.end;
      const baseHold = wmPayload.timeline[st][15];
      const baseStrat = wmPayload.timeline[st][stratMeta.cumIdx];
      const endHold = wmPayload.timeline[en][15] / baseHold;
      const endStrat = wmPayload.timeline[en][stratMeta.cumIdx] / baseStrat;

      const wHold = currentCapital * endHold;
      const wStrat = currentCapital * endStrat;
      const wDelta = wStrat - wHold;

      const holdProfitVal = wHold - currentCapital;
      const stratProfitVal = wStrat - currentCapital;

      document.getElementById('kpiWealthHold').textContent = `EGP ${Math.round(wHold).toLocaleString('en-US')}`;
      document.getElementById('kpiWealthStrat').textContent = `EGP ${Math.round(wStrat).toLocaleString('en-US')}`;
      document.getElementById('kpiHoldRetPct').textContent = `${holdProfitVal >= 0 ? '+' : ''}${Math.round(holdProfitVal).toLocaleString('en-US')} EGP (${((endHold - 1) * 100).toFixed(1)}%)`;
      document.getElementById('kpiStratRetPct').textContent = `${stratProfitVal >= 0 ? '+' : ''}${Math.round(stratProfitVal).toLocaleString('en-US')} EGP (${((endStrat - 1) * 100).toFixed(1)}%)`;
      document.getElementById('kpiWealthBadge').textContent = `${wDelta >= 0 ? '+' : ''}${Math.round(wDelta).toLocaleString('en-US')} EGP Saved`;
      document.getElementById('kpiWealthBadge').className = wDelta >= 0 ? 'fe-badge-metric fe-b-good' : 'fe-badge-metric fe-b-alert';

      // Local min drawdown
      let minHoldDD = 0.0, minStratDD = 0.0, peakH = 1.0, peakS = 1.0;
      for (let k = st; k <= en; k++) {
        const valH = wmPayload.timeline[k][15] / baseHold;
        const valS = wmPayload.timeline[k][stratMeta.cumIdx] / baseStrat;
        if (valH > peakH) peakH = valH;
        if (valS > peakS) peakS = valS;
        const ddH = (valH - peakH) / peakH * 100.0;
        const ddS = (valS - peakS) / peakS * 100.0;
        if (ddH < minHoldDD) minHoldDD = ddH;
        if (ddS < minStratDD) minStratDD = ddS;
      }
      document.getElementById('kpiDDHold').textContent = `${minHoldDD.toFixed(1)}%`;
      document.getElementById('kpiDDStrat').textContent = `${minStratDD.toFixed(1)}%`;
      document.getElementById('kpiDDBadge').textContent = `+${(minStratDD - minHoldDD).toFixed(1)} pts Saved`;

      const holdTroughVal = currentCapital * (1.0 + minHoldDD / 100.0);
      const stratTroughVal = currentCapital * (1.0 + minStratDD / 100.0);
      const elHoldSub = document.getElementById('kpiDDHoldSub');
      const elStratSub = document.getElementById('kpiDDStratSub');
      if (elHoldSub) elHoldSub.textContent = `trough: EGP ${Math.round(holdTroughVal).toLocaleString('en-US')}`;
      if (elStratSub) elStratSub.textContent = `trough: EGP ${Math.round(stratTroughVal).toLocaleString('en-US')}`;
    }

    drawScenarioChart(scenRange, stratMeta);
  }

  function drawScenarioChart(scenRange, stratMeta) {
    if (!wealthCanvas || !wmPayload || !wmPayload.timeline) return;

    const rect = wealthCanvasWrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    wealthCanvas.width = rect.width * dpr;
    wealthCanvas.height = rect.height * dpr;
    const ctx = wealthCanvas.getContext('2d');
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const st = scenRange.start;
    const en = scenRange.end;
    const N = en - st + 1;
    if (N <= 1) return;

    const padL = 60, padR = 20, padT = 20, padB = 30;
    const gapM = 30;
    const pane1H = (H - padT - padB - gapM) * 0.70;
    const pane2H = (H - padT - padB - gapM) * 0.30;
    const pane1Top = padT;
    const pane1Bot = pane1Top + pane1H;
    const pane2Top = pane1Bot + gapM;
    const pane2Bot = pane2Top + pane2H;
    const plotW = W - padL - padR;

    const baseHold = wmPayload.timeline[st][15];
    const baseStrat = wmPayload.timeline[st][stratMeta.cumIdx];

    // Compute normalized wealth and drawdowns
    const wealthH = new Float64Array(N);
    const wealthS = new Float64Array(N);
    const ddH = new Float64Array(N);
    const ddS = new Float64Array(N);

    let maxW = currentCapital, minW = currentCapital;
    let peakH = currentCapital, peakS = currentCapital;
    let minDD = 0.0;

    for (let i = 0; i < N; i++) {
      const idx = st + i;
      const wh = currentCapital * (wmPayload.timeline[idx][15] / baseHold);
      const ws = currentCapital * (wmPayload.timeline[idx][stratMeta.cumIdx] / baseStrat);
      wealthH[i] = wh;
      wealthS[i] = ws;
      if (wh > maxW) maxW = wh;
      if (ws > maxW) maxW = ws;
      if (wh < minW) minW = wh;
      if (ws < minW) minW = ws;

      if (wh > peakH) peakH = wh;
      if (ws > peakS) peakS = ws;
      const d1 = (wh - peakH) / peakH * 100.0;
      const d2 = (ws - peakS) / peakS * 100.0;
      ddH[i] = d1;
      ddS[i] = d2;
      if (d1 < minDD) minDD = d1;
      if (d2 < minDD) minDD = d2;
    }

    maxW *= 1.05; minW = Math.max(0, minW * 0.95);
    minDD = Math.min(-15.0, minDD * 1.10);

    const getX = (i) => padL + (i / (N - 1)) * plotW;
    const getY1 = (w) => pane1Bot - ((w - minW) / (maxW - minW || 1)) * pane1H;
    const getY2 = (dd) => pane2Top + (dd / minDD) * pane2H;

    // 1. Shaded Alert Bands
    ctx.fillStyle = "rgba(163, 64, 47, 0.12)";
    let inAlert = false, alertStart = 0;
    for (let i = 0; i < N; i++) {
      const isAl = wmPayload.timeline[st + i][2] === 1;
      if (isAl && !inAlert) {
        inAlert = true; alertStart = i;
      } else if (!isAl && inAlert) {
        inAlert = false;
        const x1 = getX(alertStart), x2 = getX(i);
        ctx.fillRect(x1, pane1Top, Math.max(2, x2 - x1), pane1H + gapM + pane2H);
      }
    }
    if (inAlert) {
      const x1 = getX(alertStart), x2 = getX(N - 1);
      ctx.fillRect(x1, pane1Top, Math.max(2, x2 - x1), pane1H + gapM + pane2H);
    }

    // 2. Grid lines & Y-axis labels for Wealth Pane
    ctx.strokeStyle = "rgba(27, 25, 23, 0.07)";
    ctx.lineWidth = 1;
    ctx.font = "10px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#607487";
    ctx.textAlign = "right";

    const ySteps = 4;
    for (let step = 0; step <= ySteps; step++) {
      const val = minW + (step / ySteps) * (maxW - minW);
      const y = getY1(val);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
      const valStr = val >= 1000000 ? `${(val / 1000000).toFixed(2)}M` : `${(val / 1000).toFixed(0)}k`;
      ctx.fillText(`EGP ${valStr}`, padL - 8, y + 3);
    }

    // Grid lines for Drawdown Pane
    for (let ddVal of [0, minDD * 0.5, minDD]) {
      const y = getY2(ddVal);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
      ctx.fillText(`${ddVal.toFixed(0)}%`, padL - 8, y + 3);
    }

    // Pane 2 Label
    ctx.textAlign = "left";
    ctx.fillStyle = "#607487";
    ctx.fillText("UNDERWATER DRAWDOWN", padL + 4, pane2Top - 8);

    // 3. Draw Wealth Lines
    // Buy & Hold (Amber dashed)
    ctx.beginPath();
    ctx.strokeStyle = "#D97706";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 4]);
    for (let i = 0; i < N; i++) {
      const x = getX(i), y = getY1(wealthH[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Strategy Wealth (Teal solid)
    ctx.beginPath();
    ctx.strokeStyle = "#126B75";
    ctx.lineWidth = 2.4;
    for (let i = 0; i < N; i++) {
      const x = getX(i), y = getY1(wealthS[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 4. Draw Drawdowns
    // Hold DD
    ctx.beginPath();
    ctx.strokeStyle = "rgba(217, 119, 6, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    for (let i = 0; i < N; i++) {
      const x = getX(i), y = getY2(ddH[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Strategy DD
    ctx.beginPath();
    ctx.strokeStyle = "#235238";
    ctx.lineWidth = 1.8;
    for (let i = 0; i < N; i++) {
      const x = getX(i), y = getY2(ddS[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill Strategy DD
    ctx.lineTo(getX(N - 1), getY2(0));
    ctx.lineTo(getX(0), getY2(0));
    ctx.fillStyle = "rgba(35, 82, 56, 0.08)";
    ctx.fill();

    // X-Axis Date Labels
    ctx.fillStyle = "#607487";
    ctx.textAlign = "center";
    const xLabelsCount = Math.min(6, Math.floor(plotW / 90));
    for (let k = 0; k <= xLabelsCount; k++) {
      const idx = Math.floor((k / xLabelsCount) * (N - 1));
      const dt = wmPayload.timeline[st + idx][0];
      const x = getX(idx);
      ctx.fillText(dt, x, H - 8);
    }

    // Scrubber hover handling
    wealthCanvasWrap.onmousemove = function(e) {
      const mrect = wealthCanvasWrap.getBoundingClientRect();
      const mouseX = e.clientX - mrect.left;
      if (mouseX < padL || mouseX > padL + plotW) {
        wealthScrubberTooltip.style.display = 'none';
        return;
      }
      const ratio = (mouseX - padL) / plotW;
      const relIdx = Math.round(ratio * (N - 1));
      const absIdx = st + relIdx;
      const row = wmPayload.timeline[absIdx];

      const curHoldW = wealthH[relIdx];
      const curStratW = wealthS[relIdx];
      const deltaW = curStratW - curHoldW;
      const wEq = (row[stratMeta.wIdx] * 100).toFixed(1);
      const wHedge = ((1 - row[stratMeta.wIdx]) * 100).toFixed(1);

      wealthScrubberTooltip.style.display = 'block';
      wealthScrubberTooltip.style.left = `${Math.min(W - 220, Math.max(padL, mouseX - 100))}px`;
      wealthScrubberTooltip.style.top = `18px`;

      wealthScrubberTooltip.innerHTML = `
        <strong>${row[0]}</strong> · EGX 30: ${Number(row[1]).toLocaleString('en-US')}<br>
        Buy &amp; Hold: <span style="color:#FBBF24;">EGP ${Math.round(curHoldW).toLocaleString('en-US')}</span> (${ddH[relIdx].toFixed(1)}% DD)<br>
        ${stratMeta.name.split(' ')[0]}: <span style="color:#86CFD2;">EGP ${Math.round(curStratW).toLocaleString('en-US')}</span> (${ddS[relIdx].toFixed(1)}% DD)<br>
        Net Edge: <span style="color:${deltaW >= 0 ? '#4ADE80' : '#F87171'};">${deltaW >= 0 ? '+' : ''}${Math.round(deltaW).toLocaleString('en-US')} EGP</span><br>
        Allocation: ${wEq}% Equity / ${wHedge}% Cash<br>
        World Monitor: <b>WM=${row[4]}</b> (G:${row[5]} P:${row[6]} V:${row[7]})
      `;
    };

    wealthCanvasWrap.onmouseleave = function() {
      wealthScrubberTooltip.style.display = 'none';
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // HISTORICAL EXECUTED TRADES LEDGER LOGIC
  // ═══════════════════════════════════════════════════════════════
  function initTradesLedger() {
    const tabsContainer = document.getElementById('tradesSystemTabs');
    if (tabsContainer) {
      tabsContainer.querySelectorAll('.fe-btn-systab').forEach(btn => {
        btn.addEventListener('click', () => {
          tabsContainer.querySelectorAll('.fe-btn-systab').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          currentLedgerSystem = btn.dataset.sys;
          ledgerPage = 1;
          renderTradesLedger();
        });
      });
    }

    const regimeFilter = document.getElementById('tradeCrisisFilter');
    if (regimeFilter) {
      regimeFilter.addEventListener('change', (e) => {
        currentLedgerRegime = e.target.value;
        ledgerPage = 1;
        renderTradesLedger();
      });
    }

    const typeFilter = document.getElementById('tradeTypeFilter');
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        currentLedgerType = e.target.value;
        ledgerPage = 1;
        renderTradesLedger();
      });
    }

    const searchInput = document.getElementById('tradeSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentLedgerSearch = e.target.value.toLowerCase().trim();
        ledgerPage = 1;
        renderTradesLedger();
      });
    }

    const btnPrev = document.getElementById('btnPrevTradePage');
    const btnNext = document.getElementById('btnNextTradePage');
    const btnShowAll = document.getElementById('btnShowAllTrades');

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (ledgerPage > 1) {
          ledgerPage--;
          renderTradesLedger();
        }
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        ledgerPage++;
        renderTradesLedger();
      });
    }

    if (btnShowAll) {
      btnShowAll.addEventListener('click', () => {
        ledgerShowAll = !ledgerShowAll;
        btnShowAll.textContent = ledgerShowAll ? "Paginate (15 rows)" : "Show All Rows";
        ledgerPage = 1;
        renderTradesLedger();
      });
    }
  }

  function renderTradesLedger() {
    if (!tradesPayload || !tradesPayload.systems) return;

    const sysObj = tradesPayload.systems[currentLedgerSystem];
    if (!sysObj) return;

    // 1. Update Summary Strip based on currentCapital
    const endingVal = currentCapital * sysObj.final_multiplier;
    const netProfit = endingVal - currentCapital;
    const profitPct = (sysObj.final_multiplier - 1.0) * 100.0;

    const elEnding = document.getElementById('tsEndingWealth');
    const elMult = document.getElementById('tsWealthMult');
    const elProfit = document.getElementById('tsNetProfit');
    const elProfitPct = document.getElementById('tsProfitPct');
    const elCagr = document.getElementById('tsCagr');
    const elCagrEdge = document.getElementById('tsCagrEdge');
    const elMaxDD = document.getElementById('tsMaxDD');
    const elDDSaved = document.getElementById('tsDDSaved');
    const elCount = document.getElementById('tsTradeCount');
    const elAnn = document.getElementById('tsAnnualTrades');
    const elAlloc = document.getElementById('tsAllocation');
    const elTurn = document.getElementById('tsTurnover');

    if (elEnding) elEnding.textContent = `EGP ${Math.round(endingVal).toLocaleString('en-US')}`;
    if (elMult) elMult.textContent = `${sysObj.final_multiplier.toFixed(2)}x initial capital`;
    if (elProfit) elProfit.textContent = `${netProfit >= 0 ? '+' : ''}${Math.round(netProfit).toLocaleString('en-US')} EGP`;
    if (elProfitPct) elProfitPct.textContent = `${profitPct >= 0 ? '+' : ''}${profitPct.toFixed(1)}% cumulative gain`;
    if (elCagr) elCagr.textContent = `${sysObj.cagr.toFixed(2)}%`;
    if (elCagrEdge) {
      const edge = (sysObj.cagr - 9.71).toFixed(2);
      elCagrEdge.textContent = `${edge >= 0 ? '+' : ''}${edge}% / yr vs Buy & Hold`;
    }
    if (elMaxDD) elMaxDD.textContent = `${sysObj.max_dd.toFixed(2)}%`;
    if (elDDSaved) {
      const saved = (71.60 + sysObj.max_dd).toFixed(2);
      elDDSaved.textContent = `${saved >= 0 ? '+' : ''}${saved} pts protected vs -71.60%`;
    }
    if (elCount) elCount.textContent = sysObj.trade_count;
    if (elAnn) elAnn.textContent = `~${(sysObj.trade_count / 18.07).toFixed(1)} actions / year`;
    if (elAlloc) elAlloc.textContent = `${sysObj.mean_equity_pct.toFixed(1)}% Eq / ${sysObj.mean_cash_pct.toFixed(1)}% Cash`;
    if (elTurn) elTurn.textContent = `Turnover: ${sysObj.turnover_pct_yr.toFixed(1)}% / yr`;

    // 2. Filter Trades
    const allTrades = sysObj.trades || [];
    const filtered = allTrades.filter(t => {
      // Regime filter
      if (currentLedgerRegime !== 'ALL') {
        if (!t.crisis_context.includes(currentLedgerRegime)) return false;
      }
      // Action type filter
      if (currentLedgerType === 'DEFENSIVE') {
        if (!t.type.includes('EXIT') && !t.type.includes('HEDGE') && !t.type.includes('DE-RISK')) return false;
      } else if (currentLedgerType === 'OFFENSIVE') {
        if (!t.type.includes('BUY') && !t.type.includes('REENTER') && !t.type.includes('RECOVER') && !t.type.includes('TRANCHE') && !t.type.includes('ENTRY')) return false;
      }
      // Search query
      if (currentLedgerSearch) {
        const hay = `${t.trade_id} ${t.date} ${t.action} ${t.trigger} ${t.crisis_context}`.toLowerCase();
        if (!hay.includes(currentLedgerSearch)) return false;
      }
      return true;
    });

    // 3. Pagination Slicing
    const totalCount = filtered.length;
    let visibleTrades = filtered;
    const maxPages = Math.max(1, Math.ceil(totalCount / ledgerPageSize));
    if (ledgerPage > maxPages) ledgerPage = maxPages;

    if (!ledgerShowAll) {
      const startIdx = (ledgerPage - 1) * ledgerPageSize;
      const endIdx = Math.min(totalCount, startIdx + ledgerPageSize);
      visibleTrades = filtered.slice(startIdx, endIdx);
      const pageInfo = document.getElementById('tradesPageInfo');
      if (pageInfo) pageInfo.textContent = `Showing ${totalCount > 0 ? startIdx + 1 : 0}–${endIdx} of ${totalCount} actions (Page ${ledgerPage} of ${maxPages})`;
    } else {
      const pageInfo = document.getElementById('tradesPageInfo');
      if (pageInfo) pageInfo.textContent = `Showing all ${totalCount} actions`;
    }

    const btnPrev = document.getElementById('btnPrevTradePage');
    const btnNext = document.getElementById('btnNextTradePage');
    if (btnPrev) btnPrev.disabled = ledgerShowAll || ledgerPage <= 1;
    if (btnNext) btnNext.disabled = ledgerShowAll || ledgerPage >= maxPages;

    // 4. Render Rows
    const tbody = document.getElementById('executedTradesTbody');
    if (!tbody) return;

    if (visibleTrades.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:24px; color:var(--fe-faint);">No trades match the selected filter or search criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = visibleTrades.map(t => {
      const portVal = currentCapital * t.cum_mult;
      const profitPct = (t.cum_mult - 1.0) * 100.0;
      const eqVal = portVal * t.new_equity_w;
      const cashVal = portVal * t.new_cash_w;

      let bClass = 'badge-buy';
      if (t.type.includes('EXIT_ALL')) bClass = 'badge-panic';
      else if (t.type.includes('EXIT') || t.type.includes('DE-RISK')) bClass = 'badge-exit';
      else if (t.type.includes('HEDGE')) bClass = 'badge-hedge';
      else if (t.type.includes('TRANCHE')) bClass = 'badge-buy';

      let regimeBadge = `<span style="font-family:var(--fe-mono); font-size:0.72rem; color:var(--fe-faint);">Calm Tape</span>`;
      if (t.crisis_context && !t.crisis_context.includes('Normal')) {
        regimeBadge = `<span class="fe-trade-badge badge-hedge" style="font-size:0.65rem;">${t.crisis_context}</span>`;
      }

      const eqPct = (t.new_equity_w * 100).toFixed(0);
      const cashPct = (t.new_cash_w * 100).toFixed(0);
      const oldEqPct = (t.old_equity_w * 100).toFixed(0);

      return `
        <tr>
          <td style="font-family:var(--fe-mono); font-size:0.75rem; color:var(--fe-faint);">#${t.trade_id}</td>
          <td style="font-family:var(--fe-mono); font-size:0.8rem; font-weight:600; color:var(--fe-ink);">${t.date}</td>
          <td><span class="fe-trade-badge ${bClass}">${t.action}</span></td>
          <td style="font-size:0.78rem; color:var(--fe-ink); line-height:1.4;">${t.trigger}</td>
          <td>${regimeBadge}</td>
          <td style="font-family:var(--fe-mono); font-size:0.8rem; text-align:right;">${Number(t.price).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
          <td style="font-family:var(--fe-mono); font-size:0.74rem;">
            <span style="color:var(--fe-faint);">${oldEqPct}% &rarr;</span>
            <strong style="color:var(--fe-accent);">${eqPct}% Eq</strong> / ${cashPct}% Cash
          </td>
          <td style="font-family:var(--fe-mono); font-size:0.82rem; text-align:right; font-weight:700; color:var(--fe-ink);">
            EGP ${Math.round(portVal).toLocaleString('en-US')}<br>
            <small style="font-size:0.68rem; color:${profitPct >= 0 ? '#166534' : 'var(--fe-down)'};">${profitPct >= 0 ? '+' : ''}${profitPct.toFixed(1)}%</small>
          </td>
          <td style="font-family:var(--fe-mono); font-size:0.78rem; text-align:right; color:#235238;">
            EGP ${Math.round(eqVal).toLocaleString('en-US')}
          </td>
          <td style="font-family:var(--fe-mono); font-size:0.78rem; text-align:right; color:#0369A1;">
            EGP ${Math.round(cashVal).toLocaleString('en-US')}
          </td>
        </tr>
      `;
    }).join('');
  }

  window.addEventListener('resize', () => {
    if (wmPayload) {
      const scenRange = getScenarioIndices(currentScenario);
      const stratMeta = getStratIndexInTimeline(currentStrategy);
      drawScenarioChart(scenRange, stratMeta);
    }
  });


})();
