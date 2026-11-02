// app/api/calendar/availability/route.js
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

function getCalendarClient() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    return google.calendar({ version: 'v3', auth });
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    if (!dateStr) {
        return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
    }

    try {
        const calendar = getCalendarClient();
        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'mcic.unswfounders@gmail.com';

        const startIso = `${dateStr}T00:00:00+11:00`;
        const endIso = `${dateStr}T23:59:59+11:00`;

        const response = await calendar.events.list({
            calendarId,
            timeMin: startIso,
            timeMax: endIso,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items || [];
        const rooms = [
            'MCIC Ground - Entire Space',
            'MCIC Ground - Event Space',
            'MCIC Ground - Design Space',
            'MCIC Level 1 - Founders Place',
            'MCIC Level 1 - Group Study',
            'MCIC Ground - Colonnade'
        ];

        const busySlots = {};
        rooms.forEach(room => { busySlots[room] = []; });

        events.forEach(event => {
            const summary = event.summary || '';
            const desc = event.description || '';

            const startTime = new Date(event.start.dateTime || event.start.date).toLocaleTimeString('en-AU', { hour12: false, hour: '2-digit', minute: '2-digit' });
            const endTime = new Date(event.end.dateTime || event.end.date).toLocaleTimeString('en-AU', { hour12: false, hour: '2-digit', minute: '2-digit' });
            const slot = { start: startTime, end: endTime };

            rooms.forEach(room => {
                if (summary.includes(room) || desc.includes(room)) {
                    busySlots[room].push(slot);
                }
                if ((summary.includes('Entire Space') || desc.includes('Entire Space')) &&
                    (room === 'MCIC Ground - Event Space' || room === 'MCIC Ground - Design Space')) {
                    busySlots[room].push(slot);
                }
            });
        });

        return NextResponse.json({ busySlots });
    } catch (error) {
        console.error('Error fetching calendar availability:', error);
        return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }
}