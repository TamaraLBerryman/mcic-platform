'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { durationLabel } from '../../../lib/casualTimesheets';
import { authFetch } from '../../../lib/clientAuth';
import Gate from '../../../../components/Gate';
import OrganiserField from '../../../../components/OrganiserField';

const emptyExtra = { date: '', actualStart: '', actualEnd: '', event: '', place: '', tasks: '', casualNotes: '', organiserName: '', organiserEmail: '' };

function CasualHoursPage() {
    const [name, setName] = useState('');
    const [shifts, setShifts] = useState([]);
    const [message, setMessage] = useState('Loading rostered shifts…');
    const [ready, setReady] = useState(false);
    const [extra, setExtra] = useState(emptyExtra);
    const [busy, setBusy] = useState('');

    const load = async () => {
        const response = await authFetch('/api/casuals/hours');
        const data = await response.json();
        if (!data.success) {
            setReady(false);
            setMessage(data.error || 'This link is not valid.');
            setShifts([]);
            return;
        }
        setReady(true);
        setName(data.name || '');
        setShifts(data.shifts || []);
        setMessage('');
    };

    useEffect(() => {
        load().catch(() => setMessage('The shifts could not be loaded.'));
    }, []);

    const post = async (body) => {
        const response = await authFetch('/api/casuals/hours', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'That could not be saved.');
        return data;
    };

    const update = (index, patch) => {
        setShifts((current) => current.map((shift, shiftIndex) => shiftIndex === index ? { ...shift, ...patch } : shift));
    };

    const submit = async (shift, index) => {
        setBusy(shift.shiftKey || shift.id || 'submit');
        setMessage('');
        try {
            const data = await post({
                action: 'submit',
                shiftKey: shift.shiftKey,
                actualStart: shift.actualStart,
                actualEnd: shift.actualEnd,
                organiserName: shift.organiserName,
                organiserEmail: shift.organiserEmail,
                casualNotes: shift.casualNotes,
                source: shift.source,
                id: shift.id
            });
            await load();
            setMessage(data.emailError ? `Hours submitted. The organiser email was not sent: ${data.emailError}` : 'Hours submitted. The organiser has been asked to choose a budget code or reject the shift.');
        } catch (error) {
            setMessage(error.message);
            update(index, {});
        } finally {
            setBusy('');
        }
    };

    const saveOrganiser = async (shift) => {
        setBusy(`org-${shift.shiftKey || shift.id}`);
        setMessage('');
        try {
            const data = await post({
                action: 'organiser',
                id: shift.id,
                shiftKey: shift.shiftKey,
                organiserName: shift.organiserName,
                organiserEmail: shift.organiserEmail
            });
            await load();
            setMessage(data.emailError ? `Organiser saved. Their email was not sent: ${data.emailError}` : 'Organiser saved.');
        } catch (error) {
            setMessage(error.message);
        } finally {
            setBusy('');
        }
    };

    const addShift = async (event) => {
        event.preventDefault();
        setBusy('add');
        setMessage('');
        try {
            const data = await post({ action: 'add', ...extra });
            setExtra(emptyExtra);
            await load();
            setMessage(data.emailError
                ? `Extra shift submitted and tagged as not rostered. The organiser email was not sent: ${data.emailError}`
                : 'Extra shift submitted and tagged as not rostered. The organiser has been asked to choose a budget code or reject the shift.');
        } catch (error) {
            setMessage(error.message);
        } finally {
            setBusy('');
        }
    };

    return (
        <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">MCIC casual hours</p>
                <h1 className="text-2xl font-black uppercase">{name ? `${name}'s shifts` : 'Shifts'}</h1>
                <p className="text-sm text-gray-600">These are the shifts you are rostered on. Enter the hours you actually worked, a note if you need one, and the Founders staff member who organised it. They choose the budget code or reject the shift.</p>
                <Link href="/casuals/available" className="text-xs font-bold underline">Availability answers</Link>
            </div>
            {message && <p className="text-sm text-gray-700">{message}</p>}
            {ready && shifts.filter((shift) => shift.source === 'rostered').length === 0 && (
                <p className="text-sm text-gray-500 border border-dashed border-gray-300 p-6 text-center">You have no rostered shifts yet.</p>
            )}
            {ready && <div className="space-y-3">
                {shifts.map((shift, index) => (
                    <article key={shift.id || shift.shiftKey || index} className="border border-gray-200 bg-white p-4 rounded-sm space-y-2 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-black uppercase">{shift.date || 'No date'}</p>
                            {shift.source === 'added' && <span className="text-[10px] font-black uppercase tracking-wider bg-[#EAD64D] text-black px-2 py-0.5">Not rostered</span>}
                        </div>
                        <p className="font-bold">{shift.event || 'Shift'}{shift.place ? ` · ${shift.place}` : ''}</p>
                        <p>Rostered: {shift.source === 'added' ? 'Not rostered' : (durationLabel(shift.allocatedStart, shift.allocatedEnd) || 'No times')}</p>
                        <p>Actual: {durationLabel(shift.actualStart, shift.actualEnd) || 'Not submitted'}</p>
                        <p className="text-gray-500">{shift.archived ? 'Archived' : shift.status === 'approved' ? `Approved · ${shift.fund}` : shift.status === 'rejected' ? 'Rejected' : shift.status === 'submitted' ? 'Waiting for the organiser' : 'Not submitted'}</p>
                        {shift.status === 'rejected' && shift.rejectionNote && <p className="text-sm bg-[#EAD64D]/30 border border-[#EAD64D] p-2">Rejected: {shift.rejectionNote}</p>}
                        {shift.status !== 'approved' && !shift.archived && (shift.source === 'rostered' || shift.status === 'rejected') && (
                            <div className="grid grid-cols-2 gap-2">
                                <label className="text-xs">Actual start<input type="time" value={shift.actualStart} onChange={(event) => update(index, { actualStart: event.target.value })} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" /></label>
                                <label className="text-xs">Actual end<input type="time" value={shift.actualEnd} onChange={(event) => update(index, { actualEnd: event.target.value })} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" /></label>
                            </div>
                        )}
                        {shift.status !== 'approved' && !shift.archived && (
                            <label className="block text-xs">Notes
                                <textarea value={shift.casualNotes || ''} onChange={(event) => update(index, { casualNotes: event.target.value })} rows={2} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" placeholder="Anything the organiser should know about these hours" />
                            </label>
                        )}
                        {shift.status !== 'approved' && !shift.archived && (
                            <label className="block text-xs">Organiser
                                <OrganiserField email={shift.organiserEmail} onChange={(person) => update(index, person ? { organiserName: person.name, organiserEmail: person.email } : { organiserName: '', organiserEmail: '' })} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" />
                            </label>
                        )}
                        {(shift.status === 'approved' || shift.archived) && <p className="text-xs text-gray-500">Organiser: {shift.organiserName} · {shift.organiserEmail}</p>}
                        {shift.casualNotes && (shift.status === 'approved' || shift.archived) && <p className="text-xs text-gray-600">Notes: {shift.casualNotes}</p>}
                        {shift.status !== 'approved' && !shift.archived && (
                            <div className="flex gap-2">
                                {(shift.source === 'rostered' || shift.status === 'rejected') && (
                                    <button type="button" disabled={Boolean(busy)} onClick={() => submit(shift, index)} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider bg-black text-[#EAD64D] rounded-sm cursor-pointer disabled:opacity-40">Submit hours</button>
                                )}
                                <button type="button" disabled={Boolean(busy)} onClick={() => saveOrganiser(shift)} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider border border-gray-300 rounded-sm cursor-pointer disabled:opacity-40">Save organiser</button>
                            </div>
                        )}
                    </article>
                ))}
            </div>}
            {ready && <form onSubmit={addShift} className="border border-gray-200 bg-white p-4 rounded-sm space-y-3 text-sm">
                <div>
                    <h2 className="font-black uppercase">Add a shift that was not rostered</h2>
                    <p className="text-xs text-gray-500">This is tagged as not rostered. The Founders staff member you choose still receives the actual hours and can approve a budget code or reject the shift.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="text-xs">Date<input type="date" value={extra.date} onChange={(event) => setExtra({ ...extra, date: event.target.value })} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" required /></label>
                    <label className="text-xs">What was it for<input value={extra.event} onChange={(event) => setExtra({ ...extra, event: event.target.value })} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" required /></label>
                    <label className="text-xs">Start<input type="time" value={extra.actualStart} onChange={(event) => setExtra({ ...extra, actualStart: event.target.value })} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" required /></label>
                    <label className="text-xs">End<input type="time" value={extra.actualEnd} onChange={(event) => setExtra({ ...extra, actualEnd: event.target.value })} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" required /></label>
                    <label className="text-xs">Place<input value={extra.place} onChange={(event) => setExtra({ ...extra, place: event.target.value })} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" /></label>
                    <label className="text-xs">Tasks<input value={extra.tasks} onChange={(event) => setExtra({ ...extra, tasks: event.target.value })} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" /></label>
                    <label className="text-xs sm:col-span-2">Notes
                        <textarea value={extra.casualNotes} onChange={(event) => setExtra({ ...extra, casualNotes: event.target.value })} rows={2} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" placeholder="Anything the organiser should know about these hours" />
                    </label>
                    <label className="text-xs sm:col-span-2">Organiser
                        <OrganiserField email={extra.organiserEmail} onChange={(person) => setExtra({ ...extra, organiserName: person?.name || '', organiserEmail: person?.email || '' })} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" />
                    </label>
                </div>
                <button type="submit" disabled={Boolean(busy)} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider bg-black text-[#EAD64D] rounded-sm cursor-pointer disabled:opacity-40">Submit extra shift</button>
            </form>}
        </main>
    );
}

export default function Page() {
    return <Gate level="casual"><CasualHoursPage /></Gate>;
}
