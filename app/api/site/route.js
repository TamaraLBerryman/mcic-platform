import { setTicketing, setTourVideo, siteSettings } from '../../lib/siteSettings';
import { emailFromRequest, hasAdminAccess } from '../../lib/verifyUser';

export async function GET() {
    try {
        const settings = await siteSettings();
        return Response.json({ success: true, ...settings });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'Site settings could not be loaded.' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const email = await emailFromRequest(request);
        if (!(await hasAdminAccess(email))) {
            return Response.json({ success: false, error: 'Sign in with an admin email to change ticketing.' }, { status: 403 });
        }
        const body = await request.json();
        if (!('ticketing' in body) && !('tourVideoUrl' in body)) {
            return Response.json({ success: false, error: 'Nothing to update.' }, { status: 400 });
        }
        if ('ticketing' in body) await setTicketing(body.ticketing);
        if ('tourVideoUrl' in body) await setTourVideo(body.tourVideoUrl, body.tourVideoPath);
        return Response.json({ success: true, ...(await siteSettings()) });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'Site settings could not be saved.' }, { status: error.status || 500 });
    }
}
