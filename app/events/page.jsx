"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';

// Unified Events Dataset including MCIC, UNSW Founders Off-Site, and External Hirers
const ALL_EVENTS = [
    {
        id: 'evt_1',
        title: 'AI & Robotics Founders Workshop',
        eventDate: '2026-11-15',
        eventStart: '10:00',
        eventEnd: '12:30',
        space: 'MCIC Ground - Event Space',
        description: 'Join us for a hands-on prototyping session exploring rapid AI integration into hardware products.',
        slug: 'ai-robotics-founders-workshop',
        isPublicListing: true,
        registrationType: 'MCIC_PLATFORM',
        status: 'APPROVED',
        eventType: 'UNSW_FOUNDERS', // 'UNSW_FOUNDERS' | 'EXTERNAL_HIRER' | 'OFFSITE_FOUNDERS'
        image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
        collection: 'Founders Workshops'
    },
    {
        id: 'evt_offsite_1',
        title: 'Peter Farrell Cup (PFC) Finals',
        eventDate: '2026-10-29',
        eventStart: '17:00',
        eventEnd: '21:00',
        space: 'Roundhouse, UNSW Kensington',
        description: 'UNSW’s premier student idea competition finals live on stage at the Roundhouse.',
        slug: 'peter-farrell-cup-finals',
        isPublicListing: true,
        registrationType: 'EXTERNAL',
        externalTicketUrl: 'https://www.unsw.edu.au/founders/pfc',
        status: 'APPROVED',
        eventType: 'OFFSITE_FOUNDERS',
        image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
        collection: 'Flagship Competitions'
    },
    {
        id: 'evt_2',
        title: 'Founders Pitch Night & Networking',
        eventDate: '2026-11-22',
        eventStart: '17:30',
        eventEnd: '20:00',
        space: 'MCIC Ground - Entire Space',
        description: 'Watch UNSW startup founders pitch to local investors, followed by drinks and high-table networking.',
        slug: 'founders-pitch-night-august',
        isPublicListing: true,
        registrationType: 'MCIC_PLATFORM',
        status: 'APPROVED',
        eventType: 'UNSW_FOUNDERS',
        image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
        collection: '10x Accelerator Series'
    },
    {
        id: 'evt_offsite_2',
        title: 'Pitch Night Southwest',
        eventDate: '2026-11-05',
        eventStart: '18:00',
        eventEnd: '20:30',
        space: 'Liverpool Innovation Hub, Western Sydney',
        description: 'Spotlighting breakthrough innovations and regional founders in Western Sydney.',
        slug: 'pitch-night-southwest',
        isPublicListing: true,
        registrationType: 'EXTERNAL',
        externalTicketUrl: 'https://www.unsw.edu.au/founders',
        status: 'APPROVED',
        eventType: 'OFFSITE_FOUNDERS',
        image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
        collection: 'Regional Showcases'
    },
    {
        id: 'evt_3',
        title: 'Biomedical Innovation Student Showcase',
        eventDate: '2026-11-28',
        eventStart: '14:00',
        eventEnd: '17:00',
        space: 'MCIC Seminar Room',
        description: 'External host event showcasing end-of-year biomedical student inventions and prototype displays.',
        slug: 'biomedical-student-showcase',
        isPublicListing: true,
        registrationType: 'MCIC_PLATFORM',
        status: 'APPROVED',
        eventType: 'EXTERNAL_HIRER',
        organizerName: 'Biomedical Engineering Society',
        image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
        collection: 'External Space Booking'
    },
    {
        id: 'evt_4',
        title: 'Winter Hackathon Demo Day',
        eventDate: '2026-06-10',
        eventStart: '13:00',
        eventEnd: '16:00',
        space: 'MCIC Ground - Event Space',
        description: 'Past event celebrating our winter cohort projects and prototypes.',
        slug: 'winter-hackathon-demo-day',
        isPublicListing: true,
        registrationType: 'MCIC_PLATFORM',
        status: 'APPROVED',
        eventType: 'UNSW_FOUNDERS',
        image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
        collection: 'Hackathons & Challenges'
    }
];

export default function EventsDirectoryPage() {
    const [viewTab, setViewTab] = useState('upcoming');
    const [selectedCollection, setSelectedCollection] = useState('ALL');
    const [filterCategory, setFilterCategory] = useState('ALL');

    const todayStr = new Date().toISOString().split('T')[0];

    // Filter logic
    const filteredEvents = useMemo(() => {
        return ALL_EVENTS.filter((evt) => {
            if (!evt.isPublicListing || evt.status !== 'APPROVED') return false;

            // UNSW Founders filter includes BOTH on-site MCIC and off-site flagships
            if (filterCategory === 'UNSW_FOUNDERS' && evt.eventType !== 'UNSW_FOUNDERS' && evt.eventType !== 'OFFSITE_FOUNDERS') return false;
            if (filterCategory === 'EXTERNAL_HIRER' && evt.eventType !== 'EXTERNAL_HIRER') return false;

            // View dropdown filter
            if (viewTab === 'upcoming') {
                return evt.eventDate >= todayStr;
            } else if (viewTab === 'past') {
                return evt.eventDate < todayStr;
            } else if (viewTab === 'collections') {
                return selectedCollection === 'ALL' || evt.collection === selectedCollection;
            }

            return true;
        });
    }, [viewTab, filterCategory, selectedCollection, todayStr]);

    // Extract unique collections
    const collectionsList = useMemo(() => {
        const set = new Set(ALL_EVENTS.map((e) => e.collection).filter(Boolean));
        return Array.from(set);
    }, []);

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black py-12 px-4 sm:px-8 font-sans antialiased">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* PAGE HEADER */}
                <header className="space-y-3">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-black">
                        Events & Workshops Directory
                    </h1>
                    <p className="text-sm font-medium text-neutral-600 max-w-2xl leading-relaxed">
                        Discover official UNSW Founders programs, workshops, and community events hosted at the MCIC and across external partner venues.
                    </p>
                </header>

                {/* MAIN FILTER & NAVIGATION BAR */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">

                    {/* HOST TYPE BUTTON BAR (LEFT) */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
                        <span className="text-neutral-500 uppercase text-[10px] font-mono font-bold tracking-wider shrink-0">Filter Host:</span>
                        <button
                            onClick={() => setFilterCategory('ALL')}
                            className={`px-3 py-1.5 rounded-xs border transition-all cursor-pointer whitespace-nowrap ${filterCategory === 'ALL' ? 'bg-[#EAD64D] text-black border-[#EAD64D] font-bold' : 'bg-white text-neutral-700 border-neutral-200 hover:border-black'}`}
                        >
                            All Events
                        </button>
                        <button
                            onClick={() => setFilterCategory('UNSW_FOUNDERS')}
                            className={`px-3 py-1.5 rounded-xs border transition-all cursor-pointer whitespace-nowrap ${filterCategory === 'UNSW_FOUNDERS' ? 'bg-[#EAD64D] text-black border-[#EAD64D] font-bold' : 'bg-white text-neutral-700 border-neutral-200 hover:border-black'}`}
                        >
                            ⚡ UNSW Founders
                        </button>
                        <button
                            onClick={() => setFilterCategory('EXTERNAL_HIRER')}
                            className={`px-3 py-1.5 rounded-xs border transition-all cursor-pointer whitespace-nowrap ${filterCategory === 'EXTERNAL_HIRER' ? 'bg-[#EAD64D] text-black border-[#EAD64D] font-bold' : 'bg-white text-neutral-700 border-neutral-200 hover:border-black'}`}
                        >
                            🏢 External Space Bookings
                        </button>
                    </div>

                    {/* VIEW DROPDOWN (RIGHT) */}
                    <div className="flex items-center gap-2 text-xs font-bold shrink-0 self-start sm:self-auto">
                        <span className="text-neutral-500 uppercase text-[10px] font-mono font-bold tracking-wider">View:</span>
                        <select
                            value={viewTab}
                            onChange={(e) => {
                                setViewTab(e.target.value);
                                if (e.target.value !== 'collections') setSelectedCollection('ALL');
                            }}
                            className="bg-black text-white border border-black px-3 py-1.5 rounded-xs text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-[#EAD64D] cursor-pointer shadow-xs"
                        >
                            <option value="upcoming">📅 Upcoming Events</option>
                            <option value="past">📜 Past Events</option>
                            <option value="collections">📁 Collections</option>
                        </select>
                    </div>

                </div>

                {/* COLLECTIONS SUB-FILTER BAR */}
                {viewTab === 'collections' && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold pt-1 border-t border-neutral-200 animate-in fade-in duration-150">
                        <span className="text-neutral-500 uppercase text-[10px] font-mono font-bold tracking-wider shrink-0">Collection:</span>
                        <button
                            onClick={() => setSelectedCollection('ALL')}
                            className={`px-3 py-1.5 rounded-xs border transition-all cursor-pointer ${selectedCollection === 'ALL' ? 'bg-black text-white border-black font-bold' : 'bg-white text-neutral-700 border-neutral-200 hover:border-black'}`}
                        >
                            All Collections
                        </button>
                        {collectionsList.map((col, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedCollection(col)}
                                className={`px-3 py-1.5 rounded-xs border transition-all cursor-pointer whitespace-nowrap ${selectedCollection === col ? 'bg-black text-white border-black font-bold' : 'bg-white text-neutral-700 border-neutral-200 hover:border-black'}`}
                            >
                                {col}
                            </button>
                        ))}
                    </div>
                )}

                {/* EVENTBRITE-STYLE UNIFIED CARDS GRID */}
                {filteredEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredEvents.map((evt) => {
                            const isFoundersMCIC = evt.eventType === 'UNSW_FOUNDERS';
                            const isFoundersOffsite = evt.eventType === 'OFFSITE_FOUNDERS';

                            return (
                                <article
                                    key={evt.id}
                                    className="bg-white border border-neutral-200 rounded-sm overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md hover:border-neutral-400 transition-all duration-200 group"
                                >
                                    <div>
                                        {/* EVENT BANNER IMAGE & HOST BADGE */}
                                        <div className="relative w-full h-48 bg-neutral-900 overflow-hidden">
                                            {evt.image ? (
                                                <img
                                                    src={evt.image}
                                                    alt={evt.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-3xl text-neutral-700">
                                                    📅
                                                </div>
                                            )}

                                            {/* HOST BADGE OVERLAY (BOTTOM RIGHT) */}
                                            <div className="absolute bottom-3 right-3 z-10">
                                                {isFoundersMCIC && (
                                                    <span className="bg-black/90 text-[#EAD64D] text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-xs border border-[#EAD64D]/40 backdrop-blur-xs shadow-sm">
                                                        ⚡ UNSW Founders • Held at MCIC
                                                    </span>
                                                )}
                                                {isFoundersOffsite && (
                                                    <span className="bg-[#EAD64D] text-black text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-xs border border-black/20 shadow-sm">
                                                        ⚡ UNSW Founders • Not held at MCIC
                                                    </span>
                                                )}
                                                {!isFoundersMCIC && !isFoundersOffsite && (
                                                    <span className="bg-neutral-900/90 text-white text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-xs border border-neutral-700 backdrop-blur-xs">
                                                        🏢 Externally hosted • Held at MCIC
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* CARD CONTENT */}
                                        <div className="p-5 space-y-3">
                                            {/* DATE & TIME */}
                                            <div className="flex items-center justify-between text-xs font-mono font-bold text-neutral-800">
                                                <span className="text-[#B39300] uppercase">
                                                    {new Date(evt.eventDate).toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                                <span className="text-neutral-500 font-semibold">
                                                    {evt.eventStart} – {evt.eventEnd}
                                                </span>
                                            </div>

                                            {/* COLLECTION PILL IN CONTENT AREA */}
                                            {evt.collection && (
                                                <div>
                                                    <span className="inline-block bg-neutral-100 text-neutral-700 font-mono font-bold text-[10px] px-2 py-0.5 rounded-xs border border-neutral-200 uppercase tracking-wider">
                                                        📁 {evt.collection}
                                                    </span>
                                                </div>
                                            )}

                                            {/* TITLE */}
                                            <h2 className="text-lg font-extrabold tracking-tight text-black leading-snug group-hover:text-neutral-800">
                                                {evt.title}
                                            </h2>

                                            {/* ORGANIZER / HOST NAME IF EXTERNAL */}
                                            {evt.organizerName && (
                                                <p className="text-[11px] text-neutral-500 font-medium italic">
                                                    Hosted by <span className="font-semibold text-neutral-700">{evt.organizerName}</span>
                                                </p>
                                            )}

                                            {/* LOCATION */}
                                            <p className="text-xs text-neutral-600 font-bold uppercase tracking-wider flex items-center gap-1">
                                                📍 {evt.space}
                                            </p>

                                            {/* DESCRIPTION */}
                                            {evt.description && (
                                                <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2 pt-1 border-t border-neutral-100">
                                                    {evt.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* FOOTER ACTION */}
                                    <div className="p-5 pt-0">
                                        {evt.registrationType === 'EXTERNAL' && evt.externalTicketUrl ? (
                                            <a
                                                href={evt.externalTicketUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full bg-neutral-900 text-white text-center font-bold py-3 text-xs uppercase tracking-wider rounded-xs hover:bg-[#EAD64D] hover:text-black transition-all duration-150 block"
                                            >
                                                External Tickets ↗
                                            </a>
                                        ) : (
                                            <Link
                                                href={`/events/${evt.slug}`}
                                                className="w-full bg-black text-white text-center font-bold py-3 text-xs uppercase tracking-wider rounded-xs hover:bg-[#EAD64D] hover:text-black transition-all duration-150 block"
                                            >
                                                {viewTab === 'past' ? 'View Event Recap ↗' : 'Register / Details ↗'}
                                            </Link>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    /* EMPTY STATE */
                    <div className="bg-white border border-neutral-200 p-12 text-center rounded-sm space-y-3 shadow-xs">
                        <span className="text-3xl">📅</span>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                            No Events Found
                        </h3>
                        <p className="text-xs text-neutral-500 max-w-md mx-auto">
                            There are currently no events matching your selected view or host filters.
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}