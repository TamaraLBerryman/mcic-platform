"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ContactUsPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });

    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white border border-gray-200 p-8 text-center space-y-6 shadow-xs rounded-sm">
                    <div className="inline-block bg-[#EAD64D] p-3 rounded-full text-2xl">✉️</div>
                    <h1 className="text-2xl font-extrabold text-black uppercase">Message Sent</h1>
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed font-normal">
                        Thank you for contacting us. We have received your message and will get back to you as soon as possible.
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full bg-black text-white py-3 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-[#EAD64D] hover:text-black transition-colors cursor-pointer"
                    >
                        Return to Home Page
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 p-6 py-12">

                {/* LEFT PANEL: SIMPLE CONTACT INFO */}
                <div className="md:col-span-5 space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-extrabold text-black uppercase tracking-tight">
                            Contact Us
                        </h1>
                    </div>

                    <div className="space-y-4">
                        {/* LOCATION CARD */}
                        <div className="bg-white p-5 border border-gray-200 border-l-4 border-l-black rounded-sm shadow-xs space-y-3">
                            <div className="space-y-1">
                                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                                    Location
                                </span>
                                <h3 className="font-extrabold text-sm text-black tracking-tight">
                                    Michael Crouch Innovation Centre (MCIC)
                                </h3>
                                <p className="text-xs text-gray-600 font-medium leading-relaxed">
                                    Hilmer Building (E10), Ground Floor<br />
                                    UNSW Sydney, Gate 2 Anzac Parade
                                </p>
                            </div>
                            <a
                                href="https://unswfounders.com/visit-us"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block bg-black text-[#EAD64D] font-extrabold px-4 py-2 text-xs uppercase tracking-wider rounded-xs hover:bg-[#EAD64D] hover:text-black transition-colors cursor-pointer"
                            >
                                More info on getting here↗
                            </a>
                        </div>

                        {/* EMAIL CARD */}
                        <div className="bg-white p-5 border border-gray-200 border-l-4 border-l-black rounded-sm shadow-xs space-y-3">
                            <div className="space-y-1">
                                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                                    Direct Email
                                </span>
                                <p className="font-mono text-sm font-black text-black">
                                    mcic@unsw.edu.au
                                </p>
                            </div>
                            <a
                                href="mailto:mcic@unsw.edu.au"
                                className="inline-block bg-black text-[#EAD64D] font-extrabold px-4 py-2 text-xs uppercase tracking-wider rounded-xs hover:bg-[#EAD64D] hover:text-black transition-colors cursor-pointer"
                            >
                                Send Email ↗
                            </a>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: CLEAN SIMPLE FORM */}
                <div className="md:col-span-7">
                    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-6 sm:p-8 space-y-6 shadow-xs rounded-sm">
                        <h2 className="text-xl font-extrabold text-black uppercase border-b border-gray-100 pb-3">
                            Send a Message
                        </h2>

                        <div className="space-y-4 text-xs">
                            <div className="space-y-1.5">
                                <label className="font-bold uppercase text-black block">Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Your name"
                                    className="w-full p-3 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none focus:border-black text-black"
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold uppercase text-black block">Email *</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="Your email address"
                                    className="w-full p-3 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none focus:border-black text-black"
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold uppercase text-black block">Message *</label>
                                <textarea
                                    required
                                    placeholder="How can we help?"
                                    className="w-full p-3 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none h-32 resize-none focus:border-black text-black"
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-[#EAD64D] text-black font-extrabold py-3.5 text-xs uppercase tracking-wider rounded-sm hover:bg-black hover:text-white transition-colors cursor-pointer"
                        >
                            Submit
                        </button>
                    </form>
                </div>

            </div>
        </main>
    );
}