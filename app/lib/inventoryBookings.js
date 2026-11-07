function at(date, time, fallback) {
    if (!date) return null;
    const clock = time || fallback;
    if (!clock) return null;
    const value = new Date(`${date}T${clock.length === 5 ? clock : fallback}:00`);
    return Number.isNaN(value.getTime()) ? null : value;
}

function requestedItemIds(requests) {
    if (!requests || typeof requests !== 'object') return [];
    return Object.entries(requests)
        .filter(([, value]) => value === true || Number(value) > 0)
        .map(([key]) => String(key).toUpperCase());
}

export function reservationWindows(reservation) {
    if (!reservation || reservation.status === 'Cancelled') return [];
    const ranged = reservation.dateSelectionType === 'range';
    const start = at(ranged ? reservation.bookingStartDate : reservation.bookingDate, reservation.bookingStartTime, '00:00');
    const end = at(ranged ? reservation.bookingEndDate : reservation.bookingDate, reservation.bookingEndTime, '23:59');
    if (!start || !end || end <= start) return [];
    return [{
        itemId: String(reservation.itemId || '').toUpperCase(),
        itemName: reservation.itemName || reservation.itemId || 'Inventory item',
        who: reservation.borrowerName || 'Reserved',
        start,
        end,
        quantity: Number(reservation.quantity) > 0 ? Number(reservation.quantity) : 1,
        source: 'reservation'
    }];
}

export function bookingEquipmentWindows(booking) {
    if (!booking || booking.status === 'DECLINED' || booking.status === 'CANCELLED') return [];
    const itemIds = requestedItemIds(booking.equipmentRequests);
    if (!itemIds.length) return [];
    const holds = Array.isArray(booking.tentativeHolds) && booking.tentativeHolds.length
        ? booking.tentativeHolds
        : [{ bumpInDate: booking.bumpInDate, bumpIn: booking.bumpIn, bumpOut: booking.bumpOut }];
    const who = booking.eventName || booking.mainContact?.name || 'Event booking';
    return holds.flatMap(hold => itemIds.flatMap(itemId => {
        const start = at(hold.bumpInDate, hold.bumpIn, '00:00');
        const end = at(hold.bumpInDate, hold.bumpOut, '23:59');
        if (!start || !end || end <= start) return [];
        const raw = booking.equipmentRequests?.[itemId] ?? booking.equipmentRequests?.[itemId.toLowerCase()];
        const quantity = raw === true || raw === undefined ? 1 : Number(raw) || 1;
        return [{ itemId, itemName: itemId, who, start, end, quantity, source: 'booking' }];
    }));
}

export function withItemNames(windows, items) {
    const names = new Map((items || []).map(item => [String(item.id || '').toUpperCase(), item.name]));
    return windows.map(window => ({
        ...window,
        itemName: names.get(window.itemId) || window.itemName
    }));
}

export function windowsOnDate(windows, isoDate) {
    const dayStart = new Date(`${isoDate}T00:00:00`);
    const dayEnd = new Date(`${isoDate}T23:59:59`);
    if (Number.isNaN(dayStart.getTime())) return [];
    return windows
        .filter(window => window.start <= dayEnd && window.end >= dayStart)
        .sort((a, b) => a.start - b.start || a.itemName.localeCompare(b.itemName));
}

export function nextWindowForItem(windows, itemId, from = new Date()) {
    const id = String(itemId || '').toUpperCase();
    return windows
        .filter(window => window.itemId === id && window.end > from)
        .sort((a, b) => a.start - b.start)[0] || null;
}

export function overlappingQuantity(holds, start, end) {
    if (!start || !end || end <= start) return 0;
    return (holds || []).reduce((sum, hold) => {
        if (!hold?.start || !hold?.end) return sum;
        if (hold.start < end && hold.end > start) return sum + (Number(hold.quantity) > 0 ? Number(hold.quantity) : 1);
        return sum;
    }, 0);
}

export function formatInventoryWindow(window) {
    const date = window.start.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
    const time = (value) => value.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${window.itemName} · ${date} ${time(window.start)}–${time(window.end)} · ${window.who}`;
}
