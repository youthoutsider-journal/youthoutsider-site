// Handles application forms (staff + guest) and emails them to the editors.
// Everything else is served straight from the static site in dist/.
import { EmailMessage } from 'cloudflare:email';

const FROM = 'applications@youthoutsider.org';
const FORMS = {
  'staff-application': 'Staff application',
  'guest-application': 'Guest article / op-ed',
};

function enc(s) {
  // RFC 2047 encode a header value if it has non-ASCII characters
  return /^[\x20-\x7e]*$/.test(s) ? s : '=?UTF-8?B?' + btoa(unescape(encodeURIComponent(s))) + '?=';
}
function b64(s) {
  const b = btoa(unescape(encodeURIComponent(s)));
  return b.match(/.{1,76}/g).join('\r\n');
}

async function handleApply(request, env) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const ct = request.headers.get('content-type') || '';
  let data;
  if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    data = Object.fromEntries((await request.formData()).entries());
  } else {
    return new Response('Bad request', { status: 400 });
  }
  if (data['bot-field']) return new Response('OK'); // honeypot: quietly drop spam
  const kind = FORMS[data['form-name']];
  if (!kind) return new Response('Unknown form', { status: 400 });

  const fields = Object.entries(data).filter(([k, v]) => k !== 'form-name' && k !== 'bot-field' && String(v).trim());
  if (!fields.length) return new Response('Empty', { status: 400 });
  const name = String(data.name || 'Someone').slice(0, 80);
  const body = `New ${kind.toLowerCase()} from youthoutsider.org\n\n` +
    fields.map(([k, v]) => `${k.replace(/_/g, ' ').toUpperCase()}\n${String(v).slice(0, 5000)}`).join('\n\n') +
    `\n\nReceived ${new Date().toUTCString()}\n`;

  const to = env.APPLICATIONS_TO;
  if (!to) return new Response('Not configured', { status: 500 });
  const contact = String(data.contact || data.email || '');
  const headers = [
    `From: Youth Outsider Applications <${FROM}>`,
    `To: ${to}`,
    `Subject: ${enc(`${kind}: ${name}`)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@youthoutsider.org>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  if (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(contact)) headers.push(`Reply-To: ${contact}`);
  const raw = headers.join('\r\n') + '\r\n\r\n' + b64(body);

  try {
    await env.MAILER.send(new EmailMessage(FROM, to, raw));
  } catch (e) {
    console.error('send failed', e && e.message);
    return new Response('Could not send', { status: 502 });
  }
  // Plain HTML form posts (no JavaScript) get a thank-you page
  if ((request.headers.get('accept') || '').includes('text/html') && !request.headers.get('x-requested-with')) {
    return new Response('<!doctype html><meta charset="utf-8"><title>Thanks</title><p style="font-family:sans-serif;max-width:560px;margin:80px auto">Thanks! Your application was sent. <a href="/">Back to Youth Outsider</a></p>', { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
  return new Response('OK');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/apply') return handleApply(request, env);
    return env.ASSETS.fetch(request);
  },
};
