/* Staggered blur-to-clear hero letters, sequenced after the optional logo intro. */
(() => {
  'use strict';
  const title = document.getElementById('hero-title');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!title || motion.matches || !Element.prototype.animate) return;
  const lines = [...title.querySelectorAll('.hero-title-text')];
  title.setAttribute('aria-label', lines.map(line => line.textContent.trim()).join(' '));
  const glyphs = [];
  lines.forEach((line, row) => {
    const text = line.textContent;
    line.setAttribute('aria-hidden', 'true');
    line.replaceChildren();
    [...text].forEach((character, index) => {
      const glyph = document.createElement('span');
      glyph.className = 'cinematic-glyph';
      glyph.textContent = character;
      line.append(glyph);
      glyphs.push({ glyph, delay: row * 220 + index * 24 });
    });
  });
  let started = false;
  let fallback;
  const animations = [];
  function play() {
    if (started) return;
    started = true;
    clearTimeout(fallback);
    title.classList.remove('cinematic-waiting');
    document.removeEventListener('formiqbloom:intro-complete', play);
    if (motion.matches) return;
    glyphs.forEach(({ glyph, delay }) => {
      animations.push(glyph.animate([
        { opacity: 0, filter: 'blur(10px)', transform: 'translateY(.45em) rotateX(35deg)' },
        { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0) rotateX(0deg)' }
      ], { duration: 850, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
    });
  }
  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    play();
    animations.forEach(animation => animation.cancel());
  });
  if (document.documentElement.classList.contains('logo-intro-pending') || document.querySelector('.logo-intro-overlay')) {
    title.classList.add('cinematic-waiting');
    document.addEventListener('formiqbloom:intro-complete', play, { once: true });
    fallback = setTimeout(play, 5600);
  } else play();
})();
