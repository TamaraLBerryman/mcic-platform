export const ACCESS_GROUPS = [
    { id: 'admin', label: 'Admin' },
    { id: 'founders', label: 'Founders general staff' },
    { id: 'casual', label: 'Casual staff' }
];

export function allows(access, level) {
    if (!level || level === 'public') return true;
    if (!access?.signedIn) return false;
    if (level === 'account') return true;
    if (level === 'admin') return Boolean(access.admin);
    if (level === 'founders') return Boolean(access.founders);
    if (level === 'casual') return Boolean(access.casual);
    if (level === 'staff') return Boolean(access.staff);
    return false;
}

export const ITEM_ACCESS_OPTIONS = [
    ['account', 'Any signed-in account'],
    ['founders', 'Founders general staff'],
    ['casual', 'Casual staff'],
    ['admin', 'Admin']
];

const ITEM_ACCESS_IDS = new Set(ITEM_ACCESS_OPTIONS.map(([id]) => id));

export function itemAccessLevels(viewAccess) {
    if (Array.isArray(viewAccess)) {
        const levels = viewAccess.filter((level) => ITEM_ACCESS_IDS.has(level));
        return levels.length ? levels : ['account'];
    }
    if (viewAccess === 'staff') return ['founders', 'casual'];
    if (ITEM_ACCESS_IDS.has(viewAccess)) return [viewAccess];
    return ['account'];
}

export function canViewItem(access, viewAccess) {
    return itemAccessLevels(viewAccess).some((level) => allows(access, level));
}

export function itemAccessLabel(viewAccess) {
    const labels = Object.fromEntries(ITEM_ACCESS_OPTIONS);
    return itemAccessLevels(viewAccess).map((level) => labels[level]).join(', ');
}

export function accessFromMember(email, group, envAdmin) {
    const admin = Boolean(envAdmin) || group === 'admin';
    const founders = admin || group === 'founders';
    const casual = admin || group === 'casual';
    return {
        signedIn: true,
        email: String(email || '').toLowerCase(),
        group: admin ? 'admin' : (group || 'other'),
        admin,
        founders,
        casual,
        staff: founders || casual
    };
}
