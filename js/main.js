/* ============================================================
   ARKANUM · main.js (v6)
   scrollRestoration=manual · event-driven smooth scroll (idle-safe)
   Index overlay · Folio band observer · Reveal · Split · Scramble
   Liquid · Tilt · Ritual · Ink cursor (core+pill) · Spotlight
   Img fallbacks: error ИЛИ таймаут 2.5s · Form · Year
   ============================================================ */
(() => {
  'use strict';
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  document.documentElement.classList.add('js');

  /* Браузер больше не дёргает скролл при загрузке */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ---------- IMG FALLBACKS: ошибка ИЛИ таймаут 2.5s ---------- */
  const wireFallback = (img) => {
    const swap = () => {
      if (img.dataset.fbUsed || !img.dataset.fb) return;
      img.dataset.fbUsed = '1';
      img.src = img.dataset.fb;
    };
    img.addEventListener('error', swap, { once: true });
    if (img.complete && img.naturalWidth === 0) { swap(); return; }
    setTimeout(() => { if (!img.complete || img.naturalWidth === 0) swap(); }, 2500);
  };
  $$('img[data-fb]').forEach(wireFallback);

  /* ---------- INDEX OVERLAY ---------- */
  const indexBtn = $('#indexBtn'), indexClose = $('#indexClose'), overlay = $('#indexOverlay');
  function setIndex(open) {
    document.body.classList.toggle('index-open', open);
    indexBtn.setAttribute('aria-expanded', String(open));
    overlay.setAttribute('aria-hidden', String(!open));
  }
  indexBtn.addEventListener('click', () => setIndex(true));
  indexClose.addEventListener('click', () => setIndex(false));
  $$('#indexOverlay a').forEach(a => a.addEventListener('click', () => setIndex(false)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('index-open')) setIndex(false);
  });

  /* ---------- SMOOTH SCROLL v6 (event-driven, idle-safe) ----------
     Пока анимации нет — scrollTo не вызывается вообще.
     Любой нативный скролл в простое усыновляется как текущая позиция. */
  const smoothEnabled = !RM && FINE && innerWidth > 900;
  let target = scrollY, current = scrollY, maxScroll = 0;
  let rafId = null, running = false;

  const measureMax = () => { maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight); };
  const sync = () => { target = current = scrollY; };

  const loop = () => {
    current = lerp(current, target, 0.12);
    if (Math.abs(target - current) < .5) {
      current = target;
      scrollTo(0, current);
      running = false; rafId = null;
      return;
    }
    scrollTo(0, current);
    rafId = requestAnimationFrame(loop);
  };
  const kick = () => { if (!running) { running = true; rafId = requestAnimationFrame(loop); } };
  const halt = () => { if (rafId) cancelAnimationFrame(rafId); rafId = null; running = false; };

  if (smoothEnabled) {
    document.documentElement.style.scrollBehavior = 'auto';
    measureMax();

    addEventListener('wheel', e => {
      if (document.body.classList.contains('index-open')) return;
      e.preventDefault();
      const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      target = clamp(target + d, 0, maxScroll);
      kick();
    }, { passive: false });

    addEventListener('scroll', () => {
      if (!running) { sync(); return; }
      if (Math.abs(scrollY - current) > 60) { halt(); sync(); }
    }, { passive: true });

    $$('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const el = $(id);
        if (!el) return;
        e.preventDefault();
        measureMax();
        target = clamp(el.getBoundingClientRect().top + scrollY - 70, 0, maxScroll);
        history.replaceState(null, '', id);
        kick();
      });
    });

    addEventListener('resize', () => { measureMax(); if (!running) sync(); });
    addEventListener('load', () => { measureMax(); if (!running) sync(); });
    if ('ResizeObserver' in window) new ResizeObserver(() => measureMax()).observe(document.body);
  } else {
    addEventListener('load', measureMax);
    addEventListener('resize', measureMax);
  }

  /* ---------- TOPBAR + PROGRESS ---------- */
  const progress = $('#scrollProgress');
  const onHeader = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
  };
  let ticking = false;
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(() => { onHeader(); ticking = false; }); }
  }, { passive: true });
  onHeader();

  /* ---------- FOLIO (центральная полоса) ---------- */
  const folioNow = $('#folioNow');
  const folioObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting && folioNow) folioNow.textContent = e.target.dataset.folio; });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  $$('[data-folio]').forEach(s => folioObs.observe(s));

  /* ---------- REVEAL ---------- */
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); revealObs.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach(el => revealObs.observe(el));

  /* ---------- TEXT SPLIT ---------- */
  const wordWrap = (node) => {
    const w = document.createElement('span'); w.className = 'word';
    const wi = document.createElement('span'); wi.className = 'word-in';
    wi.appendChild(node); w.appendChild(wi); return w;
  };
  const splitEl = (el) => {
    const frag = document.createDocumentFragment();
    [...el.childNodes].forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.append(document.createTextNode(part));
          else frag.append(wordWrap(document.createTextNode(part)));
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) frag.append(wordWrap(node));
    });
    el.textContent = ''; el.appendChild(frag);
  };
  $$('[data-split]').forEach(splitEl);
  const splitObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); splitObs.unobserve(e.target); } });
  }, { threshold: .05 });
  $$('.section, .hero, .manifesto, .deck-sec, .marquee-section, .contact').forEach(s => splitObs.observe(s));

  /* ---------- SCRAMBLE ---------- */
  const scrambleEl = (el) => {
    const pool = el.dataset.scramble || '✦⚘✺⍟❋✹';
    const final = el.textContent;
    const dur = 1300, start = performance.now();
    (function tick(now) {
      const p = clamp((now - start) / dur, 0, 1);
      const reveal = Math.floor(p * final.length);
      let out = final.slice(0, reveal);
      for (let i = reveal; i < final.length; i++) {
        const c = final[i];
        out += c === ' ' ? ' ' : pool[(Math.random() * pool.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  };
  $$('[data-scramble]').forEach(el => {
    const obs = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { if (!RM) scrambleEl(el); obs.unobserve(e); } });
    }, { threshold: .4 });
    obs.observe(el);
  });

  /* ---------- LIQUID ---------- */
  const turb = $('#turb'), disp = $('#disp'), heroTitle = $('.hp-title');
  let lmx = 0, lmy = 0, cs = 0, ts = 0;
  if (heroTitle && turb && disp && !RM) {
    addEventListener('mousemove', e => {
      const dx = e.clientX - lmx, dy = e.clientY - lmy;
      lmx = e.clientX; lmy = e.clientY;
      ts = clamp(Math.sqrt(dx*dx + dy*dy) * 1.5, 0, 34);
    });
    (function liq() {
      cs = lerp(cs, ts, .12); ts = lerp(ts, 0, .08);
      disp.setAttribute('scale', cs.toFixed(2));
      const t = performance.now() / 1000;
      turb.setAttribute('baseFrequency', `${(0.008 + Math.sin(t*.7)*.002).toFixed(4)} ${(0.012 + Math.cos(t*.9)*.002).toFixed(4)}`);
      requestAnimationFrame(liq);
    })();
  }

  /* ---------- 3D TILT ---------- */
  if (FINE && !RM) {
    $$('[data-tilt]').forEach(card => {
      const max = 4;
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5;
        const py = (e.clientY - r.top) / r.height - .5;
        card.style.transform = `perspective(1400px) rotateX(${(-py*max).toFixed(2)}deg) rotateY(${(px*max).toFixed(2)}deg)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------- RITUAL ACCORDION ---------- */
  $$('.ritual-item').forEach(item => {
    const btn = $('.ritual-row', item);
    btn.addEventListener('click', () => {
      const open = item.classList.contains('open');
      $$('.ritual-item.open').forEach(o => { if (o !== item) { o.classList.remove('open'); $('.ritual-row', o).setAttribute('aria-expanded','false'); } });
      item.classList.toggle('open', !open);
      btn.setAttribute('aria-expanded', String(!open));
    });
  });

  /* ---------- INK CURSOR (core + pill) + SPOTLIGHT ---------- */
  if (FINE && !RM) {
    const core = $('#cursorCore'), pill = $('#cursorPill'), spotlight = $('#spotlight');
    document.documentElement.classList.add('has-cursor');
    let mx = -100, my = -100, cx = -100, cy = -100, px = -100, py = -100;
    let visible = false, scale = 1, scaleT = 1;

    addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      if (!visible) { visible = true; cx = mx; cy = my; core.style.opacity = 1; }
      if (spotlight) {
        spotlight.style.setProperty('--mx', mx + 'px');
        spotlight.style.setProperty('--my', my + 'px');
      }
      const hot = e.target.closest('a,button,.deck-card,.ritual-row,.spec-row,.tenet,[data-cursor-hover]');
      scaleT = hot ? 3.4 : 1;
      const lbl = e.target.closest('[data-label]');
      if (lbl) { pill.textContent = lbl.dataset.label; pill.classList.add('on'); }
      else pill.classList.remove('on');
    });
    document.addEventListener('mouseleave', () => {
      visible = false;
      core.style.opacity = 0;
      pill.classList.remove('on');
    });

    (function loopCursor() {
      cx = lerp(cx, mx, .28); cy = lerp(cy, my, .28);
      scale = lerp(scale, scaleT, .18);
      core.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%) scale(${scale.toFixed(2)})`;
      px = lerp(px, mx + 30, .16); py = lerp(py, my + 30, .16);
      pill.style.transform = `translate(${px}px, ${py}px) translate(-50%,-50%)`;
      requestAnimationFrame(loopCursor);
    })();
  } else {
    $('#cursorCore')?.remove(); $('#cursorPill')?.remove(); $('#spotlight')?.remove();
  }

  /* ---------- FORM ---------- */
  const form = $('#leadForm'), fName = $('#fName'), fEmail = $('#fEmail');
  const toastEl = $('#toast'); let toastT;
  const toast = (m) => { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 3000); };
  [fName, fEmail].forEach(i => i.addEventListener('input', () => i.closest('.field').classList.remove('invalid')));
  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true, bad = null;
    const chk = (c, i) => { const f = i.closest('.field'); f.classList.toggle('invalid', !c); if (!c) { ok = false; bad = bad || i; } };
    chk(fName.value.trim().length >= 2, fName);
    chk(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fEmail.value.trim()), fEmail);
    if (!ok) { bad.focus(); return; }
    form.classList.add('sent');
    toast('Message received (demo mode)');
  });

  /* ---------- YEAR ---------- */
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
})();