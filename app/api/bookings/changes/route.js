import { addDoc, collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { sendPlainEmail } from '../../../lib/mail';
import { adminEmails, emailFromRequest, hasAdminAccess } from '../../../lib/verifyUser';
import {
    BOOKABLE_SPACES,
    bookingWindowForDate,
    isIsoDate,
    isUnswStaff,
    lockoutMessage
} from '../../../lib/bookingRules';

function isTime(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
}

function scheduleOf(booking) {
    return {
        eventName: booking.eventName || '',
        space: booking.space || '',
        bumpInDate: booking.bumpInDate || '',
        bumpIn: booking.bumpIn || '',
        eventStart: booking.eventStart || '',
        eventEnd: booking.eventEnd || '',
        bumpOut: booking.bumpOut || ''
    };
}

function ownsBooking(booking, email) {
    return String(booking.organiserEmail || booking.mainContact?.email || '').toLowerCase() === email;
}

export async function GET(request) {
    try {
        const email = await emailFromRequest(request);
        const admin = await hasAdminAccess(email);
        const snapshot = await getDocs(collection(db, 'bookingChanges'));
        const changes = snapshot.docs
            .map(item => ({ id: item.id, ...item.data() }))
            .filter(item => admin || item.requesterEmail === email)
            .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        return Response.json({ success: true, changes });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}

export async function POST(request) {
    try {
        const email = await emailFromRequest(request);
        const body = await request.json();
        const bookingId = String(body.bookingId || '');
        const type = body.type === 'CANCEL' ? 'CANCEL' : 'UPDATE';
        const message = String(body.message || '').trim();
        if (!bookingId || !message) {
            return Response.json({ success: false, error: 'A booking and a note for the reviewer are required.' }, { status: 400 });
        }

        const bookingRef = doc(db, 'bookings', bookingId);
        const snapshot = await getDoc(bookingRef);
        if (!snapshot.exists()) {
            return Response.json({ success: false, error: 'Booking not found.' }, { status: 404 });
        }
        const booking = snapshot.data();
        if (!ownsBooking(booking, email)) {
            return Response.json({ success: false, error: 'This booking belongs to a different organiser.' }, { status: 403 });
        }
        if (['DECLINED', 'CANCELLED'].includes(booking.status)) {
            return Response.json({ success: false, error: 'This booking can no longer be changed.' }, { status: 409 });
        }

        const existing = await getDocs(collection(db, 'bookingChanges'));
        const pending = existing.docs.some(item => item.data().bookingId === bookingId && item.data().status === 'PENDING');
        if (pending) {
            return Response.json({ success: false, error: 'A change for this booking is already waiting for review.' }, { status: 409 });
        }

        let requested = null;
        if (type === 'UPDATE') {
            requested = {
                eventName: String(body.eventName || '').trim(),
                space: body.space,
                bumpInDate: body.bumpInDate,
                bumpIn: body.bumpIn,
                eventStart: body.eventStart,
                eventEnd: body.eventEnd,
                bumpOut: body.bumpOut
            };
            if (!requested.eventName || !BOOKABLE_SPACES.includes(requested.space) || !isIsoDate(requested.bumpInDate)) {
                return Response.json({ success: false, error: 'Enter the event name, space, and date.' }, { status: 400 });
            }
            if (![requested.bumpIn, requested.eventStart, requested.eventEnd, requested.bumpOut].every(isTime)) {
                return Response.json({ success: false, error: 'Enter bump-in, start, end, and bump-out times.' }, { status: 400 });
            }
            if (!(requested.bumpIn <= requested.eventStart && requested.eventStart <= requested.eventEnd && requested.eventEnd <= requested.bumpOut)) {
                return Response.json({ success: false, error: 'Times need to run from bump-in, to the event, to bump-out.' }, { status: 400 });
            }
            if (!isUnswStaff(booking.userType)) {
                const windowInfo = bookingWindowForDate(requested.bumpInDate);
                if (windowInfo.locked) {
                    return Response.json({ success: false, error: lockoutMessage(windowInfo) }, { status: 400 });
                }
            }
        }

        const origin = new URL(request.url).origin;
        const change = {
            bookingId,
            requesterEmail: email,
            requesterName: booking.mainContact?.name || '',
            type,
            status: 'PENDING',
            message,
            before: scheduleOf(booking),
            requested,
            createdAt: new Date().toISOString()
        };
        const changeRef = await addDoc(collection(db, 'bookingChanges'), change);
        const reviewUrl = `${origin}/admin/changes?id=${changeRef.id}`;

        const lines = [
            'A booking change is waiting for review. The live booking has not been changed.',
            '',
            `Event: ${booking.eventName || 'Untitled booking'}`,
            `Organiser: ${booking.mainContact?.name || 'Organiser'} <${email}>`,
            `Request: ${type === 'CANCEL' ? 'Cancel this booking' : 'Update the booking details'}`,
            `Note: ${message}`,
            '',
            `Current: ${change.before.bumpInDate} ${change.before.bumpIn}–${change.before.bumpOut}, ${change.before.space}`
        ];
        if (requested) {
            lines.push(`Requested: ${requested.bumpInDate} ${requested.bumpIn}–${requested.bumpOut}, ${requested.space}`);
            lines.push(`Event name: ${requested.eventName}`);
        }
        lines.push('', `Review: ${reviewUrl}`);

        let emailSent = false;
        let emailError = '';
        try {
            await sendPlainEmail({
                to: adminEmails(),
                subject: `Booking change waiting for review: ${booking.eventName || 'MCIC booking'}`,
                text: lines.join('\n')
            });
            emailSent = true;
        } catch (error) {
            emailError = error.message;
        }

        return Response.json({ success: true, changeId: changeRef.id, reviewUrl, emailSent, emailError });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}
