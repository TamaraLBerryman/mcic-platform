import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { pipelineStepOf } from '../../../lib/accessPipeline';

export async function GET(request) {
    try {
        const query = String(new URL(request.url).searchParams.get('name') || '').trim().toLowerCase();
        if (query.length < 2) {
            return Response.json({ success: true, status: 'none' });
        }

        const snapshot = await getDocs(collection(db, 'coworkingApplications'));
        const matches = snapshot.docs
            .map((entry) => ({ id: entry.id, ...entry.data() }))
            .filter((application) => String(application.fullName || '').trim().toLowerCase().includes(query));
        const exact = matches.filter((application) => String(application.fullName || '').trim().toLowerCase() === query);
        const pool = exact.length ? exact : matches;
        if (pool.length === 0) {
            return Response.json({ success: true, status: 'none' });
        }

        const people = new Set(pool.map((application) => String(application.email || application.fullName || '').trim().toLowerCase()));
        if (people.size > 1) {
            return Response.json({ success: true, status: 'several' });
        }

        const latest = [...pool].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0];
        return Response.json({
            success: true,
            status: 'found',
            name: latest.fullName,
            startup: latest.startupName || '',
            step: pipelineStepOf(latest)
        });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
