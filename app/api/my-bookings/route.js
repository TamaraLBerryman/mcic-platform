import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { emailFromRequest, hasAdminAccess } from '../../lib/verifyUser';
import { bookingQueueTag, holdAvailability } from '../../lib/bookingRules';

function summarise(id, data, approved) {
    const booking = { id, ...data, status: data.status || 'PENDING' };
    return {
        id,
        eventName: data.eventName || 'Untitled booking',
        space: data.space || '',
        bumpInDate: data.bumpInDate || '',
        bumpIn: data.bumpIn || '',
        bumpOut: data.bumpOut || '',
        eventStart: data.eventStart || '',
        eventEnd: data.eventEnd || '',
        status: booking.status,
        createdAt: data.createdAt || '',
        queueTag: bookingQueueTag(booking, approved),
        holdTags: holdAvailability(booking, approved),
        tentativeHolds: Array.isArray(data.tentativeHolds) ? data.tentativeHolds.map((hold) => ({
            space: hold.space || '',
            bumpInDate: hold.bumpInDate || '',
            bumpIn: hold.bumpIn || '',
            bumpOut: hold.bumpOut || ''
        })) : []
    };
}

export async function GET(request) {
    try {
        const email = await emailFromRequest(request);
        const admin = await hasAdminAccess(email);
        const [bookingsSnapshot, changesSnapshot] = await Promise.all([
            getDocs(collection(db, 'bookings')),
            getDocs(collection(db, 'bookingChanges'))
        ]);
        const records = bookingsSnapshot.docs.map(item => ({ id: item.id, ...item.data(), status: item.data().status || 'PENDING' }));
        const approved = records.filter(item => item.status === 'APPROVED');
        const bookings = records
            .filter(item => admin || String(item.organiserEmail || item.mainContact?.email || '').toLowerCase() === email)
            .map(item => summarise(item.id, item, approved))
            .sort((a, b) => (
                admin
                    ? String(a.createdAt).localeCompare(String(b.createdAt))
                    : String(b.bumpInDate).localeCompare(String(a.bumpInDate))
            ));
        const bookingIds = new Set(bookings.map(item => item.id));
        const changes = changesSnapshot.docs
            .map(item => ({ id: item.id, ...item.data() }))
            .filter(item => bookingIds.has(item.bookingId))
            .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        return Response.json({ success: true, email, bookings, changes });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}
