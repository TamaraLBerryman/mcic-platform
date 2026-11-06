'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sydneyLocalToDate, sydneyWallClock } from '../app/lib/eventReminders';

export function useBoardFeed() {
    const [feed, setFeed] = useState({ ready: false, error: '', today: '', events: [] });

    useEffect(() => {
        let stopped = false;
        const load = () => {
            fetch('/api/boards')
                .then((response) => response.json())
                .then((data) => {
                    if (stopped) return;
                    if (!data.success) {
                        setFeed((current) => ({ ...current, ready: true, error: data.error || 'The board could not be loaded.' }));
                        return;
                    }
                    setFeed({ ready: true, error: '', today: data.today, events: data.events || [] });
                })
                .catch(() => {
                    if (!stopped) setFeed((current) => ({ ...current, ready: true, error: 'The board could not be loaded.' }));
                });
        };
        load();
        const timer = setInterval(load, 30000);
        return () => {
            stopped = true;
            clearInterval(timer);
        };
    }, []);

    return feed;
}

export function useSydneyNow() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    const wall = sydneyWallClock(now);
    return { date: now, wall, today: wall.slice(0, 10), time: wall.slice(11, 16), stamp: wall };
}

export function BoardHeader({ title, eyebrow, children }) {
    const clock = useSydneyNow();
    const shown = new Intl.DateTimeFormat('en-AU', {
        timeZone: 'Australia/Sydney',
        weekday: 'short',
        day: '2-digit',
        month: 'short'
    }).format(clock.date).toUpperCase();

    return (
        <header className="border-b border-[#EAD64D]/40 pb-5 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-[#EAD64D]">{eyebrow}</p>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight uppercase">{title}</h1>
                <nav className="flex gap-4 mt-3 text-[10px] font-bold uppercase tracking-wider">
                    <Link href="/boards" className="hover:text-[#EAD64D]">Event countdown</Link>
                    <Link href="/boards/spaces" className="hover:text-[#EAD64D]">Spaces today</Link>
                </nav>
            </div>
            <div className="text-left lg:text-right">
                <p className="font-mono text-4xl sm:text-6xl font-black text-[#EAD64D] tabular-nums">{clock.time}</p>
                <p className="text-xs font-mono uppercase tracking-widest text-neutral-400">{shown} · Sydney</p>
                {children}
            </div>
        </header>
    );
}

export function formatCountdown(targetStamp, nowDate) {
    const target = sydneyLocalToDate(targetStamp);
    if (!target) return '--:--:--';
    const total = Math.max(0, Math.floor((target.getTime() - nowDate.getTime()) / 1000));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const clockText = [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
    return days > 0 ? `${days}d ${clockText}` : clockText;
}
