'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authFetch, useSignedInUser } from '../../lib/clientAuth';
import Gate from '../../../components/Gate';

function ListingReviewPage() {
    const router = useRouter();
    const { ready, user } = useSignedInUser();
    const [listings, setListings] = useState([]);
    const [error, setError] = useState('');
    const [savingId, setSavingId] = useState('');

    const load = () => {
        authFetch('/api/events/listings')
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    setError(data.error || 'Listings could not be loaded.');
                    return;
                }
                setListings(data.listings || []);
            })
            .catch(() => setError('Listings could not be loaded.'));
    };

    useEffect(() => {
        if (!ready) return;
        if (!user) {
            router.replace('/login?next=/admin/listings');
            return;
        }
        load();
    }, [ready, user, router]);

    const decide = async (id, decision) => {
        setSavingId(id);
        setError('');
        try {
            const response = await authFetch('/api/events/listings/decision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, decision })
            });
            const data = await response.json();
            if (!data.success) {
                setError(data.error || 'The decision could not be saved.');
                return;
            }
            setListings(current => current.map(item => item.id === id ? { ...item, status: decision } : item));
        } catch {
            setError('The decision could not be saved.');
        } finally {
            setSavingId('');
        }
    };

    if (!ready || !user) {
        return <main className="min-h-screen bg-[#F9F9F9] p-12 text-sm">Checking sign-in…</main>;
    }

    const pending = listings.filter(item => item.status === 'PENDING');

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans">
            <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
                <Link href="/my-bookings" className="text-xs font-bold uppercase tracking-wider">← My bookings</Link>
                <h1 className="text-3xl font-extrabold tracking-tight">Event listings</h1>
                <p className="text-sm text-neutral-600">These are events submitted for the directory that are not held at the MCIC.</p>
                {error && <p className="text-sm font-bold text-red-700">{error}</p>}
                {pending.length === 0 && !error && <p className="text-sm text-neutral-600">No listings are waiting.</p>}
                {pending.map(listing => (
                    <section key={listing.id} className="bg-white border border-gray-200 rounded-sm p-6 space-y-2">
                        <h2 className="text-xl font-black">{listing.title}</h2>
                        <p className="text-sm text-neutral-700">{listing.space}</p>
                        <p className="text-sm text-neutral-700">{listing.eventDate} · {listing.eventStart}–{listing.eventEnd}</p>
                        <p className="text-sm text-neutral-700">{listing.organizerName} · {listing.organiserEmail}</p>
                        <p className="text-sm text-neutral-600">{listing.description}</p>
                        <p className="text-xs uppercase tracking-wider text-neutral-500">{listing.eventType === 'OFFSITE_FOUNDERS' ? 'UNSW Founders' : 'Other host'} · {listing.registrationType === 'EXTERNAL' ? 'External tickets' : 'MCIC registration'}</p>
                        <div className="flex gap-3 pt-2">
                            <button type="button" disabled={savingId === listing.id} onClick={() => decide(listing.id, 'APPROVED')} className="px-4 py-3 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-sm">Approve</button>
                            <button type="button" disabled={savingId === listing.id} onClick={() => decide(listing.id, 'DECLINED')} className="px-4 py-3 border border-gray-300 text-xs font-bold uppercase tracking-wider rounded-sm">Decline</button>
                        </div>
                    </section>
                ))}
            </div>
        </main>
    );
}

export default function Page() {
    return <Gate level="admin"><ListingReviewPage /></Gate>;
}
