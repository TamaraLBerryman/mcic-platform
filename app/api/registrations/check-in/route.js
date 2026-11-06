import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { extractTicketCode } from '../../../lib/tickets';
import { emailFromRequest } from '../../../lib/verifyUser';
import { canRunDoor } from '../../../lib/doorAccess';

export async function POST(request) {
    try {
        const body = await request.json();
        const id = String(body.id || '').trim();
        const ticketCode = extractTicketCode(body.ticketCode || body.code || '');

        let registrationRef = null;
        let registration = null;

        if (id) {
            const { getDoc } = await import('firebase/firestore');
            registrationRef = doc(db, 'registrations', id);
            const snapshot = await getDoc(registrationRef);
            if (!snapshot.exists()) {
                return Response.json({ success: false, error: 'Registration not found.' }, { status: 404 });
            }
            registration = { id: snapshot.id, ...snapshot.data() };
        } else if (ticketCode) {
            const snapshot = await getDocs(query(collection(db, 'registrations'), where('ticketCode', '==', ticketCode)));
            if (snapshot.empty) {
                return Response.json({ success: false, error: 'No registration matches that QR code.' }, { status: 404 });
            }
            const item = snapshot.docs[0];
            registrationRef = item.ref;
            registration = { id: item.id, ...item.data() };
        } else {
            return Response.json({ success: false, error: 'A ticket code or registration id is required.' }, { status: 400 });
        }

        if (body.eventSlug && registration.eventSlug !== body.eventSlug) {
            return Response.json({ success: false, error: 'That ticket is for a different event.' }, { status: 409 });
        }

        const email = await emailFromRequest(request);
        if (!(await canRunDoor(email, registration.eventSlug || body.eventSlug || ''))) {
            return Response.json({ success: false, error: 'Door check-in is for the event organiser, Founders staff, or casual staff.' }, { status: 403 });
        }

        if (registration.status === 'PENDING_REVIEW' || registration.status === 'DENIED') {
            return Response.json({ success: false, error: 'This registration is not confirmed.' }, { status: 403 });
        }

        if (registration.status === 'ATTENDED' && registration.attendedAt) {
            return Response.json({
                success: true,
                alreadyAttended: true,
                registration: {
                    id: registration.id,
                    ticketCode: registration.ticketCode,
                    status: registration.status,
                    attendedAt: registration.attendedAt,
                    answers: registration.answers || {},
                    eventTitle: registration.eventTitle
                }
            });
        }

        const attendedAt = new Date().toISOString();
        await updateDoc(registrationRef, { status: 'ATTENDED', attendedAt });

        return Response.json({
            success: true,
            alreadyAttended: false,
            registration: {
                id: registration.id,
                ticketCode: registration.ticketCode,
                status: 'ATTENDED',
                attendedAt,
                answers: registration.answers || {},
                eventTitle: registration.eventTitle
            }
        });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}
