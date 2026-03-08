export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const { fb_type, fb_page, fb_message, fb_email } = req.body || {};

  if (!fb_type || !fb_type.trim()) {
    return res.status(400).json({ error: 'Type is required' });
  }
  if (!fb_message || !fb_message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const bodyText = [
    'Bolt — Feedback Form Submission',
    '────────────────────────────────',
    `Type:         ${fb_type}`,
    `Page / Area:  ${fb_page  || '(not specified)'}`,
    `Email:        ${fb_email || '(not provided)'}`,
    '',
    'Message:',
    fb_message.trim(),
    '',
    'Submitted via feedback.html on Bolt.',
  ].join('\n');

  try {
    const payload = {
      // NOTE: Replace the from address below with a verified Resend sender domain once
      // boltresearchteam.com is verified in your Resend dashboard.
      // Verified sender: 'Bolt Feedback <feedback@boltresearchteam.com>'
      from:    'Bolt Feedback <onboarding@resend.dev>',
      to:      ['joeybukowski3@gmail.com'],
      subject: `[Bolt Feedback] ${fb_type}${fb_page ? ' — ' + fb_page : ''}`,
      text:    bodyText,
    };

    if (fb_email && fb_email.includes('@')) {
      payload.reply_to = fb_email;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Resend error:', errText);
      return res.status(502).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('send-feedback handler error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
