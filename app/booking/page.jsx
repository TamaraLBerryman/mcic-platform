"use client";


import React from 'react';
import BookingForm from '@/components/BookingForm';


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


                    {/* PORTRAIT VIDEO CONTAINER */}
                    <section className="md:col-span-5 bg-neutral-50 p-4 border border-gray-100 rounded-sm flex flex-col items-center justify-center space-y-3">
                        <div className="text-center">
                            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">Virtual Tour</h3>
                            <p className="text-[11px] text-gray-500 mt-0.5">Explore the Michael Crouch Innovation Centre (MCIC)</p>
                        </div>
                        <div className="w-full max-w-[400px] aspect-[3/4] bg-black border border-gray-200 rounded-sm overflow-hidden relative group shadow-sm">
                            <video
                                src="https://assets.mixkit.co/videos/preview/mixkit-vertical-creative-agency-team-discussing-project-42994-large.mp4"
                                controls
                                playsInline
                                loop
                                muted
                                className="w-full h-full object-cover"
                                poster="/images/venues/event-space-1.JPG"
                            />
                        </div>
                    </section>
                </div>


                {/* BOOKING FORM COMPONENT */}
                <BookingForm />


            </div>
        </main>
    );
}
