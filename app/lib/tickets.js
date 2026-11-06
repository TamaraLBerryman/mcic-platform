import QRCode from 'qrcode';
import { createTicketCode, extractTicketCode } from './ticketCode';

export { createTicketCode, extractTicketCode };

export function ticketQrPayload(ticketCode) {
    return ticketCode;
}

export async function ticketQrDataUrl(ticketCode) {
    return QRCode.toDataURL(ticketQrPayload(ticketCode), {
        width: 480,
        margin: 1,
        errorCorrectionLevel: 'M'
    });
}

export async function ticketQrPng(ticketCode) {
    return QRCode.toBuffer(ticketQrPayload(ticketCode), {
        width: 480,
        margin: 1,
        errorCorrectionLevel: 'M'
    });
}

export async function sendTicketEmail({ to, name, eventTitle, eventWhen, ticketCode, ticketUrl, qrUrl }) {
    const subject = `Your ticket for ${eventTitle}`;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #111; max-width: 520px;">
            <p>Hi ${escapeHtml(name)},</p>
            <p>You're registered for <strong>${escapeHtml(eventTitle)}</strong>${eventWhen ? ` on ${escapeHtml(eventWhen)}` : ''}.</p>
            <p>Show this QR code at the door. If you can't open the image, give your name or this code: <strong>${escapeHtml(ticketCode)}</strong>.</p>
            <p><img src="${qrUrl}" alt="Ticket QR code" width="240" height="240" /></p>
            <p><a href="${ticketUrl}">Open your ticket</a></p>
        </div>
    `;
    const text = `Hi ${name}, you're registered for ${eventTitle}. Ticket code: ${ticketCode}. Open your ticket: ${ticketUrl}`;
    return sendResendEmail({ to, subject, html, text });
}

export async function sendReminderEmail({ to, subject, body }) {
    const html = `<div style="font-family: Arial, sans-serif; color: #111; max-width: 560px; white-space: pre-wrap;">${escapeHtml(body)}</div>`;
    return sendResendEmail({ to, subject, html, text: body });
}

async function sendResendEmail({ to, subject, html, text }) {
    if (process.env.RESEND_API_KEY) {
        const from = process.env.TICKET_FROM_EMAIL || 'MCIC Tickets <onboarding@resend.dev>';
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ from, to: [to], subject, html, text })
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.message || 'Email could not be sent.');
        }
        return { sent: true };
    }

    throw new Error('No ticket email service is configured. Add RESEND_API_KEY and TICKET_FROM_EMAIL.');
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
