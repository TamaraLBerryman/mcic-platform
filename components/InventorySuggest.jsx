"use client";

import { useMemo, useState } from 'react';

export default function InventorySuggest({ items, value, itemId, finished = false, onChange, placeholder = 'What is broken' }) {
    const [open, setOpen] = useState(false);
    const query = value.trim().toLowerCase();
    const matches = useMemo(() => {
        if (!query) return [];
        return items
            .filter((item) => String(item.name || '').toLowerCase().includes(query))
            .slice(0, 8);
    }, [items, query]);
    const selected = items.find((item) => item.id === itemId);
    const linked = Boolean(selected && selected.name === value);

    const choose = (item) => {
        onChange({ text: item.name, itemId: item.id, inInventory: true, finished: true });
        setOpen(false);
    };

    return (
        <div className="relative">
            <input
                required
                value={value}
                placeholder={placeholder}
                autoComplete="off"
                onFocus={() => setOpen(true)}
                onBlur={() => {
                    setOpen(false);
                    onChange({
                        text: value,
                        itemId: linked ? itemId : null,
                        inInventory: linked,
                        finished: true
                    });
                }}
                onChange={(event) => {
                    setOpen(true);
                    onChange({ text: event.target.value, itemId: null, inInventory: false, finished: false });
                }}
                className="w-full p-3 border border-gray-300 text-xs rounded-xs bg-white"
            />
            {open && matches.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xs shadow-md max-h-48 overflow-auto">
                    {matches.map((item) => (
                        <li key={item.id}>
                            <button
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => choose(item)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-100"
                            >
                                <span className="font-bold">{item.name}</span>
                                {item.storageLocation && <span className="block text-gray-500">{item.storageLocation}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {finished && value.trim() && !linked && (
                <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-neutral-700 bg-neutral-100 border border-neutral-300 px-2 py-0.5 rounded-full">Not in inventory</span>
            )}
        </div>
    );
}
