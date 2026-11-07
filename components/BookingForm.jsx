"use client";

// components/BookingForm.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import EventFAQs from '@/components/EventFAQs'; // <--- Import FAQ component
import SignInPanel from '@/components/SignInPanel';
import { db } from '../app/lib/firebase'; // <--- Use relative path to app/lib/firebase
import { collection, getDocs } from 'firebase/firestore';
import { calculateQuote, ROOM_INCLUSIONS } from '../app/lib/pricing'; // <--- Use relative path to app/lib/pricing
import { OUTSIDE_WORK_HOURS_LABEL, WORK_HOURS_LABEL } from '../app/lib/workingHours';
import { blankExtraReminder, buildDefaultReminders, mergeReminderDrafts, normalizeEmailReminders } from '../app/lib/eventReminders';
import { CASUAL_STAFF_LIST, MAX_CASUAL_QUANTITY, casualQuantityFromInput, casualShiftQuantity, emptyCasualShift } from '../app/lib/casualStaff';
import { useAccess } from './useAccess';
import {
    MAX_SERIES_OCCURRENCES,
    bookingWindowForDate,
    buildSeriesDates,
    formatBookingDate,
    isFoundersBooker,
    isUnswStaff,
    localDateString,
    lockoutMessage,
    lockoutSummary,
    partitionSeriesDates
} from '../app/lib/bookingRules';

const generate24HoursTimeSlots = () => {
    const slots = [];
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        slots.push(`${hour}:00`, `${hour}:30`);
    }
    return slots;
};

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

const addMinutesToTime = (time, minutes) => {
    const [hours, mins] = time.split(':').map(Number);
    const total = (hours * 60) + mins + minutes;
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

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
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [wantsMultipleHolds, setWantsMultipleHolds] = useState(false);
    const [extraHolds, setExtraHolds] = useState([]);
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
    const [activeAccordion, setActiveAccordion] = useState(null);
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

    const [runsheetRows, setRunsheetRows] = useState([
        { time: '', layout: 'Workshop Style/Group Tables', description: 'Organiser access & setup' }
    ]);

    const [liveBusySlots, setLiveBusySlots] = useState({});
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
        involvesControversialTopics: false,
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
        isWeekend: false,
        servicewarePreference: '',
        foundersSupplies: {
            needWoolworthsOrder: false,
            needDanMurphysOrder: false,
            needPlates: false,
            needNapkins: false,
            needTongs: false,
            needCutlery: false,
            needIce: false
        },

        // FOUNDERS INTERNAL COORDINATION QUESTIONS
        tamaraPresence: 'Not at all',
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
<strong>Other Equipment & AV (items are shared between all bookable rooms, availability is dependent on requirements of other bookings):</strong><br /><br />
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
<strong>Other Equipment & AV (items are shared between all bookable rooms, availability is dependent on requirements of other bookings):</strong><br /><br />
<strong>Bathrooms:</strong><br />
This room does not have private bathrooms. The closest toilets are in the main Ground Floor foyer and are shared publicly with students, staff, and the rest of the building.
<br /><br />
<strong>Emergency & Safety:</strong><br />
• <strong>First Aid Kit:</strong> Hanging on the wall in the AV Cabinet in the Design Space.<br />
`
        }
    };

    const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
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
                    setCalendarNotice('');
                } else {
                    setLiveBusySlots({});
                    setCalendarNotice('Live availability could not be loaded, so booked times may not appear.');
                }
            })
            .catch(() => {
                if (cancelled) return;
                setLiveBusySlots({});
                setCalendarNotice('Live availability could not be loaded, so booked times may not appear.');
            });

        return () => {
            cancelled = true;
        };
    }, [selectedCalendarDate, formData.userType]);
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        const dayOffset = today.getDay() === 0 ? 6 : today.getDay() - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - dayOffset);
        return monday;
    });

    const effectiveDepartment = departmentType === 'UNSW Founders' ? 'UNSW Founders' : formData.department;
    const foundersBooking = isFoundersBooker(formData.userType, effectiveDepartment);
    const lockoutApplies = !isUnswStaff(formData.userType);
    const selectedDateStr = localDateString(selectedCalendarDate);
    const selectedLock = lockoutApplies ? bookingWindowForDate(selectedDateStr) : { locked: false };
    const timeRangeLabel = formData.bumpIn && formData.bumpOut ? `${formData.bumpIn}–${formData.bumpOut}` : '';

    const seriesPlan = useMemo(() => {
        if (!foundersBooking || recurrence.pattern !== 'weekly' || selectedSlots.length === 0) return null;
        const dates = buildSeriesDates(selectedDateStr, recurrence);
        const end = recurrence.endType === 'on'
            ? { type: 'on', date: recurrence.endDate }
            : { type: 'after', occurrences: Math.min(MAX_SERIES_OCCURRENCES, Math.max(1, Number(recurrence.occurrences) || 1)) };
        const base = {
            pattern: 'weekly',
            interval: Math.min(MAX_SERIES_OCCURRENCES, Math.max(1, Number(recurrence.interval) || 1)),
            end,
            dates
        };
        if (recurrence.endType === 'on' && recurrence.endDate && recurrence.endDate < selectedDateStr) {
            return { ...base, dates: [], bookedDates: [], skippedDates: [], known: true, invalidEnd: true };
        }
        if (seriesAvailability.status !== 'ready' || !seriesAvailability.byDate) {
            return { ...base, bookedDates: [], skippedDates: [], known: false };
        }
        const split = partitionSeriesDates(
            dates,
            seriesAvailability.byDate,
            formData.space,
            selectedSlots.map(key => key.split('|').pop()),
            timeRangeLabel
        );
        return { ...base, ...split, known: true };
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
        if (!foundersBooking || recurrence.pattern !== 'weekly' || selectedSlots.length === 0) {
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
                setSeriesAvailability({ status: 'ready', byDate: data.byDate });
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
        setSelectedSlots([]);
        selectionAnchorRef.current = null;
        setSlotWarning('');
        setLockoutNotice(lockoutMessage(info));
    }, [lockoutApplies, selectedDateStr]);

    const mockCalendarData = {
        timeSlots: generate24HoursTimeSlots(),
        rooms: CALENDAR_ROOMS
    };

    const toggleAccordion = (id) => {
        setActiveAccordion(prev => prev === id ? null : id);
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
        photoStripRef.current?.scrollTo({ left: 0 });
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

        if (!conductAcknowledged) {
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

        if (formData.involvesControversialTopics && !formData.securityDetails.trim()) {
            alert('Please provide details for UNSW Security Services notification.');
            const section = document.getElementById('security-notification-block');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (!formData.signature) {
            alert('Please sign the declaration before submitting.');
            const section = document.getElementById('signature-block');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (!formData.mainContact.email.trim()) {
            alert('Enter the organiser email before submitting.');
            return;
        }

        if (isCalendarOption(formData.bookingIntent) && selectedSlots.length === 0) {
            alert('Select a continuous block of time slots before submitting.');
            return;
        }

        const targetIsoDateString = localDateString(selectedCalendarDate);
        if (lockoutApplies && bookingWindowForDate(targetIsoDateString).locked) {
            alert(lockoutMessage(bookingWindowForDate(targetIsoDateString)));
            return;
        }

        const primaryHold = {
            space: formData.space,
            bumpInDate: targetIsoDateString,
            bumpIn: formData.bumpIn || '09:00',
            eventStart: formData.eventStart || formData.bumpIn || '09:30',
            eventEnd: formData.eventEnd || formData.bumpOut || '16:30',
            bumpOut: formData.bumpOut || '17:00'
        };
        if (wantsMultipleHolds) {
            if (extraHolds.length < 1) {
                alert('Add at least one extra hold, or turn off multiple booking holds.');
                return;
            }
            for (const hold of extraHolds) {
                if (!hold.bumpInDate || !hold.bumpIn || !hold.eventStart || !hold.eventEnd || !hold.bumpOut || !hold.space) {
                    alert('Each extra hold needs a space, date, and all four times.');
                    return;
                }
                if (!(hold.bumpIn <= hold.eventStart && hold.eventStart <= hold.eventEnd && hold.eventEnd <= hold.bumpOut)) {
                    alert('Each hold needs bump-in, start, end, and bump-out in that order.');
                    return;
                }
                if (lockoutApplies && bookingWindowForDate(hold.bumpInDate).locked) {
                    alert(lockoutMessage(bookingWindowForDate(hold.bumpInDate)));
                    return;
                }
            }
        }

        if (seriesPlan?.invalidEnd) {
            alert('Choose an end date on or after the start date.');
            return;
        }

        if (seriesPlan?.pattern === 'weekly' && !seriesPlan.known) {
            alert('Live availability could not be loaded, so booked times may not appear. Future dates are not shown as available, and this repeating booking cannot be confirmed.');
            return;
        }

        if (seriesPlan?.pattern === 'weekly' && seriesPlan.bookedDates.length === 0) {
            alert('Every date in this series is already booked. Change the repeat pattern or the end date.');
            return;
        }

        setCateringError(false);
        setConductError(false);

        const recurrencePayload = seriesPlan?.pattern === 'weekly'
            ? {
                pattern: 'weekly',
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
            needsJudgeHelp: formData.needsJudgeHelp,
            tamaraPresence: formData.tamaraPresence,
            needsFoundersCasualStaff: formData.needsFoundersCasualStaff,
            casualStaffDetails: (formData.casualStaffDetails || []).map(row => ({
                ...row,
                quantity: casualShiftQuantity(row) || 1,
                preferredStaff: foundersBooking ? row.preferredStaff : ''
            })),
            servicewarePreference: formData.servicewarePreference,
            foundersSupplies: formData.foundersSupplies,
            catering: formData.catering || "No",
            alcohol: formData.alcohol || "No",
            isHighRisk: formData.isHighRisk,
            riskDetails: formData.isHighRisk ? formData.riskDetails : '',
            involvesControversialTopics: formData.involvesControversialTopics,
            securityDetails: formData.involvesControversialTopics ? formData.securityDetails : '',
            postToPublicDirectory: ticketingEnabled ? formData.postToPublicDirectory : false,
            ticketing: ticketingEnabled ? {
                method: formData.ticketingMethod,
                externalTicketUrl: formData.ticketingMethod === 'external' ? formData.externalTicketUrl : '',
                ticketBannerName: formData.ticketBannerName,
                maxTicketCapacity: formData.maxTicketCapacity,
                ticketTiers: formData.ticketingMethod === 'internal' ? formData.ticketTiers : []
            } : { method: 'none', externalTicketUrl: '', ticketBannerName: '', maxTicketCapacity: 0, ticketTiers: [] },
            emailReminders: ticketingEnabled && formData.ticketingMethod === 'internal'
                ? normalizeEmailReminders({
                    enabled: formData.emailRemindersEnabled,
                    reminders: emailReminders.map(reminder => ({
                        id: reminder.id,
                        kind: reminder.kind,
                        subject: reminder.subject,
                        body: reminder.body,
                        sendAt: reminder.sendAt,
                        manuallyEdited: Boolean(
                            reminder.manuallyEdited
                            || reminderLocksRef.current[reminder.id]?.subject
                            || reminderLocksRef.current[reminder.id]?.body
                            || reminderLocksRef.current[reminder.id]?.sendAt
                        )
                    }))
                })
                : { enabled: false, reminders: [] },
            conductAcknowledged,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            bumpInDate: targetIsoDateString,
            tentativeHolds: wantsMultipleHolds ? [primaryHold, ...extraHolds].slice(0, 3) : [],
            recurrence: recurrencePayload,
            isWeekend: formData.isWeekend,
            selectedSlots,
            bumpIn: formData.bumpIn || "09:00",
            bumpOut: formData.bumpOut || "17:00",
            eventStart: formData.eventStart || formData.bumpIn || "09:30",
            eventEnd: formData.eventEnd || formData.bumpOut || "16:30",
            runsheetObjectives: formData.runsheetObjectives,
            mainContact: {
                name: formData.mainContact.name || "Guest Applicant",
                email: formData.mainContact.email,
                phone: formData.mainContact.phone || ""
            },
            onDayContact: formData.sameAsMain
                ? {
                    name: formData.mainContact.name || "Guest Applicant",
                    email: formData.mainContact.email,
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
                const calendarNote = res.calendarError ? ` Calendar hold could not be created: ${res.calendarError}` : '';
                alert(`Booking request saved as pending. Sign in at My bookings with ${formData.mainContact.email} to request a change or cancellation.${calendarNote}`);
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
        setShowFullForm(true);
        setTimeout(() => {
            const targetBlock = document.getElementById('rest-of-form-marker');
            if (targetBlock) targetBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    };

    const triggerRevealAllQuestions = () => {
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
        if (!access.signedIn || typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('form') !== '1') return;
        setShowFullForm(true);
        const timer = setTimeout(() => {
            document.getElementById('rest-of-form-marker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        return () => clearTimeout(timer);
    }, [access.signedIn]);

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
        setSelectedSlots([]);
        selectionAnchorRef.current = null;
        setSlotWarning('');
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
        const dayKey = formatDayKey(selectedCalendarDate);
        const allSlots = generate24HoursTimeSlots();
        const prefix = `${room.name}|${dayKey}|`;
        const clickedKey = `${prefix}${slot}`;
        const sameRoom = selectedSlots.filter(key => key.startsWith(prefix));
        const existingTimes = sameRoom.map(key => key.slice(prefix.length)).sort();
        const anchor = selectionAnchorRef.current;
        const anchorMatches = anchor && anchor.room === room.name && anchor.dayKey === dayKey;

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

        if (existingTimes.length === 0 || !selectedSlots.every(key => key.startsWith(prefix))) {
            selectionAnchorRef.current = { room: room.name, dayKey, slot };
            nextSlots = [slot];
        } else if (event.shiftKey && anchorMatches) {
            nextSlots = rangeBetween(anchor.slot, slot);
        } else if (existingTimes.length === 1 && existingTimes[0] === slot) {
            selectionAnchorRef.current = null;
            nextSlots = [];
        } else if (existingTimes.includes(slot)) {
            selectionAnchorRef.current = { room: room.name, dayKey, slot };
            nextSlots = [slot];
        } else {
            const from = slot < existingTimes[0] ? slot : existingTimes[0];
            const to = slot > existingTimes[existingTimes.length - 1] ? slot : existingTimes[existingTimes.length - 1];
            nextSlots = rangeBetween(from, to);
            if (!anchorMatches) selectionAnchorRef.current = { room: room.name, dayKey, slot: existingTimes[0] };
        }

        if (nextSlots === null) {
            setSlotWarning('That range crosses a booked time. Choose a continuous run of available slots.');
            return;
        }

        setSlotWarning('');
        setSelectedSlots(nextSlots.map(time => `${prefix}${time}`));

        if (nextSlots.length > 0) {
            const ordered = [...nextSlots].sort();
            const bumpIn = ordered[0];
            const bumpOut = addMinutesToTime(ordered[ordered.length - 1], 30);
            setFormData(prev => ({
                ...prev,
                space: room.space,
                bumpIn,
                bumpOut,
                eventStart: bumpIn,
                eventEnd: bumpOut
            }));
            setShowroomSpace(room.space);
        }
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

                <label className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-sm cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={wantsMultipleHolds}
                        onChange={(event) => {
                            const on = event.target.checked;
                            setWantsMultipleHolds(on);
                            if (on) {
                                setRecurrence(prev => ({ ...prev, pattern: 'none' }));
                                setExtraHolds(current => current.length ? current : [{
                                    space: formData.space,
                                    bumpInDate: '',
                                    bumpIn: formData.bumpIn || '09:00',
                                    eventStart: formData.eventStart || '09:30',
                                    eventEnd: formData.eventEnd || '16:30',
                                    bumpOut: formData.bumpOut || '17:00'
                                }]);
                            }
                        }}
                        className="w-4 h-4 accent-black mt-0.5"
                    />
                    <span>
                        <span className="text-xs font-bold uppercase tracking-wide text-neutral-900 block">I would like to put in multiple booking holds</span>
                        <span className="text-[11px] text-neutral-600 block mt-0.5">The date and times above are hold 1. You can add up to two more tentative holds for the same event. All of them are sent for approval or rejection.</span>
                    </span>
                </label>

                {wantsMultipleHolds && (
                    <div className="space-y-4">
                        {extraHolds.map((hold, index) => (
                            <div key={index} className="p-4 bg-white border border-gray-200 rounded-sm space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-black uppercase tracking-wider">Hold {index + 2}</p>
                                    <button
                                        type="button"
                                        onClick={() => setExtraHolds(current => current.filter((_, itemIndex) => itemIndex !== index))}
                                        className="text-[10px] font-bold uppercase tracking-wider text-neutral-500"
                                    >
                                        Remove
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Space</span>
                                        <select
                                            value={hold.space}
                                            onChange={(event) => setExtraHolds(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, space: event.target.value } : item))}
                                            className="w-full p-2 border border-gray-200 text-xs font-semibold rounded-sm bg-white"
                                        >
                                            {Object.keys(venueShowroom).map(spaceName => (
                                                <option key={spaceName} value={spaceName}>{spaceName}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Date</span>
                                        <input
                                            type="date"
                                            value={hold.bumpInDate}
                                            onChange={(event) => setExtraHolds(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, bumpInDate: event.target.value } : item))}
                                            className="w-full p-2 border border-gray-200 text-xs font-semibold rounded-sm bg-white"
                                        />
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        ['bumpIn', 'Bump-in'],
                                        ['eventStart', 'Event starts'],
                                        ['eventEnd', 'Event ends'],
                                        ['bumpOut', 'Bump-out']
                                    ].map(([field, label]) => (
                                        <label key={field} className="space-y-1">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">{label}</span>
                                            <input
                                                type="time"
                                                value={hold[field]}
                                                onChange={(event) => setExtraHolds(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: event.target.value } : item))}
                                                className="w-full p-2 border border-gray-200 text-xs font-semibold rounded-sm bg-white"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {extraHolds.length < 2 && (
                            <button
                                type="button"
                                onClick={() => setExtraHolds(current => [...current, {
                                    space: formData.space,
                                    bumpInDate: '',
                                    bumpIn: formData.bumpIn || '09:00',
                                    eventStart: formData.eventStart || '09:30',
                                    eventEnd: formData.eventEnd || '16:30',
                                    bumpOut: formData.bumpOut || '17:00'
                                }])}
                                className="text-xs font-bold uppercase tracking-wider border border-black px-3 py-2 rounded-sm"
                            >
                                Add another hold
                            </button>
                        )}
                    </div>
                )}
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

                <label className="flex items-start gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-sm cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={formData.involvesControversialTopics}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            involvesControversialTopics: e.target.checked,
                            securityDetails: e.target.checked ? prev.securityDetails : ''
                        }))}
                        className="w-4 h-4 accent-black mt-0.5 rounded-sm"
                    />
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-black block">
                            Controversial Topics & Security Notification
                        </span>
                        <span className="text-xs text-gray-600 mt-1 block leading-relaxed">
                            Does this event involve controversial topics, sensitive political discussions, or high-profile guest speakers that may require security presence or crowd management?
                        </span>
                    </div>
                </label>

                {formData.involvesControversialTopics && (
                    <div id="security-notification-block" className="p-4 bg-red-50/60 border border-red-200 rounded-sm space-y-2 animate-in fade-in">
                        <label className="text-xs font-bold uppercase tracking-wider text-red-900 block">
                            If yes, please provide details for UNSW Security Services notification. *
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
                                            <br />Note: You can only book one room at a time.
                                        </div>
                                        {selectedSlots.length > 0 && (
                                            <p className="text-xs font-bold text-neutral-800">
                                                {selectedSlots.length} adjacent {selectedSlots.length === 1 ? 'slot' : 'slots'} selected, {formData.bumpIn} to {formData.bumpOut}.
                                            </p>
                                        )}

                                        {foundersBooking && selectedSlots.length > 0 && (
                                            <div className="p-4 bg-white border border-neutral-200 rounded-sm space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Repeat</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {[
                                                            { id: 'none', label: 'Does not repeat' },
                                                            { id: 'weekly', label: 'Weekly' }
                                                        ].map(option => (
                                                            <button
                                                                key={option.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setRecurrence(prev => ({ ...prev, pattern: option.id }));
                                                                    if (option.id === 'weekly') setWantsMultipleHolds(false);
                                                                }}
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

                                                {recurrence.pattern === 'weekly' && (
                                                    <>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Every</label>
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        max={MAX_SERIES_OCCURRENCES}
                                                                        value={recurrence.interval}
                                                                        onChange={(e) => setRecurrence(prev => ({
                                                                            ...prev,
                                                                            interval: Math.min(MAX_SERIES_OCCURRENCES, Math.max(1, Number(e.target.value) || 1))
                                                                        }))}
                                                                        className="w-20 p-2 border border-gray-300 bg-white text-sm font-medium rounded-sm text-black outline-none"
                                                                    />
                                                                    <span className="text-xs font-medium text-neutral-700">{Number(recurrence.interval) === 1 ? 'week' : 'weeks'}</span>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Ends</label>
                                                                <div className="grid grid-cols-2 gap-2">
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
                                                                        className="w-full p-2 border border-gray-300 bg-white text-sm font-medium rounded-sm text-black outline-none"
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
                                                        </div>
                                                        <p className="text-[11px] font-medium text-neutral-500">
                                                            Same weekday and time. A series stops at 52 occurrences. Dates that are already booked are left out.
                                                        </p>
                                                        {seriesPlan?.invalidEnd && (
                                                            <p className="text-xs font-bold text-red-700">Choose an end date on or after the start date.</p>
                                                        )}
                                                        {!seriesPlan?.invalidEnd && (seriesAvailability.status === 'loading' || seriesAvailability.status === 'idle') && (
                                                            <p className="text-xs font-bold text-neutral-600">Checking each date against the room calendar…</p>
                                                        )}
                                                        {!seriesPlan?.invalidEnd && seriesAvailability.status === 'error' && (
                                                            <div className="space-y-1">                                                                <ul className="space-y-1">
                                                                    {(seriesPlan?.dates || []).map(date => (
                                                                        <li key={date} className="text-xs text-neutral-600">
                                                                            {formatBookingDate(date, true)} — availability could not be checked
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {seriesPlan?.known && !seriesPlan.invalidEnd && seriesPlan.skippedDates.length > 0 && (
                                                            <div className="space-y-1">
                                                                <p className="text-xs font-bold text-rose-800">These dates are already booked and will be left out</p>
                                                                <ul className="space-y-1">
                                                                    {seriesPlan.skippedDates.map(item => (
                                                                        <li key={item.date} className="text-xs text-rose-900">
                                                                            {formatBookingDate(item.date, true)} — {item.reason}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
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
                                                            <p className="text-[11px] font-bold text-neutral-500">Capped at 52 occurrences.</p>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {selectedLock.locked ? (
                                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-sm">
                                                <p className="text-xs font-bold text-rose-900">{lockoutMessage(selectedLock)} This date cannot be selected.</p>
                                            </div>
                                        ) : (
                                        <div className="border border-gray-200 rounded-sm bg-white shadow-sm overflow-hidden">
                                            <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
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
                                                                    const dayKeyString = formatDayKey(selectedCalendarDate);
                                                                    const isBlocked = isSlotBlockedByCalendar(room.space, slot);
                                                                    const compositeSlotKey = `${room.name}|${dayKeyString}|${slot}`;
                                                                    const isCurrentlySelected = selectedSlots.includes(compositeSlotKey);

                                                                    return (
                                                                        <td key={room.name} className="p-1 text-center border-l border-gray-100">
                                                                            {!isBlocked ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(clickEvent) => handleSlotClick(clickEvent, room, slot)}
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
                                        )}

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
                                </div>
                            </div>
                </section>

                {showFullForm && (
                    <div id="rest-of-form-marker" className="space-y-12 animate-in fade-in duration-300">
                        {renderAffiliationSection()}
                        {renderEventDetailsSection()}
                        {renderTimesAndRunsheetSection()}
                        {renderAvAndEquipmentSection()}
                        {renderCateringSection()}
                        {renderRiskAssessmentSection()}
                        {renderContactDetailsSection()}

                        {/* SECTION: TICKETING SETUP */}
                        {ticketingEnabled && <section className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
                            <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                                Ticketing & Public Directory
                            </h3>
                            <div className="space-y-4">
                                <label className="flex items-start gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-sm cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={formData.postToPublicDirectory}
                                        onChange={(e) => setFormData(prev => ({ ...prev, postToPublicDirectory: e.target.checked }))}
                                        className="w-4 h-4 accent-black mt-0.5 rounded-sm"
                                    />
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-black block">
                                            Post this event to the public directory
                                        </span>
                                        <span className="text-[11px] text-gray-600 font-medium mt-1 block leading-relaxed">
                                            Tick this if you want the event listed on the MCIC public ticket directory.
                                        </span>
                                    </div>
                                </label>

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

                                        <div className="space-y-3 pt-2 border-t border-gray-200">
                                            <div className="flex items-center justify-between gap-3">
                                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Ticket Tiers</label>
                                                <button
                                                    type="button"
                                                    onClick={addTicketTier}
                                                    className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border border-gray-300 bg-white rounded-sm hover:bg-neutral-100"
                                                >
                                                    + Add Tier
                                                </button>
                                            </div>
                                            {formData.ticketTiers.map((tier, idx) => (
                                                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                                    <div className="sm:col-span-7 space-y-1">
                                                        <label className="text-[10px] font-bold uppercase text-gray-500">Tier Name</label>
                                                        <input
                                                            type="text"
                                                            value={tier.name}
                                                            onChange={(e) => updateTicketTier(idx, 'name', e.target.value)}
                                                            placeholder="e.g. UNSW Affiliated (Students & Staff)"
                                                            className="w-full p-2.5 border border-gray-200 bg-white text-xs font-medium rounded-sm text-black outline-none"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-4 space-y-1">
                                                        <label className="text-[10px] font-bold uppercase text-gray-500">Tier Capacity</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={tier.cap}
                                                            onChange={(e) => updateTicketTier(idx, 'cap', e.target.value)}
                                                            placeholder="e.g. 80"
                                                            className="w-full p-2.5 border border-gray-200 bg-white text-xs font-medium rounded-sm text-black outline-none"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-1 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTicketTier(idx)}
                                                            disabled={formData.ticketTiers.length === 1}
                                                            className={`p-2 text-xs font-bold rounded-sm ${formData.ticketTiers.length === 1 ? 'text-gray-300' : 'text-red-600 hover:bg-red-50'}`}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-gray-200">
                                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.emailRemindersEnabled}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, emailRemindersEnabled: e.target.checked }))}
                                                    className="w-4 h-4 accent-black mt-0.5 rounded-sm"
                                                />
                                                <span>
                                                    <span className="text-xs font-bold uppercase tracking-wider text-black block">
                                                        Send automatic email reminders
                                                    </span>
                                                    <span className="text-[11px] text-gray-600 font-medium mt-1 block leading-relaxed">
                                                        Registered guests receive these at the Australia/Sydney times below. The four standard reminders stay unless you turn reminders off. You can edit them and add more.
                                                    </span>
                                                </span>
                                            </label>

                                            {formData.emailRemindersEnabled && emailReminders.map(reminder => (
                                                <div key={reminder.id} className="bg-white border border-gray-200 rounded-sm p-4 space-y-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="text-xs font-bold uppercase tracking-wider text-black">
                                                            {reminder.label}
                                                            {reminder.kind === 'default' && (
                                                                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">Standard</span>
                                                            )}
                                                        </p>
                                                        {reminder.kind === 'extra' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeEmailReminder(reminder.id)}
                                                                className="text-[10px] font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 px-2 py-1 rounded-sm"
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold uppercase text-gray-500">Send date and time (Australia/Sydney)</label>
                                                        <input
                                                            type="datetime-local"
                                                            value={reminder.sendAt}
                                                            onChange={(e) => updateEmailReminder(reminder.id, 'sendAt', e.target.value, e.nativeEvent.isTrusted)}
                                                            className="w-full p-2.5 border border-gray-200 text-xs font-medium rounded-sm text-black outline-none"
                                                        />
                                                        {!reminder.sendAt && (
                                                            <p className="text-[10px] text-neutral-500">Add the event date and start time and this send time fills in. You can still set it yourself.</p>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold uppercase text-gray-500">Subject</label>
                                                        <input
                                                            type="text"
                                                            value={reminder.subject}
                                                            onChange={(e) => updateEmailReminder(reminder.id, 'subject', e.target.value, e.nativeEvent.isTrusted)}
                                                            className="w-full p-2.5 border border-gray-200 text-xs font-medium rounded-sm text-black outline-none"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold uppercase text-gray-500">Body</label>
                                                        <textarea
                                                            rows={8}
                                                            value={reminder.body}
                                                            onChange={(e) => updateEmailReminder(reminder.id, 'body', e.target.value, e.nativeEvent.isTrusted)}
                                                            className="w-full p-2.5 border border-gray-200 text-xs font-medium rounded-sm text-black outline-none leading-relaxed"
                                                        />
                                                    </div>
                                                </div>
                                            ))}

                                            {formData.emailRemindersEnabled && (
                                                <button
                                                    type="button"
                                                    onClick={addEmailReminder}
                                                    className="text-[10px] font-bold uppercase tracking-wider px-3 py-2 border border-gray-300 bg-white rounded-sm hover:bg-neutral-100"
                                                >
                                                    + Add another reminder
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>}

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
                                    <p className="text-[11px] text-neutral-500">
                                        Selecting Yes applies an automatic discount to your venue hire rate.
                                    </p>
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
                                    <p className="text-[11px] text-neutral-500">
                                        Casual staff members are available at $50 per hour. The minimum is 3 hours, or 4 hours on a weekend. They can assist with room setup, AV, and guest check-in.
                                    </p>
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
                                    {formData.wantsCasualStaff === 'Yes' && (
                                        <div className="space-y-4 pt-2">
                                            <label className="text-[11px] font-black uppercase tracking-wider text-neutral-700 block">
                                                Casual Staff Shift Details
                                            </label>
                                            {formData.casualStaffDetails.map((staffRow, idx) => (
                                                <div key={idx} className={`p-4 bg-white border border-gray-200 rounded-sm grid grid-cols-1 gap-3 items-end ${foundersBooking ? 'md:grid-cols-[minmax(0,1.15fr)_5.5rem_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,1.4fr)_2rem]' : 'md:grid-cols-[5.5rem_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.7fr)_2rem]'}`}>
                                                    {foundersBooking && (
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
                                                            value={staffRow.shiftStart}
                                                            onChange={(e) => updateCasualStaffDetail(idx, 'shiftStart', e.target.value)}
                                                            className="w-full p-2 border border-gray-200 rounded-sm text-xs font-medium text-black outline-none focus:border-neutral-400"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Shift End</label>
                                                        <input
                                                            type="time"
                                                            value={staffRow.shiftEnd}
                                                            onChange={(e) => updateCasualStaffDetail(idx, 'shiftEnd', e.target.value)}
                                                            className="w-full p-2 border border-gray-200 rounded-sm text-xs font-medium text-black outline-none focus:border-neutral-400"
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
                                                className="bg-black text-white font-bold text-[10px] tracking-wider px-3.5 py-2 rounded-sm"
                                            >
                                                + additional staffing request
                                            </button>
                                        </div>
                                    )}
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
                        {access.founders && (
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
                                        <label className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
                                            What serviceware, food and drinks do you need?
                                        </label>
                                        <div className="grid grid-cols-2 gap-3 max-w-sm">
                                            {[
                                                { label: 'Throwaway / Disposable', val: 'Throwaway' },
                                                { label: 'Re-usable', val: 'Re-usable' }
                                            ].map((pref) => (
                                                <button
                                                    key={pref.val}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, servicewarePreference: pref.val }))}
                                                    className={`p-2.5 text-xs font-bold uppercase rounded-sm border text-center transition-all ${formData.servicewarePreference === pref.val
                                                        ? 'bg-amber-900 text-white border-amber-900'
                                                        : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-100/50'
                                                        }`}
                                                >
                                                    {pref.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {[
                                                { key: 'needWoolworthsOrder', label: 'Woolworths Order (Food, Soft Drink)' },
                                                { key: 'needDanMurphysOrder', label: "Dan Murphy's Order (Wine, Beer, etc.)" },
                                                { key: 'needPlates', label: 'Plates' },
                                                { key: 'needNapkins', label: 'Napkins' },
                                                { key: 'needTongs', label: 'Tongs' },
                                                { key: 'needCutlery', label: 'Cutlery' },
                                                { key: 'needIce', label: 'Ice' }
                                            ].map((item) => (
                                                <label key={item.key} className="flex items-center gap-2.5 p-3 bg-white border border-amber-200 rounded-sm cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 accent-black rounded-sm"
                                                        checked={formData.foundersSupplies?.[item.key] || false}
                                                        onChange={(e) => setFormData(prev => ({
                                                            ...prev,
                                                            foundersSupplies: {
                                                                ...prev.foundersSupplies,
                                                                [item.key]: e.target.checked
                                                            }
                                                        }))}
                                                    />
                                                    <span className="text-xs font-bold text-amber-950">{item.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* SECTION: BILLING & PAYMENT INFORMATION */}
                            <section className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
                                <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                                    Billing & Payment Details
                                </h3>
                                <div className="space-y-4">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Payment Method</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {['Journal Transfer', 'Invoice', 'Credit Card'].map(method => (
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

                                    {formData.paymentMethod === 'Journal Transfer' && (
                                        <p className="text-sm text-neutral-700 bg-neutral-50 border border-gray-200 rounded-sm p-4">
                                            Not sure how to organise a Journal Transfer? The related Finance Analyst in your faculty or division can process the internal journal transfer.
                                        </p>
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
                                    <p className="text-[11px] text-gray-500">Draw your signature in the box above. You can also type it below.</p>
                                    <input
                                        type="text"
                                        placeholder="Or type your full name to sign"
                                        value={formData.signature.startsWith('data:image') ? '' : formData.signature}
                                        onChange={(e) => {
                                            wipeSignatureCanvas();
                                            setFormData(prev => ({ ...prev, signature: e.target.value }));
                                        }}
                                        className="w-full p-2.5 border border-gray-200 bg-white text-xs font-serif italic text-black outline-none"
                                    />
                                </div>

                                <div
                                    id="conduct-policy-block"
                                    className={`p-4 border rounded-sm space-y-3 transition-colors duration-200 ${conductError
                                        ? 'border-red-300 bg-red-50/60 text-red-900'
                                        : 'bg-neutral-50 border-gray-200'
                                        }`}
                                >
                                    <div className="text-xs font-bold uppercase tracking-wide text-black">
                                        Code of Conduct & Terms and Conditions
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        All hirers and guests at the Michael Crouch Innovation Centre must abide by the Terms and Conditions of Use and the Campus Policy and Code of Conduct.
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
                                        <span className={`text-xs font-bold uppercase tracking-tight ${conductError ? 'text-red-700' : 'text-black'}`}>
                                            I agree to abide by the Terms and Conditions of Use and the Campus Policy and Code of Conduct.
                                        </span>
                                    </label>
                                    {conductError && (
                                        <p className="text-[11px] font-bold text-red-700">Please acknowledge the code of conduct before submitting.</p>
                                    )}
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
                                            This space is managed by standard staff working {WORK_HOURS_LABEL} on weekdays. If your booking requires access {OUTSIDE_WORK_HOURS_LABEL.toLowerCase()}, hiring dedicated casual staff is mandatory ($50/hr, min 3 hours; min 4 hours on Sundays/Public Holidays).
                                        </div>
                                        <div>
                                            <strong className="text-neutral-900 block uppercase text-[10px] tracking-wide mb-1">Optional Staffing (Standard Hours)</strong>
                                            During core office hours ({WORK_HOURS_LABEL}), standard staffing covers room unlock, basic orientation, final checkout and is on call for ad-hoc technical requests. You should opt to pay for casual staff ($50/hr, minimum 3 hours) if:
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
                                            Select your affiliation, booking duration, and equipment above to compute itemized line items.
                                        </p>
                                    )}

                                    <div className="pt-4 border-t border-neutral-800 space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-neutral-400 uppercase tracking-wider text-[10px] font-bold">Subtotal (ex GST)</span>
                                            <span className="font-mono font-bold">{money(quote.subtotalExcludingTax)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-emerald-400 uppercase tracking-wider text-[10px] font-bold">Discounts</span>
                                            <span className="font-mono font-bold text-emerald-400">-{money(discountTotal)}</span>
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