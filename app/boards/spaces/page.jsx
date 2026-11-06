'use client';

import { SPACE_BOARDS, dayRows, spaceEvents, stamp } from '../../lib/liveBoards';
import { BoardHeader, formatCountdown, useBoardFeed, useSydneyNow } from '../../../components/BoardChrome';

export default function SpaceBoardPage() {
    const feed = useBoardFeed();
    const clock = useSydneyNow();

    return (
        <main className="min-h-screen bg-black text-white font-sans">
            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
                <BoardHeader title="Spaces today" eyebrow="MCIC live spaces" />
                {feed.error && <p className="text-sm font-bold text-red-400">{feed.error}</p>}
                {!feed.ready && <p className="text-sm text-neutral-500">Loading today’s spaces…</p>}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {SPACE_BOARDS.map((board) => {
                        const rows = dayRows(spaceEvents(feed.events, board.space), clock.today, clock.time);
                        const current = rows.find((row) => row.kind === 'event' && row.phase === 'now')
                            || rows.find((row) => row.kind === 'gap' && row.current);
                        const upcoming = rows.find((row) => row.kind === 'event' && row.phase === 'later');
                        return (
                            <section key={board.id} className="border border-neutral-800 p-5 space-y-4">
                                <div className="flex items-baseline justify-between gap-3">
                                    <div>
                                        <h2 className="text-2xl font-black uppercase">{board.name}</h2>
                                        {board.note && <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">{board.note}</p>}
                                    </div>
                                    <p className="font-mono text-xs text-[#EAD64D]">
                                        {current?.kind === 'event' ? 'ON NOW' : current?.kind === 'gap' ? 'GAP' : rows.some((row) => row.kind === 'event' && row.phase === 'later') ? 'FREE NOW' : 'CLEAR'}
                                    </p>
                                </div>
                                {rows.length > 0 && <NowLine row={current} upcoming={upcoming} now={clock.date} />}
                                {rows.length === 0 ? (
                                    <p className="text-sm text-neutral-500 border border-dashed border-neutral-800 p-4">Nothing booked in this space today.</p>
                                ) : (
                                    <ol className="space-y-2">
                                        {rows.map((row) => (
                                            <li key={row.id} className={`flex items-baseline justify-between gap-3 border-b border-neutral-900 pb-2 ${row.phase === 'past' ? 'text-neutral-600' : ''}`}>
                                                <span className="font-mono text-xs whitespace-nowrap">{row.kind === 'gap' ? `${row.start}–${row.end}` : `${row.bumpIn}–${row.bumpOut}`}</span>
                                                <span className={`flex-1 text-sm font-bold uppercase ${row.kind === 'gap' ? 'text-neutral-400' : ''}`}>
                                                    {row.kind === 'gap' ? 'Gap' : row.title}
                                                    {row.coveredByEntire && <span className="block text-[10px] font-mono normal-case tracking-normal text-neutral-500">Entire Space booking</span>}
                                                </span>
                                                <span className="font-mono text-[10px] uppercase text-[#EAD64D]">
                                                    {row.kind === 'gap' ? (row.current ? 'NOW' : '') : row.phase === 'now' ? 'NOW' : row.phase === 'past' ? 'DONE' : 'LATER'}
                                                </span>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </section>
                        );
                    })}
                </div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-600">
                    Approved bookings only. A gap is free time between bump-out and the next bump-in. Event Space and Design Space also show an Entire Space booking, because that booking uses both rooms.
                </p>
            </div>
        </main>
    );
}

function NowLine({ row, upcoming, now }) {
    if (!row && upcoming) {
        return (
            <div>
                <p className="text-xl font-black uppercase">Next · {upcoming.title}</p>
                <p className="font-mono text-3xl text-[#EAD64D]">{formatCountdown(stamp(upcoming.date, upcoming.bumpIn), now)}</p>
            </div>
        );
    }
    if (!row) return <p className="text-sm text-neutral-400">Nothing else is scheduled today.</p>;
    if (row.kind === 'gap') {
        return (
            <div>
                <p className="text-xl font-black uppercase">Open until {row.end}</p>
                <p className="font-mono text-3xl text-[#EAD64D]">{formatCountdown(stamp(row.date, row.end), now)}</p>
            </div>
        );
    }
    return (
        <div>
            <p className="text-xl font-black uppercase">{row.title}</p>
            <p className="text-xs font-mono text-neutral-400">Until {row.bumpOut}{row.eventStart !== row.bumpIn ? ` · Event ${row.eventStart}–${row.eventEnd}` : ''}</p>
            <p className="font-mono text-3xl text-[#EAD64D]">{formatCountdown(stamp(row.date, row.bumpOut), now)}</p>
        </div>
    );
}
