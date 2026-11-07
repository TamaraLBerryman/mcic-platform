import { emailFromRequest } from '../../../lib/verifyUser';
import { saveAffiliation } from '../../../lib/userStore';

export async function POST(request) {
    try {
        const email = await emailFromRequest(request);
        const body = await request.json().catch(() => ({}));
        const affiliation = await saveAffiliation(email, body);
        return Response.json({ success: true, ...affiliation });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'Affiliation could not be saved.' }, { status: error.status || 500 });
    }
}
