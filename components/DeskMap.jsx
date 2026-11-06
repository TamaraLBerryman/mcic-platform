"use client";

import { useState } from 'react';
import { deskSlotKey, isHotDesk, patchDesk, swapDesks } from '../app/lib/deskLayout';

function deskKey(podId, rowId, index) {
    return `${podId}:${rowId}:${index}`;
}

export default function DeskMap({
    layout,
    searchQuery = '',
    onSelect,
    editable = false,
    onLayoutChange,
    occupancy = {},
    onHotDeskQr
}) {
    const [dragKey, setDragKey] = useState(null);
    const query = searchQuery.trim().toLowerCase();

    const handleDrop = (event, target) => {
        event.preventDefault();
        if (!editable || !dragKey) return;
        const [podId, rowId, index] = dragKey.split(':');
        const source = { podId, rowId, index: Number(index) };
        if (source.podId === target.podId && source.rowId === target.rowId && source.index === target.index) {
            setDragKey(null);
            return;
        }
        onLayoutChange?.(swapDesks(layout, source, target));
        setDragKey(null);
    };

    return (
        <div className="space-y-4 min-w-[950px]">
            <div className="grid grid-cols-12 gap-2 text-center text-[11px] font-extrabold text-black uppercase tracking-tight">
                <div className="col-span-5 bg-[#E2EFDA] border border-green-300 p-3 rounded-xs flex items-center justify-center">
                    <span>Kitchen</span>
                </div>
                <div className="col-span-2 bg-[#E2EFDA] border border-green-300 p-3 rounded-xs flex items-center justify-center">
                    <span>Copy Room</span>
                </div>
                <div className="col-span-1 bg-[#FFD966] border border-amber-400 p-2 rounded-xs flex flex-col items-center justify-center text-[9px]">
                    <span className="font-extrabold">1. David&apos;s Office</span>
                </div>
                <div className="col-span-4 grid grid-cols-3 gap-2">
                    <div className="bg-neutral-200 border border-gray-300 p-2 rounded-xs flex items-center justify-center text-[9px] text-neutral-700 font-bold">
                        Materials Science Office
                    </div>
                    <div className="bg-neutral-200 border border-gray-300 p-2 rounded-xs flex items-center justify-center text-[9px] text-neutral-700 font-bold">
                        Materials Science Office
                    </div>
                    <div className="bg-neutral-200 border border-gray-300 p-2 rounded-xs flex items-center justify-center text-[9px] text-neutral-700 font-bold">
                        Materials Science Office
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-5 space-y-3">
                    {layout.map((pod) => {
                        if (pod.category === 'amenity') {
                            return (
                                <div key={pod.id} className="grid grid-cols-2 gap-2 my-3">
                                    {pod.desks.map((desk, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-[#E2EFDA] border border-green-300 text-center py-3 rounded-xs text-[11px] font-extrabold text-black uppercase"
                                        >
                                            {desk.name}
                                        </div>
                                    ))}
                                </div>
                            );
                        }

                        const matchesSearch = query === '' || pod.rows.some((row) =>
                            row.desks.some((desk) =>
                                (desk.name && desk.name.toLowerCase().includes(query)) ||
                                (desk.role && desk.role.toLowerCase().includes(query))
                            )
                        );

                        return (
                            <div
                                key={pod.id}
                                className={`flex gap-2 items-stretch transition-all ${matchesSearch ? 'opacity-100' : 'opacity-25'}`}
                            >
                                <div className="w-14 flex-shrink-0 bg-neutral-100 border border-gray-200 rounded-xs flex items-center justify-center text-[9px] font-mono font-extrabold text-neutral-700 uppercase p-1">
                                    {pod.podLabel}
                                </div>
                                <div className={`flex-1 space-y-1.5 p-1.5 rounded-xs border ${pod.category === 'staff'
                                    ? 'bg-[#FFD966]/20 border-amber-300'
                                    : 'bg-neutral-50 border-gray-200'
                                    }`}>
                                    {pod.rows.map((row) => (
                                        <div
                                            key={row.id}
                                            className={`grid gap-1.5 ${row.is2Col ? 'grid-cols-2' : 'grid-cols-3'}`}
                                        >
                                            {row.desks.map((desk, idx) => {
                                                const isStaff = pod.category === 'staff';
                                                const isRedHotdesk = desk.type === 'hotdesk-red';
                                                const slotKey = deskSlotKey(pod.id, row.id, idx);
                                                const stay = occupancy[slotKey];
                                                const cardClass = `relative p-2 rounded-xs border text-center flex flex-col justify-center transition-all ${isStaff
                                                    ? 'bg-[#FFD966] border-amber-400 text-black'
                                                    : isRedHotdesk
                                                        ? 'bg-red-600 border-red-700 text-white'
                                                        : 'bg-black border-neutral-900 text-white'
                                                    }`;

                                                if (editable) {
                                                    return (
                                                        <div
                                                            key={idx}
                                                            draggable
                                                            onDragStart={() => setDragKey(deskKey(pod.id, row.id, idx))}
                                                            onDragOver={(event) => event.preventDefault()}
                                                            onDrop={(event) => handleDrop(event, { podId: pod.id, rowId: row.id, index: idx })}
                                                            className={`${cardClass} cursor-grab space-y-1`}
                                                        >
                                                            {isHotDesk(desk) && onHotDeskQr && (
                                                                <button
                                                                    type="button"
                                                                    draggable={false}
                                                                    onMouseDown={(event) => event.stopPropagation()}
                                                                    onClick={() => onHotDeskQr({ key: slotKey, label: desk.name })}
                                                                    className="absolute top-1 right-1 text-[8px] font-black uppercase px-1 py-0.5 bg-white text-black rounded-xs"
                                                                >
                                                                    QR
                                                                </button>
                                                            )}
                                                            <input
                                                                value={desk.name || ''}
                                                                onChange={(event) => onLayoutChange?.(patchDesk(layout, pod.id, row.id, idx, { name: event.target.value }))}
                                                                className="w-full bg-transparent text-center font-extrabold text-[10px] leading-tight outline-none border-b border-transparent focus:border-current"
                                                            />
                                                            <input
                                                                value={desk.role || ''}
                                                                onChange={(event) => onLayoutChange?.(patchDesk(layout, pod.id, row.id, idx, { role: event.target.value }))}
                                                                placeholder="Person"
                                                                className="w-full bg-transparent text-center text-[8px] opacity-80 leading-tight font-medium outline-none placeholder:text-current/50"
                                                            />
                                                            {stay && <span className="text-[8px] font-black uppercase">Occupied · {stay.name}</span>}
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => onSelect?.({ ...desk, occupied: Boolean(stay), occupantName: stay?.name || '' })}
                                                        className={`${cardClass} cursor-pointer ${isStaff
                                                            ? 'hover:bg-black hover:text-white'
                                                            : isRedHotdesk
                                                                ? 'hover:bg-black'
                                                                : 'hover:bg-[#FFD966] hover:text-black'
                                                            }`}
                                                    >
                                                        <div className="font-extrabold text-[10px] leading-tight">
                                                            {desk.name}
                                                        </div>
                                                        {stay ? (
                                                            <div className="text-[8px] font-black uppercase mt-0.5 leading-tight">Occupied · {stay.name}</div>
                                                        ) : desk.role && (
                                                            <div className="text-[8px] opacity-80 mt-0.5 leading-tight font-medium truncate">
                                                                {desk.role}
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="col-span-4 bg-neutral-200 border border-gray-300 rounded-xs flex items-center justify-center p-6 text-center">
                    <span className="text-sm font-black uppercase tracking-wider text-neutral-700">
                        Materials Science Labs
                    </span>
                </div>

                <div className="col-span-3 flex flex-col gap-3">
                    <div className="flex-1 bg-[#E2EFDA] border border-green-300 p-6 rounded-xs flex items-center justify-center text-center">
                        <div>
                            <h3 className="font-black text-base text-black uppercase tracking-tight">Founders Place</h3>
                            <span className="text-xs font-semibold text-neutral-700 block mt-0.5">(Event Space)</span>
                        </div>
                    </div>
                    <div className="flex-1 bg-[#E2EFDA] border border-green-300 p-6 rounded-xs flex items-center justify-center text-center">
                        <div>
                            <h3 className="font-black text-base text-black uppercase tracking-tight">Founders Place</h3>
                            <span className="text-xs font-semibold text-neutral-700 block mt-0.5">(Group Study)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
