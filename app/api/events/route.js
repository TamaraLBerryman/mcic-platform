import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export async function GET(request) {
    const slug = new URL(request.url).searchParams.get('slug');

    try {
        const snapshot = await getDocs(query(collection(db, 'publicEvents'), where('status', '==', 'APPROVED')));
        const events = snapshot.docs.map(item => {
            const { organiserEmail, ...data } = item.data();
            return { id: item.id, ...data };
        });

        if (slug) {
            const event = events.find(item => item.slug === slug) || null;
            return Response.json({ success: true, event });
        }

        return Response.json({ success: true, events });
    } catch (error) {
        return Response.json({ success: false, error: error.message, events: [] }, { status: 500 });
    }
}
