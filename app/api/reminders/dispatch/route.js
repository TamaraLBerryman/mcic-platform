import { dispatchDueReminders } from '../../../lib/dispatchReminders';
import { dispatchOrganiserEmails } from '../../../lib/organiserEmails';

export async function POST() {
    try {
        const reminders = await dispatchDueReminders();
        const organiser = await dispatchOrganiserEmails();
        return Response.json({ success: true, reminders, organiser });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
