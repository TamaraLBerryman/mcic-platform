'use client';

import { useState } from 'react';
import { authFetch, createAccountWithPassword, signInWithPassword } from '../app/lib/clientAuth';
import AffiliationFields, { EMPTY_AFFILIATION, affiliationError } from './AffiliationFields';

function passwordError(error, creating) {
    const code = error?.code || '';
    if (code === 'auth/operation-not-allowed') {
        return 'Email and password sign-in is not turned on for this Firebase project yet. In Firebase Authentication, enable the Email/Password provider.';
    }
    if (code === 'auth/email-already-in-use') {
        return 'That email already has an account. Sign in instead.';
    }
    if (code === 'auth/weak-password') {
        return 'Use a password of at least 6 characters.';
    }
    if (code === 'auth/invalid-email') {
        return 'Enter a valid email address.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        return creating
            ? 'That account could not be created.'
            : 'That email or password is not correct.';
    }
    if (code === 'auth/too-many-requests') {
        return 'Too many attempts. Wait a moment and try again.';
    }
    return error?.message || (creating ? 'The account could not be created.' : 'Sign-in did not work.');
}

export default function SignInPanel({ onSuccess, onClose }) {
    const [mode, setMode] = useState('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [working, setWorking] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [affiliation, setAffiliation] = useState(EMPTY_AFFILIATION);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const creating = mode === 'create';

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        if (creating && password !== confirmPassword) {
            setError('The two passwords do not match.');
            return;
        }
        if (creating) {
            if (!name.trim()) {
                setError('Enter your full name.');
                return;
            }
            if (!phone.trim()) {
                setError('Enter your mobile phone.');
                return;
            }
            const affiliationProblem = affiliationError(affiliation);
            if (affiliationProblem) {
                setError(affiliationProblem);
                return;
            }
        }
        setWorking(true);
        try {
            if (creating) {
                try {
                    await createAccountWithPassword(email, password);
                } catch (err) {
                    if (err?.code !== 'auth/email-already-in-use') throw err;
                    await signInWithPassword(email, password);
                }
                const response = await authFetch('/api/auth/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...affiliation, name, phone })
                });
                const saved = await response.json();
                if (!saved.success) throw new Error(saved.error || 'Affiliation could not be saved.');
            } else {
                await signInWithPassword(email, password);
            }
            onSuccess();
        } catch (err) {
            setError(passwordError(err, creating));
        } finally {
            setWorking(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-sm shadow-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <h2 id="signin-title" className="text-2xl font-extrabold tracking-tight">{creating ? 'Create an account' : 'Sign in'}</h2>
                {onClose && (
                    <button type="button" onClick={onClose} className="text-xs font-black uppercase tracking-wider text-neutral-500 hover:text-black" aria-label="Close sign in">
                        Close
                    </button>
                )}
            </div>
            <form onSubmit={submit} className="space-y-4">
                <label className="block space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Email</span>
                    <input
                        type="email"
                        required
                        autoFocus
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="name@unsw.edu.au"
                        className="w-full p-3 border border-gray-200 text-sm rounded-sm outline-none focus:border-black"
                    />
                </label>
                <div className="block space-y-1">
                    <label htmlFor="signin-password" className="text-xs font-bold uppercase tracking-wider text-gray-500">Password</label>
                    <div className="relative">
                        <input
                            id="signin-password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            autoComplete={creating ? 'new-password' : 'current-password'}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="w-full p-3 pr-16 border border-gray-200 text-sm rounded-sm outline-none focus:border-black"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((visible) => !visible)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-black"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>
                </div>
                {creating && (
                    <label className="block space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Confirm password</span>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            className="w-full p-3 border border-gray-200 text-sm rounded-sm outline-none focus:border-black"
                        />
                    </label>
                )}
                {creating && (
                    <>
                        <label className="block space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Full name</span>
                            <input
                                type="text"
                                required
                                autoComplete="name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="e.g. Jane Doe"
                                className="w-full p-3 border border-gray-200 text-sm rounded-sm outline-none focus:border-black"
                            />
                        </label>
                        <label className="block space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Mobile phone</span>
                            <input
                                type="tel"
                                required
                                autoComplete="tel"
                                value={phone}
                                onChange={(event) => setPhone(event.target.value)}
                                placeholder="e.g. 0400 000 000"
                                className="w-full p-3 border border-gray-200 text-sm rounded-sm outline-none focus:border-black"
                            />
                        </label>
                    </>
                )}
                {creating && <AffiliationFields value={affiliation} onChange={setAffiliation} />}
                {error && <p className="text-sm font-bold text-red-700">{error}</p>}
                <button
                    type="submit"
                    disabled={working}
                    className="w-full bg-black text-white text-xs font-bold uppercase tracking-wider py-3 rounded-sm disabled:opacity-60"
                >
                    {working ? 'Please wait…' : (creating ? 'Create account' : 'Sign in')}
                </button>
            </form>
            <button
                type="button"
                onClick={() => {
                    setMode(creating ? 'signin' : 'create');
                    setError('');
                    setPassword('');
                    setConfirmPassword('');
                }}
                className="text-sm font-bold underline decoration-2 decoration-[#EAD64D] underline-offset-4"
            >
                {creating ? 'Already have an account? Sign in' : 'Need an account? Create one'}
            </button>
        </div>
    );
}
