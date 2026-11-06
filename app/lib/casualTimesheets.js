export function clock(value) {
    const match = String(value || '').trim().match(/^(\d{2}:\d{2})/);
    return match ? match[1] : '';
}

export function minutesBetween(start, end) {
    const from = clock(start);
    const to = clock(end);
    if (!from || !to || from >= to) return null;
    const [fromHour, fromMinute] = from.split(':').map(Number);
    const [toHour, toMinute] = to.split(':').map(Number);
    return (toHour * 60 + toMinute) - (fromHour * 60 + fromMinute);
}

export function formatDuration(minutes) {
    if (minutes == null) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (!mins) return `${hours}h`;
    if (!hours) return `${mins}m`;
    return `${hours}h ${mins}m`;
}

export function durationLabel(start, end) {
    const minutes = minutesBetween(start, end);
    if (minutes == null) return '';
    return `${start}–${end} (${formatDuration(minutes)})`;
}
