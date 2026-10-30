(() => {
  'use strict';

  const quickAnswers = [
    {
      id: 'services',
      question: 'What services do you offer?',
      answer: 'FormiqBloom offers responsive Website Design & Development, Managed Hosting & Maintenance, and custom AI Assistants grounded in approved business information. Other solutions include website redesigns, landing pages, booking integrations, and business dashboards. SEO setup is included with every package at no extra charge. You work directly with the founder.'
    },
    {
      id: 'process',
      question: 'How does a project work?',
      answer: 'Discovery → Design → Development → Launch & Support. We discuss your goals and scope, review the design together, build the responsive experience, and prepare for launch. Milestones and any ongoing support are agreed before work begins.'
    },
    {
      id: 'pricing',
      question: 'How much does it cost?',
      answer: 'Our website tiers are Starter Website at ₹1,999 with 1 page, essential business links, 1 revision round, and 48-hour delivery; Business Website at ₹4,999 with 3–5 pages, 2 revision rounds, and 3–4-day delivery; Custom Website at ₹11,999 with 8–10 pages, 3 revision rounds, an admin dashboard for content, enquiries and booking records, and 7-day delivery. Revisions can include layout changes; extra pages and new features cost extra. Booking systems, payments, and online stores are quoted separately. AI assistants are included in Business and Custom. Starter can add an AI assistant for a separate quote. These are one-time website setup prices; AI provider usage is separate. Compare all tiers at /pricing. Timings begin after scope confirmation and receipt of the required content and access. Hosting, maintenance, third-party subscriptions, and AI usage are separate. After full payment, you receive the finished website files and custom code; third-party licences apply. Your domain and hosting stay in your own accounts. You keep the paid-for website if maintenance ends, while provider renewals remain your responsibility. Payment stages and maintenance charges are agreed in writing before work starts. See /pricing#ownership-and-costs. Contact FormiqBloom to confirm the right tier and scope.'
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
  const inlineHost = document.getElementById('inline-chat-host');
  const history = [];
  let busy = false;
  let returnFocus = launcher;

  function setOpen(open) {
    if (inlineHost) {
      if (open) {
        document.getElementById('chat-with-ai').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
        input.focus({ preventScroll: true });
      }
      return;
    }
    if (open && panel.hidden) returnFocus = document.activeElement;
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? 'Close FormiqBloom AI' : 'Open FormiqBloom AI');
    document.documentElement.classList.toggle('chat-is-open', open);
    if (open) {
      (busy ? closeButton : input).focus({ preventScroll: true });
      log.scrollTop = log.scrollHeight;
    } else {
      (returnFocus?.isConnected ? returnFocus : launcher).focus({ preventScroll: true });
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
    return paragraph;
  }

  async function revealAnswer(speaker, text) {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || document.hidden) { addMessage(speaker, text); return; }
    log.setAttribute('aria-busy', 'true');
    const paragraph = addMessage(speaker, '');
    status.textContent = 'Replying…';
    try {
      const words = text.match(/\S+\s*|\s+/g) || [text];
      let visible = '';
      for (let i = 0; i < words.length; i++) {
        if (motion.matches || document.hidden) { paragraph.textContent = text; break; }
        const follow = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
        visible += words[i];
        paragraph.textContent = visible;
        if (follow) log.scrollTop = log.scrollHeight;
        if (i < words.length - 1) await new Promise(resolve => window.setTimeout(resolve, 45));
      }
    } finally { log.setAttribute('aria-busy', 'false'); }
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
      setBusy(true);
      try {
        await revealAnswer('FormiqBloom · saved answer', saved.answer);
        remember(text, saved.answer);
      } finally { setBusy(false); }
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
      await revealAnswer('FormiqBloom · AI', data.answer);
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
  let greeted = false;
  document.querySelectorAll('[data-open-chat]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.matches('.robot-invite, .robot-chat-trigger') && window.matchMedia('(max-width: 850px)').matches) return;
      if (button.dataset.chatGreeting && !greeted) {
        const greeting = button.dataset.chatGreeting;
        if (log.children.length === 1 && history.length === 0) {
          log.firstElementChild.querySelector('p').textContent = greeting;
        } else addMessage('FormiqBloom AI', greeting);
        greeted = true;
      }
      setOpen(true);
    });
    button.disabled = false;
    button.hidden = false;
  });
  launcher.addEventListener('click', () => setOpen(inlineHost ? true : panel.hidden));
  closeButton.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !inlineHost && !panel.hidden) { event.preventDefault(); setOpen(false); }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    ask(input.value, true);
  });
  document.documentElement.classList.add('has-chat-widget');
  fields.disabled = false;
  launcher.hidden = false;
})();
