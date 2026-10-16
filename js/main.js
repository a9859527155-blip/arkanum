/* ============================================================
   ARKANUM · main.js (v3)
   Smooth scroll (Lenis-like) · Menu · Reveal · Text split · Text scramble
   Liquid · Magnetic · Cursor + Spotlight · 3D tilt · Horizontal scroll
   SVG Blob follow · Form
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

  /* ---------- ФОЛБЭКИ КАРТИНОК ---------- */
  $$('img[data-fb]').forEach(img => {
    img.addEventListener('error', () => {
      if (img.dataset.fbUsed) return;
      img.dataset.fbUsed = '1';
      img.src = img.dataset.fb;
    }, { once: true });
  });

  /* ---------- МЕНЮ ---------- */
  const burger = $('#burger');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('#mnav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  $('#mnav').addEventListener('click', e => { if (e.target === e.currentTarget) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false);
  });

  /* ---------- SMOOTH SCROLL (Lenis-like) ---------- */
  const smoothEnabled = !RM && FINE && innerWidth > 900;
  let target = scrollY, current = scrollY, maxScroll = 0;
  const measureMax = () => { maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight); };

  if (smoothEnabled) {
    document.documentElement.style.scrollBehavior = 'auto';
    measureMax();
    addEventListener('resize', measureMax);
    addEventListener('load', measureMax);

    addEventListener('wheel', (e) => {
      if (document.body.classList.contains('menu-open')) return;
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      target = clamp(target + delta, 0, maxScroll);
    }, { passive: false });

    addEventListener('scroll', () => {
      if (Math.abs(scrollY - current) > 2) { target = scrollY; current = scrollY; }
    }, { passive: true });

    (function tick() {
      current = lerp(current, target, 0.1);
      if (Math.abs(target - current) < .5) current = target;
      if (Math.abs(scrollY - current) >= .5) scrollTo(0, current);
      requestAnimationFrame(tick);
    })();

    $$('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const el = $(id);
        if (!el) return;
        e.preventDefault();
        target = clamp(el.getBoundingClientRect().top + scrollY - 70, 0, maxScroll);
        history.replaceState(null, '', id);
        if (document.body.classList.contains('menu-open')) setMenu(false);
      });
    });
  }

  /* ---------- HEADER + PROGRESS ---------- */
  const header = $('#siteHeader');
  const progress = $('#scrollProgress');
  const onHeader = () => {
    header.classList.toggle('solid', scrollY > 40);
    const h = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
  };
  let ticking = false;
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(() => { onHeader(); ticking = false; }); }
  }, { passive: true });
  addEventListener('resize', onHeader);
  onHeader();

  /* ---------- REVEAL OBSERVER ---------- */
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); revealObs.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach(el => revealObs.observe(el));

  /* ---------- TEXT SPLIT ---------- */
  const wordWrap = (node) => {
    const w = document.createElement('span'); w.className = 'word';
    const wi = document.createElement('span'); wi.className = 'word-in';
    wi.appendChild(node); w.appendChild(wi);
    return w;
  };
  const splitEl = (el) => {
    const nodes = [...el.childNodes];
    const frag = document.createDocumentFragment();
    nodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.append(document.createTextNode(part));
          else frag.append(wordWrap(document.createTextNode(part)));
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        frag.append(wordWrap(node));
      }
    });
    el.textContent = '';
    el.appendChild(frag);
  };
  $$('[data-split]').forEach(splitEl);

  const splitObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in-view'); splitObs.unobserve(e.target); }
    });
  }, { threshold: .05 });
  $$('.section, .hero, .manifesto, .marquee-section, .featured').forEach(s => splitObs.observe(s));

  /* ---------- TEXT SCRAMBLE (hero title) ----------
     Буквы появляются как случайные руны, потом декодируются в финальный текст */
  const RUNES = '✦◈⚘✺⍟❋✶✹✸❊⚹⚸☍☌';
  const scrambleEl = (el) => {
    const pool = el.dataset.scramble || RUNES;
    const final = el.textContent;
    const dur = 1400, start = performance.now();
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
    // запускаем scramble, когда элемент виден (после line-rise — он уже показан)
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { scrambleEl(el); obs.unobserve(el); }
      });
    }, { threshold: .4 });
    obs.observe(el);
  });

  /* ---------- LIQUID-ЭФФЕКТ ЗАГОЛОВКА ---------- */
  const turb = $('#turb'), disp = $('#disp'), heroTitle = $('.hero-title');
  let lastMX = 0, lastMY = 0, curScale = 0, tgtScale = 0;

  if (heroTitle && turb && disp && !RM) {
    addEventListener('mousemove', e => {
      const dx = e.clientX - lastMX, dy = e.clientY - lastMY;
      lastMX = e.clientX; lastMY = e.clientY;
      tgtScale = clamp(Math.sqrt(dx * dx + dy * dy) * 1.6, 0, 36);
    });
    (function animateLiquid() {
      curScale = lerp(curScale, tgtScale, 0.12);
      tgtScale = lerp(tgtScale, 0, 0.08);
      disp.setAttribute('scale', curScale.toFixed(2));
      const t = performance.now() / 1000;
      turb.setAttribute('baseFrequency',
        `${(0.008 + Math.sin(t * .7) * .002).toFixed(4)} ${(0.012 + Math.cos(t * .9) * .002).toFixed(4)}`);
      requestAnimationFrame(animateLiquid);
    })();
  }

  /* ---------- SVG BLOB — следует за курсором ---------- */
  const blobWrap = $('.hero-blob-wrap');
  const blobCircles = $$('.blob-circle');
  if (blobWrap && blobCircles.length && !RM) {
    let bx = 0, by = 0, tx = 0, ty = 0;
    addEventListener('mousemove', e => {
      const rect = blobWrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      // чем ближе курсор, тем сильнее blob тянется
      const dist = Math.sqrt(dx*dx + dy*dy);
      const maxDist = rect.width;
      const pull = clamp(1 - dist / maxDist, 0, 1);
      tx = dx * pull * 0.25;
      ty = dy * pull * 0.25;
    });
    (function tick() {
      bx = lerp(bx, tx, 0.08);
      by = lerp(by, ty, 0.08);
      blobCircles.forEach((c, i) => {
        const offset = (i + 1) * 0.35;
        const x = bx * offset;
        const y = by * offset;
        c.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      });
      requestAnimationFrame(tick);
    })();
  }

  /* ---------- 3D TILT на work cards ---------- */
  if (FINE && !RM) {
    $$('[data-tilt]').forEach(card => {
      const maxTilt = 6;
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;   // -0.5..0.5
        const py = (e.clientY - r.top) / r.height - 0.5;
        const rx = -py * maxTilt; // rotateX
        const ry = px * maxTilt;  // rotateY
        card.style.transform = `perspective(1200px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* ---------- ГОРИЗОНТАЛЬНЫЙ СКРОЛЛ (auto + drag + hover slowdown) ---------- */
  const hscroll = $('#hscroll'), htrack = $('#hscrollTrack');
  if (hscroll && htrack) {
    const SPEED = 0.6;        // px per frame (normal)
    const SPEED_HOVER = 0.15; // px per frame (when mouse over section)
    const SPEED_DRAG = 0;     // during drag
    let offset = 0;
    let speed = SPEED;
    let dragging = false, dragStartX = 0, dragStartOffset = 0;
    let halfWidth = 0;

    const measure = () => {
      // измеряем только «оригинальные» карточки (без клонов)
      const originals = $$('.hcard:not(.hcard-clone)', htrack);
      if (!originals.length) return;
      const last = originals[originals.length - 1];
      halfWidth = last.offsetLeft + last.offsetWidth;
    };
    measure();
    addEventListener('resize', measure);
    addEventListener('load', measure);

    // auto-scroll
    if (!RM) {
      (function tick() {
        offset -= speed;
        if (halfWidth && Math.abs(offset) >= halfWidth) {
          offset += halfWidth;
        }
        htrack.style.transform = `translate3d(${offset.toFixed(1)}px, 0, 0)`;
        requestAnimationFrame(tick);
      })();
    }

    // hover slowdown
    hscroll.addEventListener('mouseenter', () => { if (!dragging) speed = SPEED_HOVER; });
    hscroll.addEventListener('mouseleave', () => { if (!dragging) speed = SPEED; });

    // drag
    const startDrag = (clientX) => {
      dragging = true; speed = SPEED_DRAG;
      hscroll.classList.add('is-dragging');
      dragStartX = clientX;
      dragStartOffset = offset;
    };
    const moveDrag = (clientX) => {
      if (!dragging) return;
      const dx = clientX - dragStartX;
      offset = dragStartOffset + dx;
    };
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      hscroll.classList.remove('is-dragging');
      speed = SPEED_HOVER;
    };

    hscroll.addEventListener('mousedown', e => startDrag(e.clientX));
    addEventListener('mousemove', e => moveDrag(e.clientX));
    addEventListener('mouseup', endDrag);
    hscroll.addEventListener('touchstart', e => startDrag(e.touches[0].clientX), { passive: true });
    addEventListener('touchmove', e => moveDrag(e.touches[0].clientX), { passive: true });
    addEventListener('touchend', endDrag);
  }

  /* ---------- SPOTLIGHT CURSOR + обычный курсор ---------- */
  if (FINE && !RM) {
    const dot = $('#cursorDot'), ring = $('#cursorRing'), label = $('#cursorLabel'),
          spotlight = $('#spotlight');
    document.documentElement.classList.add('has-cursor');
    let mx = -100, my = -100, rx = -100, ry = -100, lx = -100, ly = -100, visible = false;

    addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      if (!visible) { visible = true; rx = mx; ry = my; lx = mx; ly = my; dot.style.opacity = ring.style.opacity = 1; }
      dot.style.transform = `translate(${mx - 2.5}px, ${my - 2.5}px)`;
      if (spotlight) {
        spotlight.style.setProperty('--mx', mx + 'px');
        spotlight.style.setProperty('--my', my + 'px');
      }
      const interactive = e.target.closest('a,button,.work,[data-cursor-hover],.exp-card,.principle,.hcard');
      ring.classList.toggle('is-hover', !!interactive);
      label.classList.toggle('is-active', !!e.target.closest('.work,.hcard'));
    });

    document.addEventListener('mouseleave', () => {
      dot.style.opacity = ring.style.opacity = 0;
      label.classList.remove('is-active');
      if (spotlight) spotlight.style.opacity = 0;
      visible = false;
    });

    (function loop() {
      rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      lx = lerp(lx, mx + 26, 0.16); ly = lerp(ly, my + 26, 0.16);
      const half = ring.offsetWidth / 2;
      ring.style.transform = `translate(${rx - half}px, ${ry - half}px)`;
      label.style.transform = `translate(${lx}px, ${ly}px)`;
      requestAnimationFrame(loop);
    })();
  } else {
    $('#cursorDot')?.remove(); $('#cursorRing')?.remove();
    $('#cursorLabel')?.remove(); $('#spotlight')?.remove();
  }

  /* ---------- MAGNETIC BUTTONS ---------- */
  if (FINE && !RM) {
    $$('[data-magnetic]').forEach(btn => {
      const inner = $('.btn-magnetic-in', btn);
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${dx * .22}px, ${dy * .32}px)`;
        if (inner) inner.style.transform = `translate(${dx * .1}px, ${dy * .1}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
        if (inner) inner.style.transform = '';
      });
    });
  }

  /* ---------- FORM ---------- */
  const form = $('#leadForm'), fName = $('#fName'), fEmail = $('#fEmail');
  const toastEl = $('#toast'); let toastT;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), 3000);
  };
  [fName, fEmail].forEach(i => i.addEventListener('input', () => i.closest('.field').classList.remove('invalid')));
  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true, firstBad = null;
    const check = (cond, input) => {
      const f = input.closest('.field');
      f.classList.toggle('invalid', !cond);
      if (!cond) { ok = false; if (!firstBad) firstBad = input; }
    };
    check(fName.value.trim().length >= 2, fName);
    check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fEmail.value.trim()), fEmail);
    if (!ok) { firstBad.focus(); return; }
    form.classList.add('sent');
    toast('Message received (demo mode)');
  });

  /* ---------- YEAR ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();