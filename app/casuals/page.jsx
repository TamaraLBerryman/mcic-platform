'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CASUAL_STAFF_LIST, MAX_CASUAL_QUANTITY, casualQuantityFromInput, casualShiftQuantity, emptyCasualShift } from '../lib/casualStaff';
import { authFetch, useSignedInUser } from '../lib/clientAuth';
import Gate from '../../components/Gate';

function CasualBookingPage() {
    const router = useRouter();
    const { ready, user } = useSignedInUser();
    const [bookings, setBookings] = useState([]);
    const [requests, setRequests] = useState([]);
    const [admin, setAdmin] = useState(false);
    const [foundersStaff, setFoundersStaff] = useState(false);
    const [bookingId, setBookingId] = useState('');
    const [wantsCasualStaff, setWantsCasualStaff] = useState('');
    const [shiftDate, setShiftDate] = useState('');
    const [purpose, setPurpose] = useState('');
    const [requesterName, setRequesterName] = useState('');
    const [shifts, setShifts] = useState([emptyCasualShift()]);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!ready) return;
        if (!user) {
            router.replace('/login?next=/casuals');
            return;
        }
        authFetch('/api/casuals')
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    setError(data.error || 'Casual bookings could not be loaded.');
                    return;
                }
                setBookings(data.bookings || []);
                setRequests(data.requests || []);
                setAdmin(Boolean(data.admin));
                setFoundersStaff(Boolean(data.foundersStaff));
            })
            .catch(() => setError('Casual bookings could not be loaded.'));
    }, [ready, user, router]);

    const selected = bookings.find(item => item.id === bookingId);

    const chooseEvent = (id) => {
        setBookingId(id);
        const booking = bookings.find(item => item.id === id);
        if (booking?.bumpInDate) setShiftDate(booking.bumpInDate);
    };

    const updateShift = (index, field, value) => {
        setShifts(current => current.map((shift, shiftIndex) => shiftIndex === index ? { ...shift, [field]: value } : shift));
    };

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const response = await authFetch('/api/casuals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId,
                    wantsCasualStaff,
                    shiftDate,
                    purpose,
                    requesterName,
                    shifts
                })
            });
            const data = await response.json();
            if (!data.success) {
                setError(data.error || 'The casual request could not be saved.');
                return;
            }
            setNotice('Sent. Casual staff are $50 per hour, with a 3-hour minimum.');
            setRequests(current => [{
                id: data.id,
                bookingId,
                eventName: selected?.eventName || '',
                space: selected?.space || purpose,
                shiftDate,
                purpose,
                shifts,
                requesterName,
                status: 'PENDING',
                createdAt: new Date().toISOString()
            }, ...current]);
            setShifts([emptyCasualShift()]);
            setWantsCasualStaff('');
        } catch {
            setError('The casual request could not be saved.');
        } finally {
            setSaving(false);
        }
    };

    if (!ready || !user) {
        return <main className="min-h-screen bg-[#F9F9F9] p-12 text-sm">Checking sign-in…</main>;
    }

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans">
            <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
                <Link href="/booking" className="text-xs font-bold uppercase tracking-wider">← Book an event space</Link>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Book casual staff</h1>
                    <p className="text-sm text-neutral-600 mt-2">Anyone can book casual staff here, or while booking an event. Link the request to your event, or leave it as no event in particular.</p>
                </div>

                <form onSubmit={submit} className="bg-white border border-gray-200 rounded-sm p-6 space-y-6">
                    <label className="block space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Link this to an event</span>
                        <select value={bookingId} onChange={(event) => chooseEvent(event.target.value)} className="w-full p-3 border border-gray-200 text-sm rounded-sm bg-white">
                            <option value="">No event in particular</option>
                            {bookings.map(booking => (
                                <option key={booking.id} value={booking.id}>
                                    {booking.eventName} — {booking.bumpInDate} — {booking.space}
                                </option>
                            ))}
                        </select>
                        {admin && <span className="text-[11px] text-neutral-500 block pt-1">You can see every booking because you are an admin.</span>}
                    </label>

                    {!bookingId && (
                        <label className="block space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Where is this, and what is it for?</span>
                            <input value={purpose} onChange={(event) => setPurpose(event.target.value)} required className="w-full p-3 border border-gray-200 text-sm rounded-sm" placeholder="e.g. MCIC reception, setup for a tour" />
                        </label>
                    )}

                    <label className="block space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Your name</span>
                        <input value={requesterName} onChange={(event) => setRequesterName(event.target.value)} required className="w-full p-3 border border-gray-200 text-sm rounded-sm" />
                    </label>

                    <label className="block space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Date</span>
                        <input type="date" value={shiftDate} onChange={(event) => setShiftDate(event.target.value)} required className="w-full p-3 border border-gray-200 text-sm rounded-sm" />
                    </label>

                    <div className="space-y-2 pt-2 border-t border-gray-100">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                            Would you like to book a casual staff member for event support?
                        </label>
                        <p className="text-[11px] text-neutral-500">
                            Casual staff members are available at $50/hr (3-hour minimum block) to assist with room setup, AV, and guest check-in.
                        </p>
                        <div className="flex gap-4 max-w-xs pt-1">
                            {['Yes', 'No'].map(choice => (
                                <button
                                    key={choice}
                                    type="button"
                                    onClick={() => setWantsCasualStaff(choice)}
                                    className={`flex-1 py-2 text-xs font-bold uppercase rounded-sm border ${wantsCasualStaff === choice ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-neutral-600'}`}
                                >
                                    {choice}
                                </button>
                            ))}
                        </div>
                    </div>

                    {wantsCasualStaff === 'Yes' && (
                        <div className="space-y-4">
                            <p className="text-[11px] font-black uppercase tracking-wider text-neutral-700">Casual staff shift details</p>
                            {shifts.map((shift, index) => (
                                <div key={index} className={`p-4 border border-gray-200 rounded-sm grid grid-cols-1 gap-3 items-end ${foundersStaff ? 'md:grid-cols-[minmax(0,1.15fr)_5.5rem_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,1.4fr)_2rem]' : 'md:grid-cols-[5.5rem_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.7fr)_2rem]'}`}>
                                    {foundersStaff && (
                                        <label className="space-y-1">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase block">Preferred staff member</span>
                                            <select value={shift.preferredStaff} onChange={(event) => updateShift(index, 'preferredStaff', event.target.value)} className="w-full p-2 border border-gray-200 text-xs rounded-sm bg-white">
                                                <option value="">No preference</option>
                                                {CASUAL_STAFF_LIST.map(name => <option key={name} value={name}>{name}</option>)}
                                            </select>
                                        </label>
                                    )}
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase block">How many</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={MAX_CASUAL_QUANTITY}
                                            step={1}
                                            inputMode="numeric"
                                            required
                                            value={shift.quantity}
                                            onChange={(event) => updateShift(index, 'quantity', casualQuantityFromInput(event.target.value, shift.quantity))}
                                            onBlur={(event) => {
                                                if (casualShiftQuantity({ quantity: event.target.value }) == null) updateShift(index, 'quantity', 1);
                                            }}
                                            className="w-full p-2 border border-gray-200 text-xs rounded-sm"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase block">Shift start</span>
                                        <input type="time" required value={shift.shiftStart} onChange={(event) => updateShift(index, 'shiftStart', event.target.value)} className="w-full p-2 border border-gray-200 text-xs rounded-sm" />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase block">Shift end</span>
                                        <input type="time" required value={shift.shiftEnd} onChange={(event) => updateShift(index, 'shiftEnd', event.target.value)} className="w-full p-2 border border-gray-200 text-xs rounded-sm" />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase block">Tasks / description</span>
                                        <input required value={shift.tasks} onChange={(event) => updateShift(index, 'tasks', event.target.value)} placeholder="e.g. Stage setup and guest check-in" className="w-full p-2 border border-gray-200 text-xs rounded-sm" />
                                    </label>
                                    <div className="text-right">
                                        <button
                                            type="button"
                                            disabled={shifts.length === 1}
                                            onClick={() => setShifts(current => current.filter((_, shiftIndex) => shiftIndex !== index))}
                                            className={`p-2 text-xs font-bold ${shifts.length === 1 ? 'text-gray-300' : 'text-red-600'}`}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => setShifts(current => [...current, emptyCasualShift()])} className="bg-black text-white font-bold text-[10px] tracking-wider px-3.5 py-2 rounded-sm">
                                + additional staffing request
                            </button>
                        </div>
                    )}

                    {error && <p className="text-sm font-bold text-red-700">{error}</p>}
                    {notice && <p className="text-sm font-bold">{notice}</p>}
                    <button type="submit" disabled={saving} className="px-4 py-3 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-sm disabled:opacity-60">
                        {saving ? 'Sending…' : 'Request casual staff'}
                    </button>
                </form>

                {requests.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-lg font-extrabold uppercase tracking-tight">Requests</h2>
                        {requests.map(item => (
                            <article key={item.id} className="bg-white border border-gray-200 rounded-sm p-4 space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{item.status}</p>
                                <h3 className="font-black">{item.eventName || item.purpose || 'No event in particular'}</h3>
                                <p className="text-sm text-neutral-700">{item.shiftDate}{item.space ? ` · ${item.space}` : ''}</p>
                                {(item.shifts || []).map((shift, index) => (
                                    <p key={index} className="text-sm text-neutral-700">{foundersStaff && shift.preferredStaff ? `${shift.preferredStaff} · ` : ''}{shift.quantity || 1} {(shift.quantity || 1) === 1 ? 'person' : 'people'} · {shift.shiftStart}–{shift.shiftEnd} · {shift.tasks}</p>
                                ))}
                            </article>
                        ))}
                    </section>
                )}
            </div>
        </main>
    );
}

export default function Page() {
    return <Gate level="founders"><CasualBookingPage /></Gate>;
}
