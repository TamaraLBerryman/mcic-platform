"use client";

import { useState } from 'react';

export default function TimesheetsPage() {
    const [submittingStaff, setSubmittingStaff] = useState('');
    const [shiftDate, setShiftDate] = useState('2026-10-18');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('15:30');
    const [requestedBy, setRequestedBy] = useState('Tamara Berryman');
    const [varianceNotes, setVarianceNotes] = useState('');

    const staffList = [
        "Celine Olarte",
        "Dina Titkova",
        "Eleni Assargiotis",
        "Georgia Lyons",
        "Hamish McFarlane",
        "Joseph Po",
        "Maddison McCoy",
        "Mariana Luis Castillo Patron",
        "Nina Juhl",
        "Priscilla Tan",
        "Ria Kapoor",
        "Sasha Whittle",
        "Steven",
        "Tamara Berryman",
        "Vern Chan",
        "Wisiani Wijaya"
    ];

    // Calculate total hours and minutes worked
    const calculateHours = () => {
        if (!startTime || !endTime) return '0 hrs 0 mins';

        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        let startMinutes = startH * 60 + startM;
        let endMinutes = endH * 60 + endM;

        if (endMinutes < startMinutes) {
            endMinutes += 24 * 60;
        }

        const diffMinutes = endMinutes - startMinutes;
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

        if (minutes === 0) {
            return `${hours} hrs`;
        }
        if (hours === 0) {
            return `${minutes} mins`;
        }

        return `${hours} hrs ${minutes} mins`;
    };

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 font-sans">

            {/* DARK HERO BANNER (MATCHING INVENTORY HEADER) */}
            <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-black">
                    Staff Timesheet Submissions</h1>
                <p className="text-gray-600 text-xs sm:text-sm">Log your worked shift hours for quick approval.</p>
            </div>

            {/* MAIN FORM CONTAINER */}
            <main className="bg-white border border-gray-200 rounded-sm shadow-xs p-6 md:p-8 space-y-6">

                {/* STAFF IDENTIFICATION GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* SUBMITTING STAFF */}
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-neutral-700">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. John Smith"
                            value={submittingStaff}
                            onChange={(e) => setSubmittingStaff(e.target.value)}
                            className="w-full p-2.5 bg-neutral-50 border border-gray-300 rounded-xs text-xs font-semibold text-neutral-900 outline-none focus:border-black focus:bg-white transition-colors"
                        />
                    </div>

                    {/* SHIFT REQUESTED BY */}
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-neutral-700">
                            Shift Organised By <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={requestedBy}
                            onChange={(e) => setRequestedBy(e.target.value)}
                            className="w-full p-2.5 bg-neutral-50 border border-gray-300 rounded-xs text-xs font-bold text-neutral-900 outline-none focus:border-black focus:bg-white transition-colors cursor-pointer"
                        >
                            {staffList.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* DATE & TIME LOG GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs pt-2">
                    {/* DATE WORKED */}
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-neutral-700">
                            Date Worked
                        </label>
                        <input
                            type="date"
                            value={shiftDate}
                            onChange={(e) => setShiftDate(e.target.value)}
                            className="w-full p-2.5 bg-neutral-50 border border-gray-300 font-mono font-bold rounded-xs outline-none focus:border-black focus:bg-white text-neutral-900"
                        />
                    </div>

                    {/* START TIME */}
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-neutral-700">
                            Start Time
                        </label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full p-2.5 bg-neutral-50 border border-gray-300 font-mono font-bold rounded-xs outline-none focus:border-black focus:bg-white text-neutral-900"
                        />
                    </div>

                    {/* END TIME */}
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-neutral-700">
                            End Time
                        </label>
                        <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full p-2.5 bg-neutral-50 border border-gray-300 font-mono font-bold rounded-xs outline-none focus:border-black focus:bg-white text-neutral-900"
                        />
                    </div>

                    {/* CALCULATED HOURS DISPLAY */}
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-neutral-700">
                            Calculated Total
                        </label>
                        <div className="p-2.5 bg-[#EAD64D]/20 border border-[#EAD64D] font-mono font-black rounded-xs text-neutral-900 text-center text-xs">
                            {calculateHours()}
                        </div>
                    </div>
                </div>

                {/* NOTES FIELD */}
                <div className="space-y-1.5 pt-2">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-neutral-700">
                        Reason for Variance / Shift Notes
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. Event ran over so stayed late to lock up."
                        value={varianceNotes}
                        onChange={(e) => setVarianceNotes(e.target.value)}
                        className="w-full p-2.5 bg-neutral-50 border border-gray-300 text-xs rounded-xs outline-none focus:border-black focus:bg-white text-neutral-900"
                    />
                </div>

                {/* SUBMIT BUTTON HUB */}
                <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <button
                        type="button"
                        className="w-full sm:w-auto bg-black text-[#EAD64D] hover:bg-neutral-800 font-extrabold text-xs uppercase tracking-wider py-3 px-8 rounded-xs transition-colors cursor-pointer shadow-xs text-center"
                    >
                        Submit Timesheet ➔
                    </button>
                </div>

            </main>

        </div>
    );
}