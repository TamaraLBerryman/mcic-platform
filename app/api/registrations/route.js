import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sendPlainEmail } from '../../lib/mail';
import { adminEmails, emailFromRequest } from '../../lib/verifyUser';
import { canRunDoor } from '../../lib/doorAccess';
import { createTicketCode, sendTicketEmail, ticketQrDataUrl } from '../../lib/tickets';

function clean(value) {
    return String(value || '').trim();
}

function registrationView(id, data, qrDataUrl) {
    return {
        id,
        eventSlug: data.eventSlug,
        eventTitle: data.eventTitle,
        eventDate: data.eventDate || '',
        eventStart: data.eventStart || '',
        eventEnd: data.eventEnd || '',
        ticketCode: data.ticketCode,
        status: data.status,
        attendedAt: data.attendedAt || null,
        createdAt: data.createdAt,
        emailSent: Boolean(data.emailSent),
        emailError: data.emailError || '',
        answers: data.answers || {},
        qrDataUrl: qrDataUrl || ''
    };
}

export async function GET(request) {
    const params = new URL(request.url).searchParams;
    const eventSlug = clean(params.get('eventSlug'));
    const ticketCode = clean(params.get('code')).toUpperCase();

    try {
        if (ticketCode) {
            const snapshot = await getDocs(query(collection(db, 'registrations'), where('ticketCode', '==', ticketCode)));
            if (snapshot.empty) {
                return Response.json({ success: false, error: 'Ticket not found.' }, { status: 404 });
            }
            const item = snapshot.docs[0];
            const data = item.data();
            const held = data.status === 'PENDING_REVIEW' || data.status === 'DENIED';
            const qrDataUrl = held ? '' : await ticketQrDataUrl(data.ticketCode);
            return Response.json({ success: true, registration: registrationView(item.id, data, qrDataUrl) });
        }

        if (!eventSlug) {
            return Response.json({ success: false, error: 'An event slug or ticket code is required.' }, { status: 400 });
        }

        const email = await emailFromRequest(request);
        if (!(await canRunDoor(email, eventSlug))) {
            return Response.json({ success: false, error: 'Door check-in is for the event organiser, Founders staff, or casual staff.' }, { status: 403 });
        }

        const snapshot = await getDocs(query(collection(db, 'registrations'), where('eventSlug', '==', eventSlug)));
        const registrations = snapshot.docs
            .filter(item => item.data().status !== 'PENDING_REVIEW' && item.data().status !== 'DENIED')
            .map(item => registrationView(item.id, item.data()))
            .sort((a, b) => {
                const left = `${a.answers.lastName || ''} ${a.answers.firstName || ''}`.toLowerCase();
                const right = `${b.answers.lastName || ''} ${b.answers.firstName || ''}`.toLowerCase();
                return left.localeCompare(right);
            });
        return Response.json({ success: true, registrations });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const answers = {
            firstName: clean(body.firstName),
            lastName: clean(body.lastName),
            email: clean(body.email).toLowerCase(),
            phone: clean(body.phone),
            zid: clean(body.zid),
            questionGoal: clean(body.questionGoal),
            affiliations: Array.isArray(body.affiliations) ? body.affiliations : [],
            faculties: Array.isArray(body.faculties) ? body.faculties : [],
            genderIdentity: clean(body.genderIdentity),
            genderSelfDescribe: clean(body.genderSelfDescribe),
            dietary: Array.isArray(body.dietary) ? body.dietary : [],
            accessibilityNeeds: clean(body.accessibilityNeeds)
        };

        if (!answers.firstName || !answers.lastName || !answers.email || !answers.phone) {
            return Response.json({ success: false, error: 'Name, email, and mobile number are required.' }, { status: 400 });
        }
        if (!answers.email.includes('@')) {
            return Response.json({ success: false, error: 'Enter a valid email address.' }, { status: 400 });
        }
        if (answers.affiliations.length === 0) {
            return Response.json({ success: false, error: 'Choose at least one affiliation.' }, { status: 400 });
        }

        const eventSlug = clean(body.eventSlug);
        const eventTitle = clean(body.eventTitle) || 'MCIC Event';
        if (!eventSlug) {
            return Response.json({ success: false, error: 'This registration is missing an event.' }, { status: 400 });
        }

        const existingSnapshot = await getDocs(query(collection(db, 'registrations'), where('eventSlug', '==', eventSlug)));
        const existing = existingSnapshot.docs.find(item => (item.data().answers?.email || '') === answers.email);

        const origin = new URL(request.url).origin;
        const banSnapshot = await getDocs(collection(db, 'bans'));
        const ban = banSnapshot.docs.find((entry) => String(entry.data().email || '').trim().toLowerCase() === answers.email);
        const banRecord = ban ? { id: ban.id, ...ban.data() } : null;
        let record;
        let registrationId;

        if (existing) {
            registrationId = existing.id;
            record = existing.data();
            if (record.status === 'PENDING_REVIEW' || record.status === 'DENIED') {
                return Response.json({
                    success: true,
                    pendingReview: record.status === 'PENDING_REVIEW',
                    notConfirmed: record.status === 'DENIED',
                    registration: registrationView(registrationId, record, '')
                });
            }
        } else if (banRecord) {
            record = {
                eventSlug,
                eventTitle,
                eventDate: clean(body.eventDate),
                eventStart: clean(body.eventStart),
                eventEnd: clean(body.eventEnd),
                ticketCode: createTicketCode(),
                status: 'PENDING_REVIEW',
                attendedAt: null,
                createdAt: new Date().toISOString(),
                answers,
                emailSent: false,
                emailError: '',
                banId: banRecord.id,
                banNote: clean(banRecord.note)
            };
            const ref = await addDoc(collection(db, 'registrations'), record);
            registrationId = ref.id;
            const person = `${answers.firstName} ${answers.lastName}`.trim();
            try {
                await sendPlainEmail({
                    to: adminEmails(),
                    subject: `Registration needs your review: ${person || answers.email}`,
                    text: [
                        'Tamara,',
                        '',
                        'Someone on the banned list has tried to register. Their registration is waiting for you to approve or deny it.',
                        '',
                        `Person: ${person || 'No name'}`,
                        `Email: ${answers.email}`,
                        `Phone: ${answers.phone || '—'}`,
                        `zID: ${answers.zid || '—'}`,
                        `Event: ${eventTitle}${record.eventDate ? ` on ${record.eventDate}` : ''}`,
                        banRecord.note ? `Note on the ban: ${banRecord.note}` : '',
                        '',
                        `Review it here: ${origin}/admin?tab=database`,
                        '',
                        'If you need to contact them, email them yourself. This site will not email them about the ban.'
                    ].filter(Boolean).join('\n')
                });
            } catch (error) {
                await updateDoc(doc(db, 'registrations', registrationId), { reviewEmailError: error.message });
            }
            return Response.json({
                success: true,
                pendingReview: true,
                registration: registrationView(registrationId, record, '')
            });
        } else {
            const capacity = Number(body.maxTicketCapacity || 0);
            const seatsTaken = existingSnapshot.docs.filter((item) => item.data().status !== 'DENIED').length;
            if (capacity > 0 && seatsTaken >= capacity) {
                return Response.json({ success: false, error: 'This event is at capacity.' }, { status: 409 });
            }

            record = {
                eventSlug,
                eventTitle,
                eventDate: clean(body.eventDate),
                eventStart: clean(body.eventStart),
                eventEnd: clean(body.eventEnd),
                ticketCode: createTicketCode(),
                status: 'REGISTERED',
                attendedAt: null,
                createdAt: new Date().toISOString(),
                answers,
                emailSent: false,
                emailError: ''
            };
            const ref = await addDoc(collection(db, 'registrations'), record);
            registrationId = ref.id;
        }

        const ticketUrl = `${origin}/ticket/${record.ticketCode}`;
        const qrUrl = `${origin}/api/registrations/qr?code=${encodeURIComponent(record.ticketCode)}`;
        const qrDataUrl = await ticketQrDataUrl(record.ticketCode);
        let emailSent = Boolean(record.emailSent);
        let emailError = '';

        try {
            const when = [record.eventDate, record.eventStart && record.eventEnd ? `${record.eventStart}–${record.eventEnd}` : record.eventStart]
                .filter(Boolean)
                .join(' ');
            await sendTicketEmail({
                to: answers.email,
                name: answers.firstName,
                eventTitle: record.eventTitle || eventTitle,
                eventWhen: when,
                ticketCode: record.ticketCode,
                ticketUrl,
                qrUrl
            });
            emailSent = true;
        } catch (error) {
            emailError = error.message;
        }

        await updateDoc(doc(db, 'registrations', registrationId), {
            emailSent,
            emailError,
            answers
        });

        return Response.json({
            success: true,
            alreadyRegistered: Boolean(existing),
            emailSent,
            emailError,
            registration: registrationView(registrationId, { ...record, answers, emailSent, emailError }, qrDataUrl)
        });
    } catch (error) {
        console.error('Registration save error:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
