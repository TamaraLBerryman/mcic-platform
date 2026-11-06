import { ticketQrPng, extractTicketCode } from '../../../lib/tickets';

export async function GET(request) {
    const code = extractTicketCode(new URL(request.url).searchParams.get('code'));
    if (!code.startsWith('MCIC-')) {
        return Response.json({ success: false, error: 'A ticket code is required.' }, { status: 400 });
    }

    const png = await ticketQrPng(code);
    return new Response(png, {
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=86400'
        }
    });
}
