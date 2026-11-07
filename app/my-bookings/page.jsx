'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authFetch, signOutUser, useSignedInUser } from '../lib/clientAuth';

export default function MyBookingsPage() {
    const router = useRouter();
    const { ready, user } = useSignedInUser();
    const [email, setEmail] = useState('');
    const [admin, setAdmin] = useState(false);
    const [bookings, setBookings] = useState([]);
    const [changes, setChanges] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!ready) return;
        if (!user) {
            router.replace('/login?next=/my-bookings');
            return;
        }
        authFetch('/api/auth/me')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    setEmail(data.email);
                    setAdmin(data.admin);
                }
            })
            .catch(() => {});
        authFetch('/api/my-bookings')
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    setError(data.error || 'Bookings could not be loaded.');
                    return;
                }
                setBookings(data.bookings || []);
                setChanges(data.changes || []);
            })
            .catch(() => setError('Bookings could not be loaded.'));
    }, [ready, user, router]);

    if (!ready || !user) {
        return <main className="min-h-screen bg-[#F9F9F9] p-12 text-sm">Checking sign-in…</main>;
    }

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans">
            <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight">My bookings</h1>
                        <Link href="/casuals" className="text-sm font-bold underline">Book casual staff</Link>
                        <p className="text-sm text-neutral-600 mt-1">{email || user.email}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => signOutUser().then(() => router.replace('/login'))}
                        className="text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-black"
                    >
                        Sign out
                    </button>
                </div>
                {admin && (
                    <div className="space-y-2">
                        <p className="text-sm">
                            <Link href="/admin/changes" className="font-bold underline">Review booking changes</Link>
                            <span> · </span>
                            <Link href="/admin/listings" className="font-bold underline">Review event listings</Link>
                        </p>
                        <p className="text-sm text-neutral-600">Booking requests are listed in the order they were received. A request stays Held until you accept one for that time. After that, the other requests for the same time are Unavailable.</p>
                    </div>
                )}
                {error && <p className="text-sm font-bold text-red-700">{error}</p>}
                {!error && bookings.length === 0 && (
                    <p className="text-sm text-neutral-600">No bookings were found for this email.</p>
                )}
                <div className="space-y-3">
                    {bookings.map(booking => {
                        const pending = changes.find(change => change.bookingId === booking.id && change.status === 'PENDING');
                        return (
                            <Link
                                key={booking.id}
                                href={`/my-bookings/${booking.id}`}
                                className="block bg-white border border-gray-200 rounded-sm p-5 hover:border-black"
                            >
                                <p className="text-xs font-bold uppercase tracking-wider">
                                    <span className={`inline-block px-2 py-0.5 rounded-sm ${booking.queueTag === 'Unavailable' ? 'bg-rose-100 text-rose-800' : booking.queueTag === 'Held' ? 'bg-[#EAD64D] text-black' : 'text-neutral-500'}`}>
                                        {booking.queueTag || booking.status}
                                    </span>
                                    {pending ? <span className="text-neutral-500"> · change waiting for review</span> : null}
                                </p>
                                <h2 className="text-xl font-black mt-1">{booking.eventName}</h2>
                                <p className="text-sm text-neutral-700 mt-1">{booking.space}</p>
                                <p className="text-sm text-neutral-700">{booking.bumpInDate} · {booking.bumpIn}–{booking.bumpOut}</p>
                                {Array.isArray(booking.tentativeHolds) && booking.tentativeHolds.length > 1 && (
                                    <div className="pt-2 space-y-1">
                                        {booking.tentativeHolds.map((hold, index) => (
                                            <p key={`${hold.bumpInDate}-${hold.bumpIn}-${index}`} className="text-xs text-neutral-700">
                                                Hold {index + 1}: {hold.bumpInDate} · {hold.bumpIn}–{hold.bumpOut} · {hold.space}
                                                <span className={`ml-2 font-bold uppercase ${booking.holdTags?.[index] === 'Unavailable' ? 'text-rose-800' : 'text-black'}`}>{booking.holdTags?.[index] || 'Held'}</span>
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
