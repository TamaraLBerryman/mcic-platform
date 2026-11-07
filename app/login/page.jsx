'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SignInPanel from '../../components/SignInPanel';
import { safeNextPath } from '../lib/clientAuth';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = safeNextPath(searchParams.get('next'));

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans">
            <div className="max-w-lg mx-auto px-6 py-16">
                {(next.startsWith('/inventory') || next.startsWith('/borrow')) && (
                    <p className="text-sm font-medium mb-4">Log in or create an account to see inventory.</p>
                )}
                <SignInPanel onSuccess={() => router.replace(next)} />
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
