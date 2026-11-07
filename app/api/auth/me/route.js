import { accessFromMember } from '../../../lib/access';
import { memberAffiliation, memberGroup } from '../../../lib/accessStore';
import { affiliationFor, recordLogin } from '../../../lib/userStore';
import { emailFromRequest, isAdminEmail } from '../../../lib/verifyUser';

export async function GET(request) {
    try {
        const email = await emailFromRequest(request);
        const group = await memberGroup(email);
        const access = accessFromMember(email, group, isAdminEmail(email));
        const affiliation = (await affiliationFor(email)) || (await memberAffiliation(email)) || {};
        recordLogin(email, access.group).catch(() => {});
        return Response.json({ success: true, ...access, ...affiliation });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}
