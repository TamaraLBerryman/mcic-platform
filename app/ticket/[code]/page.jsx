"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TicketPage({ params }) {
    const [ticket, setTicket] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const code = params?.code;
        if (!code) return;
        fetch(`/api/registrations?code=${encodeURIComponent(code)}`)
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    setError(data.error || 'Ticket not found.');
                    return;
                }
                setTicket(data.registration);
            })
            .catch(() => setError('Ticket could not be loaded.'));
    }, [params]);

    const answers = ticket?.answers || {};
    const name = [answers.firstName, answers.lastName].filter(Boolean).join(' ');

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans">
            <div className="max-w-md mx-auto px-6 py-12 space-y-6">
                <Link href="/events" className="text-xs font-bold uppercase tracking-wider">← Events</Link>
                <h1 className="text-3xl font-extrabold tracking-tight">Your ticket</h1>
                {error && <p className="text-sm font-bold text-red-700">{error}</p>}
                {!ticket && !error && <p className="text-sm text-neutral-500">Loading ticket…</p>}
                {ticket && (ticket.status === 'PENDING_REVIEW' || ticket.status === 'DENIED') && (
                    <section className="bg-white border border-neutral-200 rounded-sm p-6 space-y-2">
                        <p className="text-sm font-bold">{ticket.status === 'DENIED' ? 'This registration was not confirmed.' : 'This registration is being reviewed.'}</p>
                        <p className="text-xs text-neutral-600">{ticket.eventTitle}</p>
                    </section>
                )}
                {ticket && ticket.status !== 'PENDING_REVIEW' && ticket.status !== 'DENIED' && (
                    <section className="bg-white border border-neutral-200 rounded-sm p-6 space-y-4 text-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#B39300]">{ticket.eventTitle}</p>
                        <h2 className="text-2xl font-black">{name}</h2>
                        <p className="text-sm text-neutral-600">{[ticket.eventDate, ticket.eventStart && ticket.eventEnd ? `${ticket.eventStart}–${ticket.eventEnd}` : ''].filter(Boolean).join(' · ')}</p>
                        {ticket.qrDataUrl && (
                            <img src={ticket.qrDataUrl} alt={`QR code for ${ticket.ticketCode}`} className="mx-auto w-56 h-56 bg-white" />
                        )}
                        <p className="font-mono font-bold tracking-wider">{ticket.ticketCode}</p>
                        <p className={`text-xs font-bold uppercase tracking-wider ${ticket.status === 'ATTENDED' ? 'text-emerald-700' : 'text-neutral-500'}`}>
                            {ticket.status === 'ATTENDED' ? `Checked in ${new Date(ticket.attendedAt).toLocaleString('en-AU')}` : 'Not checked in yet'}
                        </p>
                    </section>
                )}
            </div>
        </main>
    );
}
