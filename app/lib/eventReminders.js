const MCIC_ADDRESS = 'The Michael Crouch Innovation Centre, Hilmer building, Gate 2, High Street, UNSW, Kensington, 2052';
const PARKING_URL = 'https://www.estate.unsw.edu.au/getting-here/parking-campus';
const THEME_PLACEHOLDER = '[brief mention of theme or vibe — e.g., “live performances,” “inspiring sessions,” or “unforgettable experiences”]';

const MCIC_ARRIVAL = `Location: ${MCIC_ADDRESS}.
Google Maps: https://goo.gl/maps/gh6d3nGKL5YfuifS7
Parking: Paid parking is available via the Cellopark app. The closest parking is via the NIDA car park. Entrance via Western Campus Dr (off Say Ave). Parking info: ${PARKING_URL}
Public transport: If you are coming via public transport there are bus and light rail services which stop on ANZAC Parade, and are in walking distance to the building.
Uber: Address (for Uber): UNSW Gate 2, High St, Randwick. Directions — get dropped off at the first roundabout inside of the gate (there is a natural taxi bay there). The MCIC Building is directly across the lawn (approx 50m walk).`;

const WEEK_BEFORE_SUBJECT = 'One week to go — [Event Name] is coming up';
const THREE_DAY_SUBJECT = 'We’re getting close! Your upcoming event is just around the corner';
const HOUR_BEFORE_SUBJECT = 'Starting soon — [Event Name] is in about an hour';

const WEEK_BEFORE_BODY = `[Event Name] is one week away.
Here are the details to keep handy:
📍 Location: [Venue Name, Address]
🗓️ Date: [Event Date]
🕒 Time: [Start–End Time]
We’ll send another note closer to the day. We can’t wait to welcome you!`;

const THREE_DAY_BODY = `We’re excited to see you soon at [Event Name]! The countdown is on — only a few days to go.
Here are the details to keep handy:
📍 Location: [Venue Name, Address]
🗓️ Date: [Event Date]
🕒 Time: [Start–End Time]
Keep an eye on your inbox for final updates and arrival info coming soon. We can’t wait to welcome you!`;

const DAY_BEFORE_BODY = `Just a quick reminder that [Event Name] kicks off tomorrow.
We’re looking forward to a great day filled with ${THEME_PLACEHOLDER}.
Here’s a quick recap:
📍 Location: [Venue Name, Address]
🗓️ Date: [Event Date]
🕒 Time: [Start–End Time]
Be sure to bring your ticket (printed or digital) for entry, and plan to arrive a few minutes early to check in.
See you soon!`;

const HOUR_BEFORE_BODY = `[Event Name] starts in about an hour.
Here are your details one last time:
📍 Location: [Venue Name, Address]
🗓️ Date: [Event Date]
🕒 Time: [Start–End Time]
Bring your ticket and head over. See you very soon!`;

export function isMcicSpace(space) {
    return /MCIC/i.test(String(space || ''));
}

export function isFoundersBooking({ department = '', eventType = '' } = {}) {
    return department === 'UNSW Founders'
        || eventType === 'UNSW_FOUNDERS'
        || eventType === 'OFFSITE_FOUNDERS';
}

export function formatEventDateLabel(isoDate) {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function pad(value) {
    return String(value).padStart(2, '0');
}

export function addCalendarDays(isoDate, days) {
    const [year, month, day] = isoDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + days));
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function sydneyWallClock(date = new Date()) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', {
            timeZone: 'Australia/Sydney',
            hourCycle: 'h23',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).formatToParts(date)
            .filter(part => part.type !== 'literal')
            .map(part => [part.type, part.value])
    );
    const hour = parts.hour === '24' ? '00' : pad(parts.hour);
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${hour}:${pad(parts.minute)}`;
}

export function sydneyLocalToDate(value) {
    if (!value || !value.includes('T')) return null;
    const [datePart, timePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    if ([year, month, day, hour, minute].some(part => Number.isNaN(part))) return null;

    let utc = Date.UTC(year, month - 1, day, hour, minute);
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Australia/Sydney',
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    for (let attempt = 0; attempt < 4; attempt += 1) {
        const parts = Object.fromEntries(
            formatter.formatToParts(new Date(utc))
                .filter(part => part.type !== 'literal')
                .map(part => [part.type, part.value])
        );
        const shownHour = parts.hour === '24' ? 0 : Number(parts.hour);
        const shown = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), shownHour, Number(parts.minute));
        const wanted = Date.UTC(year, month - 1, day, hour, minute);
        const delta = wanted - shown;
        if (delta === 0) break;
        utc += delta;
    }

    return new Date(utc);
}

export function parseReminderSendAt(value) {
    if (!value) return null;
    const text = String(value).trim();
    if (/[zZ]$/.test(text) || /[+-]\d{2}:\d{2}$/.test(text)) {
        const date = new Date(text);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    return sydneyLocalToDate(text.slice(0, 16));
}

export function normalizeSendAt(value) {
    const date = parseReminderSendAt(value);
    return date ? date.toISOString() : '';
}

function addMinutes(wall, minutes) {
    const date = sydneyLocalToDate(wall);
    if (!date) return '';
    return sydneyWallClock(new Date(date.getTime() + minutes * 60000));
}

function nextReasonableMorning(nowWall) {
    const date = nowWall.slice(0, 10);
    const time = nowWall.slice(11, 16);
    if (time < '09:00') return `${date}T09:00`;
    return `${addCalendarDays(date, 1)}T09:00`;
}

function futureBeforeEvent(preferred, eventStartWall, nowWall) {
    if (preferred > nowWall && (!eventStartWall || preferred < eventStartWall)) return preferred;
    const soon = addMinutes(nowWall, 5);
    if (!eventStartWall || soon < eventStartWall) return soon;
    const justBefore = addMinutes(eventStartWall, -5);
    if (justBefore > nowWall) return justBefore;
    return soon;
}

export function weekBeforeSendAt(eventDate, eventStart = '', now = new Date()) {
    if (!eventDate) return '';
    const nowWall = sydneyWallClock(now);
    const preferred = `${addCalendarDays(eventDate, -7)}T09:00`;
    const eventStartWall = eventStart ? `${eventDate}T${eventStart}` : '';
    if (preferred > nowWall && (!eventStartWall || preferred < eventStartWall)) return preferred;
    if (eventDate === nowWall.slice(0, 10)) return futureBeforeEvent(addMinutes(nowWall, 5), eventStartWall, nowWall);
    return futureBeforeEvent(nextReasonableMorning(nowWall), eventStartWall, nowWall);
}

export function threeDaySendAt(eventDate, eventStart = '', now = new Date()) {
    if (!eventDate) return '';
    const nowWall = sydneyWallClock(now);
    const preferred = `${addCalendarDays(eventDate, -3)}T09:00`;
    const eventStartWall = eventStart ? `${eventDate}T${eventStart}` : '';
    if (preferred > nowWall && (!eventStartWall || preferred < eventStartWall)) return preferred;
    if (eventDate === nowWall.slice(0, 10)) return futureBeforeEvent(addMinutes(nowWall, 5), eventStartWall, nowWall);
    return futureBeforeEvent(nextReasonableMorning(nowWall), eventStartWall, nowWall);
}

export function dayBeforeSendAt(eventDate, eventStart = '', now = new Date()) {
    if (!eventDate) return '';
    const nowWall = sydneyWallClock(now);
    const preferred = `${addCalendarDays(eventDate, -1)}T09:00`;
    const eventStartWall = eventStart ? `${eventDate}T${eventStart}` : '';
    if (preferred > nowWall && (!eventStartWall || preferred < eventStartWall)) return preferred;
    if (eventDate === nowWall.slice(0, 10)) return futureBeforeEvent(addMinutes(nowWall, 5), eventStartWall, nowWall);
    return futureBeforeEvent(nextReasonableMorning(nowWall), eventStartWall, nowWall);
}

export function hourBeforeSendAt(eventDate, eventStart = '', now = new Date()) {
    if (!eventDate) return '';
    const nowWall = sydneyWallClock(now);
    const eventStartWall = eventStart ? `${eventDate}T${eventStart}` : `${eventDate}T09:00`;
    const preferred = addMinutes(eventStartWall, -60);
    return futureBeforeEvent(preferred, eventStartWall, nowWall);
}

function formatClock(time) {
    const [hourValue, minute] = String(time).split(':');
    const hour = Number(hourValue);
    if (Number.isNaN(hour) || minute === undefined) return '';
    const suffix = hour >= 12 ? 'pm' : 'am';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute} ${suffix}`;
}

function formatTimeRange(start, end) {
    if (!start) return '';
    const startLabel = formatClock(start);
    if (!end) return startLabel;
    return `${startLabel} – ${formatClock(end)}`;
}

function themePhrase(founders, description) {
    const cleaned = String(description || '').trim().replace(/\s+/g, ' ');
    if (founders && cleaned && cleaned.length <= 80) return cleaned;
    return THEME_PLACEHOLDER;
}

function applyDetails(template, fields) {
    return template
        .replaceAll('[Event Name]', fields.name)
        .replaceAll('[Venue Name, Address]', fields.venue)
        .replaceAll('[Event Date]', fields.date)
        .replaceAll('[Start–End Time]', fields.time)
        .replaceAll(THEME_PLACEHOLDER, fields.theme);
}

function withClosing(body, founders, space) {
    let text = body.replace(/\s+$/, '');
    if (founders) text += '\n—\nUNSW Founders';
    if (isMcicSpace(space)) text += `\n\n${MCIC_ARRIVAL}`;
    return text;
}

function reminderFields({ founders, eventName, eventDate, eventStart, eventEnd, space, eventDescription }) {
    const name = founders && String(eventName || '').trim() ? String(eventName).trim() : '[Event Name]';
    const date = founders && eventDate ? (formatEventDateLabel(eventDate) || '[Event Date]') : '[Event Date]';
    const time = founders && eventStart ? (formatTimeRange(eventStart, eventEnd) || '[Start–End Time]') : '[Start–End Time]';
    let venue = '[Venue Name, Address]';
    if (founders) {
        if (isMcicSpace(space)) venue = MCIC_ADDRESS;
        else if (String(space || '').trim()) venue = `${String(space).trim()}, address to be confirmed`;
    }
    return {
        name,
        date,
        time,
        venue,
        theme: themePhrase(founders, eventDescription)
    };
}

export function buildDefaultReminders({
    founders = false,
    department = '',
    eventType = '',
    eventName = '',
    eventDate = '',
    eventStart = '',
    eventEnd = '',
    space = '',
    eventDescription = '',
    now = new Date()
} = {}) {
    const branded = founders || isFoundersBooking({ department, eventType });
    const fields = reminderFields({
        founders: branded,
        eventName,
        eventDate,
        eventStart,
        eventEnd,
        space,
        eventDescription
    });
    const close = body => withClosing(applyDetails(body, fields), branded, space);

    return [
        {
            id: 'week-before',
            kind: 'default',
            label: '1 week before',
            subject: WEEK_BEFORE_SUBJECT.replace('[Event Name]', fields.name),
            body: close(WEEK_BEFORE_BODY),
            sendAt: weekBeforeSendAt(eventDate, eventStart, now),
            manuallyEdited: false
        },
        {
            id: 'three-days',
            kind: 'default',
            label: '3 days before',
            subject: THREE_DAY_SUBJECT,
            body: close(THREE_DAY_BODY),
            sendAt: threeDaySendAt(eventDate, eventStart, now),
            manuallyEdited: false
        },
        {
            id: 'day-before',
            kind: 'default',
            label: '1 day before',
            subject: `It’s almost time — ${fields.name} is tomorrow!`,
            body: close(DAY_BEFORE_BODY),
            sendAt: dayBeforeSendAt(eventDate, eventStart, now),
            manuallyEdited: false
        },
        {
            id: 'hour-before',
            kind: 'default',
            label: 'On the day, 1 hour before start',
            subject: HOUR_BEFORE_SUBJECT.replace('[Event Name]', fields.name),
            body: close(HOUR_BEFORE_BODY),
            sendAt: hourBeforeSendAt(eventDate, eventStart, now),
            manuallyEdited: false
        }
    ];
}

export function blankExtraReminder(context = {}) {
    const [template] = buildDefaultReminders({ ...context, founders: false, department: '', eventType: '' });
    return {
        id: `extra-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        kind: 'extra',
        label: 'Extra reminder',
        subject: template.subject,
        body: template.body,
        sendAt: '',
        manuallyEdited: false
    };
}

export function mergeReminderDrafts(previous, generated, locks) {
    const prior = Array.isArray(previous) ? previous : [];
    const defaults = generated.map(item => {
        const lock = locks?.[item.id];
        const existing = prior.find(entry => entry.id === item.id);
        if (!lock || !existing) return item;
        return {
            ...item,
            subject: lock.subject ? existing.subject : item.subject,
            body: lock.body ? existing.body : item.body,
            sendAt: lock.sendAt ? existing.sendAt : item.sendAt,
            manuallyEdited: Boolean(lock.subject || lock.body || lock.sendAt)
        };
    });
    const extras = prior.filter(item => item.kind === 'extra');
    return [...defaults, ...extras];
}

export function normalizeEmailReminders(config) {
    const reminders = Array.isArray(config?.reminders) ? config.reminders : [];
    return {
        enabled: Boolean(config?.enabled),
        reminders: reminders.map((item, index) => ({
            id: String(item?.id || `reminder-${index + 1}`),
            kind: item?.kind === 'extra' ? 'extra' : 'default',
            subject: String(item?.subject || ''),
            body: String(item?.body || ''),
            sendAt: normalizeSendAt(item?.sendAt),
            manuallyEdited: Boolean(item?.manuallyEdited)
        }))
    };
}
