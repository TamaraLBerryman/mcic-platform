import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { sendPlainEmail } from '../../../lib/mail';
import { adminEmails, emailFromRequest, hasAdminAccess, hasFoundersAccess } from '../../../lib/verifyUser';
import { isIsoDate } from '../../../lib/bookingRules';

function clean(value) {
    return String(value || '').trim();
}

function isTime(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function slugify(name, date) {
    const base = clean(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event';
    return `${base}-${date}`;
}

export async function GET(request) {
    try {
        const email = await emailFromRequest(request);
        if (!(await hasAdminAccess(email))) {
            return Response.json({ success: false, error: 'Only an admin can review event listings.' }, { status: 403 });
        }
        const snapshot = await getDocs(query(collection(db, 'publicEvents'), where('listingSource', '==', 'directory')));
        const listings = snapshot.docs
            .map(item => ({ id: item.id, ...item.data() }))
            .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        return Response.json({ success: true, listings });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}

export async function POST(request) {
    try {
        const email = await emailFromRequest(request);
        if (!(await hasFoundersAccess(email))) {
            return Response.json({ success: false, error: 'Founders staff access is required to list an event.' }, { status: 403 });
        }
        const body = await request.json();
        const title = clean(body.title);
        const eventDate = clean(body.eventDate);
        const eventStart = clean(body.eventStart);
        const eventEnd = clean(body.eventEnd);
        const space = clean(body.space);
        const description = clean(body.description);
        const organizerName = clean(body.organizerName);
        const organiserEmail = clean(body.organiserEmail).toLowerCase();
        const founders = body.hostType === 'UNSW Founders';
        const external = body.registrationType === 'EXTERNAL';
        const externalTicketUrl = clean(body.externalTicketUrl);

        if (!title || !description || !space || !organizerName || !organiserEmail.includes('@')) {
            return Response.json({ success: false, error: 'Name, description, venue, host, and email are required.' }, { status: 400 });
        }
        if (!isIsoDate(eventDate) || !isTime(eventStart) || !isTime(eventEnd) || eventStart >= eventEnd) {
            return Response.json({ success: false, error: 'Enter a date and a start time that is before the end time.' }, { status: 400 });
        }
        if (external && !externalTicketUrl) {
            return Response.json({ success: false, error: 'Add the external ticket link, or use MCIC registration.' }, { status: 400 });
        }

        const baseSlug = slugify(title, eventDate);
        const existing = await getDocs(query(collection(db, 'publicEvents'), where('slug', '==', baseSlug)));
        const slug = existing.empty ? baseSlug : `${baseSlug}-${Date.now().toString(36)}`;
        const record = {
            title,
            eventDate,
            eventStart,
            eventEnd,
            space,
            description,
            slug,
            isPublicListing: true,
            registrationType: external ? 'EXTERNAL' : 'MCIC_PLATFORM',
            externalTicketUrl: external ? externalTicketUrl : '',
            status: 'PENDING',
            eventType: founders ? 'OFFSITE_FOUNDERS' : 'OFFSITE',
            organizerName,
            organiserEmail,
            image: '/images/venues/event-space-1.JPG',
            collection: 'Offsite listings',
            listingSource: 'directory',
            heldAtMcic: false,
            createdAt: new Date().toISOString()
        };
        const ref = await addDoc(collection(db, 'publicEvents'), record);
        const origin = new URL(request.url).origin;
        await sendPlainEmail({
            to: adminEmails(),
            subject: `Event listing to review: ${title}`,
            text: `${organizerName} submitted a listing for an event that is not held at the MCIC.\n\n${title}\n${eventDate} ${eventStart}–${eventEnd}\n${space}\n\nReview: ${origin}/admin/listings`
        }).catch(() => {});

        return Response.json({ success: true, id: ref.id, slug });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
