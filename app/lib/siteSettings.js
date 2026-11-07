import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SITE_DOC = doc(db, 'settings', 'site');

export async function siteSettings() {
    const snapshot = await getDoc(SITE_DOC);
    const data = snapshot.exists() ? snapshot.data() : {};
    return {
        ticketing: data.ticketing !== false,
        tourVideoUrl: data.tourVideoUrl || '',
        tourVideoPath: data.tourVideoPath || '',
        hiddenPages: Array.isArray(data.hiddenPages) ? data.hiddenPages.filter((path) => typeof path === 'string') : []
    };
}

export async function setPageHidden(path, hidden) {
    const current = await siteSettings();
    const next = new Set(current.hiddenPages);
    if (hidden) next.add(path);
    else next.delete(path);
    await setDoc(SITE_DOC, {
        hiddenPages: [...next],
        updatedAt: new Date().toISOString()
    }, { merge: true });
    return siteSettings();
}

export async function setTicketing(enabled) {
    await setDoc(SITE_DOC, {
        ticketing: Boolean(enabled),
        updatedAt: new Date().toISOString()
    }, { merge: true });
    return siteSettings();
}

export async function setTourVideo(url, path) {
    await setDoc(SITE_DOC, {
        tourVideoUrl: url || '',
        tourVideoPath: path || '',
        updatedAt: new Date().toISOString()
    }, { merge: true });
    return siteSettings();
}
