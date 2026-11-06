import { randomBytes } from 'crypto';
import { addDoc, collection, doc, getDoc, getDocs, limit, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { CASUAL_STAFF_LIST } from './casualStaff';
import { rosterFromSaved } from './casualOffers';
import { openSeal, seal, tokenHash } from './casualVault';

const GROUPS_DOC = doc(db, 'settings', 'casualGroups');

function clean(value, max) {
    return String(value || '').trim().slice(0, max);
}

export function revealCasual(id, data) {
    return {
        id,
        name: data.name || '',
        group: data.group || 'General',
        archived: Boolean(data.archived),
        email: openSeal(data.emailEnc),
        zid: openSeal(data.zidEnc),
        phone: openSeal(data.phoneEnc),
        payRate: openSeal(data.payRateEnc),
        notes: openSeal(data.notesEnc)
    };
}

async function groupNames(people) {
    const snapshot = await getDoc(GROUPS_DOC);
    const saved = Array.isArray(snapshot.data()?.names) ? snapshot.data().names : [];
    const names = new Set(['General', ...saved, ...people.map((person) => person.group).filter(Boolean)]);
    return [...names];
}

async function rememberGroup(name) {
    const group = clean(name, 60) || 'General';
    const snapshot = await getDoc(GROUPS_DOC);
    const names = new Set(Array.isArray(snapshot.data()?.names) ? snapshot.data().names : []);
    names.add(group);
    await setDoc(GROUPS_DOC, { names: [...names] }, { merge: true });
    return group;
}

async function seedIfEmpty() {
    const existing = await getDocs(query(collection(db, 'casualStaff'), limit(1)));
    if (!existing.empty) return;
    const previous = await getDoc(doc(db, 'settings', 'casualRoster'));
    const people = rosterFromSaved(previous.data()?.people);
    const names = people.length ? people : CASUAL_STAFF_LIST.map((name) => ({ name, email: '', token: '' }));
    for (const person of names) {
        const token = person.token || randomBytes(24).toString('hex');
        await addDoc(collection(db, 'casualStaff'), {
            name: person.name,
            group: 'General',
            archived: false,
            emailEnc: seal(person.email || ''),
            zidEnc: '',
            phoneEnc: '',
            payRateEnc: '',
            notesEnc: '',
            tokenHash: tokenHash(token),
            tokenEnc: seal(token),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }
    await rememberGroup('General');
}

export async function listCasuals() {
    await seedIfEmpty();
    const snapshot = await getDocs(collection(db, 'casualStaff'));
    const people = snapshot.docs
        .map((entry) => revealCasual(entry.id, entry.data()))
        .sort((a, b) => a.name.localeCompare(b.name));
    return { people, groups: await groupNames(people) };
}

export async function findCasualByEmail(email) {
    const wanted = String(email || '').trim().toLowerCase();
    if (!wanted) return null;
    const { people } = await listCasuals();
    return people.find((person) => !person.archived && person.email === wanted) || null;
}

export async function casualFromRequest(request) {
    const { emailFromRequest } = await import('./verifyUser');
    const email = await emailFromRequest(request);
    const person = await findCasualByEmail(email);
    if (!person) {
        const error = new Error('Sign in with the casual staff email on the roster.');
        error.status = 403;
        throw error;
    }
    return person;
}

export async function findCasualByToken(token) {
    const snapshot = await getDocs(query(
        collection(db, 'casualStaff'),
        where('tokenHash', '==', tokenHash(token)),
        limit(1)
    ));
    if (snapshot.empty) return null;
    const entry = snapshot.docs[0];
    const person = revealCasual(entry.id, entry.data());
    if (person.archived) return null;
    return person;
}

export async function casualsInGroup(group) {
    const { people } = await listCasuals();
    return people.filter((person) => !person.archived && person.group === group);
}

export async function linkTokenFor(id) {
    const snapshot = await getDoc(doc(db, 'casualStaff', id));
    if (!snapshot.exists()) return '';
    const data = snapshot.data();
    const existing = openSeal(data.tokenEnc);
    if (existing) return existing;
    const token = randomBytes(24).toString('hex');
    await updateDoc(snapshot.ref, { tokenHash: tokenHash(token), tokenEnc: seal(token) });
    return token;
}

export async function saveCasual(input) {
    const name = clean(input.name, 80);
    if (!name) {
        const error = new Error('A casual needs a name.');
        error.status = 400;
        throw error;
    }
    const email = clean(input.email, 160).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const error = new Error(`${name} needs a valid email.`);
        error.status = 400;
        throw error;
    }
    const group = await rememberGroup(input.group);
    const record = {
        name,
        group,
        emailEnc: seal(email),
        zidEnc: seal(clean(input.zid, 40)),
        phoneEnc: seal(clean(input.phone, 40)),
        payRateEnc: seal(clean(input.payRate, 40)),
        notesEnc: seal(clean(input.notes, 500)),
        updatedAt: new Date().toISOString()
    };
    const id = clean(input.id, 80);
    if (id) {
        const current = await getDoc(doc(db, 'casualStaff', id));
        if (!current.exists()) {
            const error = new Error('That casual could not be found.');
            error.status = 404;
            throw error;
        }
        await updateDoc(current.ref, record);
        return id;
    }
    const token = randomBytes(24).toString('hex');
    const created = await addDoc(collection(db, 'casualStaff'), {
        ...record,
        archived: false,
        tokenHash: tokenHash(token),
        tokenEnc: seal(token),
        createdAt: record.updatedAt
    });
    return created.id;
}

export async function setCasualArchived(id, archived) {
    const ref = doc(db, 'casualStaff', id);
    const current = await getDoc(ref);
    if (!current.exists()) {
        const error = new Error('That casual could not be found.');
        error.status = 404;
        throw error;
    }
    await updateDoc(ref, { archived: Boolean(archived), updatedAt: new Date().toISOString() });
}

export async function addCasualGroup(name) {
    const group = clean(name, 60);
    if (!group) {
        const error = new Error('A group needs a name.');
        error.status = 400;
        throw error;
    }
    await rememberGroup(group);
    return group;
}
