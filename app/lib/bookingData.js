// lib/bookingData.js

export const SHARED_EQUIPMENT_MASTER = [
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

export const ROOM_INCLUSIONS = {
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
        '2x Front of Room Ceiling hanging TV Screens',
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
        'Covered Outdoor Walkway outside MCIC Event & Design Spaces'
    ],
    'MCIC Ground - AI Makerspace': [
        'Our AI Makerspace is a space to test and refine AI technologies.'
    ]
};

export const CASUAL_STAFF_LIST = [
    "Ivara", "Henry", "Wonyoung", "Hanisha", "Hudson", "Harry", "Luka",
    "Julian", "Reuben", "William", "Sarah", "Julie", "Aryan", "Shetal",
    "Thomas", "Alex", "Sam", "Victoria", "Rita", "Chiragm", "Lucas", "Armin", "Nicole"
];

export const generate24HoursTimeSlots = () => {
    const slots = [];
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        slots.push(`${hour}:00`, `${hour}:30`);
    }
    return slots;
};