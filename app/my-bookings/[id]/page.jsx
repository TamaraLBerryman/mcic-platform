'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authFetch, useSignedInUser } from '../../lib/clientAuth';
import { BOOKABLE_SPACES, isSiteVenue, sydneyTodayString } from '../../lib/bookingRules';

const emptyRequest = {
    eventName: '',
    space: BOOKABLE_SPACES[0],
    bumpInDate: '',
    bumpIn: '',
    eventStart: '',
    eventEnd: '',
    bumpOut: '',
    message: ''
};

export default function BookingChangePage({ params }) {
    const router = useRouter();
    const { ready, user } = useSignedInUser();
    const [booking, setBooking] = useState(null);
    const [changes, setChanges] = useState([]);
    const [form, setForm] = useState(emptyRequest);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [saving, setSaving] = useState(false);
    const [rating, setRating] = useState(0);
    const [feedbackNote, setFeedbackNote] = useState('');
    const [feedbackError, setFeedbackError] = useState('');
    const [feedbackSaving, setFeedbackSaving] = useState(false);

    useEffect(() => {
        if (!ready) return;
        if (!user) {
            router.replace(`/login?next=/my-bookings/${params.id}`);
            return;
        }
        authFetch(`/api/bookings?id=${encodeURIComponent(params.id)}`)
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    setError(data.error || 'Booking could not be loaded.');
                    return;
                }
                setBooking(data.booking);
                setForm(current => ({
                    ...current,
                    eventName: data.booking.eventName || '',
                    space: data.booking.space || BOOKABLE_SPACES[0],
                    bumpInDate: data.booking.bumpInDate || '',
                    bumpIn: data.booking.bumpIn || '',
                    eventStart: data.booking.eventStart || data.booking.bumpIn || '',
                    eventEnd: data.booking.eventEnd || data.booking.bumpOut || '',
                    bumpOut: data.booking.bumpOut || ''
                }));
            })
            .catch(() => setError('Booking could not be loaded.'));
        authFetch('/api/bookings/changes')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    setChanges((data.changes || []).filter(change => change.bookingId === params.id));
                }
            })
            .catch(() => {});
    }, [ready, user, params.id, router]);

    const sendFeedback = async (event) => {
        event.preventDefault();
        setFeedbackSaving(true);
        setFeedbackError('');
        try {
            const response = await authFetch('/api/bookings/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: params.id, rating, comment: feedbackNote })
            });
            const data = await response.json();
            if (!data.success) {
                setFeedbackError(data.error || 'Feedback could not be saved.');
                return;
            }
            setBooking(current => current ? { ...current, venueFeedback: data.feedback } : current);
        } catch {
            setFeedbackError('Feedback could not be saved.');
        } finally {
            setFeedbackSaving(false);
        }
    };

    const pending = changes.find(change => change.status === 'PENDING');
    const canRateVenue = booking
        && booking.status === 'APPROVED'
        && isSiteVenue(booking.space)
        && booking.bumpInDate
        && booking.bumpInDate < sydneyTodayString();
    const closed = booking && ['DECLINED', 'CANCELLED'].includes(booking.status);

    const submit = async (type) => {
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const response = await authFetch('/api/bookings/changes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, bookingId: params.id, type })
            });
            const data = await response.json();
            if (!data.success) {
                setError(data.error || 'The request could not be saved.');
                return;
            }
            setNotice(data.emailSent
                ? 'Sent for review. The booking stays as it is until an admin approves it.'
                : `Sent for review. The booking stays as it is until an admin approves it. Email could not be sent: ${data.emailError}`);
            setChanges(current => [{ id: data.changeId, bookingId: params.id, type, status: 'PENDING', message: form.message, before: {}, requested: form }, ...current]);
        } catch (err) {
            setError('The request could not be saved.');
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
                <Link href="/my-bookings" className="text-xs font-bold uppercase tracking-wider">← My bookings</Link>
                {error && <p className="text-sm font-bold text-red-700">{error}</p>}
                {!booking && !error && <p className="text-sm text-neutral-500">Loading booking…</p>}
                {booking && (
                    <>
                        <section className="bg-white border border-gray-200 rounded-sm p-6 space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider">
                                <span className={`inline-block px-2 py-0.5 rounded-sm ${booking.queueTag === 'Unavailable' ? 'bg-rose-100 text-rose-800' : booking.queueTag === 'Held' ? 'bg-[#EAD64D] text-black' : 'text-neutral-500'}`}>
                                    {booking.queueTag || booking.status}
                                </span>
                            </p>
                            <h1 className="text-3xl font-extrabold tracking-tight">{booking.eventName}</h1>
                            <p className="text-sm text-neutral-700">{booking.space}</p>
                            <p className="text-sm text-neutral-700">{booking.bumpInDate} · bump-in {booking.bumpIn} · event {booking.eventStart}–{booking.eventEnd} · bump-out {booking.bumpOut}</p>
                            {Array.isArray(booking.tentativeHolds) && booking.tentativeHolds.length > 1 && (
                                <div className="text-sm text-neutral-700 space-y-1 pt-2">
                                    <p className="font-bold">Tentative holds</p>
                                    {booking.tentativeHolds.map((hold, index) => (
                                        <p key={hold.id || index}>
                                            Hold {index + 1}: {hold.bumpInDate} · {hold.bumpIn}–{hold.bumpOut} · {hold.space}
                                            {booking.holdTags?.[index] ? <span className="ml-2 font-bold uppercase">{booking.holdTags[index]}</span> : null}
                                        </p>
                                    ))}
                                    <p className="text-neutral-600">After one week you will be asked to confirm one date. After two weeks the holds are sent to an admin to remove, unless the admin keeps them.</p>
                                </div>
                            )}
                            {booking.publicEventSlug && (
                                <Link href={`/events/${booking.publicEventSlug}/guests`} className="inline-block text-sm font-bold underline pt-2">
                                    View who registered and who is checked in
                                </Link>
                            )}
                            {['weekly', 'fortnightly', 'monthly'].includes(booking.recurrence?.pattern) && (
                                <p className="text-sm text-neutral-600">This is a repeating booking. An approved update keeps the new date only. The other dates in the series are released.</p>
                            )}
                        </section>

                        {pending && (
                            <p className="text-sm font-bold bg-amber-50 border border-amber-200 rounded-sm p-4">
                                A {pending.type === 'CANCEL' ? 'cancellation' : 'change'} is waiting for review. The booking has not been changed.
                            </p>
                        )}
                        {notice && <p className="text-sm font-bold bg-white border border-gray-200 rounded-sm p-4">{notice}</p>}

                        {!pending && !closed && (
                            <form
                                className="bg-white border border-gray-200 rounded-sm p-6 space-y-4"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    submit('UPDATE');
                                }}
                            >
                                <h2 className="text-lg font-extrabold uppercase tracking-tight">Request a change</h2>
                                <p className="text-sm text-neutral-600">Nothing moves on the calendar until an admin approves it. You will be emailed when they decide.</p>
                                <label className="block space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-gray-500">Event name</span>
                                    <input value={form.eventName} onChange={(event) => setForm({ ...form, eventName: event.target.value })} className="w-full p-3 border border-gray-200 text-sm rounded-sm" required />
                                </label>
                                <label className="block space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-gray-500">Space</span>
                                    <select value={form.space} onChange={(event) => setForm({ ...form, space: event.target.value })} className="w-full p-3 border border-gray-200 text-sm rounded-sm bg-white">
                                        {BOOKABLE_SPACES.map(space => <option key={space} value={space}>{space}</option>)}
                                    </select>
                                </label>
                                <label className="block space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-gray-500">Date</span>
                                    <input type="date" value={form.bumpInDate} onChange={(event) => setForm({ ...form, bumpInDate: event.target.value })} className="w-full p-3 border border-gray-200 text-sm rounded-sm" required />
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        ['bumpIn', 'Bump-in'],
                                        ['eventStart', 'Start'],
                                        ['eventEnd', 'End'],
                                        ['bumpOut', 'Bump-out']
                                    ].map(([key, label]) => (
                                        <label key={key} className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase text-gray-500 block">{label}</span>
                                            <input type="time" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="w-full p-2 border border-gray-200 text-sm rounded-sm" required />
                                        </label>
                                    ))}
                                </div>
                                <label className="block space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-gray-500">Note for the reviewer</span>
                                    <textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} rows={3} required className="w-full p-3 border border-gray-200 text-sm rounded-sm" />
                                </label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button type="submit" disabled={saving} className="px-4 py-3 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-sm disabled:opacity-60">
                                        {saving ? 'Sending…' : 'Request this change'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={saving || !form.message.trim()}
                                        onClick={() => submit('CANCEL')}
                                        className="px-4 py-3 border border-gray-300 text-xs font-bold uppercase tracking-wider rounded-sm disabled:opacity-60"
                                    >
                                        Request cancellation
                                    </button>
                                </div>
                            </form>
                        )}
                        {closed && <p className="text-sm text-neutral-600">This booking is {booking.status.toLowerCase()} and can no longer be changed.</p>}

                        {canRateVenue && (
                            <section id="venue-feedback" className="bg-white border border-gray-200 rounded-sm p-6 space-y-4">
                                <h2 className="text-lg font-extrabold uppercase tracking-tight">Venue feedback</h2>
                                {booking.venueFeedback?.submittedAt ? (
                                    <div className="text-sm text-neutral-700 space-y-2">
                                        <p>Thank you. You rated this venue {booking.venueFeedback.rating} out of 5.</p>
                                        {booking.venueFeedback.comment && <p>{booking.venueFeedback.comment}</p>}
                                    </div>
                                ) : (
                                    <form className="space-y-4" onSubmit={sendFeedback}>
                                        <p className="text-sm text-neutral-600">This event was held in a venue booked through MCIC. Rate the experience and leave any comments.</p>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map(score => (
                                                <button
                                                    key={score}
                                                    type="button"
                                                    onClick={() => setRating(score)}
                                                    className={`w-10 h-10 border rounded-sm text-sm font-bold ${rating === score ? 'bg-black text-white border-black' : 'border-gray-300'}`}
                                                >
                                                    {score}
                                                </button>
                                            ))}
                                        </div>
                                        <label className="block space-y-1">
                                            <span className="text-[10px] font-bold uppercase text-gray-500">Comments</span>
                                            <textarea value={feedbackNote} onChange={(event) => setFeedbackNote(event.target.value)} rows={4} className="w-full p-3 border border-gray-200 text-sm rounded-sm" />
                                        </label>
                                        {feedbackError && <p className="text-sm font-bold text-red-700">{feedbackError}</p>}
                                        <button type="submit" disabled={feedbackSaving || rating < 1} className="px-4 py-3 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-sm disabled:opacity-60">
                                            {feedbackSaving ? 'Sending…' : 'Send feedback'}
                                        </button>
                                    </form>
                                )}
                            </section>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
