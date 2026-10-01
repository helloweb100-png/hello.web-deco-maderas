/* =====================================================================
   DECOMADERA BIGGRIS · Landing
   JS vanilla, sin dependencias. Sin listener de scroll de ventana:
   los efectos ligados al scroll corren en un solo bucle rAF que lee
   scrollY y solo toca los elementos visibles (IntersectionObserver).
   Animaciones solo con transform/opacity y variables CSS.
   ===================================================================== */
(() => {
  'use strict';

  clearTimeout(window.__failsafe);

  /* ---------- Configuración ---------- */
  const WA_NUMBER = '527223381746'; // +52 722 338 1746
  const WA_DEFAULT = 'Hola, vi su página de Decomadera Biggris y me gustaría solicitar una cotización.';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const hasIO = 'IntersectionObserver' in window;
  const REDUCE = reduceMotion.matches;
  const waUrl = (msg) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

  /** Observa elementos y ejecuta cb una sola vez cuando entran al viewport. */
  const once = (els, cb, opts) => {
    if (!hasIO) { els.forEach((el) => cb(el)); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        cb(en.target);
        io.unobserve(en.target);
      });
    }, opts);
    els.forEach((el) => io.observe(el));
  };

  /* =====================================================================
     MOTOR DE SCROLL
     - add(el, read): read(y, vh) se ejecuta cada frame en que cambia el scroll
       mientras el elemento esté cerca del viewport. Devuelve una función de
       escritura (o null). Todas las lecturas ocurren antes que las escrituras.
     - always(fn): trabajo barato de página completa (progreso, regla, nav).
     ===================================================================== */
  const engine = (() => {
    const items = new Map();
    const live = new Set();
    const always = [];
    const onResize = [];
    let lastY = -1;
    let dirty = true;
    let vh = window.innerHeight;
    let maxScroll = 1;

    const measure = () => {
      vh = window.innerHeight;
      maxScroll = Math.max(1, root.scrollHeight - vh);
      dirty = true;
    };

    const io = hasIO
      ? new IntersectionObserver((entries) => {
          entries.forEach((e) => { if (e.isIntersecting) live.add(e.target); else live.delete(e.target); });
          dirty = true;
        }, { rootMargin: '30% 0px 30% 0px' })
      : null;

    const add = (el, read) => { items.set(el, read); if (io) io.observe(el); else live.add(el); };

    const frame = () => {
      const y = window.scrollY;
      if (y !== lastY || dirty) {
        const dy = lastY < 0 ? 0 : y - lastY;
        dirty = false;
        always.forEach((fn) => fn(y, dy, maxScroll));
        const writes = [];
        live.forEach((el) => { const w = items.get(el)(y, vh); if (w) writes.push(w); });
        for (let i = 0; i < writes.length; i++) writes[i]();
        lastY = y;
      }
      requestAnimationFrame(frame);
    };

    window.addEventListener('resize', () => { measure(); onResize.forEach((fn) => fn()); });
    window.addEventListener('load', () => { measure(); onResize.forEach((fn) => fn()); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); onResize.forEach((fn) => fn()); });

    measure();
    requestAnimationFrame(frame);
    return { add, always: (fn) => always.push(fn), onResize: (fn) => onResize.push(fn), touch: () => { dirty = true; }, measure };
  })();

  /* ---------- WhatsApp: arma todos los enlaces con su mensaje ---------- */
  $$('a[data-wa]').forEach((a) => { a.href = waUrl(a.dataset.wa || WA_DEFAULT); });

  /* ---------- Texto: separa en palabras para reveals ---------- */
  const splitWords = (rootEl) => {
    let n = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((t) => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
            const o = document.createElement('span');
            const i = document.createElement('span');
            o.className = 'sw'; i.className = 'sw__i';
            i.style.setProperty('--i', n++);
            i.textContent = t;
            o.appendChild(i); frag.appendChild(o);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1) walk(ch);
      });
    };
    walk(rootEl);
  };

  /* ---------- Preloader de marca ---------- */
  const initLoader = () => {
    const loader = $('#loader');
    const release = () => { root.classList.remove('is-loading'); root.classList.add('is-ready'); $$('[data-split-now]').forEach((el) => el.classList.add('in')); };

    if (!loader || REDUCE) {
      if (loader) loader.remove();
      release();
      return;
    }

    const bar = $('#loaderBar');
    const pct = $('#loaderPct');
    const heroImg = $('#heroImg');
    const MIN = 1900;
    const MAX = 5200;
    const t0 = performance.now();
    let ready = false;
    let progress = 0;

    Promise.all([
      document.fonts ? document.fonts.ready : null,
      heroImg && heroImg.decode ? heroImg.decode().catch(() => {}) : null,
      document.readyState === 'complete' ? null : new Promise((r) => window.addEventListener('load', r, { once: true })),
    ]).then(() => { ready = true; });

    const finish = () => {
      bar.style.transform = 'scaleX(1)';
      pct.textContent = '100';
      loader.classList.add('is-out');
      setTimeout(release, 420);
      setTimeout(() => loader.remove(), 1700);
    };

    const tick = (now) => {
      const t = now - t0;
      const eased = 1 - Math.pow(1 - Math.min(t / MIN, 1), 3);
      const target = Math.min(eased, ready ? 1 : 0.9);
      progress += (target - progress) * 0.18;
      bar.style.transform = `scaleX(${progress.toFixed(3)})`;
      pct.textContent = String(Math.round(progress * 100));
      if ((ready && t >= MIN && progress > 0.985) || t > MAX) { finish(); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* ---------- Navegación: píldora, menú móvil, enlace activo con indicador ---------- */
  const initNav = () => {
    const nav = $('#nav');
    const sentinel = $('.nav-sentinel');
    const toggle = $('#navToggle');
    const menu = $('#menu');
    if (!nav) return;

    if (hasIO && sentinel) new IntersectionObserver(([e]) => nav.classList.toggle('is-stuck', !e.isIntersecting)).observe(sentinel);
    else nav.classList.add('is-stuck');

    // Menú móvil
    $$('li', menu).forEach((li, i) => li.style.setProperty('--k', i));
    const setMenu = (open) => {
      menu.classList.toggle('is-open', open);
      menu.inert = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      root.classList.toggle('menu-open', open);
      if (open) { nav.classList.remove('is-hidden'); $('a', menu).focus({ preventScroll: true }); }
    };
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 1100px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });

    // Se oculta al bajar y reaparece al subir
    if (!REDUCE) {
      engine.always((y, dy) => {
        if (menu.classList.contains('is-open')) return;
        if (y < 300 || dy < -4) nav.classList.remove('is-hidden');
        else if (dy > 4) nav.classList.add('is-hidden');
      });
    }

    // Enlace activo + indicador deslizante
    const wrap = $('.nav__links');
    const ind = $('.nav__ind');
    const links = new Map($$('.nav__links a').map((a) => [a.getAttribute('href').slice(1), a]));
    let current = null;
    const place = (a) => {
      if (!a || !wrap.offsetWidth) { ind.style.setProperty('--on', 0); return; }
      const wr = wrap.getBoundingClientRect();
      const r = a.getBoundingClientRect();
      ind.style.setProperty('--x', `${(r.left - wr.left).toFixed(1)}px`);
      ind.style.setProperty('--w', r.width.toFixed(1));
      ind.style.setProperty('--on', 1);
    };
    const setActive = (id) => {
      current = links.get(id) || null;
      links.forEach((a) => a.removeAttribute('aria-current'));
      if (current) current.setAttribute('aria-current', 'location');
      place(current);
    };
    links.forEach((a) => a.addEventListener('mouseenter', () => place(a)));
    wrap.addEventListener('mouseleave', () => place(current));
    engine.onResize(() => place(current));

    if (hasIO) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) setActive(en.target.id); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('main section[id]').forEach((s) => spy.observe(s));
    }
  };

  /* ---------- Tema bajo la regla (claro / oscuro / miel) + regla de carpintero ---------- */
  const initPageChrome = () => {
    if (hasIO) {
      const th = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const c = e.target.classList;
          root.dataset.theme = c.contains('theme-light') ? 'light' : c.contains('theme-honey') ? 'honey' : 'dark';
        });
      }, { rootMargin: '-50% 0px -50% 0px' });
      $$('.theme-dark, .theme-light, .theme-honey').forEach((s) => th.observe(s));
    }

    const progress = $('.progress');
    const ruler = $('#ruler');
    const mark = $('#rulerMark');
    const val = $('#rulerVal');
    let rulerH = ruler ? ruler.offsetHeight : 0;
    let lastCm = -1;
    engine.onResize(() => { rulerH = ruler ? ruler.offsetHeight : 0; });

    engine.always((y, dy, max) => {
      const p = clamp(y / max);
      if (progress) progress.style.setProperty('--sp', p.toFixed(4));
      if (mark && rulerH) {
        mark.style.transform = `translate3d(0, ${(p * rulerH).toFixed(1)}px, 0)`;
        const cm = Math.round(p * 190);
        if (cm !== lastCm) { lastCm = cm; val.textContent = String(cm); }
      }
    });
  };

  /* ---------- Reveals y titulares por palabra ---------- */
  const initReveal = () => {
    $$('[data-split]').forEach(splitWords);
    once($$('[data-reveal]'), (el) => el.classList.add('in'), { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    once($$('[data-split]:not([data-split-now])'), (el) => el.classList.add('in'), { threshold: 0.4 });
    once($$('#giant'), (el) => el.classList.add('in'), { threshold: 0.25 });
    $$('#giant span').forEach((s, i) => s.style.setProperty('--i', i));
  };

  /* ---------- Efectos ligados al scroll ---------- */
  const initScrollFx = () => {
    // Progreso de sección (--p): 'out' = cuánto ha salido (hero); por defecto = recorrido completo
    $$('[data-p]').forEach((el) => {
      const out = el.dataset.p === 'out';
      engine.add(el, (y, vh) => {
        const r = el.getBoundingClientRect();
        const p = out ? clamp(-r.top / r.height) : clamp((vh - r.top) / (vh + r.height));
        return () => el.style.setProperty('--p', p.toFixed(4));
      });
    });

    // Manifiesto: las palabras se iluminan al leer
    const words = $('[data-words]');
    if (words) {
      const list = words.textContent.trim().split(/\s+/);
      words.textContent = '';
      list.forEach((w, i) => {
        const s = document.createElement('span');
        s.className = 'w';
        s.style.setProperty('--i', i);
        s.textContent = w;
        words.appendChild(s);
        if (i < list.length - 1) words.appendChild(document.createTextNode(' '));
      });
      if (REDUCE) words.style.setProperty('--r', list.length + 1);
      else engine.add(words, (y, vh) => {
        const r = words.getBoundingClientRect();
        const p = clamp((vh * 0.85 - r.top) / (vh * 0.45 + r.height));
        return () => words.style.setProperty('--r', (p * (list.length + 1.5)).toFixed(2));
      });
    }
    if (REDUCE) return;

    // Parallax (--py). Se mide sin depender del propio transform para evitar realimentación.
    const centerY = (el) => {
      if (el.matches('.m-photo')) { const pr = el.offsetParent.getBoundingClientRect(); return pr.top + el.offsetTop + el.offsetHeight / 2; }
      if (el.matches('.cta__bg img')) { const r = el.parentElement.getBoundingClientRect(); return r.top + r.height / 2; }
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2;
    };
    $$('[data-parallax]').forEach((el) => {
      const f = parseFloat(el.dataset.parallax);
      const lim = el.matches('.shot') ? 0.055 : el.matches('.cta__bg img') ? 0.085 : 0;
      engine.add(el, (y, vh) => {
        let off = (centerY(el) - vh / 2) * -f;
        if (lim) { const m = el.offsetHeight * lim; off = clamp(off, -m, m); }
        return () => el.style.setProperty('--py', `${off.toFixed(1)}px`);
      });
    });

    // Tarjetas apiladas: la anterior se encoge y se oscurece cuando llega la siguiente
    const stack = $('#stack');
    if (stack) {
      const cards = $$('.scard', stack);
      let stuck = [];
      const readTops = () => { stuck = cards.map((c) => parseFloat(getComputedStyle(c).top) || 0); };
      readTops();
      engine.onResize(readTops);
      engine.add(stack, (y, vh) => {
        const tops = cards.map((c) => c.getBoundingClientRect().top);
        const ks = cards.map((c, i) => {
          if (i === cards.length - 1) return 0;
          return clamp((vh - tops[i + 1]) / Math.max(1, vh - stuck[i + 1]));
        });
        return () => cards.forEach((c, i) => c.style.setProperty('--k', (ks[i] + 0.35 * (ks[i + 1] || 0)).toFixed(3)));
      });
    }

    // Proceso: la línea se dibuja y los nodos se encienden
    const steps = $('#steps');
    if (steps) {
      const items = $$('.step', steps);
      engine.add(steps, (y, vh) => {
        const r = steps.getBoundingClientRect();
        const p = clamp((vh * 0.78 - r.top) / (r.height + vh * 0.25));
        return () => {
          steps.style.setProperty('--line', p.toFixed(4));
          items.forEach((s, i) => s.classList.toggle('is-on', p * 1.06 >= i / 3));
        };
      });
    }
  };

  /* ---------- Muebles a pedido: galería horizontal que se fija al hacer scroll ---------- */
  const initHPin = () => {
    const sec = $('[data-hpin]');
    const track = $('#hTrack');
    if (!sec || !track) return;
    const cards = $$('[data-hcard]');
    const wide = window.matchMedia('(min-width: 900px)');
    let pinned = false;
    let dist = 0;
    let cur = 0;

    const measure = () => {
      pinned = wide.matches && !REDUCE;
      sec.classList.toggle('is-pinned', pinned);
      if (!pinned) {
        sec.style.removeProperty('--dist');
        sec.style.removeProperty('--pin');
        cards.forEach((c) => { c.style.removeProperty('--cx'); c.style.removeProperty('--ax'); });
        track.tabIndex = 0;
        track.setAttribute('role', 'region');
        track.setAttribute('aria-label', 'Muebles a pedido, desliza para ver más');
      } else {
        track.removeAttribute('tabindex');
        track.removeAttribute('role');
        track.removeAttribute('aria-label');
        track.scrollLeft = 0;
        dist = Math.max(0, track.scrollWidth - window.innerWidth);
        sec.style.setProperty('--dist', `${dist}px`);
      }
      engine.measure();
    };
    measure();
    wide.addEventListener('change', measure);
    engine.onResize(measure);

    engine.add(sec, () => {
      if (!pinned || !dist) return null;
      const target = clamp(-sec.getBoundingClientRect().top / dist);
      cur += (target - cur) * 0.14;
      if (Math.abs(target - cur) > 0.0004) engine.touch(); else cur = target;
      const vw = window.innerWidth;
      const xs = cards.map((c) => { const r = c.getBoundingClientRect(); return clamp((r.left + r.width / 2 - vw / 2) / vw, -1, 1); });
      return () => {
        sec.style.setProperty('--pin', cur.toFixed(4));
        cards.forEach((c, i) => { c.style.setProperty('--cx', xs[i].toFixed(3)); c.style.setProperty('--ax', Math.abs(xs[i]).toFixed(3)); });
      };
    });

    // Modo normal (móvil/tablet): arrastre con mouse; el dedo desliza de forma nativa
    let down = false, moved = false, sx = 0, sl = 0;
    track.addEventListener('pointerdown', (e) => {
      if (pinned || e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; sx = e.clientX; sl = track.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('is-drag'); }
      if (moved) track.scrollLeft = sl - dx;
    });
    const end = () => { if (!down) return; down = false; setTimeout(() => track.classList.remove('is-drag'), 0); };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  };

  /* ---------- Hero: cambio de fotos con tablones + autoplay ---------- */
  const initHero = () => {
    const img = $('#heroImg');
    const wipe = $('#heroWipe');
    const nav = $('#slidesNav');
    const hero = $('#inicio');
    if (!img || !wipe || !nav) return;

    const slides = [
      { src: 'img/web/base-cama-madera-clasica-1280.webp', alt: 'Base de cama de madera clara con tablones y patas negras, iluminada con luz cálida' },
      { src: 'img/web/base-cama-madera-con-cajones-1280.webp', alt: 'Base de cama de madera clara con dos cajones abiertos al frente' },
      { src: 'img/web/bases-cama-individuales-madera-1280.webp', alt: 'Tres bases de cama individuales de madera frente a un muro de tablones' },
      { src: 'img/web/litera-madera-rustica-1280.webp', alt: 'Litera de madera rústica con escalera, colchones azules y cabecera tallada' },
    ];
    const buttons = $$('button', nav);
    const N = 7;
    const strips = Array.from({ length: N }, (_, i) => {
      const s = document.createElement('i');
      const b = document.createElement('b');
      s.style.setProperty('--i', i);
      s.style.setProperty('--n', N);
      s.appendChild(b);
      wipe.appendChild(s);
      return b;
    });

    const cache = new Map();
    const preload = (src) => {
      if (!cache.has(src)) {
        const im = new Image();
        im.src = src;
        cache.set(src, im.decode ? im.decode().catch(() => {}) : Promise.resolve());
      }
      return cache.get(src);
    };
    (window.requestIdleCallback || ((f) => setTimeout(f, 2500)))(() => slides.slice(1).forEach((s) => preload(s.src)));

    let cur = 0;
    let busy = false;
    const setImg = async (n) => {
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.src = slides[n].src;
      img.alt = slides[n].alt;
      if (img.decode) await img.decode().catch(() => {});
      cur = n;
    };

    const go = async (n) => {
      if (busy || n === cur) return;
      busy = true;
      await preload(slides[n].src);
      buttons.forEach((b, i) => b.setAttribute('aria-current', String(i === n)));
      if (REDUCE) { await setImg(n); busy = false; return; }
      strips.forEach((b) => { b.style.backgroundImage = `url("${slides[n].src}")`; });
      void wipe.offsetWidth;
      wipe.classList.add('run');
      setTimeout(async () => {
        await setImg(n);
        wipe.classList.add('no-t');
        wipe.classList.remove('run');
        void wipe.offsetWidth;
        wipe.classList.remove('no-t');
        busy = false;
      }, 1150 + (N - 1) * 70 + 80);
    };

    buttons.forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.i))));
    if (!REDUCE) nav.addEventListener('animationend', (e) => { if (e.animationName === 'slideFill') go((cur + 1) % slides.length); });

    // Pausa: hover/foco sobre el selector, hero fuera de pantalla o pestaña oculta
    let hovering = false, inView = true;
    const sync = () => nav.classList.toggle('is-paused', hovering || !inView || document.hidden);
    nav.addEventListener('pointerenter', () => { hovering = true; sync(); });
    nav.addEventListener('pointerleave', () => { hovering = false; sync(); });
    nav.addEventListener('focusin', () => { hovering = true; sync(); });
    nav.addEventListener('focusout', () => { hovering = false; sync(); });
    document.addEventListener('visibilitychange', sync);
    if (hasIO) new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }).observe(hero);
  };

  /* ---------- Hero: polvo de madera y chispas en la luz (canvas) ---------- */
  const initDust = () => {
    const canvas = $('#dust');
    const hero = $('#inicio');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');

    const sprite = (size, stops) => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      const r = size / 2;
      const gr = g.createRadialGradient(r, r, 0, r, r, r);
      stops.forEach(([o, col]) => gr.addColorStop(o, col));
      g.fillStyle = gr;
      g.fillRect(0, 0, size, size);
      return c;
    };
    const glow = sprite(64, [[0, 'rgba(255,222,165,1)'], [0.3, 'rgba(255,200,120,.5)'], [1, 'rgba(255,190,100,0)']]);
    const spark = sprite(32, [[0, 'rgba(255,250,228,1)'], [0.25, 'rgba(255,214,140,.9)'], [1, 'rgba(255,170,70,0)']]);

    let w = 0, h = 0, motes = [], sparks = [], raf = 0, last = 0, running = false;
    const mouse = { x: -9999, y: -9999 };
    const rand = (a, b) => a + Math.random() * (b - a);

    const seed = () => {
      const nM = clamp(Math.round((w * h) / 12000), 46, 130);
      const nS = clamp(Math.round(w / 15), 28, 90);
      motes = Array.from({ length: nM }, () => {
        const big = Math.random() < 0.16;
        return { x: rand(0, w), y: rand(0, h), s: big ? rand(18, 44) : rand(4, 12), vy: rand(0.08, 0.4), a: big ? rand(0.08, 0.2) : rand(0.25, 0.7), ph: rand(0, 6.28), z: rand(0.2, 1), ox: 0, oy: 0 };
      });
      sparks = Array.from({ length: nS }, () => ({ x: rand(0, w), y: rand(0, h), s: rand(3, 9), vy: rand(0.5, 1.5), a: rand(0.45, 1), ph: rand(0, 6.28), fl: rand(1.5, 4) }));
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (!running) draw(0, true);
    };

    const draw = (t, still) => {
      const dt = still ? 0 : Math.min((t - last) / 16.67, 3);
      last = t;
      ctx.clearRect(0, 0, w, h);
      const R = 150;
      const px = mouse.x > -999 ? (mouse.x - w / 2) * 0.025 : 0;

      for (const p of motes) {
        if (!still) {
          p.y -= p.vy * dt;
          p.x += (Math.sin(t * 0.0004 + p.ph) * 0.25 + 0.05) * dt;
          if (p.y < -p.s) { p.y = h + p.s; p.x = rand(0, w); }
          if (p.x > w + p.s) p.x = -p.s;
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < R * R && d2 > 1) { const d = Math.sqrt(d2); const f = (1 - d / R) * 2.4; p.ox += (dx / d) * f; p.oy += (dy / d) * f; }
          p.ox *= 0.93; p.oy *= 0.93;
        }
        ctx.globalAlpha = p.a * (0.65 + 0.35 * Math.sin(t * 0.0016 + p.ph));
        ctx.drawImage(glow, p.x + p.ox - px * p.z * 8 - p.s / 2, p.y + p.oy - p.s / 2, p.s, p.s);
      }
      for (const p of sparks) {
        if (!still) {
          p.y -= p.vy * dt;
          p.x += Math.sin(t * 0.002 + p.ph) * 0.5 * dt;
          if (p.y < -10) { p.y = h + 10; p.x = rand(0, w); }
        }
        const fade = clamp(p.y / (h * 0.4));
        ctx.globalAlpha = p.a * fade * (0.55 + 0.45 * Math.sin(t * 0.003 * p.fl + p.ph));
        ctx.drawImage(spark, p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t) => { draw(t, false); raf = requestAnimationFrame(loop); };
    const start = () => { if (running || REDUCE) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas); else window.addEventListener('resize', resize);
    if (REDUCE) return;

    hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });

    let inView = true;
    const sync = () => ((inView && !document.hidden) ? start() : stop());
    if (hasIO) new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }).observe(hero);
    document.addEventListener('visibilitychange', sync);
    start();
  };

  /* ---------- Botones magnéticos e inclinación 3D ---------- */
  const initPointerFx = () => {
    if (REDUCE || !finePointer.matches) return;

    const mags = $$('[data-magnetic]');
    let raf = 0, ev = null;
    document.addEventListener('pointermove', (e) => {
      ev = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        mags.forEach((el) => {
          const r = el.getBoundingClientRect();
          const dx = ev.clientX - (r.left + r.width / 2);
          const dy = ev.clientY - (r.top + r.height / 2);
          if (Math.hypot(dx, dy) < Math.max(r.width, r.height) * 0.9) el.style.translate = `${(dx * 0.28).toFixed(1)}px ${(dy * 0.4).toFixed(1)}px`;
          else if (el.style.translate) el.style.translate = '';
        });
      });
    }, { passive: true });

    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 7).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${(-((e.clientY - r.top) / r.height - 0.5) * 6).toFixed(2)}deg`);
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg'); });
    });
  };

  /* ---------- Contadores ---------- */
  const initCounters = () => {
    const nums = $$('[data-count]');
    if (!nums.length || REDUCE || !hasIO) return; // el HTML ya trae el valor final
    nums.forEach((n) => { n.textContent = '0'; });
    once(nums, (el) => {
      const end = Number(el.dataset.count);
      const dur = 1900;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = String(Math.round(end * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
  };

  /* ---------- Configurador de base ---------- */
  const initConfigurator = () => {
    const stage = $('.cfg__stage');
    const modelsEl = $('#cfgModels');
    const sizesEl = $('#cfgSizes');
    if (!stage || !modelsEl || !sizesEl) return;
    const imgs = $$('img', stage);
    const models = $$('[role="radio"]', modelsEl);
    const sizes = $$('[role="radio"]', sizesEl);
    const bed = $('#bedBed');
    const summary = $('#cfgSummary');
    const cta = $('#cfgCta');
    const badgeName = $('#cfgBadgeName');
    const badgeFinish = $('#cfgBadgeFinish');
    let mi = 0;
    let si = sizes.findIndex((b) => b.getAttribute('aria-checked') === 'true');

    const render = () => {
      const m = models[mi];
      const s = sizes[si];
      imgs.forEach((im, i) => im.classList.toggle('is-on', i === mi));
      models.forEach((b, i) => { b.setAttribute('aria-checked', String(i === mi)); b.tabIndex = i === mi ? 0 : -1; });
      sizes.forEach((b, i) => { b.setAttribute('aria-checked', String(i === si)); b.tabIndex = i === si ? 0 : -1; });
      bed.style.setProperty('--w', s.dataset.w);
      badgeName.textContent = m.dataset.name;
      badgeFinish.textContent = m.dataset.finish;
      summary.textContent = `${m.dataset.name}, medida ${s.dataset.size}.`;
      const msg = `Hola, me interesa: ${m.dataset.name}, medida ${s.dataset.size}, ${m.dataset.finish.toLowerCase()}. ¿Me pueden cotizar?`;
      cta.dataset.wa = msg;
      cta.href = waUrl(msg);
    };

    // Grupo de radios accesible: flechas mueven la selección
    const wire = (list, get, set) => list.forEach((b, i) => {
      b.addEventListener('click', () => { set(i); render(); });
      b.addEventListener('keydown', (e) => {
        const k = e.key;
        if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(k)) return;
        e.preventDefault();
        const n = (get() + (k === 'ArrowRight' || k === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
        set(n); render(); list[n].focus();
      });
    });
    wire(models, () => mi, (n) => { mi = n; });
    wire(sizes, () => si, (n) => { si = n; });
    render();
  };

  /* ---------- Galería: filtros + lightbox ---------- */
  const initGallery = () => {
    const shots = $$('.shot');
    const chips = $$('.chip[data-filter]');
    const dlg = $('#lightbox');
    if (!shots.length) return;

    chips.forEach((chip) => chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      chips.forEach((c) => { const on = c === chip; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
      let k = 0;
      shots.forEach((s) => {
        const show = f === 'all' || s.dataset.cat === f;
        s.hidden = !show;
        s.classList.remove('is-in');
        if (show) { s.style.setProperty('--k', k++); void s.offsetWidth; s.classList.add('is-in'); }
      });
      engine.measure();
    }));

    if (!dlg || typeof dlg.showModal !== 'function') return;
    const img = $('#lbImg');
    const cap = $('#lbCap');
    let list = [];
    let idx = 0;

    const show = (i) => {
      idx = (i + list.length) % list.length;
      const btn = list[idx];
      const alt = $('img', btn).alt;
      img.src = btn.dataset.full;
      img.alt = alt;
      cap.textContent = alt;
      [idx + 1, idx - 1].forEach((n) => { const b = list[(n + list.length) % list.length]; if (b) new Image().src = b.dataset.full; });
    };
    const open = (btn) => {
      list = shots.filter((s) => !s.hidden).map((s) => $('button', s));
      show(list.indexOf(btn));
      root.style.overflow = 'hidden';
      dlg.showModal();
    };
    shots.forEach((s) => $('button', s).addEventListener('click', (e) => open(e.currentTarget)));
    $('#lbClose').addEventListener('click', () => dlg.close());
    $('#lbPrev').addEventListener('click', () => show(idx - 1));
    $('#lbNext').addEventListener('click', () => show(idx + 1));
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => { root.style.overflow = ''; });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
    });
    let sx = 0;
    img.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    img.addEventListener('pointerup', (e) => {
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 50 && e.pointerType !== 'mouse') show(idx + (dx < 0 ? 1 : -1));
    });
  };

  /* ---------- FAQ (acordeón) ---------- */
  const initFaq = () => {
    const items = $$('.faq__item');
    if (!items.length) return;
    const set = (item, open) => {
      item.classList.toggle('is-open', open);
      $('.faq__q', item).setAttribute('aria-expanded', String(open));
    };
    items.forEach((item) => $('.faq__q', item).addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      items.forEach((i) => set(i, i === item ? open : false));
    }));
    set(items[0], true);
  };

  /* ---------- Testimonios ---------- */
  const initQuotes = () => {
    const wrap = $('#quotes');
    if (!wrap) return;
    const slides = $$('.quote', wrap);
    const tabs = $$('[role="tab"]', wrap);
    let cur = 0;
    const go = (i) => {
      cur = (i + slides.length) % slides.length;
      slides.forEach((s, n) => { s.classList.toggle('is-active', n === cur); s.setAttribute('aria-hidden', String(n !== cur)); });
      tabs.forEach((t, n) => t.setAttribute('aria-selected', String(n === cur)));
    };
    tabs.forEach((t, n) => t.addEventListener('click', () => go(n)));
    if (!REDUCE) wrap.addEventListener('animationend', (e) => { if (e.animationName === 'fill') go(cur + 1); });
  };

  /* ---------- Formulario: valida, arma el mensaje y abre WhatsApp ---------- */
  const initForm = () => {
    const form = $('#quoteForm');
    if (!form) return;
    const name = $('#f-name');
    const prod = $('#f-prod');
    const sizeField = $('#sizeField');
    const note = $('#formNote');

    const err = (input, msg) => {
      const out = $('#' + input.getAttribute('aria-describedby'));
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (out) out.textContent = msg || '';
    };
    const checks = {
      name: () => {
        if (name.value.trim().length < 2) { err(name, 'Escribe tu nombre para saber con quién hablamos.'); return false; }
        err(name, ''); return true;
      },
      prod: () => {
        if (!prod.value) { err(prod, 'Elige qué mueble te interesa.'); return false; }
        err(prod, ''); return true;
      },
    };
    name.addEventListener('input', () => { if (name.getAttribute('aria-invalid') === 'true') checks.name(); });
    prod.addEventListener('change', () => {
      if (prod.getAttribute('aria-invalid') === 'true') checks.prod();
      sizeField.hidden = !!prod.value && !/base|cama|litera/i.test(prod.value);
      engine.measure();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const okName = checks.name();
      const okProd = checks.prod();
      if (!okName || !okProd) { (okName ? prod : name).focus(); note.textContent = ''; return; }

      const data = new FormData(form);
      const lines = [`Hola, soy ${data.get('nombre').trim()}. Me gustaría solicitar una cotización.`, ''];
      lines.push(`*Producto:* ${data.get('producto')}`);
      if (!sizeField.hidden && data.get('medida')) lines.push(`*Medida:* ${data.get('medida')}`);
      if (data.get('acabado')) lines.push(`*Acabado:* ${data.get('acabado')}`);
      if (data.get('mensaje').trim()) lines.push(`*Comentarios:* ${data.get('mensaje').trim()}`);
      lines.push('', 'Te escribo desde tu página web.');

      const url = waUrl(lines.join('\n'));
      window.open(url, '_blank', 'noopener');
      note.innerHTML = 'Abrimos WhatsApp con tu mensaje listo. Si no se abrió, <a href="' + url + '" target="_blank" rel="noopener">toca aquí para enviarlo</a>.';
    });
  };

  /* ---------- Arranque ---------- */
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  initReveal();      // primero: separa los titulares antes de que se vean
  initLoader();
  initNav();
  initPageChrome();
  initScrollFx();
  initHPin();
  initHero();
  initDust();
  initPointerFx();
  initCounters();
  initConfigurator();
  initGallery();
  initFaq();
  initQuotes();
  initForm();
})();
