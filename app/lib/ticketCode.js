export function createTicketCode() {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    return `MCIC-${hex}`;
}

export function extractTicketCode(value) {
    const text = String(value || '').trim().toUpperCase();
    const match = text.match(/MCIC-[A-F0-9]{8}/);
    return match ? match[0] : text;
}
