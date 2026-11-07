// app/api/calendar/availability/route.js
import { NextResponse } from 'next/server';
import { availabilityForDates, normaliseAvailabilityDates } from '../../../lib/calendarAvailability';

function availabilityError(error) {
    const status = error?.status === 400 ? 400 : 500;
    if (status === 500) console.error('Error fetching calendar availability');
    return NextResponse.json(
        { error: status === 400 ? 'Date parameter required' : 'Failed to fetch availability' },
        { status }
    );
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    if (!dateStr) {
        return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
    }

    try {
        const { byDate } = await availabilityForDates([dateStr]);
        return NextResponse.json({ busySlots: byDate[dateStr] || {} });
    } catch (error) {
        return availabilityError(error);
    }
}

export async function POST(request) {
    let body = {};
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Date list required' }, { status: 400 });
    }

    const dates = normaliseAvailabilityDates(body.dates);
    if (!dates.length) {
        return NextResponse.json({ error: 'Date list required' }, { status: 400 });
    }

    try {
        const { byDate, calendarLoaded } = await availabilityForDates(dates);
        return NextResponse.json({
            byDate,
            calendarLoaded,
            capped: dates.length >= 52 && (body.dates || []).length > dates.length
        });
    } catch (error) {
        return availabilityError(error);
    }
}
