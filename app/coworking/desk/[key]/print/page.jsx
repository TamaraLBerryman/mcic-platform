'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HotDeskPrintPage({ params }) {
    const key = params?.key || '';
    const [label, setLabel] = useState('Hot desk');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!key) return;
        fetch(`/api/desks/check-in?key=${encodeURIComponent(key)}`)
            .then((response) => response.json())
            .then((data) => {
                if (!data.success) {
                    setError(data.error || 'That hot desk could not be found.');
                    return;
                }
                setLabel(data.label || 'Hot desk');
            })
            .catch(() => setError('That hot desk could not be loaded.'));
    }, [key]);

    return (
        <main className="min-h-screen bg-white text-black font-sans">
            <div className="max-w-sm mx-auto px-6 py-12 text-center space-y-6">
                <Link href="/admin" className="text-xs font-bold uppercase tracking-wider print:hidden">← Admin</Link>
                <h1 className="text-3xl font-extrabold tracking-tight">{label}</h1>
                <p className="text-sm">Scan to check in or check out. The desk is available again at midnight.</p>
                {error ? (
                    <p className="text-sm font-bold text-red-700">{error}</p>
                ) : (
                    <img
                        src={`/api/desks/qr?key=${encodeURIComponent(key)}`}
                        alt={`QR code for ${label}`}
                        className="mx-auto w-72 h-72"
                    />
                )}
                <button type="button" onClick={() => window.print()} className="print:hidden bg-black text-[#EAD64D] font-bold text-xs uppercase px-6 py-3 rounded-xs">
                    Print
                </button>
            </div>
        </main>
    );
}
