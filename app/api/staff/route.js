import { emailFromRequest, hasAdminAccess } from '../../lib/verifyUser';
import { listFoundersStaff, removeFoundersStaff, saveFoundersStaff } from '../../lib/foundersStaff';

export async function GET() {
    try {
        const staff = await listFoundersStaff();
        return Response.json({ success: true, staff });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'The staff directory could not be loaded.' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const email = await emailFromRequest(request);
        if (!(await hasAdminAccess(email))) {
            return Response.json({ success: false, error: 'Sign in with an admin email to edit the staff directory.' }, { status: 403 });
        }
        const body = await request.json();
        if (body.action === 'remove') await removeFoundersStaff(body.email);
        else await saveFoundersStaff(body);
        return Response.json({ success: true, staff: await listFoundersStaff() });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'That staff member could not be saved.' }, { status: error.status || 500 });
    }
}
