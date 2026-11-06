import { dispatchDueReminders } from './dispatchReminders';
import { dispatchOrganiserEmails } from './organiserEmails';

const HOUR = 60 * 60 * 1000;
const globalKey = '__mcicMailScheduler';

async function sendDueMail() {
    const state = globalThis[globalKey];
    if (!state || state.running) return;
    state.running = true;
    try {
        await dispatchDueReminders();
        await dispatchOrganiserEmails();
    } catch (error) {
        console.error('Scheduled mail error:', error);
    } finally {
        state.running = false;
    }
}

export function startMailScheduler() {
    if (globalThis[globalKey]) return;
    const state = { running: false };
    globalThis[globalKey] = state;
    sendDueMail();
    const timer = setInterval(sendDueMail, HOUR);
    if (typeof timer.unref === 'function') timer.unref();
}
