// lib/googleCalendar.js
import { google } from 'googleapis';
import { casualHoldDescription, TAMARA_CONTACT } from './casualOffers';

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
    const supplyLines = Object.entries(supplies)
        .filter(([, on]) => on)
        .map(([key]) => key.replace(/^need/, '').replace(/([A-Z])/g, ' $1').trim())
        .join(', ');
    const tiers = Array.isArray(bookingData.ticketing?.ticketTiers)
        ? bookingData.ticketing.ticketTiers.map(tier => `${tier.name || 'Tier'}: ${tier.cap || 'n/a'}`).join('; ')
        : '';

    const recurrence = bookingData.recurrence?.pattern === 'weekly' ? bookingData.recurrence : null;
    const skippedDates = (recurrence?.skippedDates || []).map(item => item.date || item).filter(Boolean);
    const seriesNote = recurrence ? `
🔁 SERIES:
- This occurrence: ${bookingData.bumpInDate}
- Repeats every ${recurrence.interval || 1} week(s)
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
- Alcohol: ${bookingData.alcohol || 'No'}
- Serviceware: ${bookingData.servicewarePreference || 'n/a'}
- Supplies: ${supplyLines || 'None'}

⚠️ RISK:
- Machinery / high risk: ${bookingData.isHighRisk ? 'Yes' : 'No'} ${bookingData.riskDetails || ''}
- Controversial / security: ${bookingData.involvesControversialTopics ? 'Yes' : 'No'} ${bookingData.securityDetails || ''}

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

export async function deleteCalendarEvent(eventId) {
    if (!eventId) return;
    const calendar = getCalendarClient();
    await calendar.events.delete({
        calendarId: CALENDAR_ID,
        eventId
    });
}