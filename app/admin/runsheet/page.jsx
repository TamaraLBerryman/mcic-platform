"use client";

import { useState } from 'react';

export default function RunsheetPage() {
    const [tasks, setTasks] = useState([
        { id: 1, time: "08:30 AM", task: "Unlock MCIC Level 1 main entrance & verify security status", space: "Main Entry", done: false },
        { id: 2, time: "09:00 AM", task: "Check kitchenette stock (coffee beans, oat milk, cups)", space: "Kitchen", done: false },
        { id: 3, time: "10:00 AM", task: "Set up AV and rolling display for Founders Pitch rehearsal", space: "Event Space", done: false },
        { id: 4, time: "01:00 PM", task: "Inspect 3D printers and restock filament rolls", space: "Makerspace", done: false },
        { id: 5, time: "04:30 PM", task: "Clear unlabelled fridge items and secure Level 1 doors", space: "Kitchen / All", done: false }
    ]);

    const toggleTask = (id) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    };

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">
            <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
                <header className="space-y-2 border-b border-gray-200 pb-6">
                    <div className="inline-block bg-black text-[#EAD64D] font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-sm">
                        MCIC Operations Terminal
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
                        Daily Venue Runsheet
                    </h1>
                    <p className="text-gray-600 text-xs sm:text-sm">
                        Real-time operational checklist and setup schedule for Level 1 staff and coordinators.
                    </p>
                </header>

                <div className="bg-white border border-gray-200 rounded-sm shadow-xs overflow-hidden divide-y divide-gray-100">
                    {tasks.map(item => (
                        <div key={item.id} className="p-5 flex items-center justify-between gap-4 hover:bg-neutral-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <input
                                    type="checkbox"
                                    checked={item.done}
                                    onChange={() => toggleTask(item.id)}
                                    className="w-5 h-5 accent-black rounded-sm cursor-pointer"
                                />
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-[10px] font-bold bg-neutral-100 px-2 py-0.5 rounded-xs text-neutral-700">{item.time}</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">📍 {item.space}</span>
                                    </div>
                                    <p className={`text-sm font-bold ${item.done ? 'line-through text-gray-400' : 'text-black'}`}>
                                        {item.task}
                                    </p>
                                </div>
                            </div>
                            <span className={`font-mono text-[10px] font-bold uppercase px-2.5 py-1 rounded-sm border ${item.done ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                {item.done ? 'Completed' : 'Pending'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}