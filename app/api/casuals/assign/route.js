import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { sendPlainEmail } from '../../../lib/mail';
import { createCasualShiftHold, deleteCalendarEvent } from '../../../lib/googleCalendar';
import { emailFromRequest, hasAdminAccess } from '../../../lib/verifyUser';
import { casualHoldDescription, cleanEmail, offerDocId } from '../../../lib/casualOffers';

export async function POST(request) {
    try {
        const reviewer = await emailFromRequest(request);
        if (!(await hasAdminAccess(reviewer))) {
            return Response.json({ success: false, error: 'Sign in with the admin email to book a casual.' }, { status: 403 });
        }

        const body = await request.json();
        const shiftKey = String(body.shiftKey || '').trim();
        const email = cleanEmail(body.email);
        if (!shiftKey || !email) {
            return Response.json({ success: false, error: 'Choose a shift and a casual.' }, { status: 400 });
        }

        const ref = doc(db, 'casualOffers', offerDocId(shiftKey));
        const previewSnap = await getDoc(ref);
        if (!previewSnap.exists() || previewSnap.data().shiftKey !== shiftKey) {
            return Response.json({ success: false, error: 'Ask casuals about this shift before booking someone.' }, { status: 404 });
        }
        const preview = previewSnap.data();

        const responses = Array.isArray(preview.responses) ? preview.responses : [];
        const person = responses.find((entry) => entry.email === email && entry.available);
        if (!person) {
            return Response.json({ success: false, error: 'That casual has not said they are available.' }, { status: 409 });
        }
        const assigned = Array.isArray(preview.assigned) ? preview.assigned : [];
        const existing = assigned.find((entry) => entry.email === email);
        if (existing?.calendarEventId) {
            return Response.json({ success: false, error: `${person.name} is already booked on this shift.` }, { status: 409 });
        }
        if (!existing && assigned.length >= (preview.quantity || 1)) {
            return Response.json({ success: false, error: 'This shift already has enough people booked.' }, { status: 409 });
        }

        let calendarEventId = '';
        let calendarError = '';
        try {
            const created = await createCasualShiftHold(preview, email);
            calendarEventId = created?.id || '';
            if (!calendarEventId) calendarError = 'Calendar hold did not return an event.';
        } catch (error) {
            calendarError = String(error.message || 'Calendar hold could not be created.').slice(0, 300);
        }

        let emailError = '';
        if (calendarError) {
            try {
                await sendPlainEmail({
                    to: email,
                    subject: `Your MCIC shift: ${preview.event || 'Casual shift'}`,
                    text: casualHoldDescription(preview)
                });
            } catch (error) {
                emailError = String(error.message || 'Email could not be sent.').slice(0, 300);
            }
        }

        const booking = {
            name: person.name,
            email,
            at: new Date().toISOString(),
            calendarEventId,
            calendarError,
            emailError
        };
        const saved = await runTransaction(db, async (tx) => {
            const snapshot = await tx.get(ref);
            const offer = snapshot.data() || {};
            const current = Array.isArray(offer.assigned) ? offer.assigned : [];
            const already = current.find((entry) => entry.email === email);
            if (already?.calendarEventId) return { ok: false, reason: `${person.name} is already booked on this shift.` };
            if (!already && current.length >= (offer.quantity || 1)) return { ok: false, reason: 'This shift already has enough people booked.' };
            const next = current.filter((entry) => entry.email !== email);
            next.push(booking);
            tx.update(ref, { assigned: next });
            return { ok: true };
        });

        if (!saved.ok) {
            if (calendarEventId) await deleteCalendarEvent(calendarEventId).catch(() => {});
            return Response.json({ success: false, error: saved.reason }, { status: 409 });
        }

        return Response.json({ success: true, name: person.name, calendarEventId, calendarError, emailError });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'That casual could not be booked.' }, { status: error.status || 500 });
    }
}
