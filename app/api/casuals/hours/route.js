import { casualFromRequest } from '../../../lib/casualDirectory';
import { addUnrosteredHours, listCasualHours, resubmitAddedHours, saveOrganiser, submitRosteredHours } from '../../../lib/casualTimesheetStore';

export async function GET(request) {
    try {
        const person = await casualFromRequest(request);
        const shifts = await listCasualHours(person);
        return Response.json({ success: true, name: person.name, shifts });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'The shifts could not be loaded.' }, { status: error.status || 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const person = await casualFromRequest(request);
        const origin = new URL(request.url).origin;
        let shift;
        if (body.action === 'add') shift = await addUnrosteredHours(person, body, origin);
        else if (body.action === 'organiser') {
            const sheets = await listCasualHours(person);
            const match = sheets.find((entry) => entry.id === body.id || (body.shiftKey && entry.shiftKey === body.shiftKey));
            if (!match || (match.casualId && match.casualId !== person.id)) {
                return Response.json({ success: false, error: 'That shift could not be found.' }, { status: 404 });
            }
            shift = await saveOrganiser({ ...body, id: match.id, shiftKey: match.shiftKey, casualId: person.id, casualName: person.name }, origin, { allowApproved: false });
        } else if (body.source === 'added') shift = await resubmitAddedHours(person, body, origin);
        else shift = await submitRosteredHours(person, body, origin);
        return Response.json({ success: true, shift, emailError: shift.emailError || '' });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'Those hours could not be saved.' }, { status: error.status || 500 });
    }
}
