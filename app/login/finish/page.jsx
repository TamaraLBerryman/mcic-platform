'use client';

import Link from 'next/link';

export default function FinishLoginPage() {
    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans">
            <div className="max-w-lg mx-auto px-6 py-16 space-y-4">
                <h1 className="text-3xl font-extrabold tracking-tight">Sign in with your password</h1>
                <p className="text-sm text-neutral-600 leading-relaxed">
                    Email sign-in links are no longer used. Sign in with your email and password.
                </p>
                <Link href="/login" className="inline-block bg-black text-white text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-sm">
                    Go to sign in
                </Link>
            </div>
        </main>
    );
}
