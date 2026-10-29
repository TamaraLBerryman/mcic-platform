// app/api/calendar/availability/route.js
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { ROOM_CALENDAR_MAP } from '@/lib/googleCalendar';

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
    const dateStr = searchParams.get('date'); // Format: YYYY-MM-DD

    if (!dateStr) {
        return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
    }

    try {
        const calendar = getCalendarClient();
        const startIso = `${dateStr}T00:00:00+11:00`;
        const endIso = `${dateStr}T23:59:59+11:00`;

        // Map calendar items for query
        const calendarItems = Object.values(ROOM_CALENDAR_MAP)
            .filter(Boolean)
            .map(id => ({ id }));

        if (calendarItems.length === 0) {
            return NextResponse.json({ busySlots: {} });
        }

        const freeBusyResponse = await calendar.freebusy.query({
            requestBody: {
                timeMin: startIso,
                timeMax: endIso,
                items: calendarItems,
            },
        });

        const calendars = freeBusyResponse.data.calendars || {};
        const result = {};

        // Group busy slots by room name
        for (const [roomName, calId] of Object.entries(ROOM_CALENDAR_MAP)) {
            if (calId && calendars[calId]) {
                result[roomName] = calendars[calId].busy.map(slot => ({
                    start: new Date(slot.start).toLocaleTimeString('en-AU', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                    end: new Date(slot.end).toLocaleTimeString('en-AU', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                }));
            } else {
                result[roomName] = [];
            }
        }

        return NextResponse.json({ busySlots: result });
    } catch (error) {
        console.error('Error fetching calendar availability:', error);
        return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }
}