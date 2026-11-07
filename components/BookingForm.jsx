"use client";

// components/BookingForm.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import EventFAQs from '@/components/EventFAQs'; // <--- Import FAQ component
import SignInPanel from '@/components/SignInPanel';
import { db } from '../app/lib/firebase'; // <--- Use relative path to app/lib/firebase
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore';
import { calculateQuote, hirePriceText, ROOM_INCLUSIONS } from '../app/lib/pricing'; // <--- Use relative path to app/lib/pricing
import { blankExtraReminder, buildDefaultReminders, mergeReminderDrafts } from '../app/lib/eventReminders';
import { CASUAL_STAFF_LIST, MAX_CASUAL_QUANTITY, casualQuantityFromInput, casualShiftQuantity, emptyCasualShift } from '../app/lib/casualStaff';
import { requiredCasualShiftsForHolds } from '../app/lib/workingHours';
import { useAccess } from './useAccess';
import { authFetch } from '../app/lib/clientAuth';
import {
    MAX_SERIES_OCCURRENCES,
    bookingWindowForDate,
    buildSeriesDates,
    formatBookingDate,
    isFoundersBooker,
    isRepeatingPattern,
    isUnswStaff,
    localDateString,
    lockoutMessage,
    lockoutSummary,
    partitionSeriesDates
} from '../app/lib/bookingRules';

function applyRequiredCasualShifts(rows, required) {
    const current = Array.isArray(rows) && rows.length ? rows : [emptyCasualShift()];
    const extras = current.filter((row) => !row.forced && (row.shiftStart || row.shiftEnd || row.tasks || row.preferredStaff));
    if (!required.length) {
        const kept = current.filter((row) => !row.forced);
        return kept.length ? kept : [emptyCasualShift()];
    }
    const forced = required.map((shift) => {
        const existing = current.find((row) => row.forced && row.forceKey === shift.forceKey);
        return {
            preferredStaff: existing?.preferredStaff || '',
            quantity: existing?.quantity || 1,
            shiftStart: shift.shiftStart,
            shiftEnd: shift.shiftEnd,
            tasks: existing?.tasks || shift.tasks,
            date: shift.date,
            forced: true,
            forceKey: shift.forceKey,
            kind: shift.kind
        };
    });
    return [...forced, ...extras];
}

const generate24HoursTimeSlots = () => {
    const slots = [];
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        slots.push(`${hour}:00`, `${hour}:30`);
    }
    return slots;
};

function slotEdgeLabel(times, slot, holdName) {
    if (!times?.length || !times.includes(slot)) return null;
    const ordered = [...times].sort();
    let edge = '';
    if (slot === ordered[0]) edge = 'Bump in';
    else if (ordered.length > 1 && slot === ordered[ordered.length - 1]) edge = 'Bump out';
    else return '';
    return holdName ? `${edge} (${holdName})` : edge;
}

function minutesFromTime(time) {
    const [hours, mins] = String(time || '00:00').split(':').map(Number);
    return (hours * 60) + mins;
}

function timeFromMinutes(total) {
    const minutes = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function guestTimesForWindow(bumpIn, bumpOut) {
    const start = minutesFromTime(bumpIn);
    let end = minutesFromTime(bumpOut);
    if (end <= start) end += 24 * 60;
    const length = end - start;
    if (length > 60) {
        return { eventStart: timeFromMinutes(start + 30), eventEnd: timeFromMinutes(end - 30) };
    }
    if (length > 30) {
        return { eventStart: timeFromMinutes(start + 30), eventEnd: bumpOut };
    }
    return { eventStart: bumpIn, eventEnd: bumpOut };
}

function continuousSlotRange(allSlots, fromSlot, toSlot) {
    const startIndex = allSlots.indexOf(fromSlot);
    const endIndex = allSlots.indexOf(toSlot);
    if (startIndex < 0 || endIndex < 0) return null;
    const [from, to] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    return allSlots.slice(from, to + 1);
}

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

const CALENDAR_ROOMS = [
    { name: 'Entire Space', space: 'MCIC Ground - Entire Space' },
    { name: 'Event Space', space: 'MCIC Ground - Event Space' },
    { name: 'Design Space', space: 'MCIC Ground - Design Space' },
    { name: 'Founders Place', space: 'MCIC Level 1 - Founders Place' },
    { name: 'Group Study', space: 'MCIC Level 1 - Group Study' },
    { name: 'Colonnade', space: 'MCIC Ground - Colonnade' },
    { name: 'AI Makerspace', space: 'MCIC Ground - AI Makerspace - COMING SOON' }
];

const COLONNADE_SPACES = ['MCIC Ground - Event Space', 'MCIC Ground - Design Space', 'MCIC Ground - Entire Space'];

const addMinutesToTime = (time, minutes) => {
    const [hours, mins] = time.split(':').map(Number);
    const total = (hours * 60) + mins + minutes;
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const WORKSHOP_RUNSHEET = [
    { time: '', layout: 'Workshop Style/Group Tables', description: 'Organiser access & setup' },
    { time: '', layout: 'Workshop Style/Group Tables', description: 'Session 1' },
    { time: '', layout: 'Workshop Style/Group Tables', description: 'Catering Break' },
    { time: '', layout: 'Workshop Style/Group Tables', description: 'Session 2' },
    { time: '', layout: 'Workshop Style/Group Tables', description: 'Bump-out packdown' }
];

function copyScheduleRows(rows) {
    return rows.map(row => ({ ...row }));
}

function defaultScheduleRows(type) {
    if (type === 'tour') {
        return [{ time: '', layout: 'No specific layout required (e.g. for a tour or walkthrough)', description: 'Cohort facility walkthrough and site overview.' }];
    }
    if (type === 'delegation') {
        return [
            { time: '', layout: 'Boardroom Style', description: 'Organiser arrives to setup' },
            { time: '', layout: 'Boardroom Style', description: 'Delegation arrival, welcome & tea, coffee available' },
            { time: '', layout: 'Boardroom Style', description: 'Formalities' },
            { time: '', layout: 'Boardroom Style', description: 'Guests Depart' },
            { time: '', layout: 'Boardroom Style', description: 'Organiser cleanup and lock-up' }
        ];
    }
    if (type === 'lecture') {
        return [
            { time: '', layout: 'Lecture/Theatre Style', description: 'Arrive & setup room' },
            { time: '', layout: 'Lecture/Theatre Style', description: 'AV Check & panel arrive' },
            { time: '', layout: 'Lecture/Theatre Style', description: 'Guests arrive' },
            { time: '', layout: 'Lecture/Theatre Style', description: 'Panel discussion and Q&A' },
            { time: '', layout: 'Clear Open Floor', description: 'Catering & Networking' },
            { time: '', layout: 'Clear Open Floor', description: 'Event ends / guests depart' },
            { time: '', layout: 'Clear Open Floor', description: 'Packup and lock doors' }
        ];
    }
    return copyScheduleRows(WORKSHOP_RUNSHEET);
}

function inclusionsForSpace(space) {
    const name = String(space || '');
    if (name.includes('Colonnade') || name.includes('AI Makerspace')) return [];
    return ROOM_INCLUSIONS[space] || [];
}

function plainSpecText(value) {
    return String(value || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function specLineText(value) {
    return String(value || '').replace(/<(?!\/?strong\b)[^>]+>/gi, '').replace(/\s+/g, ' ').trim();
}

function SpecRichText({ text }) {
    const parts = String(text || '').split(/(<strong>[\s\S]*?<\/strong>)/gi).filter(Boolean);
    return parts.map((part, index) => {
        const bold = part.match(/^<strong>([\s\S]*?)<\/strong>$/i);
        if (bold) return <strong key={index} className="font-bold text-black">{bold[1]}</strong>;
        return <span key={index}>{part}</span>;
    });
}

function spaceSpecBlocks(html) {
    return String(html || '')
        .split(/<br\s*\/?>\s*<br\s*\/?>/i)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
            const match = part.match(/^<strong>([\s\S]*?)<\/strong>\s*(?:<br\s*\/?>)?([\s\S]*)$/i);
            const title = match ? match[1].replace(/:\s*$/, '').trim() : '';
            const body = match ? match[2].trim() : part;
            const lines = body
                .split(/<br\s*\/?>/i)
                .map((line) => line.trim().replace(/^[\u2022•]\s*/, ''))
                .filter(Boolean)
                .map((line) => {
                    const item = line.match(/^<strong>([\s\S]*?)<\/strong>\s*([\s\S]*)$/i);
                    if (!item) return { label: '', text: plainSpecText(line) };
                    return { label: item[1].replace(/:\s*$/, '').trim(), text: specLineText(item[2]) };
                })
                .filter((line) => line.label || line.text);
            return { title, lines };
        });
}

export default function BookingForm() {
    const { access } = useAccess();
    const [signInOpen, setSignInOpen] = useState(false);
    const [openFormAfterSignIn, setOpenFormAfterSignIn] = useState(false);
    const [showFullForm, setShowFullForm] = useState(false);
    const [showroomSpace, setShowroomSpace] = useState('MCIC Ground - Entire Space');
    const photoStripRef = useRef(null);
    const [departmentType, setDepartmentType] = useState('UNSW Founders');
    const [cateringAcknowledged, setCateringAcknowledged] = useState(false);
    const [cateringError, setCateringError] = useState(false);
    const [conductAcknowledged, setConductAcknowledged] = useState(false);
    const [conductError, setConductError] = useState(false);
    const signatureCanvasRef = useRef(null);
    const signatureDrawing = useRef(false);
    const [bookingHolds, setBookingHolds] = useState([]);
    const [activeHoldIndex, setActiveHoldIndex] = useState(0);
    const [wantsMultipleHolds, setWantsMultipleHolds] = useState(false);
    const [inventoryExpanded, setInventoryExpanded] = useState(false);
    const [timingNote, setTimingNote] = useState('');
    const [recurrence, setRecurrence] = useState({
        pattern: 'none',
        interval: 1,
        endType: 'after',
        endDate: '',
        occurrences: 8
    });
    const [seriesAvailability, setSeriesAvailability] = useState({ status: 'idle', byDate: null });
    const [lockoutNotice, setLockoutNotice] = useState('');
    const [slotWarning, setSlotWarning] = useState('');
    const [ticketingEnabled, setTicketingEnabled] = useState(true);
    const selectionAnchorRef = useRef(null);
    const scheduleEditMarked = useRef(false);
    const [layoutMode, setLayoutMode] = useState('workshop');

    // DYNAMIC FIREBASE INVENTORY DATABASE STATE
    const [equipmentList, setEquipmentList] = useState([]);
    const [isLoadingEquipment, setIsLoadingEquipment] = useState(true);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/site')
            .then((response) => response.json())
            .then((data) => {
                if (!cancelled && data.success) setTicketingEnabled(data.ticketing !== false);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

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

    const [runsheetRows, setRunsheetRows] = useState(() => copyScheduleRows(WORKSHOP_RUNSHEET));
    const [savedSchedule, setSavedSchedule] = useState(() => ({
        template: 'workshop',
        rows: copyScheduleRows(WORKSHOP_RUNSHEET)
    }));
    const [scheduleHistory, setScheduleHistory] = useState([]);
    const [savedRsa, setSavedRsa] = useState(null);

    const [liveBusySlots, setLiveBusySlots] = useState({});
    const [busyByDate, setBusyByDate] = useState({});
    const [calendarNotice, setCalendarNotice] = useState('');

    const isSlotBlockedByCalendar = (roomName, timeSlot) => {
        const roomBusyRanges = liveBusySlots[roomName] || [];
        return roomBusyRanges.some(range => timeSlot >= range.start && timeSlot < range.end);
    };

    const [formData, setFormData] = useState({
        bookingIntent: "I know what space and date/time I want. I just want to check availability.",
        userType: 'Internal to UNSW',
        companyName: '',
        unswDivision: '',
        department: 'UNSW Founders',
        isDelegation: false,
        isHighRisk: false,
        riskDetails: '',
        involvesControversialTopics: null,
        securityDetails: '',
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
        emailRemindersEnabled: true,

        useRegistrationPortal: false,
        hasOwnRegistrationPortal: false,
        sameAsMain: null,
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
        anythingElse: '',
        isWeekend: false,
        foundersSupplies: {
            woolworthsOrder: null,
            woolworths: '',
            danMurphysOrder: null,
            danMurphys: ''
        },

        // FOUNDERS INTERNAL COORDINATION QUESTIONS
        tamaraPresence: 'Not at all',
        tamaraDetails: '',
        needsFoundersCasualStaff: 'No',
        casualStaffDetails: [emptyCasualShift()],

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
        rsaChoice: '',
        rsaFileName: '',
        rsaFileData: '',

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
        const serializedString = savedSchedule.rows
            .map((row, index) => `Row ${index + 1} -> Time: ${row.time || 'N/A'} | Layout: ${row.layout} | Description: ${row.description}`)
            .join('\n');
        setFormData(prev => ({ ...prev, runsheetObjectives: serializedString }));
    }, [savedSchedule]);

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
                '/images/venues/full-space-4.JPG',
                '/images/venues/full-space-5.JPG',
                '/images/venues/full-space-6.JPG',
                '/images/venues/full-space-7.JPG',
                '/images/venues/full-space-8.JPG',
                '/images/venues/full-space-9.JPG',
                '/images/venues/full-space-10.JPG',
                '/images/venues/full-space-11.JPG',
                '/images/venues/full-space-12.JPG',
                '/images/venues/full-space-13.JPG',
                '/images/venues/full-space-14.JPG',
                '/images/venues/full-space-15.JPG',
                '/images/venues/full-space-16.JPG'
            ],
            description: `The Full Ground Floor Event Space. The concertina doors will be opened to combine the Event Space and Design Space to make the Entire Space.
<br /><br />
<strong>Capacity:</strong><br />
• <strong>Lecture Style:</strong> 120 people maximum (There is more space but this is as many chairs as we have)<br />
• <strong>Workshop Style:</strong> 100 people maximum (if both Founders Place and the Entire Space are booked so tables in both spaces can be accessed). <strong>Otherwise</strong> the capacity is 70 maximum.<br /><br />
<strong>Included Equipment & AV:</strong><br />
• <strong>Microphones & Audio:</strong> 1 lectern with a built-in microphone, 4 wireless handheld microphones, 4 lapel microphones, and a surround sound system.<br />
• <strong>Screens & Displays:</strong> 2 projector screens at the front of the room, 2 TV screens in the middle.<br />
• <strong>Stage:</strong> A modular stage made of multiple pieces that can be arranged as a single stage, split into smaller stages, or used as stepped seating.<br />
• <strong>Catering Setup:</strong> Kitchen (has 2 ZipTaps and 2 Microwaves. Fridge is not to be used).<br />
• <strong>Lighting:</strong> Basic stage lighting.
<br /><br />
<strong>Other Equipment & AV (items are shared between all bookable rooms, availability is dependent on requirements of other bookings):</strong><br />
• <strong>Screens & Displays:</strong> 2 Portable TVs on wheels.<br />
• <strong>Furniture:</strong> 1 lectern, 1 registration table, 8 high networking tables, a casual lounge area with couches and coffee tables, 10 mobile double-sided whiteboards.<br />
• <strong>Catering Setup:</strong> 3 standing catering tables, 1 hot water urn, 1 chilled water dispenser, serving tongs, platter boards and 3 Ice/Drinks Buckets.<br />
• <strong>Tech:</strong> 6 iPads (for guest check-in or Slido Q&A) and 2 spare laptops (1 Mac, 1 PC), 1 handheld microphone connected only to a portable speaker.<br />
• <strong>Recording:</strong> Fixed-camera video recording direct to SD Card or live to YouTube (you must have your own YouTube account).<br /><br />
<strong>Bathrooms:</strong><br />
This room does not have private bathrooms. The closest toilets are in the main Ground Floor foyer and are shared publicly with students, staff, and the rest of the building.
<br /><br />
<strong>Emergency & Safety:</strong><br />
• <strong>First Aid Kit:</strong> Hanging on the wall in the AV Cabinet.<br />
`
        },
        'MCIC Ground - Event Space': {
            roomNumber: 'Room G26',
            imgs: [
                '/images/venues/event-space-1.JPG',
                '/images/venues/event-space-2.JPG',
                '/images/venues/event-space-3.JPG',
                '/images/venues/event-space-4.JPG',
                '/images/venues/event-space-5.JPG',
                '/images/venues/event-space-6.JPG',
            ],
            description: `The front half of the Entire Space. The concertina doors will divide the Entire Space into two rooms (Event Space and Design Space). Booking the Event Space only gives you access to the front room / half the Entire Space.<br />
If you wish to book the Entire Space, you must select that option or book both the Event and Design Spaces simultaneously.
<br /><br />
<strong>Capacity:</strong><br />
• <strong>Lecture Style:</strong> 70 people maximum<br />
• <strong>Workshop Style:</strong> 35 people maximum<br /><br />
<strong>Included Equipment & AV:</strong><br />
• <strong>Microphones & Audio:</strong> 1 lectern with a built-in microphone, 2 wireless handheld microphones, 2 lapel microphones, with a surround sound system.<br />
• <strong>Screens & Displays:</strong> 2 projector screens at the front of the room.<br />
• <strong>Stage:</strong> A modular stage made of multiple pieces that can be arranged as a single stage, split into smaller stages, or used as stepped seating.<br />
• <strong>Catering Setup:</strong> Kitchen (has 2 ZipTaps and 2 Microwaves. Fridge is not to be used).<br />
• <strong>Lighting:</strong> Basic stage lighting.
<br /><br />
<strong>Other Equipment & AV (items are shared between all bookable rooms, availability is dependent on requirements of other bookings):</strong><br />
• <strong>Screens & Displays:</strong> 2 Portable TVs on wheels.<br />
• <strong>Furniture:</strong> 1 lectern, 1 registration table, 8 high networking tables, a casual lounge area with couches and coffee tables, 10 mobile double-sided whiteboards.<br />
• <strong>Catering Setup:</strong> 3 standing catering tables, 1 hot water urn, 1 chilled water dispenser, serving tongs, platter boards, 60 glasses, 40 plates, 30 mugs and 3 Ice/Drinks Buckets.<br />
• <strong>Tech:</strong> 6 iPads (for guest check-in or Slido Q&A) and 2 spare laptops (1 Mac, 1 PC), 1 handheld microphone connected only to a portable speaker.<br />
• <strong>Recording:</strong> Fixed-camera video recording direct to SD Card or live to YouTube (you must have your own YouTube account).<br /><br />
<strong>Bathrooms:</strong><br />
This room does not have private bathrooms. The closest toilets are in the main Ground Floor foyer and are shared publicly with students, staff, and the rest of the building.
<br /><br />
<strong>Emergency & Safety:</strong><br />
• <strong>First Aid Kit:</strong> Hanging on the wall in the AV Cabinet in the nextdoor room (Design Space).<br />
`
        },
        'MCIC Ground - Design Space': {
            roomNumber: 'Room G22',
            imgs: [],
            description: `The back half of the Entire Space. The concertina doors will divide the Entire Space into two rooms (Event Space and Design Space). Booking the Design Space only gives you access to the back room / half the Entire Space.<br />
If you wish to book the Entire Space, you must select that option or book both the Event and Design Spaces simultaneously.<br /><br />
<strong>Capacity:</strong><br />
• <strong>Lecture Style:</strong> 50 people maximum<br />
• <strong>Workshop Style:</strong> 35 people maximum<br /><br />
<strong>Included Equipment & AV:</strong><br />
• <strong>Microphones & Audio:</strong> 2 wireless handheld microphones, 2 lapel microphones, and a surround sound system.<br />
• <strong>Screens & Displays:</strong> 1 projector screen at the front of the room and 2 ceiling-hanging TV screens at the front of the room.<br /><br />
<strong>Other Equipment & AV (items are shared between all bookable rooms, availability is dependent on requirements of other bookings):</strong><br />
• <strong>Screens & Displays:</strong> 2 Portable TVs on wheels.<br />
• <strong>Furniture:</strong> 1 registration table, 8 high networking tables, a casual lounge area with couches and coffee tables, 10 mobile double-sided whiteboards.<br />
• <strong>Catering Setup:</strong> 3 standing catering tables, 1 hot water urn, 1 chilled water dispenser, serving tongs, platter boards, 60 glasses, 40 plates, 30 mugs and 3 Ice/Drinks Buckets.<br />
• <strong>Stage:</strong> Pieces of the modular stage can be used to create a small stage or used as stepped seating.<br />
• <strong>Tech:</strong> 6 iPads (for guest check-in or Slido Q&A) and 2 spare laptops (1 Mac, 1 PC), 1 handheld microphone connected only to a portable speaker.<br />
• <strong>Recording:</strong> Fixed-camera video recording direct to SD Card or live to YouTube (you must have your own YouTube account).<br /><br />
<strong>Bathrooms:</strong><br />
This room does not have private bathrooms. The closest toilets are in the main Ground Floor foyer and are shared publicly with students, staff, and the rest of the building.
<br /><br />
<strong>Emergency & Safety:</strong><br />
• <strong>First Aid Kit:</strong> Hanging on the wall in the AV Cabinet.<br />
`
        },
        'MCIC Level 1 - Founders Place': {
            roomNumber: 'Room 124',
            imgs: [
                '/images/venues/founders-place-1.JPG',
                '/images/venues/founders-place-2.JPG',
                '/images/venues/founders-place-3.JPG',
                '/images/venues/founders-place-4.JPG',
                '/images/venues/founders-place-5.JPG',
            ],
            description: `An open room on Level 1. The space is most suited to workshop style events but also able to accommodate lecture/theatre style events.<br /><br />
<strong>Capacity:</strong><br />
• <strong>Lecture Style:</strong> 70 people maximum<br />
• <strong>Workshop Style:</strong> 35 people maximum<br /><br />
<strong>Included Equipment & AV:</strong><br />
• <strong>Microphones & Audio:</strong> 1 wireless handheld microphone and a surround sound system.<br />
• <strong>Screens & Displays:</strong> 1 projector screen at the front of the room.<br />
• <strong>Catering Setup:</strong> Shared kitchen located just next door (has ZipTap, microwave, and fridge).<br /><br />
<strong>Other Equipment & AV (items are shared between all bookable rooms, availability is dependent on requirements of other bookings):</strong><br />
• <strong>Screens & Displays:</strong> 2 Portable TVs on wheels.<br />
• <strong>Furniture:</strong> 1 lectern, 1 registration table, 8 high networking tables, a casual lounge area with couches and coffee tables, 10 mobile double-sided whiteboards.<br />
• <strong>Catering Setup:</strong> 3 standing catering tables, 1 hot water urn, 1 chilled water dispenser, serving tongs, platter boards, 60 glasses, 40 plates, 30 mugs and 3 Ice/Drinks Buckets.<br />
• <strong>Stage:</strong> Pieces of the modular stage can be used to create a small stage or used as stepped seating.<br />
• <strong>Tech:</strong> 6 iPads (for guest check-in or Slido Q&A), 2 spare laptops (1 Mac, 1 PC), 1 handheld microphone connected only to a portable speaker.<br />
• <strong>Recording:</strong> Fixed-camera video recording direct to SD Card or live to YouTube (you must have your own YouTube account).<br /><br />
<strong>Bathrooms:</strong><br />
This room does not have private bathrooms. The closest toilets are in the main Ground Floor foyer and are shared publicly with students, staff, and the rest of the building.<br /><br />
<strong>Emergency & Safety:</strong><br />
• <strong>First Aid Kit:</strong> Sitting on the red AV Cabinet.<br />
<br /><br />
<strong>Please note:</strong> This room is an open design (no doors). While the hallway it backs onto is very quiet as it only leads to a few labs that do not run large classes and only students with certain access on their swipe card can access, it may not be appropriate for highly confidential or sensitive team meetings.`
        },
        'MCIC Level 1 - Group Study': {
            roomNumber: 'Level 1 Open Area',
            imgs: [
                '/images/venues/group-study-2.JPG',
                '/images/venues/group-study-1.JPG'
            ],
            description: `Located directly in front of Founders Place, this is a completely open co-working space for Founders. From time to time it can be booked out, usually to house catering or breakout groups for events held in Founders Place, which is located directly next door.<br /><br />
<strong>Capacity:</strong><br />
• <strong>Lecture Style:</strong> 70 people maximum<br />
• <strong>Workshop Style:</strong> 35 people maximum<br /><br />
<strong>Included Equipment & AV:</strong><br />
• <strong>Catering Setup:</strong> Shared kitchen located within the space (has ZipTap, microwave, and fridge).<br /><br />
<strong>Other Equipment & AV (items are shared between all bookable rooms, availability is dependent on requirements of other bookings):</strong><br />
• <strong>Screens & Displays:</strong> 2 Portable TVs on wheels.<br />
• <strong>Furniture:</strong> 1 lectern, 1 registration table, 8 high networking tables, a casual lounge area with couches and coffee tables, 10 mobile double-sided whiteboards.<br />
• <strong>Catering Setup:</strong> 3 standing catering tables, 1 hot water urn, 1 chilled water dispenser, serving tongs, platter boards, 60 glasses, 40 plates, 30 mugs and 3 Ice/Drinks Buckets.<br />
• <strong>Stage:</strong> Pieces of the modular stage can be used to create a small stage or used as stepped seating.<br />
• <strong>Tech:</strong> 6 iPads (for guest check-in or Slido Q&A), 2 spare laptops (1 Mac, 1 PC), 1 handheld microphone connected only to a portable speaker.<br />
• <strong>Recording:</strong> Fixed-camera video recording direct to SD Card or live to YouTube (you must have your own YouTube account).<br /><br />
<strong>Bathrooms:</strong><br />
This room does not have private bathrooms. The closest toilets are in the main Ground Floor foyer and are shared publicly with students, staff, and the rest of the building.<br /><br />
<strong>Emergency & Safety:</strong><br />
• <strong>First Aid Kit:</strong> Sitting on the red AV Cabinet nextdoor (in Founders Place).<br />
<br /><br />
<strong>Please note:</strong> This room has no walls or doors. When not booked, it is used as a co-working space for Founders and a study space for Materials Science students.`
        },
        'MCIC Ground - Colonnade': {
            roomNumber: 'Ground Floor Outdoor Colonnade',
            imgs: [],
            description: `The covered outdoor Colonnade running along the Ground Floor of the Hilmer Building. Ideal for outdoor registration, pop-up exhibitions, catering setups, or stand-alone open air networking. It can be booked on its own or alongside an Event Space or Design Space booking.<br /><br />
<strong>Bathrooms:</strong><br />
This room does not have private bathrooms. The closest toilets are in the main Ground Floor foyer and are shared publicly with students, staff, and the rest of the building.
<br /><br />
<strong>Emergency & Safety:</strong><br />
• <strong>First Aid Kit:</strong> Hanging on the wall in the AV Cabinet in the Design Space.<br />
`
        },
        'MCIC Ground - AI Makerspace - COMING SOON': {
            roomNumber: 'Room G17',
            imgs: [],
            description: `Our AI Makerspace is a place to test and refine AI technologies. It includes workstations and a supercomputer for AI research and development.<br /><br />
<strong>Bathrooms:</strong><br />
This room does not have private bathrooms. The closest toilets are in the main Ground Floor foyer and are shared publicly with students, staff, and the rest of the building.
<br /><br />
<strong>Emergency & Safety:</strong><br />
• <strong>First Aid Kit:</strong> Hanging on the wall in the AV Cabinet in the Design Space.<br />
`
        }
    };

    const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
    const [slotHover, setSlotHover] = useState(null);
    const [emailReminders, setEmailReminders] = useState(() => buildDefaultReminders({
        founders: true,
        eventDate: localDateString(new Date()),
        space: 'MCIC Ground - Event Space'
    }));
    const reminderLocksRef = useRef({});

    const generatedReminders = useMemo(() => buildDefaultReminders({
        founders: departmentType === 'UNSW Founders' || formData.department === 'UNSW Founders',
        eventName: formData.eventName,
        eventDate: localDateString(selectedCalendarDate),
        eventStart: formData.eventStart || formData.bumpIn,
        eventEnd: formData.eventEnd || formData.bumpOut,
        space: formData.space,
        eventDescription: formData.eventDescription
    }), [
        departmentType,
        formData.eventName,
        formData.eventStart,
        formData.bumpIn,
        formData.eventEnd,
        formData.bumpOut,
        formData.space,
        formData.eventDescription,
        formData.department,
        selectedCalendarDate
    ]);

    useEffect(() => {
        if (formData.ticketingMethod !== 'internal') return;
        setEmailReminders(previous => {
            const next = mergeReminderDrafts(previous, generatedReminders, reminderLocksRef.current);
            return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
        });
    }, [formData.ticketingMethod, generatedReminders]);

    useEffect(() => {
        const dateStr = localDateString(selectedCalendarDate);
        const weekend = selectedCalendarDate.getDay() === 0 || selectedCalendarDate.getDay() === 6;
        let cancelled = false;

        setFormData(prev => (prev.isWeekend === weekend ? prev : { ...prev, isWeekend: weekend }));

        if (!isUnswStaff(formData.userType) && bookingWindowForDate(dateStr).locked) {
            setLiveBusySlots({});
            return;
        }

        fetch(`/api/calendar/availability?date=${dateStr}`)
            .then(response => response.json())
            .then(data => {
                if (cancelled) return;
                if (data.busySlots) {
                    setLiveBusySlots(data.busySlots);
                    setBusyByDate(prev => ({ ...prev, [dateStr]: data.busySlots }));
                    setCalendarNotice('');
                } else {
                    setLiveBusySlots({});
                    setBusyByDate(prev => ({ ...prev, [dateStr]: null }));
                    setCalendarNotice('Live availability could not be loaded, so booked times may not appear.');
                }
            })
            .catch(() => {
                if (cancelled) return;
                setLiveBusySlots({});
                setBusyByDate(prev => ({ ...prev, [dateStr]: null }));
                setCalendarNotice('Live availability could not be loaded, so booked times may not appear.');
            });

        return () => {
            cancelled = true;
        };
    }, [selectedCalendarDate, formData.userType]);

    useEffect(() => {
        const dates = [...new Set(bookingHolds.map(hold => hold.date).filter(Boolean))];
        let cancelled = false;
        dates.forEach(date => {
            if (Object.prototype.hasOwnProperty.call(busyByDate, date)) return;
            fetch(`/api/calendar/availability?date=${date}`)
                .then(response => response.json())
                .then(data => {
                    if (cancelled) return;
                    setBusyByDate(prev => (
                        Object.prototype.hasOwnProperty.call(prev, date)
                            ? prev
                            : { ...prev, [date]: data.busySlots || null }
                    ));
                })
                .catch(() => {
                    if (cancelled) return;
                    setBusyByDate(prev => (
                        Object.prototype.hasOwnProperty.call(prev, date) ? prev : { ...prev, [date]: null }
                    ));
                });
        });
        return () => {
            cancelled = true;
        };
    }, [bookingHolds, busyByDate]);
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        const dayOffset = today.getDay() === 0 ? 6 : today.getDay() - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - dayOffset);
        return monday;
    });

    const effectiveDepartment = departmentType === 'UNSW Founders' ? 'UNSW Founders' : formData.department;

    useEffect(() => {
        if (!access.signedIn) return;
        if (access.userType) {
            setDepartmentType(access.departmentType === 'Other' ? 'Other' : (access.userType === 'Internal to UNSW' ? 'UNSW Founders' : 'Other'));
        }
        setFormData(prev => ({
            ...prev,
            ...(access.userType ? {
                userType: access.userType,
                department: access.department || '',
                unswDivision: access.unswDivision || '',
                companyName: access.companyName || ''
            } : {}),
            mainContact: {
                name: access.name || '',
                email: access.email || '',
                phone: access.phone || ''
            }
        }));
    }, [access.signedIn, access.email, access.name, access.phone, access.userType, access.departmentType, access.department, access.unswDivision, access.companyName]);

    useEffect(() => {
        if (!access.signedIn || !access.email || !db) {
            setSavedRsa(null);
            return undefined;
        }
        return onSnapshot(doc(db, 'rsaCards', access.email.toLowerCase()), (snapshot) => {
            setSavedRsa(snapshot.exists() ? snapshot.data() : null);
        }, () => setSavedRsa(null));
    }, [access.signedIn, access.email]);
    const foundersBooking = isFoundersBooker(formData.userType, effectiveDepartment);
    const requiredCasual = foundersBooking ? [] : requiredCasualShiftsForHolds(bookingHolds);
    const requiredCasualKey = JSON.stringify(requiredCasual);
    useEffect(() => {
        setFormData((prev) => {
            const nextRows = applyRequiredCasualShifts(prev.casualStaffDetails, requiredCasual);
            const hadForced = (prev.casualStaffDetails || []).some((row) => row.forced);
            let wants = prev.wantsCasualStaff;
            if (requiredCasual.length) wants = 'Yes';
            else if (hadForced && nextRows.every((row) => !row.shiftStart && !row.tasks)) wants = null;
            if (wants === prev.wantsCasualStaff && JSON.stringify(nextRows) === JSON.stringify(prev.casualStaffDetails || [])) return prev;
            return { ...prev, wantsCasualStaff: wants, casualStaffDetails: nextRows };
        });
    }, [requiredCasualKey]);
    const questionClass = 'text-xs font-bold text-neutral-900';
    const answerClass = 'text-xs text-neutral-800';
    const yesNoChoices = (value, onPick) => (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
            {['Yes', 'No'].map((choice) => (
                <label key={choice} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        className="w-4 h-4 accent-black rounded-sm"
                        checked={value === choice}
                        onChange={() => onPick(choice)}
                    />
                    <span className={answerClass}>{choice}</span>
                </label>
            ))}
        </div>
    );
    const rsaOnFile = Boolean(savedRsa && (savedRsa.fileName || savedRsa.fileData) && (!savedRsa.expiryDate || savedRsa.expiryDate >= localDateString(new Date())));
    const lockoutApplies = !isUnswStaff(formData.userType);
    const selectedDateStr = localDateString(selectedCalendarDate);
    const selectedLock = lockoutApplies ? bookingWindowForDate(selectedDateStr) : { locked: false };
    const timeRangeLabel = formData.bumpIn && formData.bumpOut ? `${formData.bumpIn}–${formData.bumpOut}` : '';
    const selectedSlots = useMemo(() => {
        const hold = bookingHolds[0];
        if (!hold) return [];
        return hold.times.map(time => `${hold.roomName}|${hold.dayKey}|${time}`);
    }, [bookingHolds]);

    const seriesOccurrenceCount = Math.min(MAX_SERIES_OCCURRENCES, Math.max(1, Number(recurrence.occurrences) || 1));
    const seriesEndSentence = recurrence.endType === 'on'
        ? `${recurrence.endDate ? `Repeats until ${formatBookingDate(recurrence.endDate, true)}` : 'Repeats until the end date'}, and stops at ${MAX_SERIES_OCCURRENCES} occurrences if that is sooner. Dates that are already booked or held are left out.`
        : `Repeats for ${seriesOccurrenceCount} occurrence${seriesOccurrenceCount === 1 ? '' : 's'}. Dates that are already booked or held are left out.`;

    const seriesPlan = useMemo(() => {
        if (!foundersBooking || !isRepeatingPattern(recurrence.pattern) || selectedSlots.length === 0) return null;
        const dates = buildSeriesDates(selectedDateStr, recurrence);
        const end = recurrence.endType === 'on'
            ? { type: 'on', date: recurrence.endDate }
            : { type: 'after', occurrences: Math.min(MAX_SERIES_OCCURRENCES, Math.max(1, Number(recurrence.occurrences) || 1)) };
        const base = {
            pattern: recurrence.pattern,
            interval: recurrence.pattern === 'weekly'
                ? Math.min(MAX_SERIES_OCCURRENCES, Math.max(1, Number(recurrence.interval) || 1))
                : 1,
            end,
            dates
        };
        if (recurrence.endType === 'on' && recurrence.endDate && recurrence.endDate < selectedDateStr) {
            return { ...base, dates: [], bookedDates: [], skippedDates: [], known: true, invalidEnd: true };
        }
        if (seriesAvailability.status !== 'ready' || !seriesAvailability.byDate) {
            return { ...base, bookedDates: [], skippedDates: [], known: false, calendarLoaded: false };
        }
        const split = partitionSeriesDates(
            dates,
            seriesAvailability.byDate,
            formData.space,
            selectedSlots.map(key => key.split('|').pop()),
            timeRangeLabel
        );
        return { ...base, ...split, known: true, calendarLoaded: seriesAvailability.calendarLoaded !== false };
    }, [
        foundersBooking,
        recurrence,
        selectedDateStr,
        selectedSlots,
        seriesAvailability,
        formData.space,
        timeRangeLabel
    ]);

    useEffect(() => {
        if (!foundersBooking || !isRepeatingPattern(recurrence.pattern) || selectedSlots.length === 0) {
            setSeriesAvailability(previous => (
                previous.status === 'idle' && previous.byDate === null ? previous : { status: 'idle', byDate: null }
            ));
            return;
        }

        const dates = buildSeriesDates(selectedDateStr, recurrence);
        if (!dates.length) {
            setSeriesAvailability({ status: 'ready', byDate: {} });
            return;
        }

        let cancelled = false;
        setSeriesAvailability({ status: 'loading', byDate: null });
        fetch('/api/calendar/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dates })
        })
            .then(response => response.json())
            .then(data => {
                if (cancelled) return;
                if (!data.byDate) {
                    setSeriesAvailability({ status: 'error', byDate: null });
                    return;
                }
                setSeriesAvailability({ status: 'ready', byDate: data.byDate, calendarLoaded: data.calendarLoaded !== false });
            })
            .catch(() => {
                if (cancelled) return;
                setSeriesAvailability({ status: 'error', byDate: null });
            });

        return () => {
            cancelled = true;
        };
    }, [
        foundersBooking,
        recurrence.pattern,
        recurrence.interval,
        recurrence.endType,
        recurrence.endDate,
        recurrence.occurrences,
        selectedDateStr,
        selectedSlots
    ]);

    useEffect(() => {
        if (!lockoutApplies) {
            setLockoutNotice('');
            return;
        }
        const info = bookingWindowForDate(selectedDateStr);
        if (!info.locked) {
            setLockoutNotice('');
            return;
        }
        if (!wantsMultipleHolds) {
            setBookingHolds(prev => (prev.length ? [] : prev));
            selectionAnchorRef.current = null;
        }
        setSlotWarning('');
        setLockoutNotice(lockoutMessage(info));
    }, [lockoutApplies, selectedDateStr, wantsMultipleHolds]);

    const mockCalendarData = {
        timeSlots: generate24HoursTimeSlots(),
        rooms: CALENDAR_ROOMS
    };

    const updateCasualStaffDetail = (index, field, value) => {
        const updated = formData.casualStaffDetails.map((row, rowIndex) => {
            if (rowIndex !== index) return row;
            if (field === 'quantity') return { ...row, quantity: casualQuantityFromInput(value, row.quantity) };
            return { ...row, [field]: value };
        });
        setFormData({ ...formData, casualStaffDetails: updated });
    };

    const addCasualStaffRow = () => {
        setFormData({
            ...formData,
            casualStaffDetails: [
                ...formData.casualStaffDetails,
                emptyCasualShift()
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

    const updateTicketTier = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            ticketTiers: prev.ticketTiers.map((tier, i) => (
                i === index ? { ...tier, [field]: value } : tier
            ))
        }));
    };

    const addTicketTier = () => {
        setFormData(prev => ({
            ...prev,
            ticketTiers: [...prev.ticketTiers, { name: '', cap: '' }]
        }));
    };

    const updateEmailReminder = (id, field, value, trusted = true) => {
        if (trusted) {
            reminderLocksRef.current[id] = {
                ...(reminderLocksRef.current[id] || {}),
                [field]: true
            };
        }
        setEmailReminders(previous => previous.map(reminder => (
            reminder.id === id
                ? { ...reminder, [field]: value, manuallyEdited: trusted ? true : reminder.manuallyEdited }
                : reminder
        )));
    };

    const addEmailReminder = () => {
        setEmailReminders(previous => [...previous, blankExtraReminder({
            space: formData.space,
            eventDate: localDateString(selectedCalendarDate),
            eventStart: formData.eventStart || formData.bumpIn,
            eventEnd: formData.eventEnd || formData.bumpOut
        })]);
    };

    const removeEmailReminder = (id) => {
        setEmailReminders(previous => previous.filter(reminder => reminder.kind === 'default' || reminder.id !== id));
    };

    const removeTicketTier = (index) => {
        setFormData(prev => ({
            ...prev,
            ticketTiers: prev.ticketTiers.length > 1
                ? prev.ticketTiers.filter((_, i) => i !== index)
                : prev.ticketTiers
        }));
    };

    const signaturePoint = (event) => {
        const canvas = signatureCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * canvas.width,
            y: ((event.clientY - rect.top) / rect.height) * canvas.height
        };
    };

    const startSignatureStroke = (event) => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        signatureDrawing.current = true;
        const ctx = canvas.getContext('2d');
        const { x, y } = signaturePoint(event);
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 2.25;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        if (canvas.setPointerCapture) {
            canvas.setPointerCapture(event.pointerId);
        }
    };

    const moveSignatureStroke = (event) => {
        if (!signatureDrawing.current) return;
        const canvas = signatureCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const { x, y } = signaturePoint(event);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const endSignatureStroke = () => {
        if (!signatureDrawing.current) return;
        signatureDrawing.current = false;
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        setFormData(prev => ({ ...prev, signature: canvas.toDataURL('image/png') }));
    };

    const wipeSignatureCanvas = () => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const clearSignature = () => {
        wipeSignatureCanvas();
        setFormData(prev => ({ ...prev, signature: '' }));
    };

    const updateSpaceSelection = (spaceName) => {
        setShowroomSpace(spaceName);
        photoStripRef.current?.scrollTo({ left: 0 });
    };

    useEffect(() => {
        if (bookingHolds.length === 0) {
            setShowFullForm(false);
            return;
        }
        const hold = bookingHolds[0];
        const colonnadeOk = COLONNADE_SPACES.includes(hold.space) && Boolean(hold.includeColonnade);
        const bookedSpaces = bookingHolds.map((item) => item.space);
        setShowroomSpace(prev => (prev === hold.space ? prev : hold.space));
        setFormData(prev => {
            const includeColonnadeAddon = colonnadeOk;
            const sameSpaces = Array.isArray(prev.bookedSpaces)
                && prev.bookedSpaces.length === bookedSpaces.length
                && prev.bookedSpaces.every((space, index) => space === bookedSpaces[index]);
            if (
                prev.space === hold.space
                && sameSpaces
                && prev.bumpIn === hold.bumpIn
                && prev.bumpOut === hold.bumpOut
                && prev.eventStart === hold.eventStart
                && prev.eventEnd === hold.eventEnd
                && prev.includeColonnadeAddon === includeColonnadeAddon
            ) return prev;
            return {
                ...prev,
                space: hold.space,
                bookedSpaces,
                includeColonnadeAddon,
                bumpIn: hold.bumpIn,
                bumpOut: hold.bumpOut,
                eventStart: hold.eventStart,
                eventEnd: hold.eventEnd
            };
        });
    }, [bookingHolds]);

    const rememberSchedule = () => {
        setScheduleHistory(prev => [...prev, {
            rows: runsheetRows.map(row => ({ ...row })),
            layoutMode
        }].slice(-40));
    };

    const markScheduleEdit = () => {
        if (scheduleEditMarked.current) return;
        scheduleEditMarked.current = true;
        rememberSchedule();
    };

    const updateRunsheetRow = (index, field, value) => {
        setRunsheetRows(runsheetRows.map((row, rowIndex) => (
            rowIndex === index ? { ...row, [field]: value } : row
        )));
    };

    const addRunsheetRow = () => {
        rememberSchedule();
        setRunsheetRows([...runsheetRows, { time: '', layout: 'Workshop Style/Group Tables', description: '' }]);
    };

    const removeRunsheetRow = (index) => {
        if (runsheetRows.length <= 1) return;
        rememberSchedule();
        setRunsheetRows(runsheetRows.filter((_, rowIndex) => rowIndex !== index));
    };

    const undoSchedule = () => {
        setScheduleHistory(prev => {
            const last = prev[prev.length - 1];
            if (!last) return prev;
            setRunsheetRows(last.rows.map(row => ({ ...row })));
            setLayoutMode(last.layoutMode);
            return prev.slice(0, -1);
        });
    };

    const saveSchedule = () => {
        setSavedSchedule({
            template: layoutMode,
            rows: copyScheduleRows(runsheetRows)
        });
    };

    const scheduleIsSaved = layoutMode === savedSchedule.template
        && JSON.stringify(runsheetRows) === JSON.stringify(savedSchedule.rows);

    const applyEventTemplate = (type) => {
        if (type === layoutMode) return;
        rememberSchedule();
        setLayoutMode(type);
        const savedRows = savedSchedule.template === type ? copyScheduleRows(savedSchedule.rows) : null;
        if (type === 'tour') {
            setFormData(prev => ({
                ...prev,
                eventDescription: "Facility walkthrough and tour overview look at the space tools."
            }));
        } else if (type === 'delegation') {
            setFormData(prev => ({
                ...prev,
                isDelegation: true,
                eventDescription: "Official delegation visit with boardroom discussion and facility walkthrough."
            }));
        } else if (type === 'workshop') {
            setFormData(prev => ({
                ...prev,
                isDelegation: false,
                eventDescription: "Standard collaborative day workshop containing split breakout groups."
            }));
        } else if (type === 'lecture') {
            setFormData(prev => ({
                ...prev,
                isDelegation: false,
                eventDescription: "Evening panel discussion sequence with networking drinks component."
            }));
        }
        setRunsheetRows(savedRows || defaultScheduleRows(type));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        const stopFor = (message, id) => {
            alert(message);
            const section = document.getElementById(id);
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        const answered = (value) => value === 'Yes' || value === 'No';

        if (!formData.eventName.trim()) {
            stopFor('Enter the event name.', 'event-details-block');
            return;
        }
        if (!Number(formData.attendees)) {
            stopFor('Enter the expected number of attendees.', 'event-details-block');
            return;
        }
        if (!formData.eventDescription.trim()) {
            stopFor('Enter the event description.', 'event-details-block');
            return;
        }
        if (!answered(formData.catering)) {
            stopFor('Answer yes or no to serving food and drinks.', 'catering-block');
            return;
        }
        if (!answered(formData.alcohol)) {
            stopFor('Answer yes or no to serving alcohol.', 'catering-block');
            return;
        }
        if (access.founders && formData.catering === 'Yes') {
            if (!answered(formData.foundersSupplies.woolworthsOrder)) {
                stopFor('Answer yes or no to a Woolworths or caterer order.', 'catering-block');
                return;
            }
            if (formData.foundersSupplies.woolworthsOrder === 'Yes' && !formData.foundersSupplies.woolworths.trim()) {
                stopFor('Specify the food and soft drink order.', 'catering-block');
                return;
            }
        }
        if (access.founders && formData.alcohol === 'Yes') {
            if (!answered(formData.foundersSupplies.danMurphysOrder)) {
                stopFor('Answer yes or no to a Dan Murphy\'s order.', 'catering-block');
                return;
            }
            if (formData.foundersSupplies.danMurphysOrder === 'Yes' && !formData.foundersSupplies.danMurphys.trim()) {
                stopFor('Specify the Dan Murphy\'s order.', 'catering-block');
                return;
            }
        }

        const usingSavedRsa = formData.alcohol === 'Yes' && rsaOnFile && formData.rsaChoice !== 'staff';
        if (formData.alcohol === 'Yes' && !usingSavedRsa && formData.rsaChoice !== 'upload' && formData.rsaChoice !== 'staff') {
            alert('Choose whether you will upload an RSA or would like a staff member with an RSA organised.');
            const section = document.getElementById('alcohol-rsa-block');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        if (formData.alcohol === 'Yes' && !usingSavedRsa && formData.rsaChoice === 'upload' && !formData.rsaFileData) {
            alert('Upload a copy of the RSA competency card, or ask for a staff member with an RSA.');
            const section = document.getElementById('alcohol-rsa-block');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (!access.founders && formData.catering === 'Yes' && !cateringAcknowledged) {
            setCateringError(true);
            const section = document.getElementById('catering-policy-block');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (formData.involvesControversialTopics !== true && formData.involvesControversialTopics !== false) {
            alert('Answer yes or no to the safety and risk question.');
            const section = document.getElementById('risk-assessment-block');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (formData.sameAsMain !== true && formData.sameAsMain !== false) {
            stopFor('Choose whether you are the on the day contact, or the contact is someone else.', 'contact-details-block');
            return;
        }
        if (formData.sameAsMain === false) {
            const day = formData.onDayContact;
            if (!day.name.trim() || !day.email.trim() || !day.phone.trim()) {
                stopFor('Enter the on-day contact name, email, and mobile.', 'contact-details-block');
                return;
            }
        }

        if (access.founders && !formData.tamaraDetails.trim()) {
            stopFor('Add the details for Tamara.', 'staffing-block');
            return;
        }
        if (!answered(formData.wantsCasualStaff)) {
            stopFor('Answer yes or no to booking a casual staff member.', 'staffing-block');
            return;
        }
        if (formData.wantsCasualStaff === 'Yes' && formData.casualStaffDetails.some(row => !row.shiftStart || !row.shiftEnd || !String(row.tasks || '').trim() || !casualShiftQuantity(row))) {
            stopFor('Complete each casual staff shift: how many, start, end, and tasks.', 'staffing-block');
            return;
        }

        if (!access.founders && !answered(formData.isInnovationOrEntrepreneurship)) {
            stopFor('Answer yes or no to innovation and entrepreneurship.', 'billing-block');
            return;
        }
        if (!access.founders && formData.paymentMethod !== 'Journal Transfer' && formData.paymentMethod !== 'Invoice') {
            stopFor('Choose Journal Transfer or Invoice.', 'billing-block');
            return;
        }
        if (!access.founders && formData.paymentMethod === 'Invoice' && (!formData.abn.trim() || !formData.apEmail.trim() || !formData.billingAddress.trim())) {
            stopFor('Enter the ABN, accounts email, and billing address.', 'billing-block');
            return;
        }

        if (!formData.anythingElse.trim()) {
            stopFor('Answer “Is there anything else we should know?”.', 'anything-else-block');
            return;
        }

        if (!access.founders && !formData.signerFullName.trim()) {
            stopFor('Enter the signer’s full name.', 'signature-block');
            return;
        }

        if (!access.founders && !conductAcknowledged) {
            setConductError(true);
            const section = document.getElementById('conduct-policy-block');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (formData.involvesControversialTopics && !formData.securityDetails.trim()) {
            alert('Please provide details for UNSW Security Services notification.');
            const section = document.getElementById('security-notification-block');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (!access.founders && !formData.signature) {
            alert('Please sign the declaration before submitting.');
            const section = document.getElementById('signature-block');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (!access.email.trim()) {
            alert('Sign in before submitting.');
            return;
        }

        if (isCalendarOption(formData.bookingIntent) && selectedSlots.length === 0) {
            alert('Select a continuous block of time slots before submitting.');
            return;
        }

        const primary = bookingHolds[0];
        const targetIsoDateString = primary?.date || localDateString(selectedCalendarDate);
        if (lockoutApplies && bookingWindowForDate(targetIsoDateString).locked) {
            alert(lockoutMessage(bookingWindowForDate(targetIsoDateString)));
            return;
        }

        const holdPayload = (hold) => ({
            space: hold.space,
            bumpInDate: hold.date,
            bumpIn: hold.bumpIn,
            eventStart: hold.eventStart,
            eventEnd: hold.eventEnd,
            bumpOut: hold.bumpOut,
            includeColonnadeAddon: Boolean(hold.includeColonnade)
        });
        if (wantsMultipleHolds) {
            if (bookingHolds.length < 2) {
                alert('Select at least one more hold on the calendar, or turn off multiple booking holds.');
                return;
            }
            for (const hold of bookingHolds) {
                if (!(hold.bumpIn <= hold.eventStart && hold.eventStart <= hold.eventEnd && hold.eventEnd <= hold.bumpOut)) {
                    alert('Each hold needs guest arrival and departure inside the calendar times.');
                    return;
                }
                if (lockoutApplies && bookingWindowForDate(hold.date).locked) {
                    alert(lockoutMessage(bookingWindowForDate(hold.date)));
                    return;
                }
            }
        }

        if (seriesPlan?.invalidEnd) {
            alert('Choose an end date on or after the start date.');
            return;
        }

        if (seriesPlan && isRepeatingPattern(seriesPlan.pattern) && (!seriesPlan.known || seriesPlan.calendarLoaded === false)) {
            alert('Live availability could not be loaded, so booked times may not appear. Future dates are not shown as available, and this repeating booking cannot be confirmed.');
            return;
        }

        if (seriesPlan && isRepeatingPattern(seriesPlan.pattern) && seriesPlan.bookedDates.length === 0) {
            alert('Every date in this series is already booked. Change the repeat pattern or the end date.');
            return;
        }

        setCateringError(false);
        setConductError(false);

        const recurrencePayload = seriesPlan && isRepeatingPattern(seriesPlan.pattern)
            ? {
                pattern: seriesPlan.pattern,
                interval: seriesPlan.interval,
                end: seriesPlan.end,
                bookedDates: seriesPlan.bookedDates,
                skippedDates: seriesPlan.skippedDates
            }
            : {
                pattern: 'none',
                interval: 1,
                end: null,
                bookedDates: [targetIsoDateString],
                skippedDates: []
            };

        const payload = {
            eventName: formData.eventName || "Untitled MCIC Activation Hold",
            eventDescription: formData.eventDescription,
            space: formData.space,
            includeColonnadeAddon: formData.includeColonnadeAddon,
            attendees: formData.attendees,
            userType: formData.userType,
            companyName: formData.companyName,
            unswDivision: formData.unswDivision,
            department: formData.department || departmentType,
            isInnovationOrEntrepreneurship: formData.isInnovationOrEntrepreneurship,
            wantsCasualStaff: formData.wantsCasualStaff,
            anythingElse: formData.anythingElse,
            tamaraPresence: formData.tamaraPresence,
            tamaraDetails: access.founders ? formData.tamaraDetails : '',
            needsFoundersCasualStaff: formData.needsFoundersCasualStaff,
            casualStaffDetails: (formData.casualStaffDetails || []).map(row => ({
                ...row,
                quantity: casualShiftQuantity(row) || 1,
                preferredStaff: foundersBooking ? row.preferredStaff : ''
            })),
            foundersStaff: Boolean(access.founders),
            foundersSupplies: access.founders ? {
                woolworthsOrder: formData.catering === 'Yes' ? formData.foundersSupplies.woolworthsOrder : null,
                woolworths: formData.catering === 'Yes' && formData.foundersSupplies.woolworthsOrder === 'Yes' ? formData.foundersSupplies.woolworths : '',
                danMurphysOrder: formData.alcohol === 'Yes' ? formData.foundersSupplies.danMurphysOrder : null,
                danMurphys: formData.alcohol === 'Yes' && formData.foundersSupplies.danMurphysOrder === 'Yes' ? formData.foundersSupplies.danMurphys : ''
            } : { woolworthsOrder: null, woolworths: '', danMurphysOrder: null, danMurphys: '' },
            catering: formData.catering || "No",
            alcohol: formData.alcohol || "No",
            rsaChoice: formData.alcohol !== 'Yes' ? '' : formData.rsaChoice === 'staff' ? 'staff' : (rsaOnFile ? 'onfile' : formData.rsaChoice),
            rsaFileName: formData.alcohol === 'Yes' && formData.rsaChoice === 'upload' && !rsaOnFile ? formData.rsaFileName : '',
            rsaFileData: formData.alcohol === 'Yes' && formData.rsaChoice === 'upload' && !rsaOnFile ? formData.rsaFileData : '',
            isHighRisk: formData.isHighRisk,
            riskDetails: formData.isHighRisk ? formData.riskDetails : '',
            involvesControversialTopics: formData.involvesControversialTopics,
            securityDetails: formData.involvesControversialTopics ? formData.securityDetails : '',
            postToPublicDirectory: false,
            ticketing: { method: 'none', externalTicketUrl: '', ticketBannerName: '', maxTicketCapacity: 0, ticketTiers: [] },
            emailReminders: { enabled: false, reminders: [] },
            conductAcknowledged,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            bumpInDate: targetIsoDateString,
            tentativeHolds: wantsMultipleHolds ? bookingHolds.slice(0, 3).map(holdPayload) : [],
            recurrence: recurrencePayload,
            isWeekend: formData.isWeekend,
            selectedSlots,
            bumpIn: formData.bumpIn || "09:00",
            bumpOut: formData.bumpOut || "17:00",
            eventStart: formData.eventStart || formData.bumpIn || "09:30",
            eventEnd: formData.eventEnd || formData.bumpOut || "16:30",
            runsheetObjectives: formData.runsheetObjectives,
            mainContact: {
                name: access.name || formData.mainContact.name || '',
                email: access.email,
                phone: access.phone || formData.mainContact.phone || ''
            },
            onDayContact: formData.sameAsMain
                ? {
                    name: access.name || formData.mainContact.name || '',
                    email: access.email,
                    phone: access.phone || formData.mainContact.phone || ''
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
            const apiResponse = await authFetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const res = await apiResponse.json();

            if (res.success) {
                if (ticketingEnabled && res.bookingId) {
                    window.location.href = `/booking/tickets?id=${res.bookingId}`;
                    return;
                }
                const calendarNote = res.calendarError ? ` Calendar hold could not be created: ${res.calendarError}` : '';
                alert(`Booking request saved as pending. Sign in at My bookings with ${access.email} to request a change or cancellation.${calendarNote}`);
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

    const revealBookingForm = () => {
        if (bookingHolds.length === 0) return;
        setShowFullForm(true);
        setTimeout(() => {
            const targetBlock = document.getElementById('rest-of-form-marker');
            if (targetBlock) targetBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    };

    const triggerRevealAllQuestions = () => {
        if (bookingHolds.length === 0) return;
        if (!access.signedIn) {
            setOpenFormAfterSignIn(true);
            setSignInOpen(true);
            return;
        }
        revealBookingForm();
    };

    const finishSignIn = () => {
        setSignInOpen(false);
        if (openFormAfterSignIn) {
            setOpenFormAfterSignIn(false);
            revealBookingForm();
        }
    };

    useEffect(() => {
        const openSignIn = () => setSignInOpen(true);
        window.addEventListener('mcic-open-signin', openSignIn);
        return () => window.removeEventListener('mcic-open-signin', openSignIn);
    }, []);

    useEffect(() => {
        if (!signInOpen) return undefined;
        const onKey = (event) => {
            if (event.key === 'Escape') setSignInOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [signInOpen]);

    useEffect(() => {
        if (!access.signedIn || bookingHolds.length === 0 || typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('form') !== '1') return;
        setShowFullForm(true);
        const timer = setTimeout(() => {
            document.getElementById('rest-of-form-marker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        return () => clearTimeout(timer);
    }, [access.signedIn, bookingHolds.length]);

    const getDynamicWeekDays = (startDate) => {
        return Array.from({ length: 7 }, (_, i) => {
            const nextDay = new Date(startDate);
            nextDay.setDate(startDate.getDate() + i);
            return nextDay;
        });
    };

    const activeWeekDays = getDynamicWeekDays(currentWeekStart);
    const lockoutWeekNotes = lockoutApplies
        ? [...new Set(activeWeekDays.map(dateItem => lockoutSummary(bookingWindowForDate(localDateString(dateItem)))).filter(Boolean))]
        : [];

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

    const chooseCalendarDay = (date) => {
        const info = bookingWindowForDate(localDateString(date));
        setSelectedCalendarDate(date);
        setSlotWarning('');
        if (!wantsMultipleHolds) {
            setBookingHolds([]);
            setActiveHoldIndex(0);
            selectionAnchorRef.current = null;
        }
        if (lockoutApplies && info.locked) {
            setLockoutNotice(lockoutMessage(info));
        } else {
            setLockoutNotice('');
        }
    };

    const handleDatePickerChange = (dateString) => {
        if (!dateString) return;
        const [year, month, day] = dateString.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day);
        chooseCalendarDay(targetDate);
        const dayOffset = targetDate.getDay() === 0 ? 6 : targetDate.getDay() - 1;
        const matchingMonday = new Date(targetDate);
        matchingMonday.setDate(targetDate.getDate() - dayOffset);
        setCurrentWeekStart(matchingMonday);
    };

    const formatDayKey = (date) => {
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return `${weekdays[date.getDay()]} ${String(date.getDate()).padStart(2, '0')}`;
    };

    const handleSlotClick = (event, room, slot) => {
        if (lockoutApplies && bookingWindowForDate(localDateString(selectedCalendarDate)).locked) return;
        const date = localDateString(selectedCalendarDate);
        const dayKey = formatDayKey(selectedCalendarDate);
        const allSlots = generate24HoursTimeSlots();
        const ownerIndex = bookingHolds.findIndex(hold => hold.date === date && hold.roomName === room.name && hold.times.includes(slot));
        let index = ownerIndex >= 0 ? ownerIndex : (wantsMultipleHolds ? Math.min(activeHoldIndex, bookingHolds.length) : 0);
        if (!wantsMultipleHolds) index = 0;
        if (wantsMultipleHolds && ownerIndex < 0 && index >= bookingHolds.length && bookingHolds.length >= 3) {
            setSlotWarning('You already have three holds. Choose Hold 1, 2 or 3 to change one.');
            return;
        }
        if (index >= bookingHolds.length) index = bookingHolds.length;

        const hold = bookingHolds[index];
        const sameWindow = hold && hold.date === date && hold.roomName === room.name;
        const existingTimes = sameWindow ? [...hold.times].sort() : [];
        const anchor = selectionAnchorRef.current;
        const anchorMatches = anchor && anchor.holdIndex === index && anchor.room === room.name && anchor.date === date;

        const rangeBetween = (fromSlot, toSlot) => {
            const startIndex = allSlots.indexOf(fromSlot);
            const endIndex = allSlots.indexOf(toSlot);
            if (startIndex < 0 || endIndex < 0) return null;
            const [from, to] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
            const range = allSlots.slice(from, to + 1);
            if (range.some(time => isSlotBlockedByCalendar(room.space, time))) return null;
            return range;
        };

        let nextSlots = null;

        if (existingTimes.length === 0) {
            selectionAnchorRef.current = { holdIndex: index, room: room.name, date, slot };
            nextSlots = [slot];
        } else if (event.shiftKey && anchorMatches) {
            nextSlots = rangeBetween(anchor.slot, slot);
        } else if (existingTimes.length === 1 && existingTimes[0] === slot) {
            selectionAnchorRef.current = null;
            nextSlots = [];
        } else if (existingTimes.includes(slot)) {
            selectionAnchorRef.current = { holdIndex: index, room: room.name, date, slot };
            nextSlots = [slot];
        } else {
            const from = slot < existingTimes[0] ? slot : existingTimes[0];
            const to = slot > existingTimes[existingTimes.length - 1] ? slot : existingTimes[existingTimes.length - 1];
            nextSlots = rangeBetween(from, to);
            if (!anchorMatches) selectionAnchorRef.current = { holdIndex: index, room: room.name, date, slot: existingTimes[0] };
        }

        if (nextSlots === null) {
            setSlotWarning('That range crosses a booked time. Choose a continuous run of available slots.');
            return;
        }

        const overlapsAnotherHold = bookingHolds.some((other, otherIndex) => (
            otherIndex !== index
            && other.date === date
            && other.roomName === room.name
            && nextSlots.some(time => other.times.includes(time))
        ));
        if (overlapsAnotherHold) {
            setSlotWarning('That time is already in another hold.');
            return;
        }

        setSlotWarning('');
        setActiveHoldIndex(index);
        if (nextSlots.length === 0) {
            setBookingHolds(prev => prev.filter((_, itemIndex) => itemIndex !== index));
            return;
        }

        const ordered = [...nextSlots].sort();
        const bumpIn = ordered[0];
        const bumpOut = addMinutesToTime(ordered[ordered.length - 1], 30);
        const windowChanged = !hold || !sameWindow || hold.bumpIn !== bumpIn || hold.bumpOut !== bumpOut;
        const guestTimes = windowChanged
            ? guestTimesForWindow(bumpIn, bumpOut)
            : { eventStart: hold.eventStart, eventEnd: hold.eventEnd };
        const nextHold = {
            date,
            dayKey,
            roomName: room.name,
            space: room.space,
            times: ordered,
            bumpIn,
            bumpOut,
            eventStart: guestTimes.eventStart,
            eventEnd: guestTimes.eventEnd,
            includeColonnade: Boolean(sameWindow && hold?.includeColonnade && COLONNADE_SPACES.includes(room.space))
        };
        setBookingHolds(prev => {
            const next = [...prev];
            next[index] = nextHold;
            return next.slice(0, 3);
        });
    };

    const hoverPreview = (() => {
        if (!slotHover) return null;
        const date = localDateString(selectedCalendarDate);
        const room = CALENDAR_ROOMS.find(item => item.name === slotHover.roomName);
        if (!room) return null;
        const allSlots = generate24HoursTimeSlots();
        const index = wantsMultipleHolds ? Math.min(activeHoldIndex, bookingHolds.length) : 0;
        const hold = bookingHolds[index];
        const sameWindow = hold && hold.date === date && hold.roomName === room.name;
        const existing = sameWindow ? [...hold.times].sort() : [];
        const target = slotHover.slot;
        if (!existing.length || (existing.length === 1 && existing[0] === target)) {
            return { roomName: room.name, times: [target], holdNumber: index + 1 };
        }
        const from = target < existing[0] ? target : existing[0];
        const to = target > existing[existing.length - 1] ? target : existing[existing.length - 1];
        const range = continuousSlotRange(allSlots, from, to);
        if (!range || range.some(time => isSlotBlockedByCalendar(room.space, time))) return null;
        return { roomName: room.name, times: range, holdNumber: index + 1 };
    })();

    const inclusionGroups = bookingHolds.reduce((groups, hold, index) => {
        const found = groups.find(group => group.space === hold.space);
        if (found) found.holds.push({ hold, index });
        else groups.push({ space: hold.space, holds: [{ hold, index }] });
        return groups;
    }, []);

    const colonnadeStatus = (hold) => {
        if (!hold?.includeColonnade) return 'off';
        if (!Object.prototype.hasOwnProperty.call(busyByDate, hold.date)) return 'checking';
        const busy = busyByDate[hold.date];
        if (!busy) return 'unknown';
        const ranges = busy['MCIC Ground - Colonnade'] || [];
        const booked = hold.times.some(time => ranges.some(range => time >= range.start && time < range.end));
        return booked ? 'booked' : 'free';
    };

    const toggleHoldColonnade = (index) => {
        setBookingHolds(prev => prev.map((hold, itemIndex) => (
            itemIndex === index ? { ...hold, includeColonnade: !hold.includeColonnade } : hold
        )));
    };

    const updateHoldGuestTime = (index, field, value) => {
        setBookingHolds(prev => prev.map((hold, itemIndex) => {
            if (itemIndex !== index) return hold;
            const next = { ...hold, [field]: value };
            if (!(next.bumpIn <= next.eventStart && next.eventStart <= next.eventEnd && next.eventEnd <= next.bumpOut)) {
                setTimingNote('Guest arrival and departure need to stay inside the times selected on the calendar.');
                return hold;
            }
            setTimingNote('');
            return next;
        }));
    };

    const renderRoomInclusions = (space, heading) => {
        const inclusions = inclusionsForSpace(space);
        return (
            <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-5 space-y-3">
                <p className="text-sm text-neutral-700">
                    {heading} <strong className="text-black">{space}</strong>
                </p>
                {inclusions.length > 0 && (
                    <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-sm space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="bg-emerald-600 text-white font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm">Included</span>
                            <h4 className="font-bold text-sm text-neutral-900">Standard Room Inclusions</h4>
                        </div>
                        <p className="text-xs text-gray-500">
                            These features are pre-installed in {space} and included automatically:
                        </p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-medium text-neutral-800 pt-1">
                            {inclusions.map((item) => (
                                <li key={item} className="flex items-center gap-2 bg-white px-3 py-2 border border-neutral-200 rounded-sm">
                                    <span className="text-emerald-600 font-bold">✓</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    const renderEventDetailsSection = () => (
        <section id="event-details-block" key="event-details-block" className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
            <div className="space-y-1 border-b border-neutral-100 pb-2">
                <h3 className="text-lg font-extrabold tracking-tight uppercase text-black">Event Details</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                    Don&apos;t worry if you haven&apos;t finalised the details yet, just complete to the best of your ability and you can edit later.
                </p>
            </div>

            <div className="space-y-4">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Booking times</p>
                    <p className="text-[11px] text-neutral-600 mt-1">Please book 30 minutes to 1 hour for bump-in and bump-out. Bump-in and bump-out come from the calendar. Adjust the selected timeslots in the calendar above to change them. Adjust the Guest Arrival and Departure times below.</p>
                </div>
                {(bookingHolds.length ? bookingHolds : [null]).map((hold, index) => (
                    <div key={hold ? `${hold.date}-${hold.roomName}-${index}` : 'empty-times'} className="p-4 bg-neutral-50 border border-gray-200 rounded-sm space-y-3">
                        {wantsMultipleHolds && hold && (
                            <p className="text-xs font-black uppercase tracking-wider text-neutral-900">Hold {index + 1}</p>
                        )}
                        {!hold ? (
                            <p className="text-xs font-bold uppercase tracking-wider text-neutral-700">Choose a room and time on the calendar.</p>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Bump-In Time (Access)</label>
                                    <input
                                        type="time"
                                        readOnly
                                        value={hold.bumpIn}
                                        onFocus={() => setTimingNote('Change bump-in and bump-out by adjusting the timeslots on the calendar.')}
                                        className="w-full p-2 border border-gray-200 text-xs font-semibold rounded-sm bg-neutral-100 text-black outline-none cursor-not-allowed"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Event Starts (Guest Arrival)</label>
                                    <input
                                        type="time"
                                        value={hold.eventStart}
                                        onChange={(event) => updateHoldGuestTime(index, 'eventStart', event.target.value)}
                                        className="w-full p-2 border border-gray-200 text-xs font-semibold rounded-sm bg-white text-black outline-none focus:border-neutral-400"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Event Ends (Guest Departure)</label>
                                    <input
                                        type="time"
                                        value={hold.eventEnd}
                                        onChange={(event) => updateHoldGuestTime(index, 'eventEnd', event.target.value)}
                                        className="w-full p-2 border border-gray-200 text-xs font-semibold rounded-sm bg-white text-black outline-none focus:border-neutral-400"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Bump-Out (Lock-up)</label>
                                    <input
                                        type="time"
                                        readOnly
                                        value={hold.bumpOut}
                                        onFocus={() => setTimingNote('Change bump-in and bump-out by adjusting the timeslots on the calendar.')}
                                        className="w-full p-2 border border-gray-200 text-xs font-semibold rounded-sm bg-neutral-100 text-black outline-none cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {timingNote && <p className="text-xs font-bold text-amber-800">{timingNote}</p>}
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

    const renderTimesAndRunsheetSection = () => (
        <section key="times-runsheet-block" className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
            <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                Schedule
            </h3>

            <div className="space-y-3">
                <label className="text-xs font-bold tracking-wider text-gray-500 block">
                    Quick Preset Templates:
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
                                            onFocus={markScheduleEdit}
                                            onBlur={() => { scheduleEditMarked.current = false; }}
                                            onChange={(e) => {
                                                markScheduleEdit();
                                                updateRunsheetRow(index, 'time', e.target.value);
                                            }}
                                            className="w-full p-2 border border-gray-200 rounded-sm text-xs font-medium bg-white text-black outline-none focus:border-neutral-400"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <select
                                            value={row.layout}
                                            onChange={(e) => {
                                                rememberSchedule();
                                                updateRunsheetRow(index, 'layout', e.target.value);
                                            }}
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
                                            onFocus={markScheduleEdit}
                                            onBlur={() => { scheduleEditMarked.current = false; }}
                                            onChange={(e) => {
                                                markScheduleEdit();
                                                updateRunsheetRow(index, 'description', e.target.value);
                                            }}
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

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                    <p className="text-[11px] text-neutral-600">
                        {scheduleIsSaved ? 'This schedule is saved.' : 'Not saved yet. The last schedule you saved is the one kept.'}
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            onClick={undoSchedule}
                            disabled={scheduleHistory.length === 0}
                            className={`font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-sm border ${scheduleHistory.length === 0 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-black text-black hover:bg-neutral-100'}`}
                        >
                            Undo
                        </button>
                        <button
                            type="button"
                            onClick={saveSchedule}
                            className="bg-[#EAD64D] text-black font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-sm hover:bg-black hover:text-white"
                        >
                            Save schedule
                        </button>
                        <button
                            type="button"
                            onClick={addRunsheetRow}
                            className="bg-neutral-900 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-sm hover:bg-black transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] shadow-2xs"
                        >
                            + Add Row
                        </button>
                    </div>
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
            const bookedSpaces = Array.isArray(formData.bookedSpaces) && formData.bookedSpaces.length
                ? formData.bookedSpaces
                : [formData.space].filter(Boolean);
            const freeSpaces = Array.isArray(item.freeInclusionSpaces) ? item.freeInclusionSpaces : [];
            const includedFree = bookedSpaces.length > 0 && bookedSpaces.every((space) => freeSpaces.includes(space));

            let itemPriceDisplay = 'Included ($0)';
            if (!isFoundersInternal && hasCost) {
                itemPriceDisplay = includedFree ? 'Included free' : hirePriceText(itemPrice, item.costAppliesTo);
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
                <div className="flex items-end justify-between gap-4 border-b border-neutral-100 pb-2">
                    <h3 className="text-lg font-extrabold tracking-tight uppercase text-black">Asset Inventory</h3>
                    {!isLoadingEquipment && sharedEquipmentMaster.length > 6 && (
                        <button
                            type="button"
                            onClick={() => setInventoryExpanded(open => !open)}
                            className="shrink-0 text-[10px] font-black uppercase tracking-wider border border-black px-3 py-2 rounded-sm"
                            aria-expanded={inventoryExpanded}
                        >
                            {inventoryExpanded ? 'Minimise' : 'Expand'}
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    {isLoadingEquipment ? (
                        <div className="p-8 text-center text-xs text-gray-400 font-mono">
                            Loading live inventory database catalog from Firestore...
                        </div>
                    ) : (
                        <div className={`border border-gray-200 divide-y divide-gray-100 rounded-sm shadow-xs ${inventoryExpanded ? '' : 'max-h-[43rem] overflow-y-auto'}`}>
                            {sharedEquipmentMaster.map((item) => {
                                const reservedInSlot = 0;
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
        <section id="catering-block" key="catering-block" className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
            <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                Catering
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <p className={questionClass}>Will you be serving food and drinks?</p>
                    {yesNoChoices(formData.catering, (choice) => setFormData({ ...formData, catering: choice }))}
                </div>
                <div className="space-y-2">
                    <p className={questionClass}>Will you be serving alcohol?</p>
                    {yesNoChoices(formData.alcohol, (choice) => setFormData({
                        ...formData,
                        alcohol: choice,
                        rsaChoice: choice === 'Yes' ? formData.rsaChoice : '',
                        rsaFileName: choice === 'Yes' ? formData.rsaFileName : '',
                        rsaFileData: choice === 'Yes' ? formData.rsaFileData : ''
                    }))}
                </div>
            </div>

            {formData.alcohol === 'Yes' && (
                <div id="alcohol-rsa-block" className="space-y-3">
                    {rsaOnFile && formData.rsaChoice !== 'staff' ? (
                        <div className="space-y-2">
                            <p className="text-xs text-neutral-700">
                                {savedRsa.expiryDate
                                    ? `Your RSA is on file until ${formatBookingDate(savedRsa.expiryDate)}.`
                                    : 'Your RSA is on file. An admin will add the expiry date.'}
                            </p>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, rsaChoice: 'staff' }))}
                                className="text-xs font-bold underline"
                            >
                                Ask for a staff member with an RSA instead
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className={questionClass}>A valid NSW RSA competency card is required.</p>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-black rounded-sm"
                                        checked={formData.rsaChoice === 'upload'}
                                        onChange={() => setFormData(prev => ({ ...prev, rsaChoice: 'upload' }))}
                                    />
                                    <span className={answerClass}>Upload my RSA</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-black rounded-sm"
                                        checked={formData.rsaChoice === 'staff'}
                                        onChange={() => setFormData(prev => ({ ...prev, rsaChoice: 'staff', rsaFileName: '', rsaFileData: '' }))}
                                    />
                                    <span className={answerClass}>Organise a staff member with an RSA</span>
                                </label>
                            </div>
                            {formData.rsaChoice === 'upload' && (
                                <label className="block space-y-2">
                                    <span className="text-xs font-bold text-neutral-700">RSA competency card</span>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf,application/pdf"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            if (!file) return;
                                            if (file.size > 500 * 1024) {
                                                alert('That file is too large. Upload a photo or PDF under 500KB.');
                                                event.target.value = '';
                                                return;
                                            }
                                            const reader = new FileReader();
                                            reader.onload = () => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    rsaFileName: file.name,
                                                    rsaFileData: typeof reader.result === 'string' ? reader.result : ''
                                                }));
                                            };
                                            reader.readAsDataURL(file);
                                        }}
                                        className="block w-full text-xs text-neutral-700 file:mr-3 file:py-2 file:px-3 file:border file:border-gray-200 file:rounded-sm file:bg-white file:text-xs file:font-bold file:uppercase"
                                    />
                                    {formData.rsaFileName && <span className="text-xs text-neutral-600 block">Uploaded: {formData.rsaFileName}</span>}
                                </label>
                            )}
                        </>
                    )}
                </div>
            )}

            {access.founders && (formData.catering === 'Yes' || formData.alcohol === 'Yes') && (
                <div className="space-y-4">
                    {formData.catering === 'Yes' && (
                        <div className="space-y-2">
                            <p className={questionClass}>Do you need Tamara to order food, soft drinks etc. from Woolworths or caterer, please specify.</p>
                            {yesNoChoices(formData.foundersSupplies.woolworthsOrder, (choice) => setFormData(prev => ({
                                ...prev,
                                foundersSupplies: {
                                    ...prev.foundersSupplies,
                                    woolworthsOrder: choice,
                                    woolworths: choice === 'Yes' ? prev.foundersSupplies.woolworths : ''
                                }
                            })))}
                            {formData.foundersSupplies.woolworthsOrder === 'Yes' && (
                                <textarea
                                    rows={2}
                                    value={formData.foundersSupplies.woolworths}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        foundersSupplies: { ...prev.foundersSupplies, woolworths: e.target.value }
                                    }))}
                                    placeholder="Please specify"
                                    className="w-full p-2.5 border border-gray-200 bg-white text-xs text-black rounded-sm outline-none focus:border-black"
                                />
                            )}
                        </div>
                    )}
                    {formData.alcohol === 'Yes' && (
                        <div className="space-y-2">
                            <p className={questionClass}>Do you need Tamara to order beer or wine from Dan Murphy's. Please specify if you have specific requests.</p>
                            {yesNoChoices(formData.foundersSupplies.danMurphysOrder, (choice) => setFormData(prev => ({
                                ...prev,
                                foundersSupplies: {
                                    ...prev.foundersSupplies,
                                    danMurphysOrder: choice,
                                    danMurphys: choice === 'Yes' ? prev.foundersSupplies.danMurphys : ''
                                }
                            })))}
                            {formData.foundersSupplies.danMurphysOrder === 'Yes' && (
                                <textarea
                                    rows={2}
                                    value={formData.foundersSupplies.danMurphys}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        foundersSupplies: { ...prev.foundersSupplies, danMurphys: e.target.value }
                                    }))}
                                    placeholder="Please specify if you have specific requests"
                                    className="w-full p-2.5 border border-gray-200 bg-white text-xs text-black rounded-sm outline-none focus:border-black"
                                />
                            )}
                        </div>
                    )}
                    <p className="text-xs text-neutral-600">Book any other serviceware from the inventory.</p>
                </div>
            )}

            {!access.founders && formData.catering === 'Yes' && (
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
                    Anyone using our spaces will need to organise their own catering and serviceware. With the exception of items hired in this booking form.
                </p>

                <div className="pt-3 border-t border-dashed border-neutral-200/80">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            required
                            className="w-4 h-4 rounded-sm border-gray-300 accent-black mt-0.5"
                            checked={cateringAcknowledged}
                            onChange={(e) => {
                                setCateringAcknowledged(e.target.checked);
                                if (e.target.checked) setCateringError(false);
                            }}
                        />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-tight text-black">
                                I acknowledge this is a self-catering space *
                            </span>
                            {cateringError && <span className="text-xs font-bold text-red-700">Tick this box before submitting.</span>}
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
                <div className="space-y-2">
                    <p className={questionClass}>Controversial Topics & Security Notification *</p>
                    <p className="text-xs text-neutral-600 leading-relaxed">This event involves controversial topics, sensitive political discussions, potentially dangerous activities, or high-profile guest speakers that may require security presence, crowd management or additional risk assessments.</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {[['Yes', true], ['No', false]].map(([label, value]) => (
                            <label key={label} className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 accent-black rounded-sm"
                                    checked={formData.involvesControversialTopics === value}
                                    onChange={() => setFormData(prev => ({
                                        ...prev,
                                        involvesControversialTopics: value,
                                        securityDetails: value ? prev.securityDetails : ''
                                    }))}
                                />
                                <span className={answerClass}>{label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {formData.involvesControversialTopics && (
                    <div id="security-notification-block" className="p-4 bg-red-50/60 border border-red-200 rounded-sm space-y-2 animate-in fade-in">
                        <label className="text-xs font-bold uppercase tracking-wider text-red-900 block">
                            Please provide details. *
                        </label>
                        <textarea
                            rows={3}
                            required
                            placeholder="Describe the topic, speakers, expected attendance, and any crowd or security considerations..."
                            value={formData.securityDetails}
                            onChange={(e) => setFormData(prev => ({ ...prev, securityDetails: e.target.value }))}
                            className="w-full p-3 border border-red-200 bg-white text-xs text-black font-medium rounded-sm outline-none focus:border-red-500"
                        />
                    </div>
                )}
            </div>
        </section>
    );

    const renderContactDetailsSection = () => (
        <section id="contact-details-block" key="contact-details-block" className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
            <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                Contact & Responsible Person
            </h3>

            <div className="space-y-4">
                <p className={questionClass}>On the day contact *</p>
                <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            className="w-4 h-4 accent-black rounded-sm"
                            checked={formData.sameAsMain === true}
                            onChange={() => setFormData(prev => ({ ...prev, sameAsMain: true }))}
                        />
                        <span className={answerClass}>I am the on the day contact</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            className="w-4 h-4 accent-black rounded-sm"
                            checked={formData.sameAsMain === false}
                            onChange={() => setFormData(prev => ({
                                ...prev,
                                sameAsMain: false,
                                onDayContact: prev.sameAsMain === true ? { name: '', email: '', phone: '' } : prev.onDayContact
                            }))}
                        />
                        <span className={answerClass}>They are different</span>
                    </label>
                </div>

                {formData.sameAsMain === false && (
                    <div className="pt-4 border-t border-gray-100 space-y-4 animate-in fade-in">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">On-Day Contact</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-500">On-Day Contact Name</label>
                                <input
                                    type="text"
                                    required
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
                                    required
                                    placeholder="@unsw.edu.au"
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
                                    required
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
                            <h3 className="text-2xl font-black text-black tracking-tight">Bookable Spaces</h3>
                            <p className="text-xs text-neutral-400 font-medium mt-1">Click any space to view images, specs, and inclusions.</p>
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

                <section className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
                    {(() => {
                        const photos = venueShowroom[showroomSpace]?.imgs || [];
                        if (!photos.length) {
                            return (
                                <div className="bg-neutral-900 text-white h-56 sm:h-72 flex items-center justify-center px-6">
                                    <p className="text-sm font-bold tracking-wide">Images coming soon</p>
                                </div>
                            );
                        }
                        const scrollPhotos = (direction) => {
                            const strip = photoStripRef.current;
                            const card = strip?.querySelector('[data-photo]');
                            if (!strip || !card) return;
                            strip.scrollBy({ left: direction * (card.offsetWidth + 12), behavior: 'smooth' });
                        };
                        return (
                            <div className="relative bg-neutral-100">
                                <div
                                    ref={photoStripRef}
                                    className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory px-12 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                >
                                    {photos.map((src, index) => (
                                        <img
                                            key={src}
                                            data-photo
                                            src={src}
                                            alt={`${showroomSpace} view ${index + 1}`}
                                            className="h-72 sm:h-80 lg:h-[22rem] w-auto aspect-[3/4] object-cover snap-start shrink-0 rounded-sm bg-neutral-200"
                                        />
                                    ))}
                                </div>
                                {photos.length > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            aria-label="Previous photo"
                                            onClick={() => scrollPhotos(-1)}
                                            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-black"
                                        >
                                            <svg viewBox="0 0 20 20" className="w-5 h-5" aria-hidden="true">
                                                <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Next photo"
                                            onClick={() => scrollPhotos(1)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-black"
                                        >
                                            <svg viewBox="0 0 20 20" className="w-5 h-5" aria-hidden="true">
                                                <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    </>
                                )}
                            </div>
                        );
                    })()}

                    <div className="px-6 py-6 md:px-8 md:py-7 bg-white border-t border-gray-100 space-y-6">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                {venueShowroom[showroomSpace]?.roomNumber || showroomSpace}
                            </p>
                            <h4 className="text-2xl font-extrabold tracking-tight text-black mt-1">
                                {showroomSpace.replace('MCIC Ground - ', '').replace('MCIC Level 1 - ', '')}
                            </h4>
                        </div>
                        {(() => {
                            const blocks = spaceSpecBlocks(venueShowroom[showroomSpace]?.description);
                            const untitled = blocks.filter((block) => !block.title);
                            const intro = untitled.length ? { title: '', lines: untitled.flatMap((block) => block.lines) } : null;
                            const note = blocks.find((block) => /please note/i.test(block.title));
                            const included = blocks.find((block) => /included equipment/i.test(block.title));
                            const hasSharedEquipment = blocks.some((block) => /other equipment/i.test(block.title));
                            const sideOrder = [/capacity/i, /bathroom/i, /emergency/i];
                            const side = blocks
                                .filter((block) => block.title && block !== note && block !== included && !/other equipment/i.test(block.title))
                                .sort((a, b) => {
                                    const rank = (title) => {
                                        const index = sideOrder.findIndex((pattern) => pattern.test(title));
                                        return index === -1 ? sideOrder.length : index;
                                    };
                                    return rank(a.title) - rank(b.title);
                                });
                            const emergencyInLeftColumn = showroomSpace === 'MCIC Ground - Entire Space' || showroomSpace === 'MCIC Ground - Event Space';
                            const renderBlock = (block) => {
                                const noteBlock = /please note/i.test(block.title);
                                const includedBlock = /included equipment/i.test(block.title);
                                const emergency = /emergency/i.test(block.title);
                                const lines = emergency
                                    ? block.lines.filter((line) => /^first aid kit$/i.test(line.label))
                                    : block.lines;
                                if (block.sharedOnly) {
                                    return (
                                        <section key="shared-equipment" className="border border-neutral-200 rounded-sm p-4">
                                            <h5 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-800 mb-3">
                                                <span className="w-2 h-2 shrink-0 bg-[#EAD64D]" />
                                                Shared equipment
                                            </h5>
                                            <p className="text-sm leading-relaxed text-neutral-600">
                                                These items are shared across the bookable rooms, and what is free depends on the other bookings that day.{' '}
                                                <Link href="/inventory" className="font-bold text-black underline decoration-2 decoration-[#EAD64D] underline-offset-4">
                                                    View the inventory
                                                </Link>.
                                            </p>
                                        </section>
                                    );
                                }
                                return (
                                    <section key={block.title || 'intro'} className={block.title ? 'border border-neutral-200 rounded-sm p-4' : ''}>
                                        {block.title && (
                                            <h5 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-800 mb-3">
                                                <span className={`w-2 h-2 shrink-0 ${noteBlock ? 'bg-black' : 'bg-[#EAD64D]'}`} />
                                                {block.title}
                                            </h5>
                                        )}
                                        {noteBlock ? (
                                            <p className="text-sm leading-relaxed text-neutral-700 border-l-2 border-[#EAD64D] pl-3">
                                                {lines.map((line) => line.text).filter(Boolean).join(' ')}
                                            </p>
                                        ) : (
                                            <div className={!block.title ? 'space-y-2' : 'divide-y divide-neutral-100'}>
                                                {lines.map((line, lineIndex) => (
                                                    <div key={lineIndex} className={!block.title ? '' : 'py-2.5'}>
                                                        {line.label && (
                                                            <p className="text-xs font-bold uppercase tracking-wide text-black">{line.label}</p>
                                                        )}
                                                        {line.text && (
                                                            <p className={`leading-relaxed ${line.label ? 'text-sm text-neutral-600 mt-0.5' : 'text-sm text-neutral-600'}`}><SpecRichText text={line.text} /></p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {includedBlock && hasSharedEquipment && (
                                            <p className="text-sm leading-relaxed text-neutral-600 mt-4 pt-4 border-t border-neutral-100">
                                                <span className="block text-xs font-bold uppercase tracking-wide text-black mb-1">Shared equipment</span>
                                                These items are shared across the bookable rooms, and what is free depends on the other bookings that day.{' '}
                                                <Link href="/inventory" className="font-bold text-black underline decoration-2 decoration-[#EAD64D] underline-offset-4">
                                                    View the inventory
                                                </Link>.
                                            </p>
                                        )}
                                        {emergency && (
                                            <p className="text-sm leading-relaxed text-neutral-600 mt-3">
                                                In an emergency, see{' '}
                                                <a
                                                    href="#faq-security"
                                                    onClick={() => {
                                                        if (window.location.hash === '#faq-security') {
                                                            window.dispatchEvent(new HashChangeEvent('hashchange'));
                                                        }
                                                    }}
                                                    className="font-bold text-black underline decoration-2 decoration-[#EAD64D] underline-offset-4"
                                                >
                                                    First Aid, Security, Emergency & Safety
                                                </a>.
                                            </p>
                                        )}
                                    </section>
                                );
                            };
                            const besideEquipment = side.filter((block) => !/emergency/i.test(block.title));
                            const emergency = side.find((block) => /emergency/i.test(block.title));
                            const leftColumn = emergencyInLeftColumn ? [...besideEquipment, emergency].filter(Boolean) : besideEquipment;
                            const sharedSection = !included && hasSharedEquipment ? { title: 'Shared equipment', lines: [], sharedOnly: true } : null;
                            const rightColumn = included || sharedSection;
                            return (
                                <div className="space-y-8">
                                    {intro && renderBlock(intro)}
                                    {(leftColumn.length > 0 || rightColumn) && (
                                        <div className="grid grid-cols-1 gap-y-8 md:grid-cols-2 md:gap-x-12 md:items-start">
                                            <div className="contents md:flex md:flex-col md:gap-8">
                                                {leftColumn[0] && renderBlock(leftColumn[0])}
                                                {rightColumn && <div className="md:hidden">{renderBlock(rightColumn)}</div>}
                                                {leftColumn.slice(1).map(renderBlock)}
                                            </div>
                                            {rightColumn && <div className="hidden md:block">{renderBlock(rightColumn)}</div>}
                                        </div>
                                    )}
                                    {emergency && !emergencyInLeftColumn && renderBlock(emergency)}
                                    {note && renderBlock(note)}
                                </div>
                            );
                        })()}
                    </div>
                </section>
            </div>

            <EventFAQs />

            {/* THE MAIN FORM WRAPPER TRACK BOX */}
            <form id="booking-form" onSubmit={handleFormSubmit} className="space-y-12">
                <section id="booking-intent-section" className="bg-white border border-gray-200 rounded-sm shadow-sm space-y-6 overflow-hidden">
                    <div className="bg-neutral-900 text-white p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-extrabold tracking-tight uppercase">Booking Expression of Interest Form</h2>
                        </div>                    </div>

                    <div className="px-8 pb-8 pt-2 space-y-6">
                        <div className="space-y-6">
                            <div className="p-5 border border-neutral-200 bg-neutral-50/50 rounded-sm space-y-4">
                                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-sm font-black uppercase tracking-tight text-black">Live Availability</h4>
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
                                                    <span className="w-2.5 h-2.5 bg-[#EAD64D] border border-yellow-600 rounded-sm block" />
                                                    <span className="text-neutral-600">Held</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 bg-rose-100 border border-rose-300 rounded-sm block" />
                                                    <span className="text-neutral-600">Unavailable</span>
                                                </div>
                                                {lockoutApplies && (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2.5 h-2.5 bg-rose-50 border border-rose-300 rounded-sm block" />
                                                        <span className="text-neutral-600">Lockout</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {(calendarNotice || slotWarning || lockoutNotice || lockoutWeekNotes.length > 0) && (
                                            <div className="space-y-1">
                                                {calendarNotice && (
                                                    <p className="text-xs font-bold text-amber-800">{calendarNotice}</p>
                                                )}
                                                {slotWarning && (
                                                    <p className="text-xs font-bold text-red-700">{slotWarning}</p>
                                                )}
                                                {lockoutWeekNotes.length > 0 && (
                                                    <p className="text-xs font-bold text-amber-800">Dates in lockout are held so Founders Program Managers have first access to space bookings.</p>
                                                )}
                                                {lockoutWeekNotes.map(note => (
                                                    <p key={note} className="text-xs font-bold text-amber-800">{note}</p>
                                                ))}
                                                {lockoutNotice && (
                                                    <p className="text-xs font-bold text-rose-800">{lockoutNotice}</p>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between gap-2 bg-neutral-100 p-1 rounded-sm border border-neutral-200">
                                            <button type="button" onClick={handlePrevWeek} className="p-1.5 text-xs font-black bg-white border border-neutral-300 rounded-sm hover:bg-neutral-50">←</button>
                                            <div className="flex gap-1 overflow-x-auto flex-1 justify-center">
                                                {activeWeekDays.map((dateItem) => {
                                                    const dayLock = lockoutApplies ? bookingWindowForDate(localDateString(dateItem)) : null;
                                                    const isLocked = Boolean(dayLock?.locked);
                                                    const isSelected = !isLocked && selectedCalendarDate.toDateString() === dateItem.toDateString();
                                                    const isFocusedLock = isLocked && selectedCalendarDate.toDateString() === dateItem.toDateString();
                                                    return (
                                                        <button
                                                            key={dateItem.toISOString()}
                                                            type="button"
                                                            disabled={isLocked}
                                                            title={isLocked ? lockoutMessage(dayLock) : undefined}
                                                            onClick={() => chooseCalendarDay(dateItem)}
                                                            className={`px-3 py-1.5 text-xs font-mono rounded-sm border flex flex-col items-center min-w-[65px] transition-all disabled:opacity-100 ${isSelected
                                                                ? 'bg-neutral-900 border-black text-white font-black scale-[1.02]'
                                                                : isLocked
                                                                    ? `bg-rose-50 border-rose-200 text-rose-800 cursor-not-allowed ${isFocusedLock ? 'ring-2 ring-rose-400' : ''}`
                                                                    : 'bg-white border-transparent text-neutral-600 hover:bg-neutral-50'
                                                                }`}
                                                        >
                                                            <span className="text-[9px] uppercase opacity-60">{dateItem.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                                            <span>{dateItem.getDate()}</span>
                                                            {isLocked && <span className="text-[8px] uppercase tracking-wide">Lockout</span>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <button type="button" onClick={handleNextWeek} className="p-1.5 text-xs font-black bg-white border border-neutral-300 rounded-sm hover:bg-neutral-50">→</button>
                                        </div>

                                        <div className="p-3.5 bg-neutral-900 text-white font-bold rounded-xs text-xs">
                                            Select all time slots you would like to book. Selecting start and end times automatically selects all in between.
                                            <br />{wantsMultipleHolds
                                                ? 'Choose Hold 1, 2 or 3, then select that window. Each hold is one room and one continuous time.'
                                                : 'Note: You can only book one room at a time.'}
                                        </div>
                                        {!wantsMultipleHolds && selectedSlots.length > 0 && (
                                            <p className="text-xs font-bold text-neutral-800">
                                                {selectedSlots.length} adjacent {selectedSlots.length === 1 ? 'slot' : 'slots'} selected, {formData.bumpIn} to {formData.bumpOut}.
                                            </p>
                                        )}


                                        {selectedLock.locked ? (
                                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-sm">
                                                <p className="text-xs font-bold text-rose-900">{lockoutMessage(selectedLock)} This date cannot be selected.</p>
                                            </div>
                                        ) : (
                                        <div className="border border-gray-200 rounded-sm bg-white shadow-sm overflow-hidden">
                                            <div className="overflow-x-auto overflow-y-auto max-h-[480px]" onMouseLeave={() => setSlotHover(null)}>
                                                <table className="w-full table-fixed text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-neutral-900 text-white text-[10px] font-black uppercase tracking-wider border-b border-neutral-800 sticky top-0 z-20">
                                                            <th className="p-2 w-16 bg-neutral-900 sticky left-0 z-30">Time</th>
                                                            {mockCalendarData.rooms.map((room) => (
                                                                <th key={room.name} className="p-2 text-center border-l border-neutral-800 whitespace-normal leading-tight">
                                                                    {room.name}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 font-medium text-xs">
                                                        {mockCalendarData.timeSlots.map((slot) => (
                                                            <tr key={slot} className="hover:bg-neutral-50/50 transition-colors">
                                                                <td className="p-2 font-mono font-bold text-neutral-800 tracking-tight bg-white sticky left-0 z-10 border-r border-neutral-100">
                                                                    {slot}
                                                                </td>
                                                                {mockCalendarData.rooms.map((room) => {
                                                                    const viewedDate = localDateString(selectedCalendarDate);
                                                                    const isBlocked = isSlotBlockedByCalendar(room.space, slot);
                                                                    const holdIndex = bookingHolds.findIndex(hold => hold.date === viewedDate && hold.roomName === room.name && hold.times.includes(slot));
                                                                    const colonnadeHoldIndexes = room.name === 'Colonnade'
                                                                        ? bookingHolds.flatMap((hold, index) => (
                                                                            hold.includeColonnade && hold.date === viewedDate && hold.times.includes(slot) ? [index] : []
                                                                        ))
                                                                        : [];
                                                                    const isCurrentlySelected = holdIndex >= 0;
                                                                    const isColonnadeAddon = colonnadeHoldIndexes.length > 0 && !isBlocked;
                                                                    const selectedTimes = isCurrentlySelected ? bookingHolds[holdIndex].times : [];
                                                                    const addonHold = !isCurrentlySelected && colonnadeHoldIndexes.length === 1 ? bookingHolds[colonnadeHoldIndexes[0]] : null;
                                                                    let holdName = '';
                                                                    if (wantsMultipleHolds) {
                                                                        if (colonnadeHoldIndexes.length > 1) holdName = `Hold ${colonnadeHoldIndexes.map(index => index + 1).join('+')}`;
                                                                        else if (isCurrentlySelected) holdName = `Hold ${holdIndex + 1}`;
                                                                        else if (colonnadeHoldIndexes.length === 1) holdName = `Hold ${colonnadeHoldIndexes[0] + 1}`;
                                                                    }
                                                                    const selectedEdge = slotEdgeLabel(selectedTimes.length ? selectedTimes : (addonHold?.times || []), slot, holdName);
                                                                    const previewTimes = hoverPreview?.roomName === room.name ? hoverPreview.times : null;
                                                                    const inPreview = Boolean(previewTimes?.includes(slot));
                                                                    const previewHoldName = wantsMultipleHolds && hoverPreview ? `Hold ${hoverPreview.holdNumber}` : '';
                                                                    const previewEdge = inPreview ? slotEdgeLabel(previewTimes, slot, previewHoldName) : null;
                                                                    const selectedLabel = holdName;
                                                                    const committedLabel = selectedEdge || selectedLabel;
                                                                    const label = inPreview
                                                                        ? (previewEdge || (isCurrentlySelected && (wantsMultipleHolds || colonnadeHoldIndexes.length) ? selectedLabel : ''))
                                                                        : (isCurrentlySelected || isColonnadeAddon ? committedLabel : 'Select');

                                                                    return (
                                                                        <td key={room.name} className="p-1 text-center border-l border-gray-100">
                                                                            {!isBlocked ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onMouseEnter={() => setSlotHover({ roomName: room.name, slot })}
                                                                                    onClick={(clickEvent) => {
                                                                                        if (isColonnadeAddon && !isCurrentlySelected) return;
                                                                                        handleSlotClick(clickEvent, room, slot);
                                                                                    }}
                                                                                    className={`w-full min-h-[2.25rem] py-1 px-0.5 text-[7px] font-black uppercase tracking-tight leading-tight font-sans border rounded-sm transition-colors whitespace-normal ${isCurrentlySelected || isColonnadeAddon
                                                                                        ? 'bg-[#EAD64D] border-yellow-600 text-black shadow-inner'
                                                                                        : inPreview
                                                                                            ? 'bg-[#F6E98A] border-yellow-600 text-black'
                                                                                            : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-200'
                                                                                        }`}
                                                                                >
                                                                                    {label || '\u00a0'}
                                                                                </button>
                                                                            ) : (
                                                                                <div
                                                                                    onMouseEnter={() => setSlotHover(null)}
                                                                                    className="py-2 text-[9px] font-black uppercase tracking-wider font-sans border rounded-sm bg-rose-50 border-rose-200 text-rose-800 opacity-60 cursor-not-allowed"
                                                                                >
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
                                        )}

                                        <div className="space-y-3">
                                            <div className="flex flex-col md:flex-row gap-3">
                                            <label className="flex flex-1 items-start gap-3 p-3 bg-white border border-gray-200 rounded-sm cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={wantsMultipleHolds}
                                                    onChange={(event) => {
                                                        const on = event.target.checked;
                                                        setWantsMultipleHolds(on);
                                                        if (on) {
                                                            setRecurrence(prev => ({ ...prev, pattern: 'none', interval: 1 }));
                                                            setActiveHoldIndex(bookingHolds.length < 3 ? bookingHolds.length : 0);
                                                        } else {
                                                            setBookingHolds(prev => prev.slice(0, 1));
                                                            setActiveHoldIndex(0);
                                                        }
                                                    }}
                                                    className="w-4 h-4 accent-black mt-0.5"
                                                />
                                                <span>
                                                    <span className="text-xs font-bold uppercase tracking-wide text-neutral-900 block">I would like to book multiple holds</span>
                                                    <span className="text-[11px] text-neutral-600 block mt-0.5">Select up to two more dates/times on the calendar to hold multiple dates/times for the same event. These dates/times will only be held for one week to allow you time to confirm which one of the booking holds will go ahead for this event. They are labelled Hold 1, Hold 2 and Hold 3.</span>
                                                </span>
                                            </label>
                                            {foundersBooking && (
                                                <label className="flex flex-1 items-start gap-3 p-3 bg-white border border-gray-200 rounded-sm cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={isRepeatingPattern(recurrence.pattern)}
                                                        onChange={(event) => {
                                                            if (event.target.checked) {
                                                                setWantsMultipleHolds(false);
                                                                setBookingHolds(prev => prev.slice(0, 1));
                                                                setActiveHoldIndex(0);
                                                                setRecurrence(prev => ({ ...prev, pattern: 'weekly', interval: 1 }));
                                                                return;
                                                            }
                                                            setRecurrence(prev => ({ ...prev, pattern: 'none', interval: 1 }));
                                                        }}
                                                        className="w-4 h-4 accent-black mt-0.5"
                                                    />
                                                    <span>
                                                        <span className="text-xs font-bold uppercase tracking-wide text-neutral-900 block">Does this event repeat?</span>
                                                        <span className="text-[11px] text-neutral-600 block mt-0.5">Weekly, fortnightly, or monthly. A booking can be multiple holds or a repeat, not both.</span>
                                                    </span>
                                                </label>
                                            )}
                                            </div>
                                            {wantsMultipleHolds && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                    {[0, 1, 2].map((index) => {
                                                        const hold = bookingHolds[index];
                                                        const editable = index <= bookingHolds.length;
                                                        const active = index === Math.min(activeHoldIndex, bookingHolds.length);
                                                        return (
                                                            <button
                                                                key={index}
                                                                type="button"
                                                                disabled={!editable}
                                                                onClick={() => setActiveHoldIndex(Math.min(index, bookingHolds.length))}
                                                                className={`p-3 text-left border rounded-sm ${active ? 'border-black ring-2 ring-black' : 'border-gray-200'} ${editable ? 'bg-white' : 'bg-neutral-50 opacity-60'}`}
                                                            >
                                                                <span className="block text-[10px] font-black uppercase tracking-wider">Hold {index + 1}</span>
                                                                <span className="block text-[11px] font-medium text-neutral-700 mt-1">
                                                                    {hold
                                                                        ? `${hold.roomName} · ${formatBookingDate(hold.date, true)} · ${hold.bumpIn}–${hold.bumpOut}`
                                                                        : 'Select on the calendar'}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {foundersBooking && isRepeatingPattern(recurrence.pattern) && (
                                                <div className="p-4 bg-white border border-neutral-200 rounded-sm space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Repeat</label>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            {[
                                                                { id: 'weekly', label: 'Weekly' },
                                                                { id: 'fortnightly', label: 'Fortnightly' },
                                                                { id: 'monthly', label: 'Monthly' }
                                                            ].map(option => (
                                                                <button
                                                                    key={option.id}
                                                                    type="button"
                                                                    onClick={() => setRecurrence(prev => ({ ...prev, pattern: option.id, interval: 1 }))}
                                                                    className={`p-3 text-xs font-bold uppercase tracking-wider text-center border rounded-sm transition-all ${recurrence.pattern === option.id
                                                                        ? 'bg-black text-white border-black shadow-sm'
                                                                        : 'bg-white border-gray-200 text-neutral-700 hover:bg-neutral-50'
                                                                        }`}
                                                                >
                                                                    {option.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Ends</label>
                                                        <div className="grid grid-cols-2 gap-2 max-w-sm">
                                                            <button
                                                                type="button"
                                                                onClick={() => setRecurrence(prev => ({ ...prev, endType: 'on' }))}
                                                                className={`p-2 text-[11px] font-bold uppercase tracking-wider border rounded-sm ${recurrence.endType === 'on' ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-neutral-700'}`}
                                                            >
                                                                On a date
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setRecurrence(prev => ({ ...prev, endType: 'after' }))}
                                                                className={`p-2 text-[11px] font-bold uppercase tracking-wider border rounded-sm ${recurrence.endType === 'after' ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-neutral-700'}`}
                                                            >
                                                                After
                                                            </button>
                                                        </div>
                                                        {recurrence.endType === 'on' ? (
                                                            <input
                                                                type="date"
                                                                value={recurrence.endDate}
                                                                min={selectedDateStr}
                                                                onChange={(e) => setRecurrence(prev => ({ ...prev, endDate: e.target.value }))}
                                                                className="w-full max-w-sm p-2 border border-gray-300 bg-white text-sm font-medium rounded-sm text-black outline-none"
                                                            />
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    max={MAX_SERIES_OCCURRENCES}
                                                                    value={recurrence.occurrences}
                                                                    onChange={(e) => setRecurrence(prev => ({
                                                                        ...prev,
                                                                        occurrences: Math.min(MAX_SERIES_OCCURRENCES, Math.max(1, Number(e.target.value) || 1))
                                                                    }))}
                                                                    className="w-20 p-2 border border-gray-300 bg-white text-sm font-medium rounded-sm text-black outline-none"
                                                                />
                                                                <span className="text-xs font-medium text-neutral-700">occurrences</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] font-medium text-neutral-500">
                                                        {recurrence.pattern === 'monthly'
                                                            ? `Same week of the month, same day, and the same time. A month without that week is left out. ${seriesEndSentence}`
                                                            : `Same weekday and time. ${seriesEndSentence}`}
                                                    </p>
                                                    {seriesPlan?.skippedDates?.length > 0 && (
                                                        <ul className="space-y-1">
                                                            {seriesPlan.skippedDates.map(item => (
                                                                <li key={item.date} className="text-xs text-rose-900">
                                                                    {formatBookingDate(item.date, true)} — {item.reason}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                    {seriesPlan?.known && seriesPlan.calendarLoaded === false && (
                                                        <p className="text-xs font-bold text-amber-800">The room calendar could not be loaded, so only holds already saved are listed. This repeat cannot be confirmed until the calendar loads.</p>
                                                    )}
                                                    {seriesPlan?.invalidEnd && (
                                                        <p className="text-xs font-bold text-red-700">Choose an end date on or after the start date.</p>
                                                    )}
                                                    {!seriesPlan?.invalidEnd && selectedSlots.length > 0 && (seriesAvailability.status === 'loading' || seriesAvailability.status === 'idle') && (
                                                        <p className="text-xs font-bold text-neutral-600">Checking each date against the room calendar…</p>
                                                    )}
                                                    {!seriesPlan?.invalidEnd && seriesAvailability.status === 'error' && (
                                                        <ul className="space-y-1">
                                                            {(seriesPlan?.dates || []).map(date => (
                                                                <li key={date} className="text-xs text-neutral-600">
                                                                    {formatBookingDate(date, true)} — availability could not be checked
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                    {seriesPlan?.known && !seriesPlan.invalidEnd && seriesPlan.bookedDates.length > 0 && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-bold text-neutral-800">These dates will be booked</p>
                                                            <ul className="space-y-1">
                                                                {seriesPlan.bookedDates.map(date => (
                                                                    <li key={date} className="text-xs text-neutral-700">
                                                                        {formatBookingDate(date, true)}, {timeRangeLabel}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {seriesPlan?.known && seriesPlan.dates.length >= MAX_SERIES_OCCURRENCES && (
                                                        <p className="text-[11px] font-bold text-neutral-500">Later dates are left out because a series stops at {MAX_SERIES_OCCURRENCES} occurrences.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {inclusionGroups.length > 0 && (
                                            <div className="space-y-3">
                                                {inclusionGroups.map(group => {
                                                    const names = group.holds.map(item => `Hold ${item.index + 1}`);
                                                    const listed = names.length === 1
                                                        ? names[0]
                                                        : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
                                                    const heading = bookingHolds.length === 1 ? 'Selected Venue:' : `${listed}:`;
                                                    return (
                                                        <div key={group.space} className="space-y-3">
                                                            {renderRoomInclusions(group.space, heading)}
                                                            {group.holds.filter(item => COLONNADE_SPACES.includes(item.hold.space)).map(item => {
                                                                const status = colonnadeStatus(item.hold);
                                                                return (
                                                                    <div key={item.index} className="space-y-2">
                                                                        <label className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-sm cursor-pointer select-none">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={Boolean(item.hold.includeColonnade)}
                                                                                onChange={() => toggleHoldColonnade(item.index)}
                                                                                className="w-4 h-4 accent-black mt-0.5"
                                                                            />
                                                                            <span>
                                                                                <span className="text-xs font-bold uppercase tracking-wide text-neutral-900 block">
                                                                                    Also book the Outdoor Colonnade{bookingHolds.length > 1 ? ` for Hold ${item.index + 1}` : ''}
                                                                                </span>
                                                                                <span className="text-[11px] text-neutral-600 block mt-0.5">Reserve the covered walkway area directly outside for guest check-in, catering etc.</span>
                                                                            </span>
                                                                        </label>
                                                                        {status === 'booked' && (
                                                                            <p className="text-xs font-bold text-rose-800">
                                                                                The Colonnade is booked at that time, but the inside space is still available. If you want information on what is booked at the Colonnade to see if it will be disruptive, continue to book the space so it is held and then contact mcic@unsw.edu.au.
                                                                            </p>
                                                                        )}
                                                                        {status === 'unknown' && (
                                                                            <p className="text-xs font-bold text-amber-800">
                                                                                Live availability could not be loaded, so it is not clear whether the Colonnade is free at that time. The inside space can still be booked.
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-neutral-200/60 text-center space-y-2">
                                            {bookingHolds.length === 0 && (
                                                <p className="text-xs font-bold text-neutral-700">Select a room and time on the calendar before continuing.</p>
                                            )}
                                            <button
                                                type="button"
                                                onClick={triggerRevealAllQuestions}
                                                disabled={bookingHolds.length === 0}
                                                className={`w-full text-center font-black py-4 text-xs uppercase tracking-widest rounded-sm transition-all duration-200 ${bookingHolds.length === 0 ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed' : 'bg-[#EAD64D] text-black hover:bg-black hover:text-white cursor-pointer'}`}
                                            >
                                                Continue to Booking Form ↓
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                </section>

                {showFullForm && (
                    <div id="rest-of-form-marker" className="space-y-12 animate-in fade-in duration-300">
                        {renderEventDetailsSection()}
                        {renderTimesAndRunsheetSection()}
                        {renderCateringSection()}
                        {renderAvAndEquipmentSection()}
                        {renderRiskAssessmentSection()}
                        {renderContactDetailsSection()}

                        <section id="staffing-block" className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
                            <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                                Staffing
                            </h3>
                            <div className="space-y-6">
                                {access.founders && (
                                    <div className="space-y-2">
                                        <p className={questionClass}>Do you need Tamara present for this event?</p>
                                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                                            {['Whole event (including setup/packdown)', 'Setup', 'Formalities', 'Not at all'].map((opt) => (
                                                <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 accent-black rounded-sm"
                                                        checked={formData.tamaraPresence === opt}
                                                        onChange={() => setFormData({ ...formData, tamaraPresence: opt })}
                                                    />
                                                    <span className={answerClass}>{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <label className="block space-y-1">
                                            <span className={questionClass}>Any details for Tamara</span>
                                            <textarea
                                                rows={2}
                                                value={formData.tamaraDetails}
                                                onChange={(e) => setFormData(prev => ({ ...prev, tamaraDetails: e.target.value }))}
                                                className="w-full p-2.5 border border-gray-200 bg-white text-xs text-black rounded-sm outline-none focus:border-black"
                                            />
                                        </label>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <p className={questionClass}>{requiredCasual.length ? 'Casual staff are required for this booking' : 'Would you like to book a casual staff member for event support?'}</p>
                                    {!access.founders && (
                                        <p className="text-xs text-neutral-600">
                                            Casual staff members are available at $50 per hour. The minimum is 3 hours, or 4 hours on a weekend. They can assist with room setup, AV, and guest check-in.
                                        </p>
                                    )}
                                    {requiredCasual.length ? (
                                        <p className="text-xs text-neutral-700">
                                            This booking is outside ordinary working hours, 8:45am–4:00pm on weekdays. An early shift starts at bump in and finishes at 8:45am when that is longer than the 3 hour minimum, or the 4 hour minimum on a weekend. Otherwise it runs for that minimum. A late shift starts at 3:30pm, or at bump in if the event starts later, and finishes at bump out.
                                        </p>
                                    ) : (
                                        yesNoChoices(formData.wantsCasualStaff, (choice) => setFormData({ ...formData, wantsCasualStaff: choice }))
                                    )}
                                    {(requiredCasual.length || formData.wantsCasualStaff === 'Yes') && (
                                        <div className="space-y-4 pt-2">
                                            <label className="text-[11px] font-black uppercase tracking-wider text-neutral-700 block">
                                                Casual Staff Shift Details
                                            </label>
                                            {formData.casualStaffDetails.map((staffRow, idx) => (
                                                <div key={staffRow.forceKey || idx} className={`p-4 bg-white border border-gray-200 rounded-sm grid grid-cols-1 gap-3 items-end ${(access.founders || foundersBooking) ? 'md:grid-cols-[minmax(0,1.15fr)_5.5rem_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,1.4fr)_2rem]' : 'md:grid-cols-[5.5rem_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.7fr)_2rem]'}`}>
                                                    {staffRow.date && (
                                                        <p className="text-[10px] font-bold uppercase text-gray-500 md:col-span-full">{formatBookingDate(staffRow.date, true)}{staffRow.forced ? ' · Required shift' : ''}</p>
                                                    )}
                                                    {(access.founders || foundersBooking) && (
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Preferred Staff Member</label>
                                                            <select
                                                                value={staffRow.preferredStaff}
                                                                onChange={(e) => updateCasualStaffDetail(idx, 'preferredStaff', e.target.value)}
                                                                className="w-full p-2 border border-gray-200 rounded-sm text-xs font-medium text-black outline-none focus:border-neutral-400"
                                                            >
                                                                <option value="">No Preference</option>
                                                                {CASUAL_STAFF_LIST.map((name) => (
                                                                    <option key={name} value={name}>{name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase">How many</label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={MAX_CASUAL_QUANTITY}
                                                            step={1}
                                                            inputMode="numeric"
                                                            required
                                                            value={staffRow.quantity}
                                                            onChange={(e) => updateCasualStaffDetail(idx, 'quantity', e.target.value)}
                                                            onBlur={(e) => {
                                                                if (casualShiftQuantity({ quantity: e.target.value }) == null) updateCasualStaffDetail(idx, 'quantity', 1);
                                                            }}
                                                            className="w-full p-2 border border-gray-200 rounded-sm text-xs font-medium text-black outline-none focus:border-neutral-400"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Shift Start</label>
                                                        <input
                                                            type="time"
                                                            readOnly={Boolean(staffRow.forced)}
                                                            value={staffRow.shiftStart}
                                                            onChange={(e) => updateCasualStaffDetail(idx, 'shiftStart', e.target.value)}
                                                            className={`w-full p-2 border border-gray-200 rounded-sm text-xs font-medium text-black outline-none focus:border-neutral-400 ${staffRow.forced ? 'bg-neutral-100' : ''}`}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Shift End</label>
                                                        <input
                                                            type="time"
                                                            readOnly={Boolean(staffRow.forced)}
                                                            value={staffRow.shiftEnd}
                                                            onChange={(e) => updateCasualStaffDetail(idx, 'shiftEnd', e.target.value)}
                                                            className={`w-full p-2 border border-gray-200 rounded-sm text-xs font-medium text-black outline-none focus:border-neutral-400 ${staffRow.forced ? 'bg-neutral-100' : ''}`}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Tasks / Description</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Stage setup & Slido Q&A mic running"
                                                            value={staffRow.tasks}
                                                            onChange={(e) => updateCasualStaffDetail(idx, 'tasks', e.target.value)}
                                                            className="w-full p-2 border border-gray-200 rounded-sm text-xs font-medium text-black outline-none focus:border-neutral-400"
                                                        />
                                                    </div>
                                                    <div className="text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeCasualStaffRow(idx)}
                                                            disabled={formData.casualStaffDetails.length === 1 || staffRow.forced}
                                                            className={`p-2 text-xs font-bold rounded-sm ${formData.casualStaffDetails.length === 1 || staffRow.forced ? 'text-gray-300' : 'text-red-600 hover:bg-red-50'}`}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={addCasualStaffRow}
                                                className="bg-black text-white font-bold text-[10px] tracking-wider px-3.5 py-2 rounded-sm"
                                            >
                                                + additional staffing request
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {!access.founders && (
                            <section id="billing-block" className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
                                <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                                    Billing & Payment Details
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <p className={questionClass}>Does this event have to do with Innovation / Entrepreneurship?</p>
                                        <p className="text-xs text-neutral-600">Selecting Yes applies an automatic discount to your venue hire rate.</p>
                                        {yesNoChoices(formData.isInnovationOrEntrepreneurship, (choice) => setFormData({ ...formData, isInnovationOrEntrepreneurship: choice }))}
                                    </div>
                                    <p className={questionClass}>Payment Method</p>
                                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                                        {['Journal Transfer', 'Invoice'].map(method => (
                                            <label key={method} className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 accent-black rounded-sm"
                                                    checked={formData.paymentMethod === method}
                                                    onChange={() => setFormData(prev => ({ ...prev, paymentMethod: method }))}
                                                />
                                                <span className={answerClass}>{method}</span>
                                            </label>
                                        ))}
                                    </div>

                                    {formData.paymentMethod === 'Journal Transfer' && (
                                        <div className="text-xs text-neutral-700 bg-neutral-50 border border-gray-200 rounded-sm p-4 space-y-2">
                                            <p>You can pay by journal transfer or invoice. A 50% deposit confirms the booking. The remaining 50% is due no later than 48 hours before the event.</p>
                                            <p className="text-neutral-800">If you are a UNSW department, Journal Transfer is preferred.</p>
                                            <ul className="list-disc pl-4 space-y-1.5">
                                                <li>Not sure how to organise a Journal Transfer? The related Finance Analyst in your faculty or division can process the internal journal transfer. Simply contact them.</li>
                                                <li>
                                                    Who is my Finance Analyst? Check the Finance SharePoint:{' '}
                                                    <a href="https://unsw.sharepoint.com/sites/finance-hub/SitePages/Contact-Finance.aspx" target="_blank" rel="noopener noreferrer" className="font-bold text-black underline decoration-2 decoration-[#EAD64D] underline-offset-4">
                                                        Contact Finance
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
                                    )}

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
                                                <textarea
                                                    rows={3}
                                                    placeholder="Street Address, Suburb, State, Postcode"
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

                        <section id="anything-else-block" className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-3">
                            <label className={`${questionClass} block`}>
                                Is there anything else we should know?
                            </label>
                            <textarea
                                rows={4}
                                placeholder={access.founders ? '' : 'e.g. You need help to source a judge for an entrepreneurship related event'}
                                value={formData.anythingElse}
                                onChange={(e) => setFormData(prev => ({ ...prev, anythingElse: e.target.value }))}
                                className="w-full p-3 border border-gray-200 bg-white text-xs text-black rounded-sm outline-none focus:border-black"
                            />
                        </section>

                        {!access.founders && (
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
                                <div id="signature-block" className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <label className="text-[10px] font-bold uppercase text-gray-500">Signature *</label>
                                        <button
                                            type="button"
                                            onClick={clearSignature}
                                            className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 hover:text-black"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <canvas
                                        ref={signatureCanvasRef}
                                        width={900}
                                        height={180}
                                        onPointerDown={startSignatureStroke}
                                        onPointerMove={moveSignatureStroke}
                                        onPointerUp={endSignatureStroke}
                                        onPointerCancel={endSignatureStroke}
                                        className="w-full h-36 bg-white border border-gray-300 rounded-sm touch-none cursor-crosshair"
                                        aria-label="Draw your signature"
                                    />
                                    <p className="text-xs text-neutral-600">Draw your signature in the box.</p>
                                </div>

                                <div
                                    id="conduct-policy-block"
                                    className={`p-4 border rounded-sm space-y-3 transition-colors duration-200 ${conductError
                                        ? 'border-red-300 bg-red-50/60 text-red-900'
                                        : 'bg-neutral-50 border-gray-200'
                                        }`}
                                >
                                    <div className="text-xs text-neutral-800">
                                        Venue Hire Agreement and Campus Policy
                                    </div>
                                    <p className="text-xs text-neutral-700 leading-relaxed">
                                        By submitting a booking request, hirers agree to abide by all sections of the{' '}
                                        <a href="/docs/MCIC_Venue_Hire_Terms_and_Conditions.pdf" target="_blank" rel="noopener noreferrer" className="underline">Terms and Conditions of Use</a>
                                        {' '}and the{' '}
                                        <a href="https://www.unsw.edu.au/content/dam/pdfs/governance/policy/2022-01-policies/campuspolicy.pdf" target="_blank" rel="noopener noreferrer" className="underline">UNSW Campus Policy</a>.
                                    </p>
                                    <label className="flex items-start gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={conductAcknowledged}
                                            onChange={(e) => {
                                                setConductAcknowledged(e.target.checked);
                                                if (e.target.checked) setConductError(false);
                                            }}
                                            className="w-4 h-4 rounded-sm border-gray-300 accent-black mt-0.5"
                                        />
                                        <span className={`text-xs ${conductError ? 'text-red-700' : 'text-neutral-800'}`}>
                                            I agree to abide by the Terms and Conditions of Use and the UNSW Campus Policy.
                                        </span>
                                    </label>
                                    {conductError && (
                                        <p className="text-xs text-red-700">Please acknowledge the Venue Hire Agreement and Campus Policy before submitting.</p>
                                    )}
                                </div>
                            </div>
                        </section>
                        )}

                        {access.signedIn && (() => {
                            const lineItems = quote.lineItems || [];
                            const discountTotal = lineItems.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
                            const money = (value) => `$${Number(value || 0).toFixed(2)}`;
                            return (
                                <div className="bg-neutral-900 text-white p-6 border border-neutral-800 rounded-sm space-y-4">
                                    <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                                        <div>
                                            <h3 className="text-sm font-extrabold uppercase tracking-wider">Quote Breakdown</h3>
                                            <p className="text-[11px] text-neutral-400">Itemised hire, discounts, GST, and the total due.</p>
                                        </div>
                                        {quote.discountPercentage > 0 && (
                                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-sm">
                                                {quote.discountPercentage}% Discount Applied
                                            </span>
                                        )}
                                    </div>

                                    {lineItems.length > 0 ? (
                                        <div className="space-y-2 divide-y divide-neutral-800 text-xs">
                                            {lineItems.map((item, idx) => {
                                                const listPrice = Number(item.total || 0) + Number(item.discount || 0);
                                                return (
                                                    <div key={idx} className="flex justify-between gap-4 pt-2">
                                                        <span className="text-neutral-300 font-medium">{item.description || item.label}</span>
                                                        <span className="font-mono font-bold text-white">{money(listPrice)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-neutral-400 italic py-2">
                                            Select a booking duration and equipment above to compute itemized line items.
                                        </p>
                                    )}

                                    <div className="pt-4 border-t border-neutral-800 space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-emerald-400 uppercase tracking-wider text-[10px] font-bold">Discounts</span>
                                            <span className="font-mono font-bold text-emerald-400">-{money(discountTotal)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-neutral-400 uppercase tracking-wider text-[10px] font-bold">Subtotal (ex GST)</span>
                                            <span className="font-mono font-bold">{money(quote.subtotalExcludingTax)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-neutral-400 uppercase tracking-wider text-[10px] font-bold">GST (10%)</span>
                                            <span className="font-mono font-bold">{money(quote.taxIncluded)}</span>
                                        </div>
                                        <div className="flex justify-between items-end pt-3 border-t border-neutral-800">
                                            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Total due</span>
                                            <span className="text-2xl font-black font-mono text-white">{money(quote.totalDue || quote.total)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {access.signedIn ? (
                            <button type="submit" className="w-full bg-black text-white font-extrabold py-5 text-sm uppercase tracking-widest rounded-sm hover:bg-neutral-800 transition-all duration-200 shadow-md cursor-pointer">
                                Submit Booking Hold Request
                            </button>
                        ) : (
                            <button type="button" onClick={() => { setOpenFormAfterSignIn(false); setSignInOpen(true); }} className="block w-full bg-black text-white font-extrabold py-5 text-sm uppercase tracking-widest rounded-sm text-center">Sign in to see the quote and submit</button>
                        )}
                    </div>
                )}
            </form>
            {signInOpen && (
                <div
                    className="fixed inset-0 z-[80] bg-black/50 flex items-start justify-center overflow-y-auto px-4 py-10"
                    onClick={() => setSignInOpen(false)}
                >
                    <div
                        className="w-full max-w-lg"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="signin-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <SignInPanel onSuccess={finishSignIn} onClose={() => setSignInOpen(false)} />
                    </div>
                </div>
            )}
        </div>
    );
}