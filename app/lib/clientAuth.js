'use client';

import { useEffect, useState } from 'react';
import {
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { app } from './firebaseApp';

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

export async function signInWithPassword(email, password) {
    const credential = await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
    return credential.user;
}

export async function createAccountWithPassword(email, password) {
    const credential = await createUserWithEmailAndPassword(firebaseAuth(), email.trim(), password);
    return credential.user;
}

export async function sendPasswordReset(email) {
    await sendPasswordResetEmail(firebaseAuth(), email.trim());
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
