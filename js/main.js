/* ============================================================
   ARKANUM · main.js
   Smooth scroll · Menu · Reveal · Text split · Liquid cursor
   Magnetic buttons · Form · Cursor · Year
   ============================================================ */
(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(pointer: fine)').matches;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  document.documentElement.classList.add('js');

  /* ============ SMOOTH SCROLL (inertia) ============ */
  let scrollTarget = scrollY, scrollCurrent = scrollY;
  let scrolling = false;

  const smoothEnabled = !RM && FINE && innerWidth > 900;

  if (smoothEnabled) {
    document.body.style.height = document.documentElement.scrollHeight + 'px';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = '0';

    addEventListener('scroll', () => { scrollTarget = scrollY; }, { passive: true });
    addEventListener('resize', () => { document.body.style.height = document.documentElement.scrollHeight + 'px'; });

    (function tick() {
      scrollCurrent = lerp(scrollCurrent, scrollTarget, 0.09);
      if (Math.abs(scrollTarget - scrollCurrent) < 0.5) scrollCurrent = scrollTarget;
      document.body.style.transform = `translate3d(0, ${-scrollCurrent}px, 0)`;
      requestAnimationFrame(tick);
    })();

    $$('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + scrollCurrent;
        scrollTarget = top - 60;
        history.replaceState(null, '', id);
      });
    });
  }

  /* ============ HEADER + PROGRESS ============ */
  const header = $('#siteHeader');
  const progress = $('#scrollProgress');
  const getScroll = () => smoothEnabled ? scrollCurrent : scrollY;

  const onHeader = () => {
    const y = getScroll();
    header.classList.toggle('solid', y > 40);
    const h = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
  };

  /* ============ MENU ============ */
  const burger = $('#burger');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('#mnav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  $('#mnav').addEventListener('click', e => { if (e.target === e.currentTarget) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false);
  });

  /* ============ HERO READY ============ */
  requestAnimationFrame(() => requestAnimationFrame(() =>
    document.documentElement.classList.add('is-ready')
  ));
  addEventListener('load', () => setTimeout(() =>
    document.documentElement.classList.add('is-ready'), 900
  ));

  /* ============ REVEAL OBSERVER ============ */
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); revealObs.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach(el => revealObs.observe(el));

  // Для text-split нужно отдельно отслеживать секции-родители
  const splitObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        $$('[data-split]', e.target).forEach(s => s.closest('[data-reveal],.section,.hero,main')?.classList.add('in-view'));
        e.target.classList.add('in-view');
        splitObs.unobserve(e.target);
      }
    });
  }, { threshold: .05 });
  $$('.section, .hero, .manifesto, .marquee-section').forEach(s => splitObs.observe(s));

  /* ============ TEXT SPLIT (по словам) ============ */
  $$('[data-split]').forEach(el => {
    const html = el.innerHTML;
    // Работаем только с текстом (без вложенных тегов кроме <em>)
    const parts = html.split(/(\s+)/);
    el.innerHTML = parts.map(part => {
      if (/^\s+$/.test(part)) return part;
      if (!part.trim()) return part;
      // Если part содержит тег (например <em>...</em>), оставляем как есть
      if (part.includes('<')) return part;
      return `<span class="word"><span class="word-in">${part}</span></span>`;
    }).join('');
  });

  /* ============ LIQUID CURSOR EFFECT ============ */
  const turb = $('#turb'), disp = $('#disp'), heroTitle = $('.hero-title');
  let mouseX = 0, mouseY = 0, mouseVX = 0, mouseVY = 0, lastMX = 0, lastMY = 0;
  let currentScale = 0, targetScale = 0;

  if (heroTitle && turb && disp && !RM) {
    addEventListener('mousemove', e => {
      mouseX = e.clientX; mouseY = e.clientY;
      const dx = mouseX - lastMX, dy = mouseY - lastMY;
      mouseVX = dx; mouseVY = dy;
      lastMX = mouseX; lastMY = mouseY;
      const speed = Math.sqrt(dx*dx + dy*dy);
      targetScale = clamp(speed * 1.8, 0, 40);
    });

    (function animateLiquid() {
      currentScale = lerp(currentScale, targetScale, 0.12);
      targetScale = lerp(targetScale, 0, 0.08);
      disp.setAttribute('scale', currentScale.toFixed(2));
      // Лёгкое колебание базовой частоты
      const t = performance.now() / 1000;
      const bx = 0.008 + Math.sin(t * 0.7) * 0.002;
      const by = 0.012 + Math.cos(t * 0.9) * 0.002;
      turb.setAttribute('baseFrequency', `${bx.toFixed(4)} ${by.toFixed(4)}`);
      requestAnimationFrame(animateLiquid);
    })();
  }

  /* ============ MAGNETIC BUTTONS ============ */
  if (FINE && !RM) {
    $$('[data-magnetic]').forEach(btn => {
      const inner = $('.btn-magnetic-in', btn);
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        btn.style.transform = `translate(${dx * 0.22}px, ${dy * 0.32}px)`;
        if (inner) inner.style.transform = `translate(${dx * 0.1}px, ${dy * 0.1}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
        if (inner) inner.style.transform = '';
      });
    });
  }

  /* ============ SCROLL HANDLER ============ */
  let ticking = false;
  const onScrollFrame = () => { onHeader(); ticking = false; };
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScrollFrame); }
  }, { passive: true });
  addEventListener('resize', onHeader);
  onHeader();

  /* ============ CURSOR ============ */
  if (FINE && !RM) {
    const dot = $('#cursorDot'), ring = $('#cursorRing'), label = $('#cursorLabel');
    document.documentElement.classList.add('has-cursor');
    let mx = -100, my = -100, rx = -100, ry = -100, lx = -100, ly = -100, visible = false;

    addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      if (!visible) { visible = true; rx = mx; ry = my; dot.style.opacity = ring.style.opacity = 1; }
      dot.style.transform = `translate(${mx - 2.5}px, ${my - 2.5}px)`;

      const t = e.target.closest('a,button,.work,[data-cursor-hover]');
      ring.classList.toggle('is-hover', !!t);

      // Label над works
      const work = e.target.closest('.work');
      if (work) {
        label.textContent = 'VIEW';
        label.classList.add('is-active');
        lx = mx + 30; ly = my + 30;
      } else {
        label.classList.remove('is-active');
      }
    });

    document.addEventListener('mouseleave', () => {
      dot.style.opacity = ring.style.opacity = 0; visible = false;
      label.classList.remove('is-active');
    });

    (function loop() {
      rx = lerp(rx, mx, 0.18);
      ry = lerp(ry, my, 0.18);
      lx = lerp(lx, mx + 30, 0.18);
      ly = lerp(ly, my + 30, 0.18);
      const half = ring.offsetWidth / 2;
      ring.style.transform = `translate(${rx - half}px, ${ry - half}px)`;
      label.style.transform = `translate(${lx}px, ${ly}px)`;
      requestAnimationFrame(loop);
    })();
  } else {
    $('#cursorDot')?.remove(); $('#cursorRing')?.remove(); $('#cursorLabel')?.remove();
  }

  /* ============ FORM ============ */
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

  /* ============ YEAR ============ */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();