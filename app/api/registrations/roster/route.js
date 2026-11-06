import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { emailFromRequest, hasAdminAccess } from '../../../lib/verifyUser';

function ownerEmail(data) {
    return String(data.organiserEmail || data.mainContact?.email || '').toLowerCase();
}

async function allowedSlug(email, eventSlug, bookingId) {
    if (bookingId) {
        const snapshot = await getDoc(doc(db, 'bookings', bookingId));
        if (!snapshot.exists()) {
            const error = new Error('Booking not found.');
            error.status = 404;
            throw error;
        }
        const booking = snapshot.data();
        if (ownerEmail(booking) !== email && !(await hasAdminAccess(email))) {
            const error = new Error('This booking belongs to a different organiser.');
            error.status = 403;
            throw error;
        }
        return {
            eventSlug: booking.publicEventSlug || '',
            eventTitle: booking.eventName || '',
            usingPlatform: booking.ticketing?.method === 'internal'
        };
    }

    if (!eventSlug) {
        const error = new Error('An event is required.');
        error.status = 400;
        throw error;
    }
    if (await hasAdminAccess(email)) {
        return { eventSlug, eventTitle: '', usingPlatform: true };
    }

    const bookings = await getDocs(collection(db, 'bookings'));
    const ownsBooking = bookings.docs.some(item => ownerEmail(item.data()) === email && item.data().publicEventSlug === eventSlug);
    if (ownsBooking) return { eventSlug, eventTitle: '', usingPlatform: true };

    const listings = await getDocs(query(collection(db, 'publicEvents'), where('slug', '==', eventSlug)));
    const ownsListing = listings.docs.some(item => ownerEmail(item.data()) === email);
    if (ownsListing) return { eventSlug, eventTitle: listings.docs[0]?.data()?.title || '', usingPlatform: true };

    const error = new Error('Only the person who booked, or an admin, can view registrations.');
    error.status = 403;
    throw error;
}

export async function GET(request) {
    try {
        const email = await emailFromRequest(request);
        const params = new URL(request.url).searchParams;
        const access = await allowedSlug(email, params.get('eventSlug') || '', params.get('bookingId') || '');
        if (!access.eventSlug) {
            return Response.json({
                success: true,
                eventSlug: '',
                eventTitle: access.eventTitle,
                usingPlatform: false,
                registrations: []
            });
        }

        const snapshot = await getDocs(query(collection(db, 'registrations'), where('eventSlug', '==', access.eventSlug)));
        const registrations = snapshot.docs
            .filter(item => item.data().status !== 'PENDING_REVIEW' && item.data().status !== 'DENIED')
            .map(item => {
                const data = item.data();
                return {
                    id: item.id,
                    eventTitle: data.eventTitle || access.eventTitle,
                    status: data.status || 'REGISTERED',
                    attendedAt: data.attendedAt || null,
                    createdAt: data.createdAt || '',
                    answers: data.answers || {}
                };
            })
            .sort((a, b) => {
                const left = `${a.answers.lastName || ''} ${a.answers.firstName || ''}`.toLowerCase();
                const right = `${b.answers.lastName || ''} ${b.answers.firstName || ''}`.toLowerCase();
                return left.localeCompare(right);
            });

        return Response.json({
            success: true,
            eventSlug: access.eventSlug,
            eventTitle: registrations[0]?.eventTitle || access.eventTitle,
            usingPlatform: true,
            registrations
        });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}
