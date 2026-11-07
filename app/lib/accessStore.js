import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { normaliseAffiliation, saveAffiliation } from './userStore';

const GROUPS = new Set(['admin', 'founders', 'casual']);

function cleanEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function memberId(email) {
    return cleanEmail(email).replace(/\//g, '');
}

export async function memberGroup(email) {
    const id = memberId(email);
    if (!id) return '';
    const snapshot = await getDoc(doc(db, 'accessMembers', id));
    const group = snapshot.data()?.group;
    return GROUPS.has(group) ? group : '';
}

function affiliationFrom(data = {}) {
    if (!data.userType) return null;
    return {
        userType: data.userType,
        departmentType: data.departmentType || '',
        department: data.department || '',
        unswDivision: data.unswDivision || '',
        companyName: data.companyName || '',
        name: data.name || '',
        phone: data.phone || ''
    };
}

export async function memberAffiliation(email) {
    const id = memberId(email);
    if (!id) return null;
    const snapshot = await getDoc(doc(db, 'accessMembers', id));
    return affiliationFrom(snapshot.data());
}

export async function listMembers() {
    const snapshot = await getDocs(collection(db, 'accessMembers'));
    return snapshot.docs
        .map((entry) => ({
            email: entry.data().email || entry.id,
            group: entry.data().group || '',
            userType: entry.data().userType || '',
            department: entry.data().department || ''
        }))
        .filter((person) => GROUPS.has(person.group))
        .sort((a, b) => a.group.localeCompare(b.group) || a.email.localeCompare(b.email));
}

export async function saveMember(email, group, affiliation) {
    const cleaned = cleanEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
        const error = new Error('Enter a valid email.');
        error.status = 400;
        throw error;
    }
    if (!GROUPS.has(group)) {
        const error = new Error('Choose Admin, Founders general staff, or Casual staff.');
        error.status = 400;
        throw error;
    }
    const profile = normaliseAffiliation(affiliation);
    const person = {
        name: String(affiliation?.name || '').trim(),
        phone: String(affiliation?.phone || '').trim()
    };
    await setDoc(doc(db, 'accessMembers', memberId(cleaned)), {
        email: cleaned,
        group,
        ...profile,
        ...person,
        updatedAt: new Date().toISOString()
    }, { merge: true });
    await saveAffiliation(cleaned, { ...profile, ...person });
    return { email: cleaned, group, ...profile, ...person };
}

export async function removeMember(email) {
    const id = memberId(email);
    if (!id) {
        const error = new Error('Choose a person to remove.');
        error.status = 400;
        throw error;
    }
    await deleteDoc(doc(db, 'accessMembers', id));
}
