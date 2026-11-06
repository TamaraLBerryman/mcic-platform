import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { sendTicketEmail } from '../../../lib/tickets';
import { emailFromRequest, hasAdminAccess } from '../../../lib/verifyUser';

export async function POST(request) {
    try {
        const reviewer = await emailFromRequest(request);
        if (!(await hasAdminAccess(reviewer))) {
            return Response.json({ success: false, error: 'Sign in with an admin email to review this registration.' }, { status: 403 });
        }

        const body = await request.json();
        const id = String(body.id || '').trim();
        const decision = body.decision === 'APPROVED' || body.decision === 'DENIED' ? body.decision : '';
        if (!id || !decision) {
            return Response.json({ success: false, error: 'A registration and a decision are required.' }, { status: 400 });
        }

        const registrationRef = doc(db, 'registrations', id);
        const snapshot = await getDoc(registrationRef);
        if (!snapshot.exists()) {
            return Response.json({ success: false, error: 'Registration not found.' }, { status: 404 });
        }
        const record = snapshot.data();
        if (record.status !== 'PENDING_REVIEW') {
            return Response.json({ success: false, error: 'This registration is not waiting for review.' }, { status: 409 });
        }

        const reviewedAt = new Date().toISOString();
        if (decision === 'DENIED') {
            await updateDoc(registrationRef, { status: 'DENIED', reviewedAt, reviewedBy: reviewer });
            return Response.json({ success: true, status: 'DENIED' });
        }

        await updateDoc(registrationRef, { status: 'REGISTERED', reviewedAt, reviewedBy: reviewer });

        const origin = new URL(request.url).origin;
        const answers = record.answers || {};
        const ticketUrl = `${origin}/ticket/${record.ticketCode}`;
        const qrUrl = `${origin}/api/registrations/qr?code=${encodeURIComponent(record.ticketCode)}`;
        const when = [record.eventDate, record.eventStart && record.eventEnd ? `${record.eventStart}–${record.eventEnd}` : record.eventStart]
            .filter(Boolean)
            .join(' ');
        let emailSent = false;
        let emailError = '';
        try {
            await sendTicketEmail({
                to: answers.email,
                name: answers.firstName,
                eventTitle: record.eventTitle,
                eventWhen: when,
                ticketCode: record.ticketCode,
                ticketUrl,
                qrUrl
            });
            emailSent = true;
        } catch (error) {
            emailError = error.message;
        }
        await updateDoc(registrationRef, { emailSent, emailError });
        return Response.json({ success: true, status: 'REGISTERED', emailSent, emailError });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}
