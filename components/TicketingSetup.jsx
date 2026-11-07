'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authFetch } from '../app/lib/clientAuth';

const labelClass = 'text-xs text-neutral-800';

export default function TicketingSetup() {
    const params = useSearchParams();
    const bookingId = params.get('id') || '';
    const [booking, setBooking] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [postToPublicDirectory, setPostToPublicDirectory] = useState(false);
    const [method, setMethod] = useState('');
    const [externalTicketUrl, setExternalTicketUrl] = useState('');
    const [ticketBannerName, setTicketBannerName] = useState('');
    const [maxTicketCapacity, setMaxTicketCapacity] = useState('');
    const [ticketTiers, setTicketTiers] = useState([
        { name: 'UNSW Affiliated (Students & Staff)', cap: '' },
        { name: 'General Public / External Guest', cap: '' }
    ]);

    useEffect(() => {
        if (!bookingId) return undefined;
        let cancelled = false;
        authFetch(`/api/bookings?id=${encodeURIComponent(bookingId)}`)
            .then(response => response.json())
            .then(data => {
                if (cancelled) return;
                if (!data.success) {
                    setError(data.error || 'This booking could not be opened.');
                    return;
                }
                setBooking(data.booking);
            })
            .catch(() => {
                if (!cancelled) setError('This booking could not be opened.');
            });
        return () => {
            cancelled = true;
        };
    }, [bookingId]);

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            const response = await authFetch('/api/bookings/ticketing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId,
                    postToPublicDirectory,
                    method,
                    externalTicketUrl,
                    ticketBannerName,
                    maxTicketCapacity,
                    ticketTiers
                })
            });
            const data = await response.json();
            if (!data.success) {
                setError(data.error || 'Ticketing could not be saved.');
                return;
            }
            setSaved(true);
        } catch {
            setError('Ticketing could not be saved.');
        } finally {
            setSaving(false);
        }
    };

    if (!bookingId) {
        return <p className="p-8 text-xs text-neutral-700">Open ticketing from a submitted booking.</p>;
    }

    return (
        <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-6">
            <h1 className="text-lg font-extrabold uppercase tracking-tight text-black">Ticketing & Public Directory</h1>
            <p className="text-xs text-neutral-600">Your booking request is saved. Set up guest registration here, or skip it and add it later.</p>
            {booking && <p className="text-xs text-neutral-800">{booking.eventName || 'Untitled booking'}</p>}
            {error && <p className="text-xs text-red-700">{error}</p>}
            {saved && <p className="text-xs text-neutral-800">Ticketing saved.</p>}

            <label className="flex items-start gap-2 cursor-pointer select-none">
                <input type="checkbox" className="w-4 h-4 accent-black rounded-sm mt-0.5" checked={postToPublicDirectory} onChange={(e) => setPostToPublicDirectory(e.target.checked)} />
                <span className={labelClass}>Post this event to the public directory</span>
            </label>

            <div className="space-y-2">
                <p className={labelClass}>How will guests register for your event?</p>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" className="w-4 h-4 accent-black rounded-sm" checked={method === 'external'} onChange={() => setMethod('external')} />
                    <span className={labelClass}>External registration portal (Eventbrite, Humanitix, Luma, etc.)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" className="w-4 h-4 accent-black rounded-sm" checked={method === 'internal'} onChange={() => setMethod('internal')} />
                    <span className={labelClass}>Internal registration portal</span>
                </label>
            </div>

            {method === 'external' && (
                <label className="block space-y-1">
                    <span className={labelClass}>External registration URL</span>
                    <input
                        type="url"
                        value={externalTicketUrl}
                        onChange={(e) => setExternalTicketUrl(e.target.value)}
                        placeholder="https://eventbrite.com/e/your-event-id"
                        className="w-full p-2.5 border border-gray-200 text-xs text-black rounded-sm outline-none focus:border-black"
                    />
                </label>
            )}

            {method === 'internal' && (
                <div className="space-y-3">
                    <label className="block space-y-1">
                        <span className={labelClass}>Banner / display title</span>
                        <input
                            type="text"
                            value={ticketBannerName}
                            onChange={(e) => setTicketBannerName(e.target.value)}
                            className="w-full p-2.5 border border-gray-200 text-xs text-black rounded-sm outline-none focus:border-black"
                        />
                    </label>
                    <label className="block space-y-1">
                        <span className={labelClass}>Maximum ticket cap</span>
                        <input
                            type="number"
                            min="0"
                            value={maxTicketCapacity}
                            onChange={(e) => setMaxTicketCapacity(e.target.value)}
                            className="w-full p-2.5 border border-gray-200 text-xs text-black rounded-sm outline-none focus:border-black"
                        />
                    </label>
                    {ticketTiers.map((tier, index) => (
                        <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block space-y-1">
                                <span className={labelClass}>Tier name</span>
                                <input
                                    type="text"
                                    value={tier.name}
                                    onChange={(e) => setTicketTiers(prev => prev.map((item, i) => i === index ? { ...item, name: e.target.value } : item))}
                                    className="w-full p-2.5 border border-gray-200 text-xs text-black rounded-sm outline-none focus:border-black"
                                />
                            </label>
                            <label className="block space-y-1">
                                <span className={labelClass}>Tier capacity</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={tier.cap}
                                    onChange={(e) => setTicketTiers(prev => prev.map((item, i) => i === index ? { ...item, cap: e.target.value } : item))}
                                    className="w-full p-2.5 border border-gray-200 text-xs text-black rounded-sm outline-none focus:border-black"
                                />
                            </label>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap gap-4 items-center">
                <button type="button" onClick={save} disabled={saving} className="bg-black text-white text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-sm disabled:bg-neutral-400">
                    {saving ? 'Saving…' : 'Save ticketing'}
                </button>
                <Link href="/my-bookings" className="text-xs text-neutral-800 underline">Skip for now</Link>
            </div>
        </div>
    );
}
