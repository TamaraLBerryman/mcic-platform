import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { deleteCalendarEvent } from '../../../lib/googleCalendar';
import { emailFromRequest, hasAdminAccess } from '../../../lib/verifyUser';
import { sendPlainEmail } from '../../../lib/mail';
import { approvalText } from '../../../lib/organiserEmails';

export async function POST(request) {
    try {
        const email = await emailFromRequest(request);
        if (!(await hasAdminAccess(email))) {
            return Response.json({ success: false, error: 'Only an admin can approve or decline a booking.' }, { status: 403 });
        }
        const { id, decision } = await request.json();
        if (!id || !['APPROVED', 'DECLINED'].includes(decision)) {
            return Response.json({ success: false, error: 'A booking id and decision of APPROVED or DECLINED are required.' }, { status: 400 });
        }

        const bookingRef = doc(db, 'bookings', id);
        const snapshot = await getDoc(bookingRef);
        if (!snapshot.exists()) {
            return Response.json({ success: false, error: 'Booking not found.' }, { status: 404 });
        }

        const booking = snapshot.data();
        await updateDoc(bookingRef, {
            status: decision,
            decidedAt: new Date().toISOString()
        });

        if (booking.publicEventId) {
            await updateDoc(doc(db, 'publicEvents', booking.publicEventId), { status: decision });
        }

        if (decision === 'APPROVED') {
            try {
                await sendPlainEmail({
                    to: booking.organiserEmail || booking.mainContact?.email,
                    subject: `Your booking is approved: ${booking.eventName || 'MCIC booking'}`,
                    text: approvalText({ ...booking, id, status: 'APPROVED' })
                });
                await updateDoc(bookingRef, {
                    'organiserMail.approvalSentAt': new Date().toISOString(),
                    'organiserMail.approvalError': ''
                });
            } catch (error) {
                await updateDoc(bookingRef, { 'organiserMail.approvalError': error.message });
            }
        }

        if (decision === 'DECLINED') {
            const eventIds = [...new Set([...(booking.googleEventIds || []), booking.googleEventId].filter(Boolean))];
            for (const eventId of eventIds) {
                try {
                    await deleteCalendarEvent(eventId);
                } catch {
                    console.error('Calendar delete failed');
                }
            }
        }

        return Response.json({ success: true, status: decision });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}
