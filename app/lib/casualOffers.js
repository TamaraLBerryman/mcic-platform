import { CASUAL_STAFF_LIST, casualShiftQuantity } from './casualStaff';

export const CASUAL_SHIFT_NOTE = 'Casuals can call or Teams Tamara anytime if they have questions. Please speak up if you don\'t know how to do something or need a second pair of hands.';
export const TAMARA_CONTACT = 'Tamara Berryman (t.berryman@unsw.edu.au)';

export function offerDocId(shiftKey) {
    return String(shiftKey || '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 700);
}

export function cleanEmail(value) {
    return String(value || '').trim().toLowerCase();
}

export function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(value));
}

export function rosterFromSaved(saved) {
    const known = new Map();
    (Array.isArray(saved) ? saved : []).forEach((person) => {
        const name = String(person?.name || '').trim();
        if (name) known.set(name, person);
    });
    const names = [...CASUAL_STAFF_LIST];
    known.forEach((_, name) => {
        if (!names.includes(name)) names.push(name);
    });
    return names.map((name) => {
        const person = known.get(name) || {};
        return {
            name,
            email: cleanEmail(person.email),
            token: String(person.token || '')
        };
    });
}

function clock(value) {
    const match = String(value || '').trim().match(/^(\d{2}:\d{2})/);
    return match ? match[1] : '';
}

export function sanitizeShift(raw) {
    const times = raw?.times && typeof raw.times === 'object' ? raw.times : {};
    const date = String(raw?.date || '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || '';
    const id = String(raw?.id || '').trim().slice(0, 200);
    if (!id) return null;
    return {
        id,
        date,
        start: clock(raw?.start),
        end: clock(raw?.end),
        quantity: casualShiftQuantity({ quantity: raw?.quantity }) || 1,
        tasks: String(raw?.tasks || '').trim().slice(0, 1000),
        preferred: String(raw?.preferred || '').trim().slice(0, 80),
        event: String(raw?.event || 'Untitled event').trim().slice(0, 200),
        place: String(raw?.place || '').trim().slice(0, 200),
        who: String(raw?.who || '').trim().slice(0, 120),
        organiserEmail: cleanEmail(raw?.organiserEmail),
        times: {
            bumpIn: clock(times.bumpIn),
            eventStart: clock(times.eventStart),
            eventEnd: clock(times.eventEnd),
            bumpOut: clock(times.bumpOut)
        }
    };
}

export function shiftDetailsText(shift) {
    const times = shift.times || {};
    const running = times.eventStart && times.eventEnd ? `${times.eventStart}–${times.eventEnd}` : '';
    const bump = [
        times.bumpIn ? `bump in ${times.bumpIn}` : '',
        times.bumpOut ? `bump out ${times.bumpOut}` : ''
    ].filter(Boolean).join(', ');
    return [
        `${shift.date || 'No date'} ${shift.start && shift.end ? `${shift.start}–${shift.end}` : 'No shift times'}`,
        `${shift.event || 'Event'}${shift.place ? ` · ${shift.place}` : ''}`,
        running ? `Event ${running}${bump ? ` (${bump})` : ''}` : (bump ? bump : ''),
        shift.tasks ? `Tasks: ${shift.tasks}` : '',
        shift.who ? `Organiser: ${shift.who}${shift.organiserEmail ? ` (${shift.organiserEmail})` : ''}` : ''
    ].filter(Boolean).join('\n');
}

export function casualHoldDescription(shift) {
    return [
        'MCIC casual shift',
        '',
        shiftDetailsText(shift),
        '',
        CASUAL_SHIFT_NOTE,
        `Teams: ${TAMARA_CONTACT}`
    ].join('\n');
}
