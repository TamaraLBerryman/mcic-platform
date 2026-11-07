import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

function userId(email) {
    return String(email || '').trim().toLowerCase().replace(/\//g, '');
}

export function normaliseAffiliation(input = {}) {
    const userType = input.userType === 'External to UNSW' ? 'External to UNSW' : input.userType === 'Internal to UNSW' ? 'Internal to UNSW' : '';
    if (!userType) {
        const error = new Error('Choose internal or external to UNSW.');
        error.status = 400;
        throw error;
    }
    const departmentType = input.departmentType === 'Other' ? 'Other' : 'UNSW Founders';
    if (userType === 'External to UNSW') {
        const companyName = String(input.companyName || '').trim();
        if (!companyName) {
            const error = new Error('Enter the company or organisation name.');
            error.status = 400;
            throw error;
        }
        return { userType, departmentType: '', department: companyName, unswDivision: '', companyName };
    }
    if (departmentType === 'Other') {
        const department = String(input.department || '').trim();
        if (!department) {
            const error = new Error('Enter the faculty or department name.');
            error.status = 400;
            throw error;
        }
        return {
            userType,
            departmentType,
            department,
            unswDivision: String(input.unswDivision || '').trim(),
            companyName: ''
        };
    }
    return { userType, departmentType, department: 'UNSW Founders', unswDivision: '', companyName: '' };
}

export async function saveAffiliation(email, input) {
    const cleaned = String(email || '').trim().toLowerCase();
    const id = userId(cleaned);
    if (!id) {
        const error = new Error('Enter a valid email.');
        error.status = 400;
        throw error;
    }
    const affiliation = normaliseAffiliation(input);
    const person = {};
    if ('name' in input) person.name = String(input.name || '').trim();
    if ('phone' in input) person.phone = String(input.phone || '').trim();
    await setDoc(doc(db, 'users', id), {
        email: cleaned,
        ...affiliation,
        ...person,
        updatedAt: new Date().toISOString()
    }, { merge: true });
    return { ...affiliation, ...person };
}

export async function affiliationFor(email) {
    const id = userId(email);
    if (!id) return null;
    const snapshot = await getDoc(doc(db, 'users', id));
    const data = snapshot.data() || {};
    if (!data.userType && !data.name && !data.phone) return null;
    return {
        userType: data.userType || '',
        departmentType: data.departmentType || '',
        department: data.department || '',
        unswDivision: data.unswDivision || '',
        companyName: data.companyName || '',
        name: data.name || '',
        phone: data.phone || ''
    };
}

export async function recordLogin(email, group) {
    const cleaned = String(email || '').trim().toLowerCase();
    const id = userId(cleaned);
    if (!id) return null;
    const ref = doc(db, 'users', id);
    const now = new Date().toISOString();
    const record = { email: cleaned, group: group || 'other', lastSeenAt: now };
    try {
        await updateDoc(ref, record);
    } catch {
        await setDoc(ref, { ...record, firstSeenAt: now }, { merge: true });
    }
    return record;
}

export async function listLogins() {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs
        .map((entry) => ({
            email: entry.data().email || entry.id,
            group: entry.data().group || 'other',
            userType: entry.data().userType || '',
            department: entry.data().department || '',
            firstSeenAt: entry.data().firstSeenAt || '',
            lastSeenAt: entry.data().lastSeenAt || ''
        }))
        .sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)));
}
