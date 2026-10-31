/* Cinematic homepage section headings: reveal once when each scrolls into view. */
(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || !Element.prototype.animate || !('IntersectionObserver' in window)) return;
  const active = new Set();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      if (motion.matches) continue;
      entry.target.querySelectorAll('.cinematic-glyph').forEach((glyph, index) => {
        const animation = glyph.animate([
          { opacity: 0, filter: 'blur(10px)', transform: 'translateY(.45em) rotateX(35deg)' },
          { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0) rotateX(0deg)' }
        ], { duration: 850, delay: index * 20, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
        active.add(animation);
        animation.finished.then(() => active.delete(animation), () => active.delete(animation));
      });
    }
  }, { threshold: .2 });
  document.querySelectorAll('[data-cinematic-heading]').forEach(title => {
    title.setAttribute('aria-label', title.innerText.replace(/\s+/g, ' ').trim());
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(token => {
        if (!token) return;
        if (/^\s+$/.test(token)) { fragment.append(document.createTextNode(token)); return; }
        const word = document.createElement('span');
        word.className = 'cinematic-word';
        word.setAttribute('aria-hidden', 'true');
        [...token].forEach(character => {
          const glyph = document.createElement('span');
          glyph.className = 'cinematic-glyph';
          glyph.textContent = character;
          word.append(glyph);
        });
        fragment.append(word);
      });
      node.replaceWith(fragment);
    });
    observer.observe(title);
  });
  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    observer.disconnect();
    active.forEach(animation => animation.cancel());
    active.clear();
  });
})();
