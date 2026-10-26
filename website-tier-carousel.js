/* Mobile tier carousel: native swiping with optional button and keyboard controls. */
(() => {
  'use strict';
  const track = document.getElementById('website-tier-track');
  if (!track) return;
  const cards = [...track.querySelectorAll('.website-option')];
  const previous = document.querySelector('.tier-carousel-control.previous');
  const next = document.querySelector('.tier-carousel-control.next');
  const status = document.getElementById('website-tier-status');
  const mobile = window.matchMedia('(max-width: 850px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = -1;
  const offset = index => cards[index].offsetLeft - cards[0].offsetLeft;
  function update() {
    if (!mobile.matches) return;
    const index = cards.reduce((nearest, _, i) => Math.abs(offset(i) - track.scrollLeft) < Math.abs(offset(nearest) - track.scrollLeft) ? i : nearest, 0);
    previous.disabled = index === 0;
    next.disabled = index === cards.length - 1;
    if (index !== current) {
      current = index;
      status.textContent = `${cards[index].querySelector('h3').textContent}, ${index + 1} of ${cards.length}`;
    }
  }
  function move(direction) {
    if (!mobile.matches) return;
    update();
    const index = Math.max(0, Math.min(cards.length - 1, current + direction));
    track.scrollTo({ left: offset(index), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', update, { passive: true });
  track.addEventListener('keydown', event => {
    if (!mobile.matches || event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'ArrowRight' ? 1 : -1);
  });
  function resize() {
    if (mobile.matches) track.tabIndex = 0;
    else {
      track.removeAttribute('tabindex');
      track.scrollLeft = 0;
      current = -1;
      status.textContent = '';
    }
    update();
  }
  mobile.addEventListener('change', resize);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(track);
  resize();
})();
