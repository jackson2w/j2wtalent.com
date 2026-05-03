const ALLOWED_ORIGINS = ['https://j2wtalent.com', 'https://www.j2wtalent.com'];
const FROM_EMAIL = 'will@j2wtalent.com';
const TO_EMAIL   = 'will@j2wtalent.com';

export async function onRequestPost(context) {
  const origin = context.request.headers.get('Origin') || '';
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin,
    'X-Content-Type-Options': 'nosniff',
  };

  const POSTMARK_TOKEN = context.env.POSTMARK_TOKEN;
  if (!POSTMARK_TOKEN) {
    return json({ error: 'Server misconfigured' }, 500, headers);
  }

  // Parse and validate body
  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400, headers);
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

  const firstName = name.split(' ')[0];

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
    HtmlBody: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.6;">
        <p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#999;margin:0 0 4px;">New Contact Form Submission</p>
        <h2 style="margin:0 0 24px;font-size:20px;font-weight:600;">${esc(name)}${org ? ` &mdash; ${esc(org)}` : ''}</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;width:130px;">Name</td><td style="padding:8px 0;border-bottom:1px solid #eee;">${esc(name)}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;">Organization</td><td style="padding:8px 0;border-bottom:1px solid #eee;">${esc(org || '—')}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;">Email</td><td style="padding:8px 0;border-bottom:1px solid #eee;"><a href="mailto:${esc(email)}" style="color:#0066CC;">${esc(email)}</a></td></tr>
        </table>
        <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#888;margin:0 0 8px;">Message</p>
        <div style="background:#f7f7f7;padding:16px 20px;border-radius:6px;font-size:15px;line-height:1.7;white-space:pre-wrap;">${esc(message)}</div>
        <p style="margin-top:28px;font-size:12px;color:#bbb;">Hit Reply to respond directly to ${esc(firstName)}.</p>
      </div>
    `,
    MessageStream: 'outbound',
  };

  const confirmationEmail = {
    From: `Willie Jackson <${FROM_EMAIL}>`,
    To:   email,
    ReplyTo: FROM_EMAIL,
    Subject: `Got your message, ${firstName} — I'll be in touch soon`,
    TextBody: [
      `Hi ${firstName},`,
      '',
      `Thank you for reaching out. I've received your message and will get back to you within one business day.`,
      '',
      `If your situation is time-sensitive, feel free to reply to this email directly.`,
      '',
      'Best,',
      'Willie Jackson',
      'Jackson Talent Strategies',
      'will@j2wtalent.com',
    ].join('\n'),
    HtmlBody: `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1a1a1a;line-height:1.8;font-size:16px;">
        <p style="font-size:11px;font-family:sans-serif;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;margin:0 0 36px;">Jackson Talent Strategies</p>
        <p>Hi ${esc(firstName)},</p>
        <p>Thank you for reaching out. I've received your message and will get back to you within one business day.</p>
        <p>If your situation is time-sensitive, feel free to reply to this email directly.</p>
        <p style="margin-top:40px;">
          Best,<br>
          <strong>Willie Jackson</strong><br>
          <span style="font-family:sans-serif;font-size:14px;color:#555;">Jackson Talent Strategies</span><br>
          <a href="mailto:will@j2wtalent.com" style="font-family:sans-serif;font-size:14px;color:#0066CC;text-decoration:none;">will@j2wtalent.com</a>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:40px 0;" />
        <p style="font-size:11px;font-family:sans-serif;color:#ccc;margin:0;">You're receiving this because you submitted a contact form at j2wtalent.com.</p>
      </div>
    `,
    MessageStream: 'outbound',
  };

  let pmRes;
  try {
    pmRes = await fetch('https://api.postmarkapp.com/email/batch', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': POSTMARK_TOKEN,
      },
      body: JSON.stringify([notificationEmail, confirmationEmail]),
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
