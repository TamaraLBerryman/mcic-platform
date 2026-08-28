import { notFound, redirect } from 'next/navigation';

// Mock DB fetcher — replace with your actual database query
// e.g. await db.event.findUnique({ where: { slug: params.slug } })
async function getEventBySlug(slug) {
    const mockDb = [
        {
            id: 'evt_1',
            title: 'AI & Robotics Founders Workshop',
            eventDate: '2026-08-15',
            eventStart: '10:00',
            eventEnd: '12:30',
            space: 'MCIC Ground - Event Space',
            description: 'Join us for a hands-on prototyping session exploring rapid AI integration into hardware products.',
            slug: 'ai-robotics-founders-workshop',
            isPublicListing: true,
            registrationType: 'MCIC_PLATFORM',
            status: 'APPROVED'
        },
        {
            id: 'evt_private',
            title: 'UNSW Founders VIP Advisory Dinner',
            eventDate: '2026-08-18',
            eventStart: '18:00',
            eventEnd: '21:00',
            space: 'MCIC Level 1 - Founders Place',
            description: 'An exclusive invite-only dinner for program mentors and portfolio startup founders.',
            slug: 'unsw-founders-vip-dinner',
            isPublicListing: false, // PRIVATE / UNLISTED
            registrationType: 'MCIC_PLATFORM',
            status: 'APPROVED'
        }
    ];

    return mockDb.find((evt) => evt.slug === slug) || null;
}

export default async function EventDetailPage({ params }) {
    const { slug } = await params;
    const event = await getEventBySlug(slug);

    // 1. If no event matches or if it's not approved, render 404 page
    if (!event || event.status !== 'APPROVED') {
        notFound();
    }

    // 2. If the organizer chose to use their own external ticketing site (e.g., Eventbrite), redirect there
    if (event.registrationType === 'EXTERNAL' && event.externalTicketUrl) {
        redirect(event.externalTicketUrl);
    }

    return (
        <main className="min-h-screen bg-neutral-50 text-black py-12 px-4 sm:px-8">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* UNLISTED / PRIVATE EVENT BANNER */}
                {!event.isPublicListing && (
                    <div className="bg-amber-50 border border-amber-300 p-4 rounded-sm text-amber-900 text-xs font-mono flex items-start gap-3">
                        <span className="text-base">🔒</span>
                        <div>
                            <span className="font-bold uppercase block mb-0.5">Private / Unlisted Event</span>
                            This event is not listed on the public MCIC directory. Only guests with this direct URL can access and register.
                        </div>
                    </div>
                )}

                {/* EVENT HEADER */}
                <header className="bg-white border border-neutral-200 p-8 rounded-sm space-y-4 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-4">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500">
                            📅 {event.eventDate} • {event.eventStart} – {event.eventEnd}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider bg-neutral-900 text-white px-2.5 py-1 rounded-sm">
                            {event.space}
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black leading-tight">
                        {event.title}
                    </h1>

                    {event.description && (
                        <p className="text-sm text-neutral-600 leading-relaxed pt-2">
                            {event.description}
                        </p>
                    )}
                </header>

                {/* REGISTRATION / TICKET FORM */}
                <section className="bg-neutral-900 text-white p-8 rounded-sm space-y-6 shadow-sm">
                    <div className="border-b border-neutral-800 pb-4 space-y-1">
                        <h2 className="text-lg font-extrabold uppercase tracking-tight text-[#EAD64D]">
                            Register for this Event
                        </h2>
                        <p className="text-xs text-neutral-400">
                            Fill in your details below to secure your place.
                        </p>
                    </div>

                    <form className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">First Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Jane"
                                    className="w-full p-3 bg-neutral-950 border border-neutral-800 text-white text-xs font-medium rounded-sm outline-none focus:border-[#EAD64D]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">Last Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Doe"
                                    className="w-full p-3 bg-neutral-950 border border-neutral-800 text-white text-xs font-medium rounded-sm outline-none focus:border-[#EAD64D]"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">Email Address *</label>
                            <input
                                type="email"
                                required
                                placeholder="jane.doe@example.com"
                                className="w-full p-3 bg-neutral-950 border border-neutral-800 text-white text-xs font-medium rounded-sm outline-none focus:border-[#EAD64D]"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">Affiliation</label>
                            <select className="w-full p-3 bg-neutral-950 border border-neutral-800 text-white text-xs font-medium rounded-sm outline-none focus:border-[#EAD64D]">
                                <option>UNSW Student</option>
                                <option>UNSW Staff</option>
                                <option>Startup Founder / Entrepreneur</option>
                                <option>External Guest</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-[#EAD64D] text-black text-center font-bold py-4 text-xs uppercase tracking-wider rounded-sm hover:bg-white transition-all duration-150 cursor-pointer pt-3"
                        >
                            Confirm Registration →
                        </button>
                    </form>
                </section>
            </div>
        </main>
    );
}