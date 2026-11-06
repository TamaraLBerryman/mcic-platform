'use client';

import { useEffect, useState } from 'react';
import {
    getAuth,
    isSignInWithEmailLink,
    onAuthStateChanged,
    sendSignInLinkToEmail,
    signInWithEmailLink,
    signOut
} from 'firebase/auth';
import { app } from './firebase';

const EMAIL_KEY = 'mcicEmailForSignIn';

export function firebaseAuth() {
    return getAuth(app);
}

export function watchAuth(callback) {
    return onAuthStateChanged(firebaseAuth(), callback);
}

export function useSignedInUser() {
    const [state, setState] = useState({ ready: false, user: null });
    useEffect(() => {
        let settled = false;
        const timer = setTimeout(() => {
            if (!settled) setState({ ready: true, user: null });
        }, 2500);
        let stop = () => {};
        try {
            stop = watchAuth((user) => {
                settled = true;
                setState({ ready: true, user });
            });
        } catch (error) {
            settled = true;
            setState({ ready: true, user: null });
        }
        return () => {
            clearTimeout(timer);
            stop();
        };
    }, []);
    return state;
}

export async function sendMagicLink(email) {
    const cleaned = email.trim();
    await sendSignInLinkToEmail(firebaseAuth(), cleaned, {
        url: `${window.location.origin}/login/finish`,
        handleCodeInApp: true
    });
    window.localStorage.setItem(EMAIL_KEY, cleaned);
}

export function savedSignInEmail() {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(EMAIL_KEY) || '';
}

export function rememberSignInEmail(email) {
    window.localStorage.setItem(EMAIL_KEY, email.trim());
}

export function linkIsSignIn(url) {
    return isSignInWithEmailLink(firebaseAuth(), url);
}

export async function completeMagicLink(url, email) {
    const credential = await signInWithEmailLink(firebaseAuth(), email.trim(), url);
    window.localStorage.removeItem(EMAIL_KEY);
    return credential.user;
}

export async function authFetch(url, options = {}) {
    const user = firebaseAuth().currentUser;
    const token = user ? await user.getIdToken() : '';
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...options, headers });
}

export function signOutUser() {
    return signOut(firebaseAuth());
}

export function safeNextPath(value) {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/my-bookings';
    return value;
}
