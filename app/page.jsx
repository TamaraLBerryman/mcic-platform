"use client";

import { useRouter } from 'next/navigation';

export default function MasterHubPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">

            {/* INTEGRATED BRAND & CONTEXT HERO */}
            <header className="max-w-5xl mx-auto pt-20 pb-12 px-6 space-y-4">

                {/* MAIN TITLE & YELLOW TAGLINE BADGE */}
                <div className="space-y-4">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-black leading-none">
                        Michael Crouch <br />Innovation Centre
                    </h1>

                    <div className="inline-block bg-[#EAD64D] text-black font-extrabold text-xs uppercase tracking-widest px-3 py-1.5 rounded-sm">
                        Where ideas become startups.
                    </div>
                </div>

                {/* SINGLE INTEGRATED CONTEXT BLOCK */}
                <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-sm shadow-xs space-y-4 mt-6">
                    <p className="text-sm md:text-base text-neutral-700 leading-relaxed font-normal">
                        Located on the Kensington campus, the <strong>Michael Crouch Innovation Centre (MCIC)</strong> is the heart and home for startups and innovation at UNSW. Operated by <strong>UNSW Founders</strong>, the centre houses state-of-the-art event and coworking spaces and a  makerspace across Ground Floor and Level 1 of the Hilmer Building.
                    </p>

                    <div className="pt-3 border-t border-gray-100 flex items-center gap-2 text-xs font-bold text-black uppercase tracking-wider">
                        This is your all-in-one platform for booking and using the MCIC facility.
                    </div>
                </div>

            </header>

            {/* 4-PANEL SELECTION TRACK GRID */}
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 px-6 pb-32">

                {/* CHOICE PANEL 01: VENUE BOOKING */}
                <div
                    onClick={() => router.push('/booking')}
                    className="bg-white p-8 flex flex-col justify-between items-start gap-10 border border-gray-200 shadow-xs hover:shadow-md transition-all cursor-pointer group rounded-sm"
                >
                    <div className="space-y-4 w-full">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                            <span>Space Booking</span>
                        </div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-black group-hover:text-neutral-700 transition-colors">
                            Book an Event Space
                        </h2>
                        <p className="text-neutral-600 text-sm leading-relaxed">
                            Check availability, calculate instant quotes, and submit booking requests for events at MCIC.
                        </p>
                    </div>

                    <button className="w-full bg-[#EAD64D] text-black text-center font-bold py-3.5 text-xs uppercase tracking-wider rounded-sm group-hover:bg-black group-hover:text-white transition-colors cursor-pointer">
                        Book Event Spaces
                    </button>
                </div>

                {/* CHOICE PANEL 02: STARTUPS & COWORKING */}
                <div
                    onClick={() => router.push('/coworking')}
                    className="bg-white p-8 flex flex-col justify-between items-start gap-10 border border-gray-200 shadow-xs hover:shadow-md transition-all cursor-pointer group rounded-sm"
                >
                    <div className="space-y-4 w-full">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                            <span>Founder in Residence</span>
                        </div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-black group-hover:text-neutral-700 transition-colors">
                            Startup Access & Coworking
                        </h2>
                        <p className="text-neutral-600 text-sm leading-relaxed">
                            Apply for Level 1 Coworking access, use printers, access WiFi etc.
                        </p>
                    </div>

                    <button className="w-full bg-[#EAD64D] text-black text-center font-bold py-3.5 text-xs uppercase tracking-wider rounded-sm group-hover:bg-black group-hover:text-white transition-colors cursor-pointer">
                        Startup Access, Use & Support
                    </button>
                </div>

                {/* CHOICE PANEL 03: MAKERSPACE PROTOTYPING */}
                <a
                    href="https://www.making.unsw.edu.au/mcic/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white p-8 flex flex-col justify-between items-start gap-10 border border-gray-200 shadow-xs hover:shadow-md transition-all cursor-pointer group rounded-sm"
                >
                    <div className="space-y-4 w-full">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                            <span>Rapid Prototyping</span>
                        </div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-black group-hover:text-neutral-700 transition-colors flex items-center gap-2">
                            Makerspace <span className="text-sm font-normal text-gray-400">↗</span>
                        </h2>
                        <p className="text-neutral-600 text-sm leading-relaxed">
                            Access 3D printers, laser cutters, and fabrication equipment.
                        </p>
                    </div>

                    <div className="w-full bg-[#EAD64D] text-black text-center font-bold py-3.5 text-xs uppercase tracking-wider rounded-sm group-hover:bg-black group-hover:text-white transition-colors">
                        Visit Makerspace Site ↗
                    </div>
                </a>

                {/* CHOICE PANEL 04: FOUNDERS EVENTS */}
                <a
                    href="https://unswfounders.com/events"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white p-8 flex flex-col justify-between items-start gap-10 border border-gray-200 shadow-xs hover:shadow-md transition-all cursor-pointer group rounded-sm"
                >
                    <div className="space-y-4 w-full">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                            <span>UNSW Founders main site</span>
                        </div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-black group-hover:text-neutral-700 transition-colors flex items-center gap-2">
                            UNSW Founders Programs, Events and Services <span className="text-sm font-normal text-gray-400">↗</span>
                        </h2>
                        <p className="text-neutral-600 text-sm leading-relaxed">
                            UNSW Founders manages the MCIC, offering programs, events, and services for entrepreneurs and innovators.
                        </p>
                    </div>

                    <div className="w-full bg-[#EAD64D] text-black text-center font-bold py-3.5 text-xs uppercase tracking-wider rounded-sm group-hover:bg-black group-hover:text-white transition-colors">
                        Explore Upcoming Events ↗
                    </div>
                </a>

            </div>

        </main>
    );
}