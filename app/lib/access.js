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
