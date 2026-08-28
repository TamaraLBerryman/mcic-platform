"use client";

import { useState } from 'react';

export default function TimesheetsPage() {
    const [viewMode, setViewMode] = useState('approvals'); // 'approvals' | 'submit'

    // Streamlined Submissions State
    const [pendingApprovals, setPendingApprovals] = useState([
        {
            id: 'sub-101',
            casualName: 'Alex Smith',
            zID: 'z5234567',
            eventTask: 'Makerspace Supervision',
            requestedBy: 'Tamara Berryman',
            budgetCode: 'MCIC-OPS-2026-A',
            date: '12 Aug 2026',
            rosteredStart: '09:00',
            rosteredEnd: '14:00',
            rosteredTotal: '5.0 hrs',
            actualStart: '09:00',
            actualEnd: '15:30',
            actualTotal: '6.5 hrs',
            variance: '+1.5 hrs',
            notes: 'Covered extra hours due to workshop overflow.',
            status: 'Pending'
        },
        {
            id: 'sub-102',
            casualName: 'Jordan Lee',
            zID: 'z5112233',
            eventTask: 'Founders Hackathon AV Support',
            requestedBy: 'Tamara Berryman',
            budgetCode: 'EXT-FOUNDERS-01',
            date: '11 Aug 2026',
            rosteredStart: '13:00',
            rosteredEnd: '18:00',
            rosteredTotal: '5.0 hrs',
            actualStart: '13:00',
            actualEnd: '18:00',
            actualTotal: '5.0 hrs',
            variance: '0 hrs',
            notes: 'On time.',
            status: 'Pending'
        }
    ]);

    return (
        <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6 font-sans">

            {/* HEADER & TOGGLE */}
            <div className="border-b border-gray-200 pb-3 flex justify-between items-end">
                <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600">Operations & Payroll</span>
                    <h1 className="text-xl font-black text-black uppercase tracking-tight">Timesheets & Roster Approvals</h1>
                </div>

                <div className="flex bg-neutral-100 p-1 rounded-xs text-xs font-bold">
                    <button
                        onClick={() => setViewMode('approvals')}
                        className={`px-3 py-1 rounded-xs transition-all ${viewMode === 'approvals' ? 'bg-black text-[#EAD64D]' : 'text-gray-600'}`}
                    >
                        ⚡ Quick Approvals ({pendingApprovals.length})
                    </button>
                    <button
                        onClick={() => setViewMode('submit')}
                        className={`px-3 py-1 rounded-xs transition-all ${viewMode === 'submit' ? 'bg-black text-[#EAD64D]' : 'text-gray-600'}`}
                    >
                        📝 Staff Entry View
                    </button>
                </div>
            </div>

            {/* ========================================================= */}
            {/* VIEW 1: QUICK-GLANCE MANAGER APPROVALS TABLE              */}
            {/* ========================================================= */}
            {viewMode === 'approvals' && (
                <div className="bg-white border border-gray-200 rounded-sm shadow-xs overflow-hidden space-y-0">

                    {/* TABLE HEADER */}
                    <div className="bg-neutral-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center text-xs">
                        <span className="font-extrabold text-black uppercase tracking-wider">Awaiting Manager Sign-Off</span>
                        <span className="text-gray-500 text-[11px]">Approved hours ready for myUNSW entry</span>
                    </div>

                    {/* COMPACT APPROVALS TABLE */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 bg-neutral-100/60 text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
                                    <th className="p-3">Staff / Task</th>
                                    <th className="p-3">Budget Code</th>
                                    <th className="p-3">Rostered Time</th>
                                    <th className="p-3">Actual Worked</th>
                                    <th className="p-3">Total Time</th>
                                    <th className="p-3">Variance / Notes</th>
                                    <th className="p-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pendingApprovals.map((item) => (
                                    <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">

                                        {/* STAFF & TASK */}
                                        <td className="p-3">
                                            <div className="font-bold text-black">{item.casualName} <span className="font-normal text-gray-400">({item.zID})</span></div>
                                            <div className="text-[11px] text-gray-500">{item.eventTask}</div>
                                        </td>

                                        {/* BUDGET CODE */}
                                        <td className="p-3 font-mono font-bold text-black text-[11px]">
                                            {item.budgetCode}
                                        </td>

                                        {/* ROSTERED TIME */}
                                        <td className="p-3 text-gray-600 font-mono text-[11px]">
                                            <div>{item.date}</div>
                                            <div>{item.rosteredStart} – {item.rosteredEnd} ({item.rosteredTotal})</div>
                                        </td>

                                        {/* ACTUAL WORKED TIME */}
                                        <td className="p-3 font-mono text-black font-bold text-[11px]">
                                            <div>{item.actualStart} – {item.actualEnd}</div>
                                        </td>

                                        {/* TOTAL TIME */}
                                        <td className="p-3 font-mono font-black text-black">
                                            {item.actualTotal}
                                        </td>

                                        {/* VARIANCE & NOTES */}
                                        <td className="p-3">
                                            <span className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-xs mr-1 ${item.variance === '0 hrs' ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-900 border border-amber-300'
                                                }`}>
                                                {item.variance}
                                            </span>
                                            <span className="text-gray-500 italic text-[11px]">{item.notes}</span>
                                        </td>

                                        {/* ACTIONS */}
                                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                                            <button
                                                onClick={() => setPendingApprovals(pendingApprovals.filter(p => p.id !== item.id))}
                                                className="bg-emerald-600 text-white font-bold px-3 py-1 rounded-xs hover:bg-emerald-700 cursor-pointer"
                                            >
                                                Approve ✓
                                            </button>
                                            <button
                                                onClick={() => setPendingApprovals(pendingApprovals.filter(p => p.id !== item.id))}
                                                className="bg-gray-100 text-gray-700 font-bold px-2.5 py-1 rounded-xs hover:bg-red-100 hover:text-red-700 cursor-pointer"
                                            >
                                                Reject
                                            </button>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 2: CASUAL STAFF QUICK SUBMISSION CARD                */}
            {/* ========================================================= */}
            {viewMode === 'submit' && (
                <div className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-4">
                    <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                        <div>
                            <span className="bg-black text-[#EAD64D] text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-xs">Rostered Shift</span>
                            <h3 className="font-extrabold text-sm text-black uppercase mt-1">MCIC Makerspace Supervision</h3>
                            <p className="text-xs text-gray-500">Requested by: Tamara Berryman • Budget: <span className="font-mono font-bold text-black">MCIC-OPS-2026-A</span></p>
                        </div>
                        <div className="text-right text-xs bg-neutral-50 p-2.5 rounded-xs border border-gray-100 font-mono">
                            <div className="text-[9px] font-bold text-gray-400 uppercase">Rostered Shift</div>
                            <div className="font-bold text-black">09:00 – 14:00 (5.0 hrs)</div>
                        </div>
                    </div>

                    {/* TIME INPUT GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div>
                            <label className="block text-[10px] font-extrabold uppercase text-gray-500 mb-1">Actual Start Time</label>
                            <input type="time" defaultValue="09:00" className="w-full p-2 border border-gray-300 font-mono font-bold rounded-xs" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-extrabold uppercase text-gray-500 mb-1">Actual End Time</label>
                            <input type="time" defaultValue="15:30" className="w-full p-2 border border-gray-300 font-mono font-bold rounded-xs" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-extrabold uppercase text-gray-500 mb-1">Calculated Total Time</label>
                            <input type="text" readOnly value="6.5 hrs (+1.5 hrs)" className="w-full p-2 border border-gray-200 bg-neutral-100 font-mono font-bold rounded-xs text-emerald-800" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-extrabold uppercase text-gray-500 mb-1">Reason for Variance (Required if extra/fewer hours worked)</label>
                        <input type="text" placeholder="e.g. Workshop was packed so stayed 1.5 hrs late to supervise packdown." className="w-full p-2 border border-gray-300 text-xs rounded-xs" />
                    </div>

                    <div className="flex justify-end pt-2">
                        <button className="bg-black text-[#EAD64D] px-5 py-2 text-xs font-bold uppercase rounded-xs hover:bg-neutral-800 cursor-pointer">
                            Submit Timesheet →
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}