// Pure booking rules shared by the form and the booking API.
// Internal to UNSW counts as staff, including UNSW Founders and other faculties.
// External hirers are not staff. This form has no separate student switch.

export const MAX_SERIES_OCCURRENCES = 52;

export const BOOKABLE_SPACES = [
    'MCIC Ground - Event Space',
    'MCIC Ground - Design Space',
    'MCIC Ground - Entire Space',
    'MCIC Ground - Colonnade',
    'MCIC Level 1 - Founders Place',
    'MCIC Level 1 - Group Study'
];

export function isSiteVenue(space) {
    return BOOKABLE_SPACES.includes(space);
}

const WINDOWS = [
    { start: [1, 1], end: [5, 28], opens: [11, 20], previousYear: true, label: '1 Jan–28 May' },
    { start: [5, 29], end: [9, 10], opens: [4, 23], previousYear: false, label: '29 May–10 Sep' },
    { start: [9, 11], end: [12, 9], opens: [8, 6], previousYear: false, label: '11 Sep–9 Dec' }
];

export function isIsoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function sydneyTodayString(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-AU', {
        timeZone: 'Australia/Sydney',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(now);
    const value = (type) => parts.find(part => part.type === type)?.value || '00';
    return `${value('year')}-${value('month')}-${value('day')}`;
}

export function isUnswStaff(userType) {
    return userType === 'Internal to UNSW';
}

export function isFoundersBooker(userType, department) {
    return userType === 'Internal to UNSW' && department === 'UNSW Founders';
}

function pad(number) {
    return String(number).padStart(2, '0');
}

function monthDay(month, day) {
    return month * 100 + day;
}

export function formatBookingDate(isoDate, withWeekday = false) {
    if (!isIsoDate(isoDate)) return isoDate || '';
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-AU', {
        weekday: withWeekday ? 'short' : undefined,
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

export function bookingWindowForDate(dateInput, todayInput = sydneyTodayString()) {
    const dateStr = typeof dateInput === 'string' ? dateInput : localDateString(dateInput);
    const todayStr = typeof todayInput === 'string' ? todayInput : sydneyTodayString(todayInput);
    if (!isIsoDate(dateStr)) {
        return { date: dateStr, locked: false, opens: null, outside: false, label: '', year: null };
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const key = monthDay(month, day);
    const window = WINDOWS.find(item => key >= monthDay(item.start[0], item.start[1]) && key <= monthDay(item.end[0], item.end[1]));

    if (!window) {
        return {
            date: dateStr,
            locked: true,
            opens: null,
            outside: true,
            label: '10 Dec–31 Dec',
            year
        };
    }

    const openYear = window.previousYear ? year - 1 : year;
    const opens = `${openYear}-${pad(window.opens[0])}-${pad(window.opens[1])}`;
    return {
        date: dateStr,
        locked: todayStr < opens,
        opens,
        outside: false,
        label: window.label,
        year
    };
}

export function lockoutMessage(info) {
    if (!info?.locked) return '';
    const when = formatBookingDate(info.date);
    if (info.outside) {
        return `${when} is outside the bookable periods. 10 Dec–31 Dec stays closed for anyone who is not UNSW staff.`;
    }
    return `${when} is not open yet. Event dates ${info.label} ${info.year} can be booked from ${formatBookingDate(info.opens)}.`;
}

export function lockoutSummary(info) {
    if (!info?.locked) return '';
    if (info.outside) return '10 Dec–31 Dec is outside the bookable periods.';
    return `Event dates ${info.label} ${info.year} open for booking on ${formatBookingDate(info.opens)}.`;
}

function clampInt(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, Math.trunc(number)));
}

function addDays(isoDate, days) {
    const [year, month, day] = isoDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    return localDateString(date);
}

export function buildSeriesDates(startDate, options = {}) {
    const start = typeof startDate === 'string' ? startDate : localDateString(startDate);
    if (!isIsoDate(start) || options.pattern !== 'weekly') return isIsoDate(start) ? [start] : [];

    const interval = clampInt(options.interval, 1, MAX_SERIES_OCCURRENCES);
    const endType = options.endType || options.end?.type || 'after';
    const endDate = options.endDate || options.end?.date || '';
    const occurrences = clampInt(
        options.occurrences ?? options.end?.occurrences,
        1,
        MAX_SERIES_OCCURRENCES
    );

    if (endType === 'on' && isIsoDate(endDate) && endDate < start) return [];

    const dates = [];
    let cursor = start;
    while (dates.length < MAX_SERIES_OCCURRENCES) {
        if (endType === 'after' && dates.length >= occurrences) break;
        if (endType === 'on' && isIsoDate(endDate) && cursor > endDate) break;
        if (endType === 'on' && !isIsoDate(endDate) && dates.length >= 1) break;
        dates.push(cursor);
        cursor = addDays(cursor, interval * 7);
    }
    return dates;
}

export function selectedTimesFromSlots(selectedSlots) {
    return [...new Set((selectedSlots || []).map(key => String(key).split('|').pop()))]
        .filter(time => /^\d{2}:\d{2}$/.test(time))
        .sort();
}

export function dateConflictsWithBusy(busyRanges, times) {
    return (times || []).some(time => (
        (busyRanges || []).some(range => time >= range.start && time < range.end)
    ));
}

export function partitionSeriesDates(dates, byDate, room, times, rangeLabel) {
    const bookedDates = [];
    const skippedDates = [];
    for (const date of dates) {
        const ranges = byDate?.[date]?.[room] || [];
        if (dateConflictsWithBusy(ranges, times)) {
            skippedDates.push({
                date,
                reason: `${room} is already booked at ${rangeLabel}`
            });
        } else {
            bookedDates.push(date);
        }
    }
    return { bookedDates, skippedDates };
}
