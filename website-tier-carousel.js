/* Centered mobile tiers with side previews, native swiping, and looping controls. */
(() => {
  'use strict';
  [
    { trackId: 'website-tier-track', cardSelector: '.website-option', controlSelector: '.website-tier-carousel', statusId: 'website-tier-status' },
    { trackId: 'selected-work-track', cardSelector: '.project', controlSelector: '.work-carousel', statusId: 'selected-work-status' }
  ].forEach(({ trackId, cardSelector, controlSelector, statusId }) => {
  const track = document.getElementById(trackId);
  if (!track) return;
  const originals = [...track.querySelectorAll(cardSelector)];
  const previous = document.querySelector(`${controlSelector} .tier-carousel-control.previous`);
  const next = document.querySelector(`${controlSelector} .tier-carousel-control.next`);
  const status = document.getElementById(statusId);
  const mobile = window.matchMedia('(max-width: 850px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  originals.forEach((card, index) => { card.dataset.tier = index; });
  function clone(card) {
    const copy = card.cloneNode(true);
    copy.dataset.carouselClone = '';
    copy.inert = true;
    copy.setAttribute('aria-hidden', 'true');
    [copy, ...copy.querySelectorAll('[id]')].forEach(element => element.removeAttribute('id'));
    copy.removeAttribute('aria-labelledby');
    return copy;
  }
  track.prepend(clone(originals.at(-1)));
  track.append(clone(originals[0]));
  const cards = [...track.querySelectorAll(cardSelector)];
  let current = 1;
  let settleTimer;
  const offset = index => cards[index].offsetLeft + cards[index].offsetWidth / 2 - track.clientWidth / 2;
  function update() {
    if (!mobile.matches) return;
    current = cards.reduce((nearest, _, index) => Math.abs(offset(index) - track.scrollLeft) < Math.abs(offset(nearest) - track.scrollLeft) ? index : nearest, 0);
    cards.forEach((card, index) => card.classList.toggle('is-current', index === current));
    const tier = Number(cards[current].dataset.tier);
    const message = `${originals[tier].querySelector('h2, h3').textContent.replace(/\s*\(opens in a new tab\)/, '')}, ${tier + 1} of ${originals.length}`;
    if (status.textContent !== message) status.textContent = message;
  }
  function settle() {
    if (!mobile.matches) return;
    update();
    const originalIndex = current === 0 ? originals.length : current === cards.length - 1 ? 1 : current;
    if (originalIndex !== current) {
      track.scrollTo({ left: offset(originalIndex), behavior: 'instant' });
      update();
    }
  }
  function move(direction) {
    if (!mobile.matches) return;
    settle();
    track.scrollTo({ left: offset(current + direction), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }
  previous.disabled = false;
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', () => {
    update();
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, 180);
  }, { passive: true });
  track.addEventListener('scrollend', settle);
  track.addEventListener('keydown', event => {
    if (!mobile.matches || event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'ArrowRight' ? 1 : -1);
  });
  function resize() {
    clearTimeout(settleTimer);
    if (mobile.matches) {
      track.tabIndex = 0;
      if (current === 0 || current === cards.length - 1) current = Number(cards[current].dataset.tier) + 1;
      track.scrollTo({ left: offset(current), behavior: 'instant' });
      update();
    } else {
      track.removeAttribute('tabindex');
      track.scrollLeft = 0;
      cards.forEach(card => card.classList.remove('is-current'));
      status.textContent = '';
    }
  }
  mobile.addEventListener('change', resize);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(track);
  resize();
  });
})();
