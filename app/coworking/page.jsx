"use client";

import { useState } from 'react';

export default function CoworkingPage() {
    // Navigation tab state: 'apply' | 'floorplan'
    const [activeTab, setActiveTab] = useState('apply');

    // Pipeline status search state
    const [statusSearchQuery, setStatusSearchQuery] = useState('');
    const [matchedRecord, setMatchedRecord] = useState(null);
    const [hasSearchedStatus, setHasSearchedStatus] = useState(false);

    // Clipboard copy state for Outlook Cheat-Sheet
    const [copiedRoomCode, setCopiedRoomCode] = useState(null);

    // Kitchen/Supply Alert State
    const [supplyAlert, setSupplyAlert] = useState(null);
    const [customAlertText, setCustomAlertText] = useState('');

    const handleLogSupplyAlert = (itemLabel) => {
        setSupplyAlert(itemLabel);
        setCustomAlertText('');
    };

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        if (customAlertText.trim()) {
            setSupplyAlert(`Custom Request: "${customAlertText.trim()}"`);
        }
    };

    // Main Coworking Application Form State
    const [formData, setFormData] = useState({
        relationshipToUNSW: 'Student',
        programsParticipated: [],
        referredByStaff: '',
        startupName: '',
        startupWebsite: '',
        ventureStage: 'Idea Stage / Early Research',
        projectDescription: '',
        swipeCardAccessNeeded: 'Yes - Add to existing zID card',
        accessStatusNeeded: 'I do not have access to the space and am requesting access.',
        deskRequestType: 'No Desk Required (Hot Desks only)',
        desksRequestedCount: 1,
        fullName: '',
        zID: '',
        dob: '',
        email: '',
        phone: '',
        isMainContact: true,
        agreeToTerms: false
    });

    const [submitted, setSubmitted] = useState(false);

    // Floorplan Search Filter and Selected Desk State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEntity, setSelectedEntity] = useState(null);

    // Pipeline Stages Data Definition
    const pipelineStages = [
        { title: 'Application Received', subtitle: 'Reviewed and sent on once per week.' },
        { title: 'Submitted to HR (non-current Staff/Students) or Security (current Staff/Students)' },
        { title: 'zID Created or Re-activated by HR', subtitle: 'Only for non-current Staff/Students. Processing times vary from 1-3 weeks.' },
        { title: 'New zID activates in Security System', subtitle: '3 days after zID crreation or re-activation.' },
        { title: 'Request Access applied to new or re-activated zID', subtitle: 'Requested once per week.' },
        { title: 'Access is active and Card can be collected ($25)', subtitle: 'Online Induction' },
        { title: 'Online Induction must be completed within XX weeks', subtitle: 'Non-Current Staff/Students' },
    ];

    // Mock Access Database for Status Search Engine
    const mockAccessAccounts = [
        {
            zid: "z5392014",
            name: "Alex Rivera",
            startup: "Solaris AI",
            category: "Current UNSW Student",
            stageIndex: 3, // Step 04
            stageLabel: "Card Encoding / Badge Pickup",
            eta: "1-2 Business Days",
            updatedAt: "Today at 9:30 AM",
            nextAction: "Your zID clearance is approved! Visit the MCIC Level 1 Ops Desk to activate your physical swipe card.",
            moodleUrl: "https://moodle.telt.unsw.edu.au/"
        },
        {
            zid: "z5104882",
            name: "Samantha Chen",
            startup: "BioMesh Tech",
            category: "Pre-10x Incubator",
            stageIndex: 2, // Step 03
            stageLabel: "Safety Moodle Pending",
            eta: "Pending User Completion",
            updatedAt: "Yesterday at 4:15 PM",
            nextAction: "Complete the mandatory UNSW WHS Safety Moodle module linked below to unlock card encoding.",
            moodleUrl: "https://moodle.telt.unsw.edu.au/"
        },
        {
            zid: "z5294011",
            name: "Marcus Vance",
            startup: "QuantumLeap Dynamics",
            category: "External / Alumni",
            stageIndex: 1, // Step 02
            stageLabel: "HR / zID Affiliate Setup",
            eta: "3-5 Business Days",
            updatedAt: "12 Aug 2026",
            nextAction: "UNSW HR is processing your external affiliate zID setup. You will receive an email once your zID is issued.",
            moodleUrl: null
        }
    ];

    // Outlook Meeting Room Location Codes & Details
    const outlookRooms = [
        // LEVEL 1
        { lvl: 1, seats: '16 seats', code: 'Kens HILMER E10 Lv1 140 Groupstudy', remarks: '' },
        { lvl: 1, seats: '6 seats', code: 'Kens HILMER E10 Lv1 141 Groupstudy', remarks: '' },
        { lvl: 1, seats: '8 seats', code: 'Kens HILMER E10 Lv1 142 Groupstudy', remarks: '' },
        { lvl: 1, seats: '8 seats', code: 'Kens HILMER E10 Lv1 143 Groupstudy', remarks: '' },

        // LEVEL 2
        { lvl: 2, seats: '14 seats', code: 'Kens HILMER E10 Lv2 223', remarks: 'Enter via SEB E8' },
        { lvl: 2, seats: '20 seats', code: 'Kens HILMER E10 Lv2 252 Boardroom Meeting Room', remarks: 'Boardroom' },

        // LEVEL 3
        { lvl: 3, seats: '14 seats', code: 'Kens HILMER E10 Lv3 323', remarks: 'Enter via SEB E8' },

        // LEVEL 4
        { lvl: 4, seats: '14 seats', code: 'Kens HILMER E10 Lv4 423 Meeting Room', remarks: 'Enter via SEB E8' },

        // LEVEL 5
        { lvl: 5, seats: '20 seats', code: 'Kens HILMER E10 Lv5 552', remarks: 'Boardroom' },
        { lvl: 5, seats: '14 seats', code: 'Kens HILMER E10 Lv5 523', remarks: 'Enter via SEB E8' },

        // LEVEL 6
        { lvl: 6, seats: '6 seats', code: 'Kens HILMER E10 Lv6 652', remarks: 'Sometimes locked, check first' },
        { lvl: 6, seats: '10 seats', code: 'Kens HILMER E10 Lv6 623', remarks: 'Enter via SEB E8' },
        { lvl: 6, seats: '8 seats', code: 'Kens HILMER E10 Lv6 655', remarks: 'Sometimes locked, check first' },

        // LEVEL 7
        { lvl: 7, seats: '10 seats', code: 'Kens HILMER E10 Lv7 723', remarks: 'Enter via SEB E8' }
    ];

    // Floorplan Desk Pods Data Structure
    const deskPods = [
        {
            id: 'pod-staff',
            title: 'UNSW Founders Staff & Operations Bay',
            category: 'staff',
            desks: [
                { name: 'Tamara Berryman', role: 'Operations Lead', startup: 'UNSW Founders' },
                { name: 'David Smith', role: 'Venture Manager', startup: 'UNSW Founders' },
                { name: 'Victoria Lin', role: 'Program Ops', startup: 'UNSW Founders' },
                { name: 'Staff Desk 04', role: 'Guest Advisor', startup: 'UNSW Founders' }
            ]
        },
        {
            id: 'pod-hotdesks-north',
            title: 'North Wing Hot Desks (With Monitors & USB-C Hubs)',
            category: 'hotdesk',
            desks: [
                { name: 'Hotdesk Station 01', role: 'Open Seating', startup: 'Available' },
                { name: 'Hotdesk Station 02', role: 'Open Seating', startup: 'Available' },
                { name: 'Hotdesk Station 03', role: 'Open Seating', startup: 'Available' },
                { name: 'Hotdesk Station 04', role: 'Open Seating', startup: 'Available' },
                { name: 'Hotdesk Station 05', role: 'Open Seating', startup: 'Available' },
                { name: 'Hotdesk Station 06', role: 'Open Seating', startup: 'Available' }
            ]
        },
        {
            id: 'pod-10x-residents-1',
            title: '10x Accelerator Resident Desk Bay A',
            category: 'resident',
            desks: [
                { name: 'Solaris AI Bay 1', startup: 'Solaris AI', role: '10x Founder' },
                { name: 'Solaris AI Bay 2', startup: 'Solaris AI', role: '10x Engineer' },
                { name: 'BioMesh Tech Bay 1', startup: 'BioMesh Tech', role: 'Health 10x Founder' },
                { name: 'BioMesh Tech Bay 2', startup: 'BioMesh Tech', role: 'Lead Researcher' }
            ]
        },
        {
            id: 'pod-10x-residents-2',
            title: '10x Accelerator Resident Desk Bay B',
            category: 'resident',
            desks: [
                { name: 'QuantumLeap Bay 1', startup: 'QuantumLeap', role: '10x Founder' },
                { name: 'QuantumLeap Bay 2', startup: 'QuantumLeap', role: 'CTO' },
                { name: 'EcoCarbon Bay 1', startup: 'EcoCarbon', role: 'Pre-10x Cohort' },
                { name: 'EcoCarbon Bay 2', startup: 'EcoCarbon', role: 'Co-Founder' }
            ]
        }
    ];

    // Status search engine handler
    const handleStatusSearch = (e) => {
        e.preventDefault();
        setHasSearchedStatus(true);
        const query = statusSearchQuery.toLowerCase().trim();
        const found = mockAccessAccounts.find(
            acc => acc.zid.toLowerCase().includes(query) ||
                acc.name.toLowerCase().includes(query) ||
                acc.startup.toLowerCase().includes(query)
        );
        setMatchedRecord(found || null);
    };

    // Copy Outlook Room Code to Clipboard
    const handleCopyRoomCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedRoomCode(code);
        setTimeout(() => setCopiedRoomCode(null), 2000);
    };

    // Checkbox toggling for programs participated
    const handleProgramCheckbox = (program) => {
        setFormData((prev) => {
            const exists = prev.programsParticipated.includes(program);
            return {
                ...prev,
                programsParticipated: exists
                    ? prev.programsParticipated.filter((p) => p !== program)
                    : [...prev.programsParticipated, program]
            };
        });
    };

    // Application form submission handler
    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
    };

    // Smooth scroll helpers
    const handleSkipToForm = () => {
        const portalElement = document.getElementById('coworking-portal');
        if (portalElement) {
            portalElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleSkipToFaqs = () => {
        const faqElement = document.getElementById('coworking-faqs');
        if (faqElement) {
            faqElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const [openFaqId, setOpenFaqId] = useState(null);

    const toggleFaq = (id) => {
        setOpenFaqId((prev) => (prev === id ? null : id));
    };

    const [userZid, setUserZid] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);

    const handleUnlockLockerCode = (e) => {
        e.preventDefault();
        if (userZid.trim().length > 0) {
            setIsUnlocked(true);
        }
    };

    const [reportType, setReportType] = useState('stock'); // 'stock' or 'broken'

    // Stock Alert & Maintenance Search State
    const [selectedStockItem, setSelectedStockItem] = useState(null);
    const [stockSearchQuery, setStockSearchQuery] = useState('');
    const [dispatchLocation, setDispatchLocation] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [isCustomInput, setIsCustomInput] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Master Supply & Maintenance Catalog Array
    const allSupplyCatalog = [
        // Kitchen
        { id: '1', label: 'Full Fat Milk', icon: '🥛', keywords: 'dairy milk full fat white' },
        { id: '2', label: 'Oat Milk', icon: '🌾', keywords: 'oat milk dairy free plant' },
        { id: '3', label: 'Almond Milk', icon: '🥜', keywords: 'almond milk nut plant' },
        { id: '4', label: 'Coffee Beans', icon: '☕', keywords: 'coffee espresso beans roast' },
        { id: '5', label: 'Tea Bags', icon: '🫖', keywords: 'tea Earl Grey green' },
        { id: '6', label: 'Dishsoap', icon: '🧼', keywords: 'soap dish detergent cleaning' },
        { id: '7', label: 'Paper Towel', icon: '🧻', keywords: 'towel paper roll wipe' },
        { id: '8', label: 'Hand Soap', icon: '🧴', keywords: 'soap wash hands' },

        // Printing
        { id: '9', label: 'Paper (A4)', icon: '📄', keywords: 'paper A4 printer copy' },
        { id: '10', label: 'Paper (A3)', icon: '📑', keywords: 'paper A3 large print' },
        { id: '11', label: 'Ink / Toner Depleted', icon: '🖨️', keywords: 'ink toner cartridge print' },

        // First Aid
        { id: '12', label: 'Bandaids', icon: '🩹', keywords: 'bandaid plaster bandage first aid' },
    ];

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">

            {/* MAIN CONTAINER WRAPPER */}
            <div className="max-w-6xl mx-auto px-6 sm:px-12 py-10 space-y-10">

                {/* SINGLE CONSOLIDATED HERO OVERVIEW CONTAINER */}
                <section className="bg-white p-6 sm:p-8 border border-gray-200 rounded-sm shadow-xs space-y-8">

                    {/* HERO TITLE & VIRTUAL TOUR VIDEO GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                        <header className="md:col-span-7 space-y-4">
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-black uppercase">
                                Startup Access & Coworking
                            </h1>
                            <div className="text-gray-600 text-xs sm:text-sm leading-relaxed space-y-3 font-normal">
                                <p>
                                    The Startup co-working spaces at the MCIC are located on Level 1 and include allocated desks, hot-desks with monitors, informal co-working space (no monitors), 4 bookable meeting rooms, 2 soundproof meeting booths, lockers and kitchen facilities.
                                </p>
                            </div>
                            {/* CLEAN TWO-COLUMN QUICK NAVIGATION HUB */}
                            <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* CARD 1: REQUEST ACCESS */}
                                <div className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs flex flex-col justify-between space-y-4 hover:border-black transition-colors">
                                    <div className="space-y-1.5">
                                        <h4 className="text-base font-extrabold uppercase text-black">
                                            Want access to our coworking spaces?
                                        </h4>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSkipToForm}
                                        className="w-full bg-[#EAD64D] text-black font-extrabold py-3 text-xs uppercase tracking-wider rounded-xs hover:bg-black hover:text-white transition-colors cursor-pointer text-center"
                                    >
                                        Skip straight to access request form ➔
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const target = document.getElementById('booking-form') || document.querySelector('form');
                                            if (target) {
                                                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }
                                        }}
                                        className="text-xs font-bold uppercase tracking-wider text-black underline decoration-2 decoration-[#EAD64D] underline-offset-4 hover:text-neutral-600 transition-colors block pt-2 cursor-pointer"
                                    >
                                        Or book a tour of our coworking space.
                                    </button>

                                </div>

                                {/* CARD 2: EXISTING RESIDENTS / FAQS */}
                                <div className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs flex flex-col justify-between space-y-4 hover:border-black transition-colors">
                                    <div className="space-y-1.5">
                                        <h4 className="text-base font-extrabold uppercase text-black">
                                            Already Have Access?
                                        </h4>
                                        <p className="text-xs text-gray-600 leading-relaxed font-normal">
                                            Need to book a meeting room, access printers, provide a postal address, etc.?
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSkipToFaqs}
                                        className="w-full bg-neutral-100 text-black border border-gray-300 font-extrabold py-3 text-xs uppercase tracking-wider rounded-xs hover:bg-black hover:text-white hover:border-black transition-colors cursor-pointer text-center"
                                    >
                                        View the Space Use FAQs ➔
                                    </button>
                                </div>
                            </div>
                        </header>

                        {/* PORTRAIT VIDEO CONTAINER */}
                        <section className="md:col-span-5 bg-neutral-50 p-4 border border-gray-200 rounded-sm flex flex-col items-center justify-center space-y-3">
                            <div className="text-center">
                                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">Virtual Tour</h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">Explore the Michael Crouch Innovation Centre (MCIC)</p>
                            </div>
                            <div className="w-full max-w-[360px] aspect-[3/4] bg-black border border-gray-200 rounded-sm overflow-hidden relative group shadow-xs">
                                <video
                                    src="https://assets.mixkit.co/videos/preview/mixkit-vertical-creative-agency-team-discussing-project-42994-large.mp4"
                                    controls
                                    playsInline
                                    loop
                                    muted
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </section>
                    </div>

                    {/* INCLUDED RESIDENT BENEFITS BAR (MINIMAL & INLINE) */}
                    <div className="pt-6 border-t border-gray-100">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 block mb-4">
                            Included Resident Benefits
                        </span>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-y-4 gap-x-6 items-center">
                            <div className="flex items-center gap-2">
                                <span className="text-base">📶</span>
                                <span className="font-extrabold text-xs text-black uppercase">Wi-Fi</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-base">🖨️</span>
                                <span className="font-extrabold text-xs text-black uppercase">Printing</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-base">👥</span>
                                <span className="font-extrabold text-xs text-black uppercase leading-none">Meeting Rooms</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-base">🛠️</span>
                                <span className="font-extrabold text-xs text-black uppercase">Makerspace</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-base">📅</span>
                                <span className="font-extrabold text-xs text-black uppercase">Events</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-base">💼</span>
                                <div>
                                    <span className="font-extrabold text-xs text-black uppercase block leading-none">Support</span>
                                    <span className="text-[10px] text-gray-500 font-normal mt-0.5 block">Finance, Legal, etc.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 2: MAIN INTERACTIVE SERVICE PORTAL (TAB SWITCHER) */}
                <section id="coworking-portal" className="space-y-6 pt-2">

                    {/* SUB-NAV TABS */}
                    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
                        {[
                            { id: 'apply', label: 'Accessing Co-working' },
                            { id: 'faqs', label: 'Space Use FAQs' },
                            { id: 'floorplan', label: 'Live desk availability' },
                            { id: 'stock-alert', label: 'Report Low Stock & Maintenance' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-5 py-3 text-xs font-bold uppercase tracking-wider rounded-sm transition-all duration-150 cursor-pointer ${activeTab === tab.id
                                    ? 'bg-black text-[#EAD64D] shadow-xs'
                                    : 'bg-white text-gray-700 hover:bg-neutral-100 border border-gray-200'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ============================================================== */}
                    {/* TAB 1: ACCESSING CO-WORKING (FORM & PIPELINE TRACKER)          */}
                    {/* ============================================================== */}
                    {activeTab === 'apply' && (
                        <div className="animate-in fade-in duration-200 space-y-6">

                            {submitted ? (
                                <div className="bg-white border border-gray-200 p-12 text-center space-y-6 shadow-xs rounded-sm max-w-xl mx-auto my-8">
                                    <div className="inline-block bg-[#EAD64D] p-3 rounded-full text-2xl">🚀</div>
                                    <h2 className="text-2xl font-extrabold tracking-tight text-black">Application Received!</h2>
                                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed font-normal">
                                        Your Founders In Residence application has been logged. <strong>Tamara Berryman</strong> and the operations team will process your swipe card access and desk allocation shortly.
                                    </p>
                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={handleSkipToFaqs}
                                            className="bg-[#EAD64D] text-black px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-black hover:text-white transition-colors cursor-pointer"
                                        >
                                            View FAQs & Resident Resources →
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">

                                    {/* TOP INTERACTIVE ACCESS PIPELINE & STATUS SEARCH ENGINE */}
                                    <div className="bg-white border border-gray-200 p-6 shadow-xs rounded-sm space-y-6">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 pb-4">
                                            <div>
                                                <h2 className="text-xl font-extrabold tracking-tight text-black mt-1">
                                                    Check the progress of your access request.
                                                </h2>
                                                <p className="text-xs text-gray-500 font-normal">
                                                    Search your name to see how your access request is progressing.
                                                </p>
                                            </div>

                                            {/* SEARCH INPUT FORM */}
                                            <form onSubmit={handleStatusSearch} className="flex gap-2 w-full sm:w-auto">
                                                <input
                                                    type="text"
                                                    value={statusSearchQuery}
                                                    onChange={(e) => setStatusSearchQuery(e.target.value)}
                                                    placeholder="Search your name..."
                                                    className="p-2.5 border border-gray-300 text-xs font-semibold rounded-xs outline-none focus:border-black text-black w-full sm:w-64 bg-neutral-50"
                                                />
                                                <button
                                                    type="submit"
                                                    className="bg-black text-[#EAD64D] font-extrabold px-4 py-2.5 text-xs uppercase tracking-wider rounded-xs hover:bg-[#EAD64D] hover:text-black transition-colors cursor-pointer shrink-0"
                                                >
                                                    Search
                                                </button>
                                            </form>
                                        </div>

                                        {/* PIPELINE PROGRESS BAR */}
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                                {pipelineStages.map((stage, idx) => {
                                                    const activeIndex = matchedRecord ? matchedRecord.stageIndex : -1;
                                                    const isDone = idx < activeIndex;
                                                    const isCurrent = idx === activeIndex;

                                                    return (
                                                        <div
                                                            key={stage.title}
                                                            className={`p-3 border text-left flex flex-col justify-between rounded-xs transition-all ${isCurrent
                                                                ? 'border-black bg-[#EAD64D] text-black font-black shadow-xs ring-2 ring-black'
                                                                : isDone
                                                                    ? 'border-neutral-900 bg-neutral-900 text-white font-bold'
                                                                    : 'border-gray-200 bg-neutral-50 text-gray-400 font-medium'
                                                                }`}
                                                        >
                                                            <span className="text-[10px] font-mono uppercase">
                                                                Step 0{idx + 1} {isDone ? '✓' : isCurrent ? '⏱️' : ''}
                                                            </span>
                                                            <div className="mt-2">
                                                                <span className="text-[11px] leading-tight block uppercase">
                                                                    {stage.title}
                                                                </span>
                                                                <span className="text-[9px] opacity-75 block font-normal">
                                                                    {stage.subtitle}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* SEARCH MATCH RESULT BANNER */}
                                        {hasSearchedStatus && (
                                            <div className="animate-in fade-in duration-200 pt-2">
                                                {!matchedRecord ? (
                                                    <div className="bg-neutral-50 border border-dashed border-gray-300 p-4 text-center rounded-xs">
                                                        <span className="text-xs font-bold uppercase text-gray-700 block">No Active Application Found</span>
                                                        <span className="text-[11px] text-gray-500">
                                                            No request matches "{statusSearchQuery}". Submit a new request below if you haven't applied yet.
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="bg-neutral-900 text-white p-5 rounded-xs space-y-3">
                                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-neutral-800 pb-3 gap-2">
                                                            <div>
                                                                <span className="text-[10px] font-mono text-neutral-400 uppercase">
                                                                    {matchedRecord.category} • {matchedRecord.startup}
                                                                </span>
                                                                <h3 className="text-base font-black text-[#EAD64D] uppercase">
                                                                    {matchedRecord.name} ({matchedRecord.zid})
                                                                </h3>
                                                            </div>
                                                            <div className="bg-neutral-800 px-3 py-1.5 rounded-xs text-left sm:text-right border border-neutral-700">
                                                                <span className="text-[9px] font-mono text-neutral-400 block uppercase">Current Stage</span>
                                                                <span className="text-xs font-bold text-emerald-400 uppercase">{matchedRecord.stageLabel}</span>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                                                                <span>ETA: <strong className="text-white">{matchedRecord.eta}</strong></span>
                                                                <span>Updated: {matchedRecord.updatedAt}</span>
                                                            </div>
                                                            <p className="text-xs text-neutral-300 leading-relaxed pt-1 font-sans">
                                                                {matchedRecord.nextAction}
                                                            </p>
                                                        </div>

                                                        {matchedRecord.moodleUrl && (
                                                            <div className="pt-2">
                                                                <a
                                                                    href={matchedRecord.moodleUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-block bg-[#EAD64D] text-black text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xs hover:bg-white transition-colors"
                                                                >
                                                                    Complete Mandatory Safety Moodle →
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* MAIN FORM */}
                                    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-6 sm:p-8 space-y-8 shadow-xs rounded-sm">

                                        <header className="border-b border-gray-100 pb-4">
                                            <span className="bg-[#EAD64D] text-black font-extrabold text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-xs">
                                                UNSW Founders In Residence                                            </span>
                                            <h2 className="text-2xl font-extrabold tracking-tight text-black mt-2">                                                Access Request Form
                                            </h2>
                                            <p className="text-xs text-gray-500 font-normal mt-0.5">
                                                Submit this form to request access to MCIC Level 1 formal and informal Co-working Spaces.
                                            </p>
                                        </header>

                                        {/* SECTION 1: AFFILIATION */}
                                        <section className="space-y-4">
                                            <label className="text-xs font-extrabold uppercase tracking-wider text-black block border-b border-gray-100 pb-1">
                                                1. UNSW Affiliation
                                            </label>

                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">Relationship to UNSW *</label>
                                                <select
                                                    value={formData.relationshipToUNSW}
                                                    onChange={(e) => setFormData({ ...formData, relationshipToUNSW: e.target.value })}
                                                    className="w-full p-3 bg-white border border-gray-200 text-xs font-semibold rounded-sm outline-none cursor-pointer focus:border-black text-black"
                                                >
                                                    <option value="Student">Student</option>
                                                    <option value="Staff">Staff</option>
                                                    <option value="Alumni">Alumni</option>
                                                    <option value="Other">External / Other</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">Programs have you participated in</label>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                                    {['PFC', 'New Wave', 'Pre X', '10x', 'Other', 'None'].map((program) => (
                                                        <label key={program} className="flex items-center gap-2 p-2 border border-gray-100 rounded-xs hover:bg-neutral-50 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.programsParticipated.includes(program)}
                                                                onChange={() => handleProgramCheckbox(program)}
                                                                className="text-black border-gray-300 rounded-xs focus:ring-black"
                                                            />
                                                            <span className="font-medium text-black">{program}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">Referred by staff member</label>
                                                <input
                                                    type="text"
                                                    placeholder="Staff member name"
                                                    value={formData.referredByStaff}
                                                    onChange={(e) => setFormData({ ...formData, referredByStaff: e.target.value })}
                                                    className="w-full p-3 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none focus:border-black text-black"
                                                />
                                            </div>
                                        </section>

                                        {/* SECTION 2: STARTUP INFORMATION */}
                                        <section className="space-y-4">
                                            <label className="text-xs font-extrabold uppercase tracking-wider text-black block border-b border-gray-100 pb-1">
                                                2. Startup Information
                                            </label>

                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">Startup Name *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Startup / Venture Name"
                                                    value={formData.startupName}
                                                    onChange={(e) => setFormData({ ...formData, startupName: e.target.value })}
                                                    className="w-full p-3 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none focus:border-black text-black"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">Website or LinkedIn URL</label>
                                                <input
                                                    type="url"
                                                    placeholder="https://..."
                                                    value={formData.startupWebsite}
                                                    onChange={(e) => setFormData({ ...formData, startupWebsite: e.target.value })}
                                                    className="w-full p-3 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none focus:border-black text-black"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">Venture Stage</label>
                                                <select
                                                    value={formData.ventureStage}
                                                    onChange={(e) => setFormData({ ...formData, ventureStage: e.target.value })}
                                                    className="w-full p-3 bg-white border border-gray-200 text-xs font-semibold rounded-sm outline-none cursor-pointer focus:border-black text-black"
                                                >
                                                    <option>Idea Stage / Early Research</option>
                                                    <option>Minimum Viable Product (MVP)</option>
                                                    <option>In-Market / Active Users</option>
                                                    <option>Scaling / Funded Startup</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">Brief Description of what you are building *</label>
                                                <textarea
                                                    required
                                                    placeholder="Describe your product, core technology, and market focus..."
                                                    value={formData.projectDescription}
                                                    onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                                                    className="w-full p-3 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none h-20 resize-none focus:border-black text-black"
                                                />
                                            </div>
                                        </section>

                                        {/* SECTION 3: ACCESS & DESK REQUIREMENTS */}
                                        <section className="space-y-4">
                                            <label className="text-xs font-extrabold uppercase tracking-wider text-black block border-b border-gray-100 pb-1">
                                                3. Access & Desk Requirements
                                            </label>

                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">zID Status *</label>
                                                <select
                                                    value={formData.swipeCardAccessNeeded}
                                                    onChange={(e) => setFormData({ ...formData, swipeCardAccessNeeded: e.target.value })}
                                                    className="w-full p-3 bg-white border border-gray-200 text-xs font-semibold rounded-sm outline-none cursor-pointer focus:border-black text-black"
                                                >
                                                    <option value="Yes - Add to existing zID card">I am a CURRENT student or Staff member at UNSW. Please add access to my existing zID number.</option>
                                                    <option value="Yes - Issue new external access card">I was PREVIOUSLY a Student or Staff at UNSW. Please reactivate my zID number.</option>
                                                    <option value="Yes - Issue new external access card">I have NEVER been a Student or Staff at UNSW. Please Issue me a new zID.</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">Access Status *</label>
                                                <select
                                                    value={formData.accessStatusNeeded}
                                                    onChange={(e) => setFormData({ ...formData, accessStatusNeeded: e.target.value })}
                                                    className="w-full p-3 bg-white border border-gray-200 text-xs font-semibold rounded-sm outline-none cursor-pointer focus:border-black text-black"
                                                >
                                                    <option value="No">I already have Swipe Card access to the space, I am just here to request a desk allocation.</option>
                                                    <option value="I do not have access to the space and am requesting access.">I do not have access to the space and am requesting access.</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">Desk Allocation Request *</label>
                                                <select
                                                    value={formData.deskRequestType}
                                                    onChange={(e) => setFormData({ ...formData, deskRequestType: e.target.value })}
                                                    className="w-full p-3 bg-white border border-gray-200 text-xs font-semibold rounded-sm outline-none cursor-pointer focus:border-black text-black"
                                                >
                                                    <option value="No Desk Required (Hot Desks only)">No Desk Required (Hot Desks & informal co-working space only).</option>
                                                    <option value="Formal Co-Working Dedicated Desk Request">Formal Co-Working Dedicated Desk Request.</option>
                                                </select>
                                            </div>

                                            {formData.deskRequestType !== 'No Desk Required (Hot Desks only)' && (
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">Number of Desks Requested</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="10"
                                                        value={formData.desksRequestedCount}
                                                        onChange={(e) => setFormData({ ...formData, desksRequestedCount: parseInt(e.target.value) || 1 })}
                                                        className="w-full p-3 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none focus:border-black text-black"
                                                    />
                                                </div>
                                            )}
                                        </section>

                                        {/* SECTION 4: CONTACT */}
                                        <section className="space-y-4">
                                            <label className="text-xs font-extrabold uppercase tracking-wider text-black block border-b border-gray-100 pb-1">
                                                4. Personal Identification
                                            </label>

                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">Full Name *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Full name"
                                                    value={formData.fullName}
                                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                                    className="w-full p-3 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none focus:border-black text-black"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">UNSW zID (if applicable)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="z5555555"
                                                        value={formData.zID}
                                                        onChange={(e) => setFormData({ ...formData, zID: e.target.value })}
                                                        className="w-full p-3 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none focus:border-black text-black"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">Date of Birth *</label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={formData.dob}
                                                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                                        className="w-full p-3 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none focus:border-black text-black"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">Email *</label>
                                                    <input
                                                        type="email"
                                                        required
                                                        placeholder="email@example.com"
                                                        value={formData.email}
                                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                        className="w-full p-3 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none focus:border-black text-black"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">Phone Number *</label>
                                                    <input
                                                        type="tel"
                                                        required
                                                        placeholder="0400 000 000"
                                                        value={formData.phone}
                                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                        className="w-full p-3 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none focus:border-black text-black"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pt-1">
                                                <input
                                                    type="checkbox"
                                                    id="mainContact"
                                                    checked={formData.isMainContact}
                                                    onChange={(e) => setFormData({ ...formData, isMainContact: e.target.checked })}
                                                    className="w-4 h-4 text-black border-gray-300 rounded-xs focus:ring-black cursor-pointer"
                                                />
                                                <label htmlFor="mainContact" className="text-xs font-bold text-black cursor-pointer">
                                                    I am the primary contact for my startup team
                                                </label>
                                            </div>
                                        </section>

                                        {/* SECTION 5: TERMS */}
                                        <section className="space-y-4 pt-2 border-t border-gray-100">
                                            <div className="flex items-start gap-3 bg-neutral-50 p-4 border border-gray-200 rounded-sm">
                                                <input
                                                    type="checkbox"
                                                    id="terms"
                                                    required
                                                    checked={formData.agreeToTerms}
                                                    onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                                                    className="mt-0.5 w-4 h-4 text-black border-gray-300 rounded-xs focus:ring-black cursor-pointer"
                                                />
                                                <label htmlFor="terms" className="text-xs font-medium text-neutral-800 cursor-pointer leading-relaxed">
                                                    I agree to abide by the <a href="https://www.unsw.edu.au/governance/policy/policy-hub/codeofconductandvalues" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline">UNSW Code of Conduct ↗</a> while using the MCIC facility.
                                                </label>
                                            </div>
                                        </section>

                                        <button
                                            type="submit"
                                            className="w-full bg-[#EAD64D] text-black text-center font-bold py-4 text-xs uppercase tracking-wider rounded-sm hover:bg-black hover:text-white transition-colors cursor-pointer"
                                        >
                                            Submit Coworking Application →
                                        </button>

                                    </form>

                                </div>
                            )}
                        </div>
                    )}

                    {/* ============================================================== */}
                    {/* TAB 2: FAQs                      */}
                    {/* ============================================================== */}
                    {activeTab === 'faqs' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <section id="coworking-faqs" className="bg-white p-8 border border-gray-200 rounded-sm shadow-xs space-y-6">
                                <div className="border-b border-neutral-100 pb-4 flex flex-wrap items-center justify-between gap-2">
                                    <h2 className="text-xl font-extrabold uppercase text-black tracking-tight">
                                        Space Use FAQs
                                    </h2>
                                    <span className="text-xs text-gray-400 font-mono">
                                        Click item to expand / collapse
                                    </span>
                                </div>

                                <div className="divide-y divide-gray-200 text-xs">

                                    {/* 10. OPEN HOURS */}
                                    <div className="py-3 border-b border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq('hours')}
                                            className="w-full flex items-center justify-between text-left font-extrabold text-black uppercase text-xs hover:text-[#EAD64D] transition-colors py-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>⏰</span> Open Hours & Building Access
                                            </span>
                                            <span className="font-mono text-sm">{openFaqId === 'hours' ? '−' : '+'}</span>
                                        </button>

                                        {openFaqId === 'hours' && (
                                            <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                                <div className="flex flex-col gap-4">

                                                    {/* CATEGORY 1: PUBLIC HOURS */}
                                                    <div className="p-4 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-2">
                                                        <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                            <span>🏛️</span> Main Hilmer Building Entrance (Ground Floor Foyer)
                                                        </div>
                                                        <ul className="space-y-1.5 text-neutral-600 text-xs">
                                                            <li>
                                                                <strong>Public Hours:</strong> Open to the public (no swipe card required) from <strong>7:30 AM – 7:30 PM</strong>.
                                                            </li>
                                                            <li>
                                                                <strong>After-Hours & Shutdowns:</strong> Outside of public hours, during public holidays, and over the Christmas break, main doors remain locked. Swipe card access is required to enter, providing 24/7 access to approved users.
                                                            </li>
                                                        </ul>
                                                    </div>

                                                    {/* CATEGORY 2: RESIDENT WORKSPACE ACCESS */}
                                                    <div className="p-4 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-2">
                                                        <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                            <span>🚀</span> Level 1 Founders Coworking Spaces
                                                        </div>
                                                        <ul className="space-y-1.5 text-neutral-600 text-xs">
                                                            <li>
                                                                <strong>Access:</strong> Open <strong>24/7</strong> exclusively to users who have been granted approved swipe card access.
                                                            </li>
                                                        </ul>
                                                    </div>

                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* GETTING HERE & LOCATION */}
                                    <div className="py-3 border-b border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq('getting-here')}
                                            className="w-full flex items-center justify-between text-left font-extrabold text-black uppercase text-xs hover:text-[#EAD64D] transition-colors py-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>📍</span> Location & Getting Here
                                            </span>
                                            <span className="font-mono text-sm">{openFaqId === 'getting-here' ? '−' : '+'}</span>
                                        </button>

                                        {openFaqId === 'getting-here' && (
                                            <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                                <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3">
                                                    <h4 className="font-extrabold text-sm text-black tracking-tight">
                                                        Michael Crouch Innovation Centre (MCIC)
                                                    </h4>
                                                    <p className="text-neutral-600 text-xs leading-relaxed">
                                                        Hilmer Building (E10), Ground Floor<br />
                                                        UNSW Sydney, Gate 2 Anzac Parade
                                                    </p>
                                                    <div className="pt-2">
                                                        <a
                                                            href="https://unswfounders.com/visit-us"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-block bg-black text-[#EAD64D] font-extrabold px-4 py-2 text-xs uppercase tracking-wider rounded-xs hover:bg-[#EAD64D] hover:text-black transition-colors cursor-pointer"
                                                        >
                                                            More info on getting here ↗
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 4. BUSINESS ADDRESS */}
                                    <div className="py-3 border-b border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq('address')}
                                            className="w-full flex items-center justify-between text-left font-extrabold text-black uppercase text-xs hover:text-[#EAD64D] transition-colors py-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>🏠</span> Your New Business Address
                                            </span>
                                            <span className="font-mono text-sm">{openFaqId === 'address' ? '−' : '+'}</span>
                                        </button>

                                        {openFaqId === 'address' && (
                                            <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                                <div className="p-4 border border-gray-200 bg-neutral-50/40 rounded-sm shadow-xs space-y-3">
                                                    <div className="space-y-1">
                                                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                                                            Main Business Address
                                                        </span>
                                                        <p className="text-xs text-gray-700 font-medium leading-relaxed">
                                                            Michael Crouch Innovation Centre (G22), Hilmer Building (E10),<br />
                                                            Gate 2, UNSW, High Street, Kensington, NSW, 2052
                                                        </p>
                                                    </div>

                                                    <div className="pt-2 border-t border-gray-200/60 space-y-1">
                                                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                                                            Name of Lessee or Owner
                                                        </span>
                                                        <p className="text-xs text-gray-700 font-medium">
                                                            University of New South Wales
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* PARKING, EV & BICYCLES */}
                                    <div className="py-3 border-b border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq('parking')}
                                            className="w-full flex items-center justify-between text-left font-extrabold text-black uppercase text-xs hover:text-[#EAD64D] transition-colors py-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>🏍️</span> Parking, EV Charging & Bicycle Facilities
                                            </span>
                                            <span className="font-mono text-sm">{openFaqId === 'parking' ? '−' : '+'}</span>
                                        </button>

                                        {openFaqId === 'parking' && (
                                            <div className="p-6 bg-white text-xs space-y-6 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                                    {/* CAR PARKING & CELLOPARK APP */}
                                                    <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-4 flex flex-col justify-between">
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                                <span>🚗</span> Car Parking & Rates
                                                            </div>

                                                            {/* STAFF PARKING */}
                                                            <div className="space-y-1.5">
                                                                <span className="font-bold text-neutral-900 block text-xs">Parking for Staff:</span>
                                                                <p className="text-neutral-600 text-xs">
                                                                    UNSW Staff are able to choose between <strong>annual permits</strong> (via the UNSW vPermit website) or <strong>pay-as-you-go</strong> Parking Sessions (via the CellOPark App).
                                                                </p>
                                                                <p className="text-neutral-600 text-xs">
                                                                    Having either an annual 'vPermit' or an active parking session on CellOPark allows staff to park in any bay marked <strong>'UNSW Permit Holder'</strong>.
                                                                </p>
                                                            </div>

                                                            {/* STUDENTS & VISITORS PARKING */}
                                                            <div className="space-y-1.5 pt-2 border-t border-neutral-200/60">
                                                                <span className="font-bold text-neutral-900 block text-xs">For Students & Visitors:</span>
                                                                <p className="text-neutral-600 text-xs">
                                                                    All-day parking is available to Students and Visitors at the top level of Botany Street multi-storey Carpark, entry via Gate 11. There are short-term 2P or 4P timed parking bays in the carparks nearby Gates 2, 8 (off High Street); Gate 11 Apron (off Botany Street) and at the Western Campus.
                                                                </p>
                                                                <p className="text-neutral-500 text-[11px] italic">
                                                                    Payment is required on arrival and can be made by downloading the CellOPark App. Or Pay-By-Plate meter. Parking is <strong>free between 7.30 pm and 7.30 am on weekdays, and all day on weekends and public holidays</strong>.
                                                                </p>
                                                            </div>

                                                            {/* CELLOPARK SETUP STEPS */}
                                                            <div className="p-3 bg-white border border-neutral-200/80 rounded-xs space-y-1.5">
                                                                <span className="font-bold text-neutral-900 block uppercase text-[10px]">CellOPark App Setup:</span>
                                                                <ol className="list-decimal pl-4 text-neutral-600 space-y-1 text-[11px]">
                                                                    <li>Download the CellOPark app on your phone.</li>
                                                                    <li>Have your zID and email address in your profile on the app so that it recognises you as staff.</li>
                                                                    <li>Register your vehicle registration number and your credit card details.</li>
                                                                    <li>Always select <strong>'2052033 UNSW Permit Holder Parking'</strong> zone on the app every time you drive to campus and park in any "UNSW Permit Holder" bay on campus (Gate 11 or Gate 14 carpark).</li>
                                                                    <li>Make zone <strong className="font-mono text-black">2052033</strong> your favourite by pressing the STAR.</li>
                                                                    <li>It is important that when using the 'pay-as-you-go' app that you enter your vehicle registration details correctly.</li>
                                                                    <li>Press <strong>START</strong> on arrival each day you drive to campus. You are not required to press STOP as it is a flat rate $8 regardless of how long you stayed.</li>
                                                                </ol>
                                                            </div>

                                                            {/* EV CHARGING */}
                                                            <div className="p-3 bg-white border border-neutral-200/80 rounded-xs space-y-1">
                                                                <span className="font-bold text-neutral-900 block uppercase text-[10px]">⚡ Can I charge an electric vehicle?</span>
                                                                <p className="text-neutral-600 text-[11px]">
                                                                    Yes! There are six electric vehicle charging stations located on the rooftop level of the Botany Street car park.
                                                                </p>
                                                                <a href="https://www.estate.unsw.edu.au/unsw-solar-powered-electric-vehicle-charging-stations" target="_blank" rel="noopener noreferrer" className="text-neutral-600 underline hover:text-black">Charging stations ↗</a>

                                                            </div>
                                                        </div>

                                                        {/* CAR & EV LINKS */}
                                                        <div className="pt-3 border-t border-neutral-200/60 space-y-1.5 text-[11px]">
                                                            <span className="font-bold text-neutral-900 uppercase text-[9px] block">Links:</span>
                                                            <div className="flex flex-col gap-1 text-xs">
                                                                <a href="https://www.estate.unsw.edu.au/getting-here/parking-campus" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline hover:text-[#EAD64D]">Parking at UNSW ↗</a>
                                                                <a href="https://www.estate.unsw.edu.au/getting-here/parking/parking-rates" target="_blank" rel="noopener noreferrer" className="text-neutral-600 underline hover:text-black">Parking rates ↗</a>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* MOTORCYCLES, BICYCLES & HELPFUL LINKS */}
                                                    <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-4 flex flex-col justify-between">
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                                <span>🏍️</span> Motorbike & Bicycle Parking
                                                            </div>

                                                            {/* MOTORBIKE */}
                                                            <div className="space-y-1.5">
                                                                <span className="font-bold text-neutral-900 block text-xs">Motorbike parking:</span>
                                                                <p className="text-neutral-600 text-xs">
                                                                    Motorcycle parking is free and only valid when parked within areas marked <strong>'Motorcycle Bay'</strong> available on Union Rd behind Hilmer Building, next to the UNSW Law building. The parking of motorcycles is restricted to these designated areas only.
                                                                </p>
                                                                <div className="pt-1 text-xs">
                                                                    <a href="https://maps.app.goo.gl/BSSzkkA6HKfULorH8" target="_blank" rel="noopener noreferrer" className="text-neutral-600 underline hover:text-black">Pinned location of Union Rd motorcycle and bicycle parking ↗</a>
                                                                </div>
                                                            </div>

                                                            {/* BICYCLE PARKING */}
                                                            <div className="space-y-2 pt-2 border-t border-neutral-200/60">
                                                                <span className="font-bold text-neutral-900 block text-xs">Bicycle parking:</span>
                                                                <p className="text-neutral-600 text-xs">
                                                                    Bicycle parking is only available in designated bicycle racks on campus.
                                                                </p>

                                                                {/* SECURITY WARNING ALERT BOX */}
                                                                <div className="p-3 bg-red-50/60 border border-red-200 rounded-xs space-y-2 mt-2">
                                                                    <div className="flex items-center gap-1.5 text-red-900 font-bold uppercase text-[10px] tracking-wide">
                                                                        <span>⚠️</span> Security & Impound Warning
                                                                    </div>
                                                                    <ul className="space-y-1 text-red-700 text-[11px] leading-relaxed font-medium">
                                                                        <li>
                                                                            • Bikes attached to rails, light poles, or fences will be tagged with a warning by Campus Security.
                                                                        </li>
                                                                        <li>
                                                                            • Bikes not removed within 48 hours will be impounded by Campus Security.
                                                                        </li>
                                                                        <li className="pt-1 border-t border-red-200/50 font-semibold text-red-900">
                                                                            • If your bike is stolen, report it immediately to Campus Security Services on <strong>9385 6000</strong>.
                                                                        </li>
                                                                    </ul>
                                                                </div>

                                                                <div className="pt-1 text-xs">
                                                                    <a href="https://maps.app.goo.gl/BSSzkkA6HKfULorH8" target="_blank" rel="noopener noreferrer" className="text-neutral-600 underline hover:text-black">Pinned location of Union Rd motorcycle and bicycle parking ↗</a>
                                                                </div>
                                                                <div className="pt-1 text-xs">
                                                                    <a href="https://www.estate.unsw.edu.au/getting-here/maps?id=514c6a097d4c475abd7f391b5c69b1e2" target="_blank" rel="noopener noreferrer" className="text-neutral-600 underline hover:text-black">Location of bicycle racks ↗</a>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* SUPPORT CONTACT & UNSURE SECTION */}
                                                        <div className="pt-3 border-t border-neutral-200/60 space-y-1.5 text-[11px]">
                                                            <span className="font-bold text-neutral-900 uppercase text-[9px] block">Unsure?</span>
                                                            <p className="text-neutral-600 text-xs">
                                                                Please contact Security and Traffic Management: <a href="mailto:parking@unsw.edu.au" className="font-mono font-bold text-black underline">parking@unsw.edu.au</a>
                                                            </p>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* FAQ 1: INFORMAL COWORKING & STANDARD ACCESS */}
                                    <div className="py-3 border-b border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq('standard-access')}
                                            className="w-full flex items-center justify-between text-left font-extrabold text-black uppercase text-xs hover:text-[#EAD64D] transition-colors py-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>🔑</span> What desks does my access get me?
                                            </span>
                                            <span className="font-mono text-sm">{openFaqId === 'standard-access' ? '−' : '+'}</span>
                                        </button>

                                        {openFaqId === 'standard-access' && (
                                            <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                                <div className="p-4 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3">
                                                    <p className="text-neutral-700 text-xs leading-relaxed">
                                                        Standard access allows you to use the Level 1 <strong>Informal Coworking Space</strong> in Founders Place and Formal Coworking Space <strong>Hotdesks</strong> anytime without booking.
                                                    </p>
                                                    <div className="p-3 bg-white border border-neutral-200 rounded-xs space-y-1">
                                                        <span className="font-extrabold text-black uppercase text-[10px] block">What is Provided in each Spaces?</span>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                                            <div className="space-y-1">
                                                                <span className="font-bold text-neutral-900 block text-[11px]">Informal Coworking (Casual open seating)</span>
                                                                <ul className="space-y-0.5 text-neutral-600 text-[11px]">
                                                                    <li>• Group desks</li>
                                                                    <li>• Office chairs</li>
                                                                </ul>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="font-bold text-neutral-900 block text-[11px]">Formal Coworking (Hotdesks)</span>
                                                                <ul className="space-y-0.5 text-neutral-600 text-[11px]">
                                                                    <li>• Desk</li>
                                                                    <li>• Office chair</li>
                                                                    <li>• Monitor, Mouse & Keyboard</li>
                                                                </ul>
                                                            </div>

                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* FAQ: ALLOCATED DESKS & TEAM PODS */}
                                    <div className="py-3 border-b border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq('allocated-desks')}
                                            className="w-full flex items-center justify-between text-left font-extrabold text-black uppercase text-xs hover:text-[#EAD64D] transition-colors py-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>💼</span> Allocated Desks and Team Pods
                                            </span>
                                            <span className="font-mono text-sm">{openFaqId === 'allocated-desks' ? '−' : '+'}</span>
                                        </button>

                                        {openFaqId === 'allocated-desks' && (
                                            <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                                <div className="space-y-4">

                                                    {/* HOW TO REQUEST & EQUIPMENT COMBINED CARD */}
                                                    <div className="p-4 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3">
                                                        <span className="font-bold text-neutral-900 uppercase text-[10px] tracking-wider block">How to Request an Allocated Desk or Team Pod:</span>
                                                        <p className="text-neutral-700 text-xs">
                                                            If you want to join the waitlist for an allocated desk (or team pod) in the Formal Coworking Space:
                                                        </p>
                                                        <ul className="list-disc pl-4 space-y-1 text-neutral-700">
                                                            <li>Complete the <strong>Access & Desk Requirements Form</strong>.</li>
                                                            <li>Select <strong>"Formal Co-Working Dedicated Desk Request"</strong> in the "Desk Allocation Request" question.</li>
                                                            <li>Specify the number of desks requested.</li>
                                                        </ul>

                                                        <div className="pt-2 border-t border-neutral-200/60 space-y-1.5">
                                                            <span className="font-bold text-neutral-900 uppercase text-[10px] tracking-wider block">Allocated Desk (Formal Coworking) Equipment:</span>
                                                            <ul className="space-y-0.5 text-neutral-600 text-[11px]">
                                                                <li>• Desk & Office chair only</li>
                                                                <li>• Provide your own monitor, computer, mouse, keyboard, etc.</li>
                                                            </ul>
                                                        </div>
                                                    </div>

                                                    {/* NOTIFICATION POLICY BOX */}
                                                    <div className="p-4 border border-amber-200 bg-amber-50/50 rounded-xs space-y-1">
                                                        <span className="font-bold text-amber-900 uppercase text-[10px] tracking-wider block">Desks are allocated based on need and attendance.</span>
                                                        <p className="text-amber-900/90 text-xs leading-relaxed">
                                                            Regular presence in the Founders space will prioritise your request; infrequent use may result in desk reassignment or relocation.
                                                        </p>
                                                    </div>

                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. WI-FI ACCESS */}
                                    <div className="py-3 border-b border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq('wifi')}
                                            className="w-full flex items-center justify-between text-left font-extrabold text-black uppercase text-xs hover:text-[#EAD64D] transition-colors py-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>🌐</span> Wi-Fi Access
                                            </span>
                                            <span className="font-mono text-sm">{openFaqId === 'wifi' ? '−' : '+'}</span>
                                        </button>

                                        {openFaqId === 'wifi' && (
                                            <div className="p-6 bg-white text-xs space-y-6 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                                    {/* LEFT BOX: STAFF & STUDENTS (EDUROAM) */}
                                                    <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3 flex flex-col justify-between">
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                                <span>🎓</span> For those with a zID (Eduroam)
                                                            </div>
                                                            <p className="text-neutral-600 text-xs leading-relaxed">
                                                                The <strong>Eduroam</strong> network provides Internet access to staff and students visiting from UNSW or other participating educational institutions globally.
                                                            </p>
                                                            <p className="text-neutral-500 text-[11px] leading-relaxed">
                                                                If you intend on using Eduroam at a participating University and haven't used it before, you should setup and test Eduroam while still on campus at UNSW.
                                                            </p>

                                                            <div className="p-3 bg-white border border-neutral-200 rounded-xs space-y-1 font-mono text-[11px]">
                                                                <div><span className="text-neutral-400 uppercase text-[9px] font-sans font-bold block">Network Name:</span> eduroam</div>
                                                                <div><span className="text-neutral-400 uppercase text-[9px] font-sans font-bold block">Username:</span> zID@ad.unsw.edu.au</div>
                                                                <div><span className="text-neutral-400 uppercase text-[9px] font-sans font-bold block">Password:</span> zID Password</div>
                                                            </div>
                                                        </div>

                                                        {/* HELPFUL LINKS */}
                                                        <div className="pt-2 border-t border-neutral-200/60 space-y-1 text-[11px]">
                                                            <span className="font-bold text-neutral-900 uppercase text-[9px] block">Device Setup Guides:</span>
                                                            <div className="flex flex-wrap gap-2">
                                                                <a href="https://www.unsw.edu.au/get-online" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline hover:text-[#EAD64D]">Staff & Students Access Support Page ↗</a>
                                                                <a href="https://www.unsw.edu.au/get-online/bring-your-own-device-ios" target="_blank" rel="noopener noreferrer" className="text-neutral-500 underline hover:text-black">iOS ↗</a>
                                                                <a href="https://www.unsw.edu.au/get-online/standard-unsw-android-device" target="_blank" rel="noopener noreferrer" className="text-neutral-500 underline hover:text-black">Android ↗</a>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* RIGHT BOX: GUESTS & VISITORS */}
                                                    <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-4 flex flex-col justify-between">
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                                <span>🌐</span> External Visitors & Guests
                                                            </div>
                                                            <p className="text-neutral-600 text-xs">
                                                                Visitors can access Wi-Fi at UNSW by connecting to the <strong>UNSW Guest</strong> network:
                                                            </p>

                                                            <ol className="space-y-3 text-neutral-600 text-xs">
                                                                <li className="space-y-1">
                                                                    <strong>Step 1</strong> — Navigate to Wi-Fi settings and connect to the <strong>'UNSW Guest'</strong> Network.
                                                                </li>

                                                                <li className="space-y-1">
                                                                    <strong>Step 2</strong> — In the Captive Wi-Fi pop-up screen:
                                                                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-neutral-500 my-1">
                                                                        <li>Type your Full Name and Email Address in the fields provided.</li>
                                                                        <li>Tick the checkbox to accept the terms and conditions.</li>
                                                                        <li>Tap <strong>Submit</strong>.</li>
                                                                    </ul>
                                                                    <p className="text-[11px] text-neutral-500 italic">You will see a welcome screen confirming your temporary access.</p>
                                                                    {/* Step 2 Image Placeholder */}
                                                                    <img src="/images/wifi/step2.png" alt="Step 2 - Captive Portal Registration" className="mt-2 rounded-xs border border-neutral-200 max-h-36 object-contain bg-white p-1" />
                                                                </li>

                                                                <li className="space-y-1">
                                                                    <strong>Step 3</strong> — An email from <code className="bg-white px-1 border rounded-xs text-[10px]">guestwireless@unsw.edu.au</code> will be sent to your email address. Navigate to your email message.
                                                                    <p className="text-[10px] text-neutral-400 font-medium">Note: If you cannot find the email in your inbox, check your junk or spam folder.</p>
                                                                </li>

                                                                <li className="space-y-1">
                                                                    <strong>Step 4</strong> — In the email, select <strong>click here</strong>.
                                                                    {/* Step 4 Image Placeholder */}
                                                                    <img src="/images/wifi/step4.png" alt="Step 4 - Activation Email Link" className="mt-2 rounded-xs border border-neutral-200 max-h-36 object-contain bg-white p-1" />
                                                                </li>

                                                                <li className="space-y-1">
                                                                    <strong>Step 5</strong> — You will then be prompted to Confirm or Reject access. Select <strong>Confirm</strong>.
                                                                    {/* Step 5 Image Placeholder */}
                                                                    <img src="/images/wifi/step5.png" alt="Step 5 - Confirm Access" className="mt-2 rounded-xs border border-neutral-200 max-h-36 object-contain bg-white p-1" />
                                                                </li>
                                                            </ol>
                                                        </div>

                                                        {/* GUEST HELPFUL LINK */}
                                                        <div className="pt-2 border-t border-neutral-200/60 text-[11px]">
                                                            <a href="https://www.unsw.edu.au/get-online/guest-access" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline hover:text-[#EAD64D]">
                                                                UNSW Guest Access Support Page ↗
                                                            </a>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. PRINTING */}
                                    <div className="py-3 border-b border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq('printing')}
                                            className="w-full flex items-center justify-between text-left font-extrabold text-black uppercase text-xs hover:text-[#EAD64D] transition-colors py-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>🖨️</span> Printing Instructions
                                            </span>
                                            <span className="font-mono text-sm">{openFaqId === 'printing' ? '−' : '+'}</span>
                                        </button>

                                        {openFaqId === 'printing' && (
                                            <div className="p-6 bg-white text-xs space-y-6 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">

                                                {/* LOCATION & ACCESS BANNER */}
                                                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xs space-y-2.5">

                                                    <div className="space-y-2 text-xs text-neutral-700 leading-relaxed font-normal">
                                                        <p>
                                                            <strong className="text-black uppercase text-[10px] tracking-wider block">Location:</strong>
                                                            The printer is located in the copy room within the formal coworking space (between David Burt’s office and the Kitchen). All Founders have free printing access.
                                                        </p>
                                                        <p className="pt-1.5 border-t border-neutral-200/60">
                                                            <strong className="text-black uppercase text-[10px] tracking-wider block">Use:</strong>
                                                            Print by inserting a USB drive directly into the printer, or follow the network setup steps below to connect your device.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* OS SETUP GRID */}
                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                                                    {/* WINDOWS / PC (WITH zID) */}
                                                    <div className="p-4 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3">
                                                        <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px] border-b border-neutral-200 pb-2">
                                                            <span>💻</span> Windows / PC (with zID)
                                                        </div>
                                                        <ol className="space-y-2 text-xs text-neutral-700">
                                                            <li><strong>Step 1:</strong> Click on the <strong>Start Menu</strong>.</li>
                                                            <li><strong>Step 2:</strong> Search and launch <strong>Run</strong>.</li>
                                                            <li>
                                                                <strong>Step 3:</strong> Enter the following network path:
                                                                <code className="block my-1 p-2 bg-white border border-neutral-200 rounded-xs font-mono text-[10px] break-all select-all">
                                                                    \\infpwps009.ad.unsw.edu.au\MCIC-LC001
                                                                </code>
                                                            </li>
                                                            <li><strong>Step 4:</strong> Click <strong>OK</strong>.</li>
                                                        </ol>
                                                        <p className="text-[11px] text-neutral-500 italic bg-white p-2 border rounded-xs">
                                                            Note: If prompted to sign in, use <code>ADUNSW\zID</code> and your zID password.
                                                        </p>
                                                    </div>

                                                    {/* MAC (WITH zID) */}
                                                    <div className="p-4 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3">
                                                        <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px] border-b border-neutral-200 pb-2">
                                                            <span>🍎</span> Mac (with zID)
                                                        </div>
                                                        <ol className="space-y-3 text-xs text-neutral-700">
                                                            <li>
                                                                <strong>Step 1:</strong> Go to the Apple logo ➔ <strong>System Settings</strong> ➔ <strong>Printers & Scanners</strong>.
                                                                <img src="/images/printer/mac-step1.png" alt="Mac Step 1" className="mt-1 rounded-xs border border-neutral-200 max-h-28 object-contain bg-white p-1" />
                                                            </li>
                                                            <li>
                                                                <strong>Step 2:</strong> Remove old printer (if any). Click on the old printer, press <strong>Remove Printer</strong>, then confirm.
                                                                <p className="text-[10px] text-red-600 font-medium">⚠️ If you skip this, the setup will fail.</p>
                                                                <img src="/images/printer/mac-step2.png" alt="Mac Step 2" className="mt-1 rounded-xs border border-neutral-200 max-h-28 object-contain bg-white p-1" />
                                                            </li>
                                                            <li>
                                                                <strong>Step 3:</strong> Click <strong>Add Printer, Scanner or Fax...</strong> and enter your Mac admin password if prompted.
                                                                <img src="/images/printer/mac-step3.png" alt="Mac Step 3" className="mt-1 rounded-xs border border-neutral-200 max-h-28 object-contain bg-white p-1" />
                                                            </li>
                                                            <li>
                                                                <strong>Step 4:</strong> Select the <strong>IP icon</strong>, enter details, and click <strong>Add</strong>. Confirm defaults by clicking <strong>OK</strong>.
                                                                <img src="/images/printer/mac-step4.png" alt="Mac Step 4" className="mt-1 rounded-xs border border-neutral-200 max-h-28 object-contain bg-white p-1" />
                                                            </li>
                                                            <li><strong>Step 5:</strong> Perform a test print!</li>
                                                        </ol>
                                                    </div>

                                                    {/* MAC / PC (NO zID - TCP/IP SETUP) */}
                                                    <div className="p-4 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3">
                                                        <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px] border-b border-neutral-200 pb-2">
                                                            <span>🔌</span> Mac / PC (NO zID)
                                                        </div>
                                                        <ol className="space-y-3 text-xs text-neutral-700">
                                                            <li>
                                                                <strong>Step 1:</strong> Download & install the Apeos C4570 driver:
                                                                <a
                                                                    href="https://support-fb.fujifilm.com/setupDriverForm.do?pid=APC4570&ctry_code=ID&lang_code=en&d_lang=en"
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="block text-black font-bold underline mt-1 truncate"
                                                                >
                                                                    Download Apeos C4570 Driver ↗
                                                                </a>
                                                                <img src="/images/printer/nozid-step1.png" alt="No zID Step 1" className="mt-1 rounded-xs border border-neutral-200 max-h-28 object-contain bg-white p-1" />
                                                            </li>
                                                            <li>
                                                                <strong>Step 2:</strong> Select Wireless or Ethernet and press <strong>Next</strong>.
                                                                <img src="/images/printer/nozid-step2.png" alt="No zID Step 2" className="mt-1 rounded-xs border border-neutral-200 max-h-28 object-contain bg-white p-1" />
                                                            </li>
                                                            <li>
                                                                <strong>Step 3:</strong> Click <strong>Add printer manually</strong> and press <strong>Next</strong>.
                                                                <img src="/images/printer/nozid-step3.png" alt="No zID Step 3" className="mt-1 rounded-xs border border-neutral-200 max-h-28 object-contain bg-white p-1" />
                                                            </li>
                                                            <li>
                                                                <strong>Step 4:</strong> Select driver & enter IP address:
                                                                <code className="block my-1 p-1.5 bg-white border rounded-xs font-mono text-[10px]">129.94.185.70</code>
                                                                <img src="/images/printer/nozid-step4.png" alt="No zID Step 4" className="mt-1 rounded-xs border border-neutral-200 max-h-28 object-contain bg-white p-1" />
                                                            </li>
                                                            <li>
                                                                <strong>Step 5:</strong> Press <strong>Next</strong>.
                                                                <img src="/images/printer/nozid-step5.png" alt="No zID Step 5" className="mt-1 rounded-xs border border-neutral-200 max-h-28 object-contain bg-white p-1" />
                                                            </li>
                                                            <li>
                                                                <strong>Step 6:</strong> Confirm setup screen and press <strong>Install</strong>.
                                                                <img src="/images/printer/nozid-step6.png" alt="No zID Step 6" className="mt-1 rounded-xs border border-neutral-200 max-h-28 object-contain bg-white p-1" />
                                                            </li>
                                                            <li><strong>Step 7:</strong> Check <em>Printers and Scanners</em> to confirm installation.</li>
                                                        </ol>
                                                    </div>

                                                </div>

                                                {/* FOOTER LINKS & SUPPORT */}
                                                <div className="pt-3 border-t border-neutral-200 flex flex-wrap justify-between items-center gap-3 text-[11px]">
                                                    <a href="https://www.myit.unsw.edu.au/printing-staff" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline hover:text-[#EAD64D]">
                                                        For printing at other locations around UNSW, visit the Staff Printing Guide ↗
                                                    </a>
                                                    <span className="text-neutral-500">
                                                        Need help? Contact IT: <a href="mailto:itservicecentre@unsw.edu.au" className="font-mono font-bold text-black underline">itservicecentre@unsw.edu.au</a>
                                                    </span>
                                                </div>

                                            </div>
                                        )}
                                    </div>

                                    {/* 4. MEETING ROOMS & SOUNDPROOF MEETING BOOTHS */}
                                    <div className="py-3 border-b border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq('meeting-rooms')}
                                            className="w-full flex items-center justify-between text-left font-extrabold text-black uppercase text-xs hover:text-[#EAD64D] transition-colors py-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>📅</span> Meeting Rooms & Soundproof Booths
                                            </span>
                                            <span className="font-mono text-sm">{openFaqId === 'meeting-rooms' ? '−' : '+'}</span>
                                        </button>

                                        {openFaqId === 'meeting-rooms' && (
                                            <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">

                                                {/* POLICY CONTAINER */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* SOUNDPROOF BOOTHS */}
                                                    <div className="p-4 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-1.5">
                                                        <div className="flex items-center gap-1.5 text-neutral-900 font-bold text-xs">
                                                            <span>🚪</span> Soundproof Booths
                                                        </div>
                                                        <p className="text-neutral-600 text-[11px] leading-relaxed">
                                                            Two Soundproof Booths are located in the Formal Coworking space on Level 1. These cannot be booked and operate on a <strong>first-come, first-served</strong> basis. Please be considerate of others who may want to use them.
                                                        </p>
                                                    </div>

                                                    {/* MEETING ROOMS - BROKEN INTO CONCISE STEPS */}
                                                    <div className="p-4 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-1.5">
                                                        <div className="flex items-center gap-1.5 text-neutral-900 font-bold text-xs">
                                                            <span>🏢</span> Meeting Room Bookings
                                                        </div>
                                                        <ul className="space-y-1 text-neutral-600 text-[11px] leading-relaxed">
                                                            <p>All meeting rooms must be booked in advance via Outlook. <strong>To add these rooms to your outlook to make bookings:</strong></p>
                                                            <li>• Copy the room name below and add it as a calendar in your Outlook</li>
                                                            <li>• Make a booking directly into the rooms calendar, or select it as a location from the dropdown menu in your calendar outlook meeting.</li>
                                                        </ul>
                                                        <p className="pt-0.5 text-[11px]  italic"><strong>Note: </strong>Your meeting room is confirmed only if you receive an "accepted" e-mail. You can also confirm by checking if the room responded "Yes" response in the meeting details, or if it blocked out your booking time as busy.</p>
                                                        <p className="text-neutral-600 text-[11px] leading-relaxed">
                                                            <strong>Contact MCIC@unsw.edu.au if you have any issues.</strong>
                                                        </p>


                                                    </div>
                                                </div>

                                                {/* OUTLOOK ROOM TABLE */}
                                                <div className="border border-neutral-200 rounded-xs overflow-hidden shadow-xs">
                                                    <table className="w-full text-left bg-white text-xs">
                                                        <thead className="bg-neutral-900 text-white font-bold uppercase text-[10px] tracking-wider border-b border-neutral-900">
                                                            <tr>
                                                                <th className="py-2.5 px-3 w-12 text-center">Lvl</th>
                                                                <th className="py-2.5 px-3">Room Name (on Outlook Calendar)</th>
                                                                <th className="py-2.5 px-3">Capacity</th>
                                                                <th className="py-2.5 px-3">Remarks</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-neutral-100 font-medium">
                                                            {outlookRooms.map((room, rIdx) => {
                                                                const prefix = "Kens HILMER E10 ";
                                                                const hasPrefix = room.code.startsWith(prefix);
                                                                const buildingPart = hasPrefix ? prefix : "";
                                                                const roomPart = hasPrefix ? room.code.slice(prefix.length) : room.code;

                                                                return (
                                                                    <tr key={rIdx} className="hover:bg-neutral-50/80 transition-colors">
                                                                        <td className="py-2.5 px-3 font-mono font-bold text-center text-neutral-900">
                                                                            {room.lvl}
                                                                        </td>
                                                                        <td className="py-2.5 px-3 font-mono text-[11px] select-all">
                                                                            <span className="font-normal text-neutral-500">{buildingPart}</span>
                                                                            <span className="font-bold text-neutral-900">{roomPart}</span>
                                                                        </td>
                                                                        <td className="py-2.5 px-3">
                                                                            <span className="font-mono text-[10px] text-neutral-500 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded-xs">
                                                                                {room.seats}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-2.5 px-3 text-neutral-500 text-[11px] italic">
                                                                            {room.remarks || '—'}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. PARCEL & MAIL COLLECTION */}
                                    <div className="py-3 border-b border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq('mail')}
                                            className="w-full flex items-center justify-between text-left font-extrabold text-black uppercase text-xs hover:text-[#EAD64D] transition-colors py-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>📦</span> Mail & Parcel Deliveries
                                            </span>
                                            <span className="font-mono text-sm">{openFaqId === 'mail' ? '−' : '+'}</span>
                                        </button>

                                        {openFaqId === 'mail' && (
                                            <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                                    {/* LEFT BOX: REGULAR MAIL (LOCKER 118) */}
                                                    <div className="p-4 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3 flex flex-col justify-between">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                                <span>✉️</span> Standard Mail
                                                            </div>
                                                            <p className="text-neutral-600">
                                                                Standard mail will be delivered to <strong>Locker 118</strong> located in the corridor on the Ground Floor outside the MCIC.
                                                            </p>
                                                            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xs space-y-3">

                                                                {!isUnlocked ? (
                                                                    <form onSubmit={handleUnlockLockerCode} className="space-y-2 pt-1">
                                                                        <label className="text-[11px] font-medium text-neutral-600 block">
                                                                            Enter your zID to view the locker code:
                                                                        </label>
                                                                        <div className="flex gap-2">
                                                                            <input
                                                                                type="text"
                                                                                required
                                                                                placeholder="e.g. z5555555"
                                                                                value={userZid}
                                                                                onChange={(e) => setUserZid(e.target.value)}
                                                                                className="p-2 border border-neutral-300 bg-white text-xs font-mono rounded-xs outline-none focus:border-black text-black flex-1"
                                                                            />
                                                                            <button
                                                                                type="submit"
                                                                                className="bg-black text-[#EAD64D] font-extrabold px-3 py-2 text-xs uppercase tracking-wider rounded-xs hover:bg-[#EAD64D] hover:text-black transition-colors cursor-pointer shrink-0"
                                                                            >
                                                                                Reveal Code
                                                                            </button>
                                                                        </div>
                                                                    </form>
                                                                ) : (
                                                                    <div className="p-3 bg-white border border-emerald-300 rounded-xs space-y-1 animate-in fade-in duration-150">
                                                                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                                                                            ✓ Authenticated ({userZid})
                                                                        </span>
                                                                        <p className="text-neutral-700 text-xs">
                                                                            Combination Lock Code: <strong className="font-mono text-black bg-neutral-100 px-2 py-0.5 border border-neutral-200 rounded-xs text-sm">3010</strong>
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-xs text-[11px] text-amber-900 font-medium">
                                                            Checking the locker is your responsibility. Uncollected mail is returned to sender.
                                                        </div>
                                                    </div>

                                                    {/* RIGHT BOX: PARCEL DELIVERIES (LOADING BAY) */}
                                                    <div className="p-4 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3 flex flex-col justify-between">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                                <span>🚚</span> Parcels
                                                            </div>
                                                            <p className="text-neutral-600">
                                                                Parcels and courier deliveries must be sent directly to the lower campus loading bay store:
                                                            </p>
                                                            <div className="p-3 bg-white border border-neutral-200/60 rounded-xs font-mono text-[11px] text-neutral-800 space-y-0.5">
                                                                <div className="font-sans font-bold text-neutral-900 uppercase text-[10px]">Delivery Address:</div>
                                                                <div>Lower Campus Store</div>
                                                                <div>GQ13, E8 SEB. Bldg</div>
                                                                <div>Via Gate 2, High Street</div>
                                                                <div>UNSW, Kensington, Sydney, NSW, 2052</div>
                                                            </div>
                                                        </div>
                                                        <div className="pt-1">
                                                            <a
                                                                href="https://link.mazemap.com/mrcpk8Wn"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-block bg-black text-white font-bold px-3 py-1.5 text-[10px] uppercase tracking-wider rounded-xs hover:bg-[#EAD64D] hover:text-black transition-colors"
                                                            >
                                                                View Loading Bay Pin on MazeMap ↗
                                                            </a>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* FAQ: SHARED SPACE & SECURITY REMINDER */}
                                    <div className="py-3">
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq('shared-reminder')}
                                            className="w-full flex items-center justify-between text-left font-extrabold text-black uppercase text-xs hover:text-[#EAD64D] transition-colors py-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>⚠️</span> Shared Space Security
                                            </span>
                                            <span className="font-mono text-sm">{openFaqId === 'shared-reminder' ? '−' : '+'}</span>
                                        </button>

                                        {openFaqId === 'shared-reminder' && (
                                            <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                                <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3">
                                                    <p className="text-neutral-700 text-xs leading-relaxed">
                                                        Our Co-Working office is not exclusive to us. Hundreds of Materials Science Students also have 24/7 access to our desks (even the formal Coworking space). In using Founders spaces, you are accepting responsibility for your own belongings, and we cannot guarantee their safety. We highly recommend you store valuable items out of sight or take them home with you when you are not at your desk.
                                                    </p>
                                                    <p className="text-neutral-700 text-xs leading-relaxed">
                                                        In addition, do not adjust, borrow, or move something that is not yours unless you have direct permission from the owner.
                                                    </p>

                                                    <p className="font-bold text-black pt-2 border-t border-neutral-200/60 text-xs">
                                                        Let's work together to take care of everything in our spaces and everyone who uses them.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* KITCHEN FACILITIES */}
                                    <div className="py-3 border-b border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq('kitchen')}
                                            className="w-full flex items-center justify-between text-left font-extrabold text-black uppercase text-xs hover:text-[#EAD64D] transition-colors py-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>🍽️</span> Kitchen Facilities
                                            </span>
                                            <span className="font-mono text-sm">{openFaqId === 'kitchen' ? '−' : '+'}</span>
                                        </button>

                                        {openFaqId === 'kitchen' && (
                                            <div className="p-6 bg-white text-xs space-y-6 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">

                                                {/* 2-COLUMN KITCHEN AMENITIES GRID */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                                    {/* ENTRANCE KITCHENETTE */}
                                                    <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3 flex flex-col justify-between">
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                                Kitchenette (Informal Coworking in Founders Place)
                                                            </div>
                                                            <p className="text-neutral-600 text-xs">
                                                                Located at the entrance to the Informal Coworking Space in Founders Place.
                                                            </p>

                                                            <div className="p-3 bg-white border border-neutral-200/80 rounded-xs space-y-1.5">
                                                                <span className="font-bold text-neutral-900 block uppercase text-[10px]">Includes:</span>
                                                                <ul className="space-y-1 text-neutral-600 text-xs">
                                                                    <li className="flex items-center gap-2">
                                                                        <span className="text-neutral-400">•</span> Sink with Hot & Cold Filtered Taps
                                                                    </li>
                                                                    <li className="flex items-center gap-2">
                                                                        <span className="text-neutral-400">•</span> Refrigerator
                                                                    </li>
                                                                    <li className="flex items-center gap-2">
                                                                        <span className="text-neutral-400">•</span> Microwave
                                                                    </li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* MAIN KITCHEN */}
                                                    <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3 flex flex-col justify-between">
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                                Main Kitchen (Formal Coworking)
                                                            </div>
                                                            <p className="text-neutral-600 text-xs">
                                                                Located in the Formal Coworking space between the Copy Room and UNSW Founders Staff desks.
                                                            </p>

                                                            <div className="p-3 bg-white border border-neutral-200/80 rounded-xs space-y-1.5">
                                                                <span className="font-bold text-neutral-900 block uppercase text-[10px]">Includeds:</span>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 text-xs text-neutral-600">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-neutral-400">•</span> Sink & Hot/Cold Taps
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-neutral-400">•</span> Cutlery
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-neutral-400">•</span> Plates & Bowls
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-neutral-400">•</span> Mugs & Glasses
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-neutral-400">•</span> Microwave
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-neutral-400">•</span> Refrigerator
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-neutral-400">•</span> Dishwasher
                                                                    </div>
                                                                    <div className="col-span-1 sm:col-span-2 pt-1 font-semibold text-neutral-900 border-t border-neutral-100 flex items-center gap-1.5">
                                                                        Free Coffee Machine & Beans, Tea & Milk
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>

                                                {/* KITCHEN ETIQUETTE & CLEANUP POLICY */}
                                                <div className="p-4 bg-[#EAD64D]/20 border border-black/20 rounded-xs space-y-1.5">
                                                    <p className=" text-[11px] leading-relaxed font-medium">
                                                        ⚠️<strong> Clean up after yourself. </strong>⚠️
                                                    </p>
                                                    <p className="text-neutral-800 text-[11px] leading-relaxed font-medium">
                                                        Unload the Dishwasher if needed and place dirty dishes directly into the dishwasher, dispose of rubbish, wipe down benches, and report low stock (detergent, paper towels, milk) via the Report Low Stock & Maintenance on this page.
                                                    </p>

                                                </div>

                                            </div>
                                        )}
                                    </div>

                                    {/* 5. DAY LOCKERS */}
                                    <div className="py-3">
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq('lockers')}
                                            className="w-full flex items-center justify-between text-left font-extrabold text-black uppercase text-xs hover:text-[#EAD64D] transition-colors py-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>🔒</span> Using the Lockers
                                            </span>
                                            <span className="font-mono text-sm">{openFaqId === 'lockers' ? '−' : '+'}</span>
                                        </button>

                                        {openFaqId === 'lockers' && (
                                            <div className="pt-2 pb-2 pl-6 animate-in fade-in duration-150 text-xs text-neutral-600 font-normal leading-relaxed space-y-3">
                                                <p>
                                                    The lockers are located in the Informal Coworking Space on Level 1, next to the Founders Place Kitchen Area and in the Founders Place Event Space.
                                                </p>
                                                <p>
                                                    Anyone is able to use the lockers when they are working in the space for the day. As there is limited locker space, please do not keep items in there for more than one day at a time.
                                                </p>

                                                <div className="p-4 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3 mt-3">
                                                    <span className="font-bold text-neutral-900 uppercase text-[10px] tracking-wider block">How to use Yellowbox Lockers:</span>
                                                    <ol className="list-decimal pl-4 space-y-1.5 text-neutral-700 text-xs">
                                                        <li>To access a locker, download the <a href="https://apps.apple.com/au/app/yellowbox/id1468093484" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black hover:text-[#EAD64D]">Yellowbox app ↗</a>.</li>
                                                        <li>Create a new account. Go into the Side Menu and Tap 'Yellowbox Private'.</li>
                                                        <li>Search 'UNSW Hilmer' and use the code <strong className="font-mono text-black">0291</strong> to link the lockers to your account.</li>
                                                        <li>Tap the 'UNSW Hilmer Lvl1' box on the map and tap Open (need to be next to the lockers).</li>
                                                    </ol>
                                                </div>

                                                <div className="p-3 bg-white border border-neutral-200 rounded-xs space-y-1">
                                                    <span className="font-bold text-neutral-900 block uppercase text-[10px]">Can I store my phone?</span>
                                                    <p className="text-neutral-700 text-xs leading-relaxed">
                                                        Yes, it is not needed to open the locker. When you open a locker the app will prompt you to set a 4 digit keypad code (with # at the end), which you can use to open your locker.
                                                    </p>
                                                </div>

                                                <p className="text-[11px] text-neutral-500 italic">
                                                    If you face any issues accessing your locker or have further questions, please contact Yellowbox directly via the support option in-app, or find further information at <a href="https://yellowbox.app/terms" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">yellowbox.app/terms</a>.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* LOST AND FOUND */}
                                    <div className="py-3 border-b border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq('lost-found')}
                                            className="w-full flex items-center justify-between text-left font-extrabold text-black uppercase text-xs hover:text-[#EAD64D] transition-colors py-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>🔍</span> Lost & Found
                                            </span>
                                            <span className="font-mono text-sm">{openFaqId === 'lost-found' ? '−' : '+'}</span>
                                        </button>

                                        {openFaqId === 'lost-found' && (
                                            <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">

                                                {/* SINGLE FULL-WIDTH CONTENT CARD */}
                                                <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-4">

                                                    {/* STEP 1: REPORTING */}
                                                    <div className="space-y-1">
                                                        <p className="text-neutral-600 text-xs">
                                                            If you lose an item or find unattended property in the space, please email <a href="mailto:mcic@unsw.edu.au" className="font-mono font-bold text-black underline hover:text-neutral-600">mcic@unsw.edu.au</a>.
                                                        </p>
                                                        <p className="text-neutral-600 text-xs">
                                                            UNSW Founders retains all recovered items on-site for <strong>3 weeks</strong>. Unclaimed items are subsequently transferred to Gate 2 Security.
                                                        </p>

                                                    </div>

                                                    {/* STEP 3: SECURITY LINK */}
                                                    <div className="pt-2 border-t border-neutral-200/60">
                                                        <a
                                                            href="https://www.student.unsw.edu.au/security"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-block bg-black text-white font-bold px-3.5 py-2 text-[10px] uppercase tracking-wider rounded-xs hover:bg-[#EAD64D] hover:text-black transition-colors"
                                                        >
                                                            Gate 2 Security Location & Info ↗
                                                        </a>
                                                    </div>
                                                    <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-xs text-[11px] text-neutral-600 italic">
                                                        <strong>Disclaimer:</strong> UNSW Founders is not liable for any lost, stolen, or damaged personal belongings left unattended within the MCIC premises.
                                                    </div>



                                                </div>


                                            </div>
                                        )}
                                    </div>

                                    {/* COFFEE SPOTS */}
                                    <div className="py-3 border-b border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq('coffee')}
                                            className="w-full flex items-center justify-between text-left font-extrabold text-black uppercase text-xs hover:text-[#EAD64D] transition-colors py-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>☕</span> Coffee & Food on Campus
                                            </span>
                                            <span className="font-mono text-sm">{openFaqId === 'coffee' ? '−' : '+'}</span>
                                        </button>

                                        {openFaqId === 'coffee' && (
                                            <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                                <p className="text-neutral-700 text-xs">
                                                    There are numerous coffee venues across the UNSW Kensington campus, with at least three options within a 2-minute walk from the MCIC building.
                                                </p>

                                                <div className="p-4 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3">
                                                    <span className="font-bold text-neutral-900 uppercase text-[10px] tracking-wider block">Campus Coffee Map:</span>
                                                    <img
                                                        src="/images/coffee-map.png"
                                                        alt="UNSW Campus Coffee Spots Map"
                                                        className="rounded-xs border border-neutral-200 max-h-48 object-contain bg-white p-1"
                                                    />
                                                    <div className="pt-1">
                                                        <a
                                                            href="https://www.unsw.edu.au/estate/food-retail/explore"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-black font-bold underline text-[11px] hover:text-[#EAD64D]"
                                                        >
                                                            View the Food and Retail webpage for more options ↗
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* SECURITY, EMERGENCY & SAFETY */}
                                    <div className="py-3 border-b border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq('security')}
                                            className="w-full flex items-center justify-between text-left font-extrabold text-black uppercase text-xs hover:text-[#EAD64D] transition-colors py-2 cursor-pointer"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>🛡️</span> Security, Emergency & Safety
                                            </span>
                                            <span className="font-mono text-sm">{openFaqId === 'security' ? '−' : '+'}</span>
                                        </button>

                                        {openFaqId === 'security' && (
                                            <div className="p-6 bg-white text-xs space-y-6 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                                    {/* CAMPUS SECURITY & SAFEZONE APP */}
                                                    <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-4 flex flex-col justify-between">
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                                <span>🛡️</span> Campus Security & SafeZone App
                                                            </div>

                                                            <p className="text-neutral-600 text-xs">
                                                                Security is available <strong>24 hours a day, 7 days a week</strong> at Gate 2 on High Street.
                                                            </p>

                                                            {/* 24/7 NUMBERS */}
                                                            <div className="p-3 bg-white border border-neutral-200/80 rounded-xs space-y-2">
                                                                <span className="font-bold text-neutral-900 block uppercase text-[10px]">24/7 Phone Numbers:</span>
                                                                <div className="space-y-1 text-xs">
                                                                    <p>
                                                                        General Operations: <a href="tel:0293856000" className="font-mono font-bold text-black underline">9385 6000</a>
                                                                    </p>
                                                                    <p className="text-red-600 font-bold">
                                                                        Emergency Line: <a href="tel:0293856666" className="font-mono underline">9385 6666</a>
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* SAFEZONE APP SCREENSHOT & CARD */}
                                                            <div className="p-3 bg-white border border-neutral-200/80 rounded-xs space-y-3">
                                                                <div className="flex items-center gap-2 text-neutral-900 font-bold uppercase text-[10px]">
                                                                    <span>📲</span> Download SafeZone App
                                                                </div>
                                                                <p className="text-neutral-600 text-[11px]">
                                                                    To stay informed and connected with the latest safety alerts, emergency assistance, and first aid response on campus, download the <strong>SafeZone App</strong>.
                                                                </p>

                                                                {/* SCREENSHOT CONTAINER */}
                                                                <div className="border border-neutral-200 rounded-xs overflow-hidden bg-neutral-100">
                                                                    <img
                                                                        src="/images/safezone-app.png"
                                                                        alt="SafeZone App Setup & Features"
                                                                        className="w-full h-auto object-cover block"
                                                                    />
                                                                </div>

                                                            </div>

                                                            <p className="text-neutral-600 text-xs">
                                                                For further assistance or general inquiries, email <a href="mailto:security.services@unsw.edu.au" className="font-mono font-bold text-black underline">security.services@unsw.edu.au</a>.
                                                            </p>
                                                        </div>

                                                        <div className="pt-3 border-t border-neutral-200/60 text-xs">
                                                            <p>
                                                                Additional information available at:
                                                            </p>
                                                            <a href="https://www.estate.unsw.edu.au/protective-services/your-safety" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline hover:text-[#EAD64D]">
                                                                UNSW Protective Services & Safety Portal ↗
                                                            </a>
                                                        </div>
                                                    </div>

                                                    {/* EVACUATION PROCEDURES */}
                                                    <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-4 flex flex-col justify-between">
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                                <span>🚨</span> Building Evacuation Protocols
                                                            </div>

                                                            {/* WARDENS */}
                                                            <div className="space-y-1.5">
                                                                <span className="font-bold text-neutral-900 block text-xs">Building & Floor Wardens:</span>
                                                                <p className="text-neutral-600 text-xs">
                                                                    Find your warden details on <strong>Archibus</strong> under <em>"Emergency Contacts by Building"</em>. If you do not have Archibus access, call Security Ops (<a href="tel:0293856000" className="font-mono font-bold text-black underline">9385 6000</a>) or email <a href="mailto:emergency@unsw.edu.au" className="font-mono font-bold text-black underline">emergency@unsw.edu.au</a>.
                                                                </p>
                                                            </div>

                                                            {/* PROCESS & DRILLS */}
                                                            <div className="space-y-1.5 pt-2 border-t border-neutral-200/60">
                                                                <span className="font-bold text-neutral-900 block text-xs">Evacuation Process & Drills:</span>
                                                                <p className="text-neutral-600 text-xs">
                                                                    Evacuation instructions are displayed throughout all buildings on <strong>orange A3 posters</strong>. Evacuation drills are conducted annually, and Floor Wardens will sweep the floor to ensure all personnel exit safely.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* EVACUATION LINK */}
                                                        <div className="pt-3 border-t border-neutral-200/60 text-xs">
                                                            <p>
                                                                Additional information available at:
                                                            </p>
                                                            <a href="https://www.estate.unsw.edu.au/emergencies" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline hover:text-[#EAD64D]">
                                                                UNSW Emergency & Evacuation Procedures ↗
                                                            </a>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ============================================================== */}
                    {/* TAB 3: LIVE DESK AVAILABILITY (FLOORPLAN)                      */}
                    {/* ============================================================== */}
                    {activeTab === 'floorplan' && (
                        <div className="space-y-8 animate-in fade-in duration-200">
                            <div className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 pb-4">
                                    <div>
                                        <h2 className="text-xl font-extrabold text-black">MCIC Level 1 Layout Map</h2>
                                        <p className="text-xs text-neutral-500 font-normal">Interactive seating allocations across staff, resident startups, and hot desks.</p>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="🔍 Search startup or staff name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="p-2.5 px-4 border border-gray-200 rounded-sm text-xs w-full sm:w-64 outline-none focus:border-black text-black"
                                    />
                                </div>

                                <div className="flex flex-wrap gap-4 text-[11px] font-bold uppercase tracking-wider">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3.5 h-3.5 bg-[#EAD64D] border border-amber-400 rounded-xs inline-block"></span>
                                        <span>UNSW Founders Staff</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3.5 h-3.5 bg-[#FFF2CC] border border-amber-200 rounded-xs inline-block"></span>
                                        <span>Resident Startups</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3.5 h-3.5 bg-[#CCEEFF] border border-sky-300 rounded-xs inline-block"></span>
                                        <span>Hot Desks</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3.5 h-3.5 bg-[#E2EFDA] border border-green-300 rounded-xs inline-block"></span>
                                        <span>Founders Place / Flex</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-sm shadow-xs space-y-6 overflow-x-auto">
                                <div className="grid grid-cols-12 gap-2 text-center text-[10px] font-bold uppercase tracking-wider">
                                    <div className="col-span-6 bg-[#E2EFDA] border border-green-200 p-4 rounded-xs flex items-center justify-center">
                                        <span>🍳 Main Level 1 Kitchen & Dining Area</span>
                                    </div>
                                    <div className="col-span-2 bg-[#E2EFDA] border border-green-200 p-4 rounded-xs flex items-center justify-center">
                                        <span>Copy Room</span>
                                    </div>
                                    <div className="col-span-1 bg-[#FFF2CC] border border-amber-200 p-2 rounded-xs flex items-center justify-center text-[9px]">
                                        David's Office
                                    </div>
                                    <div className="col-span-3 bg-neutral-100 border border-gray-200 p-2 rounded-xs flex items-center justify-center text-[9px] text-gray-500">
                                        MSE Offices
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-12 lg:col-span-7 space-y-4">
                                        <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 border-b border-gray-100 pb-1">
                                            Level 1 Main Workspace Bays
                                        </div>

                                        <div className="space-y-3">
                                            {deskPods.map((pod) => {
                                                const matchesSearch = searchQuery === '' || pod.desks.some(d =>
                                                    (d.name && d.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                                    (d.startup && d.startup.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                                    (d.role && d.role.toLowerCase().includes(searchQuery.toLowerCase()))
                                                );

                                                return (
                                                    <div
                                                        key={pod.id}
                                                        className={`border rounded-xs p-3 transition-all ${matchesSearch ? 'opacity-100 scale-100' : 'opacity-30 scale-[0.99]'
                                                            } ${pod.category === 'staff'
                                                                ? 'bg-[#EAD64D]/15 border-[#EAD64D]'
                                                                : pod.category === 'hotdesk'
                                                                    ? 'bg-[#CCEEFF]/20 border-sky-300'
                                                                    : pod.category === 'amenity'
                                                                        ? 'bg-neutral-100 border-gray-300'
                                                                        : 'bg-[#FFF2CC]/30 border-amber-200'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[11px] font-extrabold uppercase tracking-tight text-black">
                                                                {pod.title}
                                                            </span>
                                                            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-white border border-gray-200 rounded-xs text-neutral-500">
                                                                {pod.desks.length} Desks
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                            {pod.desks.map((desk, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    onClick={() => setSelectedEntity(desk)}
                                                                    className={`p-2 rounded-xs border text-left cursor-pointer transition-colors ${pod.category === 'staff'
                                                                        ? 'bg-[#EAD64D] border-amber-400 text-black hover:bg-black hover:text-white'
                                                                        : pod.category === 'hotdesk'
                                                                            ? 'bg-[#CCEEFF] border-sky-300 text-sky-950 hover:bg-sky-600 hover:text-white'
                                                                            : pod.category === 'amenity'
                                                                                ? 'bg-neutral-800 text-white border-neutral-900'
                                                                                : 'bg-[#FFF2CC] border-amber-300 text-black hover:bg-black hover:text-white'
                                                                        }`}
                                                                >
                                                                    <div className="font-extrabold text-[11px] leading-tight">
                                                                        {desk.name}
                                                                    </div>
                                                                    {(desk.startup || desk.role) && (
                                                                        <div className="text-[9px] opacity-80 mt-0.5 truncate font-medium">
                                                                            {desk.startup || desk.role}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="hidden lg:flex col-span-1 bg-neutral-900 text-white rounded-xs items-center justify-center p-2 writing-mode-vertical">
                                        <span className="text-[10px] font-mono tracking-widest uppercase rotate-180 text-neutral-400">
                                            Main Access Corridor / Hallway
                                        </span>
                                    </div>

                                    <div className="col-span-12 lg:col-span-4 space-y-4">
                                        <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 border-b border-gray-100 pb-1">
                                            Founders Place & Open Access Area
                                        </div>

                                        <div className="bg-[#E2EFDA] border border-green-300 p-6 rounded-xs space-y-6">
                                            <div className="space-y-2 border-b border-green-200 pb-4">
                                                <div className="inline-block bg-green-700 text-white text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-xs">
                                                    Ground/Level 1 Flexible Space
                                                </div>
                                                <h3 className="font-extrabold text-base text-black">Founders Place (Event Space)</h3>
                                                <p className="text-xs text-neutral-700 leading-relaxed">
                                                    Houses key community events, hackathons, pitch nights, and First Thursdays networking sessions.
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <h3 className="font-extrabold text-base text-black">Founders Place (Group Study & Open Access)</h3>
                                                <p className="text-xs text-neutral-700 leading-relaxed">
                                                    Features 15 Founder Place hotdesks, shared kitchen nook, whiteboards, presentation screens, and phone booths for casual resident work.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedEntity && (
                                <div className="p-4 bg-[#EAD64D] border border-amber-400 text-black rounded-sm flex justify-between items-center text-xs font-bold">
                                    <div>
                                        <span>Selected Allocation: <strong>{selectedEntity.name}</strong></span>
                                        {selectedEntity.startup && <span className="ml-2 font-normal">({selectedEntity.startup})</span>}
                                        {selectedEntity.role && <span className="ml-2 font-normal">// {selectedEntity.role}</span>}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedEntity(null)}
                                        className="bg-black text-white px-3 py-1 rounded-xs uppercase tracking-wider text-[10px] hover:bg-neutral-800 cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}

                        </div>
                    )}

                    {/* ============================================================== */}
                    {/* TAB 3: OPERATIONAL STOCK & SUPPLY DISPATCH                     */}
                    {/* ============================================================== */}
                    {activeTab === 'stock-alert' && (
                        <div className="bg-white border border-gray-200 rounded-sm shadow-xs p-6 md:p-8 space-y-8 animate-in fade-in duration-200 text-xs text-neutral-700">

                            {/* HEADER BANNER */}
                            <div className="border-b border-gray-100 pb-4 space-y-1">
                                <h2 className="text-xl font-extrabold uppercase text-black tracking-tight">
                                    Report Low Stock or Maintenance
                                </h2>
                            </div>

                            {/* ALERT CONFIRMATION NOTIFICATION */}
                            {supplyAlert && (
                                <div className="p-4 bg-[#EAD64D] text-black font-bold text-xs rounded-xs flex justify-between items-center shadow-xs border border-black animate-in fade-in duration-150">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-base">✓</span>
                                        <span>
                                            Logged: Request for <strong>{supplyAlert}</strong> sent to MCIC Ops!
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSupplyAlert(null)}
                                        className="text-black font-extrabold px-2 py-0.5 hover:bg-black hover:text-white rounded-xs transition-colors cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            {/* UNIFIED SEARCHABLE DISPATCH FORM */}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const itemText = isCustomInput ? stockSearchQuery : (selectedItem?.label || stockSearchQuery);
                                    if (!itemText.trim() || !dispatchLocation.trim()) return;

                                    const actionTag = reportType === 'broken' ? '[Maintenance]' : '[Stock]';
                                    setSupplyAlert(`${actionTag} ${itemText} at ${dispatchLocation}`);

                                    // Reset Form
                                    setStockSearchQuery('');
                                    setSelectedItem(null);
                                    setDispatchLocation('');
                                    setIsCustomInput(false);
                                    setDropdownOpen(false);
                                }}
                                className="space-y-6 max-w-2xl"
                            >
                                {/* STEP 1: REPORT TYPE QUESTION */}
                                <div className="space-y-2">
                                    <label className="font-extrabold text-black uppercase text-xs tracking-wide block">
                                        1. Is this about Low Stock or Maintainance?
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setReportType('stock')}
                                            className={`p-3.5 border text-left font-bold text-xs rounded-xs transition-all cursor-pointer flex items-center justify-between ${reportType === 'stock'
                                                ? 'bg-black text-[#EAD64D] border-black shadow-xs'
                                                : 'bg-neutral-50 text-neutral-800 border-neutral-200 hover:border-black'
                                                }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>⚠️</span> Low Stock
                                            </span>
                                            {reportType === 'stock' && <span className="text-xs">✓</span>}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setReportType('broken')}
                                            className={`p-3.5 border text-left font-bold text-xs rounded-xs transition-all cursor-pointer flex items-center justify-between ${reportType === 'broken'
                                                ? 'bg-black text-[#EAD64D] border-black shadow-xs'
                                                : 'bg-neutral-50 text-neutral-800 border-neutral-200 hover:border-black'
                                                }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>🔧</span> Broken
                                            </span>
                                            {reportType === 'broken' && <span className="text-xs">✓</span>}
                                        </button>
                                    </div>
                                </div>

                                {/* STEP 2: ITEM SEARCH / SELECT COMBOBOX */}
                                <div className="space-y-2 relative">
                                    <label className="font-extrabold text-black uppercase text-xs tracking-wide block">
                                        2. {reportType === 'broken' ? 'WHAT IS BROKEN OR MALFUNCTIONING?' : 'WHAT IS RUNNING LOW OR EMPTY?'}
                                    </label>

                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder={
                                                reportType === 'broken'
                                                    ? "What's Broken?"
                                                    : "What needs restocking?"
                                            }
                                            value={stockSearchQuery}
                                            onChange={(e) => {
                                                setStockSearchQuery(e.target.value);
                                                setDropdownOpen(true);
                                                setSelectedItem(null);
                                                setIsCustomInput(true);
                                            }}
                                            onFocus={() => setDropdownOpen(true)}
                                            className="w-full p-3.5 border border-neutral-300 bg-white text-xs font-medium rounded-xs outline-none focus:border-black text-black pr-10"
                                            required
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                                            🔍
                                        </span>
                                    </div>

                                    {/* SEARCH DROPDOWN MENU */}
                                    {dropdownOpen && stockSearchQuery.trim().length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-black rounded-xs shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-neutral-100">

                                            {/* PRE-DEFINED MATCHES FILTERED BY REPORT TYPE */}
                                            {allSupplyCatalog
                                                .filter(item => {
                                                    const matchesCategory = reportType === 'broken'
                                                        ? item.category === 'Maintenance'
                                                        : item.category !== 'Maintenance';
                                                    const matchesQuery = item.label.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
                                                        item.keywords.toLowerCase().includes(stockSearchQuery.toLowerCase());
                                                    return matchesCategory && matchesQuery;
                                                })
                                                .map((item) => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setStockSearchQuery(item.label);
                                                            setSelectedItem(item);
                                                            setIsCustomInput(false);
                                                            setDropdownOpen(false);
                                                        }}
                                                        className="w-full p-3 text-left hover:bg-neutral-50 flex items-center justify-between cursor-pointer transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="text-base">{item.icon}</span>
                                                            <span className="font-bold text-xs text-neutral-900">{item.label}</span>
                                                        </div>
                                                        <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-xs font-bold">
                                                            {item.category}
                                                        </span>
                                                    </button>
                                                ))
                                            }

                                            {/* FREETEXT FALLBACK OPTION */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsCustomInput(true);
                                                    setSelectedItem(null);
                                                    setDropdownOpen(false);
                                                }}
                                                className="w-full p-3 text-left bg-neutral-50 hover:bg-black hover:text-[#EAD64D] flex items-center justify-between cursor-pointer transition-colors group"
                                            >
                                                <span className="font-bold text-xs text-neutral-800 group-hover:text-white">
                                                    ✍️ Use custom request: "{stockSearchQuery}"
                                                </span>
                                                <span className="text-[9px] font-mono uppercase text-neutral-400 group-hover:text-[#EAD64D]">
                                                    Custom Input
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* STEP 3: LOCATION SELECTOR */}
                                <div className="space-y-2">
                                    <label className="font-extrabold text-black uppercase text-xs tracking-wide block">
                                        3. WHERE IS IT LOCATED IN MCIC?
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <select
                                            value={dispatchLocation}
                                            onChange={(e) => setDispatchLocation(e.target.value)}
                                            className="p-3.5 border border-neutral-300 bg-white text-xs font-bold rounded-xs outline-none focus:border-black text-black cursor-pointer flex-1"
                                            required
                                        >
                                            <option value="" disabled>Select Location...</option>
                                            <option value="Main Kitchen (Level 1)">Kitchen (Level 1 Formal Coworking Space)</option>
                                            <option value="Founders Place Kitchenette">Kitchen (Level 1 Founders Place Informal Coworking Space)</option>
                                            <option value="Copy Room & Print Hub">Copy Room</option>
                                            <option value="Founders Place">Founders Place</option>
                                            <option value="MCIC Event Space (Ground)">MCIC Event Space (Ground)</option>
                                        </select>

                                        <button
                                            type="submit"
                                            className="bg-black text-[#EAD64D] font-extrabold px-8 py-3.5 text-xs uppercase tracking-wider rounded-xs hover:bg-[#EAD64D] hover:text-black transition-colors cursor-pointer shrink-0"
                                        >
                                            Send Report
                                        </button>
                                    </div>
                                </div>
                            </form>

                        </div>
                    )}
                </section>

            </div >

        </main >
    );
}