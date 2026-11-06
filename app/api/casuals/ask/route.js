import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { sendPlainEmail } from '../../../lib/mail';
import { emailFromRequest, hasAdminAccess } from '../../../lib/verifyUser';
import { casualsInGroup, linkTokenFor } from '../../../lib/casualDirectory';
import { offerDocId, sanitizeShift, shiftDetailsText } from '../../../lib/casualOffers';

export async function POST(request) {
    try {
        const reviewer = await emailFromRequest(request);
        if (!(await hasAdminAccess(reviewer))) {
            return Response.json({ success: false, error: 'Sign in with the admin email to send shifts.' }, { status: 403 });
        }

        const body = await request.json();
        const group = String(body.group || '').trim();
        const shifts = (Array.isArray(body.shifts) ? body.shifts : []).map(sanitizeShift).filter(Boolean).slice(0, 200);
        if (!group) {
            return Response.json({ success: false, error: 'Choose which group of casuals should receive these shifts.' }, { status: 400 });
        }
        if (!shifts.length) {
            return Response.json({ success: false, error: 'There are no shifts to send.' }, { status: 400 });
        }

        const people = await casualsInGroup(group);
        const withEmail = people.filter((person) => person.email);
        if (!withEmail.length) {
            return Response.json({ success: false, error: `No active casuals in ${group} have an email yet.` }, { status: 400 });
        }
        const ready = [];
        for (const person of withEmail) {
            ready.push({ ...person, token: await linkTokenFor(person.id) });
        }

        const askedAt = new Date().toISOString();
        for (const shift of shifts) {
            const ref = doc(db, 'casualOffers', offerDocId(shift.id));
            const existing = await getDoc(ref);
            const previous = existing.exists() ? existing.data() : {};
            const asked = Array.isArray(previous.asked) ? [...previous.asked] : [];
            for (const person of ready) {
                if (!asked.some((entry) => entry.email === person.email)) {
                    asked.push({ id: person.id, name: person.name, email: person.email, group });
                }
            }
            await setDoc(ref, {
                ...shift,
                shiftKey: shift.id,
                askedAt,
                askedGroup: group,
                asked,
                responses: Array.isArray(previous.responses) ? previous.responses : [],
                assigned: Array.isArray(previous.assigned) ? previous.assigned : []
            });
        }

        const origin = new URL(request.url).origin;
        const lines = shifts.map((shift) => shiftDetailsText(shift)).join('\n\n');
        const failed = [];
        for (const person of ready) {
            try {
                await sendPlainEmail({
                    to: person.email,
                    subject: 'Are you free for these MCIC shifts?',
                    text: [
                        `Hi ${person.name},`,
                        '',
                        'Sign in with this email address, then mark whether you can do each shift:',
                        `${origin}/login?next=${encodeURIComponent('/casuals/available')}`,
                        '',
                        'When you are rostered on, enter your actual hours here:',
                        `${origin}/login?next=${encodeURIComponent('/casuals/hours')}`,
                        '',
                        lines,
                        '',
                        'You can change an answer until you are booked onto that shift.'
                    ].join('\n')
                });
            } catch (error) {
                failed.push(`${person.name}: ${error.message}`);
            }
        }

        return Response.json({
            success: true,
            sent: ready.length - failed.length,
            asked: ready.length,
            failed,
            group,
            missing: people.filter((person) => !person.email).map((person) => person.name)
        });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'The shifts could not be sent.' }, { status: error.status || 500 });
    }
}
