/* ═══════════════════════════════════════════════════════════════
   THE BARBARIAN PROJECT — Liquid Glass
   Reveal on scroll · pointer glare · nav state · count-up
   ═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─── reveal on scroll ───────────────────────────────────────── */
  const reveals = document.querySelectorAll('.reveal');
  if (reduced) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        // gentle stagger for siblings entering together
        const group = e.target.parentElement;
        const peers = group ? [...group.querySelectorAll(':scope > .reveal')] : [e.target];
        const idx = Math.max(0, peers.indexOf(e.target));
        e.target.style.transitionDelay = Math.min(idx * 70, 350) + 'ms';
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => io.observe(el));
  }

  /* ─── nav scrolled state ─────────────────────────────────────── */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ─── pointer glare on tilt cards ────────────────────────────── */
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.card-tilt').forEach((card) => {
      card.addEventListener('pointermove', (ev) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((ev.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--my', ((ev.clientY - r.top) / r.height * 100) + '%');
      });
    });
  }

  /* ─── count-up stats ─────────────────────────────────────────── */
  const nums = document.querySelectorAll('.stat-num[data-count]');
  if (nums.length) {
    const countIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        countIO.unobserve(el);
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        if (reduced) { el.textContent = target + suffix; return; }
        const dur = 1100;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + (p === 1 ? suffix : '');
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    nums.forEach((n) => countIO.observe(n));
  }

  /* ─── subtle parallax on gradient orbs (mouse) ───────────────── */
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    const orbs = document.querySelectorAll('.orb');
    let raf = null;
    window.addEventListener('pointermove', (ev) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const dx = (ev.clientX / window.innerWidth - 0.5);
        const dy = (ev.clientY / window.innerHeight - 0.5);
        orbs.forEach((orb, i) => {
          const depth = (i + 1) * 8;
          orb.style.marginLeft = (dx * depth) + 'px';
          orb.style.marginTop = (dy * depth) + 'px';
        });
        raf = null;
      });
    }, { passive: true });
  }

  /* ─── guide topic filter ─────────────────────────────────────── */
  const chips = document.querySelectorAll('.gchip');
  const guides = document.querySelectorAll('.guide[data-cat]');
  if (chips.length && guides.length) {
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const filter = chip.dataset.filter;
        chips.forEach((c) => {
          const on = c === chip;
          c.classList.toggle('is-active', on);
          c.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        guides.forEach((g) => {
          g.classList.toggle('is-hidden', filter !== 'all' && g.dataset.cat !== filter);
        });
      });
    });
  }
})();
