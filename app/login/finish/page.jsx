'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeMagicLink, linkIsSignIn, rememberSignInEmail, safeNextPath, savedSignInEmail } from '../../lib/clientAuth';

export default function FinishLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [needsEmail, setNeedsEmail] = useState(false);
    const [error, setError] = useState('');
    const [working, setWorking] = useState(true);

    useEffect(() => {
        const url = window.location.href;
        if (!linkIsSignIn(url)) {
            setWorking(false);
            setError('This page needs the sign-in link from your email.');
            return;
        }
        const stored = savedSignInEmail();
        if (!stored) {
            setNeedsEmail(true);
            setWorking(false);
            return;
        }
        complete(url, stored);
    }, []);

    const complete = async (url, address) => {
        setWorking(true);
        setError('');
        try {
            await completeMagicLink(url, address);
            const next = safeNextPath(window.sessionStorage.getItem('mcicNextPath'));
            window.sessionStorage.removeItem('mcicNextPath');
            router.replace(next);
        } catch (err) {
            setWorking(false);
            setError(err?.message || 'The sign-in link could not be used. Request a new one.');
        }
    };

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans">
            <div className="max-w-lg mx-auto px-6 py-16 space-y-4">
                <h1 className="text-3xl font-extrabold tracking-tight">Finishing sign-in</h1>
                {working && <p className="text-sm text-neutral-600">Checking your link…</p>}
                {error && <p className="text-sm font-bold text-red-700">{error}</p>}
                {needsEmail && (
                    <form
                        className="bg-white border border-gray-200 rounded-sm p-6 space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            rememberSignInEmail(email);
                            complete(window.location.href, email);
                        }}
                    >
                        <p className="text-sm text-neutral-600">Enter the same email address the link was sent to.</p>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full p-3 border border-gray-200 text-sm rounded-sm outline-none focus:border-black"
                        />
                        <button type="submit" className="w-full bg-black text-white text-xs font-bold uppercase tracking-wider py-3 rounded-sm">
                            Continue
                        </button>
                    </form>
                )}
            </div>
        </main>
    );
}
