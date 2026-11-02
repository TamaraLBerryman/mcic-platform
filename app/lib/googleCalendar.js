// lib/googleCalendar.js
import { google } from 'googleapis';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'mcic.unswfounders@gmail.com';

function getCalendarClient() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/calendar'],
    });

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

    const eventDescription = `
🏛️ MCIC VENUE BOOKING HOLD
----------------------------------------
Event Name: ${bookingData.eventName}
Venue Space: ${bookingData.space}
${bookingData.includeColonnadeAddon ? 'Add-on: MCIC Ground - Colonnade\n' : ''}Department / Org: ${bookingData.department || 'N/A'}
Expected Attendees: ${bookingData.attendees}

⏱️ TIMINGS:
- Bump-In: ${bookingData.bumpIn}
- Event Starts: ${bookingData.eventStart}
- Event Ends: ${bookingData.eventEnd}
- Bump-Out: ${bookingData.bumpOut}

📋 RUNSHEET DETAILS:
${bookingData.runsheetObjectives || 'No runsheet supplied.'}

👤 CONTACT INFO:
- Requester: ${bookingData.mainContact?.name} (${bookingData.mainContact?.email})
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