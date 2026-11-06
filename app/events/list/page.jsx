'use client';

import { useState } from 'react';
import Link from 'next/link';
import Gate from '../../../components/Gate';

const empty = {
    title: '',
    eventDate: '',
    eventStart: '',
    eventEnd: '',
    space: '',
    description: '',
    organizerName: '',
    organiserEmail: '',
    hostType: 'Other',
    registrationType: 'MCIC_PLATFORM',
    externalTicketUrl: ''
};

function ListEventPage() {
    const [form, setForm] = useState(empty);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const [saving, setSaving] = useState(false);

    const set = (key) => (event) => setForm(current => ({ ...current, [key]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            const response = await fetch('/api/events/listings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await response.json();
            if (!data.success) {
                setError(data.error || 'The listing could not be saved.');
                return;
            }
            setDone(true);
        } catch {
            setError('The listing could not be saved.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans">
            <div className="max-w-2xl mx-auto px-6 py-12 space-y-6">
                <Link href="/events" className="text-xs font-bold uppercase tracking-wider">← Events</Link>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">List an event</h1>
                    <p className="text-sm text-neutral-600 mt-2">Use this for an event that is not held at the MCIC. It is reviewed before it appears in the directory.</p>
                </div>
                {done ? (
                    <p className="text-sm bg-white border border-gray-200 rounded-sm p-4">Sent for review. You will be emailed when it is approved or declined. After it is listed, sign in with the same email to see who registered.</p>
                ) : (
                    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-sm p-6 space-y-4">
                        <label className="block space-y-1">
                            <span className="text-[10px] font-bold uppercase text-gray-500">Event name</span>
                            <input required value={form.title} onChange={set('title')} className="w-full p-3 border border-gray-200 text-sm rounded-sm" />
                        </label>
                        <label className="block space-y-1">
                            <span className="text-[10px] font-bold uppercase text-gray-500">Venue, not at the MCIC</span>
                            <input required value={form.space} onChange={set('space')} placeholder="Venue name and address" className="w-full p-3 border border-gray-200 text-sm rounded-sm" />
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className="space-y-1">
                                <span className="text-[10px] font-bold uppercase text-gray-500 block">Date</span>
                                <input required type="date" value={form.eventDate} onChange={set('eventDate')} className="w-full p-3 border border-gray-200 text-sm rounded-sm" />
                            </label>
                            <label className="space-y-1">
                                <span className="text-[10px] font-bold uppercase text-gray-500 block">Start</span>
                                <input required type="time" value={form.eventStart} onChange={set('eventStart')} className="w-full p-3 border border-gray-200 text-sm rounded-sm" />
                            </label>
                            <label className="space-y-1">
                                <span className="text-[10px] font-bold uppercase text-gray-500 block">End</span>
                                <input required type="time" value={form.eventEnd} onChange={set('eventEnd')} className="w-full p-3 border border-gray-200 text-sm rounded-sm" />
                            </label>
                        </div>
                        <label className="block space-y-1">
                            <span className="text-[10px] font-bold uppercase text-gray-500">Description</span>
                            <textarea required rows={4} value={form.description} onChange={set('description')} className="w-full p-3 border border-gray-200 text-sm rounded-sm" />
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="space-y-1">
                                <span className="text-[10px] font-bold uppercase text-gray-500 block">Host name</span>
                                <input required value={form.organizerName} onChange={set('organizerName')} className="w-full p-3 border border-gray-200 text-sm rounded-sm" />
                            </label>
                            <label className="space-y-1">
                                <span className="text-[10px] font-bold uppercase text-gray-500 block">Host email</span>
                                <input required type="email" value={form.organiserEmail} onChange={set('organiserEmail')} className="w-full p-3 border border-gray-200 text-sm rounded-sm" />
                            </label>
                        </div>
                        <label className="block space-y-1">
                            <span className="text-[10px] font-bold uppercase text-gray-500">Host</span>
                            <select value={form.hostType} onChange={set('hostType')} className="w-full p-3 border border-gray-200 text-sm rounded-sm bg-white">
                                <option>Other</option>
                                <option>UNSW Founders</option>
                            </select>
                        </label>
                        <label className="block space-y-1">
                            <span className="text-[10px] font-bold uppercase text-gray-500">Registration</span>
                            <select value={form.registrationType} onChange={set('registrationType')} className="w-full p-3 border border-gray-200 text-sm rounded-sm bg-white">
                                <option value="MCIC_PLATFORM">Use MCIC registration</option>
                                <option value="EXTERNAL">Tickets are on another site</option>
                            </select>
                        </label>
                        {form.registrationType === 'EXTERNAL' && (
                            <label className="block space-y-1">
                                <span className="text-[10px] font-bold uppercase text-gray-500">Ticket link</span>
                                <input required type="url" value={form.externalTicketUrl} onChange={set('externalTicketUrl')} placeholder="https://" className="w-full p-3 border border-gray-200 text-sm rounded-sm" />
                            </label>
                        )}
                        {error && <p className="text-sm font-bold text-red-700">{error}</p>}
                        <button type="submit" disabled={saving} className="px-4 py-3 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-sm disabled:opacity-60">
                            {saving ? 'Sending…' : 'Submit listing'}
                        </button>
                    </form>
                )}
            </div>
        </main>
    );
}

export default function Page() {
    return <Gate level="founders"><ListEventPage /></Gate>;
}
