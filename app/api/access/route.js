import { emailFromRequest, hasAdminAccess } from '../../lib/verifyUser';
import { listMembers, removeMember, saveMember } from '../../lib/accessStore';
import { listLogins } from '../../lib/userStore';

async function requireAdmin(request) {
    const email = await emailFromRequest(request);
    if (!(await hasAdminAccess(email))) {
        const error = new Error('Sign in with an admin email to manage access.');
        error.status = 403;
        throw error;
    }
}

export async function GET(request) {
    try {
        await requireAdmin(request);
        const [people, accounts] = await Promise.all([listMembers(), listLogins()]);
        return Response.json({ success: true, people, accounts });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'Access could not be loaded.' }, { status: error.status || 500 });
    }
}

export async function POST(request) {
    try {
        await requireAdmin(request);
        const body = await request.json();
        if (body.action === 'remove') {
            await removeMember(body.email);
            return Response.json({ success: true, people: await listMembers() });
        }
        const person = await saveMember(body.email, body.group, body);
        return Response.json({ success: true, person, people: await listMembers() });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'That person could not be saved.' }, { status: error.status || 500 });
    }
}
