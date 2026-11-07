export const WORK_START = '08:45';
export const WORK_END = '16:00';
export const WORK_HOURS_LABEL = '8:45am – 4:00pm';
export const OUTSIDE_WORK_HOURS_LABEL = 'Before 8:45am or after 4:00pm';

const LATE_HANDOVER_MINUTES = 30;

function minutesFromClock(time) {
    const match = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
}

function clockFromMinutes(total) {
    const day = 24 * 60;
    const minutes = ((total % day) + day) % day;
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function isWeekendDate(isoDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate || ''))) return false;
    const [year, month, day] = isoDate.split('-').map(Number);
    const weekday = new Date(year, month - 1, day).getDay();
    return weekday === 0 || weekday === 6;
}

export function casualMinimumHours(isoDate) {
    return isWeekendDate(isoDate) ? 4 : 3;
}

function shift(kind, date, start, end) {
    const tasks = {
        early: 'Cover from bump in until ordinary working hours',
        late: 'Cover from 3:30pm until bump out',
        weekend: 'Weekend cover outside ordinary working hours'
    }[kind];
    return {
        kind,
        date: date || '',
        forceKey: `${date || 'day'}:${kind}`,
        shiftStart: clockFromMinutes(start),
        shiftEnd: clockFromMinutes(end),
        tasks
    };
}

/**
 * Casual shifts required when a non-Founders booking sits outside
 * ordinary weekday hours. Weekday minimum is 3 hours, weekend is 4.
 * Early cover starts at bump in and runs until 8:45am when that is
 * longer than the minimum, otherwise for the minimum. Late cover
 * starts 30 minutes before 4:00pm, or at bump in if that is later,
 * and finishes at bump out.
 */
export function requiredCasualShifts({ bumpIn, bumpOut, date }) {
    const start = minutesFromClock(bumpIn);
    const end = minutesFromClock(bumpOut);
    if (start == null || end == null || end <= start) return [];

    const workStart = minutesFromClock(WORK_START);
    const workEnd = minutesFromClock(WORK_END);
    const minimum = casualMinimumHours(date) * 60;
    const weekend = isWeekendDate(date);
    const shifts = [];

    if (start < workStart) {
        const untilWork = workStart - start;
        const shiftEnd = untilWork > minimum ? workStart : start + minimum;
        shifts.push(shift('early', date, start, shiftEnd));
    }

    if (end > workEnd) {
        const shiftStart = Math.max(start, workEnd - LATE_HANDOVER_MINUTES);
        shifts.push(shift('late', date, shiftStart, end));
    }

    if (weekend && start < workEnd && end > workStart) {
        const middleStart = Math.max(start, workStart);
        const middleEnd = Math.min(end, workEnd);
        if (middleEnd > middleStart) shifts.push(shift('weekend', date, middleStart, middleEnd));
    }

    if (weekend && shifts.length === 1 && shifts[0].kind === 'weekend') {
        const only = shifts[0];
        const onlyStart = minutesFromClock(only.shiftStart);
        const onlyEnd = minutesFromClock(only.shiftEnd);
        return [shift('weekend', date, onlyStart, Math.max(onlyEnd, onlyStart + minimum))];
    }

    if (!weekend || shifts.length < 2) return shifts;

    const mergedStart = Math.min(...shifts.map((item) => minutesFromClock(item.shiftStart)));
    const mergedEnd = Math.max(...shifts.map((item) => minutesFromClock(item.shiftEnd)));
    const covered = Math.max(mergedEnd, mergedStart + minimum);
    return [shift('weekend', date, mergedStart, covered)];
}

export function requiredCasualShiftsForHolds(holds) {
    return (holds || []).flatMap((hold) => requiredCasualShifts({
        bumpIn: hold?.bumpIn,
        bumpOut: hold?.bumpOut,
        date: hold?.date
    }));
}
