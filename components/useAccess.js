'use client';

import { useEffect, useState } from 'react';
import { authFetch, useSignedInUser } from '../app/lib/clientAuth';

const signedOut = { signedIn: false, email: '', group: 'public', admin: false, founders: false, casual: false, staff: false };

export function useAccess() {
    const { ready, user } = useSignedInUser();
    const [access, setAccess] = useState(null);

    useEffect(() => {
        if (!ready) return undefined;
        if (!user) {
            setAccess(signedOut);
            return undefined;
        }
        let cancelled = false;
        authFetch('/api/auth/me')
            .then((response) => response.json())
            .then((data) => {
                if (cancelled) return;
                setAccess(data.success ? { ...signedOut, ...data, signedIn: true } : signedOut);
            })
            .catch(() => {
                if (!cancelled) setAccess(signedOut);
            });
        return () => {
            cancelled = true;
        };
    }, [ready, user]);

    return { ready: ready && access !== null, access: access || signedOut };
}
