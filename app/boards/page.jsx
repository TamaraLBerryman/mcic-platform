'use client';

import { useMemo, useState } from 'react';
import { countdownTarget, stamp } from '../lib/liveBoards';
import { BoardHeader, formatCountdown, useBoardFeed, useSydneyNow } from '../../components/BoardChrome';
import Gate from '../../components/Gate';

function registrationLabel(event) {
    if (event.registrationMode === 'platform') return String(event.registrations);
    if (event.registrationMode === 'external') return 'EXT';
    return '—';
}

function checkInLabel(event) {
    if (event.registrationMode === 'platform') return String(event.checkedIn || 0);
    return '—';
}

function placeLabel(event) {
    if (!event.offsite) return event.space.replace('MCIC ', '');
    return event.space && event.space !== 'Off site' ? `${event.space} · Off site` : 'Off site';
}

function EventBoardPage() {
    const feed = useBoardFeed();
    const clock = useSydneyNow();
    const [scope, setScope] = useState('founders');
    const scoped = useMemo(
        () => feed.events.filter((event) => scope === 'all' || event.founders),
        [feed.events, scope]
    );
    const active = scoped.filter((event) => stamp(event.date, event.eventEnd) > clock.stamp);
    const next = active[0] || null;
    const target = countdownTarget(next, clock.stamp);
    const todayCount = scoped.filter((event) => event.date === clock.today).length;
    const platformEvents = active.filter((event) => event.registrationMode === 'platform');
    const platformRegistrations = platformEvents.reduce((sum, event) => sum + event.registrations, 0);
    const platformCheckedIn = platformEvents.reduce((sum, event) => sum + (event.checkedIn || 0), 0);

    return (
        <main className="min-h-screen bg-black text-white font-sans">
            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
                <BoardHeader title="Departures" eyebrow="MCIC event board">
                    <div className="flex gap-2 mt-3 lg:justify-end">
                        {[
                            { id: 'founders', label: 'Founders' },
                            { id: 'all', label: 'All bookings' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setScope(tab.id)}
                                className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider border ${scope === tab.id ? 'bg-[#EAD64D] text-black border-[#EAD64D]' : 'border-neutral-700 text-neutral-300'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </BoardHeader>

                {feed.error && <p className="text-sm font-bold text-red-400">{feed.error}</p>}

                <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-3 border border-[#EAD64D]/50 p-6 space-y-3">
                        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#EAD64D]">
                            {target?.live ? 'On now' : 'Next event'}
                        </p>
                        {next ? (
                            <>
                                <h2 className="text-3xl sm:text-5xl font-black uppercase leading-none">{next.title}</h2>
                                <p className="font-mono text-sm text-neutral-300">
                                    {next.date} · {next.eventStart}–{next.eventEnd} · {placeLabel(next)}
                                </p>
                                {next.registrationMode === 'platform' && (
                                    <p className="font-mono text-sm text-[#EAD64D]">
                                        {next.registrations} registered · {next.checkedIn || 0} checked in
                                    </p>
                                )}
                                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-500">{target?.label || 'Finished'}</p>
                                <p className="font-mono text-6xl sm:text-7xl font-black text-[#EAD64D] tabular-nums">
                                    {target ? formatCountdown(target.at, clock.date) : '00:00:00'}
                                </p>
                            </>
                        ) : (
                            <h2 className="text-3xl font-black uppercase">
                                {feed.ready ? 'No upcoming events on this board' : 'Loading the board'}
                            </h2>
                        )}
                    </div>
                    <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                        <Stat label="Today" value={todayCount} />
                        <Stat label="Still to come" value={active.length} />
                        <Stat label="Next registered" value={next ? registrationLabel(next) : '—'} />
                        <Stat label="Next checked in" value={next ? checkInLabel(next) : '—'} />
                        <Stat label="Registered ahead" value={platformRegistrations} />
                        <Stat label="Checked in ahead" value={platformCheckedIn} />
                    </div>
                </section>

                <section className="border border-neutral-800 overflow-x-auto">
                    <table className="w-full text-left min-w-[720px]">
                        <thead className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#EAD64D] border-b border-neutral-800">
                            <tr>
                                <th className="py-3 px-4">When</th>
                                <th className="py-3 px-4">Event</th>
                                <th className="py-3 px-4">Space</th>
                                <th className="py-3 px-4">Reg</th>
                                <th className="py-3 px-4">In</th>
                                <th className="py-3 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scoped.filter((event) => event.date >= clock.today).slice(0, 16).map((event) => {
                                const rowTarget = countdownTarget(event, clock.stamp);
                                const departed = !rowTarget && event.date === clock.today;
                                return (
                                    <tr key={event.id} className={`border-b border-neutral-900 ${departed ? 'text-neutral-600' : ''}`}>
                                        <td className="py-4 px-4 font-mono text-sm whitespace-nowrap">
                                            {event.date.slice(5)} {event.eventStart}
                                        </td>
                                        <td className="py-4 px-4 font-black uppercase">{event.title}</td>
                                        <td className="py-4 px-4 text-sm text-neutral-300">{placeLabel(event)}</td>
                                        <td className="py-4 px-4 font-mono text-lg">{registrationLabel(event)}</td>
                                        <td className="py-4 px-4 font-mono text-lg">{checkInLabel(event)}</td>
                                        <td className="py-4 px-4 font-mono text-sm text-[#EAD64D]">
                                            {rowTarget?.live ? 'ON NOW' : rowTarget ? formatCountdown(rowTarget.at, clock.date) : departed ? 'DEPARTED' : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {feed.ready && scoped.filter((event) => event.date >= clock.today).length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-8 px-4 text-sm text-neutral-500">Nothing approved is coming up on this board.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </section>
                <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-600">
                    Founders includes off-site events organised by UNSW Founders. All bookings adds every other approved booking and listing. Reg is who registered on this platform. In is who is checked in. EXT means tickets are somewhere else, so there is no check-in count.
                </p>
            </div>
        </main>
    );
}

export default function Page() {
    return <Gate level="founders"><EventBoardPage /></Gate>;
}

function Stat({ label, value }) {
    return (
        <div className="border border-neutral-800 p-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500">{label}</p>
            <p className="font-mono text-3xl font-black text-[#EAD64D] mt-2">{value}</p>
        </div>
    );
}
