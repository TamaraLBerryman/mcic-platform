import { emailFromRequest } from '../../../../lib/verifyUser';
import { approveHours, listBudgetCodes, rejectHours, sheetsForOrganiser } from '../../../../lib/casualTimesheetStore';

export async function GET(request) {
    try {
        const email = await emailFromRequest(request);
        const shifts = await sheetsForOrganiser(email);
        const budgetCodes = await listBudgetCodes();
        return Response.json({ success: true, shifts, budgetCodes });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'The hours could not be loaded.' }, { status: error.status || 500 });
    }
}

export async function POST(request) {
    try {
        const email = await emailFromRequest(request);
        const body = await request.json();
        const identity = { id: body.id, organiserEmail: email };
        const shift = body.action === 'reject'
            ? await rejectHours('', body.note, identity)
            : await approveHours('', body.fund, identity);
        return Response.json({ success: true, shift });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'These hours could not be approved.' }, { status: error.status || 500 });
    }
}
