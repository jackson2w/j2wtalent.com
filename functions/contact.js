const ALLOWED_ORIGINS = ['https://j2wtalent.com', 'https://www.j2wtalent.com'];
const FROM_EMAIL = 'will@j2wtalent.com';
const TO_EMAIL   = 'will@j2wtalent.com';
// Turnstile (spam check, 2026-11-19): the token must be for this form on this site.
const TURNSTILE_ACTION    = 'contact';
const TURNSTILE_HOSTNAMES = new Set(['j2wtalent.com']);

export async function onRequestPost(context) {
  const origin = context.request.headers.get('Origin') || '';
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin,
    'X-Content-Type-Options': 'nosniff',
  };

  // Browsers always send Origin on this POST; scripts posting from elsewhere don't get through.
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return json({ error: 'Forbidden' }, 403, headers);
  }

  const POSTMARK_TOKEN = context.env.POSTMARK_TOKEN;
  const TURNSTILE_SECRET = context.env.TURNSTILE_SECRET;
  if (!POSTMARK_TOKEN || !TURNSTILE_SECRET) {
    return json({ error: 'Server misconfigured' }, 500, headers);
  }

  // Parse and validate body
  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400, headers);
  }

  // Honeypot: a hidden field people never see. Bots that fill it get a normal-looking reply and nothing is sent.
  if (String(body.website || '').trim()) {
    return json({ ok: true }, 200, headers);
  }

  // Turnstile: verify the token with Cloudflare before anything is sent. Any failure sends nothing.
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token || token.length > 2048) {
    return json({ error: 'Verification failed' }, 403, headers);
  }
  let verdict;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10000),
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET,
        response: token,
        remoteip: context.request.headers.get('CF-Connecting-IP') || '',
      }),
    });
    if (!r.ok) throw new Error(`siteverify ${r.status}`);
    verdict = await r.json();
  } catch (err) {
    console.error('Turnstile siteverify error:', err);
    return json({ error: 'Verification failed' }, 403, headers);
  }
  if (!verdict.success || verdict.action !== TURNSTILE_ACTION || !TURNSTILE_HOSTNAMES.has(verdict.hostname)) {
    console.warn('Turnstile rejected:', JSON.stringify({ codes: verdict['error-codes'], action: verdict.action, hostname: verdict.hostname }));
    return json({ error: 'Verification failed' }, 403, headers);
  }

  const name    = String(body.name    || '').trim().slice(0, 200);
  const org     = String(body.org     || '').trim().slice(0, 200);
  const email   = String(body.email   || '').trim().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, 5000);

  if (!name)    return json({ error: 'Name is required' },    400, headers);
  if (!email)   return json({ error: 'Email is required' },   400, headers);
  if (!message) return json({ error: 'Message is required' }, 400, headers);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Invalid email address' }, 400, headers);
  }

  const notificationEmail = {
    From: `Jackson Talent Strategies <${FROM_EMAIL}>`,
    To:   TO_EMAIL,
    ReplyTo: email,
    Subject: `New inquiry from ${name}${org ? ` at ${org}` : ''}`,
    TextBody: [
      `Name: ${name}`,
      `Organization: ${org || 'Not provided'}`,
      `Email: ${email}`,
      '',
      'Message:',
      message,
    ].join('\n'),
    HtmlBody: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:40px 16px;">
  <tr><td align="center">

    <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;background:#ffffff;border-radius:3px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td align="center" style="background:#0066CC;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-family:'Space Grotesk',Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.75);">Jackson Talent Strategies</p>
          <p style="margin:0;font-family:'Space Grotesk',Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.5);">New Inquiry</p>
        </td>
      </tr>

      <!-- Name / Org -->
      <tr>
        <td style="padding:36px 40px 0;">
          <p style="margin:0 0 4px;font-family:'Space Grotesk',Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#0066CC;">From</p>
          <p style="margin:0;font-family:'Space Grotesk',Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#0D0D0D;letter-spacing:-0.01em;">${esc(name)}${org ? `<span style="font-weight:400;color:#555;"> &mdash; ${esc(org)}</span>` : ''}</p>
        </td>
      </tr>

      <!-- Details table -->
      <tr>
        <td style="padding:24px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="font-family:'Space Grotesk',Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#999;padding:10px 0;border-bottom:1px solid #eeeeee;width:120px;">Name</td>
              <td style="font-family:'Space Grotesk',Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;padding:10px 0;border-bottom:1px solid #eeeeee;">${esc(name)}</td>
            </tr>
            <tr>
              <td style="font-family:'Space Grotesk',Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#999;padding:10px 0;border-bottom:1px solid #eeeeee;">Organization</td>
              <td style="font-family:'Space Grotesk',Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;padding:10px 0;border-bottom:1px solid #eeeeee;">${esc(org || '—')}</td>
            </tr>
            <tr>
              <td style="font-family:'Space Grotesk',Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#999;padding:10px 0;">Email</td>
              <td style="font-family:'Space Grotesk',Arial,Helvetica,sans-serif;font-size:14px;padding:10px 0;"><a href="mailto:${esc(email)}" style="color:#0066CC;text-decoration:none;">${esc(email)}</a></td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Message -->
      <tr>
        <td style="padding:28px 40px 40px;">
          <p style="margin:0 0 10px;font-family:'Space Grotesk',Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#0066CC;">Message</p>
          <div style="background:#f7f7f7;padding:20px 24px;border-radius:3px;font-family:'Space Grotesk',Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.75;white-space:pre-wrap;">${esc(message)}</div>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`,
    MessageStream: 'outbound',
  };

  // No auto-reply to the visitor (Will, 2026-11-19): bots used it to send mail from will@j2wtalent.com to strangers.

  let pmRes;
  try {
    pmRes = await fetch('https://api.postmarkapp.com/email/batch', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': POSTMARK_TOKEN,
      },
      body: JSON.stringify([notificationEmail]),
    });
  } catch (err) {
    console.error('Postmark fetch error:', err);
    return json({ error: 'Failed to reach email service' }, 502, headers);
  }

  if (!pmRes.ok) {
    const text = await pmRes.text().catch(() => '');
    console.error('Postmark non-OK:', pmRes.status, text);
    return json({ error: 'Email service error' }, 502, headers);
  }

  const results = await pmRes.json();
  const failed  = results.filter(r => r.ErrorCode !== 0);
  if (failed.length > 0) {
    console.error('Postmark partial failure:', JSON.stringify(failed));
    return json({ error: 'Email delivery issue' }, 500, headers);
  }

  return json({ ok: true }, 200, headers);
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('Origin') || '';
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers });
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
