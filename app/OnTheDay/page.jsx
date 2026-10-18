"use client";

import React, { useState, useEffect } from "react";

export default function DayOfEventiPadPage() {
    const [currentTime, setCurrentTime] = useState("");

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTime(
                now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            );
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen bg-black text-white font-sans flex flex-col justify-between p-8 select-none overflow-hidden">
            {/* TOP BAR */}
            <header className="flex justify-between items-center border-b border-neutral-800 pb-6">
                <div>
                    <span className="bg-[#EAD64D] text-black font-extrabold text-xs px-3 py-1 uppercase tracking-widest rounded-xs">
                        MCIC Event Space
                    </span>
                    <h1 className="text-3xl font-black uppercase tracking-tight mt-2">
                        Need-To-Know Info
                    </h1>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-mono font-bold tracking-wider text-[#EAD64D]">
                        {currentTime || "12:00 PM"}
                    </div>
                    <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold mt-0.5">
                        UNSW Founders Hub
                    </p>
                </div>
            </header>

            {/* MAIN CONTENT GRID */}
            <main className="grid grid-cols-12 gap-6 my-auto py-4">

                {/* CALL FOR ASSISTANCE - BIG PROMINENT BLOCK */}
                <div className="col-span-12 lg:col-span-5 bg-neutral-900 border-2 border-[#EAD64D] rounded-xl p-8 flex flex-col justify-between items-center text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#EAD64D]/10 rounded-full blur-2xl pointer-events-none" />

                    <div>
                        <div className="w-16 h-16 bg-[#EAD64D] text-black rounded-full flex items-center justify-center text-3xl mx-auto mb-4 font-bold shadow-lg">
                            📞
                        </div>
                        <h2 className="text-2xl font-extrabold uppercase tracking-wide">
                            Need On-Site Assistance?
                        </h2>
                        <p className="text-xs text-neutral-400 mt-2 max-w-xs mx-auto leading-relaxed">
                            Press below to call duty staff or UNSW Security for urgent space issues, access, or emergencies.
                        </p>
                    </div>

                    <div className="w-full space-y-3 mt-6">
                        <a
                            href="tel:0293856000"
                            className="w-full py-5 bg-[#EAD64D] hover:bg-[#d6c23d] active:scale-[0.98] text-black font-black uppercase text-xl rounded-lg transition-all shadow-xl flex items-center justify-center gap-3 border-b-4 border-yellow-600 cursor-pointer"
                        >
                            <span>CALL SECURITY / HELP</span>
                            <span className="font-mono text-base">9385 6000</span>
                        </a>

                        <div className="p-3 bg-neutral-800/80 rounded-md border border-neutral-700/60 text-left flex items-center justify-between text-xs">
                            <span className="text-neutral-400">Emergency Line:</span>
                            <a href="tel:0293856666" className="font-mono font-bold text-red-400 underline">
                                9385 6666 (Ext. 56666)
                            </a>
                        </div>
                    </div>
                </div>

                {/* ESSENTIAL OPERATIONAL INFO CARDS */}
                <div className="col-span-12 lg:col-span-7 grid grid-cols-2 gap-4">

                    {/* CARD 1: CATERING & DELIVERIES */}
                    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-2">
                        <div className="flex items-center gap-2 text-[#EAD64D] font-bold text-sm uppercase tracking-wider">
                            <span>🍕</span> Catering & Deliveries
                        </div>
                        <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                            All catering must arrive and be collected <strong>within your booking window</strong>. Meet drivers directly at the entrance.
                        </p>
                    </div>

                    {/* CARD 2: CLEANUP & BINS */}
                    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-2">
                        <div className="flex items-center gap-2 text-[#EAD64D] font-bold text-sm uppercase tracking-wider">
                            <span>🧹</span> Mandatory Cleanup
                        </div>
                        <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                            Clear all food and waste immediately after your event. Large rubbish goes to bins in the hallway near the Design Space back door.
                        </p>
                    </div>

                    {/* CARD 3: AIR CON & LIGHTING */}
                    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-2">
                        <div className="flex items-center gap-2 text-[#EAD64D] font-bold text-sm uppercase tracking-wider">
                            <span>💡</span> AV & Aircon
                        </div>
                        <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                            Use wall-mounted touch panels for lighting and AV control. Return all microphones and HDMI adapters to the console when finished.
                        </p>
                    </div>

                    {/* CARD 4: PARKING & ACCESS */}
                    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-2">
                        <div className="flex items-center gap-2 text-[#EAD64D] font-bold text-sm uppercase tracking-wider">
                            <span>🚪</span> Access & Parking
                        </div>
                        <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                            Keep access doors clear. Nearest visitor parking is Botany St Carpark (vPermit / CellOPark Zone 2052033).
                        </p>
                    </div>

                </div>
            </main>

            {/* FOOTER NOTICE */}
            <footer className="border-t border-neutral-800 pt-4 flex justify-between items-center text-[11px] text-neutral-500 font-mono">
                <div>
                    UNSW Founders MCIC • Gate 2 High Street
                </div>
                <div>
                    Inquiries: <a href="mailto:MCIC@unsw.edu.au" className="text-neutral-400 underline">MCIC@unsw.edu.au</a>
                </div>
            </footer>
        </div>
    );
}