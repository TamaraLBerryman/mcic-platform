import { emailFromRequest, hasAdminAccess } from '../../../../lib/verifyUser';
import { listAllHours, listBudgetCodes, markPayrollSent, saveBudgetCodes, saveOrganiser, setHoursArchived } from '../../../../lib/casualTimesheetStore';

async function requireAdmin(request) {
    const email = await emailFromRequest(request);
    if (!(await hasAdminAccess(email))) {
        const error = new Error('Sign in with the admin email to see casual hours.');
        error.status = 403;
        throw error;
    }
}

export async function GET(request) {
    try {
        await requireAdmin(request);
        const [shifts, budgetCodes] = await Promise.all([listAllHours(), listBudgetCodes()]);
        return Response.json({ success: true, shifts, budgetCodes });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'Casual hours could not be loaded.' }, { status: error.status || 500 });
    }
}

export async function POST(request) {
    try {
        await requireAdmin(request);
        const body = await request.json();
        const origin = new URL(request.url).origin;
        let shift = null;
        if (body.action === 'payroll') shift = await markPayrollSent(body.id, body.payrollSent);
        else if (body.action === 'archive') shift = await setHoursArchived(body.id, body.archived !== false);
        else if (body.action === 'codes') await saveBudgetCodes(body.codes);
        else shift = await saveOrganiser(body, origin, { allowApproved: true });
        const [shifts, budgetCodes] = await Promise.all([listAllHours(), listBudgetCodes()]);
        return Response.json({ success: true, shift, shifts, budgetCodes });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'The organiser could not be saved.' }, { status: error.status || 500 });
    }
}
