import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sydneyWallClock } from '../../lib/eventReminders';
import { countsAsGuest, expandBooking, expandListing } from '../../lib/liveBoards';

export async function GET() {
    try {
        const [bookingsSnapshot, eventsSnapshot, registrationsSnapshot] = await Promise.all([
            getDocs(collection(db, 'bookings')),
            getDocs(collection(db, 'publicEvents')),
            getDocs(collection(db, 'registrations'))
        ]);
        const counts = { registrations: {}, checkedIn: {} };
        registrationsSnapshot.docs.forEach((entry) => {
            const data = entry.data();
            if (!countsAsGuest(data) || !data.eventSlug) return;
            counts.registrations[data.eventSlug] = (counts.registrations[data.eventSlug] || 0) + 1;
            if (data.status === 'ATTENDED' || data.attendedAt) {
                counts.checkedIn[data.eventSlug] = (counts.checkedIn[data.eventSlug] || 0) + 1;
            }
        });

        const events = bookingsSnapshot.docs.flatMap((entry) => expandBooking({ id: entry.id, ...entry.data() }, counts));
        eventsSnapshot.docs.forEach((entry) => {
            const listing = expandListing({ id: entry.id, ...entry.data() }, counts);
            if (listing) events.push(listing);
        });
        events.sort((a, b) => `${a.date}T${a.eventStart}`.localeCompare(`${b.date}T${b.eventStart}`));

        const wall = sydneyWallClock();
        return Response.json({
            success: true,
            now: wall,
            today: wall.slice(0, 10),
            events
        });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
