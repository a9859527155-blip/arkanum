/* ============================================================
   ARKANUM · main.js (v2)
   Smooth scroll (Lenis-like, нативный скроллбар сохранён)
   Menu · Reveal · Text split · Liquid · Magnetic · Cursor · Form
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

  /* ---------- МЕНЮ (объявлено раньше использования) ---------- */
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

  /* ---------- SMOOTH SCROLL (Lenis-like) ----------
     Нативный скролл и скроллбар НЕ трогаем: колёсико перехватываем,
     целевую позицию догоняем через window.scrollTo + lerp. */
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

    // Пользователь потянул скроллбар / нажал клавиши — синхронизируемся
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

  /* ---------- TEXT SPLIT (безопасный, по DOM-узлам) ---------- */
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
        frag.append(wordWrap(node)); // <em> и пр. остаются целыми
      }
    });
    el.textContent = '';
    el.appendChild(frag);
  };
  $$('[data-split]').forEach(splitEl);

  /* Секции получают .in-view → слова внутри въезжают */
  const splitObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in-view'); splitObs.unobserve(e.target); }
    });
  }, { threshold: .05 });
  $$('.section, .hero, .manifesto, .marquee-section').forEach(s => splitObs.observe(s));

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

  /* ---------- CURSOR ---------- */
  if (FINE && !RM) {
    const dot = $('#cursorDot'), ring = $('#cursorRing'), label = $('#cursorLabel');
    document.documentElement.classList.add('has-cursor');
    let mx = -100, my = -100, rx = -100, ry = -100, lx = -100, ly = -100, visible = false;

    addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      if (!visible) { visible = true; rx = mx; ry = my; lx = mx; ly = my; dot.style.opacity = ring.style.opacity = 1; }
      dot.style.transform = `translate(${mx - 2.5}px, ${my - 2.5}px)`;
      const interactive = e.target.closest('a,button,.work,[data-cursor-hover],.exp-card,.principle');
      ring.classList.toggle('is-hover', !!interactive);
      label.classList.toggle('is-active', !!e.target.closest('.work'));
    });

    document.addEventListener('mouseleave', () => {
      dot.style.opacity = ring.style.opacity = 0;
      label.classList.remove('is-active');
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
    $('#cursorDot')?.remove(); $('#cursorRing')?.remove(); $('#cursorLabel')?.remove();
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