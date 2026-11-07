import { addDoc, collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { emailFromRequest, hasAdminAccess } from '../../../lib/verifyUser';
import { siteSettings } from '../../../lib/siteSettings';

function slugify(name, date) {
    const base = String(name || 'event')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'event';
    return `${base}-${date || 'date'}`;
}

export async function POST(request) {
    try {
        const email = await emailFromRequest(request);
        const body = await request.json();
        const bookingId = String(body.bookingId || '');
        if (!bookingId) {
            return Response.json({ success: false, error: 'Booking id is required.' }, { status: 400 });
        }
        const settings = await siteSettings();
        if (settings.ticketing === false) {
            return Response.json({ success: false, error: 'Ticketing is turned off.' }, { status: 400 });
        }

        const ref = doc(db, 'bookings', bookingId);
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) {
            return Response.json({ success: false, error: 'Booking not found.' }, { status: 404 });
        }
        const booking = snapshot.data();
        const owner = String(booking.organiserEmail || booking.mainContact?.email || '').toLowerCase();
        if (owner !== email && !(await hasAdminAccess(email))) {
            return Response.json({ success: false, error: 'This booking belongs to a different organiser.' }, { status: 403 });
        }

        const method = body.method === 'internal' ? 'internal' : body.method === 'external' ? 'external' : 'none';
        const postToPublicDirectory = Boolean(body.postToPublicDirectory);
        const ticketing = {
            method,
            externalTicketUrl: method === 'external' ? String(body.externalTicketUrl || '') : '',
            ticketBannerName: method === 'internal' ? String(body.ticketBannerName || '') : '',
            maxTicketCapacity: method === 'internal' ? Number(body.maxTicketCapacity) || 0 : 0,
            ticketTiers: method === 'internal' && Array.isArray(body.ticketTiers) ? body.ticketTiers : []
        };

        let publicEventId = booking.publicEventId || null;
        let publicEventSlug = booking.publicEventSlug || '';
        if (postToPublicDirectory && !publicEventId) {
            const eventDate = booking.bumpInDate;
            publicEventSlug = slugify(booking.eventName, eventDate);
            const eventRef = await addDoc(collection(db, 'publicEvents'), {
                bookingId,
                title: booking.eventName || 'MCIC Event',
                eventDate,
                eventStart: booking.eventStart || booking.bumpIn,
                eventEnd: booking.eventEnd || booking.bumpOut,
                space: booking.space,
                description: booking.eventDescription || '',
                slug: publicEventSlug,
                isPublicListing: true,
                registrationType: method === 'external' ? 'EXTERNAL' : 'MCIC_PLATFORM',
                externalTicketUrl: ticketing.externalTicketUrl,
                ticketBannerName: ticketing.ticketBannerName,
                ticketTiers: ticketing.ticketTiers,
                emailReminders: booking.emailReminders || { enabled: false, reminders: [] },
                status: 'PENDING',
                department: booking.department || '',
                eventType: booking.department === 'UNSW Founders'
                    ? 'UNSW_FOUNDERS'
                    : booking.userType === 'External to UNSW'
                        ? 'EXTERNAL_HIRER'
                        : 'UNSW_DEPARTMENT',
                organizerName: booking.mainContact?.name || '',
                image: '/images/venues/event-space-1.JPG',
                collection: 'MCIC Bookings'
            });
            publicEventId = eventRef.id;
        }

        await updateDoc(ref, { postToPublicDirectory, ticketing, publicEventId, publicEventSlug });
        return Response.json({ success: true, bookingId, publicEventId });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}
