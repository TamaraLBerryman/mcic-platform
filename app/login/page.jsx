'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { safeNextPath, sendMagicLink } from '../lib/clientAuth';

function LoginForm() {
    const searchParams = useSearchParams();
    const next = safeNextPath(searchParams.get('next'));
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        setSending(true);
        try {
            window.sessionStorage.setItem('mcicNextPath', next);
            await sendMagicLink(email);
            setSent(true);
        } catch (err) {
            const code = err?.code || '';
            setError(code === 'auth/operation-not-allowed'
                ? 'Email link sign-in is not turned on for this Firebase project yet. Enable Email link (passwordless sign-in) in Firebase Authentication, and allow this site under Authorized domains.'
                : (err?.message || 'The sign-in email could not be sent.'));
        } finally {
            setSending(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans">
            <div className="max-w-lg mx-auto px-6 py-16 space-y-6">
                <h1 className="text-3xl font-extrabold tracking-tight">Sign in</h1>
                <p className="text-sm text-neutral-600 leading-relaxed">
                    Enter your email and we will send a sign-in link. There is no password. Anyone can create an account this way. Founders and casual staff use the email an admin has added for them.
                </p>
                {sent ? (
                    <p className="text-sm font-bold bg-white border border-gray-200 rounded-sm p-4">
                        Check {email} for the sign-in link. Open it on this device.
                    </p>
                ) : (
                    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-sm p-6 space-y-4">
                        <label className="block space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Email</span>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="name@unsw.edu.au"
                                className="w-full p-3 border border-gray-200 text-sm rounded-sm outline-none focus:border-black"
                            />
                        </label>
                        {error && <p className="text-sm font-bold text-red-700">{error}</p>}
                        <button
                            type="submit"
                            disabled={sending}
                            className="w-full bg-black text-white text-xs font-bold uppercase tracking-wider py-3 rounded-sm disabled:opacity-60"
                        >
                            {sending ? 'Sending…' : 'Email me a sign-in link'}
                        </button>
                    </form>
                )}
            </div>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-[#F9F9F9] p-12 text-sm">Loading sign-in…</main>}>
            <LoginForm />
        </Suspense>
    );
}
