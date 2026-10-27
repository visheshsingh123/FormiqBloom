/* Automatically cycle project previews; native card links work without JavaScript. */
(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-project-gallery]').forEach(gallery => {
    const openLink = gallery.querySelector('.screenshot-open');
    let image = openLink.querySelector('img');
    openLink.style.position = 'relative';
    let sliding = false;
    const label = gallery.querySelector('[data-gallery-caption]');
    const picks = Array.from(gallery.querySelectorAll('[data-gallery-pick]'));
    const items = picks.length ? picks.map(link => ({
      src: link.href, alt: link.dataset.imageAlt, label: link.textContent,
      width: link.dataset.imageWidth, height: link.dataset.imageHeight
    })) : [{ src: openLink.href, alt: image.alt, label: label.textContent, width: image.width, height: image.height }];
    const state = { name: gallery.dataset.projectName, items, index: 0 };
    state.select = async index => {
      if (sliding) return;
      const nextIndex = (index + items.length) % items.length;
      if (nextIndex === state.index) return;
      const item = items[nextIndex];
      const incoming = image.cloneNode(false);
      incoming.src = item.src;
      incoming.alt = item.alt;
      incoming.width = Number(item.width);
      incoming.height = Number(item.height);
      incoming.loading = 'eager';
      sliding = true;
      try { await incoming.decode(); } catch { sliding = false; return; }
      const outgoing = image;
      incoming.style.position = 'absolute';
      incoming.style.inset = '0';
      openLink.append(incoming);
      if (!reducedMotion.matches) {
        const options = { duration: 600, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' };
        const animations = [
          outgoing.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }], options),
          incoming.animate([{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], options)
        ];
        await Promise.all(animations.map(animation => animation.finished));
        animations.forEach(animation => animation.cancel());
      }
      outgoing.remove();
      incoming.style.position = '';
      incoming.style.inset = '';
      image = incoming;
      state.index = nextIndex;
      sliding = false;
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
