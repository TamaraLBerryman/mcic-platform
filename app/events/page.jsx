import Link from 'next/link';

// Mock data fetcher — replace this with your actual DB query 
// (e.g. Prisma: await db.event.findMany({ where: { isPublicListing: true, status: 'APPROVED' } }))
async function getPublicEvents() {
    // Example event data structure
    const allEvents = [
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
            id: 'evt_2',
            title: 'Founders Pitch Night & Networking',
            eventDate: '2026-08-22',
            eventStart: '17:30',
            eventEnd: '20:00',
            space: 'MCIC Ground - Entire Space',
            description: 'Watch UNSW startup founders pitch to local investors, followed by drinks and high-table networking.',
            slug: 'founders-pitch-night-august',
            isPublicListing: true,
            registrationType: 'MCIC_PLATFORM',
            status: 'APPROVED'
        }
    ];

    // FILTER RULE: Only show approved events set to public listing
    return allEvents.filter(
        (evt) => evt.isPublicListing && evt.registrationType === 'MCIC_PLATFORM' && evt.status === 'APPROVED'
    );
}

export default async function EventsDirectoryPage() {
    const events = await getPublicEvents();

    return (
        <main className="min-h-screen bg-neutral-50 text-black py-12 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto space-y-10">

                {/* PAGE HEADER */}
                <header className="border-b border-neutral-200 pb-8 space-y-3">

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-black">
                        Events & Workshops
                    </h1>
                    <p className="text-sm font-medium text-neutral-600 max-w-2xl leading-relaxed">
                        Explore what's scheduled at the Michael Crouch Innovation Centre.
                    </p>
                </header>

                {/* EVENTS GRID */}
                {events.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map((evt) => (
                            <article
                                key={evt.id}
                                className="bg-white border border-neutral-200 rounded-sm p-6 flex flex-col justify-between space-y-6 shadow-xs hover:border-neutral-400 transition-all duration-150"
                            >
                                <div className="space-y-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="text-xs font-mono font-bold uppercase bg-neutral-100 text-neutral-800 px-2.5 py-1 rounded-sm border border-neutral-200">
                                            {evt.eventDate}
                                        </span>
                                        <span className="text-[11px] font-mono text-neutral-500 font-semibold">
                                            {evt.eventStart} - {evt.eventEnd}
                                        </span>
                                    </div>

                                    <h2 className="text-xl font-extrabold tracking-tight text-black leading-snug">
                                        {evt.title}
                                    </h2>

                                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                                        📍 {evt.space}
                                    </p>

                                    {evt.description && (
                                        <p className="text-xs text-neutral-600 leading-relaxed line-clamp-3 pt-1">
                                            {evt.description}
                                        </p>
                                    )}
                                </div>

                                <Link
                                    href={`/events/${evt.slug}`}
                                    className="w-full bg-[#EAD64D] text-black text-center font-bold py-3 text-xs uppercase tracking-wider rounded-sm hover:bg-black hover:text-white transition-all duration-150 block"
                                >
                                    Register / Get Tickets →
                                </Link>
                            </article>
                        ))}
                    </div>
                ) : (
                    /* EMPTY STATE */
                    <div className="bg-white border border-neutral-200 p-12 text-center rounded-sm space-y-3">
                        <span className="text-2xl">📅</span>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                            No Public Events Scheduled
                        </h3>
                        <p className="text-xs text-neutral-500 max-w-md mx-auto">
                            There are currently no public events listed on the calendar. Check back soon or contact the team if you are expecting a private link.
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}