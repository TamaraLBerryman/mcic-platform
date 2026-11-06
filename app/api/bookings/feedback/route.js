import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { emailFromRequest, hasAdminAccess } from '../../../lib/verifyUser';
import { isSiteVenue, sydneyTodayString } from '../../../lib/bookingRules';

export async function POST(request) {
    try {
        const email = await emailFromRequest(request);
        const { id, rating, comment } = await request.json();
        const score = Number(rating);
        if (!id || !Number.isInteger(score) || score < 1 || score > 5) {
            return Response.json({ success: false, error: 'Choose a rating from 1 to 5.' }, { status: 400 });
        }

        const bookingRef = doc(db, 'bookings', id);
        const snapshot = await getDoc(bookingRef);
        if (!snapshot.exists()) {
            return Response.json({ success: false, error: 'Booking not found.' }, { status: 404 });
        }
        const booking = snapshot.data();
        const owner = String(booking.organiserEmail || booking.mainContact?.email || '').toLowerCase();
        if (owner !== email && !(await hasAdminAccess(email))) {
            return Response.json({ success: false, error: 'This booking belongs to a different organiser.' }, { status: 403 });
        }
        if (booking.status !== 'APPROVED') {
            return Response.json({ success: false, error: 'Feedback is collected after an approved event.' }, { status: 400 });
        }
        if (!isSiteVenue(booking.space)) {
            return Response.json({ success: false, error: 'Venue feedback is only for events held in a space booked on this site.' }, { status: 400 });
        }
        const eventDate = booking.bumpInDate || '';
        if (!eventDate || eventDate >= sydneyTodayString()) {
            return Response.json({ success: false, error: 'Venue feedback opens the day after the event.' }, { status: 400 });
        }
        if (booking.venueFeedback?.submittedAt) {
            return Response.json({ success: true, feedback: booking.venueFeedback });
        }

        const feedback = {
            rating: score,
            comment: String(comment || '').trim().slice(0, 2000),
            submittedAt: new Date().toISOString(),
            email
        };
        await updateDoc(bookingRef, { venueFeedback: feedback });
        return Response.json({ success: true, feedback });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}
