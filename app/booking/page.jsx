"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { calculateQuote } from '../lib/pricing';

const generate24HoursTimeSlots = () => {
    const slots = [];
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        slots.push(`${hour}:00`, `${hour}:30`);
    }
    return slots;
};

// ==========================================
// MASTER EQUIPMENT SPECIFICATIONS
// ==========================================
const SHARED_EQUIPMENT_MASTER = [
    // AUDIO & DISPLAYS
    { key: 'handheldMics', label: 'Handheld Microphones', category: 'Shared AV', totalHubStock: 4 },
    { key: 'lapelMics', label: 'Lapel Microphones', category: 'Shared AV', totalHubStock: 4 },
    { key: 'portableStandingTv', label: 'Portable Standing TV Screen', category: 'Shared AV', totalHubStock: 2 },

    // FURNITURE
    { key: 'standingWhiteboards', label: 'Standing Whiteboards', category: 'Furniture', totalHubStock: 10 },
    { key: 'networkingHighTables', label: 'Networking High Tables', category: 'Furniture', totalHubStock: 8 },
    { key: 'cateringStandingTables', label: 'Catering Standing Tables', category: 'Furniture', totalHubStock: 3 },
    { key: 'couchesCoffeeTables', label: 'Couches + Coffee Tables Set', category: 'Furniture', totalHubStock: 1, isToggle: true },
    { key: 'loungesCoffeeTable', label: 'Lounges + Coffee Table Set', category: 'Furniture', totalHubStock: 1, isToggle: true },
    { key: 'registrationTable', label: 'Registration Table', category: 'Furniture', totalHubStock: 1, isToggle: true },
    { key: 'stage', label: 'Modular Stage Pieces', category: 'Furniture', totalHubStock: 1 },

    // TECH & RECORDING
    { key: 'ipad', label: 'iPads (Check-in / Slido Q&A)', category: 'Tech', totalHubStock: 6 },
    { key: 'spareLaptop', label: 'Spare Presentation Laptop', category: 'Tech', totalHubStock: 5 },
    { key: 'videoRecording', label: 'Video Recording Unit', category: 'Tech', totalHubStock: 1, isToggle: true },

    // CATERING WARE
    { key: 'glasses', label: 'Drinking Glasses', category: 'Catering Ware', totalHubStock: 60 },
    { key: 'plates', label: 'Plates', category: 'Catering Ware', totalHubStock: 40 },
    { key: 'mugs', label: 'Mugs', category: 'Catering Ware', totalHubStock: 30 },
    { key: 'urnHotWater', label: 'Hot Water Urn', category: 'Catering Ware', totalHubStock: 1, isToggle: true },
    { key: 'waterDispenser', label: 'Chilled Water Dispenser', category: 'Catering Ware', totalHubStock: 1, isToggle: true },
    { key: 'servingTongs', label: 'Serving Tongs & Platter Boards', category: 'Catering Ware', totalHubStock: 1, isToggle: true }
];

// FIXED INCLUSIONS PER VENUE (Included natively at $0)
const ROOM_INCLUSIONS = {
    'MCIC Ground - Entire Space': [
        '1x Lectern with Built-in Microphone',
        '4x Wireless Handheld Microphones',
        '4x Wireless Lapel Microphones',
        '2x Front Overhead Projector Screens',
        '2x Mid-Room TV Screens',
        'Full Modular Stage Setup',
        'Surround Sound Audio & Basic Stage Lighting',
        'Kitchen Access (ZipTaps & Microwaves)'
    ],
    'MCIC Ground - Event Space': [
        '1x Lectern with Built-in Microphone',
        '2x Wireless Handheld Microphones',
        '2x Wireless Lapel Microphones',
        '2x Front Overhead Projector Screens',
        'Full Modular Stage Setup',
        'Surround Sound Audio & Basic Stage Lighting',
        'Kitchen Access (ZipTaps & Microwaves)'
    ],
    'MCIC Ground - Design Space': [
        '2x Wireless Handheld Microphones',
        '2x Wireless Lapel Microphones',
        '1x Front Overhead Projector Screen',
        'Surround Sound Audio System'
    ],
    'MCIC Level 1 - Founders Place': [
        '1x Wireless Handheld Microphone',
        '1x Front Overhead Projector Screen',
        'Surround Sound Audio System',
        'Shared Kitchenette Access'
    ],
    'MCIC Level 1 - Group Study': [
        'Open Co-working Setup',
        'Shared Kitchenette Access'
    ],

    'MCIC Ground - Colonnade': [
        'Covered Outdoor Walkway outside MCIC Event & Design Spaces',
    ],

    'MCIC Ground - AI Makerspace': [
        'Our AI Makerspace is a space to test and refine AI technologies. It includes workstations and a supercomputer for AI research and development.',
    ]

};

// MOCK EXTERNAL BOOKINGS FOR THE SELECTED TIME SLOT
// (This will query Supabase for bookings overlapping the chosen event time)
const MOCK_TIME_SLOT_RESERVATIONS = {
    handheldMics: 1,
    standingWhiteboards: 4,
    ipad: 2,
    glasses: 20
};

export default function EventBookingForm() {
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
    const [calendarValidationError, setCalendarValidationError] = useState(false);
    const [layoutMode, setLayoutMode] = useState('workshop'); // 'tour' | 'delegation' | 'workshop' | 'lecture'
    // Add this near the top of EventBookingForm (below state variables)
    const isSlotBlockedByCalendar = (roomName, timeSlot) => {
        const roomBusyRanges = liveBusySlots[roomName] || [];
        return roomBusyRanges.some(range => {
            return timeSlot >= range.start && timeSlot < range.end;
        });
    };
    // ACCORDION REFERENCE STATES
    const [activeAccordion, setActiveAccordion] = useState(null);
    const [copiedWifi, setCopiedWifi] = useState(false);

    const [runsheetRows, setRunsheetRows] = useState([
        { time: '', layout: 'Workshop Style', description: 'e.g. Access Venue & bump-in/setup' }
    ]);

    const [liveBusySlots, setLiveBusySlots] = useState({});
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

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
        useRegistrationPortal: false,
        hasOwnRegistrationPortal: false,
        sameAsMain: false,
        mainContact: { name: '', email: '', phone: '' },
        onDayContact: { name: '', email: '', phone: '' },
        space: 'MCIC Ground - Event Space',
        bumpIn: '',
        eventStart: '',
        eventEnd: '',
        bumpOut: '',

        // NEW GENERAL HIRER QUESTIONS
        isInnovationOrEntrepreneurship: null, // "Yes" | "No"
        wantsCasualStaff: null,              // "Yes" | "No"
        needsJudgeHelp: null,                 // "Yes" | "No"

        // NEW FOUNDERS STAFF INTERNAL QUESTIONS
        tamaraPresence: 'Not at all', // 'Whole event' | 'Setup' | 'Formalities' | 'Not at all'
        needsFoundersCasualStaff: 'No', // 'Yes' | 'No'
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
        alcohol: null
    });

    const CASUAL_STAFF_LIST = [
        "Ivara", "Henry", "Wonyoung", "Hanisha", "Hudson", "Harry", "Luka",
        "Julian", "Reuben", "William", "Sarah", "Julie", "Aryan", "Shetal",
        "Thomas", "Alex", "Sam", "Victoria", "Rita", "Chiragm", "Lucas", "Armin", "Nicole"
    ];
    const [quote, setQuote] = useState({ base: 0, staff: 0, total: 0 });
    const [hasSubmitted, setHasSubmitted] = useState(false);

    useEffect(() => {
        const serializedString = runsheetRows
            .map((row, index) => `Row ${index + 1} -> Time: ${row.time || 'N/A'} | Layout: ${row.layout} | Description: ${row.description}`)
            .join('\n');
        setFormData(prev => ({ ...prev, runsheetObjectives: serializedString }));
    }, [runsheetRows]);

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
                '/images/venues/full-space-15.JPG'
            ],
            description: `The Full Ground Floor Event Space. The concertina doors will be opened to combine the Event Space and Design Space to make the Entire Space.
<br /><br />
<strong>Capacity:</strong><br />
• <strong>Lecture Style:</strong> 120 people maximum (There is more space but this is as many chairs as we have)
<br />
• <strong>Workshop Style:</strong> 100 people maximum<br /><br />
<strong>Included Equipment & AV:</strong><br />
• <strong>Microphones & Audio:</strong> 1 lectern with a built-in microphone, 4 wireless handheld microphones, 4 lapel microphones, and a surround sound system.<br />
• <strong>Screens & Displays:</strong> 2 projector screens at the front of the room, 2 TV screens in the middle<br />
• <strong>Stage:</strong> A modular stage made of multiple pieces that can be arranged as a single stage, split into smaller stages, or used as stepped seating.<br />
• <strong>Catering Setup:</strong> Kitchen (has 2 ZipTaps and 2 Microwaves. Fridge is not to be used).<br />
• <strong>Lighting:</strong> Basic stage lighting.
<br /><br />
<strong>Other Equipment & AV (items are shared between all bookable rooms, availability is dependent on requirements of other bookings):</strong><br />
• <strong>Screens & Displays:</strong> 2 Portable TV’s on wheels.<br />
• <strong>Furniture:</strong> 1 lectern, 1 registration table, 8 high networking tables, a casual lounge area with couches and coffee tables, 10 mobile double-sided whiteboards.<br />
• <strong>Catering Setup:</strong> 3 standing catering tables, 1 hot water urn, 1 chilled water dispenser, serving tongs, platter boards and 3 Ice/Drinks Buckets.<br />
• <strong>Tech:</strong> 6 iPads (for guest check-in or Slido Q&A) and 2 spare laptops (1 Mac, 1 PC), 1 Handheld Microphone Connected only to Portable Speaker.<br />
• <strong>Recording:</strong> Fixed-camera video recording direct to SD Card or live to YouTube (you must have your own YouTube account).<br /><br />
<strong>Bathrooms:</strong><br />
This room does not have private bathrooms. The closest toilets are down the hallway in the main foyer and are shared publicly with students, staff, and the rest of the building.
<br /><br />
<strong>Emergency & Safety:</strong><br />
• <strong>First Aid Kit:</strong> Hanging on the wall in the AV Cabinet.<br />
• <strong>Defibrillator:</strong> Located in the Foyer on the Ground Floor of the building.<br />
• <strong>Evacuation Routes:</strong> In the event of an emergency, exit through the glass doors and assemble on Alumni Lawn directly beside the room.<br />
• <strong>Fire Extinguishers:</strong> Located in XX. Please report any incidents or safety hazards immediately to the Venue Staff Member.`
        },
        'MCIC Ground - Event Space': {
            roomNumber: 'Room G26',
            imgs: [
                '/images/venues/event-space-1.JPG',
                '/images/venues/event-space-2.JPG',
                '/images/venues/event-space-3.JPG',
                '/images/venues/event-space-4.JPG'
            ],
            description: `The front half of the Entire Space. The concertina doors will divide the Entire Space into two rooms (Event Space and Design Space). Booking the Event Space only gives you access to the front room / half the Entire Space.<br /><br />
If you wish to book the ‘Entire Space’, you must select that option or book both the Event and Design Spaces simultaneously.
<br /><br />    <strong>Capacity:</strong><br />
• <strong>Lecture Style:</strong> 70 people maximum<br />
• <strong>Workshop Style:</strong> 35 people maximum<br /><br />
<strong>Included Equipment & AV:</strong><br />
• <strong>Microphones & Audio:</strong> 1 lectern with a built-in microphone, 2 wireless handheld microphones, 2 lapel microphones, with a surround sound system.<br />
• <strong>Screens & Displays:</strong> 2 projector screens at the front of the room.<br />
• <strong>Stage:</strong> a modular stage made of multiple pieces that can be arranged as a single stage, split into smaller stages, or used as stepped seating.<br />
• <strong>Catering Setup:</strong> Kitchen (has 2 ZipTaps and 2 Microwaves. Fridge is not to be used).<br />
• <strong>Lighting:</strong> Basic stage lighting.
<br /><br />
<strong>Other Equipment & AV (items are shared between all bookable rooms, availability is dependent on requirements of other bookings):</strong><br />
• <strong>Screens & Displays:</strong> 2 Portable TV’s on wheels.<br />
• <strong>Furniture:</strong> 1 lectern, 1 registration table, 8 high networking tables, a casual lounge area with couches and coffee tables, 10 mobile double-sided whiteboards.<br />
• <strong>Catering Setup:</strong> 3 standing catering tables, 1 hot water urn, 1 chilled water dispenser, serving tongs, platter boards, 60 glasses, 40 plates, 30 mugs and 3 Ice/Drinks Buckets.<br />
• <strong>Tech:</strong> 6 iPads (for guest check-in or Slido Q&A) and 2 spare laptops (1 Mac, 1 PC), 1 Handheld Microphone connected only to Portable Speaker.<br />
• <strong>Recording:</strong> Fixed-camera video recording direct to SD Card or live to YouTube (you must have your own YouTube account).<br /><br />
<strong>Bathrooms:</strong><br />
This room does not have private bathrooms. The closest toilets are down the hallway in the main foyer and are shared publicly with students, staff, and the rest of the building.
<br /><br />
<strong>Emergency & Safety:</strong><br />
• <strong>First Aid Kit:</strong> Hanging on the wall in the AV Cabinet in the nextdoor room (Design Space).<br />
• <strong>Defibrillator:</strong> Located in the Foyer on the Ground Floor of the building.<br />
• <strong>Evacuation Routes:</strong> In the event of an emergency, exit through the glass doors and assemble on Alumni Lawn directly beside the room.<br />
• <strong>Fire Extinguishers:</strong> Located in XX. Please report any incidents or safety hazards immediately to the Venue Staff Member.`
        },
        'MCIC Ground - Design Space': {
            roomNumber: 'Room G22',
            imgs: [
                '/images/venues/event-space-1.JPG',
                '/images/venues/event-space-2.JPG',
                '/images/venues/event-space-3.JPG',
                '/images/venues/event-space-4.JPG'
            ],
            description: `The back half of the Entire Space. The concertina doors will divide the Entire Space into two rooms (Event Space and Design Space). Booking the Design Space only gives you access to the back room / half the Entire Space.<br /><br />
If you wish to book the ‘Entire Space’, you must select that option or book both the Event and Design Spaces simultaneously.<br /><br />
<strong>Capacity:</strong><br />
• <strong>Lecture Style:</strong> 50 people maximum<br />
• <strong>Workshop Style:</strong> 35 people maximum<br /><br />
<strong>Included Equipment & AV:</strong><br />
• <strong>Microphones & Audio:</strong> 2 wireless handheld microphones, 2 lapel microphones, and a surround sound system.<br />
• <strong>Screens & Displays:</strong> 1 projector screen at the front of the room.<br /><br />
<strong>Other Equipment & AV (items are shared between all bookable rooms, availability is dependent on requirements of other bookings):</strong><br />
• <strong>Screens & Displays:</strong> 2 Portable TV’s on wheels.<br />
• <strong>Furniture:</strong> 1 registration table, 8 high networking tables, a casual lounge area with couches and coffee tables, 10 mobile double-sided whiteboards.<br />
• <strong>Catering Setup:</strong> 3 standing catering tables, 1 hot water urn, 1 chilled water dispenser, serving tongs, platter boards, 60 glasses, 40 plates, 30 mugs and 3 Ice/Drinks Buckets.<br />
• <strong>Stage:</strong> Pieces of the modular stage can be used to create a small stage or used as stepped seating.<br />
• <strong>Tech:</strong> 6 iPads (for guest check-in or Slido Q&A) and 2 spare laptops (1 Mac, 1 PC), 1 Handheld Microphone connected only to Portable Speaker.<br />
• <strong>Recording:</strong> Fixed-camera video recording direct to SD Card or live to YouTube (you must have your own YouTube account).<br /><br />
<strong>Bathrooms:</strong><br />
This room does not have private bathrooms. The closest toilets are down the hallway in the main foyer and are shared publicly with students, staff, and the rest of the building.
<br /><br />
<strong>Emergency & Safety:</strong><br />
• <strong>First Aid Kit:</strong> Hanging on the wall in the AV Cabinet.<br />
• <strong>Defibrillator:</strong> Located in the Foyer on the Ground Floor of the building.<br />
• <strong>Evacuation Routes:</strong> In the event of an emergency, exit through the glass doors and assemble on Alumni Lawn directly beside the room.<br />
• <strong>Fire Extinguishers:</strong> Located in the XX. Please report any incidents or safety hazards immediately to the Venue Staff Member.`
        },
        'MCIC Level 1 - Founders Place': {
            roomNumber: 'Room 124',
            imgs: [
                '/images/venues/founders-place-1.JPG',
                '/images/venues/founders-place-2.JPG',
                '/images/venues/founders-place-3.JPG',
                '/images/venues/founders-place-4.JPG'
            ],
            description: `An open room on Level 1. The space is most suited to workshop style events but also able to accommodate lecture/theatre style events.<br /><br />
<strong>Capacity:</strong><br />
• <strong>Lecture Style:</strong> 70 people maximum<br />
• <strong>Workshop Style:</strong> 35 people maximum<br /><br />
<strong>Included Equipment & AV:</strong><br />
• <strong>Microphones & Audio:</strong> 1 wireless handheld microphone, a surround sound system.<br />
• <strong>Screens & Displays:</strong> 1 projector screen at the front of the room.<br />
• <strong>Catering Setup:</strong> Shared Kitchen located just next door (has ZipTap, microwave, and fridge).<br /><br />
<strong>Other Equipment & AV (items are shared between all bookable rooms, availability is dependent on requirements of other bookings):</strong><br />
• <strong>Screens & Displays:</strong> 2 Portable TV’s on wheels.<br />
• <strong>Furniture:</strong> 1 lectern, 1 registration table, 8 high networking tables, a casual lounge area with couches and coffee tables, 10 mobile double-sided whiteboards.<br />
• <strong>Catering Setup:</strong> 3 standing catering tables, 1 hot water urn, 1 chilled water dispenser, serving tongs, platter boards, 60 glasses, 40 plates, 30 mugs and 3 Ice/Drinks Buckets.<br />
• <strong>Stage:</strong> Pieces of the modular stage can be used to create a small stage or used as stepped seating.<br />
• <strong>Tech:</strong> 6 iPads (for guest check-in or Slido Q&A), 2 spare laptops (1 Mac, 1 PC), 1 handheld microphone connected only to a portable speaker.<br />
• <strong>Recording:</strong> Fixed-camera video recording direct to SD Card or live to YouTube (you must have your own YouTube account).<br /><br />
<strong>Bathrooms:</strong><br />
This room does not have private bathrooms. The closest toilets are down the hallway in the main foyer and are shared publicly with students, staff, and the rest of the building.<br /><br />
<strong>Emergency & Safety:</strong><br />
• <strong>First Aid Kit:</strong> Sitting on the red AV Cabinet.<br />
• <strong>Defibrillator:</strong> Located in the Foyer on the Ground Floor of the building.<br />
• <strong>Evacuation Routes:</strong> In the event of an emergency, proceed down the stairs to the Ground Floor, exit through the glass doors, and assemble on Alumni Lawn directly beside the building.<br />
• <strong>Fire Extinguishers:</strong> Located in XX. Please report any incidents or safety hazards immediately to the Venue Staff Member.<br /><br />
<strong>Please note:</strong> This room is an open design (no doors). While the hallway it backs onto is very quiet as it only leads to a few labs that do not run large classes and only students with certain access on their swipe card can access, it may not be appropriate for highly confidential or sensitive team meetings.`
        },
        'MCIC Level 1 - Group Study': {
            roomNumber: '', // No room number needed
            imgs: [
                '/images/venues/group-study-2.JPG',
                '/images/venues/group-study-1.JPG'
            ],
            description: `Located directly in front of Founders place, this is a completely open co-working space for Founders. From time to time it can be booked out, usually to house catering or breakout groups for events held in Founders Place which is located directly next door, behind the back wall in the photo.<br /><br />
Not the most suitable for workshops and events.<br /><br />
<strong>Capacity:</strong><br />
• <strong>Lecture Style:</strong> 70 people maximum<br />
• <strong>Workshop Style:</strong> 35 people maximum<br /><br />
<strong>Included Equipment & AV:</strong><br />
• <strong>Catering Setup:</strong> Shared Kitchen located within the space (has ZipTap, microwave, and fridge).<br /><br />
<strong>Other Equipment & AV (items are shared between all bookable rooms, availability is dependent on requirements of other bookings):</strong><br />
• <strong>Screens & Displays:</strong> 2 Portable TV’s on wheels.<br />
• <strong>Furniture:</strong> 1 lectern, 1 registration table, 8 high networking tables, a casual lounge area with couches and coffee tables, 10 mobile double-sided whiteboards.<br />
• <strong>Catering Setup:</strong> 3 standing catering tables, 1 hot water urn, 1 chilled water dispenser, serving tongs, platter boards, 60 glasses, 40 plates, 30 mugs and 3 Ice/Drinks Buckets.<br />
• <strong>Stage:</strong> Pieces of the modular stage can be used to create a small stage or used as stepped seating.<br />
• <strong>Tech:</strong> 6 iPads (for guest check-in or Slido Q&A), 2 spare laptops (1 Mac, 1 PC), 1 handheld microphone connected only to a portable speaker.<br />
• <strong>Recording:</strong> Fixed-camera video recording direct to SD Card or live to YouTube (you must have your own YouTube account).<br /><br />
<strong>Bathrooms:</strong><br />
This room does not have private bathrooms. The closest toilets are down the hallway in the main foyer and are shared publicly with students, staff, and the rest of the building.<br /><br />
<strong>Emergency & Safety:</strong><br />
• <strong>First Aid Kit:</strong> Sitting on the red AV Cabinet nextdoor (in Founders Place).<br />
• <strong>Defibrillator:</strong> Located in the Foyer on the Ground Floor of the building.<br />
• <strong>Evacuation Routes:</strong> In the event of an emergency, proceed down the stairs to the Ground Floor, exit through the glass doors, and assemble on Alumni Lawn directly beside the building.<br />
• <strong>Fire Extinguishers:</strong> Located XX. Please report any incidents or safety hazards immediately to the Venue Staff Member.<br /><br />
<strong>Please note:</strong> This room has no walls or doors. When not booked, it is used as a co-working space for Founders and a study space for Materials Science students.`
        },

        'MCIC Ground - Colonnade': {
            roomNumber: 'Ground Floor Outdoor Colonnade',
            imgs: [
                '/images/venues/colonnade-1.JPG',
                '/images/venues/colonnade-2.JPG'
            ],
            description: `The covered outdoor Colonnade running along the Ground Floor of the Hilmer Building. Ideal for outdoor registration, pop-up exhibitions or catering setups. Can be booked alongside MCIC Event or Design Space bookings<br /><br />`
        },
        'MCIC Ground - AI Makerspace - COMING SOON': {
            roomNumber: 'Room G17',
            imgs: [
                '/images/venues/AI-1.JPG',
                '/images/venues/AI-2.JPG'
            ],
            description: `Our AI Makerspace is a place to test and refine AI technologies. It includes workstations and a supercomputer for AI research and development.
<br /><br />`
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
        days: ["Mon 01", "Tue 02", "Wed 03", "Thu 04", "Fri 05", "Sat 06", "Sun 07"],
        timeSlots: generate24HoursTimeSlots(),
        rooms: [
            {
                name: "Ground - Event Space",
                schedule: {
                    "Mon 01": Array(18).fill("Available").concat(Array(4).fill("Unavailable")).concat(Array(4).fill("TBC")).concat(Array(22).fill("Available")),
                    "Tue 02": Array(18).fill("Available").concat(Array(4).fill("TBC")).concat(Array(6).fill("Unavailable")).concat(Array(20).fill("Available")),
                    "Wed 03": Array(24).fill("Unavailable").concat(Array(24).fill("Available")),
                    "Thu 04": Array(48).fill("Available"),
                    "Fri 05": Array(18).fill("TBC").concat(Array(4).fill("Available")).concat(Array(4).fill("Unavailable")).concat(Array(22).fill("Available")),
                    "Sat 06": Array(48).fill("Available"),
                    "Sun 07": Array(48).fill("Available")
                }
            },
            {
                name: "Ground - Design Space",
                schedule: {
                    "Mon 01": Array(8).fill("Unavailable").concat(Array(8).fill("Available")).concat(Array(2).fill("TBC")).concat(Array(30).fill("Available")),
                    "Tue 02": Array(12).fill("Available").concat(Array(4).fill("Unavailable")).concat(Array(32).fill("Available")),
                    "Wed 03": Array(4).fill("Available").concat(Array(4).fill("TBC")).concat(Array(4).fill("Available")).concat(Array(4).fill("Unavailable")).concat(Array(32).fill("Available")),
                    "Thu 04": Array(8).fill("Available").concat(Array(4).fill("Unavailable")).concat(Array(4).fill("TBC")).concat(Array(32).fill("Available")),
                    "Fri 05": Array(48).fill("Available"),
                    "Sat 06": Array(48).fill("Available"),
                    "Sun 07": Array(48).fill("Available")
                }
            },
            {
                name: "Ground - Entire Space",
                schedule: {
                    "Mon 01": Array(48).fill("Available"),
                    "Tue 02": Array(48).fill("Available"),
                    "Wed 03": Array(48).fill("Unavailable"),
                    "Thu 04": Array(48).fill("Available"),
                    "Fri 05": Array(48).fill("Available"),
                    "Sat 06": Array(48).fill("Available"),
                    "Sun 07": Array(48).fill("Available")
                }
            },
            {
                name: "Level 1 - Founders Place",
                schedule: {
                    "Mon 01": Array(8).fill("TBC").concat(Array(8).fill("Available")).concat(Array(4).fill("Unavailable")).concat(Array(28).fill("Available")),
                    "Tue 02": Array(4).fill("Available").concat(Array(4).fill("Unavailable")).concat(Array(4).fill("Available")).concat(Array(4).fill("TBC")).concat(Array(32).fill("Available")),
                    "Wed 03": Array(48).fill("Available"),
                    "Thu 04": Array(48).fill("Unavailable"),
                    "Fri 05": Array(16).fill("Unavailable").concat(Array(32).fill("Available")),
                    "Sat 06": Array(48).fill("Available"),
                    "Sun 07": Array(48).fill("Available")
                }
            },
            {
                name: "Level 1 - Group Study",
                schedule: {
                    "Mon 01": Array(48).fill("Available"),
                    "Tue 02": Array(48).fill("Available"),
                    "Wed 03": Array(48).fill("Available"),
                    "Thu 04": Array(4).fill("Available").concat(Array(4).fill("TBC")).concat(Array(4).fill("Available")).concat(Array(4).fill("Unavailable")).concat(Array(32).fill("Available")),
                    "Fri 05": Array(48).fill("Available"),
                    "Sat 06": Array(48).fill("Available"),
                    "Sun 07": Array(48).fill("Available")
                }
            }
        ]
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

    useEffect(() => {
        const q = calculateQuote(formData);
        setQuote(q);
    }, [formData]);

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
        setFormData({ ...formData, space: spaceName });
    };

    const updateRunsheetRow = (index, field, value) => {
        const updatedRows = [...runsheetRows];
        updatedRows[index][field] = value;
        setRunsheetRows(updatedRows);
    };

    const addRunsheetRow = () => {
        setRunsheetRows([...runsheetRows, { time: '', layout: 'Workshop Style', description: '' }]);
    };

    const removeRunsheetRow = (index) => {
        if (runsheetRows.length > 1) {
            setRunsheetRows(runsheetRows.filter((_, i) => i !== index));
        }
    };

    const copyWifi = () => {
        navigator.clipboard.writeText("UNSW Guest");
        setCopiedWifi(true);
        setTimeout(() => setCopiedWifi(false), 2000);
    };

    const toggleAccordion = (id) => {
        setActiveAccordion(activeAccordion === id ? null : id);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        // 1. Existing Validation Checks
        const showCateringPolicy = formData.catering === 'Yes' || formData.alcohol === 'Yes';
        if (showCateringPolicy && !cateringAcknowledged) {
            setCateringError(true);
            const section = document.getElementById('catering-policy-block');
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        if (!conductAcknowledged) {
            setConductError(true);
            const section = document.getElementById('conduct-policy-block');
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        setCateringError(false);
        setConductError(false);

        // 2. Map Registration Preferences & Public Visibility
        const isPublicListing = Boolean(formData.postToPublicDirectory);
        const isPrivateListing = Boolean(formData.useRegistrationPortal);
        const usesExternalPortal = Boolean(formData.hasOwnRegistrationPortal);

        let registrationType = 'MCIC_PLATFORM';
        if (usesExternalPortal) {
            registrationType = 'EXTERNAL';
        }

        // 3. Generate Clean URL Slug for /events/[slug]
        const rawName = formData.eventName || formData.title || 'mcic-event';
        const slug = rawName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9 -]/g, '')  // Remove special characters
            .replace(/\s+/g, '-')         // Convert spaces to hyphens
            .replace(/-+/g, '-');         // Avoid consecutive hyphens

        // 4. Construct Complete Event Payload
        const eventPayload = {
            ...formData,
            slug,
            registrationType,     // 'MCIC_PLATFORM' or 'EXTERNAL'
            isPublicListing,      // true = listed on /events | false = unlisted / direct link only
            status: 'APPROVED',   // Change to 'PENDING_REVIEW' if review required
            createdAt: new Date().toISOString()
        };

        // 5. Submit Payload or Update Local State
        try {
            // Optional API Call:
            // await fetch('/api/bookings', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(eventPayload)
            // });

            setHasSubmitted(true);

            // Scroll smoothly to top of confirmation block
            const actionCorner = document.getElementById('booking-form');
            if (actionCorner) {
                actionCorner.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } catch (error) {
            console.error('Failed to submit booking form:', error);
        }
        if (!conductAcknowledged) {
            setConductError(true);
            const section = document.getElementById('conduct-policy-block');
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        setCateringError(false);
        setConductError(false);

        const targetIsoDateString = selectedCalendarDate.toISOString().split('T')[0];

        const organizedSubmissionPayload = {
            eventName: formData.eventName || "Untitled MCIC Activation Hold",
            space: formData.space,
            attendees: formData.attendees,
            department: formData.department || departmentType,
            catering: formData.catering || "No",
            isHighRisk: formData.isHighRisk,
            bumpInDate: targetIsoDateString,
            bumpIn: formData.bumpIn || "09:00",
            bumpOut: formData.bumpOut || "17:00",
            eventStart: formData.eventStart || "09:30",
            eventEnd: formData.eventEnd || "16:30",
            mainContact: {
                name: formData.mainContact.name || "Guest Applicant",
                email: formData.mainContact.email || "test@example.com"
            }
        };

        try {
            const apiResponse = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(organizedSubmissionPayload)
            });

            const processingResult = await apiResponse.json();

            if (processingResult.success) {
                setHasSubmitted(true);
                alert(`🎉 Booking hold request logged onto server tracking systems! Check your testing inbox for the invitation layout.`);
            } else {
                alert(`⚠️ Calendar automation configuration error: ${processingResult.error}`);
            }
        } catch (err) {
            console.error("Submission processing failure:", err);
            alert("Network connection error encountered trying to reach the serverless booking API handler.");
        }
    };

    const isCalendarOption = (value) => {
        return value === "I know what space and date/time I want. I just want to check availability.";
    };

    const triggerRevealAllQuestions = () => {
        setShowFullForm(true);
        setTimeout(() => {
            const targetBlock = document.getElementById('rest-of-form-marker');
            if (targetBlock) {
                targetBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 150);
    };

    const handleSkipToForm = () => {
        setShowFullForm(true);
        setFormData(prev => ({
            ...prev,
            bookingIntent: "I am flexible on date/time and space. I'd like to see all my options."
        }));
        setTimeout(() => {
            const target = document.getElementById('booking-form-section-header');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
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

    const toggleSlotSelection = (roomName, dayString, timeSlot) => {
        const slotKey = `${roomName}|${dayString}|${timeSlot}`;
        setSelectedSlots(prev =>
            prev.includes(slotKey)
                ? prev.filter(key => key !== slotKey)
                : [...prev, slotKey]
        );
    };

    const renderEventDetailsSection = () => {
        return (
            <section key="event-details-block" className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
                <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">Event Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Event Name</label>
                        <input type="text" value={formData.eventName} onChange={(e) => setFormData(prev => ({ ...prev, eventName: e.target.value }))} placeholder="e.g. HDR Pitching Workshop" className="w-full p-3 border border-gray-200 bg-white text-sm font-medium rounded-sm text-black outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Expected Attendees</label>
                        <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={formData.attendees || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, attendees: parseInt(e.target.value) || 0 }))}
                            className="w-full p-3 border border-gray-200 bg-white text-sm text-black font-medium rounded-sm outline-none"
                        />
                    </div>
                </div>

                {!isCalendarOption(formData.bookingIntent) && formData.attendees > 0 && (
                    <div className="p-4 bg-neutral-900 text-white rounded-sm border border-neutral-800 space-y-1">
                        <span className="text-[9px] font-black tracking-widest text-white uppercase block">Suggested Target Allocation</span>
                        <h4 className="text-xs font-bold">Recommended: {localActiveSuggestedContext.name}</h4>
                        <p className="text-[11px] text-neutral-400 font-normal leading-normal">{localActiveSuggestedContext.note}</p>
                    </div>
                )}

                <div className="p-5 bg-neutral-50 border border-gray-200 rounded-sm space-y-4">
                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 block">Booking times (Please book 30 minutes to 1 hour for bump-in and bump-out)</label>
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

                <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Event Description</label>
                    <textarea
                        placeholder="Outline event focus..."
                        className="w-full p-4 border border-gray-200 bg-white text-sm text-black font-medium rounded-sm h-28 resize-none outline-none"
                        value={formData.eventDescription} onChange={(e) => setFormData(prev => ({ ...prev, eventDescription: e.target.value }))}
                    />
                </div>

                {departmentType === 'UNSW Founders' && (
                    <div className="pt-4 border-t border-gray-100 mt-2 space-y-3 animate-in fade-in duration-200">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Select an option below to quick-fill this form</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <button
                                key="btn-tour"
                                type="button"
                                onClick={() => applyEventTemplate('tour')}
                                className="p-3 text-left border border-neutral-200 rounded-sm hover:border-black hover:bg-neutral-50/50 transition-all flex flex-col justify-between bg-neutral-50/30 cursor-pointer"
                            >
                                <span className="text-xs font-bold text-black block">Tour</span>
                                <span className="text-[10px] text-gray-500 font-normal mt-1">No specific layout</span>
                            </button>
                            <button
                                key="btn-delegation"
                                type="button"
                                onClick={() => applyEventTemplate('delegation')}
                                className="p-3 text-left border border-neutral-200 rounded-sm hover:border-black hover:bg-neutral-50/50 transition-all flex flex-col justify-between bg-neutral-50/30 cursor-pointer"
                            >
                                <span className="text-xs font-bold text-black block">Delegation Visit</span>
                                <span className="text-[10px] text-gray-500 font-normal mt-1">Boardroom setup & tea/coffee on arrival</span>
                            </button>
                            <button
                                key="btn-workshop"
                                type="button"
                                onClick={() => applyEventTemplate('workshop')}
                                className="p-3 text-left border border-neutral-200 rounded-sm hover:border-black hover:bg-neutral-50/50 transition-all flex flex-col justify-between bg-neutral-50/30 cursor-pointer"
                            >
                                <span className="text-xs font-bold text-black block">Standard Workshop</span>
                                <span className="text-[10px] text-gray-500 font-normal mt-1">Workshop layout</span>
                            </button>
                            <button
                                key="btn-lecture"
                                type="button"
                                onClick={() => applyEventTemplate('lecture')}
                                className="p-3 text-left border border-neutral-200 rounded-sm hover:border-black hover:bg-neutral-50/50 transition-all flex flex-col justify-between bg-neutral-50/30 cursor-pointer"
                            >
                                <span className="text-xs font-bold text-black block">Lecture/Networking Event</span>
                                <span className="text-[10px] text-gray-500 font-normal mt-1">Theatre layout, networking etc.</span>
                            </button>
                        </div>
                    </div>
                )}
            </section>
        );
    };

    // Sub-sections
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
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Company / Organisation Name Name</label>
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
                Schedule
            </h3>

            <div className="space-y-3 pt-2">
                <div>
                    <label className="text-xs font-bold tracking-wider text-gray-500 block">Tell us what's happening when so we can help in high friction moments. E.g Tell us when you need to video record, re-arrange furniture, receive and serve catering etc.</label>
                </div>

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
                                            className="w-full p-2 border border-gray-200 rounded-sm text-xs font-semibold bg-white text-black outline-none appearance-none cursor-pointer focus:border-neutral-400"
                                            style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'gray\' stroke-width=\'2\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")', backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat' }}
                                        >
                                            <option>Boardroom Style</option>
                                            <option>Workshop Style/Group Tables</option>
                                            <option>Lecture/Theatre Style</option>
                                            <option>Clear Open Floor</option>
                                            <option>No specific layout required (e.g. for a tour or walkthrough)</option>
                                            <option>Other (Please explain in description)</option>

                                            <option>Other (Please explain in description)</option>
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="text"
                                            placeholder={row.layout === 'Other (Please explain in description)' ? "Explain your custom setup layout requirements..." : "e.g. 10 tables setup for groups of 8..."}
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
        // Master list of all shared/add-on equipment with overall hub capacities
        const sharedEquipmentMaster = [
            { key: 'handheldMics', label: 'Handheld Microphones', category: 'Audio', totalHubStock: 4 },
            { key: 'lapelMics', label: 'Lapel Microphones', category: 'Audio', totalHubStock: 4 },
            { key: 'portableStandingTv', label: 'Portable Standing TV Screen', category: 'Displays', totalHubStock: 2 },
            { key: 'standingWhiteboards', label: 'Standing Whiteboards', category: 'Furniture', totalHubStock: 10 },
            { key: 'networkingHighTables', label: 'Networking High Tables', category: 'Furniture', totalHubStock: 8 },
            { key: 'cateringStandingTables', label: 'Catering Standing Tables', category: 'Furniture', totalHubStock: 3 },
            { key: 'couchesCoffeeTables', label: 'Couches + Coffee Tables Set', category: 'Furniture', totalHubStock: 1, isToggle: true },
            { key: 'loungesCoffeeTable', label: 'Lounges + Coffee Table Set', category: 'Furniture', totalHubStock: 1, isToggle: true },
            { key: 'registrationTable', label: 'Registration Table', category: 'Furniture', totalHubStock: 1, isToggle: true },
            { key: 'stage', label: 'Modular Stage Pieces', category: 'Furniture', totalHubStock: 1 },
            { key: 'ipad', label: 'iPads (Check-in / Slido Q&A)', category: 'Tech Hardware', totalHubStock: 6 },
            { key: 'spareLaptop', label: 'Spare Presentation Laptop', category: 'Tech Hardware', totalHubStock: 5 },
            { key: 'videoRecording', label: 'Video Recording Unit', category: 'Tech Hardware', totalHubStock: 1, isToggle: true },
            { key: 'glasses', label: 'Drinking Glasses', category: 'Catering Ware', totalHubStock: 60 },
            { key: 'plates', label: 'Plates', category: 'Catering Ware', totalHubStock: 40 },
            { key: 'mugs', label: 'Mugs', category: 'Catering Ware', totalHubStock: 30 },
            { key: 'urnHotWater', label: 'Hot Water Urn', category: 'Catering Ware', totalHubStock: 1, isToggle: true },
            { key: 'waterDispenser', label: 'Chilled Water Dispenser', category: 'Catering Ware', totalHubStock: 1, isToggle: true },
            { key: 'servingTongs', label: 'Serving Tongs & Platter Boards', category: 'Catering Ware', totalHubStock: 1, isToggle: true }
        ];

        // Fixed inclusions per space ($0 inclusions)
        const roomInclusions = {
            'MCIC Ground - Entire Space': [
                '1x Lectern with Built-in Microphone',
                '4x Wireless Handheld Microphones',
                '4x Wireless Lapel Microphones',
                '2x Front Overhead Projector Screens',
                '2x Mid-Room TV Screens',
                'Full Modular Stage Setup',
                'Surround Sound Audio & Basic Stage Lighting',
                'Kitchen Access (ZipTaps & Microwaves)'
            ],
            'MCIC Ground - Event Space': [
                '1x Lectern with Built-in Microphone',
                '2x Wireless Handheld Microphones',
                '2x Wireless Lapel Microphones',
                '2x Front Overhead Projector Screens',
                'Full Modular Stage Setup',
                'Surround Sound Audio & Basic Stage Lighting',
                'Kitchen Access (ZipTaps & Microwaves)'
            ],
            'MCIC Ground - Design Space': [
                '2x Wireless Handheld Microphones',
                '2x Wireless Lapel Microphones',
                '1x Front Overhead Projector Screen',
                'Surround Sound Audio System'
            ],
            'MCIC Level 1 - Founders Place': [
                '1x Wireless Handheld Microphone',
                '1x Front Overhead Projector Screen',
                'Surround Sound Audio System',
                'Shared Kitchenette Access'
            ],
            'MCIC Level 1 - Group Study': [
                'Open Co-working Setup',
                'Shared Kitchenette Access'
            ]
        };

        // Simulated overlapping active reservations (will connect to Supabase)
        const mockTimeSlotReservations = {
            handheldMics: 1,
            standingWhiteboards: 4,
            ipad: 2,
            glasses: 20
        };

        return (
            <section key="av-equipment-block" className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-8">
                <div>
                    <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                        Audio Visual & Equipment
                    </h3>
                    <p className="text-xs text-gray-500 mt-2">
                        Selected Venue: <strong className="text-black">{formData.space || 'MCIC Ground - Event Space'}</strong>
                    </p>
                </div>

                {/* 1. INCLUDED ROOM FEATURES */}
                <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-sm space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="bg-emerald-600 text-white font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm">
                            Included
                        </span>
                        <h4 className="font-bold text-sm text-neutral-900">Standard Room Inclusions</h4>
                    </div>
                    <p className="text-xs text-gray-500">
                        These features are pre-installed in {formData.space || 'this space'} and included with your booking automatically:
                    </p>

                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-medium text-neutral-800 pt-1">
                        {(roomInclusions[formData.space] || roomInclusions['MCIC Ground - Event Space']).map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2 bg-white px-3 py-2 border border-neutral-200 rounded-sm">
                                <span className="text-emerald-600 font-bold">✓</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 2. SHARED ADD-ON EQUIPMENT WITH DYNAMIC AVAILABILITY */}
                <div className="space-y-4">
                    <div className="border-b border-gray-100 pb-2 flex justify-between items-end">
                        <div>
                            <h4 className="font-bold text-sm text-black uppercase">Shared Hub Equipment</h4>
                            <p className="text-xs text-gray-500">
                                Shared across all venues. Quantities reflect real-time hub availability for your selected time slot.
                            </p>
                        </div>
                        <span className="font-mono text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 font-bold uppercase rounded-sm">
                            Live Availability Active
                        </span>
                    </div>

                    <div className="border border-gray-100 divide-y divide-gray-100 rounded-sm">
                        {sharedEquipmentMaster.map((item) => {
                            const reservedInSlot = mockTimeSlotReservations[item.key] || 0;
                            const availableStock = Math.max(0, item.totalHubStock - reservedInSlot);
                            const currentValue = formData.av[item.key] || (item.isToggle ? false : 0);

                            return (
                                <div key={item.key} className="flex justify-between items-center p-4 bg-white text-sm hover:bg-neutral-50/50 transition-colors">
                                    <div className="space-y-0.5">
                                        <span className="font-semibold text-neutral-800 block">{item.label}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${availableStock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {availableStock > 0 ? `${availableStock} Available` : 'Fully Reserved'}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-mono">(Max Hub Cap: {item.totalHubStock})</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {item.isToggle ? (
                                            <input
                                                type="checkbox"
                                                disabled={availableStock === 0}
                                                checked={!!currentValue}
                                                className="w-4 h-4 rounded-sm border-gray-300 accent-black cursor-pointer disabled:cursor-not-allowed"
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    av: { ...formData.av, [item.key]: e.target.checked }
                                                })}
                                            />
                                        ) : (
                                            <div className="relative">
                                                <select
                                                    value={currentValue}
                                                    disabled={availableStock === 0}
                                                    className="w-20 p-1.5 pr-6 border border-gray-200 text-center font-bold text-xs bg-white rounded-sm text-black outline-none appearance-none cursor-pointer focus:border-neutral-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                    style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'gray\' stroke-width=\'2\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")', backgroundPosition: 'right 6px center', backgroundRepeat: 'no-repeat' }}
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
                    className={`border p-4 rounded-sm space-y-4 text-xs font-medium leading-relaxed shadow-sm transition-colors duration-200 animate-in fade-in ${cateringError
                        ? 'border-red-300 bg-red-50/60 text-red-900'
                        : 'border-amber-200 bg-amber-50/40 text-neutral-800'
                        }`}
                >
                    <div className="flex items-center gap-2 font-bold text-black uppercase tracking-wide">
                        <span>💡</span> Self-Catering Policy
                    </div>
                    <p>
                        Anyone using our spaces will need to organise their own catering and servicware.
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

    const dynamicFormSegmentsOrdered = isCalendarOption(formData.bookingIntent)
        ? [renderAffiliationSection(), renderEventDetailsSection(), renderTimesAndRunsheetSection(), renderAvAndEquipmentSection(), renderCateringSection()]
        : [renderEventDetailsSection(), renderTimesAndRunsheetSection(), renderAffiliationSection(), renderAvAndEquipmentSection(), renderCateringSection()];

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D] relative overflow-x-hidden">

            <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">

                {/* HERO INTRODUCTION & PORTRAIT VIDEO ARRANGEMENT */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white border border-gray-200 p-6 md:p-8 rounded-sm shadow-sm">
                    <header className="md:col-span-7 space-y-4">
                        <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-black">
                            MCIC Event Spaces
                        </h1>
                        <div className="text-gray-600 text-sm leading-relaxed space-y-3">
                            <p>
                                Thank you for your interest in booking one of the Michael Crouch Innovation Centre (MCIC) Event Spaces located on the Ground Floor and Level 1 of the Kens HILMER E10 Building.
                            </p>
                            <p>
                                Please explore our spaces below and complete the Booking Form to submit an Expression of Interest. A quote will be automatically calculated for you before final submission of your booking form.
                            </p>
                            <p>
                                Internal Departments and Student Societies receive a significant discount to use our spaces while external hirers will pay full price. Discounts will be automatically applied when generating your quote.
                            </p>
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
                                Book a tour of the MCIC spaces
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
                                Skip straight to booking form ↓
                            </button>
                        </div>
                    </header>

                    {/* PORTRAIT VIDEO CONTAINER */}
                    <section className="md:col-span-5 bg-neutral-50 p-4 border border-gray-100 rounded-sm flex flex-col items-center justify-center space-y-3">
                        <div className="text-center">
                            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">Virtual Tour</h3>
                            <p className="text-[11px] text-gray-500 mt-0.5">Explore the Michael Crouch Innovation Centre (MCIC)</p>
                        </div>
                        <div className="w-full max-w-[400px] aspect-[3/4] bg-black border border-gray-200 rounded-sm overflow-hidden relative group shadow-sm">
                            <video
                                src="https://assets.mixkit.co/videos/preview/mixkit-vertical-creative-agency-team-discussing-project-42994-large.mp4"
                                controls
                                playsInline
                                loop
                                muted
                                className="w-full h-full object-cover"
                                poster="/images/venues/event-space-1.JPG"
                            />
                        </div>
                    </section>
                </div>

                {/* ARCHITECTURE SHOWCASE & SPACE PHOTOS ARCHITECTURE */}
                <div className="space-y-4">
                    <div className="flex flex-col gap-3 border-b border-gray-200 pb-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-2xl font-black text-black tracking-tight">Five bookable Event Spaces</h3>
                                <p className="text-xs text-neutral-400 font-medium mt-1">Clicking any event space to view images and details.</p>
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
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
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
                                        {showroomSpace.includes('Entire Space') && 'MCIC - Ground Floor - Rooms G22 & G26'}
                                        {showroomSpace.includes('Event Space') && 'MCIC - Ground Floor - Room G26'}
                                        {showroomSpace.includes('Design Space') && 'MCIC - Ground Floor - Room G22'}
                                        {showroomSpace.includes('Founders Place') && 'MCIC - Level 1 - Room 124'}
                                        {showroomSpace.includes('Group Study') && 'MCIC - Level 1'}
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

                {/* ACCORDION VENUE RULES INTEGRATION HUB */}
                <div className="space-y-4 bg-white p-6 border border-gray-200 rounded-sm shadow-sm">
                    <div className="text-left">
                        <h4 className="text-sm font-black uppercase tracking-wider text-black">FAQs</h4>
                    </div>

                    <div className="border border-gray-200 rounded-sm divide-y divide-gray-200 overflow-hidden bg-white shadow-xs">

                        {/* 15. WHO CAN BOOK OUR SPACES */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('eligibility')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Who can book our spaces?</span>
                                <span>{activeAccordion === 'eligibility' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'eligibility' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-700 font-normal leading-relaxed">
                                    <p className="font-medium text-neutral-900">
                                        Anyone can book an event space at the Michael Crouch Innovation Centre.
                                    </p>
                                    <ul className="space-y-2.5 text-neutral-700">
                                        <li>
                                            <strong>External Bookings:</strong> Charged a full fee.
                                        </li>
                                        <li>
                                            <strong>UNSW Startups & Arc Student Societies:</strong> Fees are completely waived for registered Arc student societies and UNSW startups running entrepreneurship related events (subject to MCIC team approval).
                                        </li>
                                        <li>
                                            <strong>UNSW Departments:</strong> Charged a discounted fee.
                                        </li>
                                        <li>
                                            <strong>Alignment Discounts:</strong> MCIC event spaces are prioritised for initiatives aligned with innovation, entrepreneurship, and creative problem-solving across UNSW, so extra discounts can be applied when an event aligns.
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* 10. OPERATING HOURS & STAFFING FEES */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('hours')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Operating Hours & Staffing Fees</span>
                                <span>{activeAccordion === 'hours' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'hours' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-gray-600 font-normal leading-relaxed">
                                    <p>
                                        The venue space is available for reservation 24/7; however, variable fees apply outside regular working hours:
                                    </p>
                                    <div className="space-y-3">
                                        <p>
                                            <strong className="text-neutral-900 block uppercase text-[10px] tracking-wide mb-0.5">Standard Office Hours (9:00am – 4:00pm)</strong>
                                            No additional expenses automatically apply during these hours.
                                        </p>
                                        <p>
                                            <strong className="text-neutral-900 block uppercase text-[10px] tracking-wide mb-0.5">Outside Office Hours (Before 9:00am or After 4:00pm)</strong>
                                            Hiring a dedicated casual staff support member is required. This costs $50 per hour (3-hour minimum block). Sunday or Public Holiday shifts require a 4-hour minimum.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 1. LOCATION, TRANSPORT & PARKING */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('location-transport')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Location, Transport, Parking & Deliveries</span>
                                <span>{activeAccordion === 'location-transport' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'location-transport' && (
                                <div className="p-6 bg-white text-xs space-y-5 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <div className="space-y-1">
                                        <span className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide block border-b border-neutral-100 pb-1">
                                            Where on Campus
                                        </span>
                                        <p className="pt-1">
                                            <strong>Address:</strong> Michael Crouch Innovation Centre (MCIC), Building E10, UNSW Kensington Campus, Kensington NSW 2033.<br />
                                            The building is located right beside the Alumni Lawn. If arriving by car, enter via the Gate 2 Avenue entrance on High Street.
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide block border-b border-neutral-100 pb-1">
                                            Public Transport
                                        </span>
                                        <div className="space-y-1.5 pt-1">
                                            <p>• <strong>L3 Kingsford Light Rail:</strong> Alight at the UNSW Anzac Parade stop. Walk directly up onto campus from the main Anzac Parade gates.</p>
                                            <p>• <strong>Buses:</strong> Alight at UNSW Anzac Parade / NIDA (Routes 303, 392X, 392, 396).</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide block border-b border-neutral-100 pb-1">
                                            Uber & Taxis
                                        </span>
                                        <div className="space-y-1.5 pt-1">
                                            <p>• <strong>Ride Share Drop-off:</strong> Direct drivers to UNSW Gate 2, High St, Randwick. Get dropped off at the first roundabout just inside the gate (where there is a natural taxi bay) and simply walk straight across the lawn to the MCIC.</p>
                                        </div>
                                    </div>

                                    {/* COMPREHENSIVE PARKING SECTION */}
                                    <div className="space-y-3">
                                        <span className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide block border-b border-neutral-100 pb-1">
                                            Campus Parking & EV Facilities
                                        </span>
                                        <div className="space-y-3 pt-1">
                                            <p>
                                                <strong>For Staff:</strong> UNSW Staff can choose between annual permits (via UNSW vPermit) or pay-as-you-go parking sessions (via the CellOPark App). Having either an active permit or CellOPark session allows parking in any bay marked <strong>'UNSW Permit Holder'</strong>.
                                            </p>
                                            <p>
                                                <strong>For Students & Visitors:</strong> All-day parking is available at the top level of Botany Street multi-storey Carpark (entry via Gate 11). Timed 2P or 4P bays are located near Gates 2, 8 (off High St), Gate 11 Apron (off Botany St), and Western Campus.
                                            </p>
                                            <p className="text-neutral-500 italic">
                                                Payment is required on arrival via CellOPark App or Pay-By-Plate meter. Parking is <strong>free between 7:30 PM and 7:30 AM weekdays, and all day weekends & public holidays</strong>.
                                            </p>

                                            {/* CELLOPARK STEPS */}
                                            <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xs space-y-1">
                                                <span className="font-bold text-neutral-900 block uppercase text-[10px]">CellOPark App Setup:</span>
                                                <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-neutral-600">
                                                    <li>Download CellOPark and add your zID & email to your profile.</li>
                                                    <li>Register your vehicle plate number and credit card details.</li>
                                                    <li>Select zone <strong className="font-mono text-black">2052033 UNSW Permit Holder Parking</strong> (tap the STAR to favourite).</li>
                                                    <li>Press <strong>START</strong> on arrival. Flat rate is $8/day (no need to press stop).</li>
                                                </ol>
                                            </div>

                                            {/* EV, MOTORCYCLES & BICYCLES */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                                                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs space-y-0.5">
                                                    <span className="font-bold text-neutral-900 block uppercase text-[10px]">⚡ EV Charging</span>
                                                    <p className="text-neutral-600">6 solar EV charging stations on top level of Botany St carpark.</p>
                                                </div>
                                                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs space-y-0.5">
                                                    <span className="font-bold text-neutral-900 block uppercase text-[10px]">🏍️ Motorcycles</span>
                                                    <p className="text-neutral-600">Free in designated Motorcycle Bays (e.g. Union Rd behind Hilmer).</p>
                                                </div>
                                                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs space-y-0.5">
                                                    <span className="font-bold text-neutral-900 block uppercase text-[10px]">🚲 Bicycles</span>
                                                    <p className="text-neutral-600">Park in designated racks on Union Rd behind Hilmer (unauthorised bikes impounded after 48h).</p>
                                                </div>
                                            </div>

                                            {/* HELPFUL PARKING LINKS */}
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] pt-1 border-t border-neutral-100">
                                                <a href="https://www.estate.unsw.edu.au/getting-here/parking-campus" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline hover:text-[#EAD64D]">Parking at UNSW ↗</a>
                                                <a href="https://www.estate.unsw.edu.au/getting-here/parking/parking-rates" target="_blank" rel="noopener noreferrer" className="text-neutral-500 underline hover:text-black">Parking Rates ↗</a>
                                                <a href="https://www.estate.unsw.edu.au/unsw-solar-powered-electric-vehicle-charging-stations" target="_blank" rel="noopener noreferrer" className="text-neutral-500 underline hover:text-black">EV Charging ↗</a>
                                                <a href="https://www.estate.unsw.edu.au/getting-here/maps?id=514c6a097d4c475abd7f391b5c69b1e2" target="_blank" rel="noopener noreferrer" className="text-neutral-500 underline hover:text-black">Bicycle Map ↗</a>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DELIVERIES, LOADING DOCK & MAP IMAGE */}
                                    <div className="space-y-3">
                                        <span className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide block border-b border-neutral-100 pb-1">
                                            Deliveries & Loading Dock
                                        </span>
                                        <p className="pt-1">
                                            Couriers should enter via Gate 2 on High Street. Instruct them to either park in the Loading Bays at Gate 2 Entrance or proceed down the avenue to the E10 Hilmer Building. Note that vehicles cannot stay parked after drop-off and must move on immediately. More information on Loading Bays in the image below.
                                        </p>

                                        {/* LOADING BAY DIAGRAM IMAGE */}
                                        <div className="mt-3 border border-neutral-200 rounded-sm overflow-hidden bg-neutral-900 p-2 shadow-sm">
                                            <img
                                                src="/images/LoadingBays.jpg"
                                                alt="MCIC Loading Bays Map & Gate 2 Access Guide"
                                                className="w-full h-auto rounded-xs object-cover hover:opacity-95 transition-opacity"
                                            />
                                            <div className="p-2 text-[10px] text-neutral-400 font-mono text-center">
                                                🗺️ Gate 2 Access Routes & 15-Minute Loading Zone Map
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3.5 bg-neutral-900 text-white font-medium rounded-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <span>🗺️ Need help navigating?</span>
                                        <a
                                            href="https://link.mazemap.com/IjnOhWjK"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-white text-neutral-900 px-3 py-1.5 rounded-xs font-bold uppercase tracking-wider text-[9px] hover:bg-neutral-50 text-center whitespace-nowrap"
                                        >
                                            View Campus Map Pin ↗
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. DIGITAL & WI-FI ACCESS */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('digital')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Can I access WiFi for myself and my attendees?</span>
                                <span>{activeAccordion === 'digital' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'digital' && (
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
                                                        <img src="/images/wifi/step2.png" alt="Step 2 - Captive Portal Registration" className="mt-2 rounded-xs border border-neutral-200 max-h-36 object-contain bg-white p-1" />
                                                    </li>

                                                    <li className="space-y-1">
                                                        <strong>Step 3</strong> — An email from <code className="bg-white px-1 border rounded-xs text-[10px]">guestwireless@unsw.edu.au</code> will be sent to your email address. Navigate to your email message.
                                                        <p className="text-[10px] text-neutral-400 font-medium">Note: If you cannot find the email in your inbox, check your junk or spam folder.</p>
                                                    </li>

                                                    <li className="space-y-1">
                                                        <strong>Step 4</strong> — In the email, select <strong>click here</strong>.
                                                        <img src="/images/wifi/step4.png" alt="Step 4 - Activation Email Link" className="mt-2 rounded-xs border border-neutral-200 max-h-36 object-contain bg-white p-1" />
                                                    </li>

                                                    <li className="space-y-1">
                                                        <strong>Step 5</strong> — You will then be prompted to Confirm or Reject access. Select <strong>Confirm</strong>.
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

                        {/* 3. PRINTING & COPYING SERVICES */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('printing')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Can I print or photocopy documents on-site?</span>
                                <span>{activeAccordion === 'printing' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'printing' && (
                                <div className="p-6 bg-white text-xs space-y-6 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* LEFT BOX: MCIC DESIGN SPACE PRINTER */}
                                        <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3 flex flex-col justify-between">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                    <span>🖨️</span> MCIC On-Site Printing (Design Space)
                                                </div>
                                                <p className="text-neutral-600 text-xs leading-relaxed">
                                                    There is a printer located in the <strong>MCIC Design Space</strong>. Please note it is <strong>not connected to the UNSW network</strong>, so jobs can only be printed locally via USB flash drive.
                                                </p>
                                                <p>
                                                    For other Event Spaces, if you require 30 or less A4 pages printed daily for an upcoming event, email <a href="mailto:MCIC@UNSW.edu.au" className="font-mono font-bold text-black underline">MCIC@UNSW.edu.au</a> and our team can print them out for you.
                                                </p>
                                            </div>
                                        </div>

                                        {/* RIGHT BOX: HIGH-VOLUME & LIBRARY / POST OFFICE PRINTING */}
                                        <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-4 flex flex-col justify-between">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                    <span>📚</span> High-Volume Printing (Library & Post Office)
                                                </div>
                                                <p className="text-neutral-600 text-xs leading-relaxed">
                                                    For larger print volumes (substantially more than 30 pages), please use campus services at the <a href="https://link.mazemap.com/Pd5JYQzv" target="_blank" rel="noopener noreferrer" className="font-bold text-black underline">UNSW Main Library ↗</a> or <a href="https://link.mazemap.com/eZRjrq9D" target="_blank" rel="noopener noreferrer" className="font-bold text-black underline">UNSW Post Office ↗</a>.
                                                </p>

                                                <div className="p-3 bg-white border border-neutral-200 rounded-xs space-y-2 text-[11px] text-neutral-700">
                                                    <span className="font-bold text-neutral-900 block uppercase text-[10px]">Library Print & Copy Rules:</span>
                                                    <ul className="list-disc pl-4 space-y-1 text-neutral-600">
                                                        <li>Photocopy, scan, and print copies directly at any Print/Copy station.</li>
                                                        <li>Purchase a reusable photocopy card at the Print/Copy Services desk on <strong>Level 2, Main Library</strong>.</li>
                                                        <li>Minimum charge is <strong>$5</strong> (covers card cost and initial print credits).</li>
                                                        <li><em className="text-neutral-500">Unused credit cannot be refunded.</em></li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. WILL THE SPACE BE SET-UP FOR ME */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('setup')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Will the space be set-up for me?</span>
                                <span>{activeAccordion === 'setup' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'setup' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <p>
                                        Please expect to set up the chairs, tables, and equipment yourself. While we aim to assist or arrange layouts prior to your arrival, this is not always possible.
                                    </p>
                                    <p>
                                        A staff member will always unlock the space, show you how to use and find equipment, and lock the room at check-out. If you require support in the room for the entirety of your event you must hire casual staff through the booking form at a cost of $50 per hour (minimum 3 hours).
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* WHAT HOURS SHOULD I BOOK THE SPACE */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('bookingHours')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>What hours should I book the space for?</span>
                                <span>{activeAccordion === 'bookingHours' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'bookingHours' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <p>
                                        Please book the space for the entire period you require access—from the moment you need to enter for setup to the exact time you will depart after cleaning up and packing down (not just the time your event runs).
                                    </p>
                                    <p>
                                        You will <strong>not</strong> have access to the space before or after your confirmed booking window. Be sure to factor in sufficient time for setting up equipment, tables, and chairs prior to your event, as well as clearing away rubbish and tidying the room afterward.
                                    </p>
                                    <p>
                                        A staff member will always unlock the space, show you how to use and find equipment, and lock the room at check-out. If you require support in the room for the entirety of your event you must hire casual staff through the booking form at a cost of $50 per hour (minimum 3 hours).
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 4. WILL THERE BE STAFF TO HELP ME AT ALL TIMES */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('staff')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Will there be staff to help me at all times?</span>
                                <span>{activeAccordion === 'staff' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'staff' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <p>
                                        A staff member will be on-site to facilitate check-in, demonstrate core AV equipment controls, and securely lock the facility doors at the conclusion of your reservation window.
                                    </p>
                                    <p>
                                        Throughout your event window, staff remain inside the core building infrastructure and can be paged immediately to troubleshoot unexpected technical issues. Staff do not maintain an ongoing presence inside your room unless dedicated casual staffing coverage is requested ($50/hr, min 3 hours).
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 5. DO I NEED TO BE THERE THE WHOLE TIME WITH GUESTS */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('host-responsibility')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Do I need to be there the whole time if I have guests in the space?</span>
                                <span>{activeAccordion === 'host-responsibility' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'host-responsibility' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <div className="p-3.5 bg-neutral-900 text-white font-medium rounded-xs">
                                        Yes. You are fully responsible for all equipment, asset safety, and room conditions during the entirety of your booking window.
                                    </div>
                                    <div className="space-y-1.5 font-medium text-neutral-800">
                                        <p className="text-neutral-950 font-bold uppercase text-[10px] tracking-wide mb-1">Strict Supervision Directives:</p>
                                        <p>• <strong>Do not leave guests unattended</strong> inside the space at any point.</p>
                                        <p>• <strong>Do not leave the facility doors wide open</strong> or unlocked while completely unattended.</p>
                                    </div>
                                    <div className="space-y-3 border-t border-neutral-100 pt-3">
                                        <p>
                                            If you must step out of the room at any point during your booking, you must contact venue staff immediately so they can come and lock the facility doors securely.
                                        </p>
                                        <p>
                                            We frequently experience situations where hosts depart before their attendees have fully exited, resulting in guests slowly filtering out over time with absolutely nobody cleaning up the space, resetting equipment, or locking down university assets.
                                        </p>
                                        <p>
                                            Similarly, you <strong>cannot</strong> book rooms for unstaffed "drop-in" functions and request doors remain unlocked if a dedicated, responsible organizer is not physically present to supervise the space.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* WHEN ARE BOOKINGS OPEN / AVAILABILITY */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('availability')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>When can I book the space / How far in advance?</span>
                                <span>{activeAccordion === 'availability' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'availability' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <p>
                                        Our spaces are subject to a standard booking lockout until closer to term start. This allows our internal UNSW Founders team to finalise program schedules and secure priority space allocations.
                                    </p>
                                    <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1 text-neutral-800">
                                        <strong className="block uppercase text-[10px] tracking-wide">Lockout dates are as follows:</strong>
                                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-neutral-700">
                                            <li><strong>Term 1 2027</strong> (8 Feb - 28 May): Bookings open from 20 November 2026</li>
                                            <li><strong>Term 2 2027</strong> (24 April - 10 Sept): Bookings open from 23 April 2027</li>
                                            <li><strong>Term 3 2027</strong> (6 Sept - 9 December): Bookings open from 6 August 2027</li>
                                        </ul>
                                    </div>
                                    <p>
                                        Because we receive high-volume booking requests from across the university, spaces are allocated on a <strong>first-come, first-served basis</strong> once lockouts expire.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 6. STORAGE PROTOCOLS */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('storage')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Can I store items in the space before or after my event?</span>
                                <span>{activeAccordion === 'storage' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'storage' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <div className="p-3.5 bg-neutral-900 text-white font-medium rounded-xs">
                                        No. On-site storage is strictly unavailable outside of your booking time.
                                    </div>
                                    <p>
                                        We simply do not have storage facilities to hold your items. The on-site kitchen cupboards and fridge are completely full and restricted to UNSW Founders Staff.
                                    </p>
                                    <p>
                                        All items, banners, and food supplies must arrive with your team at check-in and be completely evacuated at checkout to ensure subsequent bookings can load in seamlessly. Please ensure your caterer can collect all items within your booking window.
                                    </p>
                                    <p>
                                        If you absolutely require exceptional storage arrangements, please contact <a href="mailto:MCIC@unsw.edu.au" className="font-bold text-black underline">MCIC@unsw.edu.au</a> as soon as possible.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 7. FACILITY CONSUMABLES */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('consumables')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Can I use the milk, tea, coffee, soft drinks, paper plates, or cups at the facility?</span>
                                <span>{activeAccordion === 'consumables' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'consumables' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <div className="p-3.5 bg-neutral-900 text-white font-medium rounded-xs">
                                        No. This venue functions under a strict self-service model regarding food, beverages, and event consumables.
                                    </div>
                                    <ul className="list-disc pl-4 space-y-1.5 text-neutral-700 font-medium">
                                        <li>All food items, hot drink stock, and disposable serviceware stored on shelves belong to core Founders programs and cannot be accessed.</li>
                                        <li>Hirers are responsible for bringing all event serviceware including plates, napkins, cups, serving utensils, and cutlery items.</li>
                                        <li>Glassware setups, ceramic mugs and plates, ice buckets and a water dispenser can be added to your booking for an extra fee via the booking form.</li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* 8. HOW DOES CATERING WORK */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('catering-hub')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>How does Catering work?</span>
                                <span>{activeAccordion === 'catering-hub' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'catering-hub' && (
                                <div className="p-6 bg-white text-xs space-y-5 animate-in slide-in-from-top-1 duration-150 text-neutral-700 font-medium leading-relaxed">
                                    <div className="space-y-2 pl-2 border-l-2 border-neutral-200 text-neutral-600 font-normal">
                                        <p><strong>Self-Service:</strong> BYO food, drink, ice and serviceware (plates, napkins, cups, serving utensils, and cutlery items). An urn, water dispenser, glasses, plates, mugs and ice buckets are available for an extra fee via the booking form.</p>
                                        <p><strong>Any Caterer:</strong> No restrictions. You can bring any food or external catering you like.</p>
                                        <p><strong>No Storage:</strong> On-site fridge/cupboards are full. Everything must arrive and leave within your booking window. If you want to keep items cold, please supply your own ice and book the Ice Buckets.</p>
                                        <p><strong>Deliveries:</strong> We will not meet your delivery drivers to collect your order. You must direct and meet your own delivery drivers unless you have paid for casual venue staff (you must select this option in your booking form).</p>
                                        <p><strong>Mandatory Cleanup:</strong> Pack up all leftovers and rubbish immediately on conclusion of your event. Large waste goes to bins in the hallway by the back door of the Design Space. If you do not leave the space clean, you will be charged a cleaning fee ($200 + GST minimum).</p>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide border-b border-neutral-100 pb-2">
                                            Caterers we have seen in the space:
                                        </h4>
                                        <div className="overflow-x-auto border border-neutral-200 rounded-sm">
                                            <table className="w-full text-left text-[10px] text-neutral-600 whitespace-nowrap">
                                                <thead className="bg-neutral-50 border-b border-neutral-200 uppercase font-bold text-neutral-900">
                                                    <tr>
                                                        <th className="p-2.5">Caterer</th>
                                                        <th className="p-2.5">Style</th>
                                                        <th className="p-2.5">Price</th>
                                                        <th className="p-2.5">Notice & Delivery Hours</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-neutral-100 font-normal text-neutral-600">
                                                    {[
                                                        { name: "Mad Toppings", url: "https://madtoppings.com.au", style: "Pizza", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "11am – 11pm Daily" },
                                                        { name: "OOshman", url: "https://ooshman.au", style: "Pizza & Wraps", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "10am – 11:30pm (Late until 2am/3am Thu-Sat)" },
                                                        { name: "Byblos Lebanese Cuisine", url: "https://bybloslebanesecuisine.com.au/", style: "Lebanese & Platters", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "10am – 9pm Mon-Sat (Closed Sun)" },
                                                        { name: "Catering Project", url: "https://www.cateringproject.com.au", style: "Corp Platters", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "7am – 6pm Mon-Fri (9am-4pm Sat, 9am-2pm Sun)" },
                                                        { name: "Foodie Del Mar", url: "http://foodiedelmar.com.au/", style: "Canape & Grazing", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "Flexible delivery timelines upon booking request" },
                                                        { name: "Mama B’s", url: "https://mamabs.com.au", style: "Vegan Specialty", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "7am – 6pm Daily (Order by 12pm cutoff)" },
                                                        { name: "Sals Pizza", url: "https://www.salspizza.com.au", style: "NY Style Pizza", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "11am – 9pm Sun-Wed (Extended until Midnight Thu-Sat)" },
                                                        { name: "The Rusty Rabit", url: "https://therustyrabbit.com.au", style: "Breakfast & Coffee", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "7am – 3:30pm Mon-Fri (8am–3pm Sat-Sun)" },
                                                        { name: "Racha Syrian Kitchen", url: "https://www.rachasyriankitchen.com.au", style: "Middle Eastern", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$$$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "11am – 8:30pm Tue-Sun (Closed Mon) • 1 wk notice for 30+" },
                                                        { name: "Vanilla Blue", url: "https://www.vanillablue.com.au/unsw", style: "Corporate Buffets", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$$$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "6:30am – 6:30pm Mon-Fri (7:30am–2pm Sat)" }
                                                    ].map((v, i) => (
                                                        <tr key={i} className="hover:bg-neutral-50">
                                                            <td className="p-2.5 font-bold text-neutral-900">
                                                                <a href={v.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-neutral-900 inline-flex items-center gap-0.5">
                                                                    {v.name} <span className="text-neutral-400 font-normal text-[8px]">↗</span>
                                                                </a>
                                                            </td>
                                                            <td className="p-2.5">
                                                                <span className={`px-2 py-0.5 text-[9px] font-semibold border rounded-sm ${v.styleBadge}`}>
                                                                    {v.style}
                                                                </span>
                                                            </td>
                                                            <td className="p-2.5">
                                                                <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-sm ${v.priceBadge}`}>
                                                                    {v.price}
                                                                </span>
                                                            </td>
                                                            <td className="p-2.5 text-neutral-500 font-medium">{v.delivery}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="p-3.5 bg-neutral-900 text-white font-medium rounded-xs">
                                        All catering must be delivered inside your specific booking hours. Early drop-offs will be turned away as we have no space to store.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SERVING ALCOHOL & RSA COMPLIANCE */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('alcohol-rsa')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Can I serve alcohol at my event?</span>
                                <span>{activeAccordion === 'alcohol-rsa' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'alcohol-rsa' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <p className="font-medium text-neutral-900">
                                        Yes, serving alcohol is permitted, provided you strictly comply with NSW liquor legislation and UNSW venue safety policies:
                                    </p>

                                    <ul className="space-y-3 text-neutral-700">
                                        <li className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1">
                                            <strong className="text-neutral-900 block uppercase text-[10px] tracking-wide">1. Mandatory RSA Holder & Proof Submission</strong>
                                            <p className="text-neutral-600 text-xs">
                                                Anyone responsible for supervising or serving alcohol must hold a valid <strong>NSW Responsible Service of Alcohol (RSA) Competency Card</strong>. A photocopy of this card must be submitted to venue management prior to your event commencement.
                                            </p>
                                        </li>

                                        <li className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1">
                                            <strong className="text-neutral-900 block uppercase text-[10px] tracking-wide">2. Option to Hire RSA-Certified Venue Staff</strong>
                                            <p className="text-neutral-600 text-xs">
                                                If you or your catering team do not hold an RSA card—or if you prefer not to manage service compliance yourself—you can <strong>hire an RSA-certified MCIC casual staff member</strong> directly via the booking form ($50/hr; 3-hr minimum Mon–Sat, 4-hr minimum Sun/Public Holidays). They will oversee a Gallery / Self-Service Station. You will still be resonsible for providing all alcohol, serviceware, ice etc. and ensuring your guests are of legal drinking age.
                                            </p>
                                        </li>

                                        <li className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1">
                                            <strong className="text-neutral-900 block uppercase text-[10px] tracking-wide">3. Service Models: Bartender vs. Gallery Self-Service</strong>
                                            <div className="space-y-1 text-xs text-neutral-600">
                                                <p>Alcohol can be served in two ways depending on your event setup:</p>
                                                <p>• <strong>Dedicated Bartender Service:</strong> Drinks are actively poured and handed out by an RSA holder.</p>
                                                <p>• <strong>Gallery / Self-Service Station:</strong> Drinks (e.g. wine/beer) can be set out on tables for self-service during exhibitions, networking, or gallery-style events. Under NSW liquor guidelines, an RSA cardholder must still actively oversee the drink station to monitor consumption and prevent underaged access.</p>
                                            </div>
                                        </li>

                                        <li className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1">
                                            <strong className="text-neutral-900 block uppercase text-[10px] tracking-wide">4. Responsible Consumption & Underage Guests</strong>
                                            <p className="text-neutral-600 text-xs">
                                                Food and non-alcoholic beverage options must be freely available whenever alcohol is served. Venue staff reserve the right to immediately suspend alcohol service if RSA documentation is missing, if minors are present without explicit prior safety arrangements, or if unsafe behaviour occurs.
                                            </p>
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>
                        {/* TICKETING & REGISTRATION FAQ */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('ticketing')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>How does event ticketing, registration & fee splitting work?</span>
                                <span>{activeAccordion === 'ticketing' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'ticketing' && (
                                <div className="p-6 bg-white text-xs space-y-5 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">

                                    {/* HIRER SELF-MANAGEMENT */}
                                    <div className="space-y-2 border-b border-neutral-100 pb-3">
                                        <span className="font-bold text-neutral-900 uppercase block text-[11px]">Option 1: Managing Your Own Ticketing (Default)</span>
                                        <p className="text-neutral-700">
                                            By default, event hosts manage their own attendee registration using their preferred ticketing platform (e.g., <strong>Humanitix, Luma, Eventbrite</strong>, or internal web forms). You retain full legal and financial responsibility for managing guest lists, door check-ins, and issuing ticket refunds if your event is cancelled or postponed.
                                        </p>
                                    </div>

                                    {/* VENUE ASSISTED / OFFICIAL TICKETING */}
                                    <div className="space-y-2 border-b border-neutral-100 pb-3">
                                        <span className="font-bold text-neutral-900 uppercase block text-[11px]">Option 2: UNSW Founders / Venue-Managed Ticketing</span>
                                        <p className="text-neutral-700">
                                            Upon request or by mutual agreement, UNSW Founders can assist with managing registration and attendee check-ins through our nominated venue ticketing channels.
                                        </p>
                                    </div>

                                    {/* THREE-WAY MONEY SPLIT EXPLAINED */}
                                    <div className="space-y-3 border-b border-neutral-100 pb-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-neutral-900 uppercase">Paid Events & Fee Breakdown</span>
                                        </div>
                                        <p className="text-neutral-600 text-[11px]">
                                            When UNSW Founders manages ticketing for a paid event, ticket revenues collected from attendees are split to cover platform and venue costs before paying out net earnings to the event host:
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                                            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1">
                                                <span className="font-bold text-neutral-900 uppercase text-[10px] block">1. Platform / Card Fees</span>
                                                <p className="text-neutral-600 text-[10px]">
                                                    Standard processing & booking gateway fees associated with the ticketing software used.
                                                </p>
                                            </div>
                                            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1">
                                                <span className="font-bold text-neutral-900 uppercase text-[10px] block">2. Venue Consignment</span>
                                                <p className="text-neutral-600 text-[10px]">
                                                    A flat <strong>$2.50 (inc. GST)</strong> venue consignment fee applies per ticket for paid tickets priced over $25.00.
                                                </p>
                                            </div>
                                            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1">
                                                <span className="font-bold text-neutral-900 uppercase text-[10px] block">3. Host Net Payout</span>
                                                <p className="text-neutral-600 text-[10px]">
                                                    All remaining net ticket revenue (less any unpaid venue hire or staffing balances) is paid out to the host.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* NEW FAQ: PROMOTION & LOGO USE */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('promotion-branding')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>How can I promote my event / Can I use the MCIC or UNSW logo?</span>
                                <span>{activeAccordion === 'promotion-branding' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'promotion-branding' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <p>
                                        You are welcome to state the physical event location as <strong>"Michael Crouch Innovation Centre, UNSW"</strong> on your promotional materials, flyers, and event listings.
                                    </p>
                                    <p>
                                        UNSW Founders reserves the right to review promotional materials bearing the MCIC or UNSW logo/branding. Materials deemed inaccurate, misleading, or implying official UNSW endorsement without prior written authorization may be requested to be modified or taken down immediately.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 11. CANCELLATION & FEES (UPDATED TO MATCH T&Cs) */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('financial')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Deposit, Overtime, Cleaning & Cancellation Charges</span>
                                <span>{activeAccordion === 'financial' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'financial' && (
                                <div className="p-6 bg-white text-xs space-y-6 animate-in slide-in-from-top-1 duration-150 text-gray-600 font-normal leading-relaxed">

                                    {/* DEPOSIT & BALANCE SCHEDULE */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                                            <span className="font-bold text-neutral-900 uppercase">Deposit & Balance Schedule</span>
                                            <span className="font-mono font-bold bg-neutral-900 text-white px-2 py-0.5 rounded-xs">50% / 50%</span>
                                        </div>
                                        <p>
                                            A <strong>50% deposit</strong> is required upon booking to confirm your reservation. The remaining <strong>50% balance</strong> must be paid no later than <strong>48 hours prior</strong> to the event commencement.
                                        </p>
                                    </div>

                                    {/* OVERTIME RATES */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                                            <span className="font-bold text-neutral-900 uppercase">Overtime Rates</span>
                                            <span className="font-mono font-bold bg-neutral-900 text-white px-2 py-0.5 rounded-xs">$150 / HR</span>
                                        </div>
                                        <p>
                                            A standard 15-minute grace window applies on both ends of your reservation. Extensions exceeding this generate pro-rata penalties based on hourly rate.
                                        </p>
                                    </div>

                                    {/* CLEANING & RESET FEE */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                                            <span className="font-bold text-neutral-900 uppercase">Cleaning & Reset Fee</span>
                                            <span className="font-mono font-bold bg-neutral-900 text-white px-2 py-0.5 rounded-xs">$200 + GST MIN</span>
                                        </div>
                                        <p>
                                            Please leave the space as clean and orderly as you found it. Leaving rubbish, catering waste or promotional clutter will initiate a cleaning fee recovery charge ($200 + GST minimum).
                                        </p>
                                    </div>

                                    {/* CANCELLATION CHARGES */}
                                    <div className="space-y-3">
                                        <div className="border-b border-neutral-100 pb-2">
                                            <span className="font-bold text-neutral-900 uppercase">Cancellation Charges</span>
                                        </div>
                                        <div className="space-y-2">
                                            <p>Cancellations must be filed formally in writing. Charges are dependent on notice timelines:</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                                                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs">
                                                    <span className="block font-sans font-bold text-neutral-900 uppercase text-[9px]">6+ Working Days</span>
                                                    <span className="text-neutral-900 font-bold font-sans">Full Refund / No Fee</span>
                                                </div>
                                                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs">
                                                    <span className="block font-sans font-bold text-neutral-900 uppercase text-[9px]">3 - 5 Working Days</span>
                                                    <span className="text-neutral-900 font-bold font-sans">50% Fee Forfeited</span>
                                                </div>
                                                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs">
                                                    <span className="block font-sans font-bold text-neutral-900 uppercase text-[9px]">Less than 2 Days</span>
                                                    <span className="text-neutral-900 font-bold font-sans">100% Fee Forfeited</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider pt-2 border-t border-neutral-100">
                                        ⚠️ All outstanding balances must be fully resolved before securing future bookings.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 12. BUMP-OUT & VACATING */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('exit')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>My event is finished, how should I leave the space?</span>
                                <span>{activeAccordion === 'exit' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'exit' && (
                                <div className="p-6 bg-white text-xs space-y-5 animate-in slide-in-from-top-1 duration-150 text-gray-600 font-normal leading-relaxed">
                                    <div className="p-3.5 bg-neutral-900 text-white font-medium rounded-xs">
                                        Leave the space as clean as you found it. You must clear out all rubbish and pack away equipment before your end time. Never leave the room without notifying venue staff first.
                                    </div>

                                    <div>
                                        <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide mb-2">Mandatory Checkout Checklist:</h5>
                                        <ul className="list-disc pl-4 space-y-2 text-neutral-600">
                                            <li>Turn off AV displays.</li>
                                            <li>Put everything you took out back in its place. Flag items if you are unsure where they belong.</li>
                                            <li>Use the cleaning supplies provided to wipe tables, benches, and whiteboards.</li>
                                            <li>Load used glasses or mugs straight into the dishwasher (if full, stack neatly inside the sink).</li>
                                            <li>Do not leave food debris in sink drains.</li>
                                            <li>Large boxes (e.g., pizza boxes) must go into the large bins in the Hallway by the back door of the MCIC Design Space.</li>
                                            <li>Lost items can be taken with you, handed to venue staff, or taken to Gate 2 Security.</li>
                                            <li>You may be requested to assist setting up the room for the following event during your pack-up time.</li>
                                            <li>Contact your venue contact to let them know you are ready to depart and need the space locked.</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 13. OTHER CAMPUS & CBD SPACES */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('other-spaces')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>What other spaces can I book on Kensington campus, Paddington, or in the CBD?</span>
                                <span>{activeAccordion === 'other-spaces' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'other-spaces' && (
                                <div className="p-6 bg-white text-xs space-y-6 animate-in slide-in-from-top-1 duration-150 text-gray-600 font-normal leading-relaxed">
                                    <p className="text-gray-600 font-medium">
                                        It can be a real challenge finding suitable spaces on campus! UNSW staff, student groups, and innovation ecosystem members can explore these recommended seminar, meeting, workshop, and event spaces:
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">

                                        {/* INNOVATION HUB STUDIO - PADDINGTON */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Innovation Hub Studio (A104)</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Paddington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Capacity:</strong> 16–20 people</li>
                                                <li><strong>Details:</strong> Managed by UNSW Innovation Hub. Ideal for small to medium workshops.</li>
                                                <li><strong>Contact:</strong> <a href="mailto:innovationhub@unsw.edu.au" className="underline font-bold text-black">innovationhub@unsw.edu.au ↗</a></li>
                                            </ul>
                                        </div>

                                        {/* BOARDROOM - LEVEL 5 LOWY */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Boardroom, Level 5 Lowy (501)</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Capacity:</strong> 18 people</li>
                                                <li><strong>Details:</strong> Belongs to ADA (Arts, Design & Architecture). Nicole Pridham can book on behalf of the UNSW Innovation Ecosystem.</li>
                                                <li><strong>Contact:</strong> <a href="mailto:innovationhub@unsw.edu.au" className="underline font-bold text-black">innovationhub@unsw.edu.au ↗</a></li>
                                            </ul>
                                        </div>

                                        {/* MEETING ROOM - LEVEL 5 LOWY */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Meeting Room, Level 5 Lowy (534)</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Capacity:</strong> 10 people</li>
                                                <li><strong>Details:</strong> ADA room. Best suited for small workshops or team meetings.</li>
                                                <li><strong>Contact:</strong> <a href="mailto:innovationhub@unsw.edu.au" className="underline font-bold text-black">innovationhub@unsw.edu.au ↗</a></li>
                                            </ul>
                                        </div>

                                        {/* HEALTH TRANSLATION HUB */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Health Translation Hub (HTH)</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Spaces:</strong> HTH Seminar Room & Level 5 Meeting Room</li>
                                                <li>
                                                    <strong>Details & Bookings:</strong> Explore options on the <a href="https://www.unsw.edu.au/precincts/rhip/hth/events/seminar-room" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">HTH Seminar Room Page ↗</a>.
                                                </li>
                                            </ul>
                                        </div>

                                        {/* SEMINAR ROOMS */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Campus Seminar Rooms</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Capacity:</strong> Cluster style layout for 36 pax. Built-in self-service AV. Free for staff.</li>
                                                <li>
                                                    <strong>How to Book:</strong> Book via <a href="https://resourcebooker.unsw.edu.au/" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">UNSW Resource Booker ↗</a> (or via <a href="https://my.unsw.edu.au" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">myUNSW ↗</a> under <em>Services for Staff</em>).
                                                </li>
                                            </ul>
                                        </div>

                                        {/* CBD MEETING ROOMS */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">UNSW CBD Campus Rooms</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Sydney CBD</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Capacity:</strong> 6–8 guests for up to 4 hours (Mon–Fri 8am–5pm). Teams AV built-in. Free for staff.</li>
                                                <li><strong>How to Book:</strong> Email <a href="mailto:cbdcampus@unsw.edu.au" className="underline font-bold text-black">cbdcampus@unsw.edu.au ↗</a> or visit the <a href="https://www.unsw.edu.au/estate/campus-development/projects/cbd-campus" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">CBD Campus Info Page ↗</a>.</li>
                                            </ul>
                                        </div>

                                        {/* BUSINESS SCHOOL LOUNGE */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Business School Dean's Lounge</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Details:</strong> Executive meeting space and lounge setup for Business School events.</li>
                                                <li><strong>Link:</strong> <a href="https://www.unsw.edu.au/estate/campus-development/projects/business-school-deans-lounge" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">Business School Lounge Page ↗</a></li>
                                            </ul>
                                        </div>

                                        {/* DESIGN NEXT STUDIO */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Design Next Studio</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Details:</strong> Dedicated design sprint & interdisciplinary teaching space.</li>
                                                <li><strong>Link:</strong> <a href="https://www.designnext.unsw.edu.au/" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">Design Next Studio ↗</a></li>
                                            </ul>
                                        </div>

                                        {/* TEACHING COMMONS */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Teaching Commons</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Details:</strong> Collaborative teaching and staff development environment.</li>
                                                <li><strong>Link:</strong> <a href="https://www.education.unsw.edu.au/teaching/teaching-commons" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">Teaching Commons ↗</a></li>
                                            </ul>
                                        </div>

                                        {/* THE BANK */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">The Bank</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Details:</strong> Specialised space managed by the Health Precincts team.</li>
                                                <li><strong>Contact:</strong> Enquire directly through the UNSW Health Precincts team.</li>
                                            </ul>
                                        </div>

                                        {/* CHANCELLERY MEETING ROOMS */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Chancellery Meeting Rooms</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Details:</strong> High-level executive boardrooms and meeting spaces.</li>
                                                <li><strong>How to Book:</strong> Enquire via Chancellery executive booking staff.</li>
                                            </ul>
                                        </div>

                                        {/* ARC ROUNDHOUSE BOOKINGS */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Arc Roundhouse</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Details:</strong> Large-scale event spaces and main hall bookings (for a cost).</li>
                                                <li><strong>Link:</strong> <a href="https://www.arc.unsw.edu.au/roundhouse/bookings" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">Arc Roundhouse Bookings ↗</a></li>
                                            </ul>
                                        </div>

                                        {/* MAIN CAMPUS VENUES & EVENT SERVICES */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2 sm:col-span-2">
                                            <div className="flex justify-between items-center border-b border-neutral-200 pb-1.5">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">UNSW Venue & Event Services (Central Venues)</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Campus Wide</span>
                                            </div>
                                            <p className="text-neutral-700 text-[11px]">
                                                For major campus venues, large lecture theatres, outdoor lawns, and dedicated event management support, explore options directly through <a href="https://www.venueandeventservices.unsw.edu.au/venues" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">UNSW Venue & Event Services ↗</a>.
                                            </p>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>

                        {/* DO I NEED TO WRITE MY OWN RISK ASSESSMENT */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('riskAssessment')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Do I need to write my own risk assessment for an event in one of your spaces?</span>
                                <span>{activeAccordion === 'riskAssessment' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'riskAssessment' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <p>
                                        No, you do not need to create your own risk assessment for standard events hosted in our facilities.
                                    </p>
                                    <p>
                                        We have an official UNSW risk assessment covering general events within the Michael Crouch Innovation Centre (MCIC) Event Spaces: <strong>Risk Assessment #1120290</strong>.
                                    </p>
                                    <p>
                                        However, if your event involves high-power electrical gear, heavy staging, specialised machinery, or high-risk activities beyond standard event operations, please notify our team prior to your booking so safety compliance can be reviewed.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 14. FIRST AID, SECURITY, EMERGENCY & SAFETY */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('security')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>First Aid, Security, Emergency & Safety</span>
                                <span>{activeAccordion === 'security' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'security' && (
                                <div className="p-6 bg-white text-xs space-y-5 animate-in slide-in-from-top-1 duration-150 text-neutral-700 font-medium leading-relaxed">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                        {/* FIRST AID, INJURY & EVACUATION PROCEDURES (LEFT COLUMN) */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-4 flex flex-col justify-between">
                                            <div className="space-y-4">

                                                {/* FIRST AID & DEFIBRILLATOR LOCATIONS */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
                                                        <span className="font-extrabold text-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                                            <span>🩹</span> First Aid & Defibrillator
                                                        </span>
                                                        <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">
                                                            On-Site
                                                        </span>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <span className="font-bold text-neutral-900 block text-[11px]">First Aid Kits Located:</span>
                                                        <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                            <li>• Wall beside the Computer in Design Space <em>(Red Bag)</em></li>
                                                            <li>• On the Red Cabinet in Founders Place <em>(White Box)</em></li>
                                                            <li>• In UNSW Makerspace beside Ground Floor Event Spaces <em>(White Cabinet)</em></li>
                                                            <li>• In UNSW Founders Level 1 Copy Room <em>(White Cabinet)</em></li>
                                                        </ul>
                                                    </div>

                                                    <div className="p-2.5 bg-red-50/60 border border-red-200/80 rounded-xs text-[11px] text-red-950 mt-2">
                                                        ⚡ <strong>Defibrillator:</strong> Located on Ground Floor at glass doors between Hilmer Building Foyer and hallway behind MCIC Ground Floor Event Spaces.{' '}
                                                        <a href="https://link.mazemap.com/0S4Nxpm9" target="_blank" rel="noopener noreferrer" className="font-bold text-red-700 underline hover:text-red-900 inline-flex items-center gap-0.5">
                                                            View Map Pin ↗
                                                        </a>
                                                    </div>
                                                </div>

                                                {/* IN CASE OF INJURY */}
                                                <div className="space-y-1.5 pt-3 border-t border-neutral-200/60">
                                                    <span className="font-bold text-neutral-900 block text-[10px] uppercase tracking-wider">🩺 In Case of Injury:</span>
                                                    <p className="text-neutral-700 text-[11px]">
                                                        Depending on severity and preference, seek prompt attention via:
                                                    </p>
                                                    <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                        <li>• <strong>First Aid Officer:</strong> Hamish, Tamara or any Makerspace Staff</li>
                                                        <li>• <strong>Ambulance:</strong> Call Security on <a href="tel:0293856666" className="font-mono font-bold text-black underline">9385 6666</a> (or ext <span className="font-mono font-bold">56666</span>)</li>
                                                        <li>• Hospital or nearest medical facility</li>
                                                        <li>• Treating local doctor</li>
                                                    </ul>
                                                </div>

                                                {/* BUILDING EVACUATION */}
                                                <div className="space-y-2 pt-3 border-t border-neutral-200/60">
                                                    <div className="flex justify-between items-center border-b border-neutral-200 pb-1.5">
                                                        <span className="font-extrabold text-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                                            <span>🚨</span> Building Evacuation Protocols
                                                        </span>
                                                    </div>

                                                    <div className="space-y-1.5 text-[11px]">
                                                        <span className="font-bold text-neutral-900 block">Building & Floor Wardens:</span>
                                                        <p className="text-neutral-700">
                                                            Find warden details on <strong>Archibus</strong> under <em>"Emergency Contacts by Building"</em>, or contact Security Ops (<a href="tel:0293856000" className="font-mono font-bold text-black underline">9385 6000</a>) / <a href="mailto:emergency@unsw.edu.au" className="font-mono font-bold text-black underline">emergency@unsw.edu.au</a>.
                                                        </p>
                                                    </div>

                                                    <div className="space-y-1.5 text-[11px]">
                                                        <span className="font-bold text-neutral-900 block">Evacuation Process & Drills:</span>
                                                        <p className="text-neutral-700">
                                                            Follow instructions on <strong>orange A3 posters</strong> displayed throughout the building. Annual drills are conducted to ensure safe exit.
                                                        </p>
                                                    </div>
                                                </div>

                                            </div>

                                            {/* EVACUATION LINK */}
                                            <div className="pt-3 border-t border-neutral-200/60 text-[11px]">
                                                <p className="text-neutral-600">
                                                    Additional information available at:
                                                </p>
                                                <a href="https://www.estate.unsw.edu.au/emergencies" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline hover:text-[#EAD64D]">
                                                    UNSW Emergency & Evacuation Procedures ↗
                                                </a>
                                            </div>
                                        </div>

                                        {/* CAMPUS SECURITY & SAFEZONE APP (RIGHT COLUMN) */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-4 flex flex-col justify-between">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
                                                    <span className="font-extrabold text-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                                        <span>🛡️</span> Campus Security & SafeZone
                                                    </span>
                                                    <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">
                                                        24/7 Gate 2
                                                    </span>
                                                </div>

                                                <p className="text-neutral-700 text-[11px]">
                                                    Security is available <strong>24 hours a day, 7 days a week</strong> at Gate 2 on High Street.
                                                </p>

                                                {/* 24/7 NUMBERS */}
                                                <div className="p-3 bg-white border border-neutral-200/80 rounded-xs space-y-2">
                                                    <span className="font-bold text-neutral-900 block uppercase text-[10px] tracking-wide">24/7 Phone Numbers:</span>
                                                    <div className="space-y-1 text-[11px]">
                                                        <p>
                                                            General Operations: <a href="tel:0293856000" className="font-mono font-bold text-black underline">9385 6000</a>
                                                        </p>
                                                        <p className="text-red-600 font-bold">
                                                            Emergency Line: <a href="tel:0293856666" className="font-mono underline">9385 6666</a>
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* SAFEZONE APP CARD */}
                                                <div className="p-3 bg-white border border-neutral-200/80 rounded-xs space-y-2.5">
                                                    <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase text-[10px] tracking-wide">
                                                        <span>📲</span> SafeZone App
                                                    </div>
                                                    <p className="text-neutral-700 text-[11px]">
                                                        Download the <strong>SafeZone App</strong> to stay connected with safety alerts, emergency assistance, and first aid response on campus.
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

                                                <p className="text-neutral-700 text-[11px]">
                                                    Inquiries: <a href="mailto:security.services@unsw.edu.au" className="font-mono font-bold text-black underline">security.services@unsw.edu.au</a>
                                                </p>
                                            </div>

                                            <div className="pt-3 border-t border-neutral-200/60 text-[11px]">
                                                <p className="text-neutral-600">
                                                    Additional information available at:
                                                </p>
                                                <a href="https://www.estate.unsw.edu.au/protective-services/your-safety" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline hover:text-[#EAD64D]">
                                                    UNSW Protective Services Portal ↗
                                                </a>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}

                            {/* VENUE HIRE TERMS & CONDITIONS */}
                            <div>
                                <button
                                    type="button"
                                    onClick={() => toggleAccordion('terms-conditions')}
                                    className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                                >
                                    <span>Venue Hire Terms & Conditions (T&Cs)</span>
                                    <span>{activeAccordion === 'terms-conditions' ? '−' : '+'}</span>
                                </button>
                                {activeAccordion === 'terms-conditions' && (
                                    <div className="p-6 bg-white text-xs space-y-6 animate-in slide-in-from-top-1 duration-150 text-neutral-700 font-normal leading-relaxed">

                                        {/* TOP ACTION BAR */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-neutral-50 border border-neutral-200 rounded-xs">
                                            <span className="text-[11px] text-neutral-600 font-medium">
                                                By submitting a booking request, hirers agree to abide by all sections of the Venue Hire Agreement outlined below.
                                            </span>
                                            <a
                                                href="/docs/MCIC_Venue_Hire_Terms_and_Conditions.pdf"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-neutral-900 text-white px-3 py-1.5 rounded-xs font-bold uppercase tracking-wider text-[10px] hover:bg-neutral-800 text-center whitespace-nowrap shrink-0"
                                            >
                                                Download PDF ↗
                                            </a>
                                        </div>

                                        {/* FULL UNABBREVIATED AGREEMENT TEXT DISPLAY */}
                                        <div className="space-y-6 border-t border-neutral-100 pt-4 text-neutral-600 text-[11px] font-sans">

                                            <div className="space-y-1 font-mono text-[10px] text-neutral-500 uppercase tracking-wider">
                                                <strong className="text-neutral-900 text-xs block font-sans font-bold">VENUE HIRE AGREEMENT: TERMS & CONDITIONS</strong>
                                                <p><strong>PARTIES:</strong></p>
                                                <p>1. UNSW Founders (ABN 57 195 873 179) of Michael Crouch Innovation Centre, UNSW Sydney, Sydney, NSW 2052</p>
                                                <p>2. "The Hirer"</p>
                                                <p>(together, the "Parties").</p>
                                            </div>

                                            {/* SECTION 1 */}
                                            <div className="space-y-1.5 border-b border-neutral-100 pb-4">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 1. PAYMENT & DEPOSIT SCHEDULE</h5>
                                                <p><strong>1.1 Deposit:</strong> A deposit payment of 50% of the total hire charge is required upon booking to confirm and secure the space reservation.</p>
                                                <p><strong>1.2 Balance Payment:</strong> The remaining 50% balance must be paid no later than 48 hours prior to the event commencement time upon receipt of a tax invoice.</p>
                                                <p><strong>1.3 Failure to Pay:</strong> Failure to settle the deposit or final balance within the required timeframe grants UNSW Founders the right to cancel the booking.</p>
                                                <p><strong>1.4 Cleaning & Reset Surcharges:</strong> If the Hired and Shared Areas are left disorderly, dirty, or requiring furniture resets after the booking window, UNSW Founders reserves the right to recover full cleaning costs at a minimum rate of $200 + GST.</p>
                                                <p><strong>1.5 Casual Staffing Rates:</strong> Event support staff are billed at $50 per hour (minimum 3-hour shift for Mon–Sat; minimum 4-hour shift for Sundays and Public Holidays).</p>
                                                <p><strong>1.6 Staff Overtime:</strong> Overtime beyond 8 hours is charged at 1.5x the base rate ($75/hr). Shifts exceeding 10 hours are charged at double time ($100/hr).</p>
                                            </div>

                                            {/* SECTION 2 */}
                                            <div className="space-y-1.5 border-b border-neutral-100 pb-4">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 2. CANCELLATION, REFUNDS & VENUE VARIATIONS</h5>
                                                <p><strong>2.1 Cancellation Window & Charges (By Hirer):</strong></p>
                                                <div className="pl-4 space-y-1">
                                                    <p><strong>2.1.1 6+ Working Days Notice:</strong> Cancellations received in writing at least 6 working days prior to the event will receive a full refund of all monies paid.</p>
                                                    <p><strong>2.1.2 3 to 5 Working Days Notice:</strong> Cancellations received between 3 and 5 working days prior will forfeit 50% of the total booking fee.</p>
                                                    <p><strong>2.1.3 Less than 2 Working Days Notice:</strong> Cancellations received less than 2 working days prior will forfeit 100% of the total booking fee.</p>
                                                </div>
                                                <p><strong>2.2 Venue Scheduling Conflicts & Emergency Variations (By Venue):</strong></p>
                                                <div className="pl-4 space-y-1">
                                                    <p><strong>2.2.1</strong> UNSW Founders reserves the right to vary, reschedule, or cancel a booking due to emergency facility maintenance, safety concerns, unexpected double-booking, or urgent internal program priorities.</p>
                                                    <p><strong>2.2.2</strong> In such instances, UNSW Founders will provide as much advance notice as reasonably practicable and issue a full (100%) refund of all hire fees paid for that booking.</p>
                                                </div>
                                            </div>

                                            {/* SECTION 3 */}
                                            <div className="space-y-1.5 border-b border-neutral-100 pb-4">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 3. HIRER RESPONSIBILITIES</h5>
                                                <p><strong>3.1 Authorised Purpose:</strong> The Hirer may use the venue only for the specific purpose outlined in the booking agreement and must abide by all venue directives.</p>
                                                <p><strong>3.2 Supervision:</strong> The Hirer must maintain active physical supervision throughout the booking window. Guests and facilities must not be left unattended.</p>
                                                <p><strong>3.3 Damages:</strong> Any damage to the venue, furniture, or AV equipment caused during the hire period is the sole financial responsibility of the Hirer (charged at full replacement cost).</p>
                                                <p><strong>3.4 Entry & Emergency Compliance:</strong> UNSW Founders staff reserve the right to refuse entry to or remove any person from the premises on reasonable safety grounds. Hirers must comply with all emergency personnel instructions and emergency evacuation procedures.</p>
                                            </div>

                                            {/* SECTION 4 */}
                                            <div className="space-y-1.5 border-b border-neutral-100 pb-4">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 4. EQUIPMENT & VENUE USE</h5>
                                                <p><strong>4.1 Equipment Care:</strong> The Hirer accepts full responsibility for the safe operation of all hired items and must restore equipment to its original condition upon conclusion (fair wear and tear excepted).</p>
                                                <p><strong>4.2 Specialised Equipment Notification:</strong> The Hirer must notify UNSW Founders prior to bringing in high-power electrical gear, staging, or specialised heavy equipment so technical staff can review safety compliance. Standard laptops, handheld cameras, personal presentation devices, and small portable items do not require prior notice.</p>
                                                <p><strong>4.3 Prohibited Materials:</strong> Open flames, explosive materials, hazardous chemicals, fuels, and pyrotechnics are strictly prohibited anywhere within or near the venue.</p>
                                                <p><strong>4.4 Asset Egress:</strong> All external props, catering supplies, and personal items must be removed immediately at the conclusion of the booking period.</p>
                                            </div>

                                            {/* SECTION 5 */}
                                            <div className="space-y-1.5 border-b border-neutral-100 pb-4">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 5. CATERING & ALCOHOL</h5>
                                                <p><strong>5.1 Self-Service Catering:</strong> Hirers have full responsibility for organising food and beverages. All food and waste must be cleared away before departure. UNSW Founders reserves the right to reject third-party catering services deemed unsafe or damaging.</p>
                                                <p><strong>5.2 Responsible Service of Alcohol (RSA):</strong> If alcohol is being served, the Hirer or designated server must hold a valid NSW RSA competency card submitted prior to the event. Alcohol must be served responsibly in accordance with NSW legislation. Alternatively, the Hirer may request and hire an RSA-certified UNSW Founders casual staff member at standard casual staffing rates ($50/hr, minimum shift requirements apply). Alcohol service will be refused or suspended if RSA requirements are unfulfilled or if minors are present.</p>
                                            </div>

                                            {/* SECTION 6 */}
                                            <div className="space-y-1.5 border-b border-neutral-100 pb-4">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 6. TICKETING, REGISTRATION & EVENT REVENUE</h5>
                                                <p><strong>6.1 Hirer Ticketing Responsibility:</strong> Unless otherwise agreed in writing, the Hirer manages their own event registration or ticketing via their preferred external platform (e.g., Humanitix, Luma, Eventbrite, or self-hosted forms) and holds sole legal and financial responsibility for guest management and attendee ticket refunds.</p>
                                                <p><strong>6.2 Discretionary Venue & Platform Ticketing Option:</strong> UNSW Founders reserves the right, at its absolute discretion or by mutual written agreement, to manage, execute, or require event ticketing and attendee check-in through UNSW Founders’ nominated ticketing provider or official venue platform. Where UNSW Founders manages or hosts event ticketing:</p>
                                                <div className="pl-4 space-y-1 text-neutral-600">
                                                    <p><strong>6.2.1 Multi-Party Fee & Revenue Distribution:</strong> For paid or ticketed events managed by UNSW Founders, total ticket proceeds collected will be distributed to cover:</p>
                                                    <p className="pl-3">(a) Applicable platform software or transaction processing fees;</p>
                                                    <p className="pl-3">(b) A UNSW Founders venue consignment fee of $2.50 (inc. GST) per ticket sold or distributed for paid tickets priced over $25.00;</p>
                                                    <p className="pl-3">(c) Any outstanding venue hire, staff, or operational fees owed to UNSW Founders under this Agreement;</p>
                                                    <p className="pl-3">(d) Net remaining ticket revenue payable to the Hirer following event conclusion.</p>
                                                    <p><strong>6.2.2 Event Cancellation Refunds:</strong> In the event of event postponement or cancellation, UNSW Founders reserves the right to deduct unrecoverable transaction processing fees and refund attendees directly from collected proceeds.</p>
                                                </div>
                                            </div>

                                            {/* SECTION 7 */}
                                            <div className="space-y-1.5 border-b border-neutral-100 pb-4">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 7. PROMOTION & BRAND PROTECTION</h5>
                                                <p><strong>7.1 Venue Attribution:</strong> The Hirer may use the venue name ("Michael Crouch Innovation Centre") to indicate the physical event location.</p>
                                                <p><strong>7.2 Brand Review Right:</strong> UNSW Founders reserves the right to review any promotional material bearing its name, logo, or venue branding, and may request immediate edits, correction, or withdrawal of materials deemed inaccurate, misleading, or in conflict with university policies.</p>
                                            </div>

                                            {/* SECTION 8 */}
                                            <div className="space-y-1.5 border-b border-neutral-100 pb-4">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 8. SAFETY & INSURANCE</h5>
                                                <p><strong>8.1 Workplace Health & Safety:</strong> Both parties must comply with applicable WHS legislation. Hirers must follow all safety instructions provided by UNSW staff.</p>
                                                <p><strong>8.2 Liability & Indemnity:</strong> The Hirer agrees to hold UNSW Founders indemnified against third-party claims, personal injury, or property loss arising directly from the Hirer’s negligence or event activities.</p>
                                                <p><strong>8.3 Property Insurance:</strong> UNSW Founders is not responsible for loss, theft, or damage to personal or external contractor property brought into the venue.</p>
                                            </div>

                                            {/* SECTION 9 */}
                                            <div className="space-y-1.5">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 9. TERMINATION</h5>
                                                <p><strong>9.1 Termination for Breach:</strong> UNSW Founders may terminate this Agreement immediately if the Hirer breaches terms, fails to settle invoices, or experiences insolvency/administration.</p>
                                                <p><strong>9.2 No Claim Clause:</strong> Upon termination, cancellation, or scheduling variation of this Agreement, the Hirer's sole remedy against UNSW Founders is limited to a refund of hire fees paid (where applicable). The Hirer holds no right or legal claim against UNSW Founders for indirect damages, lost commercial revenue, marketing expenses, or consequential losses.</p>
                                            </div>

                                        </div>
                                    </div>
                                )}
                            </div>                        </div>

                    </div>
                </div>
                {/* THE MAIN FORM WRAPPER TRACK BOX */}
                <form id="booking-form" onSubmit={handleFormSubmit} className="space-y-12">
                    {/* INTENT INTERFACE GATEKEEPER WITH INTEGRATED UNIFIED HEADER */}
                    <section id="booking-intent-section" className="bg-white border border-gray-200 rounded-sm shadow-sm space-y-6 overflow-hidden">

                        {/* INTEGRATED CONDENSED BLACK HEADER BAR */}
                        <div className="bg-neutral-900 text-white p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-extrabold tracking-tight uppercase">Booking Form</h2>
                            </div>
                            <div className="text-[11px] font-medium text-neutral-400 max-w-xs leading-normal sm:text-right">
                                Select an option below to get started.
                            </div>
                        </div>

                        {/* INTENT OPTION SELECT */}
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
                                    className={`p-6 text-left border-2 rounded-sm transition-all duration-200 flex flex-col justify-center min-h-[120px] outline-none relative ${formData.bookingIntent === "I am flexible on date/time and space. I'd like to see all my options."
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
                                        <div className="p-5 border border-neutral-200 bg-neutral-50/50 rounded-sm space-y-4 animate-in slide-in-from-top-3 duration-300">
                                            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="text-sm font-black uppercase tracking-tight text-black">Live Calendar</h4>
                                                    <input
                                                        type="date"
                                                        value={`${selectedCalendarDate.getFullYear()}-${String(selectedCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(selectedCalendarDate.getDate()).padStart(2, '0')}`}
                                                        onChange={(e) => handleDatePickerChange(e.target.value)}
                                                        className="p-1.5 px-2 bg-white border border-neutral-300 rounded-sm font-mono text-xs font-bold text-black outline-none focus:border-black cursor-pointer"
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
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2.5 h-2.5 bg-amber-100 border border-amber-300 rounded-sm block" />
                                                        <span className="text-neutral-600">Held (Unconfirmed)</span>
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

                                            {(() => {
                                                const dayOfWeek = selectedCalendarDate.getDay();
                                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                                                let hasOutsideHoursSelection = false;
                                                if (selectedSlots.length > 0) {
                                                    const parseTimeToMinutes = (tStr) => {
                                                        if (!tStr) return 0;
                                                        let clean = tStr.trim().toLowerCase();
                                                        let isPm = clean.includes('pm');
                                                        let isAm = clean.includes('am');
                                                        clean = clean.replace(/[ap]m/, '');
                                                        const parts = clean.split(':');
                                                        let hrs = parseInt(parts[0], 10) || 0;
                                                        let mins = parseInt(parts[1], 10) || 0;
                                                        if (isPm && hrs < 12) hrs += 12;
                                                        if (isAm && hrs === 12) hrs = 0;
                                                        return hrs * 60 + mins;
                                                    };

                                                    const startLimit = 540;
                                                    const endLimit = 960;

                                                    hasOutsideHoursSelection = selectedSlots.some(slotKey => {
                                                        const timePart = slotKey.split('|')[2];
                                                        const rawStart = timePart.includes(' - ') ? timePart.split(' - ')[0] : timePart;
                                                        const rawEnd = timePart.includes(' - ') ? timePart.split(' - ')[1] : timePart;

                                                        const startMins = parseTimeToMinutes(rawStart);
                                                        const endMins = timePart.includes(' - ') ? parseTimeToMinutes(rawEnd) : startMins + 30;

                                                        return startMins < startLimit || endMins > endLimit;
                                                    });
                                                }

                                                if (isWeekend || hasOutsideHoursSelection) {
                                                    return (
                                                        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-sm text-xs font-bold uppercase tracking-wide flex items-center gap-2 animate-in fade-in duration-200">
                                                            <span>⎋</span> Surcharge Notice: An additional facility or staffing service fee automatically applies to bookings scheduled during weekends or outside regular office operational hours (9:00 AM - 4:00 PM).
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            <div className="border border-gray-200 rounded-sm bg-white shadow-sm overflow-hidden">
                                                <div
                                                    className="overflow-x-auto overflow-y-auto max-h-[480px] scroll-smooth"
                                                    ref={(el) => {
                                                        if (el && !el.dataset.scrolled) {
                                                            const targetRow = el.querySelector('[data-working-hour="true"]');
                                                            if (targetRow) {
                                                                el.scrollTop = targetRow.offsetTop - 60;
                                                                el.dataset.scrolled = "true";
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <table className="w-full text-left border-collapse min-w-[750px]">
                                                        <thead>
                                                            <tr className="bg-neutral-900 text-white text-[10px] font-black uppercase tracking-wider border-b border-neutral-800 sticky top-0 z-20">
                                                                <th className="p-3 w-1/6 bg-neutral-900 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">Timeline</th>
                                                                {[...mockCalendarData.rooms]
                                                                    .sort((a, b) => {
                                                                        if (a.name === "Ground - Entire Space") return -1;
                                                                        if (b.name === "Ground - Entire Space") return 1;
                                                                        if (a.name === "Ground - Design Space") return -1;
                                                                        if (b.name === "Ground - Design Space") return 1;
                                                                        return 0;
                                                                    })
                                                                    .map((room) => (
                                                                        <th key={room.name} className="p-3 text-center border-l border-neutral-800">
                                                                            {room.name}
                                                                        </th>
                                                                    ))
                                                                }
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 font-medium text-xs">
                                                            {mockCalendarData.timeSlots.map((slot, timeIndex) => {
                                                                const isCoreWorkingStartMarker = slot.startsWith('09:') || slot.startsWith('9:');

                                                                return (
                                                                    <tr
                                                                        key={slot}
                                                                        className="hover:bg-neutral-50/50 transition-colors"
                                                                        data-working-hour={isCoreWorkingStartMarker ? "true" : "false"}
                                                                    >
                                                                        <td className="p-3 font-mono font-bold text-neutral-800 tracking-tight bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-neutral-100">
                                                                            {slot && slot.includes(' - ') ? slot.split(' - ')[0] : slot}
                                                                        </td>
                                                                        {[...mockCalendarData.rooms]
                                                                            .sort((a, b) => {
                                                                                if (a.name === "Ground - Entire Space") return -1;
                                                                                if (b.name === "Ground - Entire Space") return 1;
                                                                                if (a.name === "Design Space") return -1;
                                                                                if (b.name === "Design Space") return 1;
                                                                                return 0;
                                                                            })
                                                                            .map((room) => {
                                                                                const dayKeyString = formatDayKey(selectedCalendarDate);
                                                                                const isBlocked = isSlotBlockedByCalendar(room.name, slot);

                                                                                const compositeSlotKey = `${room.name}|${dayKeyString}|${slot}`;
                                                                                const isCurrentlySelected = selectedSlots.includes(compositeSlotKey);

                                                                                const handleSlotClick = (e) => {
                                                                                    if (isBlocked) return;

                                                                                    const hasSelectedOtherRoomSlots = selectedSlots.some(s => !s.startsWith(`${room.name}|${dayKeyString}|`));
                                                                                    let currentActiveSelected = [...selectedSlots];
                                                                                    if (hasSelectedOtherRoomSlots) {
                                                                                        currentActiveSelected = [];
                                                                                    }

                                                                                    if (e.shiftKey && currentActiveSelected.length > 0) {
                                                                                        const extractedSelectedIndices = currentActiveSelected.map(s => {
                                                                                            const sSlot = s.split('|')[2];
                                                                                            return mockCalendarData.timeSlots.indexOf(sSlot);
                                                                                        });

                                                                                        const minIdx = Math.min(...extractedSelectedIndices);
                                                                                        const maxIdx = Math.max(...extractedSelectedIndices);

                                                                                        const startRange = Math.min(timeIndex, minIdx);
                                                                                        const endRange = Math.max(timeIndex, maxIdx);

                                                                                        const newBatch = [];
                                                                                        for (let i = startRange; i <= endRange; i++) {
                                                                                            const loopSlotName = mockCalendarData.timeSlots[i];
                                                                                            const isLoopBlocked = isSlotBlockedByCalendar(room.name, loopSlotName);

                                                                                            if (!isLoopBlocked) {
                                                                                                newBatch.push(`${room.name}|${dayKeyString}|${loopSlotName}`);
                                                                                            }
                                                                                        }

                                                                                        setSelectedSlots(newBatch.filter((v, idx, self) => self.indexOf(v) === idx));
                                                                                        if (typeof setCalendarValidationError === 'function') setCalendarValidationError(false);
                                                                                        return;
                                                                                    }

                                                                                    if (isCurrentlySelected) {
                                                                                        setSelectedSlots(currentActiveSelected.filter(s => s !== compositeSlotKey));
                                                                                    } else {
                                                                                        setSelectedSlots([...currentActiveSelected, compositeSlotKey]);
                                                                                    }
                                                                                    if (typeof setCalendarValidationError === 'function') setCalendarValidationError(false);
                                                                                };

                                                                                return (
                                                                                    <td key={room.name} className="p-1 text-center border-l border-gray-100 min-w-[120px]">
                                                                                        {!isBlocked ? (
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(e) => {
                                                                                                    handleSlotClick(e);
                                                                                                    if (typeof slot === 'string' && slot.includes(' - ')) {
                                                                                                        const [start, end] = slot.split(' - ');
                                                                                                        setFormData(prev => ({ ...prev, bumpIn: start, bumpOut: end }));
                                                                                                    }
                                                                                                }}
                                                                                                className={`w-full py-2 text-[9px] font-black uppercase tracking-wider font-sans border rounded-sm transition-all duration-150 transform active:scale-95 select-none ${isCurrentlySelected
                                                                                                    ? "bg-black border-black text-white shadow-inner scale-[0.98]"
                                                                                                    : "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70"
                                                                                                    }`}
                                                                                            >
                                                                                                {isCurrentlySelected ? "✓ Selected" : "Select"}
                                                                                            </button>
                                                                                        ) : (
                                                                                            <div className="py-2 text-[9px] font-black uppercase tracking-wider font-sans border rounded-sm bg-rose-50 border-rose-200 text-rose-800 opacity-60 cursor-not-allowed select-none">
                                                                                                Booked
                                                                                            </div>
                                                                                        )}
                                                                                    </td>
                                                                                );
                                                                            })
                                                                        }
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {calendarValidationError && (
                                                <div className="p-4 bg-red-50 border border-red-300 text-red-900 rounded-sm text-xs font-bold uppercase tracking-wide flex items-center gap-2 animate-in slide-in-from-top-2">
                                                    ⚠️ {selectedSlots.length === 0 ? "Please select at least one time block to continue." : "Please select time blocks in a continuous, unbroken sequence. Gaps or breaks are not allowed."}
                                                </div>
                                            )}

                                            <div className="pt-4 border-t border-neutral-200/60 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (selectedSlots.length === 0) {
                                                            if (typeof setCalendarValidationError === 'function') {
                                                                setCalendarValidationError(true);
                                                            } else {
                                                                alert("Error: Please select at least one time block before continuing.");
                                                            }
                                                            return;
                                                        }

                                                        const parseTimeToMinutes = (tStr) => {
                                                            if (!tStr) return 0;
                                                            let clean = tStr.trim().toLowerCase();
                                                            let isPm = clean.includes('pm');
                                                            let isAm = clean.includes('am');
                                                            clean = clean.replace(/[ap]m/, '');
                                                            const parts = clean.split(':');
                                                            let hours = parseInt(parts[0], 10) || 0;
                                                            let minutes = parseInt(parts[1], 10) || 0;
                                                            if (isPm && hours < 12) hours += 12;
                                                            if (isAm && hours === 12) hours = 0;
                                                            return hours * 60 + minutes;
                                                        };

                                                        const formatMinutesTo24HStr = (totalMin) => {
                                                            let hours = Math.floor(totalMin / 60);
                                                            let minutes = totalMin % 60;
                                                            let dispH = hours < 10 ? `0${hours}` : hours;
                                                            let dispM = minutes < 10 ? `0${minutes}` : minutes;
                                                            return `${dispH}:${dispM}`;
                                                        };

                                                        const slotIndices = selectedSlots.map(sKey => {
                                                            const sSlot = sKey.split('|')[2];
                                                            return mockCalendarData.timeSlots.indexOf(sSlot);
                                                        }).sort((a, b) => a - b);

                                                        let isContiguous = true;
                                                        for (let i = 0; i < slotIndices.length - 1; i++) {
                                                            if (slotIndices[i + 1] !== slotIndices[i] + 1) {
                                                                isContiguous = false;
                                                                break;
                                                            }
                                                        }

                                                        if (!isContiguous) {
                                                            if (typeof setCalendarValidationError === 'function') {
                                                                setCalendarValidationError(true);
                                                            } else {
                                                                alert("Error: Please select time blocks in a single continuous row without any breaks.");
                                                            }
                                                            return;
                                                        }

                                                        if (typeof setCalendarValidationError === 'function') {
                                                            setCalendarValidationError(false);
                                                        }

                                                        const processedSlots = selectedSlots.map(slotKey => {
                                                            const timePart = slotKey.split('|')[2];
                                                            let startStr = "";
                                                            let endStr = "";

                                                            if (timePart && timePart.includes(' - ')) {
                                                                startStr = timePart.split(' - ')[0].trim();
                                                                endStr = timePart.split(' - ')[1].trim();
                                                                const startMin = parseTimeToMinutes(startStr);
                                                                const endMin = parseTimeToMinutes(endStr);
                                                                return { start24H: formatMinutesTo24HStr(startMin), end24H: formatMinutesTo24HStr(endMin), startMin, endMin };
                                                            } else {
                                                                startStr = timePart ? timePart.trim() : "";
                                                                const startMin = parseTimeToMinutes(startStr);
                                                                const endMin = startMin + 30;
                                                                return { start24H: formatMinutesTo24HStr(startMin), end24H: formatMinutesTo24HStr(endMin), startMin, endMin };
                                                            }
                                                        });

                                                        const startSorted = [...processedSlots].sort((a, b) => a.startMin - b.startMin);
                                                        const earliestStart = startSorted[0].start24H;

                                                        const endSorted = [...processedSlots].sort((a, b) => a.endMin - b.endMin);
                                                        const latestEnd = endSorted[endSorted.length - 1].end24H;

                                                        const formattedDateStr = selectedCalendarDate.toISOString().split('T')[0];

                                                        setFormData(prev => ({
                                                            ...prev,
                                                            bumpInTime: earliestStart,
                                                            bumpOutTime: latestEnd,
                                                            bumpIn: earliestStart,
                                                            bumpOut: latestEnd,
                                                            eventDate: formattedDateStr,
                                                            date: formattedDateStr
                                                        }));

                                                        triggerRevealAllQuestions();
                                                    }}
                                                    className="w-full bg-[#EAD64D] text-black text-center font-black py-4 text-xs uppercase tracking-widest rounded-sm hover:bg-black hover:text-white transition-all duration-200 shadow-sm cursor-pointer"
                                                >
                                                    Continue to Booking Form ↓
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="pt-4 border-t border-neutral-200 text-center sm:text-left animate-in fade-in duration-300">
                                            <p className="text-xs text-neutral-800 font-bold uppercase tracking-wide">Tell us about your event</p>
                                            <p className="text-[11px] text-neutral-400 font-medium mt-0.5">
                                                Complete the details below to see the availability of relevant spaces.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    {showFullForm && (
                        <div id="rest-of-form-marker" className="space-y-12 animate-in fade-in duration-500 slide-in-from-top-4">

                            {/* DYNAMICALLY ORDERED FORM SECTIONS (isCalendarOption vs Flexible) */}
                            {isCalendarOption(formData.bookingIntent) ? (
                                <>
                                    {renderAffiliationSection()}
                                    {renderEventDetailsSection()}
                                    {renderTimesAndRunsheetSection()}
                                    {renderAvAndEquipmentSection()}
                                    {renderCateringSection()}
                                </>
                            ) : (
                                <>
                                    {renderEventDetailsSection()}
                                    {renderTimesAndRunsheetSection()}
                                    {renderAffiliationSection()}
                                    {renderAvAndEquipmentSection()}
                                    {renderCateringSection()}
                                </>
                            )}

                            {/* GENERAL HIRER EVENT SUPPORT & FOCUS */}
                            <section className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
                                <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                                    Event Support & Focus
                                </h3>

                                <div className="space-y-6">
                                    {/* INNOVATION / ENTREPRENEURSHIP DISCOUNT QUESTION */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                                            Does this event have to do with Innovation / Entrepreneurship?
                                        </label>
                                        <p className="text-[11px] text-neutral-500">
                                            Selecting "Yes" applies an automatic discount to your venue hire rate.
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

                                    {/* CASUAL STAFF BOOKING REQUEST */}
                                    <div className="space-y-2 pt-4 border-t border-gray-100">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                                            Would you like to book a casual staff member for event support?
                                        </label>
                                        <p className="text-[11px] text-neutral-500">
                                            Casual staff members are available at $50/hr (3-hour minimum block) to assist with room setup, AV, and guest check-in.
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
                                    </div>

                                    {/* JUDGE / MENTOR SOURCING HELP */}
                                    <div className="space-y-2 pt-4 border-t border-gray-100">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                                            Do you need help to source a judge / mentor for an entrepreneurship related event?
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

                            {/* SPECIALIZED UNSW FOUNDERS INTERNAL STAFF SECTION */}
                            {departmentType === 'UNSW Founders' && (
                                <section className="bg-neutral-900 text-white p-8 border border-neutral-800 rounded-sm shadow-sm space-y-6 animate-in fade-in duration-200">
                                    <div className="border-b border-neutral-800 pb-2 flex justify-between items-center">
                                        <h3 className="text-lg font-extrabold tracking-tight uppercase text-white">
                                            Internal Founders Staff Coordination
                                        </h3>
                                        <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">
                                            Founders Team Only
                                        </span>
                                    </div>

                                    {/* TAMARA PRESENCE REQUIREMENT */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                                            Do you need Tamara present for this event?
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {[
                                                { label: 'Whole Event', val: 'Whole event' },
                                                { label: 'Setup Only', val: 'Setup' },
                                                { label: 'Formalities', val: 'Formalities' },
                                                { label: 'Not at all', val: 'Not at all' }
                                            ].map((option) => (
                                                <button
                                                    key={option.val}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, tamaraPresence: option.val })}
                                                    className={`p-3 text-xs font-bold uppercase rounded-sm border text-center transition-all ${formData.tamaraPresence === option.val
                                                        ? 'bg-[#EAD64D] text-black border-[#EAD64D]'
                                                        : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                                                        }`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* FOUNDERS SERVICEWARE, FOOD & DRINKS REQUIREMENTS */}
                                    <div className="space-y-4 pt-4 border-t border-neutral-800">
                                        <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                                            What serviceware, food & drinks do you need?
                                        </label>

                                        {/* DISPOSABLE VS REUSABLE OPTION */}
                                        <div className="grid grid-cols-2 gap-3 max-w-sm">
                                            {[
                                                { label: 'Throwaway / Disposable', val: 'Throwaway' },
                                                { label: 'Re-usable', val: 'Re-usable' }
                                            ].map((pref) => (
                                                <button
                                                    key={pref.val}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, servicewarePreference: pref.val })}
                                                    className={`p-2.5 text-xs font-bold uppercase rounded-sm border text-center transition-all ${formData.servicewarePreference === pref.val
                                                        ? 'bg-[#EAD64D] text-black border-[#EAD64D]'
                                                        : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                                                        }`}
                                                >
                                                    {pref.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* SUPPLIES & ORDERS CHECKLIST */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                                            {[
                                                { key: 'needWoolworthsOrder', label: 'Woolworths Order (Food, Soft Drink)' },
                                                { key: 'needDanMurphysOrder', label: 'Dan Murphy\'s Order (Wine, Beer, etc.)' },
                                                { key: 'needPlates', label: 'Plates' },
                                                { key: 'needNapkins', label: 'Napkins' },
                                                { key: 'needTongs', label: 'Tongs' },
                                                { key: 'needCutlery', label: 'Cutlery' },
                                                { key: 'needIce', label: 'Ice' }
                                            ].map((item) => (
                                                <label key={item.key} className="flex items-center gap-2.5 p-3 bg-neutral-950 border border-neutral-800 rounded-sm cursor-pointer select-none hover:border-neutral-700">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 accent-[#EAD64D] rounded-sm"
                                                        checked={formData.foundersSupplies?.[item.key] || false}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            foundersSupplies: {
                                                                ...formData.foundersSupplies,
                                                                [item.key]: e.target.checked
                                                            }
                                                        })}
                                                    />
                                                    <span className="text-xs font-bold text-neutral-300">{item.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CASUAL STAFF SCHEDULING & PREFERENCES */}
                                    <div className="space-y-4 pt-4 border-t border-neutral-800">
                                        <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                                            Do you need casual staff assigned?
                                        </label>
                                        <div className="flex gap-4 max-w-xs">
                                            {['Yes', 'No'].map((choice) => (
                                                <button
                                                    key={choice}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, needsFoundersCasualStaff: choice })}
                                                    className={`flex-1 py-2 text-xs font-bold uppercase rounded-sm border transition-all ${formData.needsFoundersCasualStaff === choice
                                                        ? 'bg-[#EAD64D] text-black border-[#EAD64D]'
                                                        : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                                                        }`}
                                                >
                                                    {choice}
                                                </button>
                                            ))}
                                        </div>

                                        {/* EXPANDABLE CASUAL STAFF ENTRIES */}
                                        {formData.needsFoundersCasualStaff === 'Yes' && (
                                            <div className="space-y-4 pt-3 animate-in slide-in-from-top-2 duration-200">
                                                {formData.casualStaffDetails.map((staffRow, idx) => (
                                                    <div key={idx} className="p-4 bg-neutral-950 border border-neutral-800 rounded-sm space-y-3 relative">
                                                        <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                                                            <span className="text-[10px] font-bold uppercase text-[#EAD64D]">
                                                                Casual Staff Shift #{idx + 1}
                                                            </span>
                                                            {formData.casualStaffDetails.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = formData.casualStaffDetails.filter((_, i) => i !== idx);
                                                                        setFormData({ ...formData, casualStaffDetails: updated });
                                                                    }}
                                                                    className="text-red-400 hover:text-red-300 text-xs font-bold cursor-pointer"
                                                                >
                                                                    ✕ Remove
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            <div>
                                                                <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                                                                    Preferred Casual Staff
                                                                </label>
                                                                <select
                                                                    value={staffRow.preferredStaff}
                                                                    onChange={(e) => {
                                                                        const updated = [...formData.casualStaffDetails];
                                                                        updated[idx].preferredStaff = e.target.value;
                                                                        setFormData({ ...formData, casualStaffDetails: updated });
                                                                    }}
                                                                    className="w-full p-2 bg-neutral-900 border border-neutral-700 text-white text-xs font-medium rounded-sm outline-none focus:border-[#EAD64D]"
                                                                >
                                                                    <option value="">-- Select Preferred Staff --</option>
                                                                    {CASUAL_STAFF_LIST.map((name) => (
                                                                        <option key={name} value={name}>{name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div>
                                                                <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                                                                    Shift Start Time
                                                                </label>
                                                                <input
                                                                    type="time"
                                                                    value={staffRow.shiftStart}
                                                                    onChange={(e) => {
                                                                        const updated = [...formData.casualStaffDetails];
                                                                        updated[idx].shiftStart = e.target.value;
                                                                        setFormData({ ...formData, casualStaffDetails: updated });
                                                                    }}
                                                                    className="w-full p-2 bg-neutral-900 border border-neutral-700 text-white text-xs font-medium rounded-sm outline-none focus:border-[#EAD64D]"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                                                                    Shift End Time
                                                                </label>
                                                                <input
                                                                    type="time"
                                                                    value={staffRow.shiftEnd}
                                                                    onChange={(e) => {
                                                                        const updated = [...formData.casualStaffDetails];
                                                                        updated[idx].shiftEnd = e.target.value;
                                                                        setFormData({ ...formData, casualStaffDetails: updated });
                                                                    }}
                                                                    className="w-full p-2 bg-neutral-900 border border-neutral-700 text-white text-xs font-medium rounded-sm outline-none focus:border-[#EAD64D]"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                                                                Task Description / Shift Notes
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. Help set up chairs, check-in attendees at door, manage AV"
                                                                value={staffRow.tasks}
                                                                onChange={(e) => {
                                                                    const updated = [...formData.casualStaffDetails];
                                                                    updated[idx].tasks = e.target.value;
                                                                    setFormData({ ...formData, casualStaffDetails: updated });
                                                                }}
                                                                className="w-full p-2 bg-neutral-900 border border-neutral-700 text-white text-xs font-medium rounded-sm outline-none focus:border-[#EAD64D]"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({
                                                            ...formData,
                                                            casualStaffDetails: [
                                                                ...formData.casualStaffDetails,
                                                                { preferredStaff: '', shiftStart: '', shiftEnd: '', tasks: '' }
                                                            ]
                                                        });
                                                    }}
                                                    className="w-full py-2 bg-neutral-800 text-[#EAD64D] border border-neutral-700 rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-neutral-700 transition-colors cursor-pointer"
                                                >
                                                    + Add Another Casual Staff Shift
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}
                            {/* CONTACTS MANAGEMENT PROFILE */}
                            <section className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
                                <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                                    Contacts
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Primary Booking Contact</h4>
                                        <input type="text" value={formData.mainContact.name} onChange={(e) => setFormData({ ...formData, mainContact: { ...formData.mainContact, name: e.target.value } })} placeholder="Full Name" className="w-full p-3 border border-gray-200 bg-white text-sm font-medium rounded-sm outline-none focus:border-neutral-400 text-black" />
                                        <input type="email" value={formData.mainContact.email} onChange={(e) => setFormData({ ...formData, mainContact: { ...formData.mainContact, email: e.target.value } })} placeholder="Email Address" className="w-full p-3 border border-gray-200 bg-white text-sm font-medium rounded-sm outline-none focus:border-neutral-400 text-black" />
                                        <input type="tel" value={formData.mainContact.phone} onChange={(e) => setFormData({ ...formData, mainContact: { ...formData.mainContact, phone: e.target.value } })} placeholder="Phone Number" className="w-full p-3 border border-gray-200 bg-white text-sm font-medium rounded-sm outline-none focus:border-neutral-400 text-black" />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 block">On the Day Contact</h4>
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    className="w-3.5 h-3.5 border-gray-300 rounded-sm accent-black"
                                                    checked={formData.sameAsMain}
                                                    onChange={(e) => setFormData({ ...formData, sameAsMain: e.target.checked })}
                                                />
                                                <span className="text-[10px] font-bold text-neutral-500 uppercase">Same as Primary Contact</span>
                                            </label>
                                        </div>

                                        {!formData.sameAsMain ? (
                                            <div className="space-y-4 animate-in fade-in duration-200">
                                                <input type="text" value={formData.onDayContact.name} onChange={(e) => setFormData({ ...formData, onDayContact: { ...formData.onDayContact, name: e.target.value } })} placeholder="Full Name" className="w-full p-3 border border-gray-200 bg-white text-sm font-medium rounded-sm outline-none focus:border-neutral-400 text-black" />
                                                <input type="email" value={formData.onDayContact.email} onChange={(e) => setFormData({ ...formData, onDayContact: { ...formData.onDayContact, email: e.target.value } })} placeholder="Email Address" className="w-full p-3 border border-gray-200 bg-white text-sm font-medium rounded-sm outline-none focus:border-neutral-400 text-black" />
                                                <input type="tel" value={formData.onDayContact.phone} onChange={(e) => setFormData({ ...formData, onDayContact: { ...formData.onDayContact, phone: e.target.value } })} placeholder="Phone Number" className="w-full p-3 border border-gray-200 bg-white text-sm font-medium rounded-sm outline-none focus:border-neutral-400 text-black" />
                                            </div>
                                        ) : (
                                            <div className="p-6 bg-neutral-50 border border-gray-200 border-dashed rounded-sm text-center text-xs text-gray-400 font-medium">
                                                Primary contact details will be repurposed on operational event delivery days.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* COMPLIANCE RISK ASSESSMENT ASSIGNMENT */}
                            <section className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
                                <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                                    Risk & Conduct
                                </h3>

                                <div className="space-y-3">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Event Risk Assessment *</label>
                                    <div className="p-4 bg-neutral-50 border border-gray-200 rounded-sm space-y-4">
                                        <p className="text-xs font-bold text-neutral-700">Does this event carry potential risk (e.g., controversial topics, high-profile speakers, opposition metrics) or require security awareness?</p>
                                        <div className="flex gap-4 max-w-xs">
                                            {[
                                                { label: 'Yes', value: true },
                                                { label: 'No', value: false }
                                            ].map((choice) => (
                                                <button
                                                    key={choice.label}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, isHighRisk: choice.value })}
                                                    className={`flex-1 py-2 text-xs font-bold uppercase rounded-sm border transition-all duration-150 hover:scale-[1.02] active:scale-[0.99] ${formData.isHighRisk === choice.value
                                                        ? 'bg-black text-white border-black shadow-sm'
                                                        : 'bg-white border-gray-200 text-neutral-600 hover:bg-neutral-100'
                                                        }`}
                                                >
                                                    {choice.label}
                                                </button>
                                            ))}
                                        </div>

                                        {formData.isHighRisk && (
                                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                                                <p className="text-sm font-medium text-red-800 mb-2">
                                                    ⚠️ Security Situational Awareness Action Required: For events where there is a higher perceived risk, we must proactively advise Security in advance so they have situational awareness and can ensure campus protocols are safely coordinated.
                                                </p>
                                                <textarea
                                                    className="w-full p-2 border border-gray-350 rounded-md bg-white text-black"
                                                    rows={3}
                                                    placeholder="Describe risk mitigation steps..."
                                                    value={formData.riskDetails}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, riskDetails: e.target.value }))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div
                                    id="conduct-policy-block"
                                    className={`p-4 border rounded-sm space-y-4 transition-colors duration-200 mt-4 ${conductError
                                        ? 'border-red-300 bg-red-50/40 text-red-900'
                                        : 'bg-neutral-50 border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 font-bold text-black uppercase tracking-wide text-xs">
                                        Code of Conduct & Terms and Conditions
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed font-normal">
                                        All Hirers and Guests at the Michael Crouch Innovation Centre (MCIC) must abide by the Terms and Conditions of Use and the Campus Policy and Code of Conduct.
                                    </p>
                                    <div className="pt-2 space-y-2">
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
                                            <div className="flex flex-col">
                                                <span className={`text-xs font-bold uppercase tracking-tight ${conductError ? 'text-red-700' : 'text-black'}`}>
                                                    I agree to abide by the Terms and Conditions of Use and Campus Policy Code of Conduct *
                                                </span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </section>

                            {/* REGISTRATIONS INDEPENDENT PORTAL SECTION */}
                            <section className="bg-white p-8 border border-gray-200 rounded-sm shadow-sm space-y-6">
                                <h3 className="text-lg font-extrabold tracking-tight uppercase text-black border-b border-neutral-100 pb-2">
                                    Managing Registrations
                                </h3>

                                <div className="space-y-4 divide-y divide-gray-100">
                                    <div className="pb-4">
                                        <label className="flex items-start gap-3 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 border-gray-300 rounded-sm accent-black mt-0.5"
                                                checked={formData.postToPublicDirectory}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    postToPublicDirectory: e.target.checked,
                                                    ...(e.target.checked ? { useRegistrationPortal: false, hasOwnRegistrationPortal: false } : {})
                                                })}
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-black uppercase">List my Event on MCIC Ticket Page</span>
                                                <span className="text-[11px] text-gray-600 font-medium mt-0.5">Tick this if you want to use our registration portal and have your event listed on our site.</span>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="pt-4 pb-4">
                                        <label className="flex items-start gap-3 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 border-gray-300 rounded-sm accent-black mt-0.5"
                                                checked={formData.useRegistrationPortal}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    useRegistrationPortal: e.target.checked,
                                                    ...(e.target.checked ? { postToPublicDirectory: false, hasOwnRegistrationPortal: false } : {})
                                                })}
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-black uppercase">Create my registration portal but don't list it publicly, this event is invite only.</span>
                                                <span className="text-[11px] text-gray-600 font-medium mt-0.5">Tick this if you want to use our registration portal but do not want your event listed on our site.</span>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="pt-4">
                                        <label className="flex items-start gap-3 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 border-gray-300 rounded-sm accent-black mt-0.5"
                                                checked={formData.hasOwnRegistrationPortal}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    hasOwnRegistrationPortal: e.target.checked,
                                                    ...(e.target.checked ? { postToPublicDirectory: false, useRegistrationPortal: false } : {})
                                                })}
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-black uppercase">I will use my own registration portal</span>
                                                <span className="text-[11px] text-gray-600 font-medium mt-0.5">Tick this if you are managing ticketing/RSVPs using your preferred external site (e.g., Eventbrite, Humanitix). I understand my event will not be listed on the public directory.</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </section>

                            {/* PIPELINE PRICING ENGINE ACTION CORNER */}
                            <div className="bg-neutral-900 text-white p-8 rounded-sm space-y-6">
                                {hasSubmitted ? (
                                    <div className="space-y-4 border-b border-neutral-800 pb-6 animate-in fade-in duration-300">
                                        <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                                <span>✓</span> Estimate Generated
                                            </span>
                                            <span className="text-3xl font-extrabold text-[#EAD64D] font-mono">
                                                ${(quote?.total || 0).toLocaleString()} AUD
                                            </span>
                                        </div>

                                        {/* ITEMIZED QUOTE BREAKDOWN */}
                                        <div className="space-y-2 text-xs font-mono text-neutral-300 bg-neutral-950/80 p-4 border border-neutral-800 rounded-sm">
                                            <div className="flex justify-between items-center text-neutral-400 pb-1 border-b border-neutral-800/60 font-sans">
                                                <span className="uppercase text-[10px] font-bold">Booking Duration</span>
                                                <span className="font-bold text-white">{quote?.rateTier || 'Half Day'} ({quote?.totalHours || 0} hrs)</span>
                                            </div>

                                            <div className="flex justify-between items-center pt-1">
                                                <span className="text-neutral-400">Base Venue Hire:</span>
                                                <span>${quote?.baseVenueFee || 0} AUD</span>
                                            </div>

                                            {quote?.discountPercentage > 0 && (
                                                <div className="flex justify-between items-center text-emerald-400">
                                                    <span>Applied Discount ({quote.discountPercentage}%):</span>
                                                    <span>-${((quote.baseVenueFee || 0) - (quote.discountedVenueFee || 0)).toFixed(0)} AUD</span>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center pt-1 border-t border-neutral-800/40">
                                                <span className="text-neutral-400">Venue Hire (Discounted):</span>
                                                <span className="font-bold text-white">${quote?.discountedVenueFee || 0} AUD</span>
                                            </div>

                                            {quote?.staffFee > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-neutral-400">Staffing ({quote.staffingHours || 0} hrs @ $50/hr):</span>
                                                    <span>${quote.staffFee} AUD</span>
                                                </div>
                                            )}

                                            {quote?.equipmentFee > 0 && (
                                                <div className="flex justify-between items-center text-amber-300">
                                                    <span>Equipment Add-ons:</span>
                                                    <span>${quote.equipmentFee} AUD</span>
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-[11px] text-neutral-400 leading-relaxed uppercase font-mono">
                                            Expression of Interest lodged. Operational parameters have been recorded for team validation.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                                                Quote & Submission Summary
                                            </span>
                                            <p className="text-[11px] text-neutral-400 leading-relaxed">
                                                On submission, an instant itemized estimate will be calculated based on your room selection, booking hours, and selected equipment.
                                            </p>
                                        </div>

                                        {/* FOUNDERS COLLABORATION / DISCOUNT REQUEST CHECKBOX */}
                                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm space-y-2 text-black">
                                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 border-gray-300 rounded-sm accent-black mt-0.5"
                                                    checked={formData.requestFoundersCollaboration || false}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        requestFoundersCollaboration: e.target.checked
                                                    })}
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-black uppercase">
                                                        My Event aligns with the goals of UNSW Founders
                                                    </span>
                                                    <span className="text-[11px] text-gray-700 font-medium mt-0.5 leading-snug">
                                                        Check this box if you would like UNSW Founders to review your application as a potential collaborator and/or offer a discount / waived venue hire fee.
                                                    </span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full bg-[#EAD64D] text-black text-center font-bold py-4 text-sm uppercase tracking-wider rounded-sm hover:bg-white transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                                >
                                    {hasSubmitted ? "Update Submission Request" : "Submit Booking Form"}
                                </button>
                            </div>

                        </div>
                    )}
                </form>
            </div>
        </main>
    );
}