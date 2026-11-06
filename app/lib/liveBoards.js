import { BOOKABLE_SPACES } from './bookingRules';

export const ENTIRE_SPACE = 'MCIC Ground - Entire Space';

export const SPACE_BOARDS = [
    { id: 'event', name: 'Event Space', space: 'MCIC Ground - Event Space' },
    { id: 'design', name: 'Design Space', space: 'MCIC Ground - Design Space' },
    { id: 'entire', name: 'Entire Space', space: ENTIRE_SPACE },
    { id: 'colonnade', name: 'Colonnade', space: 'MCIC Ground - Colonnade' },
    { id: 'founders', name: 'Founders Place', space: 'MCIC Level 1 - Founders Place' },
    { id: 'study', name: 'Group Study', space: 'MCIC Level 1 - Group Study', note: 'Level 1 Open Area' }
];

const COVERED_BY_ENTIRE = new Set([
    'MCIC Ground - Event Space',
    'MCIC Ground - Design Space'
]);

function clock(value, fallback = '') {
    const text = String(value || fallback || '').slice(0, 5);
    return /^\d{2}:\d{2}$/.test(text) ? text : '';
}

export function isFoundersRecord(record) {
    return record?.department === 'UNSW Founders'
        || record?.hostType === 'UNSW Founders'
        || record?.eventType === 'UNSW_FOUNDERS'
        || record?.eventType === 'OFFSITE_FOUNDERS';
}

function registrationMode(record) {
    if (record?.ticketing?.method === 'internal' && record.publicEventSlug) return 'platform';
    if (record?.ticketing?.method === 'external') return 'external';
    if (record?.registrationType === 'MCIC_PLATFORM' && record.slug) return 'platform';
    if (record?.registrationType === 'EXTERNAL') return 'external';
    return 'none';
}

function occurrence(base) {
    const eventStart = clock(base.eventStart, base.bumpIn);
    const eventEnd = clock(base.eventEnd, base.bumpOut);
    const bumpIn = clock(base.bumpIn, eventStart);
    const bumpOut = clock(base.bumpOut, eventEnd);
    if (!base.date || !eventStart || !eventEnd) return null;
    return {
        id: base.id,
        title: base.title || 'Untitled event',
        date: base.date,
        bumpIn: bumpIn || eventStart,
        bumpOut: bumpOut || eventEnd,
        eventStart,
        eventEnd,
        space: base.space || '',
        founders: Boolean(base.founders),
        offsite: Boolean(base.offsite),
        slug: base.slug || '',
        registrationMode: base.registrationMode || 'none',
        registrations: Number(base.registrations) || 0,
        checkedIn: Number(base.checkedIn) || 0
    };
}

function guestCounts(slug, counts = {}) {
    return {
        registrations: counts.registrations?.[slug] || 0,
        checkedIn: counts.checkedIn?.[slug] || 0
    };
}

export function expandBooking(booking, counts = {}) {
    if (!booking || booking.status !== 'APPROVED') return [];
    const slug = booking.publicEventSlug || '';
    const onSite = BOOKABLE_SPACES.includes(booking.space);
    const shared = {
        title: booking.eventName || 'Untitled event',
        space: booking.space || (onSite ? '' : 'Off site'),
        founders: isFoundersRecord(booking),
        offsite: !onSite,
        slug,
        registrationMode: registrationMode(booking),
        ...guestCounts(slug, counts)
    };
    const holds = Array.isArray(booking.tentativeHolds) ? booking.tentativeHolds.filter(hold => hold?.bumpInDate) : [];
    if (holds.length > 1) {
        return holds.map((hold) => occurrence({
            ...shared,
            id: `${booking.id}:${hold.bumpInDate}:${hold.space || shared.space}`,
            date: hold.bumpInDate,
            space: BOOKABLE_SPACES.includes(hold.space) ? hold.space : shared.space,
            bumpIn: hold.bumpIn,
            eventStart: hold.eventStart,
            eventEnd: hold.eventEnd,
            bumpOut: hold.bumpOut
        })).filter(Boolean);
    }
    const dates = booking.recurrence?.bookedDates?.length
        ? booking.recurrence.bookedDates
        : [booking.bumpInDate].filter(Boolean);
    return [...new Set(dates)].map((date) => occurrence({
        ...shared,
        id: `${booking.id}:${date}:${shared.space}`,
        date,
        bumpIn: booking.bumpIn,
        eventStart: booking.eventStart,
        eventEnd: booking.eventEnd,
        bumpOut: booking.bumpOut
    })).filter(Boolean);
}

export function expandListing(event, counts = {}) {
    if (!event || event.status !== 'APPROVED' || event.bookingId) return null;
    const founders = isFoundersRecord(event);
    const offsite = event.heldAtMcic === false || event.eventType === 'OFFSITE' || event.eventType === 'OFFSITE_FOUNDERS';
    if (!offsite && event.listingSource !== 'directory') return null;
    if (!offsite) return null;
    return occurrence({
        id: `listing:${event.id}`,
        title: event.title,
        date: event.eventDate,
        bumpIn: event.eventStart,
        eventStart: event.eventStart,
        eventEnd: event.eventEnd,
        bumpOut: event.eventEnd,
        space: event.space || 'Off site',
        founders,
        offsite: true,
        slug: event.slug || '',
        registrationMode: registrationMode(event),
        ...guestCounts(event.slug || '', counts)
    });
}

export function countsAsGuest(registration) {
    return registration?.status !== 'PENDING_REVIEW' && registration?.status !== 'DENIED';
}

export function stamp(date, time) {
    return `${date}T${time}`;
}

export function spaceEvents(events, space) {
    const own = events.filter((event) => !event.offsite && event.space === space);
    if (!COVERED_BY_ENTIRE.has(space)) return own;
    const covered = events
        .filter((event) => !event.offsite && event.space === ENTIRE_SPACE)
        .map((event) => ({ ...event, id: `${event.id}:covered`, coveredByEntire: true }));
    return [...own, ...covered];
}

export function dayRows(events, today, nowTime) {
    const todays = events
        .filter((event) => event.date === today)
        .sort((a, b) => stamp(a.date, a.bumpIn).localeCompare(stamp(b.date, b.bumpIn)));
    const rows = [];
    let previousEnd = '';
    todays.forEach((event) => {
        if (previousEnd && event.bumpIn > previousEnd) {
            rows.push({
                kind: 'gap',
                id: `gap:${today}:${previousEnd}:${event.bumpIn}`,
                date: today,
                start: previousEnd,
                end: event.bumpIn,
                current: nowTime >= previousEnd && nowTime < event.bumpIn
            });
        }
        rows.push({
            kind: 'event',
            ...event,
            phase: nowTime >= event.bumpOut ? 'past' : nowTime >= event.bumpIn ? 'now' : 'later'
        });
        if (!previousEnd || event.bumpOut > previousEnd) previousEnd = event.bumpOut;
    });
    return rows;
}

export function countdownTarget(event, nowStamp) {
    if (!event) return null;
    const start = stamp(event.date, event.eventStart);
    const end = stamp(event.date, event.eventEnd);
    if (nowStamp >= start && nowStamp < end) return { label: 'Time left', at: end, live: true };
    if (nowStamp < start) return { label: 'Starts in', at: start, live: false };
    return null;
}
