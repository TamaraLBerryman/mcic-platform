'use client';

import { useEffect, useState } from 'react';
import { authFetch, useSignedInUser } from '../app/lib/clientAuth';

const signedOut = {
    signedIn: false,
    email: '',
    group: 'public',
    admin: false,
    founders: false,
    casual: false,
    staff: false,
    userType: '',
    departmentType: '',
    department: '',
    unswDivision: '',
    companyName: '',
    name: '',
    phone: ''
};
const STORAGE_KEY = 'mcicAccess';

function cachedAccess(email) {
    if (typeof window === 'undefined') return null;
    try {
        const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
        if (parsed?.signedIn && parsed.email === String(email || '').toLowerCase()) return parsed;
    } catch {
        return null;
    }
    return null;
}

export function useAccess() {
    const { ready, user } = useSignedInUser();
    const [access, setAccess] = useState(null);

    useEffect(() => {
        if (!ready) return undefined;
        if (!user) {
            window.sessionStorage.removeItem(STORAGE_KEY);
            setAccess(signedOut);
            return undefined;
        }
        const cached = cachedAccess(user.email);
        if (cached) setAccess(cached);
        let cancelled = false;
        authFetch('/api/auth/me')
            .then((response) => response.json())
            .then((data) => {
                if (cancelled) return;
                const next = data.success ? { ...signedOut, ...data, signedIn: true } : signedOut;
                if (next.signedIn) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                setAccess(next);
            })
            .catch(() => {
                if (!cancelled && !cached) setAccess(signedOut);
            });
        return () => {
            cancelled = true;
        };
    }, [ready, user]);

    return { ready: ready && access !== null, access: access || signedOut };
}
