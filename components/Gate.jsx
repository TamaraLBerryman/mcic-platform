'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { allows } from '../app/lib/access';
import { useAccess } from './useAccess';

export default function Gate({ level, children }) {
    const router = useRouter();
    const pathname = usePathname();
    const { ready, access } = useAccess();

    useEffect(() => {
        if (!ready || access.signedIn || allows(access, level)) return;
        router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`);
    }, [ready, access, level, pathname, router]);

    if (!ready || (!access.signedIn && level !== 'public')) {
        return <main className="min-h-screen bg-[#F9F9F9] p-12 text-sm">Checking sign-in…</main>;
    }
    if (!allows(access, level)) {
        return (
            <main className="min-h-screen bg-[#F9F9F9] p-12">
                <p className="text-sm font-bold">You do not have access to this page.</p>
            </main>
        );
    }
    return children;
}
