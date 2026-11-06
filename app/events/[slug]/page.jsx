"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { catalogEvent, isFoundersStaffEvent } from '../../lib/eventCatalog';

const fallbackEvent = {
    title: 'Event',
    eventDate: '',
    eventStart: '',
    eventEnd: '',
    space: 'Michael Crouch Innovation Centre',
    locationAddress: 'Michael Crouch Innovation Centre, Building E10, Gate 2, UNSW Sydney, Kensington NSW 2052',
    description: '',
    slug: '',
    isPublicListing: true,
    registrationType: 'MCIC_PLATFORM',
    status: 'APPROVED',
    eventType: '',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
    ticketPrice: 'Free',
};

export default function EventDetailPage({ params }) {
    const [event, setEvent] = useState(() => catalogEvent(params?.slug) || fallbackEvent);

    useEffect(() => {
        const slug = params?.slug;
        if (!slug) return;
        const known = catalogEvent(slug);
        if (known) setEvent(known);
        fetch(`/api/events?slug=${encodeURIComponent(slug)}`)
            .then(response => response.json())
            .then(data => {
                if (!data.event) return;
                setEvent({
                    ...(known || fallbackEvent),
                    ...data.event,
                    title: data.event.title,
                    ticketPrice: data.event.ticketPrice || 'See registration',
                    image: data.event.image || known?.image || fallbackEvent.image,
                    locationAddress: data.event.space || known?.space || fallbackEvent.locationAddress
                });
            })
            .catch(() => {});
    }, [params]);

    // MOCK AUDIENCE GOALS / QUESTIONS (Shows what other registered guests have submitted)
    const [communityQuestions, setCommunityQuestions] = useState([
        {
            id: 1,
            author: 'Alex R. (Engineering Student)',
            text: 'How do you choose between running AI models locally on edge microcontrollers versus relying on cloud APIs for low-latency robotics?',
            upvotes: 8
        },
        {
            id: 2,
            author: 'Sarah K. (BioMed Founder)',
            text: 'Looking forward to learning about computer vision hardware integration and rapid PCB fabrication options available in the MCIC Makerspace!',
            upvotes: 5
        },
        {
            id: 3,
            author: 'David L. (UNSW Alumni)',
            text: 'What are the main pitfalls when scaling prototype sensor networks into early manufacturing batches?',
            upvotes: 3
        }
    ]);

    // FORM STATE
    const [selectedAffiliations, setSelectedAffiliations] = useState([]);
    const [selectedFaculties, setSelectedFaculties] = useState([]);
    const [genderIdentity, setGenderIdentity] = useState('');
    const [genderSelfDescribe, setGenderSelfDescribe] = useState('');
    const [selectedDietary, setSelectedDietary] = useState([]);
    const [accessibilityNeeds, setAccessibilityNeeds] = useState('');
    const [userQuestionGoal, setUserQuestionGoal] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [registrationError, setRegistrationError] = useState('');
    const [registration, setRegistration] = useState(null);

    const isUNSWAffiliated = selectedAffiliations.some((aff) =>
        ['UNSW Student', 'UNSW Staff / Researcher', 'UNSW Alumni'].includes(aff)
    );

    const toggleAffiliation = (item) => {
        setSelectedAffiliations(prev =>
            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
        );
    };

    const toggleFaculty = (item) => {
        setSelectedFaculties(prev =>
            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
        );
    };

    const toggleDietary = (item) => {
        setSelectedDietary(prev =>
            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
        );
    };

    const handleUpvote = (id) => {
        setCommunityQuestions(prev =>
            prev.map(q => q.id === id ? { ...q, upvotes: q.upvotes + 1 } : q)
        );
    };

    const eventSlug = params?.slug || event.slug;

    const handleRegister = async (submitEvent) => {
        submitEvent.preventDefault();
        setRegistrationError('');
        if (selectedAffiliations.length === 0) {
            setRegistrationError('Choose at least one affiliation.');
            return;
        }
        const unsw = selectedAffiliations.some(item => ['UNSW Student', 'UNSW Staff / Researcher', 'UNSW Alumni'].includes(item));
        if (unsw && selectedFaculties.length === 0) {
            setRegistrationError('Choose a UNSW faculty or school.');
            return;
        }

        const form = new FormData(submitEvent.currentTarget);
        setSubmitting(true);
        try {
            const response = await fetch('/api/registrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventSlug,
                    eventTitle: event.title,
                    eventDate: event.eventDate,
                    eventStart: event.eventStart,
                    eventEnd: event.eventEnd,
                    maxTicketCapacity: event.maxTicketCapacity || 0,
                    firstName: form.get('firstName'),
                    lastName: form.get('lastName'),
                    email: form.get('email'),
                    phone: form.get('phone'),
                    zid: form.get('zid'),
                    questionGoal: userQuestionGoal,
                    affiliations: selectedAffiliations,
                    faculties: selectedFaculties,
                    genderIdentity,
                    genderSelfDescribe,
                    dietary: selectedDietary,
                    accessibilityNeeds
                })
            });
            const data = await response.json();
            if (!data.success) {
                setRegistrationError(data.error || 'Registration could not be saved.');
                return;
            }
            setRegistration(data);
        } catch (err) {
            setRegistrationError('Registration could not be saved.');
        } finally {
            setSubmitting(false);
        }
    };

    const formattedDate = new Date(event.eventDate).toLocaleDateString('en-AU', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">

            {/* EVENT HERO BANNER */}
            <div className="relative w-full h-[320px] sm:h-[420px] bg-neutral-900 overflow-hidden">
                <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute top-6 left-6 z-10">
                    <Link
                        href="/events"
                        className="inline-flex items-center gap-1.5 bg-black/80 hover:bg-black text-white text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-xs backdrop-blur-xs transition-colors"
                    >
                        ← Back to Events Directory
                    </Link>
                </div>
            </div>

            {/* MAIN CONTENT & TICKET SIDEBAR */}
            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                    {/* LEFT / PRIMARY COLUMN */}
                    <div className="lg:col-span-2 space-y-10">
                        <div className="space-y-4 border-b border-neutral-200 pb-8">
                            <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#B39300]">
                                {formattedDate}
                            </p>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-black leading-tight">
                                {event.title}
                            </h1>
                        </div>

                        {/* ABOUT THIS EVENT */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-extrabold text-black uppercase tracking-tight">
                                About this Event
                            </h2>
                            <p className="text-sm text-neutral-700 leading-relaxed font-medium">
                                {event.description}
                            </p>
                        </div>

                        {isFoundersStaffEvent(event) && (
                            <div className="space-y-4 border-t border-neutral-200 pt-8">
                                <h2 className="text-xl font-extrabold text-black uppercase tracking-tight">
                                    About UNSW Founders
                                </h2>
                                <p className="text-sm text-neutral-700 leading-relaxed font-medium">
                                    As Australia's leading university-based entrepreneurial program, UNSW Founders has a proven track record of success. Since its inception in 2018, the program has supported 200+ startups every year, provided entrepreneurial skills training to 25,000+ individuals, provided over 10,000 coaching and mentoring sessions, and incubated (co-located) 70+ startups on campus to foster collaboration with the UNSW business, industry, academic, and research networks.
                                </p>
                                <p className="text-sm text-neutral-700 leading-relaxed font-medium">
                                    Find out more at -{' '}
                                    <a
                                        href="https://unswfounders.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-bold underline hover:text-[#B39300]"
                                    >
                                        UNSW Founders
                                    </a>
                                </p>
                                <p className="text-sm text-neutral-700 leading-relaxed font-medium">
                                    <a
                                        href="https://unswfounders.com/newsletter"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-bold underline hover:text-[#B39300]"
                                    >
                                        Subscribe to the UNSW Founders Newsletter
                                    </a>
                                    {' '}to stay up to date with all our programs and events
                                </p>
                            </div>
                        )}

                        {/* AUDIENCE INTEREST & GOALS (COMMUNITY Q&A BOARD) */}
                        <div className="space-y-4 border-t border-neutral-200 pt-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-extrabold text-black uppercase tracking-tight flex items-center gap-2">
                                        💡 What Attendees Want Out of this Event
                                    </h2>
                                    <p className="text-xs text-neutral-500 font-medium">
                                        Topics and questions submitted by registered guests. Upvote the ones you want answered!
                                    </p>
                                </div>
                                <span className="bg-[#EAD64D] text-black text-[10px] font-mono font-bold px-2 py-1 rounded-xs uppercase">
                                    Audience Driven
                                </span>
                            </div>

                            <div className="space-y-3 pt-2">
                                {communityQuestions.map((q) => (
                                    <div
                                        key={q.id}
                                        className="bg-white border border-neutral-200 p-4 rounded-xs flex items-start justify-between gap-4 shadow-xs hover:border-neutral-400 transition-all"
                                    >
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-mono font-bold text-[#B39300] uppercase block">
                                                {q.author}
                                            </span>
                                            <p className="text-xs text-neutral-800 font-medium leading-relaxed">
                                                "{q.text}"
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleUpvote(q.id)}
                                            className="flex flex-col items-center bg-neutral-50 hover:bg-[#EAD64D] hover:text-black border border-neutral-200 text-neutral-700 p-2 rounded-xs transition-colors shrink-0 cursor-pointer"
                                        >
                                            <span className="text-xs font-bold">▲</span>
                                            <span className="text-[10px] font-mono font-black">{q.upvotes}</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN (STICKY TICKET REGISTRATION FORM SIDEBAR) */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 bg-neutral-900 text-white p-6 sm:p-8 rounded-xs space-y-6 shadow-xl border border-neutral-800">

                            <div className="border-b border-neutral-800 pb-4 space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-mono font-black text-[#EAD64D] uppercase tracking-wider">
                                        Registration
                                    </span>
                                    <span className="text-xs font-mono font-bold bg-neutral-800 px-2 py-1 rounded-xs text-emerald-400">
                                        {event.ticketPrice || 'Free'}
                                    </span>
                                </div>
                                <h2 className="text-xl font-extrabold text-white">
                                    Reserve Your Spot
                                </h2>
                            </div>

                            {registration?.pendingReview || registration?.notConfirmed ? (
                                <div className="space-y-3 text-center">
                                    <p className="text-sm font-bold text-[#EAD64D]">
                                        {registration.notConfirmed ? 'This registration was not confirmed.' : 'Your registration is being reviewed.'}
                                    </p>
                                    <p className="text-xs text-neutral-300">
                                        {registration.notConfirmed
                                            ? 'A ticket has not been issued for this email.'
                                            : 'You will be emailed a ticket if the registration is confirmed.'}
                                    </p>
                                </div>
                            ) : registration ? (
                                <div className="space-y-4 text-center">
                                    <p className="text-sm font-bold text-[#EAD64D]">You're registered.</p>
                                    <p className="text-xs text-neutral-300">
                                        {registration.emailSent
                                            ? `A QR code was emailed to ${registration.registration.answers.email}.`
                                            : `The ticket is saved. Email could not be sent: ${registration.emailError}`}
                                    </p>
                                    {registration.registration.qrDataUrl && (
                                        <img
                                            src={registration.registration.qrDataUrl}
                                            alt="Your ticket QR code"
                                            className="mx-auto w-48 h-48 bg-white p-2"
                                        />
                                    )}
                                    <p className="font-mono font-bold tracking-wider">{registration.registration.ticketCode}</p>
                                    <Link href={`/ticket/${registration.registration.ticketCode}`} className="block text-xs font-bold uppercase tracking-wider text-[#EAD64D]">
                                        Open ticket
                                    </Link>
                                    <Link href={`/events/${eventSlug}/door`} className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                        Door check-in
                                    </Link>
                                </div>
                            ) : (
                            <form className="space-y-5" onSubmit={handleRegister}>
                                {/* NAME FIELDS */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block">First Name *</label>
                                        <input
                                            name="firstName"
                                            type="text"
                                            required
                                            placeholder="Jane"
                                            className="w-full p-3 bg-neutral-950 border border-neutral-800 text-white text-xs rounded-xs outline-none focus:border-[#EAD64D]"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block">Last Name *</label>
                                        <input
                                            name="lastName"
                                            type="text"
                                            required
                                            placeholder="Doe"
                                            className="w-full p-3 bg-neutral-950 border border-neutral-800 text-white text-xs rounded-xs outline-none focus:border-[#EAD64D]"
                                        />
                                    </div>
                                </div>

                                {/* CONTACT FIELDS */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block">Email Address *</label>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="jane.doe@unsw.edu.au"
                                        className="w-full p-3 bg-neutral-950 border border-neutral-800 text-white text-xs rounded-xs outline-none focus:border-[#EAD64D]"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block">Mobile Number *</label>
                                        <input
                                            name="phone"
                                            type="tel"
                                            required
                                            placeholder="0400 000 000"
                                            className="w-full p-3 bg-neutral-950 border border-neutral-800 text-white text-xs rounded-xs outline-none focus:border-[#EAD64D]"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block">zID (Optional)</label>
                                        <input
                                            name="zid"
                                            type="text"
                                            placeholder="z1234567"
                                            className="w-full p-3 bg-neutral-950 border border-neutral-800 text-white text-xs rounded-xs outline-none focus:border-[#EAD64D]"
                                        />
                                    </div>
                                </div>

                                {/* EVENT GOALS / QUESTION SUBMISSION FIELD */}
                                <div className="space-y-1 bg-neutral-950/80 p-3.5 border border-[#EAD64D]/40 rounded-xs">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#EAD64D] block">
                                        💡 What do you hope to get out of this event?
                                    </label>
                                    <p className="text-[10px] text-neutral-400">
                                        What specific question or challenge do you want addressed?
                                    </p>
                                    <textarea
                                        rows={2}
                                        placeholder="e.g. How to connect computer vision software to hardware microcontrollers..."
                                        value={userQuestionGoal}
                                        onChange={(e) => setUserQuestionGoal(e.target.value)}
                                        className="w-full p-2.5 mt-1 bg-neutral-900 border border-neutral-800 text-white text-xs rounded-xs outline-none focus:border-[#EAD64D]"
                                    />
                                </div>

                                {/* MULTI-SELECT AFFILIATION */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block">
                                        Affiliation *
                                    </label>
                                    <div className="grid grid-cols-1 gap-1.5 bg-neutral-950 p-3 border border-neutral-800 rounded-xs text-xs">
                                        {[
                                            'UNSW Student',
                                            'UNSW Staff / Researcher',
                                            'UNSW Alumni',
                                            'UNSW Affiliated Founder',
                                            'External Guest / General Public'
                                        ].map((aff, idx) => (
                                            <label key={idx} className="flex items-center gap-2 cursor-pointer hover:text-[#EAD64D] transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAffiliations.includes(aff)}
                                                    onChange={() => toggleAffiliation(aff)}
                                                    className="accent-[#EAD64D]"
                                                />
                                                <span>{aff}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* CONDITIONAL MULTI-SELECT FACULTY */}
                                {isUNSWAffiliated && (
                                    <div className="space-y-1.5 animate-in fade-in duration-200">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#EAD64D] block">
                                            UNSW Faculty / School *
                                        </label>
                                        <div className="grid grid-cols-1 gap-1.5 bg-neutral-950 p-3 border border-neutral-800 rounded-xs text-xs">
                                            {[
                                                'Engineering',
                                                'UNSW Business School',
                                                'Science',
                                                'Arts, Design & Architecture',
                                                'Medicine & Health',
                                                'Law & Justice'
                                            ].map((fac, idx) => (
                                                <label key={idx} className="flex items-center gap-2 cursor-pointer hover:text-[#EAD64D] transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFaculties.includes(fac)}
                                                        onChange={() => toggleFaculty(fac)}
                                                        className="accent-[#EAD64D]"
                                                    />
                                                    <span>{fac}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* GENDER IDENTITY */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block">
                                        Gender Identity
                                    </label>
                                    <select
                                        value={genderIdentity}
                                        onChange={(e) => setGenderIdentity(e.target.value)}
                                        className="w-full p-3 bg-neutral-950 border border-neutral-800 text-white text-xs rounded-xs outline-none focus:border-[#EAD64D] cursor-pointer"
                                    >
                                        <option value="">Prefer not to say</option>
                                        <option value="Female">Female</option>
                                        <option value="Male">Male</option>
                                        <option value="Non-binary">Non-binary / Gender Diverse</option>
                                        <option value="Self-describe">Self-describe</option>
                                    </select>

                                    {genderIdentity === 'Self-describe' && (
                                        <input
                                            type="text"
                                            placeholder="Please describe your gender identity..."
                                            value={genderSelfDescribe}
                                            onChange={(e) => setGenderSelfDescribe(e.target.value)}
                                            className="w-full p-3 mt-2 bg-neutral-950 border border-neutral-800 text-white text-xs rounded-xs outline-none focus:border-[#EAD64D] animate-in fade-in duration-150"
                                        />
                                    )}
                                </div>

                                {/* STANDARD DIETARY REQUIREMENTS */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block">
                                        Dietary Requirements
                                    </label>
                                    <div className="grid grid-cols-2 gap-1.5 bg-neutral-950 p-3 border border-neutral-800 rounded-xs text-xs">
                                        {[
                                            'None',
                                            'Vegetarian',
                                            'Vegan',
                                            'Gluten-Free',
                                            'Dairy-Free',
                                            'Halal',
                                            'Kosher',
                                            'Nut Allergy',
                                            'Seafood Allergy'
                                        ].map((diet, idx) => (
                                            <label key={idx} className="flex items-center gap-2 cursor-pointer hover:text-[#EAD64D] transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDietary.includes(diet)}
                                                    onChange={() => toggleDietary(diet)}
                                                    className="accent-[#EAD64D]"
                                                />
                                                <span>{diet}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* SEPARATE ACCESSIBILITY NEEDS FIELD */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block">
                                        Accessibility Requirements
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Please specify any accessibility requirements..."
                                        value={accessibilityNeeds}
                                        onChange={(e) => setAccessibilityNeeds(e.target.value)}
                                        className="w-full p-3 bg-neutral-950 border border-neutral-800 text-white text-xs rounded-xs outline-none focus:border-[#EAD64D]"
                                    />
                                </div>

                                {registrationError && (
                                    <p className="text-xs font-bold text-red-300">{registrationError}</p>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-[#EAD64D] hover:bg-white text-black font-black py-4 text-xs uppercase tracking-wider rounded-xs transition-all duration-150 cursor-pointer shadow-md mt-2 disabled:opacity-60"
                                >
                                    {submitting ? 'Saving registration…' : 'Get Tickets →'}
                                </button>
                                <Link href={`/events/${eventSlug}/door`} className="block text-center text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-[#EAD64D]">
                                    Door check-in
                                </Link>
                            </form>
                            )}

                        </div>
                    </div>

                </div>
            </div>

        </main>
    );
}