import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { publishedHotDesk, sessionIsActive, sydneyTodayString } from '../../../lib/hotDesks';

function sessionView(data) {
    const active = sessionIsActive(data);
    return {
        occupied: active,
        occupantName: active ? data.occupantName : '',
        checkedInAt: active ? data.checkedInAt : null
    };
}

export async function GET(request) {
    try {
        const key = new URL(request.url).searchParams.get('key') || '';
        const desk = await publishedHotDesk(key);
        if (!desk) {
            return Response.json({ success: false, error: 'That hot desk could not be found.' }, { status: 404 });
        }
        const snapshot = await getDoc(doc(db, 'hotDeskSessions', key));
        const data = snapshot.exists() ? snapshot.data() : null;
        if (data && !sessionIsActive(data)) {
            await deleteDoc(snapshot.ref);
        }
        return Response.json({
            success: true,
            label: desk.name,
            ...sessionView(data && sessionIsActive(data) ? data : null)
        });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const key = String(body.key || '').trim();
        const action = body.action === 'out' ? 'out' : 'in';
        const desk = await publishedHotDesk(key);
        if (!desk) {
            return Response.json({ success: false, error: 'That hot desk could not be found.' }, { status: 404 });
        }

        const ref = doc(db, 'hotDeskSessions', key);
        if (action === 'out') {
            await deleteDoc(ref);
            return Response.json({ success: true, occupied: false, label: desk.name, occupantName: '' });
        }

        const name = String(body.name || '').trim();
        if (!name) {
            return Response.json({ success: false, error: 'Enter your name to check in.' }, { status: 400 });
        }

        const existing = await getDoc(ref);
        if (existing.exists() && sessionIsActive(existing.data())) {
            return Response.json({
                success: false,
                error: `${existing.data().occupantName} is already checked in. Check out before someone else checks in.`,
                occupied: true,
                occupantName: existing.data().occupantName
            }, { status: 409 });
        }

        const record = {
            deskKey: key,
            label: desk.name,
            occupantName: name,
            checkedInAt: new Date().toISOString(),
            sydneyDate: sydneyTodayString()
        };
        await setDoc(ref, record);
        return Response.json({ success: true, label: desk.name, ...sessionView(record) });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
