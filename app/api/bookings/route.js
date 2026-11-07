import { addDoc, collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { emailFromRequest, hasAdminAccess } from '../../lib/verifyUser';
import { siteSettings } from '../../lib/siteSettings';
import { createBookingCalendarHolds, createBookingInventoryHolds } from '../../lib/googleCalendar';
import { availabilityForDates } from '../../lib/calendarAvailability';
import { normalizeEmailReminders } from '../../lib/eventReminders';
import { confirmationText } from '../../lib/organiserEmails';
import { sendPlainEmail } from '../../lib/mail';
import {
    BOOKABLE_SPACES,
    bookingWindowForDate,
    dateConflictsWithBusy,
    isFoundersBooker,
    isIsoDate,
    isRepeatingPattern,
    isUnswStaff,
    bookingQueueTag,
    holdAvailability,
    lockoutMessage,
    selectedTimesFromSlots
} from '../../lib/bookingRules';

function clampOccurrenceCount(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 1;
    return Math.min(52, Math.max(1, Math.trunc(number)));
}

function sanitizeRecurrence(bookingData) {
    const start = isIsoDate(bookingData.bumpInDate) ? bookingData.bumpInDate : '';
    const incoming = bookingData.recurrence;
    const founders = isFoundersBooker(bookingData.userType, bookingData.department);
    if (!founders || !incoming || !isRepeatingPattern(incoming.pattern)) {
        return {
            pattern: 'none',
            interval: 1,
            end: null,
            bookedDates: start ? [start] : [],
            skippedDates: []
        };
    }

    const end = incoming.end?.type === 'on'
        ? { type: 'on', date: isIsoDate(incoming.end.date) ? incoming.end.date : '' }
        : { type: 'after', occurrences: clampOccurrenceCount(incoming.end?.occurrences) };
    const skippedSeen = new Set();
    const skippedDates = [];
    (incoming.skippedDates || []).forEach(item => {
        if (!item || !isIsoDate(item.date) || skippedSeen.has(item.date)) return;
        skippedSeen.add(item.date);
        skippedDates.push({
            date: item.date,
            reason: String(item.reason || 'Already booked').slice(0, 240)
        });
    });

    return {
        pattern: incoming.pattern,
        interval: incoming.pattern === 'weekly' ? clampOccurrenceCount(incoming.interval) : 1,
        end,
        bookedDates: [...new Set((incoming.bookedDates || []).filter(isIsoDate))].slice(0, 52),
        skippedDates: skippedDates.slice(0, 52)
    };
}

async function confirmSeriesHolds(record) {
    const times = selectedTimesFromSlots(record.selectedSlots);
    if (!record.recurrence.bookedDates.length) {
        return {
            recurrence: record.recurrence,
            calendarError: null,
            holdDates: []
        };
    }
    if (!times.length) {
        return {
            recurrence: { ...record.recurrence, bookedDates: [] },
            calendarError: 'A start and end time are required before repeating dates can be held.',
            holdDates: []
        };
    }

    try {
        const { byDate, calendarLoaded } = await availabilityForDates(record.recurrence.bookedDates);
        if (!calendarLoaded) {
            return {
                recurrence: {
                    ...record.recurrence,
                    bookedDates: [],
                    unconfirmedDates: record.recurrence.bookedDates
                },
                calendarError: 'Live availability could not be loaded, so repeating holds were not created.',
                holdDates: []
            };
        }
        const bookedDates = [];
        const skippedDates = [...record.recurrence.skippedDates];
        const alreadySkipped = new Set(skippedDates.map(item => item.date));
        const rangeLabel = `${record.bumpIn}–${record.bumpOut}`;

        record.recurrence.bookedDates.forEach(date => {
            const ranges = byDate[date]?.[record.space] || [];
            if (dateConflictsWithBusy(ranges, times)) {
                if (!alreadySkipped.has(date)) {
                    skippedDates.push({
                        date,
                        reason: `${record.space} is already booked or held at ${rangeLabel}`
                    });
                }
            } else {
                bookedDates.push(date);
            }
        });

        return {
            recurrence: { ...record.recurrence, bookedDates, skippedDates },
            calendarError: null,
            holdDates: bookedDates
        };
    } catch {
        return {
            recurrence: {
                ...record.recurrence,
                bookedDates: [],
                unconfirmedDates: record.recurrence.bookedDates
            },
            calendarError: 'Live availability could not be loaded, so repeating holds were not created.',
            holdDates: []
        };
    }
}

function isTime(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
}

async function inventoryNameMap() {
    try {
        const snapshot = await getDocs(collection(db, 'items'));
        const names = {};
        snapshot.docs.forEach(item => {
            const name = item.data().name || item.id;
            names[item.id] = name;
            names[String(item.id).toUpperCase()] = name;
        });
        return names;
    } catch {
        return {};
    }
}

function cleanTentativeHolds(holds, bookingData) {
    if (!Array.isArray(holds) || holds.length < 2) return [];
    const cleaned = holds.slice(0, 3).map((hold, index) => ({
        id: `hold-${index + 1}`,
        space: BOOKABLE_SPACES.includes(hold?.space) ? hold.space : bookingData.space,
        bumpInDate: hold?.bumpInDate,
        bumpIn: hold?.bumpIn,
        eventStart: hold?.eventStart,
        eventEnd: hold?.eventEnd,
        bumpOut: hold?.bumpOut,
        status: 'PENDING'
    }));
    const valid = cleaned.every(hold => (
        isIsoDate(hold.bumpInDate)
        && [hold.bumpIn, hold.eventStart, hold.eventEnd, hold.bumpOut].every(isTime)
        && hold.bumpIn <= hold.eventStart
        && hold.eventStart <= hold.eventEnd
        && hold.eventEnd <= hold.bumpOut
        && BOOKABLE_SPACES.includes(hold.space)
    ));
    if (!valid) {
        const error = new Error('Each tentative hold needs a space, date, and times from bump-in through bump-out.');
        error.status = 400;
        throw error;
    }
    if (!isUnswStaff(bookingData.userType)) {
        for (const hold of cleaned) {
            const windowInfo = bookingWindowForDate(hold.bumpInDate);
            if (windowInfo.locked) {
                const error = new Error(lockoutMessage(windowInfo));
                error.status = 400;
                throw error;
            }
        }
    }
    return cleaned;
}

function slugify(name, date) {
    const base = String(name || 'event')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'event';
    return `${base}-${date || 'date'}`;
}

export async function GET(request) {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
        return Response.json({ success: false, error: 'Booking id is required.' }, { status: 400 });
    }

    try {
        const email = await emailFromRequest(request);
        const snapshot = await getDoc(doc(db, 'bookings', id));
        if (!snapshot.exists()) {
            return Response.json({ success: false, error: 'Booking not found.' }, { status: 404 });
        }
        const booking = snapshot.data();
        const owner = String(booking.organiserEmail || booking.mainContact?.email || '').toLowerCase();
        if (owner !== email && !(await hasAdminAccess(email))) {
            return Response.json({ success: false, error: 'This booking belongs to a different organiser.' }, { status: 403 });
        }
        const signOff = booking.signOff || null;
        const approvedSnapshot = await getDocs(collection(db, 'bookings'));
        const approved = approvedSnapshot.docs
            .map(item => ({ id: item.id, ...item.data() }))
            .filter(item => item.status === 'APPROVED');
        const queued = { id: snapshot.id, ...booking };
        return Response.json({
            success: true,
            booking: {
                id: snapshot.id,
                ...booking,
                queueTag: bookingQueueTag(queued, approved),
                holdTags: holdAvailability(queued, approved),
                signOff: signOff ? { fullName: signOff.fullName, date: signOff.date } : null
            }
        });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}

export async function POST(request) {
    try {
        await emailFromRequest(request);
        const bookingData = await request.json();
        if (!bookingData.mainContact?.email || bookingData.mainContact.email === 'test@example.com') {
            return Response.json({ success: false, error: 'A real organiser email is required.' }, { status: 400 });
        }

        if (!isUnswStaff(bookingData.userType) && isIsoDate(bookingData.bumpInDate)) {
            const windowInfo = bookingWindowForDate(bookingData.bumpInDate);
            if (windowInfo.locked) {
                return Response.json({ success: false, error: lockoutMessage(windowInfo) }, { status: 400 });
            }
        }

        const origin = new URL(request.url).origin;
        const ticketingOn = (await siteSettings()).ticketing;
        if (!ticketingOn) {
            bookingData.postToPublicDirectory = false;
            bookingData.ticketing = { method: 'none', externalTicketUrl: '', ticketBannerName: '', maxTicketCapacity: 0, ticketTiers: [] };
            bookingData.emailReminders = { enabled: false, reminders: [] };
        }
        const emailReminders = bookingData.ticketing?.method === 'internal'
            ? normalizeEmailReminders(bookingData.emailReminders)
            : { enabled: false, reminders: [] };
        const tentativeHolds = cleanTentativeHolds(bookingData.tentativeHolds, bookingData);
        if (tentativeHolds.length > 1 && isRepeatingPattern(bookingData.recurrence?.pattern)) {
            return Response.json({ success: false, error: 'A repeating booking cannot also have tentative holds.' }, { status: 400 });
        }
        const record = {
            ...bookingData,
            recurrence: tentativeHolds.length > 1
                ? { pattern: 'none', interval: 1, end: null, bookedDates: tentativeHolds.map(hold => hold.bumpInDate), skippedDates: [] }
                : sanitizeRecurrence(bookingData),
            tentativeHolds,
            tentativeCycle: tentativeHolds.length > 1
                ? { startedAt: new Date().toISOString(), confirmReminderSentAt: null, finalReminderSentAt: null, removalChangeId: null }
                : null,
            emailReminders,
            organiserEmail: bookingData.mainContact.email.trim().toLowerCase(),
            casualStaffDetails: (isFoundersBooker(bookingData.userType, bookingData.department) || bookingData.foundersStaff)
                ? (bookingData.casualStaffDetails || [])
                : (bookingData.casualStaffDetails || []).map(row => ({ ...row, preferredStaff: '' })),
            siteOrigin: origin,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        };
        delete record.approvalUrl;
        const rsaUpload = record.rsaChoice === 'upload' && record.rsaFileData
            ? { fileName: record.rsaFileName || 'RSA card', fileData: record.rsaFileData }
            : null;
        delete record.rsaFileData;

        const bookingRef = await addDoc(collection(db, 'bookings'), record);
        if (rsaUpload) {
            await setDoc(doc(db, 'rsaCards', record.organiserEmail), {
                email: record.organiserEmail,
                fileName: rsaUpload.fileName,
                fileData: rsaUpload.fileData,
                uploadedAt: new Date().toISOString(),
                expiryDate: ''
            });
        }
        const approvalUrl = `${origin}/admin/approve?id=${bookingRef.id}`;

        let publicEventId = null;
        let publicEventSlug = '';
        if (bookingData.postToPublicDirectory) {
            const eventDate = bookingData.bumpInDate;
            const publicEvent = {
                bookingId: bookingRef.id,
                title: bookingData.eventName || 'MCIC Event',
                eventDate,
                eventStart: bookingData.eventStart || bookingData.bumpIn,
                eventEnd: bookingData.eventEnd || bookingData.bumpOut,
                space: bookingData.space,
                description: bookingData.eventDescription || '',
                slug: publicEventSlug = slugify(bookingData.eventName, eventDate),
                isPublicListing: true,
                registrationType: bookingData.ticketing?.method === 'external' ? 'EXTERNAL' : 'MCIC_PLATFORM',
                externalTicketUrl: bookingData.ticketing?.externalTicketUrl || '',
                ticketBannerName: bookingData.ticketing?.ticketBannerName || '',
                ticketTiers: bookingData.ticketing?.ticketTiers || [],
                emailReminders,
                status: 'PENDING',
                department: bookingData.department || '',
                eventType: bookingData.department === 'UNSW Founders'
                    ? 'UNSW_FOUNDERS'
                    : bookingData.userType === 'External to UNSW'
                        ? 'EXTERNAL_HIRER'
                        : 'UNSW_DEPARTMENT',
                organizerName: bookingData.mainContact?.name || '',
                image: '/images/venues/event-space-1.JPG',
                collection: 'MCIC Bookings'
            };
            const eventRef = await addDoc(collection(db, 'publicEvents'), publicEvent);
            publicEventId = eventRef.id;
        }

        let recurrence = record.recurrence;
        let holdDates = isRepeatingPattern(recurrence.pattern) ? [] : recurrence.bookedDates;
        let calendarError = null;

        if (isRepeatingPattern(recurrence.pattern)) {
            const confirmed = await confirmSeriesHolds(record);
            recurrence = confirmed.recurrence;
            calendarError = confirmed.calendarError;
            holdDates = confirmed.holdDates;
        }

        let googleEventIds = [];
        if (tentativeHolds.length > 1) {
            const failed = [];
            for (const hold of tentativeHolds) {
                const created = await createBookingCalendarHolds({
                    ...record,
                    ...hold,
                    recurrence,
                    bookingId: bookingRef.id,
                    approvalUrl,
                    holdDates: [hold.bumpInDate]
                });
                googleEventIds.push(...created.ids);
                if (created.calendarError) failed.push(hold.bumpInDate);
            }
            if (failed.length) calendarError = `Calendar hold could not be created for ${failed.join(', ')}.`;
        } else if (holdDates.length) {
            const holds = await createBookingCalendarHolds({
                ...record,
                recurrence,
                bookingId: bookingRef.id,
                approvalUrl,
                holdDates
            });
            googleEventIds = holds.ids;
            calendarError = calendarError || holds.calendarError;
        }

        const inventoryWindows = tentativeHolds.length
            ? tentativeHolds
            : holdDates.map(date => ({ bumpInDate: date, bumpIn: record.bumpIn, bumpOut: record.bumpOut }));
        const inventoryHolds = await createBookingInventoryHolds({
            ...record,
            bookingId: bookingRef.id,
            inventoryWindows
        }, await inventoryNameMap());
        googleEventIds.push(...inventoryHolds.ids);
        if (inventoryHolds.calendarError) {
            calendarError = [calendarError, inventoryHolds.calendarError].filter(Boolean).join(' ');
        }

        const googleEventId = googleEventIds[0] || null;
        const savedBooking = {
            ...record,
            id: bookingRef.id,
            approvalUrl,
            publicEventId,
            publicEventSlug,
            recurrence,
            googleEventId,
            googleEventIds,
            calendarError
        };
        let confirmationSentAt = '';
        let confirmationError = '';
        try {
            await sendPlainEmail({
                to: record.organiserEmail,
                subject: `We are reviewing your booking: ${record.eventName || 'MCIC booking'}`,
                text: confirmationText(savedBooking)
            });
            confirmationSentAt = new Date().toISOString();
        } catch (error) {
            confirmationError = error.message;
        }

        await updateDoc(doc(db, 'bookings', bookingRef.id), {
            approvalUrl,
            publicEventId,
            publicEventSlug,
            tentativeHolds,
            tentativeCycle: record.tentativeCycle,
            recurrence,
            googleEventId,
            googleEventIds,
            calendarError,
            organiserMail: {
                confirmationSentAt,
                confirmationError
            }
        });

        return Response.json({
            success: true,
            bookingId: bookingRef.id,
            publicEventId,
            googleEventId,
            googleEventIds,
            calendarError
        });
    } catch (error) {
        console.error('Booking save error:', error);
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}
