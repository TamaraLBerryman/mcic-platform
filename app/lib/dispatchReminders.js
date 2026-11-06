import { collection, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { parseReminderSendAt, sydneyLocalToDate } from './eventReminders';
import { sendReminderEmail } from './tickets';

export async function dispatchDueReminders(now = new Date()) {
    const eventsSnapshot = await getDocs(query(collection(db, 'publicEvents'), where('status', '==', 'APPROVED')));
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const eventDoc of eventsSnapshot.docs) {
        const event = eventDoc.data();
        const config = event.emailReminders;
        if (!config?.enabled || !Array.isArray(config.reminders) || !event.slug) continue;

        const eventStart = sydneyLocalToDate(
            event.eventDate && event.eventStart ? `${event.eventDate}T${event.eventStart}` : ''
        );
        if (eventStart && now >= eventStart) continue;

        const registrations = await getDocs(query(collection(db, 'registrations'), where('eventSlug', '==', event.slug)));

        for (const reminder of config.reminders) {
            const subject = String(reminder.subject || '').trim();
            const body = String(reminder.body || '').trim();
            const sendAt = parseReminderSendAt(reminder.sendAt);
            if (!subject || !body || !sendAt || sendAt > now) {
                skipped += 1;
                continue;
            }

            for (const registrationDoc of registrations.docs) {
                const registration = registrationDoc.data();
                const email = registration.answers?.email;
                const standing = registration.status || 'REGISTERED';
                if (!email || registration.remindersSent?.[reminder.id]) continue;
                if (standing !== 'REGISTERED' && standing !== 'ATTENDED') continue;

                const createdAt = registration.createdAt ? new Date(registration.createdAt) : null;
                if (createdAt && !Number.isNaN(createdAt.getTime()) && createdAt > sendAt) continue;

                try {
                    await sendReminderEmail({ to: email, subject, body });
                    await updateDoc(registrationDoc.ref, {
                        [`remindersSent.${reminder.id}`]: new Date().toISOString()
                    });
                    sent += 1;
                } catch (error) {
                    failed += 1;
                    await updateDoc(registrationDoc.ref, {
                        [`reminderErrors.${reminder.id}`]: error.message
                    }).catch(() => {});
                }
            }
        }
    }

    return { sent, skipped, failed };
}
