// ==========================================
// MCIC VENUE PRICING & QUOTING ENGINE (FULLY DYNAMIC & TAX INCLUSIVE)
// ==========================================

// SINGLE SOURCE OF TRUTH FOR VENUE INCLUSIONS ($0 / INCLUDED NATIVELY)
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
        'Covered Outdoor Walkway outside MCIC Event & Design Spaces',
        '1x Portable PA Speaker & Wireless Handheld Microphone',
        'High networking tables & outdoor registration area'
    ],
    'MCIC Ground - AI Makerspace': [
        'Our AI Makerspace is a space to test and refine AI technologies. It includes workstations and a supercomputer for AI research and development.'
    ]
};

function parseTimeToHours(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes || 0) / 60;
}

export function calculateTotalBookingHours(bumpIn, bumpOut, eventStart, eventEnd) {
    const start = parseTimeToHours(bumpIn || eventStart);
    const end = parseTimeToHours(bumpOut || eventEnd);
    if (end <= start) return 0;
    return end - start;
}

export function calculateStaffingHours(bumpIn, bumpOut, eventStart, eventEnd, isWeekend = false, userRequestedCasualStaff = false, minHours = 3) {
    const start = parseTimeToHours(bumpIn || eventStart);
    const end = parseTimeToHours(bumpOut || eventEnd);

    if (end <= start) return 0;

    const afterHoursMorning = Math.max(0, Math.min(16, 9) - start);
    const afterHoursEvening = Math.max(0, end - Math.max(9, 16));
    const afterHoursDuration = afterHoursMorning + afterHoursEvening;

    const requiresAfterHoursStaff = isWeekend || afterHoursDuration > 0;

    if (requiresAfterHoursStaff || userRequestedCasualStaff) {
        const totalDuration = end - start;
        const requiredHours = requiresAfterHoursStaff ? Math.max(afterHoursDuration, totalDuration) : totalDuration;
        return Math.max(minHours, Math.ceil(requiredHours));
    }

    return 0;
}

export function calculateQuote(formData, dynamicVenues = [], dynamicItems = [], dynamicSettings = {}) {
    if (!formData) return null;

    const staffRate = dynamicSettings.staffHourlyRate || 50;
    const staffMinHours = dynamicSettings.staffMinHours || 3;
    const taxRate = dynamicSettings.taxRate || 0.10;

    const selectedSpaceName = formData.space || 'MCIC Ground - Event Space';
    const venueDoc = dynamicVenues.find(v => v.name === selectedSpaceName) || {};

    const totalHours = calculateTotalBookingHours(
        formData.bumpIn, formData.bumpOut, formData.eventStart, formData.eventEnd
    );
    const isFullDay = totalHours > 4;

    const baseVenueFee = isFullDay
        ? (venueDoc.fullDayRate || 0)
        : (venueDoc.halfDayRate || 0);

    // UNSW Founders Internal & Founders Collaboration are 100% Free (1.0 discount)
    let discountPercentage = 0;
    const isFoundersInternal =
        formData.department === 'UNSW Founders' ||
        formData.userType === 'UNSW Founders' ||
        (formData.userType === 'Internal to UNSW' && formData.department === 'UNSW Founders');

    if (isFoundersInternal || formData.requestFoundersCollaboration) {
        discountPercentage = 1.0;
    } else if (
        formData.department === 'Research and Enterprise Division' ||
        formData.unswDivision === 'Research and Enterprise Division'
    ) {
        discountPercentage = 0.5;
    }

    const lineItems = [];

    // Line Item 1: Venue Hire
    if (baseVenueFee > 0) {
        const venueDiscount = baseVenueFee * discountPercentage;
        lineItems.push({
            description: `${selectedSpaceName} (${isFullDay ? 'Full Day >4hrs' : 'Half Day <=4hrs'})`,
            quantity: 1,
            unitPrice: baseVenueFee,
            total: baseVenueFee - venueDiscount,
            discount: venueDiscount
        });
    }

    // Line Item 2: Staffing
    const staffingHours = calculateStaffingHours(
        formData.bumpIn, formData.bumpOut, formData.eventStart, formData.eventEnd,
        formData.isWeekend, formData.requestCasualStaff, staffMinHours
    );

    if (staffingHours > 0) {
        const staffDiscount = isFoundersInternal ? staffingHours * staffRate : 0;
        lineItems.push({
            description: `Event Staffing (${staffingHours} hrs @ $${staffRate}/hr)`,
            quantity: staffingHours,
            unitPrice: staffRate,
            total: (staffingHours * staffRate) - staffDiscount,
            discount: staffDiscount
        });
    }

    // Line Item 3: Equipment Add-ons (Driven directly from item freeInclusionSpaces)
    const avData = formData.av || {};

    Object.keys(avData).forEach(itemKey => {
        const val = avData[itemKey];
        if (!val || isFoundersInternal) return;

        const dbItem = dynamicItems.find(i => (i.id === itemKey || i.name === itemKey || i.key === itemKey)) || {};
        let unitPrice = dbItem.costPerDay || 0;
        let qty = typeof val === 'number' ? val : 1;

        // Check if item's freeInclusionSpaces array includes selectedSpaceName
        const freeSpaces = dbItem.freeInclusionSpaces || [];
        if (Array.isArray(freeSpaces) && freeSpaces.includes(selectedSpaceName)) {
            unitPrice = 0;
        }

        if (unitPrice > 0) {
            lineItems.push({
                description: dbItem.name || itemKey,
                quantity: qty,
                unitPrice,
                total: unitPrice * qty,
                discount: 0
            });
        }
    });

    // Total Calculation (GST INCLUDED IN PRICE)
    const totalDue = lineItems.reduce((acc, item) => acc + item.total, 0);
    const taxIncluded = totalDue - (totalDue / (1 + taxRate));
    const subtotalExcludingTax = totalDue - taxIncluded;

    return {
        lineItems,
        subtotalExcludingTax,
        taxIncluded,
        totalDue,
        discountPercentage: discountPercentage * 100
    };
}