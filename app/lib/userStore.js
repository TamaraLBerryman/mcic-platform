import { collection, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

function userId(email) {
    return String(email || '').trim().toLowerCase().replace(/\//g, '');
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
        await setDoc(ref, { ...record, firstSeenAt: now });
    }
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
