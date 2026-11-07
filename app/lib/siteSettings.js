import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SITE_DOC = doc(db, 'settings', 'site');

export async function siteSettings() {
    const snapshot = await getDoc(SITE_DOC);
    const data = snapshot.exists() ? snapshot.data() : {};
    return {
        ticketing: data.ticketing !== false,
        tourVideoUrl: data.tourVideoUrl || '',
        tourVideoPath: data.tourVideoPath || ''
    };
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
