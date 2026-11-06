import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { sendPlainEmail } from '../../../../lib/mail';
import { emailFromRequest, hasAdminAccess } from '../../../../lib/verifyUser';

export async function POST(request) {
    try {
        const email = await emailFromRequest(request);
        if (!(await hasAdminAccess(email))) {
            return Response.json({ success: false, error: 'Only an admin can review an event listing.' }, { status: 403 });
        }
        const { id, decision } = await request.json();
        if (!id || !['APPROVED', 'DECLINED'].includes(decision)) {
            return Response.json({ success: false, error: 'A listing id and a decision are required.' }, { status: 400 });
        }
        const ref = doc(db, 'publicEvents', id);
        const snapshot = await getDoc(ref);
        if (!snapshot.exists() || snapshot.data().listingSource !== 'directory') {
            return Response.json({ success: false, error: 'Listing not found.' }, { status: 404 });
        }
        const listing = snapshot.data();
        if (listing.status !== 'PENDING') {
            return Response.json({ success: false, error: 'This listing has already been reviewed.' }, { status: 409 });
        }
        await updateDoc(ref, { status: decision, decidedAt: new Date().toISOString(), decidedBy: email });
        const origin = new URL(request.url).origin;
        if (listing.organiserEmail) {
            const text = decision === 'APPROVED'
                ? `Your listing for ${listing.title} is now on the events directory.\n\n${origin}/events/${listing.slug}\n\nSign in with this email address to see who registers: ${origin}/events/${listing.slug}/guests`
                : `Your listing for ${listing.title} was not added to the events directory.`;
            await sendPlainEmail({
                to: listing.organiserEmail,
                subject: decision === 'APPROVED' ? `Your event is listed: ${listing.title}` : `Your event listing was declined: ${listing.title}`,
                text
            }).catch(() => {});
        }
        return Response.json({ success: true, status: decision });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}
