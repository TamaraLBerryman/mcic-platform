"use client";

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { firebaseAuth } from '../lib/clientAuth';
import { useAccess } from '../../components/useAccess';

const BookingForm = dynamic(() => import('@/components/BookingForm'), {
    loading: () => <p className="text-sm text-neutral-500">Loading the booking form…</p>
});


function VirtualTour() {
    const { access } = useAccess();
    const fileRef = useRef(null);
    const [tourVideoUrl, setTourVideoUrl] = useState('');
    const [tourVideoPath, setTourVideoPath] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        let cancelled = false;
        fetch('/api/site')
            .then((response) => response.json())
            .then((data) => {
                if (cancelled || !data.success) return;
                setTourVideoUrl(data.tourVideoUrl || '');
                setTourVideoPath(data.tourVideoPath || '');
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    const saveTour = async (url, path) => {
        const user = firebaseAuth().currentUser;
        if (!user) throw new Error('Sign in with an admin email to change the tour video.');
        const token = await user.getIdToken();
        const response = await fetch('/api/site', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ tourVideoUrl: url, tourVideoPath: path })
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'The tour video could not be saved.');
        setTourVideoUrl(data.tourVideoUrl || '');
        setTourVideoPath(data.tourVideoPath || '');
    };

    const uploadTour = async (file) => {
        if (!file) return;
        if (!file.type.startsWith('video/')) {
            setMessage('Choose a video file.');
            return;
        }
        setBusy(true);
        setMessage('');
        const previousPath = tourVideoPath;
        try {
            const safeName = file.name.replace(/[^\w.-]+/g, '-');
            const path = `site/virtual-tour/${Date.now()}-${safeName}`;
            const stored = ref(storage, path);
            await uploadBytes(stored, file);
            const url = await getDownloadURL(stored);
            await saveTour(url, path);
            if (previousPath && previousPath !== path) {
                deleteObject(ref(storage, previousPath)).catch(() => {});
            }
        } catch (error) {
            setMessage(error.message || 'The tour video could not be uploaded.');
        } finally {
            setBusy(false);
        }
    };

    const deleteTour = async () => {
        if (!tourVideoUrl) return;
        if (!window.confirm('Remove the virtual tour video?')) return;
        setBusy(true);
        setMessage('');
        try {
            if (tourVideoPath) await deleteObject(ref(storage, tourVideoPath)).catch(() => {});
            await saveTour('', '');
        } catch (error) {
            setMessage(error.message || 'The tour video could not be removed.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="md:col-span-5 bg-neutral-50 p-4 border border-gray-100 rounded-sm flex flex-col items-center justify-center space-y-3">
            <div className="text-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">Virtual Tour</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Explore the Michael Crouch Innovation Centre (MCIC)</p>
            </div>
            <div className="w-full max-w-[400px] aspect-[3/4] bg-neutral-900 border border-gray-200 rounded-sm overflow-hidden relative shadow-sm">
                {tourVideoUrl ? (
                    <video
                        src={tourVideoUrl}
                        controls
                        playsInline
                        className="w-full h-full object-cover"
                    />
                ) : access.admin ? (
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={busy}
                        className="w-full h-full flex flex-col items-center justify-center gap-2 px-6 text-center text-white"
                    >
                        <span className="text-sm font-bold tracking-wide">Video Tour coming Soon</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#EAD64D]">
                            {busy ? 'Uploading…' : 'Click to upload'}
                        </span>
                    </button>
                ) : (
                    <div className="w-full h-full flex items-center justify-center px-6 text-center text-white">
                        <span className="text-sm font-bold tracking-wide">Video Tour coming Soon</span>
                    </div>
                )}
                {access.admin && tourVideoUrl && (
                    <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={busy}
                            className="flex-1 bg-black/80 text-[#EAD64D] text-[10px] font-bold uppercase tracking-wider py-2 rounded-sm"
                        >
                            {busy ? 'Working…' : 'Replace'}
                        </button>
                        <button
                            type="button"
                            onClick={deleteTour}
                            disabled={busy}
                            className="flex-1 bg-black/80 text-white text-[10px] font-bold uppercase tracking-wider py-2 rounded-sm"
                        >
                            Delete
                        </button>
                    </div>
                )}
            </div>
            {message && <p className="text-xs font-semibold text-center">{message}</p>}
            {access.admin && (
                <input
                    ref={fileRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        uploadTour(file);
                    }}
                />
            )}
        </section>
    );
}

export default function BookingPage() {
    const scrollToForm = () => {
        const target = document.getElementById('booking-form') || document.querySelector('form');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };


    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D] relative overflow-x-hidden">
            <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">


                {/* HERO INTRODUCTION & PORTRAIT VIDEO ARRANGEMENT */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white border border-gray-200 p-6 md:p-8 rounded-sm shadow-sm">
                    <header className="md:col-span-7 space-y-4">
                        <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-black">
                            MCIC Event Spaces
                        </h1>
                        <div className="text-gray-600 text-sm leading-relaxed space-y-3">
                            <p>
                                Thank you for your interest in booking one of the Michael Crouch Innovation Centre (MCIC) Event Spaces located on the Ground Floor and Level 1 of the Kens HILMER E10 Building.
                            </p>
                            <p>
                                Please explore our spaces below and complete the Booking Form to submit an Expression of Interest. A quote will be automatically calculated for you before final submission of your booking form.
                            </p>
                            <p>
                                Internal Departments and Student Societies receive a significant discount to use our spaces while external hirers will pay full price. Discounts will be automatically applied when generating your quote.
                            </p>
                            <button
                                type="button"
                                onClick={scrollToForm}
                                className="text-xs font-bold uppercase tracking-wider text-black underline decoration-2 decoration-[#EAD64D] underline-offset-4 hover:text-neutral-600 transition-colors block pt-2 cursor-pointer"
                            >
                                Book a tour of the MCIC spaces
                            </button>
                            <button
                                type="button"
                                onClick={scrollToForm}
                                className="text-xs font-bold uppercase tracking-wider text-black underline decoration-2 decoration-[#EAD64D] underline-offset-4 hover:text-neutral-600 transition-colors block pt-2 cursor-pointer"
                            >
                                Skip straight to booking form ↓
                            </button>
                        </div>
                    </header>


                    <VirtualTour />
                </div>


                {/* BOOKING FORM COMPONENT */}
                <BookingForm />


            </div>
        </main>
    );
}
