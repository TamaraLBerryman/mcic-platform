import { emailFromRequest, hasAdminAccess } from '../../../lib/verifyUser';
import { addCasualGroup, listCasuals, saveCasual, setCasualArchived } from '../../../lib/casualDirectory';

async function requireAdmin(request) {
    const email = await emailFromRequest(request);
    if (!(await hasAdminAccess(email))) {
        const error = new Error('Sign in with the admin email to see casual details.');
        error.status = 403;
        throw error;
    }
}

export async function GET(request) {
    try {
        await requireAdmin(request);
        const { people, groups } = await listCasuals();
        return Response.json({ success: true, people, groups });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'The casual roster could not be loaded.' }, { status: error.status || 500 });
    }
}

export async function POST(request) {
    try {
        await requireAdmin(request);
        const body = await request.json();
        if (body.action === 'archive' || body.action === 'restore') {
            await setCasualArchived(String(body.id || ''), body.action === 'archive');
        } else if (body.action === 'addGroup') {
            await addCasualGroup(body.name);
        } else {
            await saveCasual(body.person || {});
        }
        const { people, groups } = await listCasuals();
        return Response.json({ success: true, people, groups });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'That casual could not be saved.' }, { status: error.status || 500 });
    }
}
