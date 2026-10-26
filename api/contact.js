'use strict';

const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/18POKvXzJnQRRjndrHALXYd-v4fKwumVJHvg8Q6HvpDw/formResponse?hl=en';
const ENTRY_IDS = { name: 'entry.772884676', email: 'entry.92953162', business: 'entry.257858045', service: 'entry.2086671607', details: 'entry.942640608' };
const SERVICES = new Set(['Website Design & Development', 'Managed Hosting & Maintenance / Ongoing Care', 'AI Assistant / Website + AI Assistant', 'I’d like help choosing', 'Website redesigns', 'Landing pages', 'Booking integrations', 'Business dashboards', 'Starter Website — ₹1,999', 'Business Website — ₹4,999', 'Custom Website — ₹11,999']);
const visitors = new Map();
const MAX_BYTES = 32_768;

function respond(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw || '') > MAX_BYTES) throw new Error('too_large');
    return typeof req.body === 'string' ? JSON.parse(raw) : req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > MAX_BYTES) throw new Error('too_large');
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function cleanFields(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const fields = {};
  for (const [name, max] of Object.entries({ name: 100, email: 254, business: 150, service: 100, details: 5000 })) {
    if (name === 'business' && body[name] === undefined) { fields[name] = ''; continue; }
    if (typeof body[name] !== 'string') return null;
    const value = body[name].trim();
    if ((!value && name !== 'business') || value.length > max || value.includes('\u0000')) return null;
    fields[name] = value;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email) || !SERVICES.has(fields.service)) return null;
  return fields;
}

function isGoogleConfirmation(html) {
  // Translation strings inside scripts are not evidence of a saved response.
  const visibleHtml = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '');
  const text = visibleHtml.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ');
  if (/no longer accepting responses|not accepting responses|need permission|sign in to continue|form does not exist|unable to open|too many requests/i.test(text)) return false;
  // A redisplayed question form is validation failure, even with HTTP 200.
  if (/<form\b[^>]*\baction\s*=\s*["'][^"']*\/(?:formResponse|previewResponse)/i.test(visibleHtml)) return false;
  const confirmationContainer = /class\s*=\s*["'][^"']*\b(?:vHW8K|freebirdFormviewerViewResponseConfirmationMessage|freebirdFormviewerViewResponseConfirmContentContainer)\b[^"']*["']/i.test(visibleHtml);
  return confirmationContainer && /your response has been recorded\s*[.!]?/i.test(text);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(res, 405, { error: 'Use the enquiry form to submit a request.' });
  }
  if (req.headers.origin) {
    try {
      const origin = new URL(req.headers.origin);
      if (!['http:', 'https:'].includes(origin.protocol) || origin.host !== req.headers.host) {
        return respond(res, 403, { error: 'Please submit from the FormiqBloom website.' });
      }
    } catch { return respond(res, 403, { error: 'Please submit from the FormiqBloom website.' }); }
  }
  if ((req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') {
    return respond(res, 415, { error: 'Please use the website enquiry form.' });
  }
  if (Number(req.headers['content-length']) > MAX_BYTES) return respond(res, 413, { error: 'Please shorten your project details.' });
  let body;
  try { body = await readBody(req); } catch (error) {
    return respond(res, error.message === 'too_large' ? 413 : 400, { error: 'Please check your enquiry details and try again.' });
  }
  const fields = cleanFields(body);
  if (!fields) return respond(res, 400, { error: 'Please check the required fields, email address, and selected service.' });

  // Best-effort per-instance protection; no enquiry contents are cached or logged.
  const now = Date.now();
  for (const [ip, record] of visitors) if (now >= record.resetAt) visitors.delete(ip);
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 100);
  let record = visitors.get(ip);
  if (!record) {
    if (visitors.size >= 1000) return respond(res, 429, { error: 'The enquiry form is busy. Please use WhatsApp or try again later.' });
    record = { count: 0, resetAt: now + 600_000 };
    visitors.set(ip, record);
  }
  if (record.count >= 5) {
    res.setHeader('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
    return respond(res, 429, { error: 'Please wait before submitting another enquiry, or contact FormiqBloom on WhatsApp.' });
  }
  record.count++;

  const encoded = new URLSearchParams();
  for (const [name, entry] of Object.entries(ENTRY_IDS)) encoded.set(entry, fields[name]);
  try {
    const response = await fetch(GOOGLE_FORM_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encoded.toString(), redirect: 'follow', signal: AbortSignal.timeout(15_000)
    });
    const finalUrl = new URL(response.url || GOOGLE_FORM_URL);
    if (!response.ok || finalUrl.hostname !== 'docs.google.com' || !finalUrl.pathname.startsWith('/forms/')) {
      return respond(res, 502, { error: 'We couldn’t confirm your enquiry. Your entries are still here. Please use WhatsApp to check with FormiqBloom.' });
    }
    const html = await response.text();
    if (!isGoogleConfirmation(html)) {
      return respond(res, 502, { error: 'Google Forms did not return a recognized confirmation. Your entries are still here. Please use WhatsApp to check with FormiqBloom before retrying.' });
    }
    return respond(res, 200, { ok: true, message: 'Your enquiry has been submitted. Thank you for getting in touch.' });
  } catch {
    // A timeout can occur after Google saves a response: never claim definite failure or retry automatically.
    return respond(res, 502, { error: 'We couldn’t confirm the submission. Your entries are still here. Please use WhatsApp to check with FormiqBloom before retrying.' });
  }
};
