export const ALL_EVENTS = [
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
        eventType: 'UNSW_FOUNDERS',
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

export function catalogEvent(slug) {
    return ALL_EVENTS.find(event => event.slug === slug) || null;
}

export function isFoundersStaffEvent(event) {
    return event?.department === 'UNSW Founders'
        || event?.eventType === 'UNSW_FOUNDERS'
        || event?.eventType === 'OFFSITE_FOUNDERS';
}
