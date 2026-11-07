'use client';

import { useState } from 'react';
import { createAccountWithPassword, sendPasswordReset, signInWithPassword } from '../app/lib/clientAuth';

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
    const [notice, setNotice] = useState('');
    const [working, setWorking] = useState(false);
    const creating = mode === 'create';

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        setNotice('');
        if (creating && password !== confirmPassword) {
            setError('The two passwords do not match.');
            return;
        }
        setWorking(true);
        try {
            if (creating) await createAccountWithPassword(email, password);
            else await signInWithPassword(email, password);
            onSuccess();
        } catch (err) {
            setError(passwordError(err, creating));
        } finally {
            setWorking(false);
        }
    };

    const resetPassword = async () => {
        setError('');
        setNotice('');
        if (!email.trim()) {
            setError('Enter your email, then choose Set a password.');
            return;
        }
        setWorking(true);
        try {
            await sendPasswordReset(email);
            setNotice(`Check ${email.trim()} for an email from Firebase. Open it to choose a password, then sign in here.`);
        } catch (err) {
            const code = err?.code || '';
            setError(code === 'auth/user-not-found'
                ? 'That email does not have an account yet. Choose Create one and use the admin email.'
                : passwordError(err, false));
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
            {creating && (
                <p className="text-sm text-neutral-600 leading-relaxed">
                    Choose an email and password. Founders and casual staff should use the email an admin has added for them, so the right access is applied.
                </p>
            )}
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
                <label className="block space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Password</span>
                    <input
                        type="password"
                        required
                        minLength={6}
                        autoComplete={creating ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full p-3 border border-gray-200 text-sm rounded-sm outline-none focus:border-black"
                    />
                </label>
                {creating && (
                    <label className="block space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Confirm password</span>
                        <input
                            type="password"
                            required
                            minLength={6}
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            className="w-full p-3 border border-gray-200 text-sm rounded-sm outline-none focus:border-black"
                        />
                    </label>
                )}
                {error && <p className="text-sm font-bold text-red-700">{error}</p>}
                {notice && <p className="text-sm font-bold text-neutral-800">{notice}</p>}
                <button
                    type="submit"
                    disabled={working}
                    className="w-full bg-black text-white text-xs font-bold uppercase tracking-wider py-3 rounded-sm disabled:opacity-60"
                >
                    {working ? 'Please wait…' : (creating ? 'Create account' : 'Sign in')}
                </button>
                {!creating && (
                    <button
                        type="button"
                        disabled={working}
                        onClick={resetPassword}
                        className="w-full text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-black"
                    >
                        Set a password
                    </button>
                )}
            </form>
            <button
                type="button"
                onClick={() => {
                    setMode(creating ? 'signin' : 'create');
                    setError('');
                    setNotice('');
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
