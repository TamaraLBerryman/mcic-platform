import { addDoc, collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CASUAL_STAFF_LIST, MAX_CASUAL_QUANTITY, casualShiftQuantity } from '../../lib/casualStaff';
import { sendPlainEmail } from '../../lib/mail';
import { adminEmails, emailFromRequest, hasAdminAccess, hasFoundersAccess } from '../../lib/verifyUser';
import { isIsoDate } from '../../lib/bookingRules';

function ownerEmail(data) {
    return String(data.organiserEmail || data.mainContact?.email || '').toLowerCase();
}

function isTime(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
}

function bookingOption(id, data) {
    return {
        id,
        eventName: data.eventName || 'Untitled booking',
        space: data.space || '',
        bumpInDate: data.bumpInDate || '',
        bumpIn: data.bumpIn || '',
        bumpOut: data.bumpOut || '',
        department: data.department || '',
        status: data.status || 'PENDING'
    };
}

function requestView(id, data) {
    return {
        id,
        bookingId: data.bookingId || '',
        eventName: data.eventName || '',
        space: data.space || '',
        shiftDate: data.shiftDate || '',
        purpose: data.purpose || '',
        shifts: data.shifts || [],
        requesterName: data.requesterName || '',
        requesterEmail: data.requesterEmail || '',
        status: data.status || 'PENDING',
        createdAt: data.createdAt || ''
    };
}

export async function GET(request) {
    try {
        const email = await emailFromRequest(request);
        const founders = await hasFoundersAccess(email);
        if (!founders) {
            return Response.json({ success: false, error: 'Founders staff access is required.' }, { status: 403 });
        }
        const admin = await hasAdminAccess(email);
        const [bookingsSnapshot, requestsSnapshot] = await Promise.all([
            getDocs(collection(db, 'bookings')),
            getDocs(collection(db, 'casualRequests'))
        ]);
        const bookings = bookingsSnapshot.docs
            .filter(item => !['DECLINED', 'CANCELLED'].includes(item.data().status))
            .map(item => bookingOption(item.id, item.data()))
            .sort((a, b) => String(a.bumpInDate).localeCompare(String(b.bumpInDate)));
        const requests = requestsSnapshot.docs
            .map(item => requestView(item.id, item.data()))
            .filter(() => admin)
            .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        return Response.json({
            success: true,
            admin,
            foundersStaff: true,
            bookings,
            requests
        });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}

export async function POST(request) {
    try {
        const email = await emailFromRequest(request);
        if (!(await hasFoundersAccess(email))) {
            return Response.json({ success: false, error: 'Founders staff access is required.' }, { status: 403 });
        }
        const foundersStaff = true;
        const body = await request.json();
        if (body.wantsCasualStaff !== 'Yes') {
            return Response.json({ success: false, error: 'Choose Yes to book casual staff.' }, { status: 400 });
        }
        const requesterName = String(body.requesterName || '').trim();
        if (!requesterName) {
            return Response.json({ success: false, error: 'Enter your name.' }, { status: 400 });
        }
        if (!isIsoDate(body.shiftDate)) {
            return Response.json({ success: false, error: 'Enter the date for the casual shift.' }, { status: 400 });
        }

        const rawShifts = Array.isArray(body.shifts) ? body.shifts.slice(0, 12) : [];
        if (rawShifts.length === 0) {
            return Response.json({ success: false, error: 'Each casual needs a start, an end after the start, and the tasks they will do.' }, { status: 400 });
        }
        const shifts = [];
        for (const shift of rawShifts) {
            const quantity = casualShiftQuantity(shift);
            if (quantity == null) {
                return Response.json({ success: false, error: `Each staffing request needs a whole number of people from 1 to ${MAX_CASUAL_QUANTITY}.` }, { status: 400 });
            }
            shifts.push({
                preferredStaff: foundersStaff && CASUAL_STAFF_LIST.includes(shift?.preferredStaff) ? shift.preferredStaff : '',
                quantity,
                shiftStart: String(shift?.shiftStart || ''),
                shiftEnd: String(shift?.shiftEnd || ''),
                tasks: String(shift?.tasks || '').trim()
            });
        }
        if (shifts.some(shift => !isTime(shift.shiftStart) || !isTime(shift.shiftEnd) || shift.shiftStart >= shift.shiftEnd || !shift.tasks)) {
            return Response.json({ success: false, error: 'Each casual needs a start, an end after the start, and the tasks they will do.' }, { status: 400 });
        }

        let bookingId = '';
        let eventName = '';
        let space = '';
        if (body.bookingId) {
            const snapshot = await getDoc(doc(db, 'bookings', body.bookingId));
            if (!snapshot.exists() || ['DECLINED', 'CANCELLED'].includes(snapshot.data().status)) {
                return Response.json({ success: false, error: 'That event could not be found.' }, { status: 404 });
            }
            const booking = snapshot.data();
            const owner = String(booking.organiserEmail || booking.mainContact?.email || '').toLowerCase();
            if (owner !== email && !(await hasFoundersAccess(email))) {
                return Response.json({ success: false, error: 'That event belongs to a different organiser.' }, { status: 403 });
            }
            bookingId = snapshot.id;
            eventName = booking.eventName || '';
            space = booking.space || '';
        }

        const purpose = String(body.purpose || '').trim();
        if (!bookingId && !purpose) {
            return Response.json({ success: false, error: 'Say where this casual booking is, or link it to an event.' }, { status: 400 });
        }

        const record = {
            bookingId,
            eventName,
            space,
            wantsCasualStaff: 'Yes',
            shiftDate: body.shiftDate,
            purpose,
            shifts,
            requesterName,
            requesterEmail: email,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        };
        const ref = await addDoc(collection(db, 'casualRequests'), record);
        const lines = shifts.map((shift, index) => {
            const who = shift.preferredStaff || 'No preference';
            const people = shift.quantity === 1 ? '1 person' : `${shift.quantity} people`;
            return `${index + 1}. ${who}, ${people}, ${shift.shiftStart}–${shift.shiftEnd}: ${shift.tasks}`;
        });
        const origin = new URL(request.url).origin;
        await sendPlainEmail({
            to: adminEmails(),
            subject: `Casual staff request${eventName ? `: ${eventName}` : ''}`,
            text: [
                `${requesterName} (${email}) requested casual staff.`,
                bookingId ? `Event: ${eventName} (${space}) on ${record.shiftDate}` : `No event in particular. ${purpose}`,
                `Date: ${record.shiftDate}`,
                '',
                ...lines,
                '',
                `Review: ${origin}/casuals`
            ].join('\n')
        }).catch(() => {});

        return Response.json({ success: true, id: ref.id });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}
