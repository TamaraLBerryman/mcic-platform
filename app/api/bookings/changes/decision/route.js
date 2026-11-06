import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { createBookingCalendarHolds, deleteCalendarEvent } from '../../../../lib/googleCalendar';
import { sendPlainEmail } from '../../../../lib/mail';
import { emailFromRequest, hasAdminAccess } from '../../../../lib/verifyUser';

async function deleteHolds(booking) {
    const eventIds = [...new Set([...(booking.googleEventIds || []), booking.googleEventId].filter(Boolean))];
    for (const eventId of eventIds) {
        try {
            await deleteCalendarEvent(eventId);
        } catch {
            console.error('Calendar delete failed');
        }
    }
}

export async function POST(request) {
    try {
        const email = await emailFromRequest(request);
        if (!(await hasAdminAccess(email))) {
            return Response.json({ success: false, error: 'Only an admin can review a booking change.' }, { status: 403 });
        }

        const { id, decision } = await request.json();
        if (!id || !['APPROVED', 'DECLINED'].includes(decision)) {
            return Response.json({ success: false, error: 'A change id and a decision are required.' }, { status: 400 });
        }

        const changeRef = doc(db, 'bookingChanges', id);
        const changeSnapshot = await getDoc(changeRef);
        if (!changeSnapshot.exists()) {
            return Response.json({ success: false, error: 'Change request not found.' }, { status: 404 });
        }
        const change = changeSnapshot.data();
        if (change.status !== 'PENDING') {
            return Response.json({ success: false, error: 'This change has already been reviewed.' }, { status: 409 });
        }

        const bookingRef = doc(db, 'bookings', change.bookingId);
        const bookingSnapshot = await getDoc(bookingRef);
        if (!bookingSnapshot.exists()) {
            return Response.json({ success: false, error: 'Booking not found.' }, { status: 404 });
        }
        const booking = bookingSnapshot.data();
        let calendarError = null;

        if (change.type === 'REMOVE_TENTATIVE_HOLDS') {
            if (decision === 'APPROVED') {
                await deleteHolds(booking);
                await updateDoc(bookingRef, {
                    status: 'CANCELLED',
                    cancelledAt: new Date().toISOString(),
                    'tentativeCycle.removedAt': new Date().toISOString(),
                    calendarError: null
                });
                if (booking.publicEventId) {
                    await updateDoc(doc(db, 'publicEvents', booking.publicEventId), { status: 'CANCELLED' });
                }
            } else {
                await updateDoc(bookingRef, {
                    'tentativeCycle.startedAt': new Date().toISOString(),
                    'tentativeCycle.confirmReminderSentAt': null,
                    'tentativeCycle.finalReminderSentAt': null,
                    'tentativeCycle.removalChangeId': null
                });
            }
        }

        if (decision === 'APPROVED' && change.type === 'CANCEL') {
            await deleteHolds(booking);
            await updateDoc(bookingRef, {
                status: 'CANCELLED',
                cancelledAt: new Date().toISOString(),
                calendarError: null
            });
            if (booking.publicEventId) {
                await updateDoc(doc(db, 'publicEvents', booking.publicEventId), { status: 'CANCELLED' });
            }
        }

        if (decision === 'APPROVED' && change.type === 'UPDATE') {
            const requested = change.requested || {};
            const holds = await createBookingCalendarHolds({
                ...booking,
                ...requested,
                recurrence: { pattern: 'none', bookedDates: [requested.bumpInDate], skippedDates: [] },
                bookingId: bookingSnapshot.id,
                approvalUrl: booking.approvalUrl,
                holdDates: [requested.bumpInDate]
            });
            calendarError = holds.calendarError;
            if (holds.ids.length) await deleteHolds(booking);
            await updateDoc(bookingRef, {
                eventName: requested.eventName,
                space: requested.space,
                bumpInDate: requested.bumpInDate,
                bumpIn: requested.bumpIn,
                eventStart: requested.eventStart,
                eventEnd: requested.eventEnd,
                bumpOut: requested.bumpOut,
                recurrence: { pattern: 'none', interval: 1, end: null, bookedDates: [requested.bumpInDate], skippedDates: [] },
                googleEventId: holds.ids[0] || booking.googleEventId || null,
                googleEventIds: holds.ids.length ? holds.ids : (booking.googleEventIds || []),
                calendarError
            });
            if (booking.publicEventId) {
                await updateDoc(doc(db, 'publicEvents', booking.publicEventId), {
                    title: requested.eventName,
                    space: requested.space,
                    eventDate: requested.bumpInDate,
                    eventStart: requested.eventStart,
                    eventEnd: requested.eventEnd
                });
            }
        }

        await updateDoc(changeRef, {
            status: decision,
            decidedAt: new Date().toISOString(),
            decidedBy: email,
            calendarError
        });

        const organiser = change.requesterEmail;
        if (organiser) {
            const outcome = decision === 'APPROVED' ? 'approved' : 'declined';
            const text = change.type === 'REMOVE_TENTATIVE_HOLDS'
                ? decision === 'APPROVED'
                    ? `The tentative holds for ${change.before?.eventName || 'your booking'} were removed.`
                    : `The tentative holds for ${change.before?.eventName || 'your booking'} are staying. Please confirm one date. You will get another reminder in one week, and a final reminder two weeks from today.`
                : decision === 'APPROVED' && change.type === 'CANCEL'
                ? `Your cancellation for ${change.before?.eventName || 'the booking'} was approved. The booking is cancelled.`
                : decision === 'APPROVED'
                    ? `Your update for ${requestedName(change)} was approved.${calendarError ? ` The calendar hold could not be moved: ${calendarError}` : ''}`
                    : `Your requested change for ${change.before?.eventName || 'the booking'} was declined. The booking is unchanged.`;
            await sendPlainEmail({
                to: organiser,
                subject: `Your booking change was ${outcome}`,
                text
            }).catch(() => {});
        }

        return Response.json({ success: true, status: decision, calendarError });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}

function requestedName(change) {
    return change.requested?.eventName || change.before?.eventName || 'the booking';
}
