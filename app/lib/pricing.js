// ==========================================
// MCIC VENUE PRICING & QUOTING ENGINE
// ==========================================

// Base Space Hire Rates (Half Day <= 4 hrs | Full Day > 4 hrs)
export const VENUE_RATES = {
    'MCIC Ground - Entire Space': { halfDay: 1000, fullDay: 2000 },
    'MCIC Ground - Event Space': { halfDay: 500, fullDay: 1100 },
    'MCIC Ground - Design Space': { halfDay: 400, fullDay: 1000 },
    'MCIC Level 1 - Founders Place': { halfDay: 500, fullDay: 1100 },
    'MCIC Level 1 - Group Study': { halfDay: 200, fullDay: 400 }
};

// EQUIPMENT & ADD-ON PRICE MATRIX (AUD)
export const EQUIPMENT_PRICES = {
    // DISPLAYS & TECH
    portableStandingTv: 60,     // $60 each
    ipad: 50,                   // $50 per iPad
    spareLaptop: 50,            // $50 per laptop
    micWithPortableSpeaker: 80, // $80 flat fee
    videoRecordingPerHour: 500, // $500/hr (1x 4K Camcorder, Tech Staff, HD Rec, Hybrid)
    livestreamPerHour: 800,     // $800/hr (2x 4K Camcorder, Direct YouTube Stream)

    // FURNITURE & WHITEBOARDS
    standingWhiteboards: 100,   // $100 for all (flat fee when selected)
    lecternPortable: 50,        // $50 flat fee
    registrationTable: 0,       // $0

    // CATERING SETUP & SERVICEWARE
    cateringStandingTables: 0,  // $0
    urnHotWater: 50,            // $50
    waterDispenser: 20,         // $20
    servingTongs: 20,           // $20 (includes platter boards)
    iceBuckets: 20,             // $20
    glasses: 60,                // $60 flat set fee
    plates: 50,                 // $50 flat set fee
    mugs: 50,                   // $50 flat set fee

    // ROOM-DEPENDENT ITEMS ($0 in Entire Space & Event Space; $100 in other rooms)
    networkingHighTables: 100,
    couchesCoffeeTables: 100,
    loungesCoffeeTable: 100,
    stage: 100
};

/**
 * Converts "HH:MM" string to decimal hours (e.g. "09:30" -> 9.5)
 */
function parseTimeToHours(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes || 0) / 60;
}

/**
 * Calculates total billable booking hours including Bump-In and Bump-Out
 */
export function calculateTotalBookingHours(bumpIn, bumpOut, eventStart, eventEnd) {
    const start = parseTimeToHours(bumpIn || eventStart);
    const end = parseTimeToHours(bumpOut || eventEnd);

    if (end <= start) return 0;
    return end - start;
}

/**
 * Calculates required after-hours / weekend staffing hours ($50/hr, 3-hr min block)
 */
export function calculateStaffingHours(bumpIn, bumpOut, eventStart, eventEnd, isWeekend = false, userRequestedCasualStaff = false) {
    const start = parseTimeToHours(bumpIn || eventStart);
    const end = parseTimeToHours(bumpOut || eventEnd);

    if (end <= start) return 0;

    // Standard office hours: 9:00 AM to 4:00 PM on weekdays
    const afterHoursMorning = Math.max(0, Math.min(16, 9) - start);
    const afterHoursEvening = Math.max(0, end - Math.max(9, 16));
    const afterHoursDuration = afterHoursMorning + afterHoursEvening;

    const requiresAfterHoursStaff = isWeekend || afterHoursDuration > 0;

    if (requiresAfterHoursStaff || userRequestedCasualStaff) {
        const totalDuration = end - start;
        const requiredHours = requiresAfterHoursStaff ? Math.max(afterHoursDuration, totalDuration) : totalDuration;
        return Math.max(3, Math.ceil(requiredHours));
    }

    return 0;
}

/**
 * Calculates equipment fees including venue-dependent free inclusions
 */
export function calculateEquipmentFee(avData = {}, selectedSpace = '') {
    let fee = 0;

    // Rooms where High Tables, Lounge Area, and Stage are $0 inclusions
    const isGroundMainSpace =
        selectedSpace === 'MCIC Ground - Entire Space' ||
        selectedSpace === 'MCIC Ground - Event Space';

    Object.keys(avData).forEach((key) => {
        const val = avData[key];
        if (!val) return;

        // Room-dependent $0 inclusions
        if (['networkingHighTables', 'couchesCoffeeTables', 'loungesCoffeeTable', 'stage'].includes(key)) {
            if (!isGroundMainSpace) {
                fee += 100;
            }
            return;
        }

        // Flat fee for whiteboards bundle ($100 flat regardless of count > 0)
        if (key === 'standingWhiteboards') {
            if (val > 0 || val === true) fee += 100;
            return;
        }

        // Recording & Livestream hourly pricing
        if (key === 'videoRecording' && val) {
            const hours = avData.recordingHours || 1;
            fee += EQUIPMENT_PRICES.videoRecordingPerHour * hours;
            return;
        }

        if (key === 'livestream' && val) {
            const hours = avData.livestreamHours || 1;
            fee += EQUIPMENT_PRICES.livestreamPerHour * hours;
            return;
        }

        // Per-unit or flat items
        const itemPrice = EQUIPMENT_PRICES[key] || 0;
        if (typeof val === 'boolean' && val) {
            fee += itemPrice;
        } else if (typeof val === 'number' && val > 0) {
            // Per-unit multiplier (e.g., 2 TVs * $60 = $120)
            fee += itemPrice * val;
        }
    });

    return fee;
}

/**
 * Master Quote Calculator Function
 */
export function calculateQuote(formData) {
    if (!formData) {
        return {
            totalHours: 0,
            rateTier: 'Half Day',
            baseVenueFee: 0,
            discountPercentage: 0,
            discountedVenueFee: 0,
            staffingHours: 0,
            staffFee: 0,
            equipmentFee: 0,
            total: 0
        };
    }

    const space = formData.space || 'MCIC Ground - Event Space';
    const spaceRates = VENUE_RATES[space] || VENUE_RATES['MCIC Ground - Event Space'];

    // 1. Calculate Booking Duration & Tier
    const totalHours = calculateTotalBookingHours(
        formData.bumpIn,
        formData.bumpOut,
        formData.eventStart,
        formData.eventEnd
    );

    const isFullDay = totalHours > 4;
    let baseVenueFee = isFullDay ? spaceRates.fullDay : spaceRates.halfDay;
    if (totalHours === 0) baseVenueFee = 0;

    // 2. Affiliation & Collaboration Discounts
    let discountPercentage = 0; // External = 0%

    if (formData.department === 'UNSW Founders' || formData.userType === 'UNSW Founders') {
        discountPercentage = 1.0; // 100% FREE
    } else if (
        formData.department === 'Research and Enterprise Division' ||
        formData.unswDivision === 'Research and Enterprise Division'
    ) {
        discountPercentage = 0.5; // 50% discount
    } else if (formData.requestFoundersCollaboration) {
        discountPercentage = 0.5; // 50% provisional discount
    }

    const discountedVenueFee = baseVenueFee * (1 - discountPercentage);

    // 3. Staffing Charges ($50/hr, 3-hr min block)
    const staffingHours = calculateStaffingHours(
        formData.bumpIn,
        formData.bumpOut,
        formData.eventStart,
        formData.eventEnd,
        formData.isWeekend,
        formData.requestCasualStaff
    );
    const staffFee = staffingHours * 50;

    // 4. Calculate Equipment Add-ons Fee
    const equipmentFee = calculateEquipmentFee(formData.av || {}, space);

    // 5. Total
    const total = discountedVenueFee + staffFee + equipmentFee;

    return {
        totalHours,
        rateTier: isFullDay ? 'Full Day (> 4 hrs)' : 'Half Day (<= 4 hrs)',
        baseVenueFee,
        discountPercentage: discountPercentage * 100,
        discountedVenueFee,
        staffingHours,
        staffFee,
        equipmentFee,
        total
    };
}