export const CASUAL_STAFF_LIST = [
    'Ivara', 'Henry', 'Wonyoung', 'Hanisha', 'Hudson', 'Harry', 'Luka',
    'Julian', 'Reuben', 'William', 'Sarah', 'Julie', 'Aryan', 'Shetal',
    'Thomas', 'Alex', 'Sam', 'Victoria', 'Rita', 'Chiragm', 'Lucas', 'Armin', 'Nicole'
];

export const MAX_CASUAL_QUANTITY = 20;

export function emptyCasualShift() {
    return { preferredStaff: '', quantity: 1, shiftStart: '', shiftEnd: '', tasks: '' };
}

function parseCasualQuantity(raw) {
    if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 && raw <= MAX_CASUAL_QUANTITY) return raw;
    if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
        const qty = Number(raw.trim());
        if (qty >= 1 && qty <= MAX_CASUAL_QUANTITY) return qty;
    }
    return null;
}

// Missing quantity defaults to 1. A present but unusable value is rejected.
export function casualShiftQuantity(shift) {
    if (!shift || typeof shift !== 'object') return null;
    const hasQuantity = Object.prototype.hasOwnProperty.call(shift, 'quantity');
    const hasHowMany = Object.prototype.hasOwnProperty.call(shift, 'howMany');
    if (!hasQuantity && !hasHowMany) return 1;
    return parseCasualQuantity(hasQuantity ? shift.quantity : shift.howMany);
}

export function casualQuantityFromInput(value, previous = 1) {
    if (value === '') return '';
    const text = String(value);
    if (!/^\d+$/.test(text)) return previous ?? 1;
    const qty = Number(text);
    if (qty < 1) return 1;
    if (qty > MAX_CASUAL_QUANTITY) return MAX_CASUAL_QUANTITY;
    return qty;
}
