// lib/googleCalendar.js
import { google } from 'googleapis';

// Map your venue spaces to their corresponding Google Calendar IDs
export const ROOM_CALENDAR_MAP = {
    'MCIC Ground - Entire Space': process.env.GOOGLE_CALENDAR_ENTIRE_SPACE_ID,
    'MCIC Ground - Event Space': process.env.GOOGLE_CALENDAR_EVENT_SPACE_ID,
    'MCIC Ground - Design Space': process.env.GOOGLE_CALENDAR_DESIGN_SPACE_ID,
    'MCIC Level 1 - Founders Place': process.env.GOOGLE_CALENDAR_FOUNDERS_PLACE_ID,
    'MCIC Level 1 - Group Study': process.env.GOOGLE_CALENDAR_GROUP_STUDY_ID,
};

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
 * Checks if a room calendar is available during a specified ISO time window.
 */
export async function checkRoomAvailability(calendarId, startIso, endIso) {
    if (!calendarId) return true; // Fallback if calendar ID not supplied

    const calendar = getCalendarClient();
    const response = await calendar.freebusy.query({
        requestBody: {
            timeMin: startIso,
            timeMax: endIso,
            items: [{ id: calendarId }],
        },
    });

    const busySlots = response.data.calendars[calendarId]?.busy || [];
    return busySlots.length === 0;
}

/**
 * Creates a calendar hold and sends calendar invitations to the requester & venue coordinator.
 */
export async function createBookingCalendarEvent(bookingData) {
    const calendarId = ROOM_CALENDAR_MAP[bookingData.space];
    if (!calendarId) {
        console.warn(`No Google Calendar ID mapped for venue: ${bookingData.space}`);
        return null;
    }

    const calendar = getCalendarClient();

    // Construct ISO datetime strings
    const startIso = `${bookingData.bumpInDate}T${bookingData.bumpIn}:00+11:00`; // Sydney AEDT timezone
    const endIso = `${bookingData.bumpInDate}T${bookingData.bumpOut}:00+11:00`;

    // Detailed description for the calendar event
    const eventDescription = `
🏛️ MCIC VENUE BOOKING HOLD
----------------------------------------
Event Name: ${bookingData.eventName}
Venue Space: ${bookingData.space}
Department / Org: ${bookingData.department || 'N/A'}
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

    const eventPayload = {
        summary: `[MCIC HOLD] ${bookingData.eventName} - ${bookingData.mainContact?.name}`,
        description: eventDescription,
        start: { dateTime: startIso, timeZone: 'Australia/Sydney' },
        end: { dateTime: endIso, timeZone: 'Australia/Sydney' },
        attendees: [
            { email: bookingData.mainContact?.email },
            { email: process.env.MCIC_COORDINATOR_EMAIL || 'mcic@unsw.edu.au' }
        ],
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 24 * 60 },
                { method: 'popup', minutes: 30 },
            ],
        },
    };

    const result = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: eventPayload,
        sendUpdates: 'all', // Automatically sends calendar invites to attendees
    });

    return result.data;
}