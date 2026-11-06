import { getCalendarClient } from './googleCalendar';
import { isIsoDate } from './bookingRules';

const ROOMS = [
    'MCIC Ground - Entire Space',
    'MCIC Ground - Event Space',
    'MCIC Ground - Design Space',
    'MCIC Level 1 - Founders Place',
    'MCIC Level 1 - Group Study',
    'MCIC Ground - Colonnade'
];

export const MAX_AVAILABILITY_DATES = 52;

function sydneyClock(date) {
    const parts = new Intl.DateTimeFormat('en-AU', {
        timeZone: 'Australia/Sydney',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(date);
    const value = (type) => parts.find(part => part.type === type)?.value || '00';
    const hour = value('hour') === '24' ? '00' : value('hour').padStart(2, '0');
    return {
        date: `${value('year')}-${value('month')}-${value('day')}`,
        time: `${hour}:${value('minute').padStart(2, '0')}`
    };
}

function clockRangeForDate(event, queriedDate) {
    if (event.start?.date && !event.start.dateTime) {
        const endDate = event.end?.date || event.start.date;
        if (queriedDate >= event.start.date && queriedDate < endDate) {
            return { start: '00:00', end: '24:00' };
        }
        return null;
    }

    if (!event.start?.dateTime || !event.end?.dateTime) return null;

    const start = sydneyClock(new Date(event.start.dateTime));
    const end = sydneyClock(new Date(event.end.dateTime));
    if (start.date > queriedDate || end.date < queriedDate) return null;
    if (end.date === queriedDate && end.time === '00:00' && start.date < queriedDate) return null;

    const startTime = start.date === queriedDate ? start.time : '00:00';
    const endTime = end.date === queriedDate ? end.time : '24:00';
    if (startTime >= endTime) return null;
    return { start: startTime, end: endTime };
}

export function busySlotsFromEvents(events, dateStr) {
    const busySlots = {};
    ROOMS.forEach(room => { busySlots[room] = []; });

    (events || []).forEach(event => {
        const summary = event.summary || '';
        const desc = event.description || '';
        const slot = clockRangeForDate(event, dateStr);
        if (!slot) return;

        ROOMS.forEach(room => {
            if (summary.includes(room) || desc.includes(room)) {
                busySlots[room].push(slot);
            }
            // An Entire Space hold blocks both halves of the ground floor.
            if ((summary.includes('Entire Space') || desc.includes('Entire Space')) &&
                (room === 'MCIC Ground - Event Space' || room === 'MCIC Ground - Design Space')) {
                busySlots[room].push(slot);
            }
        });
    });

    return busySlots;
}

export function normaliseAvailabilityDates(dates) {
    return [...new Set((dates || []).filter(isIsoDate))].slice(0, MAX_AVAILABILITY_DATES);
}

export async function fetchBusySlotsForDates(dates) {
    const unique = normaliseAvailabilityDates(dates);
    if (!unique.length) {
        const error = new Error('Date list required');
        error.status = 400;
        throw error;
    }

    const sorted = [...unique].sort();
    const calendar = getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    const response = await calendar.events.list({
        calendarId,
        timeMin: `${sorted[0]}T00:00:00+11:00`,
        timeMax: `${sorted[sorted.length - 1]}T23:59:59+11:00`,
        singleEvents: true,
        orderBy: 'startTime'
    });

    const events = response.data.items || [];
    const byDate = {};
    unique.forEach(dateStr => {
        byDate[dateStr] = busySlotsFromEvents(events, dateStr);
    });
    return byDate;
}
