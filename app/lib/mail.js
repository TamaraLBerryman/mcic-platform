export async function sendPlainEmail({ to, subject, text }) {
    const recipients = [...new Set((Array.isArray(to) ? to : [to]).map(email => String(email || '').trim()).filter(Boolean))];
    if (!recipients.length) {
        throw new Error('No recipient email is configured.');
    }
    if (!process.env.RESEND_API_KEY) {
        throw new Error('No email service is configured. Add RESEND_API_KEY and TICKET_FROM_EMAIL.');
    }

    const from = process.env.TICKET_FROM_EMAIL || 'MCIC Tickets <onboarding@resend.dev>';
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from,
            to: recipients,
            subject,
            text,
            html: `<div style="font-family: Arial, sans-serif; color: #111; white-space: pre-wrap;">${escapeHtml(text)}</div>`
        })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(body.message || 'Email could not be sent.');
    }
    return { sent: true };
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
