import { dispatchDueReminders } from '../../../lib/dispatchReminders';

export async function POST() {
    try {
        const result = await dispatchDueReminders();
        return Response.json({ success: true, ...result });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
