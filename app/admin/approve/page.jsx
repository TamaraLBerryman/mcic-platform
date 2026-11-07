"use client";

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetch, useSignedInUser } from '../../lib/clientAuth';
import Gate from '../../../components/Gate';

function ApproveBooking() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const { ready, user } = useSignedInUser();
    const [booking, setBooking] = useState(null);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!ready) return;
        if (!id) {
            setError('This approval link is missing a booking id.');
            return;
        }
        if (!user) {
            router.replace(`/login?next=${encodeURIComponent(`/admin/approve?id=${id}`)}`);
            return;
        }
        authFetch(`/api/bookings?id=${encodeURIComponent(id)}`)
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    setError(data.error || 'Booking could not be loaded.');
                    return;
                }
                setBooking(data.booking);
                setStatus(data.booking.status || 'PENDING');
            })
            .catch(() => setError('Booking could not be loaded.'));
    }, [id, ready, user, router]);

    const decide = async (decision) => {
        setSaving(true);
        setError('');
        try {
            const response = await authFetch('/api/bookings/decision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, decision })
            });
            const data = await response.json();
            if (!data.success) {
                setError(data.error || 'The decision could not be saved.');
                return;
            }
            setStatus(decision);
        } catch (err) {
            setError('The decision could not be saved.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans">
            <div className="max-w-2xl mx-auto px-6 py-12 space-y-6">
                <h1 className="text-3xl font-extrabold tracking-tight">Booking approval</h1>
                {error && <p className="text-sm font-bold text-red-700">{error}</p>}
                {!booking && !error && <p className="text-sm text-neutral-500">Loading booking…</p>}
                {booking && (
                    <section className="bg-white border border-gray-200 rounded-sm p-6 space-y-4">
                        <p className="text-xs font-bold uppercase tracking-wider">
                            <span className={`inline-block px-2 py-0.5 rounded-sm ${booking.queueTag === 'Unavailable' ? 'bg-rose-100 text-rose-800' : booking.queueTag === 'Held' ? 'bg-[#EAD64D] text-black' : 'text-neutral-500'}`}>
                                {booking.queueTag || status}
                            </span>
                        </p>
                        <h2 className="text-xl font-black">{booking.eventName}</h2>
                        <p className="text-sm text-neutral-700">{booking.space}</p>
                        <p className="text-sm text-neutral-700">{booking.bumpInDate} · {booking.bumpIn} – {booking.bumpOut}</p>
                        {Array.isArray(booking.tentativeHolds) && booking.tentativeHolds.length > 1 && (
                            <div className="text-sm text-neutral-700 space-y-1">
                                <p className="font-bold">Holds</p>
                                {booking.tentativeHolds.map((hold, index) => (
                                    <p key={hold.id || index}>
                                        Hold {index + 1}: {hold.bumpInDate} · {hold.bumpIn}–{hold.bumpOut} · {hold.space}
                                        <span className={`ml-2 font-bold uppercase ${booking.holdTags?.[index] === 'Unavailable' ? 'text-rose-800' : 'text-black'}`}>{booking.holdTags?.[index] || 'Held'}</span>
                                    </p>
                                ))}
                            </div>
                        )}
                        {(booking.queueTag === 'Unavailable' || (booking.holdTags || []).includes('Unavailable')) && (
                            <p className="text-sm font-bold text-rose-800">Another booking was already accepted for this time, so this request is unavailable.</p>
                        )}
                        {['weekly', 'fortnightly', 'monthly'].includes(booking.recurrence?.pattern) && (
                            <div className="text-sm text-neutral-700 space-y-1">
                                <p className="font-bold">Repeats {booking.recurrence.pattern === 'weekly' && Number(booking.recurrence.interval) > 1 ? `every ${booking.recurrence.interval} weeks` : booking.recurrence.pattern}</p>
                                <p>Booked dates: {(booking.recurrence.bookedDates || []).join(', ') || 'None confirmed'}</p>
                                {(booking.recurrence.skippedDates || []).length > 0 && (
                                    <p>Left out: {booking.recurrence.skippedDates.map(item => item.date).join(', ')}</p>
                                )}
                                {(booking.recurrence.unconfirmedDates || []).length > 0 && (
                                    <p>Not held because availability could not be checked: {booking.recurrence.unconfirmedDates.join(', ')}</p>
                                )}
                            </div>
                        )}
                        {booking.calendarError && (
                            <p className="text-sm font-bold text-amber-800">{booking.calendarError}</p>
                        )}
                        <p className="text-sm text-neutral-700">{booking.mainContact?.name} · {booking.mainContact?.email}</p>
                        <p className="text-sm text-neutral-600">{booking.eventDescription}</p>
                        <p className="text-sm font-bold">Quote ${Number(booking.quoteSummary?.totalDue || booking.quoteSummary?.total || 0).toFixed(2)}</p>
                        {booking.publicEventSlug && (
                            <Link href={`/events/${booking.publicEventSlug}/guests`} className="inline-block text-sm font-bold underline">
                                View who registered and who is checked in
                            </Link>
                        )}
                        {booking.postToPublicDirectory && (
                            <p className="text-xs text-neutral-600">This request asked to be listed on the public directory. It appears there only after approval.</p>
                        )}
                        {status === 'PENDING' && (
                            <div className="flex gap-3 pt-2">
                                <button type="button" disabled={saving || booking.queueTag === 'Unavailable' || (booking.holdTags || []).includes('Unavailable')} onClick={() => decide('APPROVED')} className="px-4 py-3 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-sm disabled:opacity-40">
                                    Approve
                                </button>
                                <button type="button" disabled={saving} onClick={() => decide('DECLINED')} className="px-4 py-3 border border-gray-300 text-xs font-bold uppercase tracking-wider rounded-sm">
                                    Decline
                                </button>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </main>
    );
}

export default function ApprovePage() {
    return (
        <Gate level="admin">
            <Suspense fallback={<main className="min-h-screen bg-[#F9F9F9] p-12 text-sm">Loading approval…</main>}>
                <ApproveBooking />
            </Suspense>
        </Gate>
    );
}
