import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';

function userId(email) {
    return String(email || '').trim().toLowerCase().replace(/\//g, '');
}

export async function recordLogin(email, group) {
    const cleaned = String(email || '').trim().toLowerCase();
    const id = userId(cleaned);
    if (!id) return null;
    const ref = doc(db, 'users', id);
    const existing = await getDoc(ref);
    const now = new Date().toISOString();
    const record = {
        email: cleaned,
        group: group || 'other',
        firstSeenAt: existing.data()?.firstSeenAt || now,
        lastSeenAt: now
    };
    await setDoc(ref, record, { merge: true });
    return record;
}

export async function listLogins() {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs
        .map((entry) => ({
            email: entry.data().email || entry.id,
            group: entry.data().group || 'other',
            firstSeenAt: entry.data().firstSeenAt || '',
            lastSeenAt: entry.data().lastSeenAt || ''
        }))
        .sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)));
}
