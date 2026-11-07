import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { createInventoryCalendarEvent, listInventoryItemHolds } from '../../../lib/googleCalendar';
import { isIsoDate } from '../../../lib/bookingRules';

export async function GET(request) {
    try {
        const itemName = new URL(request.url).searchParams.get('item') || '';
        if (!itemName.trim()) {
            return Response.json({ success: false, error: 'Choose an item.' }, { status: 400 });
        }
        const start = new Date();
        const end = new Date(start.getTime() + 1000 * 60 * 60 * 24 * 183);
        const sydney = (date) => new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Australia/Sydney',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(date).replace(', ', 'T');
        const holds = await listInventoryItemHolds(itemName, `${sydney(start)}+11:00`, `${sydney(end)}+11:00`);
        return Response.json({ success: true, holds });
    } catch (error) {
        console.error('Inventory calendar list failed:', error.message, error.code || '', error.response?.data?.error || '');
        return Response.json({ success: false, error: error.message || 'The Google Calendar could not be checked.' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const startDate = body.dateSelectionType === 'range' ? body.bookingStartDate : body.bookingDate;
        const endDate = body.dateSelectionType === 'range' ? body.bookingEndDate : body.bookingDate;
        if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
            return Response.json({ success: false, error: 'Choose the date for this inventory booking.' }, { status: 400 });
        }

        const created = await createInventoryCalendarEvent({
            itemName: body.itemName,
            who: body.borrowerName,
            startDate,
            endDate,
            startTime: body.bookingStartTime,
            endTime: body.bookingEndTime,
            quantity: body.quantity,
            note: body.borrowerEmail && body.borrowerEmail !== '-' ? `Borrower email: ${body.borrowerEmail}` : ''
        });

        if (body.reservationId && created?.id) {
            await updateDoc(doc(db, 'asset_reservations', body.reservationId), {
                googleEventId: created.id
            });
        }

        return Response.json({ success: true, googleEventId: created?.id || null });
    } catch (error) {
        return Response.json({ success: false, error: error.message || 'The Google Calendar hold could not be created.' }, { status: 500 });
    }
}
