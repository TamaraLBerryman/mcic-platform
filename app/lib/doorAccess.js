import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { hasStaffAccess } from './verifyUser';

function ownerEmail(data) {
    return String(data.organiserEmail || data.mainContact?.email || '').toLowerCase();
}

export async function canRunDoor(email, eventSlug) {
    if (await hasStaffAccess(email)) return true;
    const wanted = String(email || '').trim().toLowerCase();
    if (!wanted || !eventSlug) return false;
    const bookings = await getDocs(collection(db, 'bookings'));
    if (bookings.docs.some((item) => ownerEmail(item.data()) === wanted && item.data().publicEventSlug === eventSlug)) return true;
    const listings = await getDocs(query(collection(db, 'publicEvents'), where('slug', '==', eventSlug)));
    return listings.docs.some((item) => ownerEmail(item.data()) === wanted);
}
