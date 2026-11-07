// lib/googleCalendar.js
import { google } from 'googleapis';
import { casualHoldDescription, TAMARA_CONTACT } from './casualOffers';
import { isIsoDate, repeatCadenceLabel } from './bookingRules';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

export function getCalendarClient() {
    if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/calendar'],
        });
        return google.calendar({ version: 'v3', auth });
    }

    const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    return google.calendar({ version: 'v3', auth });
}

/**
 * Checks if a specific space is available on the single calendar during a time window.
 */
export async function checkRoomAvailability(spaceName, startIso, endIso) {
    const calendar = getCalendarClient();

    const response = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: startIso,
        timeMax: endIso,
        singleEvents: true,
        orderBy: 'startTime',
    });

    const events = response.data.items || [];

    const conflictingEvent = events.find(event => {
        if (isInventoryCalendarEvent(event)) return false;
        const summary = event.summary || '';
        const desc = event.description || '';

        if (spaceName === 'MCIC Ground - Entire Space') {
            return summary.includes('MCIC Ground') || desc.includes('MCIC Ground');
        } else if (spaceName === 'MCIC Ground - Event Space' || spaceName === 'MCIC Ground - Design Space') {
            return summary.includes('Entire Space') ||
                desc.includes('Entire Space') ||
                summary.includes(spaceName) ||
                desc.includes(spaceName);
        } else {
            return summary.includes(spaceName) || desc.includes(spaceName);
        }
    });

    return !conflictingEvent;
}

/**
 * Creates a calendar hold on the single Google Calendar.
 */
export async function createBookingCalendarEvent(bookingData) {
    const calendar = getCalendarClient();

    const startIso = `${bookingData.bumpInDate}T${bookingData.bumpIn}:00+11:00`;
    const endIso = `${bookingData.bumpInDate}T${bookingData.bumpOut}:00+11:00`;

    const supplies = bookingData.foundersSupplies || {};
    const supplyLines = [
        supplies.woolworths ? `Woolworths or caterer: ${supplies.woolworths}` : '',
        supplies.danMurphys ? `Dan Murphy's: ${supplies.danMurphys}` : ''
    ].filter(Boolean).join('; ');
    const tiers = Array.isArray(bookingData.ticketing?.ticketTiers)
        ? bookingData.ticketing.ticketTiers.map(tier => `${tier.name || 'Tier'}: ${tier.cap || 'n/a'}`).join('; ')
        : '';

    const cadence = repeatCadenceLabel(bookingData.recurrence);
    const recurrence = cadence ? bookingData.recurrence : null;
    const skippedDates = (recurrence?.skippedDates || []).map(item => item.date || item).filter(Boolean);
    const seriesNote = recurrence ? `
🔁 SERIES:
- This occurrence: ${bookingData.bumpInDate}
- Repeats ${cadence}
- Dates booked: ${(recurrence.bookedDates || []).join(', ') || 'n/a'}
- Dates left out because the room was already booked: ${skippedDates.join(', ') || 'None'}
` : '';

    const eventDescription = `
🏛️ MCIC VENUE BOOKING HOLD — PENDING APPROVAL
Booking ID: ${bookingData.bookingId || 'n/a'}
${bookingData.approvalUrl ? `Approve or decline: ${bookingData.approvalUrl}` : ''}
----------------------------------------
Event Name: ${bookingData.eventName}
Venue Space: ${bookingData.space}
${seriesNote}${bookingData.includeColonnadeAddon ? 'Add-on: MCIC Ground - Colonnade\n' : ''}Department / Org: ${bookingData.department || 'N/A'}
Affiliation: ${bookingData.userType || 'N/A'}
Expected Attendees: ${bookingData.attendees}
Description: ${bookingData.eventDescription || 'N/A'}

⏱️ TIMINGS:
- Bump-In: ${bookingData.bumpIn}
- Event Starts: ${bookingData.eventStart}
- Event Ends: ${bookingData.eventEnd}
- Bump-Out: ${bookingData.bumpOut}

📋 RUNSHEET:
${bookingData.runsheetObjectives || 'No runsheet supplied.'}

🎟️ TICKETING:
- Public directory: ${bookingData.postToPublicDirectory ? 'Yes' : 'No'}
- Method: ${bookingData.ticketing?.method || 'n/a'}
- External URL: ${bookingData.ticketing?.externalTicketUrl || 'n/a'}
- Banner: ${bookingData.ticketing?.ticketBannerName || 'n/a'}
- Max capacity: ${bookingData.ticketing?.maxTicketCapacity || 'n/a'}
- Tiers: ${tiers || 'n/a'}
- Email reminders: ${bookingData.emailReminders?.enabled ? `${bookingData.emailReminders.reminders?.length || 0} scheduled` : 'Off'}

💳 PAYMENT:
- Method: ${bookingData.paymentMethod || 'n/a'}
- ABN: ${bookingData.billingInfo?.abn || 'n/a'}
- Accounts email: ${bookingData.billingInfo?.apEmail || 'n/a'}
- Billing address: ${bookingData.billingInfo?.address || 'n/a'}
- Quote total: $${Number(bookingData.quoteSummary?.totalDue || bookingData.quoteSummary?.total || 0).toFixed(2)}

🍽️ CATERING / FOUNDERS SUPPLIES:
- Food: ${bookingData.catering || 'No'}
- Alcohol: ${bookingData.alcohol || 'No'}${bookingData.alcohol === 'Yes' ? ` · RSA: ${bookingData.rsaChoice === 'staff' ? 'organise a staff member with an RSA' : bookingData.rsaChoice === 'onfile' ? 'card on file' : bookingData.rsaChoice === 'upload' ? `new card ${bookingData.rsaFileName || ''}`.trim() : 'not chosen'}` : ''}
- Founders food and drinks: ${supplyLines || 'None'}
- Tamara present: ${bookingData.tamaraPresence || 'n/a'}${bookingData.tamaraDetails ? ` — ${bookingData.tamaraDetails}` : ''}

⚠️ RISK:
- Controversial / security: ${bookingData.involvesControversialTopics ? 'Yes' : 'No'} ${bookingData.securityDetails || ''}
- Anything else: ${bookingData.anythingElse || 'n/a'}

👤 CONTACT:
- Organiser: ${bookingData.mainContact?.name} (${bookingData.mainContact?.email}) ${bookingData.mainContact?.phone || ''}
- On the day: ${bookingData.onDayContact?.name || ''} (${bookingData.onDayContact?.email || ''}) ${bookingData.onDayContact?.phone || ''}
- Signed by: ${bookingData.signOff?.fullName || 'n/a'} on ${bookingData.signOff?.date || 'n/a'}
`;

    const spaceTag = bookingData.includeColonnadeAddon
        ? `[${bookingData.space} + Colonnade]`
        : `[${bookingData.space}]`;

    const eventPayload = {
        summary: `${spaceTag} ${bookingData.eventName} - ${bookingData.mainContact?.name || 'Applicant'}`,
        description: eventDescription,
        start: { dateTime: startIso, timeZone: 'Australia/Sydney' },
        end: { dateTime: endIso, timeZone: 'Australia/Sydney' },
        attendees: bookingData.mainContact?.email ? [
            { email: bookingData.mainContact.email },
            { email: process.env.MCIC_COORDINATOR_EMAIL || 'mcic@unsw.edu.au' }
        ] : [],
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 24 * 60 },
                { method: 'popup', minutes: 30 },
            ],
        },
    };

    const result = await calendar.events.insert({
        calendarId: CALENDAR_ID,
        requestBody: eventPayload,
        sendUpdates: 'all',
    });

    return result.data;
}

/**
 * One calendar hold per occurrence. A failure is reported and does not throw,
 * so the saved booking can still succeed.
 */
export async function createBookingCalendarHolds(bookingData) {
    const dates = Array.isArray(bookingData.holdDates) && bookingData.holdDates.length
        ? bookingData.holdDates
        : [bookingData.bumpInDate].filter(Boolean);

    const ids = [];
    const failedDates = [];
    for (const date of dates) {
        try {
            const created = await createBookingCalendarEvent({
                ...bookingData,
                bumpInDate: date
            });
            if (created?.id) ids.push(created.id);
            else failedDates.push(date);
        } catch {
            failedDates.push(date);
        }
    }

    return {
        ids,
        calendarError: failedDates.length
            ? `Calendar hold could not be created for ${failedDates.join(', ')}.`
            : null
    };
}

export async function createCasualShiftHold(shift, casualEmail) {
    if (!shift?.date || !shift?.start || !shift?.end || shift.start >= shift.end) {
        throw new Error('This shift has no usable date and times, so a calendar hold could not be created.');
    }
    const calendar = getCalendarClient();
    const tamaraEmail = TAMARA_CONTACT.match(/\(([^)]+)\)/)?.[1] || 't.berryman@unsw.edu.au';
    const result = await calendar.events.insert({
        calendarId: CALENDAR_ID,
        sendUpdates: 'all',
        requestBody: {
            summary: `Casual shift: ${shift.event || 'MCIC'}`,
            description: casualHoldDescription(shift),
            location: shift.place || 'Michael Crouch Innovation Centre',
            start: { dateTime: `${shift.date}T${shift.start}:00`, timeZone: 'Australia/Sydney' },
            end: { dateTime: `${shift.date}T${shift.end}:00`, timeZone: 'Australia/Sydney' },
            attendees: [{ email: casualEmail }, { email: tamaraEmail }],
            reminders: {
                useDefault: false,
                overrides: [{ method: 'popup', minutes: 60 }]
            }
        }
    });
    return result.data;
}

export function isInventoryCalendarEvent(event) {
    const summary = event?.summary || '';
    const description = event?.description || '';
    return summary.startsWith('Inventory:') || description.includes('INVENTORY BOOKING');
}

export async function listInventoryItemHolds(itemName, timeMin, timeMax) {
    const wanted = shortLabel(itemName, 'Item').toLowerCase();
    const calendar = getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || CALENDAR_ID;
    const items = [];
    let pageToken;
    do {
        const response = await calendar.events.list({
            calendarId,
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 250,
            ...(pageToken ? { pageToken } : {})
        });
        items.push(...(response.data.items || []));
        pageToken = response.data.nextPageToken;
    } while (pageToken);
    return items.flatMap((event) => {
        if (!isInventoryCalendarEvent(event)) return [];
        const summary = event.summary || '';
        const named = summary.replace(/^Inventory:\s*/i, '').split('—')[0].trim().toLowerCase();
        if (named !== wanted) return [];
        const start = event.start?.dateTime;
        const end = event.end?.dateTime;
        if (!start || !end) return [];
        const quantityMatch = String(event.description || '').match(/Quantity:\s*(\d+)/i);
        return [{
            start,
            end,
            who: summary.split('—')[1]?.trim() || 'Booked',
            quantity: quantityMatch ? Number(quantityMatch[1]) : 1
        }];
    });
}

function clockTime(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
}

function shortLabel(value, fallback) {
    const text = String(value || fallback).replace(/\s+/g, ' ').trim();
    return (text || fallback).slice(0, 120);
}

export function selectedEquipment(requests) {
    if (!requests || typeof requests !== 'object') return [];
    return Object.entries(requests)
        .filter(([, value]) => value === true || Number(value) > 0)
        .map(([id, value]) => ({ id, quantity: value === true ? 1 : Number(value) }));
}

/**
 * An item hold on the same calendar as venue bookings.
 * The summary is prefixed so room availability ignores it.
 */
export async function createInventoryCalendarEvent({ itemName, who, startDate, endDate, startTime, endTime, note, quantity }) {
    const finishDate = endDate || startDate;
    if (!isIsoDate(startDate) || !isIsoDate(finishDate) || !clockTime(startTime) || !clockTime(endTime)) {
        throw new Error('An inventory booking needs a date and a start and end time.');
    }
    const startIso = `${startDate}T${startTime}:00+11:00`;
    const endIso = `${finishDate}T${endTime}:00+11:00`;
    if (new Date(endIso) <= new Date(startIso)) {
        throw new Error('The inventory booking must end after it starts.');
    }

    const calendar = getCalendarClient();
    const amount = Number(quantity) > 1 ? `Quantity: ${Number(quantity)}\n` : '';
    const detail = note ? `${String(note).replace(/\s+/g, ' ').trim().slice(0, 500)}\n` : '';
    const result = await calendar.events.insert({
        calendarId: CALENDAR_ID,
        sendUpdates: 'none',
        requestBody: {
            summary: `Inventory: ${shortLabel(itemName, 'Item')} — ${shortLabel(who, 'Booking')}`,
            description: `INVENTORY BOOKING\n${amount}${detail}This hold is for the item only.`,
            start: { dateTime: startIso, timeZone: 'Australia/Sydney' },
            end: { dateTime: endIso, timeZone: 'Australia/Sydney' },
            reminders: {
                useDefault: false,
                overrides: [{ method: 'popup', minutes: 30 }]
            }
        }
    });
    return result.data;
}

export async function createBookingInventoryHolds(booking, itemNames = {}) {
    const selected = selectedEquipment(booking?.equipmentRequests);
    const windows = Array.isArray(booking?.inventoryWindows) ? booking.inventoryWindows : [];
    if (!selected.length || !windows.length) return { ids: [], calendarError: null };

    const ids = [];
    const failed = [];
    for (const window of windows) {
        for (const item of selected) {
            const itemName = itemNames[item.id] || itemNames[String(item.id).toUpperCase()] || item.id;
            try {
                const created = await createInventoryCalendarEvent({
                    itemName,
                    who: booking.eventName || booking.mainContact?.name || 'Event booking',
                    startDate: window.bumpInDate,
                    startTime: window.bumpIn,
                    endTime: window.bumpOut,
                    quantity: item.quantity,
                    note: `Held for booking ${booking.bookingId || ''}. Organiser: ${booking.mainContact?.name || 'n/a'}.`
                });
                if (created?.id) ids.push(created.id);
                else failed.push(`${itemName} ${window.bumpInDate}`);
            } catch {
                failed.push(`${itemName} ${window.bumpInDate}`);
            }
        }
    }

    return {
        ids,
        calendarError: failed.length ? `Inventory calendar hold could not be created for ${failed.join(', ')}.` : null
    };
}

export async function deleteCalendarEvent(eventId) {
    if (!eventId) return;
    const calendar = getCalendarClient();
    await calendar.events.delete({
        calendarId: CALENDAR_ID,
        eventId
    });
}