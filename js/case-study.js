// Case study pages (Oct 27). Pills swap the chapter player; ?review shows items to confirm.
(() => {
  if (/[?&]review\b/.test(location.search)) document.documentElement.classList.add('cs-review');
  document.querySelectorAll('.cs-pills').forEach((list) => {
    const frame = document.getElementById(list.dataset.player);
    const iframe = frame && frame.querySelector('iframe');
    const media = frame && frame.closest('.cs-media');
    if (!iframe) return;
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-vimeo]');
      if (!btn || btn.getAttribute('aria-pressed') === 'true') return;
      list.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      iframe.title = iframe.title.replace(/,.*$/, `, ${btn.textContent.trim()}`);
      iframe.src = `https://player.vimeo.com/video/${btn.dataset.vimeo}?color=DD0E69&title=0&byline=0&portrait=0&autoplay=1`;
      // the corner circle takes the color of the chosen pill
      if (media) {
        const c = getComputedStyle(btn).getPropertyValue('--pill');
        media.style.setProperty('--cs-accent', c);
        media.classList.add('is-swapping');
        setTimeout(() => media.classList.remove('is-swapping'), 450);
      }
    });
  });
})();
