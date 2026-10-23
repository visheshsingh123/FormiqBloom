/* Subtle desktop tilt; keep touch and reduced-motion experiences static. */
(() => {
  'use strict';
  const card = document.querySelector('.team-profile');
  if (!card || !window.VanillaTilt) return;
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function syncTilt() {
    if (pointer.matches && !reduced.matches) {
      if (!card.vanillaTilt) VanillaTilt.init(card, {
        max: 5, perspective: 1100, scale: 1, speed: 500,
        glare: false, gyroscope: false
      });
    } else {
      card.vanillaTilt?.destroy();
      card.style.removeProperty('transform');
      card.style.removeProperty('transition');
      card.style.removeProperty('will-change');
    }
  }
  pointer.addEventListener('change', syncTilt);
  reduced.addEventListener('change', syncTilt);
  syncTilt();
})();
