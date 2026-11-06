'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetch, useSignedInUser } from '../../lib/clientAuth';
import Gate from '../../../components/Gate';

function ChangeReview() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedId = searchParams.get('id');
    const { ready, user } = useSignedInUser();
    const [changes, setChanges] = useState([]);
    const [error, setError] = useState('');
    const [savingId, setSavingId] = useState('');

    const load = () => {
        authFetch('/api/bookings/changes')
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    setError(data.error || 'Changes could not be loaded.');
                    return;
                }
                setChanges(data.changes || []);
            })
            .catch(() => setError('Changes could not be loaded.'));
    };

    useEffect(() => {
        if (!ready) return;
        if (!user) {
            const next = selectedId ? `/admin/changes?id=${selectedId}` : '/admin/changes';
            router.replace(`/login?next=${encodeURIComponent(next)}`);
            return;
        }
        authFetch('/api/auth/me')
            .then(response => response.json())
            .then(data => {
                if (!data.admin) {
                    setError('This page is for Founders admins. Sign in with an admin email.');
                    return;
                }
                load();
            })
            .catch(() => setError('Sign-in could not be checked.'));
    }, [ready, user, router, selectedId]);

    const decide = async (id, decision) => {
        setSavingId(id);
        setError('');
        try {
            const response = await authFetch('/api/bookings/changes/decision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, decision })
            });
            const data = await response.json();
            if (!data.success) {
                setError(data.error || 'The decision could not be saved.');
                return;
            }
            if (data.calendarError) setError(data.calendarError);
            load();
        } catch (err) {
            setError('The decision could not be saved.');
        } finally {
            setSavingId('');
        }
    };

    if (!ready || !user) {
        return <main className="min-h-screen bg-[#F9F9F9] p-12 text-sm">Checking sign-in…</main>;
    }

    const visible = selectedId ? changes.filter(change => change.id === selectedId) : changes.filter(change => change.status === 'PENDING');

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans">
            <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
                <h1 className="text-3xl font-extrabold tracking-tight">Booking changes</h1>
                <p className="text-sm text-neutral-600">Approving a change updates the booking. Approving a cancellation removes the calendar hold. Approving “REMOVE_TENTATIVE_HOLDS” deletes those holds. Declining it keeps them and restarts the one-week and two-week reminders. The original quote is not recalculated.</p>
                {error && <p className="text-sm font-bold text-red-700">{error}</p>}
                {visible.length === 0 && !error && <p className="text-sm text-neutral-600">No changes are waiting.</p>}
                {visible.map(change => (
                    <section key={change.id} className="bg-white border border-gray-200 rounded-sm p-6 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">{change.status} · {change.type}</p>
                        <h2 className="text-xl font-black">{change.before?.eventName || 'Booking'}</h2>
                        <p className="text-sm text-neutral-700">{change.requesterName} · {change.requesterEmail}</p>
                        <p className="text-sm text-neutral-700">Note: {change.message}</p>
                        <p className="text-sm">Current: {change.before?.bumpInDate} {change.before?.bumpIn}–{change.before?.bumpOut}, {change.before?.space}</p>
                        {change.requested && (
                            <p className="text-sm">Requested: {change.requested.eventName}, {change.requested.bumpInDate} {change.requested.bumpIn}–{change.requested.bumpOut}, {change.requested.space}</p>
                        )}
                        {change.calendarError && <p className="text-sm font-bold text-amber-800">{change.calendarError}</p>}
                        {change.status === 'PENDING' && (
                            <div className="flex gap-3 pt-2">
                                <button type="button" disabled={savingId === change.id} onClick={() => decide(change.id, 'APPROVED')} className="px-4 py-3 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-sm">
                                    {change.type === 'REMOVE_TENTATIVE_HOLDS' ? 'Approve removal' : 'Approve'}
                                </button>
                                <button type="button" disabled={savingId === change.id} onClick={() => decide(change.id, 'DECLINED')} className="px-4 py-3 border border-gray-300 text-xs font-bold uppercase tracking-wider rounded-sm">
                                    {change.type === 'REMOVE_TENTATIVE_HOLDS' ? 'Keep holds' : 'Decline'}
                                </button>
                            </div>
                        )}
                    </section>
                ))}
            </div>
        </main>
    );
}

export default function ChangesPage() {
    return (
        <Gate level="admin">
            <Suspense fallback={<main className="min-h-screen bg-[#F9F9F9] p-12 text-sm">Loading changes…</main>}>
                <ChangeReview />
            </Suspense>
        </Gate>
    );
}
