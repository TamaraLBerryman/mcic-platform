import { addDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { sendPlainEmail } from './mail';
import { adminEmails } from './verifyUser';
import { addCalendarDays, sydneyLocalToDate } from './eventReminders';
import { isSiteVenue } from './bookingRules';

const PROMOTION = `Places to promote your event:
- UNSW Events Page: https://www.events.unsw.edu.au/user/login?destination=node/add/event
- Founders Community: https://community.unswfounders.com/c/founders-network/
- Admin net: admin-network@groups.unsw.edu.au`;

export function holdLines(booking) {
    const holds = Array.isArray(booking.tentativeHolds) && booking.tentativeHolds.length
        ? booking.tentativeHolds
        : [{
            space: booking.space,
            bumpInDate: booking.bumpInDate,
            bumpIn: booking.bumpIn,
            eventStart: booking.eventStart,
            eventEnd: booking.eventEnd,
            bumpOut: booking.bumpOut
        }];
    return holds.map((hold, index) => {
        const when = [hold.bumpInDate, hold.bumpIn && hold.bumpOut ? `${hold.bumpIn}–${hold.bumpOut}` : ''].filter(Boolean).join(' ');
        return `Hold ${index + 1}: ${when || 'date to be confirmed'}, ${hold.space || booking.space || 'space to be confirmed'}`;
    }).join('\n');
}

function bookingLink(booking) {
    const origin = booking.siteOrigin || 'http://localhost:3000';
    return `${origin}/my-bookings/${booking.id}`;
}

function eventDate(booking) {
    return booking.bumpInDate || booking.tentativeHolds?.[0]?.bumpInDate || '';
}

export function confirmationText(booking) {
    return [
        `Hello ${booking.mainContact?.name || 'there'},`,
        '',
        `We have received your booking for ${booking.eventName || 'your event'}. It is being reviewed.`,
        '',
        'Please check the date, time, and details below.',
        holdLines(booking),
        '',
        `You can review it here: ${bookingLink(booking)}`,
        'A change or cancellation stays pending until an admin approves it.'
    ].join('\n');
}

export function approvalText(booking) {
    const tentative = Array.isArray(booking.tentativeHolds) && booking.tentativeHolds.length > 1;
    return [
        `Hello ${booking.mainContact?.name || 'there'},`,
        '',
        `Your booking for ${booking.eventName || 'your event'} has been approved.`,
        '',
        'The calendar hold, and the booking details linked below, are your booking confirmation. Please make sure they are correct.',
        holdLines(booking),
        '',
        `Update booking details: ${bookingLink(booking)}`,
        '',
        'Before the event, please:',
        '- Create slides, handouts, and any other materials.',
        '- Arrange a videographer or photographer, and organise any other suppliers or sponsors.',
        '- Promote the event.',
        '',
        PROMOTION,
        tentative ? '\nYou still have more than one hold. Please confirm one date and ask for the others to be removed. A reminder follows after one week, and a final reminder after two weeks.' : ''
    ].filter(Boolean).join('\n');
}

export function weeklyText(booking, registrationCount) {
    const internal = booking.ticketing?.method === 'internal';
    const founders = booking.department === 'UNSW Founders';
    const lines = [
        `Hello ${booking.mainContact?.name || 'there'},`,
        '',
        `Registration update for ${booking.eventName || 'your event'}.`,
        ''
    ];
    if (internal) {
        lines.push(`${registrationCount} ${registrationCount === 1 ? 'person is' : 'people are'} registered on the MCIC platform.`);
    } else {
        lines.push('This booking is not using MCIC ticketing.');
        lines.push('Create tickets on Eventbrite, Luma, Humanitix, or another platform if you have not already.');
    }
    if (founders) {
        lines.push('', 'Founders staff: please add this event to the Comms Planner.');
    }
    lines.push(
        '',
        'Please also:',
        '- Organise your catering, including serviceware.',
        '- Organise suppliers and/or sponsors.',
        '- Make your slides.',
        '- Promote the event.',
        '',
        PROMOTION,
        '',
        `Booking details: ${bookingLink(booking)}`
    );
    return lines.join('\n');
}

export function threeWeeksText(booking) {
    return [
        `Hello ${booking.mainContact?.name || 'there'},`,
        '',
        `${booking.eventName || 'Your event'} is three weeks away.`,
        'Please provide any outstanding information, and update details that have changed.',
        '',
        holdLines(booking),
        '',
        `Review and update the booking: ${bookingLink(booking)}`,
        'Changes are reviewed before they are applied.'
    ].join('\n');
}

export function twoWeeksText(booking) {
    return [
        `Hello ${booking.mainContact?.name || 'there'},`,
        '',
        `Final booking details for ${booking.eventName || 'your event'}. These details are now locked in.`,
        '',
        holdLines(booking),
        '',
        'Please have your slides ready, and make sure catering and serviceware are ordered.',
        'Please organise suppliers and/or sponsors, and promote the event.',
        '',
        PROMOTION,
        '',
        `Booking details: ${bookingLink(booking)}`
    ].join('\n');
}

export function debriefText(booking) {
    const lines = [
        `Hello ${booking.mainContact?.name || 'there'},`,
        '',
        `${booking.eventName || 'Your event'} has finished.`,
        'You may wish to send an email to collect feedback from attendees.',
        'You may wish to write a debrief.'
    ];
    if (isSiteVenue(booking.space)) {
        lines.push(
            '',
            'This event was held in a venue booked through MCIC. Please rate your experience and leave any feedback:',
            `${bookingLink(booking)}#venue-feedback`
        );
    }
    return lines.join('\n');
}

export function tentativeConfirmText(booking) {
    return [
        `Hello ${booking.mainContact?.name || 'there'},`,
        '',
        `You still have more than one hold for ${booking.eventName || 'your event'}.`,
        'Please remove the dates you do not need and confirm the date you want to keep.',
        '',
        holdLines(booking),
        '',
        `Update the booking: ${bookingLink(booking)}`
    ].join('\n');
}

export function tentativeFinalText(booking) {
    return [
        `Hello ${booking.mainContact?.name || 'there'},`,
        '',
        `This is the final reminder for the tentative holds on ${booking.eventName || 'your event'}.`,
        'These holds will be removed unless an admin keeps them.',
        '',
        holdLines(booking),
        '',
        'An admin has been asked to approve the removal.'
    ].join('\n');
}

function morningOn(date, daysBefore) {
    if (!date) return null;
    return sydneyLocalToDate(`${addCalendarDays(date, -daysBefore)}T09:00`);
}

async function markMail(bookingRef, patch) {
    await updateDoc(bookingRef, patch);
}

async function sendAndMark(bookingRef, booking, flag, subject, text, now) {
    const mail = booking.organiserMail || {};
    if (mail[flag]) return 'skipped';
    const attemptAt = mail[`${flag}AttemptAt`];
    if (attemptAt && now.getTime() - new Date(attemptAt).getTime() < 12 * 60 * 60 * 1000) return 'skipped';
    await markMail(bookingRef, { [`organiserMail.${flag}AttemptAt`]: now.toISOString() }).catch(() => {});
    try {
        await sendPlainEmail({
            to: booking.mainContact?.email,
            subject,
            text
        });
        await markMail(bookingRef, { [`organiserMail.${flag}`]: new Date().toISOString(), [`organiserMail.${flag}Error`]: '' });
        return 'sent';
    } catch (error) {
        await markMail(bookingRef, { [`organiserMail.${flag}Error`]: error.message }).catch(() => {});
        return 'failed';
    }
}

export async function dispatchOrganiserEmails(now = new Date()) {
    const snapshot = await getDocs(collection(db, 'bookings'));
    const counts = { sent: 0, skipped: 0, failed: 0 };
    const note = (result) => {
        if (result === 'sent') counts.sent += 1;
        else if (result === 'failed') counts.failed += 1;
        else counts.skipped += 1;
    };

    for (const item of snapshot.docs) {
        const booking = { id: item.id, ...item.data() };
        if (['DECLINED', 'CANCELLED'].includes(booking.status)) continue;
        if (!booking.organiserMail) continue;
        const when = eventDate(booking);
        const mail = booking.organiserMail || {};

        note(await sendAndMark(
            item.ref,
            booking,
            'confirmationSentAt',
            `We are reviewing your booking: ${booking.eventName || 'MCIC booking'}`,
            confirmationText(booking),
            now
        ));

        if (booking.status === 'APPROVED') {
            note(await sendAndMark(
                item.ref,
                booking,
                'approvalSentAt',
                `Your booking is approved: ${booking.eventName || 'MCIC booking'}`,
                approvalText(booking),
                now
            ));
        }

        const eventMorning = morningOn(when, 0);
        const beforeEvent = booking.status === 'APPROVED' && eventMorning && now < eventMorning;
        const week3 = morningOn(when, 21);
        if (beforeEvent && week3 && now >= week3) {
            note(await sendAndMark(item.ref, booking, 'week3SentAt', `Three weeks to go: ${booking.eventName || 'your event'}`, threeWeeksText(booking), now));
        }

        const week2 = morningOn(when, 14);
        if (beforeEvent && week2 && now >= week2) {
            note(await sendAndMark(item.ref, booking, 'week2SentAt', `Your booking details are locked in: ${booking.eventName || 'your event'}`, twoWeeksText(booking), now));
        }

        const debriefAt = when ? sydneyLocalToDate(`${addCalendarDays(when, 1)}T09:00`) : null;
        if (booking.status === 'APPROVED' && debriefAt && now >= debriefAt) {
            note(await sendAndMark(item.ref, booking, 'debriefSentAt', `Please gather feedback: ${booking.eventName || 'your event'}`, debriefText(booking), now));
        }

        if (beforeEvent) {
            const approvedAt = booking.decidedAt ? new Date(booking.decidedAt) : null;
            const lastWeekly = mail.lastWeeklyAt ? new Date(mail.lastWeeklyAt) : null;
            const weekReady = approvedAt && now.getTime() - approvedAt.getTime() >= 7 * 24 * 60 * 60 * 1000;
            const intervalReady = !lastWeekly || now.getTime() - lastWeekly.getTime() >= 7 * 24 * 60 * 60 * 1000;
            const weeklyAttempt = mail.lastWeeklyAttemptAt ? new Date(mail.lastWeeklyAttemptAt) : null;
            const attemptReady = !weeklyAttempt || now.getTime() - weeklyAttempt.getTime() >= 12 * 60 * 60 * 1000;
            if (weekReady && intervalReady && attemptReady) {
                let registrationCount = 0;
                if (booking.ticketing?.method === 'internal' && booking.publicEventSlug) {
                    const registrations = await getDocs(collection(db, 'registrations'));
                    registrationCount = registrations.docs.filter(entry => {
                        const data = entry.data();
                        return data.eventSlug === booking.publicEventSlug && data.status !== 'PENDING_REVIEW' && data.status !== 'DENIED';
                    }).length;
                }
                await markMail(item.ref, { 'organiserMail.lastWeeklyAttemptAt': now.toISOString() }).catch(() => {});
                try {
                    await sendPlainEmail({
                        to: booking.mainContact?.email,
                        subject: `Registration update: ${booking.eventName || 'your event'}`,
                        text: weeklyText(booking, registrationCount)
                    });
                    await markMail(item.ref, { 'organiserMail.lastWeeklyAt': new Date().toISOString(), 'organiserMail.lastWeeklyAtError': '' });
                    counts.sent += 1;
                } catch (error) {
                    await markMail(item.ref, { 'organiserMail.lastWeeklyAtError': error.message }).catch(() => {});
                    counts.failed += 1;
                }
            }
        }

        const holds = Array.isArray(booking.tentativeHolds) ? booking.tentativeHolds : [];
        const cycle = booking.tentativeCycle;
        if (holds.length > 1 && cycle?.startedAt && !cycle.removedAt) {
            const started = new Date(cycle.startedAt);
            const age = now.getTime() - started.getTime();
            const week = 7 * 24 * 60 * 60 * 1000;
            const confirmAttempt = cycle.confirmReminderAttemptAt ? new Date(cycle.confirmReminderAttemptAt) : null;
            if (age >= week && !cycle.confirmReminderSentAt && (!confirmAttempt || now.getTime() - confirmAttempt.getTime() >= 12 * 60 * 60 * 1000)) {
                await markMail(item.ref, { 'tentativeCycle.confirmReminderAttemptAt': now.toISOString() }).catch(() => {});
                try {
                    await sendPlainEmail({
                        to: booking.mainContact?.email,
                        subject: `Please confirm one date: ${booking.eventName || 'your booking'}`,
                        text: tentativeConfirmText(booking)
                    });
                    await markMail(item.ref, { 'tentativeCycle.confirmReminderSentAt': new Date().toISOString() });
                    counts.sent += 1;
                } catch (error) {
                    counts.failed += 1;
                    await markMail(item.ref, { 'tentativeCycle.confirmReminderError': error.message }).catch(() => {});
                }
            }
            const finalAttempt = cycle.finalReminderAttemptAt ? new Date(cycle.finalReminderAttemptAt) : null;
            if (age >= week * 2 && !cycle.finalReminderSentAt && !cycle.removalChangeId && (!finalAttempt || now.getTime() - finalAttempt.getTime() >= 12 * 60 * 60 * 1000)) {
                await markMail(item.ref, { 'tentativeCycle.finalReminderAttemptAt': now.toISOString() }).catch(() => {});
                try {
                    const origin = booking.siteOrigin || 'http://localhost:3000';
                    const change = await addDoc(collection(db, 'bookingChanges'), {
                        bookingId: booking.id,
                        requesterEmail: booking.mainContact?.email || '',
                        requesterName: booking.mainContact?.name || '',
                        type: 'REMOVE_TENTATIVE_HOLDS',
                        status: 'PENDING',
                        message: `Two weeks have passed. Approve to delete these tentative holds, or decline to keep them and restart the one-week and two-week reminders.\n\n${holdLines(booking)}`,
                        before: { eventName: booking.eventName, bumpInDate: booking.bumpInDate, bumpIn: booking.bumpIn, bumpOut: booking.bumpOut, space: booking.space },
                        requested: null,
                        createdAt: new Date().toISOString()
                    });
                    const reviewUrl = `${origin}/admin/changes?id=${change.id}`;
                    await sendPlainEmail({
                        to: booking.mainContact?.email,
                        subject: `Final reminder: tentative holds for ${booking.eventName || 'your booking'}`,
                        text: tentativeFinalText(booking)
                    }).catch(() => {});
                    await sendPlainEmail({
                        to: adminEmails(),
                        subject: `Approve removal of tentative holds: ${booking.eventName || 'MCIC booking'}`,
                        text: `Tentative holds for ${booking.eventName || 'a booking'} have reached two weeks.\n\n${holdLines(booking)}\n\nApprove removal to delete them, or decline to keep them. If you decline, the reminders start again from today.\n\nReview: ${reviewUrl}`
                    }).catch(() => {});
                    await markMail(item.ref, {
                        'tentativeCycle.finalReminderSentAt': new Date().toISOString(),
                        'tentativeCycle.removalChangeId': change.id
                    });
                    counts.sent += 1;
                } catch (error) {
                    counts.failed += 1;
                    await markMail(item.ref, { 'tentativeCycle.finalReminderError': error.message }).catch(() => {});
                }
            }
        }
    }

    return counts;
}
