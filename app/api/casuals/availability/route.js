import { collection, doc, getDocs, runTransaction } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { casualFromRequest } from '../../../lib/casualDirectory';
import { offerDocId } from '../../../lib/casualOffers';

function publicShift(offer, email) {
    const responses = Array.isArray(offer.responses) ? offer.responses : [];
    const assigned = Array.isArray(offer.assigned) ? offer.assigned : [];
    const mine = responses.find((response) => response.email === email);
    const booked = assigned.some((person) => person.email === email);
    return {
        shiftKey: offer.shiftKey,
        date: offer.date || '',
        start: offer.start || '',
        end: offer.end || '',
        event: offer.event || 'Untitled event',
        place: offer.place || '',
        tasks: offer.tasks || '',
        quantity: offer.quantity || 1,
        times: offer.times || {},
        who: offer.who || '',
        available: booked ? true : (mine ? Boolean(mine.available) : null),
        answered: Boolean(mine) || booked,
        booked,
        filled: !booked && assigned.length >= (offer.quantity || 1)
    };
}

export async function GET(request) {
    try {
        const person = await casualFromRequest(request);
        const snapshot = await getDocs(collection(db, 'casualOffers'));
        const shifts = snapshot.docs
            .map((entry) => entry.data())
            .filter((offer) => offer.askedAt && offer.shiftKey)
            .filter((offer) => !Array.isArray(offer.asked) || offer.asked.length === 0 || offer.asked.some((entry) => entry.email === person.email))
            .map((offer) => publicShift(offer, person.email))
            .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.start).localeCompare(String(b.start)));
        return Response.json({ success: true, name: person.name, shifts });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'The shifts could not be loaded.' }, { status: error.status || 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const person = await casualFromRequest(request);
        const shiftKey = String(body.shiftKey || '').trim();
        if (!shiftKey || typeof body.available !== 'boolean') {
            return Response.json({ success: false, error: 'Choose whether you can do this shift.' }, { status: 400 });
        }
        const ref = doc(db, 'casualOffers', offerDocId(shiftKey));
        await runTransaction(db, async (tx) => {
            const snapshot = await tx.get(ref);
            if (!snapshot.exists() || snapshot.data().shiftKey !== shiftKey) {
                const error = new Error('That shift is no longer on the list.');
                error.status = 404;
                throw error;
            }
            const offer = snapshot.data();
            const assigned = Array.isArray(offer.assigned) ? offer.assigned : [];
            if (assigned.some((entry) => entry.email === person.email)) {
                const error = new Error('You are already booked on this shift.');
                error.status = 409;
                throw error;
            }
            const responses = (Array.isArray(offer.responses) ? offer.responses : []).filter((entry) => entry.email !== person.email);
            responses.push({
                email: person.email,
                name: person.name,
                available: body.available,
                at: new Date().toISOString()
            });
            tx.update(ref, { responses });
        });
        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'That answer could not be saved.' }, { status: error.status || 500 });
    }
}
