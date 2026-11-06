'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authFetch } from '../../../lib/clientAuth';
import Gate from '../../../../components/Gate';

function eventLine(times) {
    if (!times) return '';
    const running = times.eventStart && times.eventEnd ? `${times.eventStart}–${times.eventEnd}` : '';
    const bump = [times.bumpIn ? `bump in ${times.bumpIn}` : '', times.bumpOut ? `bump out ${times.bumpOut}` : ''].filter(Boolean).join(', ');
    if (running && bump) return `Event ${running} · ${bump}`;
    return running ? `Event ${running}` : bump;
}

function CasualAvailabilityPage() {
    const [name, setName] = useState('');
    const [shifts, setShifts] = useState([]);
    const [message, setMessage] = useState('Loading shifts…');
    const [busyKey, setBusyKey] = useState('');

    const load = async () => {
        const response = await authFetch('/api/casuals/availability');
        const data = await response.json();
        if (!data.success) {
            setMessage(data.error || 'This link is not valid.');
            setShifts([]);
            return;
        }
        setName(data.name || '');
        setShifts(data.shifts || []);
        setMessage('');
    };

    useEffect(() => {
        load().catch(() => setMessage('The shifts could not be loaded.'));
    }, []);

    const choose = async (shift, available) => {
        setBusyKey(shift.shiftKey);
        setMessage('');
        const response = await authFetch('/api/casuals/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shiftKey: shift.shiftKey, available })
        });
        const data = await response.json();
        if (!data.success) {
            setMessage(data.error || 'That answer could not be saved.');
            setBusyKey('');
            return;
        }
        await load().catch(() => setMessage('Saved, but the list could not be refreshed.'));
        setBusyKey('');
    };

    return (
        <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">MCIC casual shifts</p>
                <h1 className="text-2xl font-black uppercase">{name ? `Hi ${name}` : 'Shifts'}</h1>
                <p className="text-sm text-gray-600">Mark whether you can do each shift. You can change an answer until you are booked.</p>
                <Link href="/casuals/hours" className="text-xs font-bold underline">Rostered shifts and hours</Link>
            </div>
            {message && <p className="text-sm text-gray-700">{message}</p>}
            {!message && shifts.length === 0 && (
                <p className="text-sm text-gray-500 border border-dashed border-gray-300 p-6 text-center">No shifts are waiting for an answer.</p>
            )}
            <div className="space-y-3">
                {shifts.map((shift) => (
                    <article key={shift.shiftKey} className="border border-gray-200 bg-white p-4 rounded-sm space-y-2 text-sm">
                        <p className="font-black uppercase">{shift.date || 'No date'} · {shift.start && shift.end ? `${shift.start}–${shift.end}` : 'No times'}</p>
                        <p className="font-bold">{shift.event}{shift.place ? ` · ${shift.place}` : ''}</p>
                        {eventLine(shift.times) && <p>{eventLine(shift.times)}</p>}
                        {shift.tasks && <p className="text-gray-600">{shift.tasks}</p>}
                        {shift.who && <p className="text-gray-500">Organiser: {shift.who}</p>}
                        {shift.booked ? (
                            <p className="inline-block text-[10px] font-black uppercase tracking-wider bg-[#EAD64D] text-black px-2 py-1">You are booked on this shift</p>
                        ) : shift.filled ? (
                            <p className="text-xs font-bold uppercase text-gray-500">This shift is filled</p>
                        ) : (
                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    disabled={busyKey === shift.shiftKey}
                                    onClick={() => choose(shift, true)}
                                    className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-sm cursor-pointer ${shift.answered && shift.available ? 'bg-black text-[#EAD64D]' : 'bg-white border border-gray-300'}`}
                                >
                                    I can do this
                                </button>
                                <button
                                    type="button"
                                    disabled={busyKey === shift.shiftKey}
                                    onClick={() => choose(shift, false)}
                                    className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-sm cursor-pointer ${shift.answered && shift.available === false ? 'bg-black text-white' : 'bg-white border border-gray-300'}`}
                                >
                                    I can&apos;t
                                </button>
                            </div>
                        )}
                    </article>
                ))}
            </div>
        </main>
    );
}

export default function Page() {
    return <Gate level="casual"><CasualAvailabilityPage /></Gate>;
}
