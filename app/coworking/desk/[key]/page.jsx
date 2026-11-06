'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HotDeskPage({ params }) {
    const key = params?.key || '';
    const [desk, setDesk] = useState(null);
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);

    const load = () => {
        fetch(`/api/desks/check-in?key=${encodeURIComponent(key)}`)
            .then((response) => response.json())
            .then((data) => {
                if (!data.success) {
                    setError(data.error || 'This hot desk could not be found.');
                    setDesk(null);
                    return;
                }
                setError('');
                setDesk(data);
            })
            .catch(() => setError('This hot desk could not be loaded.'));
    };

    useEffect(() => {
        if (key) load();
    }, [key]);

    const checkIn = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            const response = await fetch('/api/desks/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, action: 'in', name })
            });
            const data = await response.json();
            if (!data.success) {
                setError(data.error || 'Check-in could not be saved.');
                if (data.occupied) load();
                return;
            }
            setName('');
            setDesk(data);
        } catch (err) {
            setError('Check-in could not be saved.');
        } finally {
            setBusy(false);
        }
    };

    const checkOut = async () => {
        setBusy(true);
        setError('');
        try {
            const response = await fetch('/api/desks/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, action: 'out' })
            });
            const data = await response.json();
            if (!data.success) {
                setError(data.error || 'Check-out could not be saved.');
                return;
            }
            setDesk({ ...desk, ...data, occupied: false, occupantName: '' });
        } catch (err) {
            setError('Check-out could not be saved.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans">
            <div className="max-w-md mx-auto px-6 py-12 space-y-6">
                <Link href="/coworking" className="text-xs font-bold uppercase tracking-wider">← Coworking</Link>
                <h1 className="text-3xl font-extrabold tracking-tight">{desk?.label || 'Hot desk'}</h1>
                <p className="text-sm text-neutral-600">Check in while you are at this desk. Check out when you leave, or it becomes available again at midnight.</p>
                {error && <p className="text-sm font-bold text-red-700">{error}</p>}
                {!desk && !error && <p className="text-sm text-neutral-500">Loading desk…</p>}
                {desk?.occupied && (
                    <section className="bg-white border border-neutral-200 rounded-sm p-6 space-y-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#B39300]">Occupied</p>
                        <p className="text-2xl font-black">{desk.occupantName}</p>
                        <button type="button" disabled={busy} onClick={checkOut} className="w-full bg-black text-[#EAD64D] font-bold text-xs uppercase py-3 rounded-xs disabled:opacity-50">
                            Check out
                        </button>
                    </section>
                )}
                {desk && !desk.occupied && (
                    <form onSubmit={checkIn} className="bg-white border border-neutral-200 rounded-sm p-6 space-y-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Available</p>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 space-y-1">
                            Your name
                            <input required value={name} onChange={(event) => setName(event.target.value)} className="w-full p-3 border border-gray-300 text-sm rounded-xs" />
                        </label>
                        <button type="submit" disabled={busy} className="w-full bg-black text-[#EAD64D] font-bold text-xs uppercase py-3 rounded-xs disabled:opacity-50">
                            Check in
                        </button>
                    </form>
                )}
            </div>
        </main>
    );
}
