import QRCode from 'qrcode';
import { publishedHotDesk } from '../../../lib/hotDesks';

export async function GET(request) {
    const key = new URL(request.url).searchParams.get('key') || '';
    const desk = await publishedHotDesk(key);
    if (!desk) {
        return Response.json({ success: false, error: 'That hot desk could not be found.' }, { status: 404 });
    }

    const origin = new URL(request.url).origin;
    const url = `${origin}/coworking/desk/${encodeURIComponent(key)}`;
    const png = await QRCode.toBuffer(url, { width: 640, margin: 1, errorCorrectionLevel: 'M' });
    return new Response(png, {
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'no-store'
        }
    });
}
