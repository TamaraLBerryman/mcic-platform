'use client';

import { useEffect, useState } from 'react';
import { durationLabel } from '../../../lib/casualTimesheets';
import { authFetch } from '../../../lib/clientAuth';
import Gate from '../../../../components/Gate';

function ShiftDecision({ shift, budgetCodes, onDone }) {
    const [fund, setFund] = useState(shift.fund || '');
    const [addingCode, setAddingCode] = useState(false);
    const [newCode, setNewCode] = useState('');
    const [note, setNote] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    const send = async (action) => {
        setBusy(true);
        setMessage('');
        try {
            const response = await authFetch('/api/casuals/hours/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: shift.id, action, fund: addingCode ? newCode : fund, note })
            });
            const data = await response.json();
            if (!data.success) {
                setMessage(data.error || 'These hours could not be updated.');
                return;
            }
            setMessage(action === 'reject' ? 'Rejected. MCIC can see your note.' : 'Approved. MCIC can now enter this in payroll.');
            onDone();
        } finally {
            setBusy(false);
        }
    };

    return (
        <article className="border border-gray-200 bg-white p-4 rounded-sm space-y-3 text-sm">
            {shift.source === 'added' && <p className="inline-block text-[10px] font-black uppercase tracking-wider bg-[#EAD64D] text-black px-2 py-0.5">Not rostered</p>}
            <p className="font-bold">{shift.casualName} · {shift.event || 'Shift'}</p>
            <p>{shift.date}{shift.place ? ` · ${shift.place}` : ''}</p>
            <p>Rostered: {shift.source === 'added' ? 'Not rostered' : (durationLabel(shift.allocatedStart, shift.allocatedEnd) || 'No rostered times')}</p>
            <p>Actual: {durationLabel(shift.actualStart, shift.actualEnd) || 'No actual hours'}</p>
            {shift.casualNotes && <p className="text-gray-600">Casual notes: {shift.casualNotes}</p>}
            {shift.tasks && <p className="text-gray-600">{shift.tasks}</p>}
            {shift.status === 'approved' ? (
                <p className="font-bold">Approved · budget code {shift.fund}</p>
            ) : shift.status === 'rejected' ? (
                <p className="font-bold">Rejected. {shift.rejectionNote}</p>
            ) : shift.status === 'submitted' ? (
                <>
                    <label className="block text-xs">Budget code
                        <select
                            value={addingCode ? '__new__' : fund}
                            onChange={(event) => {
                                if (event.target.value === '__new__') {
                                    setAddingCode(true);
                                    setFund('');
                                    return;
                                }
                                setAddingCode(false);
                                setNewCode('');
                                setFund(event.target.value);
                            }}
                            className="mt-1 w-full p-2 border border-gray-200 rounded-sm"
                        >
                            <option value="">Choose a budget code</option>
                            {budgetCodes.map((code) => <option key={code} value={code}>{code}</option>)}
                            <option value="__new__">Add a new budget code</option>
                        </select>
                    </label>
                    {addingCode && (
                        <label className="block text-xs">New budget code
                            <input value={newCode} onChange={(event) => setNewCode(event.target.value)} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" placeholder="Type the budget code" />
                        </label>
                    )}
                    <button type="button" disabled={busy} onClick={() => send('approve')} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider bg-black text-[#EAD64D] rounded-sm cursor-pointer disabled:opacity-40">Approve</button>
                    <label className="block text-xs">Rejection note
                        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" placeholder="Why should this shift not be paid?" />
                    </label>
                    <button type="button" disabled={busy} onClick={() => send('reject')} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider border border-gray-300 rounded-sm cursor-pointer disabled:opacity-40">Reject</button>
                </>
            ) : (
                <p className="text-gray-500">Actual hours have not been submitted.</p>
            )}
            {message && <p className="text-sm">{message}</p>}
        </article>
    );
}

function ApproveHoursPage() {
    const [shifts, setShifts] = useState([]);
    const [budgetCodes, setBudgetCodes] = useState([]);
    const [message, setMessage] = useState('Loading hours…');

    const load = () => {
        authFetch('/api/casuals/hours/approve')
            .then((response) => response.json())
            .then((data) => {
                if (!data.success) {
                    setMessage(data.error || 'These hours could not be loaded.');
                    return;
                }
                setShifts(data.shifts || []);
                setBudgetCodes(data.budgetCodes || []);
                setMessage('');
            })
            .catch(() => setMessage('The hours could not be loaded.'));
    };

    useEffect(() => {
        load();
    }, []);

    return (
        <main className="max-w-xl mx-auto px-4 py-10 space-y-4">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Casual hours</p>
                <h1 className="text-2xl font-black uppercase">Approve hours</h1>
                <p className="text-sm text-gray-600">These are the shifts that name you as the organiser. Choose a budget code to approve, or reject the shift with a note.</p>
            </div>
            {message && <p className="text-sm">{message}</p>}
            {!message && shifts.length === 0 && (
                <p className="text-sm text-gray-500 border border-dashed border-gray-300 p-6 text-center">No casual hours are waiting for this email.</p>
            )}
            {shifts.map((shift) => (
                <ShiftDecision key={shift.id} shift={shift} budgetCodes={budgetCodes} onDone={load} />
            ))}
        </main>
    );
}

export default function Page() {
    return <Gate level="account"><ApproveHoursPage /></Gate>;
}
