/* A read-only, vector-preserving explorer. No data fetching or session changes. */
export function zoomAt(state, next, point) {
  const scale = Math.max(1, Math.min(8, next));
  const ratio = scale / state.scale;
  return { scale, x: point.x - (point.x - state.x) * ratio,
    y: point.y - (point.y - state.y) * ratio };
}

export function boundView(state, width, height, contentWidth, contentHeight) {
  const axis = (offset, viewport, content) => content <= viewport
    ? (viewport - content) / 2 : Math.min(0, Math.max(viewport - content, offset));
  return { ...state, x: axis(state.x, width, contentWidth * state.scale),
    y: axis(state.y, height, contentHeight * state.scale) };
}

export function installChartViewer(root) {
  let active = null;
  const words = () => document.documentElement.lang === 'ar'
    ? ['استكشف بملء الشاشة', 'استكشف الرسم', 'إغلاق', 'تكبير', 'تصغير', 'إعادة الضبط', 'اسحب للتحريك · باعد بين إصبعين للتكبير · اضغط عنصراً لفتحه']
    : ['Explore full screen', 'Explore chart', 'Close', 'Zoom in', 'Zoom out', 'Reset', 'Drag to pan · Pinch or scroll to zoom · Select an item to open it'];
  function open(source, trigger) {
    if (active) active.close();
    const w = words();
    const dialog = document.createElement('dialog');
    dialog.className = 'chart-viewer';
    dialog.setAttribute('aria-label', w[1]);
    const header = document.createElement('header');
    const title = document.createElement('strong');
    title.textContent = source.dataset.chartTitle || w[1];
    header.append(title);
    const stage = document.createElement('div');
    stage.className = 'chart-viewer-stage';
    stage.tabIndex = 0;
    stage.setAttribute('aria-label', w[6]);
    const content = source.cloneNode(true);
    content.removeAttribute('data-chart-title');
    content.classList.add('chart-viewer-content');
    // Preserve all event bindings on the original; a deliberate click on its
    // copy closes the explorer before activating the corresponding original.
    const originals = [source, ...source.querySelectorAll('*')];
    const copies = [content, ...content.querySelectorAll('*')];
    const targets = new WeakMap();
    const ids = new Map(copies.filter(copy => copy.id).map((copy, i) => [copy.id, `chart-explorer-${i}`]));
    copies.forEach((copy, i) => {
      targets.set(copy, originals[i]);
      if (copy.id) copy.id = ids.get(copy.id);
      for (const attr of [...copy.attributes]) {
        let value = attr.value.replace(/url\(#([^)]*)\)/g, (all, id) => ids.has(id) ? `url(#${ids.get(id)})` : all);
        if ((attr.name === 'href' || attr.name === 'xlink:href') && ids.has(value.slice(1))) value = '#' + ids.get(value.slice(1));
        if (value !== attr.value) copy.setAttribute(attr.name, value);
      }
      copy.setAttribute('tabindex', '-1');
    });
    stage.append(content);
    const footer = document.createElement('footer');
    const status = document.createElement('output');
    status.setAttribute('aria-live', 'polite');
    const hint = document.createElement('p');
    hint.textContent = w[6];
    let state = { scale: 1, x: 0, y: 0 }, width = 0, height = 0;
    let baseWidth = 0, baseHeight = 0, fitScale = 1, moved = false;
    const pointers = new Map();
    const oldOverflow = document.body.style.overflow;
    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      observer.disconnect();
      dialog.close();
      dialog.remove();
      document.body.style.overflow = oldOverflow;
      active = null;
      if (trigger.isConnected) trigger.focus({ preventScroll: true });
    }
    function button(label, text, action, parent = footer) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = text; b.setAttribute('aria-label', label);
      b.addEventListener('click', action); parent.append(b); return b;
    }
    button(w[2], w[2] + ' ×', close, header);
    const minus = button(w[4], '−', () => zoom(state.scale / 1.4));
    footer.append(status);
    const plus = button(w[3], '+', () => zoom(state.scale * 1.4));
    button(w[5], w[5], reset);
    dialog.append(header, stage, footer, hint);
    document.body.append(dialog);
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    function paint() {
      state = boundView(state, width, height, baseWidth, baseHeight);
      content.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale * fitScale})`;
      status.textContent = Math.round(state.scale * 100) + '%';
      minus.disabled = state.scale <= 1; plus.disabled = state.scale >= 8;
      // Semantic scatter zoom: positions spread, but markers and labels stay
      // screen-sized. Ordinary maps/charts retain their existing behaviour.
      const points = [...content.querySelectorAll('[data-valuation-point]')];
      const occupied = [];
      for (const group of points) {
        group.querySelectorAll('[data-point-detail]').forEach(label => { label.style.display = 'none'; });
        const [x, y] = group.dataset.valuationPoint.split(',').map(Number);
        const svg = group.ownerSVGElement;
        const screenScale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
        if (!screenScale) continue;
        group.setAttribute('transform', `translate(${x} ${y}) scale(${1 / screenScale}) translate(${-x} ${-y})`);
        const labels = [...group.querySelectorAll('[data-point-label]')];
        labels.forEach(label => { label.style.display = ''; });
        const text = labels.find(label => label.tagName.toLowerCase() === 'text');
        if (!text) continue;
        const original = targets.get(text);
        // Full company names become useful only after the cluster opens up.
        text.textContent = state.scale >= 3 ? `${original.textContent} · ${group.dataset.companyName}` : original.textContent;
        const box = text.getBBox();
        const background = labels.find(label => label.tagName.toLowerCase() === 'rect');
        if (background) { background.setAttribute('x', box.x - 4); background.setAttribute('width', box.width + 8); }
        const rect = text.getBoundingClientRect(), viewport = stage.getBoundingClientRect();
        const visible = rect.right > viewport.left && rect.left < viewport.right && rect.bottom > viewport.top && rect.top < viewport.bottom;
        const overlaps = occupied.some(b => rect.left < b.right + 5 && rect.right + 5 > b.left && rect.top < b.bottom + 4 && rect.bottom + 4 > b.top);
        if (!visible || overlaps) labels.forEach(label => { label.style.display = 'none'; });
        else occupied.push(rect);
      }
    }
    function zoom(scale, point = { x: width / 2, y: height / 2 }) {
      state = zoomAt(state, scale, point); paint();
    }
    function reset() { state = { scale: 1, x: 0, y: 0 }; paint(); }
    function resize() {
      width = stage.clientWidth; height = stage.clientHeight;
      baseWidth = Math.max(720, width);
      content.style.width = baseWidth + 'px';
      baseHeight = content.offsetHeight;
      // At 100% the entire chart fits; zoom reveals the original vector detail.
      const fit = Math.min(width / baseWidth, height / baseHeight, 1);
      fitScale = fit;
      baseWidth *= fit; baseHeight *= fit;
      reset();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();
    const point = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const geometry = () => {
      const values = [...pointers.values()];
      const a = values[0], b = values[1] || a;
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) };
    };
    stage.addEventListener('wheel', e => {
      e.preventDefault(); zoom(state.scale * Math.exp(-e.deltaY * .002), point(e));
    }, { passive: false });
    stage.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      if (!pointers.size) moved = false;
      pointers.set(e.pointerId, point(e));
      if (pointers.size > 1) moved = true;
    });
    stage.addEventListener('pointermove', e => {
      if (!pointers.has(e.pointerId)) return;
      const previous = geometry();
      const p = point(e), old = pointers.get(e.pointerId);
      if (!moved && Math.hypot(p.x - old.x, p.y - old.y) < 5) return;
      moved = true;
      stage.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, p);
      const next = geometry();
      if (previous.distance && next.distance) state = zoomAt(state, state.scale * next.distance / previous.distance, previous);
      state.x += next.x - previous.x; state.y += next.y - previous.y;
      paint();
    });
    const release = e => pointers.delete(e.pointerId);
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', e => { moved = true; release(e); });
    // Touch starts with implicit capture on the tile. Its loss when we take
    // capture on the stage must not discard that still-active finger.
    stage.addEventListener('lostpointercapture', e => {
      if (e.target === stage && !stage.hasPointerCapture(e.pointerId)) release(e);
    });
    stage.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (moved) return;
      const original = targets.get(e.target);
      if (original && original !== source && original.isConnected &&
          (original.closest('button,a,[role="button"]') || getComputedStyle(original).cursor === 'pointer')) {
        close(); original.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    }, true);
    dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
    dialog.addEventListener('keydown', e => {
      if (['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        if (e.key === '+' || e.key === '=') zoom(state.scale * 1.4);
        else if (e.key === '-') zoom(state.scale / 1.4);
        else if (e.key === '0') reset();
        else { state.x += e.key === 'ArrowLeft' ? 60 : e.key === 'ArrowRight' ? -60 : 0;
          state.y += e.key === 'ArrowUp' ? 60 : e.key === 'ArrowDown' ? -60 : 0; paint(); }
      }
    });
    active = { source, close };
    stage.focus();
  }
  function decorate() {
    if (active && !active.source.isConnected) active.close();
    root.querySelectorAll('[data-chart-title]').forEach(source => {
      if (source.previousElementSibling?.classList.contains('chart-expand')) return;
      const trigger = document.createElement('button');
      trigger.className = 'chart-expand'; trigger.type = 'button';
      trigger.textContent = '⛶ ' + words()[0];
      trigger.addEventListener('click', () => open(source, trigger));
      source.before(trigger);
    });
  }
  const observer = new MutationObserver(decorate);
  observer.observe(root, { childList: true, subtree: true });
  decorate();
  return () => { observer.disconnect(); active?.close(); };
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('app');
  if (root) installChartViewer(root);
}
