import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { sydneyTodayString } from './bookingRules';
import { DEFAULT_DESK_LAYOUT, findDesk, isHotDesk, parseDeskSlotKey } from './deskLayout';

export { sydneyTodayString };

export function sessionIsActive(session, today = sydneyTodayString()) {
    return Boolean(session?.occupantName) && session.sydneyDate === today;
}

export async function publishedLayout() {
    const snapshot = await getDoc(doc(db, 'settings', 'deskLayout'));
    const published = snapshot.data()?.published;
    if (Array.isArray(published) && published.length > 0) return published;
    return DEFAULT_DESK_LAYOUT;
}

export async function publishedHotDesk(key) {
    const slot = parseDeskSlotKey(key);
    if (!slot) return null;
    const desk = findDesk(await publishedLayout(), slot.podId, slot.rowId, slot.index);
    if (!isHotDesk(desk)) return null;
    return { ...desk, slotKey: key };
}
