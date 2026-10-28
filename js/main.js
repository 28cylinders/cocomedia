// Loading screen: hold for the full ring animation on the first page of a visit,
// only briefly on later pages, and never longer than 3s even if a video is slow.
(() => {
  const pl = document.querySelector('.preloader');
  if (!pl) return;
  let seen = false;
  try { seen = sessionStorage.getItem('coco-loaded') === '1'; sessionStorage.setItem('coco-loaded', '1'); } catch (e) {}
  const start = performance.now(), minTime = seen ? 250 : 1300;
  let done = false;
  const finish = () => {
    if (done) return; done = true;
    setTimeout(() => {
      pl.classList.add('is-done');
      setTimeout(() => pl.remove(), 600);
    }, Math.max(0, minTime - (performance.now() - start)));
  };
  if (document.readyState === 'complete') finish(); else window.addEventListener('load', finish);
  setTimeout(finish, 3000);
})();

// Coco Media — shared site behavior
// No framework, no build step — plain JS to match the rest of the site.
// Oct 8: added scroll motion (reveals, title line masks, hero parallax,
// routes draw-in, word-by-word tagline, touch "active" service rows) and a
// hero video pause control. All motion is skipped for prefers-reduced-motion.

document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav: toggle, close on link tap or Escape
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
  }

  // Home page only: header starts transparent over the hero video, then
  // switches to the solid header once scrolled past the hero.
  if (document.body.classList.contains('page-home')) {
    const header = document.querySelector('.site-header');
    const hero = document.querySelector('.hero');
    if (header) {
      const threshold = () => (hero ? Math.max(hero.offsetHeight - 84, 40) : 40);
      const onScroll = () => {
        header.classList.toggle('is-scrolled', window.scrollY > threshold());
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
    }
  }

  // Hero video: pause button, and no autoplay for reduced-motion users
  const video = document.querySelector('.hero-video');
  const pauseBtn = document.querySelector('.hero-pause');
  if (video && pauseBtn) {
    const sync = () => {
      const paused = video.paused;
      pauseBtn.setAttribute('aria-pressed', String(paused));
      pauseBtn.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
    };
    pauseBtn.addEventListener('click', () => { video.paused ? video.play() : video.pause(); });
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    if (reduceMotion) { video.removeAttribute('autoplay'); video.pause(); }
    sync();
  }

  // Vimeo thumbnails for any element with data-vimeo-thumb (Home Featured Work).
  // oEmbed first (works for public + unlisted), legacy v2 API as fallback.
  // If both fail, the branded placeholder stays.
  document.querySelectorAll('[data-vimeo-thumb]').forEach(async (el) => {
    const id = el.dataset.vimeoThumb;
    const set = (src) => { if (src) { el.style.backgroundImage = `url("${src}")`; el.classList.add('has-img'); return true; } return false; };
    try {
      const r = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent('https://vimeo.com/' + id)}&width=960`);
      if (r.ok && set((await r.json()).thumbnail_url)) return;
    } catch (e) { /* try v2 */ }
    try {
      const r = await fetch(`https://vimeo.com/api/v2/video/${id}.json`);
      const d = await r.json();
      set(d[0]?.thumbnail_large || d[0]?.thumbnail_medium);
    } catch (e) { /* keep placeholder */ }
  });

  // Email: assembled here so the address never sits in the HTML for bots to scrape
  document.querySelectorAll('.js-email').forEach((a) => {
    const email = `${a.dataset.user}@${a.dataset.domain}`;
    a.href = `mailto:${email}`;
    a.textContent = email;
  });
  document.querySelectorAll('.js-copy-email').forEach((btn) => {
    const email = `${btn.dataset.user}@${btn.dataset.domain}`;
    const status = btn.parentElement.querySelector('[role="status"]');
    if (!navigator.clipboard) return;
    btn.hidden = false;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(email);
        btn.textContent = 'Copied';
        if (status) status.textContent = 'Email address copied';
        setTimeout(() => { btn.textContent = 'Copy email'; if (status) status.textContent = ''; }, 2000);
      } catch (e) { /* clipboard blocked: the mailto link still works */ }
    });
  });

  // Logo strip pause/play
  document.querySelectorAll('.marquee-pause').forEach((btn) => {
    const strip = btn.closest('.logo-marquee');
    btn.addEventListener('click', () => {
      const paused = strip.classList.toggle('is-paused');
      btn.setAttribute('aria-pressed', String(paused));
      btn.setAttribute('aria-label', paused ? 'Play logo carousel' : 'Pause logo carousel');
    });
  });

  if (reduceMotion || !('IntersectionObserver' in window)) return;

  /* ---------- Motion ---------- */

  // Split a heading into masked lines (on <br>) so each line rises in
  const splitLines = (el, baseDelay = 0, step = 110) => {
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts
      .map((html, i) => `<span class="line-mask"><span style="--d:${baseDelay + i * step}ms">${html.trim()}</span></span>`)
      .join('');
  };

  // One-shot reveal observer
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealIO.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

  const reveal = (el, delay = 0, variant = '') => {
    if (!el || el.classList.contains('reveal')) return;
    el.classList.add('reveal');
    if (variant) el.classList.add(variant);
    el.style.setProperty('--d', `${delay}ms`);
    revealIO.observe(el);
  };

  // Hero: headline rises on load, then paragraph and button
  const heroTitle = document.querySelector('.hero h1');
  if (heroTitle) {
    const main = heroTitle.querySelector('.hero-title-main');
    if (main) {
      main.innerHTML = `<span class="line-mask"><span style="--d:150ms">${main.innerHTML}</span></span>`;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => heroTitle.classList.add('is-in')));
    reveal(document.querySelector('.hero-content p'), 450);
    reveal(document.querySelector('.hero-content .btn'), 600);
  }

  // Display titles (What We Do, Why Coco, Featured Work)
  document.querySelectorAll('.display-title').forEach((t) => {
    splitLines(t);
    revealIO.observe(t);
  });

  // Intros, rows, cards, CTAs
  document.querySelectorAll('.split-intro').forEach((intro) => {
    const kids = [...intro.children].filter((k) => !['SPAN', 'EM', 'STRONG', 'A', 'BR'].includes(k.tagName));
    if (kids.length) kids.forEach((child, i) => reveal(child, 150 + i * 90));
    else reveal(intro, 150);
  });
  document.querySelectorAll('.service-row').forEach((row, i) => reveal(row, (i % 3) * 120));
  document.querySelectorAll('.feature-card').forEach((card, i) => reveal(card, i * 110));
  document.querySelectorAll('.logo-marquee').forEach((m) => reveal(m, 0, 'reveal--fade'));
  document.querySelectorAll('.section-head .btn, .btn-dark-outline').forEach((b) => reveal(b, 200));
  document.querySelectorAll('#cta h2').forEach((h) => reveal(h));
  document.querySelectorAll('.routes-list li').forEach((li, i) => reveal(li, i * 90));
  document.querySelectorAll('.awards-stat, .awards-more').forEach((el, i) => reveal(el, i * 300));
  document.querySelectorAll('.awards-strip-list li').forEach((li, i) => reveal(li, 200 + i * 90));
  document.querySelectorAll('.hubs-copy > *').forEach((el, i) => reveal(el, i * 100));
  document.querySelectorAll('.hubs-map').forEach((m) => reveal(m, 150));
  document.querySelectorAll('.cta-contact').forEach((c) => reveal(c, 250));
  document.querySelectorAll('.footer-cols > *').forEach((el, i) => reveal(el, i * 80));
  document.querySelectorAll('.careers-row, .careers-copy, .careers-link').forEach((el, i) => reveal(el, i * 100));
  // Oct 15: About sections + editorial CTAs
  document.querySelectorAll('.diff-item').forEach((el, i) => reveal(el, (i % 2) * 120 + Math.floor(i / 2) * 80));
  document.querySelectorAll('.ed-eyebrow').forEach((el) => reveal(el, 0, 'reveal--fade'));
  document.querySelectorAll('.quote').forEach((el, i) => reveal(el, i ? 120 * i : 0));
  document.querySelectorAll('.founder-photo').forEach((el) => reveal(el, 0));
  document.querySelectorAll('.founder-copy > *').forEach((el, i) => reveal(el, 100 + i * 80));
  document.querySelectorAll('.cta-ed-body').forEach((el) => reveal(el, 180));
  document.querySelectorAll('.svc').forEach((el) => reveal(el, 0));
  document.querySelectorAll('.dl-wheel, .dl-list li, .svc-head .split-intro').forEach((el, i) => reveal(el, Math.min(i, 6) * 60));

  // Why Coco routes draw in when the chart comes into view
  const routes = document.querySelector('.routes');
  if (routes) {
    routes.classList.add('anim');
    routes.querySelectorAll('.route').forEach((p, i) => {
      p.setAttribute('pathLength', '1');
      p.style.setProperty('--d', `${i * 150}ms`);
    });
    const routesIO = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        routes.classList.add('is-in');
        routesIO.disconnect();
        setTimeout(() => routes.classList.add('movers-done'), 8000);
      }
    }, { threshold: 0.3 });
    routesIO.observe(routes);
  }

  // Tagline: wrap each word so it can light up as the section scrolls by
  const scrubTargets = [];
  document.querySelectorAll('#tagline-2 h2').forEach((h) => {
    const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((tok) => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
        const s = document.createElement('span');
        s.className = 'scrub-word';
        s.textContent = tok;
        frag.appendChild(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
    scrubTargets.push({ el: h, words: [...h.querySelectorAll('.scrub-word')] });
  });

  // Touch devices: the What We Do row crossing the middle of the screen is "active"
  if (window.matchMedia('(hover: none)').matches) {
    const rowIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('is-active', e.isIntersecting));
    }, { rootMargin: '-45% 0px -45% 0px' });
    document.querySelectorAll('.service-row').forEach((r) => rowIO.observe(r));
  }

  // Scroll-linked effects, batched into one animation frame
  const heroEl = document.querySelector('.hero');
  const heroContent = document.querySelector('.hero-content');
  const heroVideo = document.querySelector('.hero-video');
  let ticking = false;
  const onFrame = () => {
    ticking = false;
    const vh = window.innerHeight;

    if (heroEl && heroContent) {
      const h = heroEl.offsetHeight;
      const y = Math.min(Math.max(window.scrollY, 0), h);
      const p = y / h;
      heroContent.style.transform = `translate3d(0, ${y * 0.3}px, 0)`;
      heroContent.style.opacity = String(Math.max(1 - p * 1.4, 0));
      if (heroVideo) heroVideo.style.transform = `scale(${1 + p * 0.08})`;
    }

    scrubTargets.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      const center = r.top + r.height / 2;
      const start = vh * 0.85;
      const end = vh * 0.55;
      const p = Math.min(Math.max((start - center) / (start - end), 0), 1);
      const lit = p * words.length;
      words.forEach((w, i) => {
        const o = 0.6 + 0.4 * Math.min(Math.max(lit - i, 0), 1);
        w.style.setProperty('--o', o.toFixed(3));
      });
    });
  };
  const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } };
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame);
  onFrame();
});

// Founder photo flip on touch screens: plays each time the photo scrolls into view
(() => {
  const frame = document.querySelector('.founder-frame');
  if (!frame || window.matchMedia('(hover: hover)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  frame.addEventListener('animationend', () => frame.classList.remove('is-flipping'));
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) frame.classList.add('is-flipping');
  }, { threshold: 0.6 }).observe(frame);
})();

// Services > What We Deliver: hover or click a deliverable to open its bubble (rings pause)
(() => {
  const wheel = document.querySelector('.dl-wheel');
  if (!wheel) return;
  const data = [["Trailers", "The first look that decides whether they watch. Built to hook, in any language.", "Trailer"], ["Behind-the-Scenes", "The cast, the set, the story behind the story. Content that builds fans before the premiere.", "BTS Content"], ["Program Generics", "Always-on spots that keep a show top of mind between campaigns.", null], ["Sizzle Reels", "The fast, high-energy cut that sells a show, a slate, or a brand.", "Sizzle Reel"], ["Branded Entertainment", "Brand stories told like entertainment, so audiences watch them on purpose.", "Brand Content"], ["Sales Tapes", "Built for buyers: the pitch and the proof, cut to close the deal.", null], ["On-Air, Social + Digital", "Every cutdown, version, and format, from the linear break to the vertical feed.", null], ["Episodic + Topical Promos", "Week-to-week promos that bring audiences back for the next episode.", "Episodic Promo"], ["Brand Promos", "Network and platform spots that make the brand feel like a place.", null], ["Upfront Videos", "The showstopper for upfront season, made to win the room.", null], ["Sales Presentations", "Videos and decks that turn a slate into a story buyers can’t pass on.", null]];
  const bubble = wheel.querySelector('.dl-bubble');
  const cols = ['teal', 'violet', 'pink'];
  let locked = null;
  const show = (el) => {
    const [name, text, type] = data[+el.dataset.i];
    const col = [...el.classList].find((c) => c.startsWith('dl-item--')).replace('dl-item--', '');
    wheel.querySelectorAll('.dl-item.is-active').forEach((x) => x.classList.remove('is-active'));
    el.classList.add('is-active');
    bubble.className = `dl-bubble dl-bubble--${col}`;
    bubble.style.setProperty('--dl-bg', `var(--color-${col})`);
    bubble.querySelector('.dl-bubble-name').textContent = name;
    bubble.querySelector('.dl-bubble-text').textContent = text;
    bubble.querySelector('.dl-bubble-cta').innerHTML = type ? `<a class="dl-link" href="projects.html?type=${encodeURIComponent(type)}">See examples <span aria-hidden="true">→</span></a>` : '';
    bubble.hidden = false;
    wheel.classList.add('is-open');
  };
  const hide = () => {
    if (locked) return;
    wheel.classList.remove('is-open');
    wheel.querySelectorAll('.dl-item.is-active').forEach((x) => x.classList.remove('is-active'));
  };
  wheel.querySelectorAll('.dl-item').forEach((el) => {
    el.addEventListener('mouseenter', () => { if (!locked) show(el); });
    el.addEventListener('focus', () => show(el));
    el.addEventListener('click', (e) => { e.stopPropagation(); locked = locked === el ? null : el; show(el); if (!locked) hide(); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.dispatchEvent(new MouseEvent('click')); } });
  });
  wheel.addEventListener('mouseleave', hide);
  document.addEventListener('click', (e) => { if (!wheel.contains(e.target) || (!e.target.closest('.dl-item') && !e.target.closest('.dl-bubble'))) { locked = null; hide(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { locked = null; hide(); } });
})();

// About: Ferrari drives in from the right as the lead quote scrolls up, then drives off left
(() => {
  const car = document.querySelector('.quote-car');
  if (!car || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = car.closest('.quote--lead') || car.closest('section');
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = box.getBoundingClientRect(), vh = window.innerHeight;
    const t = (vh - r.top) / (vh + r.height); // 0 = section just entering, 1 = just left
    // one continuous drive: enters from the right edge, crosses, exits left. Never parks.
    const p = Math.min(1, Math.max(0, (t - 0.1) / 0.8));
    car.style.setProperty('--car-x', (40 - p * 140).toFixed(2));
    car.style.opacity = p <= 0 || p >= 1 ? 0 : Math.min(1, p * 6, (1 - p) * 6).toFixed(3);
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

// Reduced-motion: the logo strip becomes a scrollable row, so make it keyboard-reachable
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.logo-marquee').forEach((m) => { m.tabIndex = 0; m.setAttribute('role', 'region'); m.setAttribute('aria-label', 'Client logos, scrollable'); });
}

// Careers: "Get notified" opens an email with the subject filled in (address assembled here, never in the HTML)
document.querySelectorAll('[data-careers-mail]').forEach((a) => {
  a.href = `mailto:${'info'}@${'cocomedia.tv'}?subject=${encodeURIComponent('Careers: notify me')}&body=${encodeURIComponent('Name:\nWhat I do:\nLink to my work:\n')}`;
});

// Fit a headline to its full width on small screens (hero "Be Seen" < 900px, CTA headline < 761px)
(() => {
  const targets = [
    ...[...document.querySelectorAll('.hero-title-main')].map((el) => [el, 900]),
    ...[...document.querySelectorAll('.cta-ed-big')].map((el) => [el, 761]),
  ];
  if (!targets.length) return;
  const fit = () => targets.forEach(([el, bp]) => {
    el.style.fontSize = '';
    el.classList.remove('is-multiline');
    if (window.innerWidth >= bp) return;
    const box = el.parentElement.getBoundingClientRect().width;
    const r = document.createRange(); r.selectNodeContents(el);
    el.style.fontSize = '100px';
    const w = r.getBoundingClientRect().width;
    let size = Math.floor(100 * box / w * 0.985);
    // CTA lines that would be enormous on one line (e.g. long sentences) wrap instead
    if (el.classList.contains('cta-ed-big') && size < 40) { el.classList.add('is-multiline'); el.style.fontSize = ''; return; }
    el.style.fontSize = `${size}px`;
  });
  fit();
  window.addEventListener('resize', fit);
  if (document.fonts) document.fonts.ready.then(fit);
})();

// Tap/click toggles the dictionary card (touch screens + keyboard); Escape or tapping elsewhere closes it
(() => {
  const wrap = document.querySelector('.define-wrap');
  if (!wrap) return;
  const btn = wrap.querySelector('.define-trigger');
  const set = (open) => { wrap.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open)); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); set(!wrap.classList.contains('is-open')); });
  // Oct 28: trigger is an inline span (a <button> forced a line break before the comma); keep it keyboard-operable
  btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); set(!wrap.classList.contains('is-open')); } });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
})();

// Services Post-Production (Oct 27): play the 5s timeline sweep over the still when the row comes into view,
// fade back to the still when it ends, replay on hover. Under 5s, so no pause control needed (WCAG 2.2.2).
(() => {
  const fig = document.querySelector('.svc-media--motion');
  if (!fig || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const video = fig.querySelector('video');
  const play = () => {
    if (fig.classList.contains('is-playing')) return;
    video.currentTime = 0;
    const p = video.play();
    if (p && p.then) p.then(() => fig.classList.add('is-playing')).catch(() => {});
    else fig.classList.add('is-playing');
  };
  video.addEventListener('ended', () => fig.classList.remove('is-playing'));
  new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { video.preload = 'auto'; play(); } });
  }, { threshold: 0.6 }).observe(fig);
  const row = fig.closest('.svc');
  if (row && window.matchMedia('(hover: hover)').matches) row.addEventListener('mouseenter', play);
})();
