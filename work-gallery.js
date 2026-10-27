/* Real screenshots, progressively enhanced: original image links work without JS. */
(() => {
  'use strict';
  const dialog = document.getElementById('screenshot-lightbox');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const modalImage = dialog.querySelector('.lightbox-image');
  const caption = dialog.querySelector('.lightbox-caption');
  const title = document.getElementById('lightbox-title');
  const previous = dialog.querySelector('.lightbox-previous');
  const next = dialog.querySelector('.lightbox-next');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = null;
  let opener = null;
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
      openLink.href = item.src;
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
        if (paused || document.hidden || dialog.open || gallery.matches(':hover, :focus-within')) return;
        state.select(state.index + 1);
      }, 4000);
    }
    picks.forEach((link, index) => link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      state.select(index);
    }));
    openLink.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      active = state;
      opener = openLink;
      updateDialog();
      dialog.showModal();
    });
  });
  function updateDialog() {
    const item = active.items[active.index];
    modalImage.src = item.src;
    modalImage.alt = item.alt;
    title.textContent = active.name;
    caption.textContent = item.label + ' · ' + (active.index + 1) + ' of ' + active.items.length;
    previous.hidden = next.hidden = active.items.length < 2;
  }
  function step(direction) {
    if (!active) return;
    active.select(active.index + direction);
    updateDialog();
  }
  previous.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  dialog.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      step(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    active = null;
  });
})();
