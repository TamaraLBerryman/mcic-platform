"use client";

// components/BookingForm.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import EventFAQs from '@/components/EventFAQs'; // <--- Import FAQ component
import { db } from '../app/lib/firebase'; // <--- Use relative path to app/lib/firebase
import { collection, getDocs } from 'firebase/firestore';
import { calculateQuote, ROOM_INCLUSIONS } from '../app/lib/pricing'; // <--- Use relative path to app/lib/pricing

const generate24HoursTimeSlots = () => {
    const slots = [];
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        slots.push(`${hour}:00`, `${hour}:30`);
    }
    return slots;
};

// ==========================================
// MASTER CASUAL STAFF LIST & MOCK RESERVATIONS
// ==========================================
const CASUAL_STAFF_LIST = [
    "Ivara", "Henry", "Wonyoung", "Hanisha", "Hudson", "Harry", "Luka",
    "Julian", "Reuben", "William", "Sarah", "Julie", "Aryan", "Shetal",
    "Thomas", "Alex", "Sam", "Victoria", "Rita", "Chiragm", "Lucas", "Armin", "Nicole"
];

const SHARED_EQUIPMENT_MASTER_FALLBACK = [
    { key: 'handheldMics', label: 'Handheld Microphones', category: 'Shared AV', totalHubStock: 4 },
    { key: 'lapelMics', label: 'Lapel Microphones', category: 'Shared AV', totalHubStock: 4 },
    { key: 'portableStandingTv', label: 'Portable Standing TV Screen', category: 'Shared AV', totalHubStock: 2 },
    { key: 'standingWhiteboards', label: 'Standing Whiteboards', category: 'Furniture', totalHubStock: 10 },
    { key: 'networkingHighTables', label: 'Networking High Tables', category: 'Furniture', totalHubStock: 8 },
    { key: 'cateringStandingTables', label: 'Catering Standing Tables', category: 'Furniture', totalHubStock: 3 },
    { key: 'couchesCoffeeTables', label: 'Couches + Coffee Tables Set', category: 'Furniture', totalHubStock: 1, isToggle: true },
    { key: 'loungesCoffeeTable', label: 'Lounges + Coffee Table Set', category: 'Furniture', totalHubStock: 1, isToggle: true },
    { key: 'registrationTable', label: 'Registration Table', category: 'Furniture', totalHubStock: 1, isToggle: true },
    { key: 'stage', label: 'Modular Stage Pieces', category: 'Furniture', totalHubStock: 1 },
    { key: 'ipad', label: 'iPads (Check-in / Slido Q&A)', category: 'Tech', totalHubStock: 6 },
    { key: 'spareLaptop', label: 'Spare Presentation Laptop', category: 'Tech', totalHubStock: 5 },
    { key: 'videoRecording', label: 'Video Recording Unit', category: 'Tech', totalHubStock: 1, isToggle: true },
    { key: 'glasses', label: 'Drinking Glasses', category: 'Catering Ware', totalHubStock: 60 },
    { key: 'plates', label: 'Plates', category: 'Catering Ware', totalHubStock: 40 },
    { key: 'mugs', label: 'Mugs', category: 'Catering Ware', totalHubStock: 30 },
    { key: 'urnHotWater', label: 'Hot Water Urn', category: 'Catering Ware', totalHubStock: 1, isToggle: true },
    { key: 'waterDispenser', label: 'Chilled Water Dispenser', category: 'Catering Ware', totalHubStock: 1, isToggle: true },
    { key: 'servingTongs', label: 'Serving Tongs & Platter Boards', category: 'Catering Ware', totalHubStock: 1, isToggle: true }
];

const MOCK_TIME_SLOT_RESERVATIONS = {
    handheldMics: 1,
    standingWhiteboards: 4,
    ipad: 2,
    ipad003: 1,
    dell009: 1,
    glasses: 20
};

export default function BookingForm() {
    const router = useRouter();
    const [showFullForm, setShowFullForm] = useState(false);
    const [showroomSpace, setShowroomSpace] = useState('MCIC Ground - Entire Space');
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);
    const [departmentType, setDepartmentType] = useState('UNSW Founders');
    const [cateringAcknowledged, setCateringAcknowledged] = useState(false);
    const [cateringError, setCateringError] = useState(false);
    const [conductAcknowledged, setConductAcknowledged] = useState(false);
    const [conductError, setConductError] = useState(false);
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [activeAccordion, setActiveAccordion] = useState(null);
    const [layoutMode, setLayoutMode] = useState('workshop');

    // DYNAMIC FIREBASE INVENTORY DATABASE STATE
    const [equipmentList, setEquipmentList] = useState([]);
    const [isLoadingEquipment, setIsLoadingEquipment] = useState(true);

    // FETCH LIVE INVENTORY DIRECTLY FROM FIRESTORE
    useEffect(() => {
        async function fetchFirestoreInventory() {
            try {
                if (db) {
                    const querySnapshot = await getDocs(collection(db, "items"));
                    const itemsData = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setEquipmentList(itemsData);
                }
            } catch (err) {
                console.error("Failed to load inventory from Firestore:", err);
            } finally {
                setIsLoadingEquipment(false);
            }
        }
        fetchFirestoreInventory();
    }, []);

    const [runsheetRows, setRunsheetRows] = useState([
        { time: '', layout: 'Workshop Style/Group Tables', description: 'Organiser access & setup' }
    ]);

    const [liveBusySlots, setLiveBusySlots] = useState({});

    const isSlotBlockedByCalendar = (roomName, timeSlot) => {
        const roomBusyRanges = liveBusySlots[roomName] || [];
        return roomBusyRanges.some(range => timeSlot >= range.start && timeSlot < range.end);
    };

    const [formData, setFormData] = useState({
        bookingIntent: "",
        userType: 'Internal to UNSW',
        companyName: '',
        unswDivision: '',
        department: 'UNSW Founders',
        isDelegation: false,
        isHighRisk: false,
        riskDetails: '',
        eventName: '',
        attendees: 0,
        eventDescription: '',
        runsheetObjectives: '',
        postToPublicDirectory: false,

        // TICKETING FORM STATE
        ticketingMethod: 'external', // 'external' | 'internal'
        externalTicketUrl: '',
        ticketBannerName: '',
        maxTicketCapacity: 0,
        ticketTiers: [
            { name: 'UNSW Affiliated (Students & Staff)', cap: '' },
            { name: 'General Public / External Guest', cap: '' }
        ],

        useRegistrationPortal: false,
        hasOwnRegistrationPortal: false,
        sameAsMain: true,
        mainContact: { name: '', email: '', phone: '' },
        onDayContact: { name: '', email: '', phone: '' },
        space: 'MCIC Ground - Event Space',
        includeColonnadeAddon: false,
        bumpIn: '',
        eventStart: '',
        eventEnd: '',
        bumpOut: '',

        // GENERAL HIRER SUPPORT QUESTIONS
        isInnovationOrEntrepreneurship: null,
        wantsCasualStaff: null,
        needsJudgeHelp: null,

        // FOUNDERS INTERNAL COORDINATION QUESTIONS
        tamaraPresence: 'Not at all',
        needsFoundersCasualStaff: 'No',
        casualStaffDetails: [
            { preferredStaff: '', shiftStart: '', shiftEnd: '', tasks: '' }
        ],

        av: {
            textMics: 0,
            handheldMics: 0,
            lapelMics: 0,
            lecternMic: 0,
            projectorScreens: 0,
            backgroundMusic: false,
            standingWhiteboards: 0,
            stage: 0,
            cateringStandingTables: 0,
            networkingHighTables: 0,
            spareLaptop: 0,
            ipad: 0,
            glasses: 0,
            plates: 0,
            mugs: 0,
            portableStandingTv: 0,
            couchesCoffeeTables: false,
            loungesCoffeeTable: false,
            servingTongs: false,
            platterBoards: false,
            urnHotWater: false,
            waterDispenser: false,
            videoRecording: false,
            registrationTable: false
        },
        catering: null,
        alcohol: null,

        // PAYMENT & INVOICING / SIGNATURE FIELDS
        paymentMethod: '',
        abn: '',
        apEmail: '',
        billingAddress: '',
        signature: '',
        signerFullName: '',
        signatureDate: new Date().toISOString().split('T')[0]
    });

    // Auto sync onDayContact if sameAsMain is checked
    useEffect(() => {
        if (formData.sameAsMain) {
            setFormData(prev => ({
                ...prev,
                onDayContact: { ...prev.mainContact }
            }));
        }
    }, [formData.sameAsMain, formData.mainContact]);

    const [quote, setQuote] = useState({
        lineItems: [],
        subtotalExcludingTax: 0,
        taxIncluded: 0,
        totalDue: 0,
        discountPercentage: 0,
        total: 0
    });

    useEffect(() => {
        const serializedString = runsheetRows
            .map((row, index) => `Row ${index + 1} -> Time: ${row.time || 'N/A'} | Layout: ${row.layout} | Description: ${row.description}`)
            .join('\n');
        setFormData(prev => ({ ...prev, runsheetObjectives: serializedString }));
    }, [runsheetRows]);

    useEffect(() => {
        const rawQuote = calculateQuote(formData, [], equipmentList, {});
        const safeQuote = rawQuote || {
            lineItems: [],
            subtotalExcludingTax: 0,
            taxIncluded: 0,
            totalDue: 0,
            discountPercentage: 0,
            total: 0
        };
        setQuote({
            ...safeQuote,
            total: safeQuote.totalDue || safeQuote.total || 0
        });
    }, [formData, equipmentList]);

    const venueShowroom = {
        'MCIC Ground - Entire Space': {
            roomNumber: 'Rooms G22 & G26',
            imgs: [
                '/images/venues/full-space-1.JPG',
                '/images/venues/full-space-2.JPG',
                '/images/venues/full-space-3.JPG',
                '/images/venues/full-space-4.JPG'
            ],
            description: `The Full Ground Floor Event Space. The concertina doors will be opened to combine the Event Space and Design Space to make the Entire Space.<br /><br /><strong>Capacity:</strong><br />- <strong>Lecture Style:</strong> 120 people maximum<br />- <strong>Workshop Style:</strong> 100 people maximum<br /><br /><strong>Included Equipment & AV:</strong><br />- 1 Lectern with Microphone, 4 Wireless Handheld Mics, 4 Lapel Mics, 2 Projector Screens, 2 Mid-Room TV Screens, Modular Stage, Sound System & Stage Lighting.`
        },
        'MCIC Ground - Event Space': {
            roomNumber: 'Room G26',
            imgs: [
                '/images/venues/event-space-1.JPG',
                '/images/venues/event-space-2.JPG'
            ],
            description: `The front half of the Entire Space. The concertina doors divide the Entire Space into Event Space and Design Space.<br /><br /><strong>Capacity:</strong><br />- <strong>Lecture Style:</strong> 70 people maximum<br />- <strong>Workshop Style:</strong> 35 people maximum<br /><br /><strong>Included Equipment & AV:</strong><br />- 1 Lectern with Microphone, 2 Handheld Mics, 2 Lapel Mics, 2 Front Projector Screens, Modular Stage.`
        },
        'MCIC Ground - Design Space': {
            roomNumber: 'Room G22',
            imgs: [
                '/images/venues/event-space-3.JPG',
                '/images/venues/event-space-4.JPG'
            ],
            description: `The back half of the Entire Space.<br /><br /><strong>Capacity:</strong><br />- <strong>Lecture Style:</strong> 50 people maximum<br />- <strong>Workshop Style:</strong> 35 people maximum<br /><br /><strong>Included Equipment & AV:</strong><br />- 2 Wireless Handheld Mics, 2 Lapel Mics, 1 Projector Screen, 2 Ceiling TV Screens.`
        },
        'MCIC Level 1 - Founders Place': {
            roomNumber: 'Room 124',
            imgs: [
                '/images/venues/founders-place-1.JPG',
                '/images/venues/founders-place-2.JPG'
            ],
            description: `An open room on Level 1. Ideal for workshops or lecture-style presentations.<br /><br /><strong>Capacity:</strong><br />- <strong>Lecture Style:</strong> 70 people maximum<br />- <strong>Workshop Style:</strong> 35 people maximum`
        },
        'MCIC Level 1 - Group Study': {
            roomNumber: 'Level 1 Open Area',
            imgs: [
                '/images/venues/group-study-2.JPG',
                '/images/venues/group-study-1.JPG'
            ],
            description: `Located directly in front of Founders Place. An open co-working space used for breakout groups or event catering setups.`
        },
        'MCIC Ground - Colonnade': {
            roomNumber: 'Ground Floor Outdoor Colonnade',
            imgs: [
                '/images/venues/colonnade-1.JPG',
                '/images/venues/colonnade-2.JPG'
            ],
            description: `Covered outdoor walkway running along the Ground Floor. Ideal for outdoor registration, pop-up exhibitions, or stand-alone open air networking.<br /><br /><strong>Capacity:</strong><br />- <strong>Standing / Networking:</strong> 100 people maximum<br />- <strong>Seated / Workshop:</strong> 40 people maximum`
        },
        'MCIC Ground - AI Makerspace - COMING SOON': {
            roomNumber: 'Room G17',
            imgs: [
                '/images/venues/AI-1.JPG',
                '/images/venues/AI-2.JPG'
            ],
            description: `Our AI Makerspace is a place to test and refine AI technologies.`
        }
    };

    const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        const dayOffset = today.getDay() === 0 ? 6 : today.getDay() - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - dayOffset);
        return monday;
    });

    const mockCalendarData = {
        timeSlots: generate24HoursTimeSlots(),
        rooms: [
            { name: "Ground - Event Space" },
            { name: "Ground - Design Space" },
            { name: "Ground - Entire Space" },
            { name: "Level 1 - Founders Place" },
            { name: "Level 1 - Group Study" }
        ]
    };

    const toggleAccordion = (id) => {
        setActiveAccordion(prev => prev === id ? null : id);
    };

    const updateCasualStaffDetail = (index, field, value) => {
        const updated = [...formData.casualStaffDetails];
        updated[index][field] = value;
        setFormData({ ...formData, casualStaffDetails: updated });
    };

    const addCasualStaffRow = () => {
        setFormData({
            ...formData,
            casualStaffDetails: [
                ...formData.casualStaffDetails,
                { preferredStaff: '', shiftStart: '', shiftEnd: '', tasks: '' }
            ]
        });
    };

    const removeCasualStaffRow = (index) => {
        if (formData.casualStaffDetails.length > 1) {
            setFormData({
                ...formData,
                casualStaffDetails: formData.casualStaffDetails.filter((_, i) => i !== index)
            });
        }
    };

    const getSuggestedSpace = (count) => {
        if (count <= 0) return { name: 'MCIC Ground - Design Space', note: 'Please enter attendee numbers below to calibrate recommendations.' };
        if (count <= 40) return { name: 'MCIC Ground - Design Space', note: 'Ideal capacity match for collaborative workshops and smaller design focus tracks.' };
        if (count <= 120) return { name: 'MCIC Ground - Event Space', note: 'Best fit for presentations, pitch networks, and medium panel streams.' };
        return { name: 'MCIC Ground - Entire Space', note: 'Sized to accommodate high-volume campus hackathons or large multi-zone exhibitions.' };
    };

    const localActiveSuggestedContext = getSuggestedSpace(formData.attendees);

    useEffect(() => {
        if (formData.bookingIntent === "I am flexible on date/time and space. I'd like to see all my options.") {
            const calculatedSpace = getSuggestedSpace(formData.attendees);
            setFormData(prev => {
                if (prev.space === calculatedSpace.name) return prev;
                return { ...prev, space: calculatedSpace.name };
            });
        }
    }, [formData.attendees, formData.bookingIntent]);

    const handleDeptTypeChange = (type) => {
        setDepartmentType(type);
        if (type === 'UNSW Founders') {
            setFormData({ ...formData, department: 'UNSW Founders', unswDivision: '' });
        } else {
            setFormData({ ...formData, department: '', unswDivision: '' });
        }
    };

    const updateSpaceSelection = (spaceName) => {
        setShowroomSpace(spaceName);
        setActivePhotoIndex(0);
        const supportsColonnadeAddon = ['MCIC Ground - Event Space', 'MCIC Ground - Design Space', 'MCIC Ground - Entire Space'].includes(spaceName);

        setFormData(prev => ({
            ...prev,
            space: spaceName,
            includeColonnadeAddon: supportsColonnadeAddon ? prev.includeColonnadeAddon : false
        }));
    };

    const updateRunsheetRow = (index, field, value) => {
        const updatedRows = [...runsheetRows];
        updatedRows[index][field] = value;
        setRunsheetRows(updatedRows);
    };

    const addRunsheetRow = () => {
        setRunsheetRows([...runsheetRows, { time: '', layout: 'Workshop Style/Group Tables', description: '' }]);
    };

    const removeRunsheetRow = (index) => {
        if (runsheetRows.length > 1) {
            setRunsheetRows(runsheetRows.filter((_, i) => i !== index));
        }
    };

    const applyEventTemplate = (type) => {
        setLayoutMode(type);
        if (type === 'tour') {
            setFormData(prev => ({
                ...prev,
                eventDescription: "Facility walkthrough and tour overview look at the space tools."
            }));
            setRunsheetRows([
                { time: '', layout: 'No specific layout required (e.g. for a tour or walkthrough)', description: 'Cohort facility walkthrough and site overview.' }
            ]);
        } else if (type === 'delegation') {
            setFormData(prev => ({
                ...prev,
                isDelegation: true,
                eventDescription: "Official delegation visit with boardroom discussion and facility walkthrough."
            }));
            setRunsheetRows([
                { time: '', layout: 'Boardroom Style', description: 'Organiser arrives to setup' },
                { time: '', layout: 'Boardroom Style', description: 'Delegation arrival, welcome & tea, coffee available' },
                { time: '', layout: 'Boardroom Style', description: 'Formalities' },
                { time: '', layout: 'Boardroom Style', description: 'Guests Depart' },
                { time: '', layout: 'Boardroom Style', description: 'Organiser cleanup and lock-up' }
            ]);
        } else if (type === 'workshop') {
            setFormData(prev => ({
                ...prev,
                isDelegation: false,
                eventDescription: "Standard collaborative day workshop containing split breakout groups."
            }));
            setRunsheetRows([
                { time: '', layout: 'Workshop Style/Group Tables', description: 'Organiser access & setup' },
                { time: '', layout: 'Workshop Style/Group Tables', description: 'Session 1' },
                { time: '', layout: 'Workshop Style/Group Tables', description: 'Catering Break' },
                { time: '', layout: 'Workshop Style/Group Tables', description: 'Session 2' },
                { time: '', layout: 'Workshop Style/Group Tables', description: 'Bump-out packdown' }
            ]);
        } else if (type === 'lecture') {
            setFormData(prev => ({
                ...prev,
                isDelegation: false,
                eventDescription: "Evening panel discussion sequence with networking drinks component."
            }));
            setRunsheetRows([
                { time: '', layout: 'Lecture/Theatre Style', description: 'Arrive & setup room' },
                { time: '', layout: 'Lecture/Theatre Style', description: 'AV Check & panel arrive' },
                { time: '', layout: 'Lecture/Theatre Style', description: 'Guests arrive' },
                { time: '', layout: 'Lecture/Theatre Style', description: 'Panel discussion and Q&A' },
                { time: '', layout: 'Clear Open Floor', description: 'Catering & Networking' },
                { time: '', layout: 'Clear Open Floor', description: 'Event ends / guests depart' },
                { time: '', layout: 'Clear Open Floor', description: 'Packup and lock doors' }
            ]);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        const showCateringPolicy = formData.catering === 'Yes' || formData.alcohol === 'Yes';
        if (showCateringPolicy && !cateringAcknowledged) {
            setCateringError(true);
            const section = document.getElementById('catering-policy-block');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (conductError && !conductAcknowledged) {
            setConductError(true);
            const section = document.getElementById('conduct-policy-block');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (formData.isHighRisk && !formData.riskDetails.trim()) {
            alert('Please explain your safety and risk control measures in the safety section.');
            const section = document.getElementById('risk-assessment-block');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setCateringError(false);
        setConductError(false);

        const targetIsoDateString = selectedCalendarDate.toISOString().split('T')[0];

        const payload = {
            eventName: formData.eventName || "Untitled MCIC Activation Hold",
            space: formData.space,
            includeColonnadeAddon: formData.includeColonnadeAddon,
            attendees: formData.attendees,
            department: formData.department || departmentType,
            catering: formData.catering || "No",
            alcohol: formData.alcohol || "No",
            isHighRisk: formData.isHighRisk,
            riskDetails: formData.isHighRisk ? formData.riskDetails : '',
            status: 'APPROVED',
            createdAt: new Date().toISOString(),
            bumpInDate: targetIsoDateString,
            bumpIn: formData.bumpIn || "09:00",
            bumpOut: formData.bumpOut || "17:00",
            eventStart: formData.eventStart || "09:30",
            eventEnd: formData.eventEnd || "16:30",
            mainContact: {
                name: formData.mainContact.name || "Guest Applicant",
                email: formData.mainContact.email || "test@example.com",
                phone: formData.mainContact.phone || ""
            },
            onDayContact: formData.sameAsMain
                ? {
                    name: formData.mainContact.name || "Guest Applicant",
                    email: formData.mainContact.email || "test@example.com",
                    phone: formData.mainContact.phone || ""
                }
                : {
                    name: formData.onDayContact.name || "",
                    email: formData.onDayContact.email || "",
                    phone: formData.onDayContact.phone || ""
                },
            equipmentRequests: formData.av,
            paymentMethod: formData.paymentMethod,
            billingInfo: formData.paymentMethod === 'Invoice' ? {
                abn: formData.abn,
                apEmail: formData.apEmail,
                address: formData.billingAddress
            } : null,
            signOff: {
                signature: formData.signature,
                fullName: formData.signerFullName,
                date: formData.signatureDate
            },
            quoteSummary: quote
        };

        try {
            const apiResponse = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const res = await apiResponse.json();

            if (res.success) {
                alert("🎉 Booking hold request logged onto server tracking systems!");
            } else {
                alert(`⚠️ Error submitting booking: ${res.error}`);
            }
        } catch (err) {
            console.error("Submission failed:", err);
            alert("Network connection error.");
        }
    };

    const isCalendarOption = (value) => {
        return value === "I know what space and date/time I want. I just want to check availability.";
    };

    const triggerRevealAllQuestions = () => {
        setShowFullForm(true);
        setTimeout(() => {
            const targetBlock = document.getElementById('rest-of-form-marker');
            if (targetBlock) targetBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    };

    const getDynamicWeekDays = (startDate) => {
        return Array.from({ length: 7 }, (_, i) => {
            const nextDay = new Date(startDate);
            nextDay.setDate(startDate.getDate() + i);
            return nextDay;
        });
    };

    const activeWeekDays = getDynamicWeekDays(currentWeekStart);

    const handleNextWeek = () => {
        setCurrentWeekStart(prev => {
            const nextMon = new Date(prev);
            nextMon.setDate(prev.getDate() + 7);
            return nextMon;
        });
    };

    const handlePrevWeek = () => {
        setCurrentWeekStart(prev => {
            const prevMon = new Date(prev);
            prevMon.setDate(prev.getDate() - 7);
            return prevMon;
        });
    };

    const handleDatePickerChange = (dateString) => {
        if (!dateString) return;
        const targetDate = new Date(dateString);
        setSelectedCalendarDate(targetDate);
        const dayOffset = targetDate.getDay() === 0 ? 6 : targetDate.getDay() - 1;
        const matchingMonday = new Date(targetDate);
        matchingMonday.setDate(targetDate.getDate() - dayOffset);
        setCurrentWeekStart(matchingMonday);
    };

    const formatDayKey = (date) => {
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return `${weekdays[date.getDay()]} ${String(date.getDate()).padStart(2, '0')}`;
    };

    const isColonnadeAddonEligible = ['MCIC Ground - Event Space', 'MCIC Ground - Design Space', 'MCIC Ground - Entire Space'].includes(formData.space);

    const renderEventDetailsSection = () => (
        <section key="event-details-block" className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
            <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">Event Details</h3>

            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-1">
                <div className="flex items-center gap-2 font-bold text-neutral-900 text-xs uppercase">
                    <span>💡 Planning Tip</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed font-normal">
                    Don’t worry if you haven’t finalized your exact event schedule or details yet! Just include your best estimates for now—we can refine everything together prior to confirming your booking hold.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Event Name</label>
                    <input type="text" value={formData.eventName} onChange={(e) => setFormData(prev => ({ ...prev, eventName: e.target.value }))} placeholder="e.g. HDR Pitching Workshop" className="w-full p-3 border border-gray-200 bg-white text-sm font-medium rounded-sm text-black outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Expected Attendees</label>
                    <input type="number" min="0" placeholder="0" value={formData.attendees || ''} onChange={(e) => setFormData(prev => ({ ...prev, attendees: parseInt(e.target.value) || 0 }))} className="w-full p-3 border border-gray-200 bg-white text-sm text-black font-medium rounded-sm outline-none" />
                </div>
            </div>

            {!isCalendarOption(formData.bookingIntent) && formData.attendees > 0 && (
                <div className="p-4 bg-neutral-900 text-white rounded-sm border border-neutral-800 space-y-1">
                    <span className="text-[9px] font-black tracking-widest text-white uppercase block">Suggested Target Allocation</span>
                    <h4 className="text-xs font-bold">Recommended: {localActiveSuggestedContext.name}</h4>
                    <p className="text-[11px] text-neutral-400 font-normal leading-normal">{localActiveSuggestedContext.note}</p>
                </div>
            )}

            {/* SPACE SELECTOR & STANDALONE + ADD-ON COLONNADE LOGIC */}
            <div className="p-5 bg-neutral-50 border border-gray-200 rounded-sm space-y-4">
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 block">Select Primary Room or Venue Space</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.keys(venueShowroom).map((spaceName) => (
                        <button
                            key={spaceName}
                            type="button"
                            onClick={() => updateSpaceSelection(spaceName)}
                            className={`p-3 text-left border rounded-sm transition-all ${formData.space === spaceName
                                ? 'bg-black text-white border-black font-bold shadow-xs'
                                : 'bg-white text-neutral-700 border-gray-200 hover:border-black'
                                }`}
                        >
                            <div className="text-xs uppercase font-extrabold">{spaceName.split(' - ')[1] || spaceName}</div>
                            <div className={`text-[10px] mt-0.5 ${formData.space === spaceName ? 'text-neutral-300' : 'text-gray-400'}`}>{spaceName}</div>
                        </button>
                    ))}
                </div>

                {/* DEDICATED ADD-ON COLONNADE CHECKBOX WHEN EVENT/DESIGN/ENTIRE SPACE IS SELECTED */}
                {isColonnadeAddonEligible && (
                    <div className="pt-3 border-t border-gray-200">
                        <label className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-sm cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={formData.includeColonnadeAddon}
                                onChange={(e) => setFormData(prev => ({ ...prev, includeColonnadeAddon: e.target.checked }))}
                                className="w-4 h-4 accent-black mt-0.5"
                            />
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wide text-neutral-900 block">
                                    Book Outdoor Colonnade as Add-on 🌿
                                </span>
                                <span className="text-[11px] text-neutral-600 block mt-0.5">
                                    Reserve the covered outdoor walkway area directly outside for guest check-in, catering tables, or breakout space.
                                </span>
                            </div>
                        </label>
                    </div>
                )}

                <div className="pt-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 block mb-2">Booking times (Please book 30 minutes to 1 hour for bump-in and bump-out)</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Bump-In Time (Access)</label>
                            <input type="time" value={formData.bumpIn} onChange={e => setFormData({ ...formData, bumpIn: e.target.value })} className="w-full p-2 border border-gray-200 text-xs font-semibold rounded-sm bg-white text-black outline-none focus:border-neutral-400" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Event Starts (Guest Arrival)</label>
                            <input type="time" value={formData.eventStart} onChange={e => setFormData({ ...formData, eventStart: e.target.value })} className="w-full p-2 border border-gray-200 text-xs font-semibold rounded-sm bg-white text-black outline-none focus:border-neutral-400" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Event Ends (Guest Departure)</label>
                            <input type="time" value={formData.eventEnd} onChange={e => setFormData({ ...formData, eventEnd: e.target.value })} className="w-full p-2 border border-gray-200 text-xs font-semibold rounded-sm bg-white text-black outline-none focus:border-neutral-400" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Bump-Out (Lock-up)</label>
                            <input type="time" value={formData.bumpOut} onChange={e => setFormData({ ...formData, bumpOut: e.target.value })} className="w-full p-2 border border-gray-200 text-xs font-semibold rounded-sm bg-white text-black outline-none focus:border-neutral-400" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-2 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Event Description</label>
                <textarea
                    placeholder="Outline event focus..."
                    className="w-full p-4 border border-gray-200 bg-white text-sm text-black font-medium rounded-sm h-28 resize-none outline-none"
                    value={formData.eventDescription} onChange={(e) => setFormData(prev => ({ ...prev, eventDescription: e.target.value }))}
                />
            </div>
        </section>
    );

    const renderAffiliationSection = () => (
        <section key="affiliation-block" className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
            <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                Affiliation
            </h3>
            <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Select University Relationship</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {['Internal to UNSW', 'External to UNSW'].map(type => (
                        <button
                            key={type} type="button"
                            onClick={() => setFormData({ ...formData, userType: type })}
                            className={`p-4 font-bold text-sm tracking-wide transition-all duration-150 text-center border rounded-sm hover:scale-[1.01] active:scale-[0.99] ${formData.userType === type
                                ? 'bg-white border-black text-black shadow-sm'
                                : 'bg-white border-gray-200 text-neutral-700 hover:bg-neutral-50'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {formData.userType === 'External to UNSW' && (
                <div className="pt-4 space-y-2 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Company / Organisation Name</label>
                    <input
                        type="text"
                        required={formData.userType === 'External to UNSW'}
                        placeholder="e.g. Acme Corporation Pty Ltd"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        className="w-full p-3 border border-gray-300 bg-white text-sm font-medium rounded-sm outline-none focus:border-neutral-500 text-black placeholder-gray-400"
                    />
                </div>
            )}

            {formData.userType === 'Internal to UNSW' && (
                <div className="space-y-6 pt-4 border-t border-gray-100 animate-in fade-in duration-200">
                    <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Specific Department</label>
                        <div className="grid grid-cols-2 gap-4">
                            {['UNSW Founders', 'Other Faculty or Division'].map(type => (
                                <button
                                    key={type} type="button"
                                    onClick={() => handleDeptTypeChange(type === 'UNSW Founders' ? 'UNSW Founders' : 'Other')}
                                    className={`p-3 text-xs font-bold uppercase tracking-wider text-center border rounded-sm transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] ${(type === 'UNSW Founders' && departmentType === 'UNSW Founders') || (type !== 'UNSW Founders' && departmentType === 'Other')
                                        ? 'bg-black text-white border-black shadow-sm'
                                        : 'bg-white border-gray-200 text-neutral-700 hover:bg-neutral-50'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        {departmentType === 'Other' && (
                            <div className="pt-4 space-y-4 border-t border-gray-100 mt-3 bg-neutral-50/50 p-4 rounded-sm animate-in slide-in-from-top-2 duration-200">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 block">UNSW Faculty / Division</label>
                                    <div className="relative">
                                        <select
                                            value={formData.unswDivision}
                                            onChange={(e) => setFormData({ ...formData, unswDivision: e.target.value })}
                                            className="w-full p-3 bg-white border border-gray-200 text-sm font-semibold rounded-sm outline-none appearance-none cursor-pointer focus:border-neutral-400 text-black"
                                            style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'gray\' stroke-width=\'2\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")', backgroundPosition: 'right 15px center', backgroundRepeat: 'no-repeat' }}
                                        >
                                            <option value="" disabled>Please select a division</option>
                                            <option value="UNSW Art, Design & Architecture">UNSW Art, Design & Architecture</option>
                                            <option value="UNSW Business School">UNSW Business School</option>
                                            <option value="UNSW Canberra">UNSW Canberra</option>
                                            <option value="UNSW Divisions">UNSW Divisions</option>
                                            <option value="UNSW Engineering">UNSW Engineering</option>
                                            <option value="UNSW Law">UNSW Law</option>
                                            <option value="UNSW Medicine">UNSW Medicine</option>
                                            <option value="UNSW Science">UNSW Science</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 block">Specific Unit / School / Department Name</label>
                                    <input
                                        type="text"
                                        required={departmentType === 'Other'}
                                        placeholder="e.g. School of Computer Science, Graduate Research School"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full p-3 border border-gray-300 bg-white text-sm font-medium rounded-sm outline-none focus:border-neutral-500 text-black placeholder-gray-400"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );

    const renderTimesAndRunsheetSection = () => (
        <section key="times-runsheet-block" className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
            <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                Schedule & Runsheet Setup
            </h3>

            <div className="space-y-3">
                <label className="text-xs font-bold tracking-wider text-gray-500 block">
                    Quick Preset Event Templates:
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button type="button" onClick={() => applyEventTemplate('workshop')} className={`p-2.5 text-xs font-bold uppercase rounded-sm border ${layoutMode === 'workshop' ? 'bg-black text-white border-black' : 'bg-neutral-50 border-gray-200 text-neutral-700 hover:bg-neutral-100'}`}>
                        Workshop
                    </button>
                    <button type="button" onClick={() => applyEventTemplate('lecture')} className={`p-2.5 text-xs font-bold uppercase rounded-sm border ${layoutMode === 'lecture' ? 'bg-black text-white border-black' : 'bg-neutral-50 border-gray-200 text-neutral-700 hover:bg-neutral-100'}`}>
                        Lecture / Panel
                    </button>
                    <button type="button" onClick={() => applyEventTemplate('tour')} className={`p-2.5 text-xs font-bold uppercase rounded-sm border ${layoutMode === 'tour' ? 'bg-black text-white border-black' : 'bg-neutral-50 border-gray-200 text-neutral-700 hover:bg-neutral-100'}`}>
                        Tour Walkthrough
                    </button>
                    <button type="button" onClick={() => applyEventTemplate('delegation')} className={`p-2.5 text-xs font-bold uppercase rounded-sm border ${layoutMode === 'delegation' ? 'bg-black text-white border-black' : 'bg-neutral-50 border-gray-200 text-neutral-700 hover:bg-neutral-100'}`}>
                        Delegation Visit
                    </button>
                </div>
            </div>

            <div className="space-y-3 pt-2">
                <label className="text-xs font-bold tracking-wider text-gray-500 block">
                    Tell us what's happening when so we can help in high friction moments. E.g Tell us when you need to video record, re-arrange furniture, receive and serve catering etc.
                </label>

                <div className="border border-gray-200 rounded-sm overflow-hidden shadow-sm bg-white">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-50 text-[10px] font-bold uppercase text-gray-500 border-b border-gray-200">
                                <th className="p-3 w-1/4">Time</th>
                                <th className="p-3 w-1/4">Room Layout</th>
                                <th className="p-3 w-5/12">Activity Description</th>
                                <th className="p-3 w-1/12 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium text-xs">
                            {runsheetRows.map((row, index) => (
                                <tr key={index} className="hover:bg-neutral-50/40 transition-colors">
                                    <td className="p-2">
                                        <input
                                            type="text"
                                            placeholder="e.g. 17:00 - 17:15"
                                            value={row.time}
                                            onChange={(e) => updateRunsheetRow(index, 'time', e.target.value)}
                                            className="w-full p-2 border border-gray-200 rounded-sm text-xs font-medium bg-white text-black outline-none focus:border-neutral-400"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <select
                                            value={row.layout}
                                            onChange={(e) => updateRunsheetRow(index, 'layout', e.target.value)}
                                            className="w-full p-2 border border-gray-200 rounded-sm text-xs font-semibold bg-white text-black outline-none cursor-pointer focus:border-neutral-400"
                                        >
                                            <option>Boardroom Style</option>
                                            <option>Workshop Style/Group Tables</option>
                                            <option>Lecture/Theatre Style</option>
                                            <option>Clear Open Floor</option>
                                            <option>No specific layout required (e.g. for a tour or walkthrough)</option>
                                            <option>Other (Please explain in description)</option>
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="text"
                                            placeholder={row.layout === 'Other (Please explain in description)' ? "Explain custom layout details..." : "e.g. 10 tables setup for groups of 8..."}
                                            value={row.description}
                                            onChange={(e) => updateRunsheetRow(index, 'description', e.target.value)}
                                            className="w-full p-2 border border-gray-200 rounded-sm text-xs font-medium bg-white text-black outline-none focus:border-neutral-400"
                                        />
                                    </td>
                                    <td className="p-2 text-center">
                                        <button
                                            type="button"
                                            disabled={runsheetRows.length === 1}
                                            onClick={() => removeRunsheetRow(index)}
                                            className={`text-sm rounded-sm p-1 ${runsheetRows.length === 1 ? 'text-gray-200 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end pt-1">
                    <button
                        type="button"
                        onClick={addRunsheetRow}
                        className="bg-neutral-900 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-sm hover:bg-black transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] shadow-2xs"
                    >
                        + Add Row
                    </button>
                </div>
            </div>
        </section>
    );

    const renderAvAndEquipmentSection = () => {
        const sharedEquipmentMaster = equipmentList.map(item => {
            const imageUrl = item.image || (item.images && item.images[0]) || '/images/inventory/placeholder.png';
            const isFoundersInternal = formData.userType === 'Internal to UNSW' && formData.department === 'UNSW Founders';

            const itemPrice = typeof item.costPerDay === 'number' ? item.costPerDay : parseFloat(item.costPerDay) || 0;
            const hasCost = itemPrice > 0;

            let itemPriceDisplay = 'Included ($0)';

            if (!isFoundersInternal && hasCost) {
                itemPriceDisplay = `$${itemPrice.toFixed(2)} / day`;
            } else if (hasCost && item.isFoundersStaffOnly) {
                itemPriceDisplay = `$${itemPrice.toFixed(2)} / day`;
            }

            return {
                ...item,
                key: item.id || item.name,
                label: item.name,
                totalHubStock: item.quantity || 1,
                imageUrl,
                itemPriceDisplay,
                unitPrice: itemPrice,
                isToggle: (item.quantity || 1) === 1
            };
        });

        return (
            <section key="av-equipment-block" className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-8">
                <div>
                    <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                        Audio Visual & Equipment
                    </h3>
                    <p className="text-xs text-gray-500 mt-2">
                        Selected Venue: <strong className="text-black">{formData.space || 'MCIC Ground - Event Space'}</strong>
                        {formData.includeColonnadeAddon && <span className="text-amber-600 font-bold ml-1">(+ Colonnade Add-on)</span>}
                    </p>
                </div>

                {/* STANDARD INCLUSIONS BANNER */}
                <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-sm space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="bg-emerald-600 text-white font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm">
                            Included
                        </span>
                        <h4 className="font-bold text-sm text-neutral-900">Standard Room Inclusions</h4>
                    </div>
                    <p className="text-xs text-gray-500">
                        These features are pre-installed in {formData.space || 'this space'} and included automatically:
                    </p>

                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-medium text-neutral-800 pt-1">
                        {(ROOM_INCLUSIONS[formData.space] || ROOM_INCLUSIONS['MCIC Ground - Event Space']).map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2 bg-white px-3 py-2 border border-neutral-200 rounded-sm">
                                <span className="text-emerald-600 font-bold">✓</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* SHARED INVENTORY GRID WITH THUMBNAIL PREVIEWS */}
                <div className="space-y-4">
                    <div className="border-b border-gray-100 pb-2 flex justify-between items-end">
                        <div>
                            <h4 className="font-bold text-sm text-black uppercase">Shared Hub Equipment & Asset Inventory</h4>
                            <p className="text-xs text-gray-500">
                                Shared across all venues. Rates adapt automatically based on your affiliation selection. Click item title to view full details.
                            </p>
                        </div>
                        <span className="font-mono text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 font-bold uppercase rounded-sm">
                            Live Inventory Active
                        </span>
                    </div>

                    {isLoadingEquipment ? (
                        <div className="p-8 text-center text-xs text-gray-400 font-mono">
                            Loading live inventory database catalog from Firestore...
                        </div>
                    ) : (
                        <div className="border border-gray-200 divide-y divide-gray-100 rounded-sm overflow-hidden shadow-xs">
                            {sharedEquipmentMaster.map((item) => {
                                const reservedInSlot = MOCK_TIME_SLOT_RESERVATIONS[item.key] || 0;
                                const availableStock = Math.max(0, item.totalHubStock - reservedInSlot);
                                const currentValue = formData.av[item.key] || (item.isToggle ? false : 0);
                                const isSelected = item.isToggle ? currentValue : currentValue > 0;

                                return (
                                    <div
                                        key={item.key}
                                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 transition-colors gap-4 ${isSelected ? 'bg-amber-50/40' : 'bg-white hover:bg-neutral-50/60'
                                            }`}
                                    >
                                        <a
                                            href={`/borrow/${item.key.toLowerCase()}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-start sm:items-center gap-4 group cursor-pointer flex-1"
                                        >
                                            {/* THUMBNAIL IMAGE CONTAINER */}
                                            <div className="w-16 h-16 shrink-0 bg-neutral-100 border border-neutral-200 rounded-sm overflow-hidden flex items-center justify-center group-hover:border-black transition-colors">
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.label}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                                                    }}
                                                />
                                                <span className="hidden text-xl text-neutral-400">📦</span>
                                            </div>

                                            <div className="space-y-1">
                                                <div>
                                                    <span className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-xs border ${availableStock > 0
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}>
                                                        {availableStock > 0 ? 'Available' : 'Reserved in Slot'}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-base text-black group-hover:underline decoration-neutral-400 underline-offset-2 pt-0.5">
                                                    {item.label} <span className="text-gray-400 font-normal text-xs opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                                                </h3>
                                                <p className="text-xs text-gray-500 font-medium">
                                                    🏷️ Cost: <span className="text-neutral-900 font-extrabold">{item.itemPriceDisplay}</span>
                                                </p>
                                            </div>
                                        </a>

                                        <div className="sm:w-auto w-full shrink-0 flex items-center justify-end pt-2 sm:pt-0">
                                            {item.isToggle ? (
                                                <label className={`inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-sm border cursor-pointer select-none transition-all ${currentValue
                                                    ? 'bg-black text-white border-black shadow-xs'
                                                    : 'bg-white text-neutral-700 border-gray-300 hover:border-black'
                                                    }`}>
                                                    <input
                                                        type="checkbox"
                                                        disabled={availableStock === 0}
                                                        checked={!!currentValue}
                                                        className="w-4 h-4 accent-black cursor-pointer disabled:cursor-not-allowed"
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            av: { ...formData.av, [item.key]: e.target.checked }
                                                        })}
                                                    />
                                                    <span>{currentValue ? 'Included ✓' : 'Add to Booking'}</span>
                                                </label>
                                            ) : (
                                                <div className={`flex items-center gap-2 border p-1.5 rounded-sm transition-all ${currentValue > 0 ? 'bg-white border-black shadow-xs' : 'bg-neutral-50 border-gray-300'
                                                    }`}>
                                                    <span className="text-[10px] font-extrabold uppercase text-gray-600 tracking-wider pl-1">Hire Qty:</span>
                                                    <select
                                                        value={currentValue}
                                                        disabled={availableStock === 0}
                                                        className="w-20 p-1.5 border border-gray-200 text-center font-bold text-xs bg-white rounded-sm text-black outline-none cursor-pointer focus:border-neutral-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            av: { ...formData.av, [item.key]: parseInt(e.target.value) || 0 }
                                                        })}
                                                    >
                                                        {Array.from({ length: availableStock + 1 }, (_, i) => i).map((num) => (
                                                            <option key={num} value={num}>{num}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
        );
    };

    const renderCateringSection = () => (
        <section key="catering-block" className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
            <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                Catering
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-neutral-50/50 rounded-sm border border-gray-100">
                <div className="space-y-2">
                    <p className="text-xs font-bold text-neutral-700">Will you be serving food and drinks?</p>
                    <div className="flex gap-2">
                        {['Yes', 'No'].map(choice => (
                            <button
                                key={choice} type="button"
                                onClick={() => setFormData({ ...formData, catering: choice })}
                                className={`flex-1 py-2 text-xs font-bold uppercase rounded-sm border transition-colors ${formData.catering === choice ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-neutral-600 hover:bg-neutral-100'}`}
                            >
                                {choice}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <p className="text-xs font-bold text-neutral-700">Will you be serving alcohol?</p>
                    <div className="flex gap-2">
                        {['Yes', 'No'].map(choice => (
                            <button
                                key={choice} type="button"
                                onClick={() => setFormData({ ...formData, alcohol: choice })}
                                className={`flex-1 py-2 text-xs font-bold uppercase rounded-sm border transition-colors ${formData.alcohol === choice ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-neutral-600 hover:bg-neutral-100'}`}
                            >
                                {choice}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {(formData.catering === 'Yes' || formData.alcohol === 'Yes') && (
                <div
                    id="catering-policy-block"
                    className={`border p-4 rounded-sm space-y-4 text-xs font-medium leading-relaxed shadow-sm transition-colors duration-200 ${cateringError
                        ? 'border-red-300 bg-red-50/60 text-red-900'
                        : 'border-amber-200 bg-amber-50/40 text-neutral-800'
                        }`}
                >
                    <div className="flex items-center gap-2 font-bold text-black uppercase tracking-wide">
                        <span>💡</span> Self-Catering Policy
                    </div>
                    <p>
                        Anyone using our spaces will need to organise their own catering and serviceware.
                    </p>

                    <div className="pt-3 border-t border-dashed border-neutral-200/80">
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded-sm border-gray-300 accent-black mt-0.5"
                                checked={cateringAcknowledged}
                                onChange={(e) => {
                                    setCateringAcknowledged(e.target.checked);
                                    if (e.target.checked) setCateringError(false);
                                }}
                            />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-tight text-black">
                                    I acknowledge this is a self-catering space
                                </span>
                            </div>
                        </label>
                    </div>
                </div>
            )}
        </section>
    );
    const renderRiskAssessmentSection = () => (
        <section id="risk-assessment-block" key="risk-block" className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
            <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                Safety & Risk Assessment
            </h3>

            <div className="space-y-4">
                <label className="flex items-start gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-sm cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={formData.isHighRisk}
                        onChange={(e) => setFormData(prev => ({ ...prev, isHighRisk: e.target.checked }))}
                        className="w-4 h-4 accent-black mt-0.5 rounded-sm"
                    />
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-black block">
                            Event Involves High-Risk Activities or Special Machinery ⚠️
                        </span>
                        <span className="text-xs text-gray-500 mt-1 block leading-relaxed">
                            Includes live machinery demos, soldering, open flames, physical hazards, chemicals, or specialized fabrication equipment.
                        </span>
                    </div>
                </label>

                {formData.isHighRisk && (
                    <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-sm space-y-2 animate-in fade-in">
                        <label className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
                            Safety Protocols & Risk Management Plan *
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Detail safety measures, qualified personnel supervision, protective equipment, or risk controls..."
                            value={formData.riskDetails}
                            onChange={(e) => setFormData(prev => ({ ...prev, riskDetails: e.target.value }))}
                            className="w-full p-3 border border-amber-300 bg-white text-xs text-black font-medium rounded-sm outline-none focus:border-amber-500"
                        />
                    </div>
                )}
            </div>
        </section>
    );

    const renderContactDetailsSection = () => (
        <section key="contact-details-block" className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
            <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                Contact & Responsible Person
            </h3>

            <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Main Event Organiser</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Full Name *</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Jane Doe"
                            value={formData.mainContact.name}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                mainContact: { ...prev.mainContact, name: e.target.value }
                            }))}
                            className="w-full p-2.5 border border-gray-200 bg-white text-xs font-medium rounded-sm text-black outline-none focus:border-black"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Email Address *</label>
                        <input
                            type="email"
                            required
                            placeholder="e.g. j.doe@unsw.edu.au"
                            value={formData.mainContact.email}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                mainContact: { ...prev.mainContact, email: e.target.value }
                            }))}
                            className="w-full p-2.5 border border-gray-200 bg-white text-xs font-medium rounded-sm text-black outline-none focus:border-black"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Mobile Phone *</label>
                        <input
                            type="tel"
                            required
                            placeholder="e.g. 0400 000 000"
                            value={formData.mainContact.phone}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                mainContact: { ...prev.mainContact, phone: e.target.value }
                            }))}
                            className="w-full p-2.5 border border-gray-200 bg-white text-xs font-medium rounded-sm text-black outline-none focus:border-black"
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={formData.sameAsMain}
                            onChange={(e) => setFormData(prev => ({ ...prev, sameAsMain: e.target.checked }))}
                            className="w-4 h-4 accent-black rounded-sm"
                        />
                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                            On-Day Event Contact is the same as Main Organiser
                        </span>
                    </label>
                </div>

                {!formData.sameAsMain && (
                    <div className="pt-4 border-t border-gray-100 space-y-4 animate-in fade-in">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">On-Day Emergency Contact</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-500">On-Day Contact Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Alex Smith"
                                    value={formData.onDayContact.name}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        onDayContact: { ...prev.onDayContact, name: e.target.value }
                                    }))}
                                    className="w-full p-2.5 border border-gray-200 bg-white text-xs font-medium rounded-sm text-black outline-none focus:border-black"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-500">On-Day Contact Email</label>
                                <input
                                    type="email"
                                    placeholder="e.g. alex.smith@unsw.edu.au"
                                    value={formData.onDayContact.email}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        onDayContact: { ...prev.onDayContact, email: e.target.value }
                                    }))}
                                    className="w-full p-2.5 border border-gray-200 bg-white text-xs font-medium rounded-sm text-black outline-none focus:border-black"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-500">On-Day Contact Mobile Phone</label>
                                <input
                                    type="tel"
                                    placeholder="e.g. 0411 111 111"
                                    value={formData.onDayContact.phone}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        onDayContact: { ...prev.onDayContact, phone: e.target.value }
                                    }))}
                                    className="w-full p-2.5 border border-gray-200 bg-white text-xs font-medium rounded-sm text-black outline-none focus:border-black"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );

    return (
        <div className="space-y-12">
            {/* ARCHITECTURE SHOWCASE & SPACE PHOTOS SHOWROOM */}
            <div className="space-y-4">
                <div className="flex flex-col gap-3 border-b border-gray-200 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-2xl font-black text-black tracking-tight">Six bookable Event Spaces</h3>
                            <p className="text-xs text-neutral-400 font-medium mt-1">Click any event space to view images, specs, and inclusions.</p>
                        </div>
                        <div className="flex flex-wrap gap-1 md:justify-end">
                            {Object.keys(venueShowroom).map((spaceName) => (
                                <button
                                    key={spaceName}
                                    onClick={() => updateSpaceSelection(spaceName)}
                                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wide rounded-sm border transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${showroomSpace === spaceName
                                        ? 'bg-black text-white border-black shadow-md'
                                        : 'bg-white border-gray-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-400'
                                        }`}
                                    type="button">
                                    {spaceName.split(' - ')[1] || spaceName}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <section className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12">
                    <div className="md:col-span-4 bg-neutral-900 p-4 flex flex-col justify-between space-y-4 items-center">
                        <div className="bg-neutral-800 rounded-sm overflow-hidden relative aspect-[3/4] max-w-[400px] w-full flex items-center justify-center">
                            <img
                                src={venueShowroom[showroomSpace]?.imgs[activePhotoIndex] || '/images/venues/event-space-1.JPG'}
                                alt={`${showroomSpace} view ${activePhotoIndex + 1}`}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white px-2 py-1 text-[10px] uppercase font-mono tracking-widest rounded-sm">
                                Photo {activePhotoIndex + 1} of {venueShowroom[showroomSpace]?.imgs.length}
                            </div>
                        </div>

                        <div className="w-full max-w-[320px] space-y-2">
                            <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <span>📸</span> Viewport perspective:
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {venueShowroom[showroomSpace]?.imgs.map((photoUrl, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setActivePhotoIndex(idx)}
                                        className={`w-12 aspect-[3/4] rounded-sm overflow-hidden bg-neutral-800 border-2 flex-shrink-0 transition-all duration-150 hover:scale-[1.03] ${activePhotoIndex === idx
                                            ? 'border-yellow-400 opacity-100 scale-[0.95]'
                                            : 'border-transparent opacity-40 hover:opacity-100'
                                            }`}
                                    >
                                        <img src={photoUrl} alt="Thumbnail preview" className="w-full h-full object-cover pointer-events-none" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-8 p-6 flex flex-col bg-white border-t md:border-t-0 md:border-l border-gray-100">
                        <div className="space-y-4">
                            <div>
                                <span className="text-[9px] font-black tracking-widest text-neutral-400 uppercase">
                                    {venueShowroom[showroomSpace]?.roomNumber || showroomSpace}
                                </span>
                                <h4 className="text-xl font-black tracking-tight text-black mt-0.5">
                                    {showroomSpace.replace('MCIC Ground - ', '').replace('MCIC Level 1 - ', '')}
                                </h4>
                            </div>
                            <p
                                className="text-xs text-gray-600 leading-relaxed font-normal"
                                dangerouslySetInnerHTML={{ __html: venueShowroom[showroomSpace]?.description }}
                            />
                        </div>
                    </div>
                </section>
            </div>

            {/* THE MAIN FORM WRAPPER TRACK BOX */}
            <form id="booking-form" onSubmit={handleFormSubmit} className="space-y-12">
                <section id="booking-intent-section" className="bg-white border border-gray-200 rounded-sm shadow-sm space-y-6 overflow-hidden">
                    <div className="bg-neutral-900 text-white p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-extrabold tracking-tight uppercase">Booking Expression of Interest Form</h2>
                        </div>
                        <div className="text-[11px] font-medium text-neutral-400 max-w-xs leading-normal sm:text-right">
                            Select an option below to initiate space selection or calendar checking.
                        </div>
                    </div>

                    <div className="px-8 pb-8 pt-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setFormData(prev => ({
                                        ...prev,
                                        bookingIntent: "I know what space and date/time I want. I just want to check availability."
                                    }));
                                }}
                                className={`p-6 text-left border-2 rounded-sm transition-all duration-200 flex flex-col justify-center min-h-[120px] outline-none ${formData.bookingIntent === "I know what space and date/time I want. I just want to check availability."
                                    ? 'bg-neutral-50 border-black text-black font-extrabold shadow-sm'
                                    : 'bg-white border-neutral-200 text-neutral-800 hover:border-neutral-400 font-semibold'
                                    }`}
                            >
                                <span className="text-sm tracking-tight leading-snug">
                                    I know what space and/or date/time I want to book. I am just here to check availability.
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setFormData(prev => ({
                                        ...prev,
                                        bookingIntent: "I am flexible on date/time and space. I'd like to see all my options."
                                    }));
                                    setShowFullForm(true);
                                }}
                                className={`p-6 text-left border-2 rounded-sm transition-all duration-200 flex flex-col justify-center min-h-[120px] outline-none ${formData.bookingIntent === "I am flexible on date/time and space. I'd like to see all my options."
                                    ? 'bg-neutral-50 border-black text-black font-extrabold shadow-sm'
                                    : 'bg-white border-neutral-200 text-neutral-800 hover:border-neutral-400 font-semibold'
                                    }`}
                            >
                                <span className="text-sm tracking-tight leading-snug">
                                    I am flexible on date/time and space. I'd like to see all my options.
                                </span>
                            </button>
                        </div>

                        {formData.bookingIntent && (
                            <div className="space-y-6 pt-4 border-t border-dashed border-neutral-200 animate-in fade-in duration-300">
                                {isCalendarOption(formData.bookingIntent) ? (
                                    <div className="p-5 border border-neutral-200 bg-neutral-50/50 rounded-sm space-y-4">
                                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-sm font-black uppercase tracking-tight text-black">Live Calendar</h4>
                                                <input
                                                    type="date"
                                                    value={`${selectedCalendarDate.getFullYear()}-${String(selectedCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(selectedCalendarDate.getDate()).padStart(2, '0')}`}
                                                    onChange={(e) => handleDatePickerChange(e.target.value)}
                                                    className="p-1.5 px-2 bg-white border border-neutral-300 rounded-sm font-mono text-xs font-bold text-black outline-none cursor-pointer"
                                                />
                                            </div>

                                            <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-wide font-bold">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-300 rounded-sm block" />
                                                    <span className="text-neutral-600">Available</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 bg-rose-100 border border-rose-300 rounded-sm block" />
                                                    <span className="text-neutral-600">Unavailable</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 bg-neutral-100 p-1 rounded-sm border border-neutral-200">
                                            <button type="button" onClick={handlePrevWeek} className="p-1.5 text-xs font-black bg-white border border-neutral-300 rounded-sm hover:bg-neutral-50">←</button>
                                            <div className="flex gap-1 overflow-x-auto flex-1 justify-center">
                                                {activeWeekDays.map((dateItem) => {
                                                    const isSelected = selectedCalendarDate.toDateString() === dateItem.toDateString();
                                                    return (
                                                        <button
                                                            key={dateItem.toISOString()}
                                                            type="button"
                                                            onClick={() => setSelectedCalendarDate(dateItem)}
                                                            className={`px-3 py-1.5 text-xs font-mono rounded-sm border flex flex-col items-center min-w-[65px] transition-all ${isSelected
                                                                ? 'bg-neutral-900 border-black text-white font-black scale-[1.02]'
                                                                : 'bg-white border-transparent text-neutral-600 hover:bg-neutral-50'
                                                                }`}
                                                        >
                                                            <span className="text-[9px] uppercase opacity-60">{dateItem.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                                            <span>{dateItem.getDate()}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <button type="button" onClick={handleNextWeek} className="p-1.5 text-xs font-black bg-white border border-neutral-300 rounded-sm hover:bg-neutral-50">→</button>
                                        </div>

                                        <div className="p-3.5 bg-neutral-900 text-white font-bold rounded-xs text-xs">
                                            Select your time blocks below. Scroll up/down to see full 24-hour availability. Hold <kbd className="bg-neutral-800 px-1 rounded-sm border border-neutral-700 text-[10px] font-mono">Shift</kbd> to select ranges.
                                            <br />Note: You can only book one room at a time.
                                        </div>

                                        <div className="border border-gray-200 rounded-sm bg-white shadow-sm overflow-hidden">
                                            <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
                                                <table className="w-full text-left border-collapse min-w-[750px]">
                                                    <thead>
                                                        <tr className="bg-neutral-900 text-white text-[10px] font-black uppercase tracking-wider border-b border-neutral-800 sticky top-0 z-20">
                                                            <th className="p-3 w-1/6 bg-neutral-900 sticky left-0 z-30">Timeline</th>
                                                            {mockCalendarData.rooms.map((room) => (
                                                                <th key={room.name} className="p-3 text-center border-l border-neutral-800">
                                                                    {room.name}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 font-medium text-xs">
                                                        {mockCalendarData.timeSlots.map((slot) => (
                                                            <tr key={slot} className="hover:bg-neutral-50/50 transition-colors">
                                                                <td className="p-3 font-mono font-bold text-neutral-800 tracking-tight bg-white sticky left-0 z-10 border-r border-neutral-100">
                                                                    {slot}
                                                                </td>
                                                                {mockCalendarData.rooms.map((room) => {
                                                                    const dayKeyString = formatDayKey(selectedCalendarDate);
                                                                    const isBlocked = isSlotBlockedByCalendar(room.name, slot);
                                                                    const compositeSlotKey = `${room.name}|${dayKeyString}|${slot}`;
                                                                    const isCurrentlySelected = selectedSlots.includes(compositeSlotKey);

                                                                    return (
                                                                        <td key={room.name} className="p-1 text-center border-l border-gray-100 min-w-[120px]">
                                                                            {!isBlocked ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setSelectedSlots(prev =>
                                                                                            prev.includes(compositeSlotKey)
                                                                                                ? prev.filter(k => k !== compositeSlotKey)
                                                                                                : [...prev, compositeSlotKey]
                                                                                        );
                                                                                    }}
                                                                                    className={`w-full py-2 text-[9px] font-black uppercase tracking-wider font-sans border rounded-sm transition-all ${isCurrentlySelected
                                                                                        ? "bg-black border-black text-white shadow-inner"
                                                                                        : "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70"
                                                                                        }`}
                                                                                >
                                                                                    {isCurrentlySelected ? "✓ Selected" : "Select"}
                                                                                </button>
                                                                            ) : (
                                                                                <div className="py-2 text-[9px] font-black uppercase tracking-wider font-sans border rounded-sm bg-rose-50 border-rose-200 text-rose-800 opacity-60 cursor-not-allowed">
                                                                                    Booked
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-neutral-200/60 text-center">
                                            <button
                                                type="button"
                                                onClick={triggerRevealAllQuestions}
                                                className="w-full bg-[#EAD64D] text-black text-center font-black py-4 text-xs uppercase tracking-widest rounded-sm hover:bg-black hover:text-white transition-all duration-200 cursor-pointer"
                                            >
                                                Continue to Booking Form ↓
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pt-4 border-t border-neutral-200 text-center sm:text-left">
                                        <p className="text-xs text-neutral-800 font-bold uppercase tracking-wide">Tell us about your event</p>
                                        <p className="text-[11px] text-neutral-400 font-medium mt-0.5">
                                            Complete the details below to see space recommendation availability.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {showFullForm && (
                    <div id="rest-of-form-marker" className="space-y-12 animate-in fade-in duration-300">
                        {isCalendarOption(formData.bookingIntent) ? (
                            <>
                                {renderAffiliationSection()}
                                {renderEventDetailsSection()}
                                {renderTimesAndRunsheetSection()}
                                {renderAvAndEquipmentSection()}
                                {renderCateringSection()}
                                {renderRiskAssessmentSection()}
                                {renderContactDetailsSection()}
                            </>
                        ) : (
                            <>
                                {renderEventDetailsSection()}
                                {renderTimesAndRunsheetSection()}
                                {renderAffiliationSection()}
                                {renderAvAndEquipmentSection()}
                                {renderCateringSection()}
                                {renderRiskAssessmentSection()}
                                {renderContactDetailsSection()}
                            </>
                        )}

                        {/* SECTION: TICKETING SETUP */}
                        <section className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
                            <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                                Ticketing & Event Registration
                            </h3>
                            <div className="space-y-4">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">How will guests register for your event?</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, ticketingMethod: 'external' }))}
                                        className={`p-4 font-bold text-sm text-center border rounded-sm transition-all ${formData.ticketingMethod === 'external' ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-neutral-700 hover:bg-neutral-50'}`}
                                    >
                                        External Registration Portal (Eventbrite, Humanitix, Luma, etc.)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, ticketingMethod: 'internal' }))}
                                        className={`p-4 font-bold text-sm text-center border rounded-sm transition-all ${formData.ticketingMethod === 'internal' ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-neutral-700 hover:bg-neutral-50'}`}
                                    >
                                        Internal Registration Portal
                                    </button>
                                </div>

                                {formData.ticketingMethod === 'external' ? (
                                    <div className="pt-3 space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">External Registration URL</label>
                                        <input
                                            type="url"
                                            placeholder="https://eventbrite.com/e/your-event-id"
                                            value={formData.externalTicketUrl}
                                            onChange={(e) => setFormData(prev => ({ ...prev, externalTicketUrl: e.target.value }))}
                                            className="w-full p-3 border border-gray-200 text-sm font-medium rounded-sm text-black outline-none focus:border-black"
                                        />
                                    </div>
                                ) : (
                                    <div className="pt-3 space-y-4 bg-neutral-50 p-4 border border-gray-200 rounded-sm">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Banner / Display Title</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Founders Pitch Night Ticket Registration"
                                                value={formData.ticketBannerName}
                                                onChange={(e) => setFormData(prev => ({ ...prev, ticketBannerName: e.target.value }))}
                                                className="w-full p-3 border border-gray-200 bg-white text-sm font-medium rounded-sm text-black outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Maximum Ticket Cap</label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="100"
                                                value={formData.maxTicketCapacity || ''}
                                                onChange={(e) => setFormData(prev => ({ ...prev, maxTicketCapacity: parseInt(e.target.value) || 0 }))}
                                                className="w-full p-3 border border-gray-200 bg-white text-sm font-medium rounded-sm text-black outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* SECTION: EVENT SUPPORT & FOCUS */}
                        <section className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
                            <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                                Event Support & Focus
                            </h3>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                                        Does this event have to do with Innovation / Entrepreneurship?
                                    </label>
                                    <div className="flex gap-4 max-w-xs pt-1">
                                        {['Yes', 'No'].map((choice) => (
                                            <button
                                                key={choice}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, isInnovationOrEntrepreneurship: choice })}
                                                className={`flex-1 py-2 text-xs font-bold uppercase rounded-sm border transition-all duration-150 ${formData.isInnovationOrEntrepreneurship === choice
                                                    ? 'bg-black text-white border-black shadow-sm'
                                                    : 'bg-white border-gray-200 text-neutral-600 hover:bg-neutral-100'
                                                    }`}
                                            >
                                                {choice}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-gray-100">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                                        Would you like to book a casual staff member for event support?
                                    </label>
                                    <div className="flex gap-4 max-w-xs pt-1">
                                        {['Yes', 'No'].map((choice) => (
                                            <button
                                                key={choice}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, wantsCasualStaff: choice })}
                                                className={`flex-1 py-2 text-xs font-bold uppercase rounded-sm border transition-all duration-150 ${formData.wantsCasualStaff === choice
                                                    ? 'bg-black text-white border-black shadow-sm'
                                                    : 'bg-white border-gray-200 text-neutral-600 hover:bg-neutral-100'
                                                    }`}
                                            >
                                                {choice}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-gray-100">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                                        Do you need help to source a judge or mentor for an entrepreneurship related event?
                                    </label>
                                    <div className="flex gap-4 max-w-xs pt-1">
                                        {['Yes', 'No'].map((choice) => (
                                            <button
                                                key={choice}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, needsJudgeHelp: choice })}
                                                className={`flex-1 py-2 text-xs font-bold uppercase rounded-sm border transition-all duration-150 ${formData.needsJudgeHelp === choice
                                                    ? 'bg-black text-white border-black shadow-sm'
                                                    : 'bg-white border-gray-200 text-neutral-600 hover:bg-neutral-100'
                                                    }`}
                                            >
                                                {choice}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SECTION: INTERNAL UNSW FOUNDERS STAFF COORDINATION */}
                        {departmentType === 'UNSW Founders' && (
                            <section className="bg-amber-50/60 p-8 border border-amber-200 rounded-sm shadow-sm space-y-6">
                                <h3 className="text-lg font-extrabold tracking-tight uppercase text-amber-900 border-b border-amber-200 pb-2">
                                    Internal Founders Staff Coordination
                                </h3>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
                                            Do you need Tamara present for this event?
                                        </label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                                            {['Whole event', 'Setup', 'Formalities', 'Not at all'].map((opt) => (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, tamaraPresence: opt })}
                                                    className={`py-2 px-3 text-xs font-bold uppercase rounded-sm border transition-all ${formData.tamaraPresence === opt
                                                        ? 'bg-amber-900 text-white border-amber-900 shadow-xs'
                                                        : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-100/50'
                                                        }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-amber-200/80">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
                                                Do you need casual staff for this internal booking?
                                            </label>
                                            <div className="flex gap-4 max-w-xs pt-1">
                                                {['Yes', 'No'].map((choice) => (
                                                    <button
                                                        key={choice}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, needsFoundersCasualStaff: choice })}
                                                        className={`flex-1 py-2 text-xs font-bold uppercase rounded-sm border transition-all ${formData.needsFoundersCasualStaff === choice
                                                            ? 'bg-amber-900 text-white border-amber-900 shadow-xs'
                                                            : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-100/50'
                                                            }`}
                                                    >
                                                        {choice}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {formData.needsFoundersCasualStaff === 'Yes' && (
                                            <div className="space-y-4 pt-2">
                                                <label className="text-[11px] font-black uppercase tracking-wider text-amber-900 block">
                                                    Casual Staff Shift Details
                                                </label>
                                                {formData.casualStaffDetails.map((staffRow, idx) => (
                                                    <div key={idx} className="p-4 bg-white border border-amber-200 rounded-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-end shadow-2xs">
                                                        <div className="md:col-span-3 space-y-1">
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Preferred Staff Member</label>
                                                            <select
                                                                value={staffRow.preferredStaff}
                                                                onChange={(e) => updateCasualStaffDetail(idx, 'preferredStaff', e.target.value)}
                                                                className="w-full p-2 border border-gray-200 rounded-sm text-xs font-medium text-black outline-none focus:border-amber-400"
                                                            >
                                                                <option value="">No Preference</option>
                                                                {CASUAL_STAFF_LIST.map((name) => (
                                                                    <option key={name} value={name}>{name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="md:col-span-2 space-y-1">
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Shift Start</label>
                                                            <input
                                                                type="time"
                                                                value={staffRow.shiftStart}
                                                                onChange={(e) => updateCasualStaffDetail(idx, 'shiftStart', e.target.value)}
                                                                className="w-full p-2 border border-gray-200 rounded-sm text-xs font-medium text-black outline-none focus:border-amber-400"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2 space-y-1">
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Shift End</label>
                                                            <input
                                                                type="time"
                                                                value={staffRow.shiftEnd}
                                                                onChange={(e) => updateCasualStaffDetail(idx, 'shiftEnd', e.target.value)}
                                                                className="w-full p-2 border border-gray-200 rounded-sm text-xs font-medium text-black outline-none focus:border-amber-400"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-4 space-y-1">
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Tasks / Description</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. Stage setup & Slido Q&A mic running"
                                                                value={staffRow.tasks}
                                                                onChange={(e) => updateCasualStaffDetail(idx, 'tasks', e.target.value)}
                                                                className="w-full p-2 border border-gray-200 rounded-sm text-xs font-medium text-black outline-none focus:border-amber-400"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-1 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeCasualStaffRow(idx)}
                                                                disabled={formData.casualStaffDetails.length === 1}
                                                                className={`p-2 text-xs font-bold rounded-sm ${formData.casualStaffDetails.length === 1 ? 'text-gray-300' : 'text-red-600 hover:bg-red-50'}`}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={addCasualStaffRow}
                                                    className="bg-amber-900 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-sm hover:bg-amber-950 transition-all shadow-2xs"
                                                >
                                                    + Add Staff Member
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* SECTION: BILLING & PAYMENT INFORMATION */}
                        {quote.total > 0 && (
                            <section className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
                                <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                                    Billing & Payment Details
                                </h3>
                                <div className="space-y-4">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Payment Method</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {['Invoice', 'Credit Card'].map(method => (
                                            <button
                                                key={method}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method }))}
                                                className={`p-3 text-xs font-bold uppercase rounded-sm border transition-all ${formData.paymentMethod === method ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-neutral-700 hover:bg-neutral-50'}`}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>

                                    {formData.paymentMethod === 'Invoice' && (
                                        <div className="pt-4 border-t border-gray-100 space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-gray-500">ABN Number</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. 57 195 873 179"
                                                        value={formData.abn}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, abn: e.target.value }))}
                                                        className="w-full p-2.5 border border-gray-200 bg-white text-xs font-medium rounded-sm text-black outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-gray-500">Accounts Payable Email</label>
                                                    <input
                                                        type="email"
                                                        placeholder="accounts@company.com"
                                                        value={formData.apEmail}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, apEmail: e.target.value }))}
                                                        className="w-full p-2.5 border border-gray-200 bg-white text-xs font-medium rounded-sm text-black outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-gray-500">Billing Address</label>
                                                <input
                                                    type="text"
                                                    placeholder="Street Address, Suburb, Postcode"
                                                    value={formData.billingAddress}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, billingAddress: e.target.value }))}
                                                    className="w-full p-2.5 border border-gray-200 bg-white text-xs font-medium rounded-sm text-black outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* SECTION: SIGNATURE & ACKNOWLEDGEMENT */}
                        <section className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
                            <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                                Declaration & Sign-Off
                            </h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-500">Signer Full Name *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Full Legal Name"
                                            value={formData.signerFullName}
                                            onChange={(e) => setFormData(prev => ({ ...prev, signerFullName: e.target.value }))}
                                            className="w-full p-2.5 border border-gray-200 bg-white text-xs font-medium rounded-sm text-black outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-500">Date</label>
                                        <input
                                            type="date"
                                            value={formData.signatureDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, signatureDate: e.target.value }))}
                                            className="w-full p-2.5 border border-gray-200 bg-white text-xs font-medium rounded-sm text-black outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-gray-500">Digital Signature (Type Full Name) *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Type name to sign digitally"
                                        value={formData.signature}
                                        onChange={(e) => setFormData(prev => ({ ...prev, signature: e.target.value }))}
                                        className="w-full p-2.5 border border-gray-200 bg-white text-xs font-serif italic text-black outline-none"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* ACCORDION FAQ ITEM 9: CASUAL STAFFING POLICY */}
                        <section className="bg-white border border-gray-200 rounded-sm overflow-hidden">
                            <button
                                type="button"
                                onClick={() => toggleAccordion('casual-staff')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50 hover:bg-neutral-100 cursor-pointer"
                            >
                                <span>Should I book your casual staff for my event?</span>
                                <span>{activeAccordion === 'casual-staff' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'casual-staff' && (
                                <div className="p-6 bg-white text-xs space-y-4 text-gray-600 font-normal leading-relaxed">
                                    <p className="text-neutral-700 font-medium">
                                        Booking casual staff depends entirely on the timing and complexity of your event:
                                    </p>
                                    <div className="space-y-4 text-neutral-700 font-medium">
                                        <div className="p-3.5 bg-neutral-900 text-white font-medium rounded-xs">
                                            <strong className="block uppercase text-[10px] tracking-wide mb-0.5">Mandatory Staffing (After-Hours)</strong>
                                            This space is managed by standard staff working 8:30am – 4:30pm on weekdays. If your booking requires access prior to 8:30am or extends past 4:30pm, hiring dedicated casual staff is mandatory ($50/hr, min 3 hours; min 4 hours on Sundays/Public Holidays).
                                        </div>
                                        <div>
                                            <strong className="text-neutral-900 block uppercase text-[10px] tracking-wide mb-1">Optional Staffing (Standard Hours)</strong>
                                            During core office hours (8:30am – 4:30pm), standard staffing covers room unlock, basic orientation, final checkout and is on call for ad-hoc technical requests. You should opt to pay for casual staff ($50/hr, minimum 3 hours) if:
                                            <ul className="list-disc pl-4 mt-2 space-y-1 font-normal text-gray-600">
                                                <li>You require tables, chairs, or stage configurations fully staged prior to your arrival.</li>
                                                <li>You want a staff member present inside the room throughout the session to continuously assist with microphones, live streams, or slides.</li>
                                                <li>You need hands-on event support with guest registration, greeting attendees, managing catering deliveries, or performing room layout changes during the event.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        <button type="submit" className="w-full bg-black text-white font-extrabold py-5 text-sm uppercase tracking-widest rounded-sm hover:bg-neutral-800 transition-all duration-200 shadow-md cursor-pointer">
                            Submit Booking Hold Request
                        </button>
                    </div>
                )}
                {/* LIVE QUOTE BREAKDOWN CONTAINER */}
                <div className="bg-neutral-900 text-white p-6 border border-neutral-800 rounded-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                        <div>
                            <h3 className="text-sm font-extrabold uppercase tracking-wider">Live Estimated Quote Breakdown</h3>
                            <p className="text-[11px] text-neutral-400">Calculated automatically based on affiliation, hours, and selected assets.</p>
                        </div>
                        {quote.discountPercentage > 0 && (
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-sm">
                                {quote.discountPercentage}% Discount Applied
                            </span>
                        )}
                    </div>

                    {quote.lineItems && quote.lineItems.length > 0 ? (
                        <div className="space-y-2 divide-y divide-neutral-800 text-xs">
                            {quote.lineItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between pt-2">
                                    <span className="text-neutral-300 font-medium">{item.description || item.label}</span>
                                    <span className="font-mono font-bold text-white">
                                        {item.cost === 0 ? 'Included ($0)' : `$${(item.cost || 0).toFixed(2)}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-neutral-400 italic py-2">
                            Select your affiliation, booking duration, and equipment above to compute itemized line items.
                        </p>
                    )}

                    <div className="pt-4 border-t border-neutral-800 flex justify-between items-end">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Total Estimated Fee</span>
                            <span className="text-2xl font-black font-mono text-white">
                                ${(quote.totalDue || quote.total || 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-normal block">Includes GST (10%)</span>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}