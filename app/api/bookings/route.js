import { google } from 'googleapis';

export async function POST(request) {
    try {
        // 1. Parse the incoming React form data from the user's submission track
        const bookingData = await request.json();

        // 2. Initialize the OAuth2 client using the keys stored securely in .env.local
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        // Feed the permanent refresh token directly into the auth instance
        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // 3. Construct a unique, secure approval tracking link to put in the invite body
        // For an MVP, we generate a mock endpoint URL that passes the event metadata
        const approvalLink = `http://localhost:3000/admin/approve?eventName=${encodeURIComponent(bookingData.eventName)}&space=${encodeURIComponent(bookingData.space)}&date=${bookingData.bumpInDate}&start=${bookingData.eventStart}&end=${bookingData.eventEnd}&email=${encodeURIComponent(bookingData.mainContact.email)}`;

        // 4. Build the official Google Calendar event payload mapping
        const eventPayload = {
            summary: `✨ [HOLD REQUEST]: ${bookingData.eventName}`,
            location: bookingData.space,
            description: `
👋 Hi ${bookingData.mainContact.name}, your space reservation track has been logged.

==========================================
⚠️ THIS IS A PENDING HOLD REQUEST ONLY
==========================================
Your booking requires operational validation from management before it is finalized. 

📋 CURRENT INTENT SPECIFICATIONS:
• Expected Attendees: ${bookingData.attendees || 0}
• Specific Department: ${bookingData.department || 'Not Provided'}
• Self-Catering Logged: ${bookingData.catering || 'No'}
• High Risk Assessment: ${bookingData.isHighRisk ? 'Yes' : 'No'}

------------------------------------------
🔒 ADMIN ACTIONS (Tamara & Internal Management Only):
To authorize or deny this hold timeline adjustments, click below:
👉 Approve Booking: ${approvalLink}
            `,
            start: {
                dateTime: `${bookingData.bumpInDate}T${bookingData.bumpIn || '09:00'}:00`,
                timeZone: 'Australia/Sydney',
            },
            end: {
                dateTime: `${bookingData.bumpInDate}T${bookingData.bumpOut || '17:00'}:00`,
                timeZone: 'Australia/Sydney',
            },
            // Add the user as an attendee so it fires directly to their calendar inbox dashboard
            attendees: [
                { email: bookingData.mainContact.email }
            ],
            // Set guest modify to false so you retain absolute gatekeeper control
            guestsCanModify: false,
            sendUpdates: 'all' // Automatically dispatches the email invitation right now
        };

        // 5. Fire the payload tracking request to create the event block on your calendar
        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: eventPayload,
            sendUpdates: 'all'
        });

        return Response.json({ success: true, googleEventId: response.data.id });

    } catch (error) {
        console.error("Google Calendar Hook Error:", error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}