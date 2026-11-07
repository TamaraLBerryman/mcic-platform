'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { pageIsHidden } from '../app/lib/sitePages';

const SitePagesContext = createContext({ hiddenPages: [], ready: false });

export function SitePagesProvider({ children }) {
    const [hiddenPages, setHiddenPages] = useState([]);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = () => {
            fetch('/api/site')
                .then((response) => response.json())
                .then((data) => {
                    if (!cancelled && data.success) setHiddenPages(Array.isArray(data.hiddenPages) ? data.hiddenPages : []);
                })
                .catch(() => {})
                .finally(() => {
                    if (!cancelled) setReady(true);
                });
        };
        load();
        window.addEventListener('mcic-site-settings', load);
        return () => {
            cancelled = true;
            window.removeEventListener('mcic-site-settings', load);
        };
    }, []);

    return (
        <SitePagesContext.Provider value={{ hiddenPages, ready }}>
            {children}
        </SitePagesContext.Provider>
    );
}

export function useHiddenPages() {
    return useContext(SitePagesContext);
}

export function PublishedBody({ children }) {
    const pathname = usePathname();
    const { hiddenPages, ready } = useHiddenPages();
    if (ready && pageIsHidden(pathname, hiddenPages)) {
        return (
            <main className="min-h-[50vh] flex items-center justify-center p-8">
                <p className="text-sm font-bold">This page is hidden.</p>
            </main>
        );
    }
    return children;
}
