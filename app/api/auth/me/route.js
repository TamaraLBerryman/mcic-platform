import { accessFromMember } from '../../../lib/access';
import { memberGroup } from '../../../lib/accessStore';
import { recordLogin } from '../../../lib/userStore';
import { emailFromRequest, isAdminEmail } from '../../../lib/verifyUser';

export async function GET(request) {
    try {
        const email = await emailFromRequest(request);
        const group = await memberGroup(email);
        const access = accessFromMember(email, group, isAdminEmail(email));
        recordLogin(email, access.group).catch(() => {});
        return Response.json({ success: true, ...access });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}
