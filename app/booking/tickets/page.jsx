import { Suspense } from 'react';
import TicketingSetup from '@/components/TicketingSetup';

export default function TicketingPage() {
    return (
        <Suspense fallback={<p className="p-8 text-xs text-neutral-700">Loading ticketing…</p>}>
            <TicketingSetup />
        </Suspense>
    );
}
