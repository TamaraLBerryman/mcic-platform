"use client";

import React, { useState } from 'react';

// Updated UNSW Founders & MCIC Staff Directory (Sorted Alphabetically by First Name)
const RAW_STAFF_DIRECTORY = [
    { name: "Celine Olarte", role: "Program Coordinator", email: "c.olarte@unsw.edu.au" },
    { name: "David Burt", role: "Director - Entrepreneurship", email: "d.burt@unsw.edu.au" },
    { name: "Dina Titkova", role: "Senior Manager, Entrepreneurship", email: "d.titkova@unsw.edu.au" },
    { name: "Eleni Assargiotis", role: "Program Manager, Foundry 10x", email: "e.assargiotis@unsw.edu.au" },
    { name: "Georgia Lyons", role: "Program Manager", email: "georgia.lyons@unsw.edu.au" },
    { name: "Hamish McFarlane", role: "MCIC Makerspace Coordinator", email: "h.mcfarlane@unsw.edu.au" },
    { name: "Joseph Po", role: "Health Accelerator Program Manager", email: "j.po@unsw.edu.au" },
    { name: "Maddison McCoy", role: "Community Manager, Engineering", email: "m.mccoy@unsw.edu.au" },
    { name: "Mariana Luis Castillo Patron", role: "Community Manager", email: "m.castillopatron@unsw.edu.au" },
    { name: "Nina Juhl", role: "Senior Manager, Entrepreneurship", email: "n.juhl@unsw.edu.au" },
    { name: "Priscilla Tan", role: "Program Manager, Edu Entre", email: "priscilla.tan@unsw.edu.au" },
    { name: "Ria Kapoor", role: "Comms Intern", email: "ria.kapoor@unsw.edu.au" },
    { name: "Sasha Whittle", role: "Program Manager", email: "sasha.whittle@unsw.edu.au" },
    { name: "Steven Hiotis", role: "Project Officer - Splice", email: "s.hiotis@unsw.edu.au" },
    { name: "Tamara Berryman", role: "Event Coordinator", email: "t.berryman@unsw.edu.au" },
    { name: "Vern Chan", role: "Global Program Manager", email: "vern.chan@unsw.edu.au" },
    { name: "Wisiani Wijaya", role: "Investment Portfolio Coordinator", email: "w.wijaya@unsw.edu.au" }
];

// Ensure strict alphabetical sorting by first name
const STAFF_DIRECTORY = [...RAW_STAFF_DIRECTORY].sort((a, b) =>
    a.name.localeCompare(b.name)
);

export default function iPadDoorbellPage() {
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [visitorName, setVisitorName] = useState('');
    const [visitorCompany, setVisitorCompany] = useState('');
    const [note, setNote] = useState('');
    const [searchDirectoryQuery, setSearchDirectoryQuery] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notifiedSuccess, setNotifiedSuccess] = useState(false);

    // Filter staff list based on search query
    const filteredStaff = STAFF_DIRECTORY.filter(staff =>
        staff.name.toLowerCase().includes(searchDirectoryQuery.toLowerCase()) ||
        staff.role.toLowerCase().includes(searchDirectoryQuery.toLowerCase())
    );

    const handleSendNotification = async (e) => {
        e.preventDefault();
        if (!selectedStaff || !visitorName.trim()) return;

        setIsSubmitting(true);

        try {
            const res = await fetch('/api/notify-visitor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    visitorName: visitorName.trim(),
                    visitorCompany: visitorCompany.trim(),
                    recipientName: selectedStaff.name,
                    recipientEmail: selectedStaff.email,
                    message: note.trim()
                })
            });

            if (res.ok) {
                setNotifiedSuccess(true);
                // Auto-reset kiosk interface back to home after 6 seconds
                setTimeout(() => {
                    setNotifiedSuccess(false);
                    setSelectedStaff(null);
                    setVisitorName('');
                    setVisitorCompany('');
                    setNote('');
                    setSearchDirectoryQuery('');
                }, 6000);
            } else {
                alert("Could not send alert. Please ring or contact staff directly.");
            }
        } catch (error) {
            console.error("Error sending notification:", error);
            alert("Connection error. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-neutral-900 text-white font-sans flex flex-col justify-between p-6 sm:p-8 select-none">

            {/* MAIN CONTENT CONTAINER */}
            <div className="max-w-3xl mx-auto w-full my-auto space-y-6 py-4">

                {notifiedSuccess ? (
                    <div className="bg-emerald-950 border border-emerald-500/50 p-10 rounded-xl text-center space-y-4 animate-in fade-in duration-300">
                        <span className="text-5xl block">🔔</span>
                        <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-tight">
                            Doorbell Rung!
                        </h2>
                        <p className="text-sm text-neutral-300 max-w-md mx-auto leading-relaxed">
                            We have alerted <strong>{selectedStaff?.name}</strong>. Please take a seat, someone will be with you shortly.
                        </p>
                        <div className="text-xs text-neutral-500 font-mono pt-4">
                            Screen resetting automatically...
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">

                        {/* STEP 1: SELECT STAFF RECIPIENT */}
                        {!selectedStaff ? (
                            <div className="space-y-4">
                                <div className="text-center space-y-1">
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                                        Who are you visiting today?
                                    </h2>
                                    <p className="text-xs text-neutral-400">Tap a staff member below to notify them that you are here.</p>
                                </div>

                                {/* QUICK SEARCH BAR FOR DIRECTORY */}
                                <div className="max-w-md mx-auto relative">
                                    <input
                                        type="text"
                                        placeholder="Search by name or role..."
                                        value={searchDirectoryQuery}
                                        onChange={(e) => setSearchDirectoryQuery(e.target.value)}
                                        className="w-full bg-neutral-800 border border-neutral-700 text-white p-3 rounded-lg text-xs font-medium focus:outline-none focus:border-[#EAD64D] placeholder-neutral-500"
                                    />
                                    {searchDirectoryQuery && (
                                        <button
                                            onClick={() => setSearchDirectoryQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* STAFF CARDS GRID WITH HIDDEN SCROLLBAR */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 max-h-[55vh] overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                    {filteredStaff.length > 0 ? (
                                        filteredStaff.map((staff, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedStaff(staff)}
                                                className="p-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-[#EAD64D] rounded-xl text-left transition-all cursor-pointer flex justify-between items-center group shadow-md"
                                            >
                                                <div>
                                                    <h3 className="font-extrabold text-sm text-white group-hover:text-[#EAD64D] transition-colors">
                                                        {staff.name}
                                                    </h3>
                                                    <p className="text-[11px] text-neutral-400 font-medium">{staff.role}</p>
                                                </div>
                                                <span className="text-base text-neutral-500 group-hover:text-[#EAD64D] shrink-0 ml-2">
                                                    🔔
                                                </span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="col-span-2 text-center p-8 text-neutral-500 text-xs font-bold uppercase tracking-wider">
                                            No team member matched "{searchDirectoryQuery}".
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* STEP 2: ENTER VISITOR DETAILS */
                            <form onSubmit={handleSendNotification} className="bg-neutral-800/90 border border-neutral-700 p-6 sm:p-8 rounded-xl space-y-5 animate-in fade-in duration-200">
                                <div className="flex justify-between items-center border-b border-neutral-700 pb-4">
                                    <div>
                                        <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block">Visiting Staff Member:</span>
                                        <h3 className="text-lg font-black text-[#EAD64D]">{selectedStaff.name}</h3>
                                        <p className="text-xs text-neutral-400 font-medium">{selectedStaff.role}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedStaff(null)}
                                        className="text-xs text-neutral-400 hover:text-white underline font-bold"
                                    >
                                        Change Recipient
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                                            Your Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Alex Rivera"
                                            value={visitorName}
                                            onChange={(e) => setVisitorName(e.target.value)}
                                            className="w-full bg-neutral-900 border border-neutral-700 text-white p-3.5 rounded-lg text-sm focus:outline-none focus:border-[#EAD64D]"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                                            Company / Organization (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Google, Atlassian, UNSW Student..."
                                            value={visitorCompany}
                                            onChange={(e) => setVisitorCompany(e.target.value)}
                                            className="w-full bg-neutral-900 border border-neutral-700 text-white p-3.5 rounded-lg text-sm focus:outline-none focus:border-[#EAD64D]"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                                            Note or Reason for Visit (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Here for 2:00 PM meeting"
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            className="w-full bg-neutral-900 border border-neutral-700 text-white p-3.5 rounded-lg text-sm focus:outline-none focus:border-[#EAD64D]"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full py-4 bg-[#EAD64D] hover:bg-white text-black font-black text-sm uppercase tracking-wider rounded-lg transition-all shadow-lg cursor-pointer ${isSubmitting ? 'opacity-50' : ''}`}
                                >
                                    {isSubmitting ? "Ringing Doorbell..." : "🔔 Ring Doorbell & Notify Staff"}
                                </button>
                            </form>
                        )}

                    </div>
                )}

            </div>

        </main>
    );
}