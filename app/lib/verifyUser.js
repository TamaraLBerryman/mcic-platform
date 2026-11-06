export function adminEmails() {
    const raw = process.env.ADMIN_EMAILS || process.env.MCIC_COORDINATOR_EMAIL || 'mcic@unsw.edu.au';
    return raw.split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
}

export function isAdminEmail(email) {
    return adminEmails().includes(String(email || '').trim().toLowerCase());
}

export async function hasAdminAccess(email) {
    if (isAdminEmail(email)) return true;
    const { memberGroup } = await import('./accessStore');
    return (await memberGroup(email)) === 'admin';
}

export async function hasFoundersAccess(email) {
    if (await hasAdminAccess(email)) return true;
    const { memberGroup } = await import('./accessStore');
    return (await memberGroup(email)) === 'founders';
}

export async function hasStaffAccess(email) {
    if (await hasFoundersAccess(email)) return true;
    const { memberGroup } = await import('./accessStore');
    return (await memberGroup(email)) === 'casual';
}

export async function emailFromRequest(request) {
    const header = request.headers.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
        const error = new Error('Sign in to continue.');
        error.status = 401;
        throw error;
    }

    const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token })
    });
    const data = await response.json().catch(() => ({}));
    const email = data.users?.[0]?.email;
    if (!response.ok || !email) {
        const error = new Error(data.error?.message || 'Sign-in could not be verified.');
        error.status = 401;
        throw error;
    }
    return String(email).toLowerCase();
}
