(() => {
  'use strict';

  const quickAnswers = [
    {
      id: 'services',
      question: 'What services do you offer?',
      answer: 'FormiqBloom offers responsive Website Design & Development, Managed Hosting & Maintenance, and custom AI Assistants grounded in approved business information. You work directly with the founder.'
    },
    {
      id: 'process',
      question: 'How does a project work?',
      answer: 'Discovery → Design → Development → Launch & Support. We discuss your goals and scope, review the design together, build the responsive experience, and prepare for launch. Milestones and any ongoing support are agreed before work begins.'
    },
    {
      id: 'pricing',
      question: 'How much does it cost?',
      answer: 'Every project is quoted around its scope. Setup is quoted separately from recurring hosting, maintenance, and AI usage. Scope, support responsibilities, and usage allowances are agreed before work starts. Message FormiqBloom on WhatsApp for a project-specific quote.'
    },
    {
      id: 'contact',
      question: 'How can I contact you?',
      answer: 'FormiqBloom is based in Surat. Message FormiqBloom on WhatsApp at +91 9054349785 using the link below, email visheshsingh29537@gmail.com, find @formiqbloom on Instagram, or use the website enquiry form. It submits in the background and shows its result here without leaving the website. Share your business goals, services needed, and any existing website or content.'
    }
  ];

  const launcher = document.getElementById('chat-launcher');
  const panel = document.getElementById('chat-widget');
  const closeButton = document.getElementById('widget-close');
  const form = document.getElementById('widget-form');
  const fields = document.getElementById('widget-fields');
  const input = document.getElementById('widget-input');
  const log = document.getElementById('widget-log');
  const status = document.getElementById('widget-status');
  const history = [];
  let busy = false;

  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? 'Close FormiqBloom chat' : 'Open FormiqBloom chat');
    document.documentElement.classList.toggle('chat-is-open', open);
    if (open) {
      (busy ? closeButton : input).focus({ preventScroll: true });
      log.scrollTop = log.scrollHeight;
    } else {
      launcher.focus({ preventScroll: true });
    }
  }

  function addMessage(speaker, text, user = false) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-message' + (user ? ' user' : '');
    const label = document.createElement('strong');
    label.textContent = speaker;
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    bubble.append(label, paragraph);
    log.append(bubble);
    // Keep long sessions bounded without persisting personal chat data.
    while (log.children.length > 41) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight;
  }

  function remember(question, answer) {
    history.push({ role: 'user', content: question.slice(0, 1200) }, { role: 'assistant', content: answer.slice(0, 1200) });
    if (history.length > 6) history.splice(0, history.length - 6);
  }

  function setBusy(value) {
    busy = value;
    fields.disabled = value;
    document.querySelectorAll('[data-quick-answer]').forEach(button => { button.disabled = value; });
    status.textContent = value ? 'Thinking…' : '';
  }

  const normalize = text => text.toLowerCase().trim().replace(/[?!.,]+$/g, '');

  async function ask(question, fromInput = false) {
    if (busy) return;
    const text = question.trim();
    if (!text || text.length > 1000) { input.focus(); return; }
    const saved = quickAnswers.find(item => normalize(item.question) === normalize(text));
    addMessage('You', text, true);
    if (fromInput) input.value = '';
    if (saved) {
      addMessage('FormiqBloom · saved answer', saved.answer);
      remember(text, saved.answer);
      return;
    }

    setBusy(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...history, { role: 'user', content: text }] }),
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'same-origin'
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof data?.error === 'string' ? data.error : 'AI chat is unavailable here. Please use WhatsApp or try again later.';
        const reference = typeof data?.code === 'string' && /^AI_[A-Z_]{1,40}$/.test(data.code) ? ` (Reference: ${data.code})` : '';
        throw new Error(message + reference);
      }
      if (typeof data?.answer !== 'string' || !data.answer.trim()) throw new Error('The assistant could not produce an answer. Please try again or use WhatsApp.');
      addMessage('FormiqBloom · AI', data.answer);
      remember(text, data.answer);
    } catch (error) {
      const message = error.name === 'AbortError'
        ? 'The reply took too long. Please try again or use WhatsApp below.'
        : error instanceof TypeError
          ? 'Could not connect to AI chat. Check your connection or use WhatsApp below.'
          : error.message;
      addMessage('FormiqBloom · unable to reply', message);
      if (fromInput && !input.value) input.value = text;
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
      if (!panel.hidden && document.activeElement === document.body) input.focus({ preventScroll: true });
    }
  }

  document.querySelectorAll('[data-widget-questions]').forEach(container => {
    for (const item of quickAnswers) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.quickAnswer = item.id;
      button.textContent = item.question;
      button.addEventListener('click', () => { setOpen(true); ask(item.question); });
      container.append(button);
    }
  });
  document.querySelectorAll('[data-open-chat]').forEach(button => {
    button.addEventListener('click', () => setOpen(true));
    button.disabled = false;
  });
  launcher.addEventListener('click', () => setOpen(panel.hidden));
  closeButton.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); setOpen(false); }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    ask(input.value, true);
  });
  document.documentElement.classList.add('has-chat-widget');
  fields.disabled = false;
  launcher.hidden = false;
})();
