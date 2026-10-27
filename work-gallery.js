/* Automatically cycle project previews; native card links work without JavaScript. */
(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-project-gallery]').forEach(gallery => {
    const openLink = gallery.querySelector('.screenshot-open');
    const image = openLink.querySelector('img');
    const label = gallery.querySelector('[data-gallery-caption]');
    const picks = Array.from(gallery.querySelectorAll('[data-gallery-pick]'));
    const items = picks.length ? picks.map(link => ({
      src: link.href, alt: link.dataset.imageAlt, label: link.textContent,
      width: link.dataset.imageWidth, height: link.dataset.imageHeight
    })) : [{ src: openLink.href, alt: image.alt, label: label.textContent, width: image.width, height: image.height }];
    const state = { name: gallery.dataset.projectName, items, index: 0 };
    state.select = index => {
      state.index = (index + items.length) % items.length;
      const item = items[state.index];
      image.src = item.src;
      image.alt = item.alt;
      image.width = Number(item.width);
      image.height = Number(item.height);
      label.textContent = item.label;
      picks.forEach((link, i) => {
        if (i === state.index) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    };
    // Keep the preview still while it is being inspected or the page is hidden.
    if (items.length > 1) {
      let paused = reducedMotion.matches;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'gallery-toggle';
      const updateToggle = () => {
        toggle.textContent = paused ? 'Play slideshow' : 'Pause slideshow';
        toggle.setAttribute('aria-label', `${paused ? 'Play' : 'Pause'} ${state.name} screenshot slideshow`);
      };
      toggle.addEventListener('click', () => { paused = !paused; updateToggle(); });
      reducedMotion.addEventListener('change', event => {
        if (event.matches) { paused = true; updateToggle(); }
      });
      updateToggle();
      gallery.append(toggle);
      window.setInterval(() => {
        if (paused || document.hidden || gallery.matches(':hover, :focus-within')) return;
        state.select(state.index + 1);
      }, 4000);
    }
  });
})();
