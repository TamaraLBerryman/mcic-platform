import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { emailFromRequest, hasAdminAccess } from '../../lib/verifyUser';

function summarise(id, data) {
    return {
        id,
        eventName: data.eventName || 'Untitled booking',
        space: data.space || '',
        bumpInDate: data.bumpInDate || '',
        bumpIn: data.bumpIn || '',
        bumpOut: data.bumpOut || '',
        eventStart: data.eventStart || '',
        eventEnd: data.eventEnd || '',
        status: data.status || 'PENDING',
        createdAt: data.createdAt || ''
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
        const bookings = bookingsSnapshot.docs
            .filter(item => admin || String(item.data().organiserEmail || item.data().mainContact?.email || '').toLowerCase() === email)
            .map(item => summarise(item.id, item.data()))
            .sort((a, b) => String(b.bumpInDate).localeCompare(String(a.bumpInDate)));
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
