"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { extractTicketCode } from '../../../lib/ticketCode';
import { authFetch } from '../../../lib/clientAuth';
import { useAccess } from '../../../../components/useAccess';

function guestName(registration) {
    const answers = registration.answers || {};
    return [answers.firstName, answers.lastName].filter(Boolean).join(' ') || 'Guest';
}

export default function DoorCheckInPage({ params }) {
    const slug = params?.slug || '';
    const router = useRouter();
    const { ready, access } = useAccess();
    const [registrations, setRegistrations] = useState([]);
    const [queryText, setQueryText] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [scanning, setScanning] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const scannerRef = useRef(null);
    const lastCodeRef = useRef('');

    const loadGuests = () => {
        if (!slug) return;
        authFetch(`/api/registrations?eventSlug=${encodeURIComponent(slug)}`)
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    setError(data.error || 'Guest list could not be loaded.');
                    return;
                }
                setRegistrations(data.registrations || []);
            })
            .catch(() => setError('Guest list could not be loaded.'));
    };

    const checkInRef = useRef(null);

    useEffect(() => {
        if (!ready) return;
        if (!access.signedIn) {
            router.replace(`/login?next=${encodeURIComponent(`/events/${slug}/door`)}`);
            return;
        }
        loadGuests();
    }, [slug, ready, access.signedIn]);

    const checkIn = async ({ id, ticketCode }) => {
        setError('');
        const response = await authFetch('/api/registrations/check-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ticketCode, eventSlug: slug })
        });
        const data = await response.json();
        if (!data.success) {
            setNotice('');
            setError(data.error || 'Check-in failed.');
            return;
        }
        const name = guestName(data.registration);
        setNotice(data.alreadyAttended ? `${name} was already checked in.` : `${name} is checked in.`);
        setRegistrations(prev => prev.map(item => item.id === data.registration.id ? { ...item, ...data.registration } : item));
    };

    checkInRef.current = checkIn;

    useEffect(() => {
        if (!scanning) return undefined;
        let stopped = false;
        let scanner;

        (async () => {
            try {
                const { Html5Qrcode } = await import('html5-qrcode');
                if (stopped) return;
                scanner = new Html5Qrcode('door-qr-reader');
                scannerRef.current = scanner;
                await scanner.start(
                    { facingMode: 'environment' },
                    { fps: 8, qrbox: { width: 220, height: 220 } },
                    async (decoded) => {
                        const code = extractTicketCode(decoded);
                        if (!code || lastCodeRef.current === code) return;
                        lastCodeRef.current = code;
                        await checkInRef.current?.({ ticketCode: code });
                        setTimeout(() => {
                            if (lastCodeRef.current === code) lastCodeRef.current = '';
                        }, 2500);
                    }
                );
            } catch (err) {
                if (!stopped) {
                    setScanning(false);
                    setError(err?.message || 'The camera could not be started. Search by name instead.');
                }
            }
        })();

        return () => {
            stopped = true;
            const active = scanner || scannerRef.current;
            active?.stop().catch(() => {});
            scannerRef.current = null;
        };
    }, [scanning]);

    const matches = useMemo(() => {
        const needle = queryText.trim().toLowerCase();
        if (!needle) return registrations;
        return registrations.filter(item => {
            const answers = item.answers || {};
            const haystack = [
                answers.firstName,
                answers.lastName,
                `${answers.firstName || ''} ${answers.lastName || ''}`,
                answers.email,
                answers.zid,
                item.ticketCode
            ].join(' ').toLowerCase();
            return haystack.includes(needle);
        });
    }, [registrations, queryText]);

    const attended = registrations.filter(item => item.status === 'ATTENDED').length;

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <Link href={`/events/${slug}`} className="text-xs font-bold uppercase tracking-wider">← Event</Link>
                        <h1 className="text-3xl font-extrabold tracking-tight mt-2">Door check-in</h1>
                        <p className="text-sm text-neutral-600 mt-1">{attended} of {registrations.length} checked in</p>
                    </div>
                </div>

                {error && <p className="text-sm font-bold text-red-700">{error}</p>}
                {notice && <p className="text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-sm px-3 py-2">{notice}</p>}

                <section className="bg-white border border-neutral-200 rounded-sm p-4 space-y-3">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">Search name, email, or zID</label>
                    <input
                        value={queryText}
                        onChange={(event) => setQueryText(event.target.value)}
                        placeholder="Jane Doe"
                        className="w-full p-3 border border-neutral-300 text-sm rounded-sm outline-none focus:border-black"
                    />
                </section>

                <section className="bg-neutral-900 text-white rounded-sm p-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                        {!scanning ? (
                            <button type="button" onClick={() => { setError(''); setScanning(true); }} className="px-4 py-3 bg-[#EAD64D] text-black text-xs font-black uppercase tracking-wider rounded-sm">
                                Scan QR code
                            </button>
                        ) : (
                            <button type="button" onClick={() => setScanning(false)} className="px-4 py-3 bg-white text-black text-xs font-black uppercase tracking-wider rounded-sm">
                                Stop camera
                            </button>
                        )}
                    </div>
                    <div id="door-qr-reader" className={`overflow-hidden rounded-sm bg-black ${scanning ? 'min-h-[240px]' : 'hidden'}`} />
                    <form
                        className="flex gap-2"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (!manualCode.trim()) return;
                            checkIn({ ticketCode: manualCode });
                            setManualCode('');
                        }}
                    >
                        <input
                            value={manualCode}
                            onChange={(event) => setManualCode(event.target.value)}
                            placeholder="Or type the ticket code"
                            className="flex-1 p-3 bg-neutral-950 border border-neutral-700 text-sm rounded-sm outline-none"
                        />
                        <button type="submit" className="px-4 py-3 border border-neutral-600 text-xs font-bold uppercase tracking-wider rounded-sm">
                            Check in
                        </button>
                    </form>
                </section>

                <section className="space-y-2">
                    {matches.length === 0 && <p className="text-sm text-neutral-500">No matching registrations.</p>}
                    {matches.map(item => {
                        const answers = item.answers || {};
                        const checkedIn = item.status === 'ATTENDED';
                        return (
                            <article key={item.id} className="bg-white border border-neutral-200 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="space-y-1">
                                    <h2 className="text-lg font-black">{guestName(item)}</h2>
                                    <p className="text-xs text-neutral-600">{answers.email} {answers.zid ? `· ${answers.zid}` : ''}</p>
                                    <p className="text-[11px] text-neutral-500">
                                        {[
                                            (answers.affiliations || []).join(', '),
                                            (answers.dietary || []).filter(diet => diet !== 'None').join(', '),
                                            answers.accessibilityNeeds
                                        ].filter(Boolean).join(' · ')}
                                    </p>
                                    <p className="font-mono text-[11px] text-neutral-400">{item.ticketCode}</p>
                                </div>
                                {checkedIn ? (
                                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                                        Attended {item.attendedAt ? new Date(item.attendedAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => checkIn({ id: item.id })}
                                        className="px-4 py-3 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-sm"
                                    >
                                        Mark attended
                                    </button>
                                )}
                            </article>
                        );
                    })}
                </section>
            </div>
        </main>
    );
}
