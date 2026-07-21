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

  /* ─── first-visit choice: prompt or portfolio ────────────────── */
  const entryDialog = document.getElementById('entryDialog');
  if (entryDialog) {
    const choiceKey = 'barbarian-entry-choice';
    const rememberChoice = (choice) => {
      try { window.sessionStorage.setItem(choiceKey, choice); } catch (_) { /* storage may be blocked */ }
    };
    const closeEntry = (choice) => {
      rememberChoice(choice || 'explore');
      if (entryDialog.open && typeof entryDialog.close === 'function') entryDialog.close();
      else entryDialog.removeAttribute('open');
    };

    entryDialog.querySelectorAll('[data-entry-choice]').forEach((control) => {
      control.addEventListener('click', () => closeEntry(control.dataset.entryChoice));
    });
    entryDialog.addEventListener('cancel', () => rememberChoice('explore'));
    entryDialog.addEventListener('click', (event) => {
      if (event.target === entryDialog) closeEntry('explore');
    });

    let hasChoice = false;
    try { hasChoice = Boolean(window.sessionStorage.getItem(choiceKey)); } catch (_) { /* storage may be blocked */ }
    if (!hasChoice) {
      window.setTimeout(() => {
        if (typeof entryDialog.showModal === 'function') entryDialog.showModal();
        else entryDialog.setAttribute('open', '');
      }, reduced ? 0 : 550);
    }
  }

  /* ─── portable EGX prompt + clipboard actions ───────────────── */
  const promptTextEl = document.getElementById('automationPrompt');
  const copyScheduledButton = document.getElementById('copyScheduledPrompt');
  const copyPromptButton = document.getElementById('copyPromptOnly');
  const copyStatus = document.getElementById('copyStatus');

  if (promptTextEl && copyScheduledButton && copyPromptButton && copyStatus) {
    let automationPrompt = '';
    let statusTimer = null;
    copyScheduledButton.disabled = true;
    copyPromptButton.disabled = true;

    const setCopyStatus = (message, isError = false) => {
      window.clearTimeout(statusTimer);
      copyStatus.textContent = message;
      copyStatus.classList.toggle('is-error', isError);
      statusTimer = window.setTimeout(() => {
        copyStatus.textContent = '';
        copyStatus.classList.remove('is-error');
      }, 3200);
    };

    const copyText = async (text) => {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand('copy');
      helper.remove();
      if (!copied) throw new Error('Copy command failed');
    };

    fetch('egx-early-opportunity-monitor.txt')
      .then((response) => {
        if (!response.ok) throw new Error('Prompt file unavailable');
        return response.text();
      })
      .then((text) => {
        automationPrompt = text.trim();
        promptTextEl.textContent = automationPrompt;
        copyScheduledButton.disabled = false;
        copyPromptButton.disabled = false;
      })
      .catch(() => {
        promptTextEl.textContent = 'The prompt could not load here. Use “Download .txt” below to open the complete file.';
        setCopyStatus('Use the .txt download', true);
      });

    copyPromptButton.addEventListener('click', async () => {
      if (!automationPrompt) return;
      try {
        await copyText(automationPrompt);
        setCopyStatus('Prompt copied');
      } catch (_) {
        setCopyStatus('Copy failed — download the .txt', true);
      }
    });

    copyScheduledButton.addEventListener('click', async () => {
      if (!automationPrompt) return;
      const scheduleRequest = [
        'Create a standalone scheduled task that runs every day at 9:00 AM in the Africa/Cairo timezone.',
        'Use the prompt below for every run. Return each result in Scheduled and compare with previous reports when they are available.',
        '',
        automationPrompt
      ].join('\n');
      try {
        await copyText(scheduleRequest);
        setCopyStatus('Schedule + prompt copied');
      } catch (_) {
        setCopyStatus('Copy failed — download the .txt', true);
      }
    });
  }

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
