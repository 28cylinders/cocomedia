// Coco Media — shared site behavior (nav toggle, footer year)
// No framework, no build step — plain JS to match the rest of the site.

document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
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

  // Vimeo thumbnails for any element with data-vimeo-thumb (Home Featured Work)
  document.querySelectorAll('[data-vimeo-thumb]').forEach(async (el) => {
    try {
      const r = await fetch(`https://vimeo.com/api/v2/video/${el.dataset.vimeoThumb}.json`);
      const d = await r.json();
      const src = d[0]?.thumbnail_large || d[0]?.thumbnail_medium;
      if (src) el.style.backgroundImage = `url("${src}")`;
    } catch (e) { /* leave the black placeholder */ }
  });
});
