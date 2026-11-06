import { randomBytes } from 'crypto';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { offerDocId } from './casualOffers';
import { openSeal, seal, tokenHash } from './casualVault';
import { clock, durationLabel, minutesBetween } from './casualTimesheets';
import { listCasuals } from './casualDirectory';
import { listFoundersStaff, staffByEmail } from './foundersStaff';
import { sendPlainEmail } from './mail';

function clean(value, max) {
    return String(value || '').trim().slice(0, max);
}

function view(id, data) {
    return {
        id,
        shiftKey: data.shiftKey || '',
        source: data.source === 'added' ? 'added' : 'rostered',
        date: data.date || '',
        event: data.event || '',
        place: data.place || '',
        tasks: data.tasks || '',
        allocatedStart: data.allocatedStart || '',
        allocatedEnd: data.allocatedEnd || '',
        actualStart: data.actualStart || '',
        actualEnd: data.actualEnd || '',
        organiserName: data.organiserName || '',
        organiserEmail: data.organiserEmail || '',
        status: data.status || 'open',
        fund: data.fund || '',
        casualNotes: data.casualNotes || '',
        rejectionNote: data.rejectionNote || '',
        archived: Boolean(data.archived),
        payrollSent: Boolean(data.payrollSent),
        payrollSentAt: data.payrollSentAt || '',
        casualId: data.casualId || '',
        casualName: data.casualName || '',
        emailError: data.emailError || ''
    };
}

function rosterDocId(casualId, shiftKey) {
    return `r_${casualId}_${offerDocId(shiftKey)}`.slice(0, 700);
}

async function allOffers() {
    const snapshot = await getDocs(collection(db, 'casualOffers'));
    return snapshot.docs.map((entry) => entry.data()).filter((offer) => offer.shiftKey);
}

async function sheetsForCasual(casualId) {
    const snapshot = await getDocs(query(collection(db, 'casualTimesheets'), where('casualId', '==', casualId)));
    return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
}

function assignedTo(offer, email) {
    return (Array.isArray(offer.assigned) ? offer.assigned : []).some((person) => person.email === email);
}

function organiserFromOffer(offer, staff) {
    const byEmail = staff.find((person) => person.email === String(offer?.organiserEmail || '').toLowerCase());
    const byName = !offer?.organiserEmail
        ? staff.find((person) => person.name.toLowerCase() === String(offer?.who || '').trim().toLowerCase())
        : null;
    const person = byEmail || byName || null;
    return person
        ? { organiserName: person.name, organiserEmail: person.email }
        : { organiserName: '', organiserEmail: '' };
}

export async function listCasualHours(person) {
    const [offers, saved, staff] = await Promise.all([allOffers(), sheetsForCasual(person.id), listFoundersStaff()]);
    const savedByShift = new Map(saved.filter((sheet) => sheet.shiftKey).map((sheet) => [sheet.shiftKey, sheet]));
    const rostered = offers
        .filter((offer) => assignedTo(offer, person.email))
        .map((offer) => {
            const sheet = savedByShift.get(offer.shiftKey);
            if (sheet) return view(sheet.id, sheet);
            return {
                id: '',
                shiftKey: offer.shiftKey,
                source: 'rostered',
                date: offer.date || '',
                event: offer.event || '',
                place: offer.place || '',
                tasks: offer.tasks || '',
                allocatedStart: offer.start || '',
                allocatedEnd: offer.end || '',
                actualStart: '',
                actualEnd: '',
                ...organiserFromOffer(offer, staff),
                status: 'open',
                fund: '',
                casualNotes: '',
                rejectionNote: '',
                archived: false,
                payrollSent: false,
                casualId: person.id,
                casualName: person.name,
                emailError: ''
            };
        });
    const added = saved.filter((sheet) => sheet.source === 'added').map((sheet) => view(sheet.id, sheet));
    return [...rostered, ...added].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.actualStart || a.allocatedStart).localeCompare(String(b.actualStart || b.allocatedStart)));
}

export async function listAllHours() {
    const [offers, snapshot, staff] = await Promise.all([allOffers(), getDocs(collection(db, 'casualTimesheets')), listFoundersStaff()]);
    const saved = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    const covered = new Set(saved.filter((sheet) => sheet.shiftKey).map((sheet) => `${sheet.casualId}:${sheet.shiftKey}`));
    const pending = [];
    offers.forEach((offer) => {
        (Array.isArray(offer.assigned) ? offer.assigned : []).forEach((person) => {
            const casualId = (Array.isArray(offer.asked) ? offer.asked : []).find((entry) => entry.email === person.email)?.id || '';
            if (casualId && covered.has(`${casualId}:${offer.shiftKey}`)) return;
            if (!casualId && saved.some((sheet) => sheet.shiftKey === offer.shiftKey && sheet.casualName === person.name)) return;
            pending.push({
                id: '',
                shiftKey: offer.shiftKey,
                source: 'rostered',
                date: offer.date || '',
                event: offer.event || '',
                place: offer.place || '',
                tasks: offer.tasks || '',
                allocatedStart: offer.start || '',
                allocatedEnd: offer.end || '',
                actualStart: '',
                actualEnd: '',
                ...organiserFromOffer(offer, staff),
                status: 'open',
                fund: '',
                casualNotes: '',
                rejectionNote: '',
                archived: false,
                payrollSent: false,
                casualId,
                casualName: person.name || '',
                casualEmail: person.email || '',
                emailError: ''
            });
        });
    });
    return [...saved.map((sheet) => view(sheet.id, sheet)), ...pending]
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function hoursText(sheet) {
    const allocated = sheet.source === 'added'
        ? 'Not rostered'
        : (durationLabel(sheet.allocatedStart, sheet.allocatedEnd) || 'No rostered times');
    const actual = durationLabel(sheet.actualStart, sheet.actualEnd) || 'No actual hours';
    return [
        `${sheet.casualName} submitted hours.`,
        '',
        sheet.source === 'added' ? 'This shift was not rostered.' : 'This shift was rostered.',
        `Event: ${sheet.event || 'No event'}${sheet.place ? ` · ${sheet.place}` : ''}`,
        `Date: ${sheet.date || 'No date'}`,
        `Rostered hours: ${allocated}`,
        `Actual hours: ${actual}`,
        sheet.casualNotes ? `Casual notes: ${sheet.casualNotes}` : '',
        sheet.tasks ? `Tasks: ${sheet.tasks}` : ''
    ].filter(Boolean).join('\n');
}

async function emailOrganiser(ref, data, origin) {
    const token = randomBytes(24).toString('hex');
    await updateDoc(ref, { approvalTokenHash: tokenHash(token), approvalTokenEnc: seal(token) });
    try {
        await sendPlainEmail({
            to: data.organiserEmail,
            subject: `Approve casual hours: ${data.casualName || 'Casual'} ${data.date || ''}`.trim(),
            text: [
                hoursText(data),
                '',
                'Sign in with this email address, choose the budget code, and approve. You can reject the shift and add a note if it should not be paid:',
                `${origin}/login?next=${encodeURIComponent('/casuals/approve')}`
            ].join('\n')
        });
        await updateDoc(ref, { emailError: '' });
        return '';
    } catch (error) {
        const emailError = String(error.message || 'The organiser email could not be sent.').slice(0, 300);
        await updateDoc(ref, { emailError });
        return emailError;
    }
}

async function writeSheet(id, record, origin, send) {
    const ref = id ? doc(db, 'casualTimesheets', id) : doc(collection(db, 'casualTimesheets'));
    if (id) await setDoc(ref, record, { merge: true });
    else await setDoc(ref, record);
    let emailError = '';
    if (send) emailError = await emailOrganiser(ref, { ...record, id: ref.id }, origin);
    const saved = await getDoc(ref);
    return { ...view(ref.id, saved.data()), emailError: emailError || saved.data()?.emailError || '' };
}

async function organiserFields(input) {
    const person = await staffByEmail(input.organiserEmail);
    if (!person) {
        const error = new Error('Choose a Founders staff member as the organiser.');
        error.status = 400;
        throw error;
    }
    return { organiserName: person.name, organiserEmail: person.email };
}

export async function submitRosteredHours(person, input, origin) {
    const shiftKey = clean(input.shiftKey, 200);
    const actualStart = clock(input.actualStart);
    const actualEnd = clock(input.actualEnd);
    if (!shiftKey || minutesBetween(actualStart, actualEnd) == null) {
        const error = new Error('Enter an actual start and an end after the start.');
        error.status = 400;
        throw error;
    }
    const offers = await allOffers();
    const offer = offers.find((entry) => entry.shiftKey === shiftKey && assignedTo(entry, person.email));
    if (!offer) {
        const error = new Error('That rostered shift could not be found.');
        error.status = 404;
        throw error;
    }
    const organiser = await organiserFields(input);
    const id = rosterDocId(person.id, shiftKey);
    const current = await getDoc(doc(db, 'casualTimesheets', id));
    if (current.exists() && current.data().archived) {
        const error = new Error('This shift has been archived.');
        error.status = 409;
        throw error;
    }
    if (current.exists() && current.data().status === 'approved') {
        const error = new Error('The organiser has already approved these hours.');
        error.status = 409;
        throw error;
    }
    return writeSheet(id, {
        casualId: person.id,
        casualName: person.name,
        shiftKey,
        source: 'rostered',
        date: offer.date || '',
        event: offer.event || '',
        place: offer.place || '',
        tasks: offer.tasks || '',
        allocatedStart: offer.start || '',
        allocatedEnd: offer.end || '',
        actualStart,
        actualEnd,
        casualNotes: clean(input.casualNotes, 1000),
        ...organiser,
        status: 'submitted',
        fund: '',
        rejectionNote: '',
        archived: false,
        payrollSent: false,
        payrollSentAt: '',
        submittedAt: new Date().toISOString(),
        approvedAt: '',
        rejectedAt: ''
    }, origin, true);
}

export async function addUnrosteredHours(person, input, origin) {
    const date = String(input.date || '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || '';
    const actualStart = clock(input.actualStart);
    const actualEnd = clock(input.actualEnd);
    const event = clean(input.event, 200);
    if (!date || !event || minutesBetween(actualStart, actualEnd) == null) {
        const error = new Error('An extra shift needs a date, what it was for, and a start and end.');
        error.status = 400;
        throw error;
    }
    const organiser = await organiserFields(input);
    const ref = doc(collection(db, 'casualTimesheets'));
    return writeSheet(ref.id, {
        casualId: person.id,
        casualName: person.name,
        shiftKey: '',
        source: 'added',
        date,
        event,
        place: clean(input.place, 200),
        tasks: clean(input.tasks, 500),
        allocatedStart: '',
        allocatedEnd: '',
        actualStart,
        actualEnd,
        casualNotes: clean(input.casualNotes, 1000),
        ...organiser,
        status: 'submitted',
        fund: '',
        rejectionNote: '',
        archived: false,
        payrollSent: false,
        payrollSentAt: '',
        submittedAt: new Date().toISOString(),
        approvedAt: '',
        rejectedAt: ''
    }, origin, true);
}

export async function resubmitAddedHours(person, input, origin) {
    const id = clean(input.id, 700);
    const ref = doc(db, 'casualTimesheets', id);
    const current = await getDoc(ref);
    const data = current.exists() ? current.data() : null;
    if (!data || data.casualId !== person.id || data.source !== 'added') {
        const error = new Error('That shift could not be found.');
        error.status = 404;
        throw error;
    }
    if (data.archived) {
        const error = new Error('This shift has been archived.');
        error.status = 409;
        throw error;
    }
    if (data.status === 'approved') {
        const error = new Error('The organiser has already approved these hours.');
        error.status = 409;
        throw error;
    }
    const actualStart = clock(input.actualStart);
    const actualEnd = clock(input.actualEnd);
    if (minutesBetween(actualStart, actualEnd) == null) {
        const error = new Error('Enter an actual start and an end after the start.');
        error.status = 400;
        throw error;
    }
    const organiser = await organiserFields(input);
    return writeSheet(id, {
        ...data,
        actualStart,
        actualEnd,
        casualNotes: clean(input.casualNotes, 1000),
        ...organiser,
        status: 'submitted',
        fund: '',
        rejectionNote: '',
        archived: false,
        payrollSent: false,
        payrollSentAt: '',
        submittedAt: new Date().toISOString(),
        approvedAt: '',
        rejectedAt: ''
    }, origin, true);
}

export async function saveOrganiser(input, origin, { allowApproved = false } = {}) {
    if (input.id) return updateOrganiser(input.id, input, origin, { allowApproved });
    const shiftKey = clean(input.shiftKey, 200);
    let casualId = clean(input.casualId, 80);
    if (!casualId && input.casualEmail) {
        const email = clean(input.casualEmail, 160).toLowerCase();
        const { people } = await listCasuals();
        casualId = people.find((person) => person.email.toLowerCase() === email)?.id || '';
    }
    if (!shiftKey || !casualId) {
        const error = new Error('Choose a rostered shift before changing the organiser.');
        error.status = 400;
        throw error;
    }
    const existingId = rosterDocId(casualId, shiftKey);
    const existing = await getDoc(doc(db, 'casualTimesheets', existingId));
    if (existing.exists()) return updateOrganiser(existingId, input, origin, { allowApproved });
    const organiser = await organiserFields(input);
    const offer = (await allOffers()).find((entry) => entry.shiftKey === shiftKey);
    if (!offer) {
        const error = new Error('That rostered shift could not be found.');
        error.status = 404;
        throw error;
    }
    return writeSheet(existingId, {
        casualId,
        casualName: clean(input.casualName, 80),
        shiftKey,
        source: 'rostered',
        date: offer.date || '',
        event: offer.event || '',
        place: offer.place || '',
        tasks: offer.tasks || '',
        allocatedStart: offer.start || '',
        allocatedEnd: offer.end || '',
        actualStart: '',
        actualEnd: '',
        ...organiser,
        status: 'open',
        fund: '',
        payrollSent: false,
        payrollSentAt: '',
        submittedAt: '',
        approvedAt: ''
    }, origin, false);
}

export async function updateOrganiser(sheetId, input, origin, { allowApproved = false } = {}) {
    const ref = doc(db, 'casualTimesheets', sheetId);
    const current = await getDoc(ref);
    if (!current.exists()) {
        const error = new Error('That shift could not be found.');
        error.status = 404;
        throw error;
    }
    const data = current.data();
    if (data.archived && !allowApproved) {
        const error = new Error('This shift has been archived.');
        error.status = 409;
        throw error;
    }
    if (data.status === 'approved' && !allowApproved) {
        const error = new Error('The organiser has already approved these hours.');
        error.status = 409;
        throw error;
    }
    const organiser = await organiserFields(input);
    const changed = organiser.organiserEmail !== data.organiserEmail;
    const next = {
        ...organiser,
        updatedAt: new Date().toISOString()
    };
    if ((data.status === 'approved' || data.status === 'rejected') && changed) {
        next.status = 'submitted';
        next.fund = '';
        next.approvedAt = '';
        next.rejectionNote = '';
        next.rejectedAt = '';
        next.payrollSent = false;
        next.payrollSentAt = '';
    }
    await updateDoc(ref, next);
    if ((data.status === 'submitted' || data.status === 'approved' || data.status === 'rejected') && changed) {
        await emailOrganiser(ref, { ...data, ...next }, origin);
    }
    const saved = await getDoc(ref);
    return view(ref.id, saved.data());
}

export async function sheetsForOrganiser(email) {
    const wanted = String(email || '').trim().toLowerCase();
    const snapshot = await getDocs(collection(db, 'casualTimesheets'));
    return snapshot.docs
        .filter((entry) => String(entry.data().organiserEmail || '').toLowerCase() === wanted)
        .map((entry) => view(entry.id, entry.data()))
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

async function sheetForDecision(token, identity = {}) {
    if (token) return sheetByToken(token);
    const ref = doc(db, 'casualTimesheets', clean(identity.id, 700));
    const current = await getDoc(ref);
    const organiser = String(current.exists() ? current.data().organiserEmail : '').toLowerCase();
    if (!current.exists() || organiser !== String(identity.organiserEmail || '').toLowerCase()) {
        const error = new Error('That shift is not waiting for this email.');
        error.status = 404;
        throw error;
    }
    return current;
}

export async function sheetForApprover(token) {
    const snapshot = await getDocs(query(
        collection(db, 'casualTimesheets'),
        where('approvalTokenHash', '==', tokenHash(token)),
        limit(1)
    ));
    if (snapshot.empty) return null;
    const entry = snapshot.docs[0];
    return view(entry.id, entry.data());
}

const BUDGET_DOC = doc(db, 'settings', 'budgetCodes');

export async function listBudgetCodes() {
    const snapshot = await getDoc(BUDGET_DOC);
    const codes = Array.isArray(snapshot.data()?.codes) ? snapshot.data().codes : [];
    return [...new Set(codes.map((code) => clean(code, 80)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export async function saveBudgetCodes(codes) {
    const next = [...new Set((Array.isArray(codes) ? codes : []).map((code) => clean(code, 80)).filter(Boolean))].slice(0, 80);
    await setDoc(BUDGET_DOC, { codes: next }, { merge: true });
    return next.sort((a, b) => a.localeCompare(b));
}

async function sheetByToken(token) {
    const snapshot = await getDocs(query(
        collection(db, 'casualTimesheets'),
        where('approvalTokenHash', '==', tokenHash(token))
    ));
    if (snapshot.empty) {
        const error = new Error('This link is not valid.');
        error.status = 404;
        throw error;
    }
    return snapshot.docs[0];
}

function submittedOrThrow(entry) {
    const status = entry.data().status;
    if (status === 'submitted') return;
    const error = new Error(
        status === 'approved' ? 'These hours are already approved.'
            : status === 'rejected' ? 'These hours are already rejected.'
                : 'Actual hours have not been submitted.'
    );
    error.status = 409;
    throw error;
}

export async function approveHours(token, fund, identity = {}) {
    const typed = clean(fund, 80);
    if (!typed) {
        const error = new Error('Choose a budget code.');
        error.status = 400;
        throw error;
    }
    const entry = await sheetForDecision(token, identity);
    submittedOrThrow(entry);
    const codes = await listBudgetCodes();
    const existing = codes.find((code) => code.toLowerCase() === typed.toLowerCase());
    const charge = existing || typed;
    if (!existing) await saveBudgetCodes([...codes, charge]);
    await updateDoc(entry.ref, { status: 'approved', fund: charge, approvedAt: new Date().toISOString(), payrollSent: false, payrollSentAt: '' });
    const saved = await getDoc(entry.ref);
    return view(entry.id, saved.data());
}

export async function rejectHours(token, note, identity = {}) {
    const rejectionNote = clean(note, 1000);
    if (!rejectionNote) {
        const error = new Error('Add a note explaining why this shift is rejected.');
        error.status = 400;
        throw error;
    }
    const entry = await sheetForDecision(token, identity);
    submittedOrThrow(entry);
    await updateDoc(entry.ref, {
        status: 'rejected',
        rejectionNote,
        fund: '',
        payrollSent: false,
        payrollSentAt: '',
        rejectedAt: new Date().toISOString(),
        archived: false
    });
    const saved = await getDoc(entry.ref);
    return view(entry.id, saved.data());
}

export async function setHoursArchived(sheetId, archived) {
    const ref = doc(db, 'casualTimesheets', clean(sheetId, 700));
    const current = await getDoc(ref);
    if (!current.exists()) {
        const error = new Error('That shift could not be found.');
        error.status = 404;
        throw error;
    }
    if (current.data().status !== 'rejected') {
        const error = new Error('Only a rejected shift can be archived.');
        error.status = 409;
        throw error;
    }
    const hidden = Boolean(archived);
    await updateDoc(ref, { archived: hidden, archivedAt: hidden ? new Date().toISOString() : '' });
    const saved = await getDoc(ref);
    return view(ref.id, saved.data());
}

export async function markPayrollSent(sheetId, sent) {
    const ref = doc(db, 'casualTimesheets', clean(sheetId, 700));
    const current = await getDoc(ref);
    if (!current.exists()) {
        const error = new Error('That shift could not be found.');
        error.status = 404;
        throw error;
    }
    if (current.data().status !== 'approved') {
        const error = new Error('Approve the hours before marking them sent to payroll.');
        error.status = 409;
        throw error;
    }
    const payrollSent = Boolean(sent);
    await updateDoc(ref, {
        payrollSent,
        payrollSentAt: payrollSent ? new Date().toISOString() : ''
    });
    const saved = await getDoc(ref);
    return view(ref.id, saved.data());
}
