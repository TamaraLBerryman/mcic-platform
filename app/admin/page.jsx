"use client";

import { useState } from 'react';

// Color Code Legend matching your Excel key
const COLOR_CLASSES = {
    staff: 'bg-amber-300 text-black border-amber-400',          // UNSW Founders Staff (Yellow)
    staffHotdesk: 'bg-amber-100 text-black border-amber-200',   // Hotdesk Staff Only (Light Yellow)
    startup: 'bg-black text-white border-neutral-800',          // Startups Allocated (Black)
    startupHotdesk: 'bg-red-600 text-white border-red-700',     // Hotdesk Startups (Red)
    facility: 'bg-emerald-100 text-emerald-950 border-emerald-300', // Kitchen / Shared Spaces (Green)
    mse: 'bg-neutral-200 text-neutral-700 border-neutral-300'  // MSE Labs (Grey)
};

export default function AdminDashboardPage() {
    // Admin Navigation tab state: 'overview' | 'events-analytics' | 'spaces' | 'assets' | 'alerts' | 'audit'
    const [activeTab, setActiveTab] = useState('spaces');

    // Date Range Selection State for Events Reporting
    const [startDate, setStartDate] = useState('2026-08-01');
    const [endDate, setEndDate] = useState('2026-08-31');

    // Resident Search & Audit History State
    const [auditSearchQuery, setAuditSearchQuery] = useState('');
    const [auditRecord, setAuditRecord] = useState(null);
    const [hasAudited, setHasAudited] = useState(false);

    // Organizer Audit Query
    const [organizerEmail, setOrganizerEmail] = useState('');
    const [organizerAuditResult, setOrganizerAuditResult] = useState(null);

    // Asset / Hardware Inventory Loan Tracker State
    const [activeLoans, setActiveLoans] = useState([
        { id: 'L-101', item: 'Kitchen Tablet (iPad 10.2)', borrower: 'Alex Rivera (Solaris AI)', zID: 'z5392014', issuedDate: '10 Aug 2026', due: '10 Sep 2026', status: 'Active' },
        { id: 'L-102', item: 'Kitchen Ticket Printer (Epson TM-T88VII)', borrower: 'Samantha Chen (BioMesh Tech)', zID: 'z5104882', issuedDate: '02 Aug 2026', due: '02 Sep 2026', status: 'Active' },
        { id: 'L-103', item: 'Handheld Barcode Scanner', borrower: 'Marcus Vance (QuantumLeap)', zID: 'z5294011', issuedDate: '15 Jul 2026', due: '15 Aug 2026', status: 'Overdue' }
    ]);

    // Mock Supply & Maintenance Alerts Log
    const [supplyAlerts, setSupplyAlerts] = useState([
        { id: 'A-01', type: 'Low Stock', item: 'Oat Milk', location: 'Level 1 Kitchenette', reporter: 'Alex Rivera', time: '10 mins ago', status: 'Pending' },
        { id: 'A-02', type: 'Maintenance', item: 'Apeos C4570 Paper Jam / Tray 2', location: 'Copy Room', reporter: 'Tamara Berryman', time: '1 hour ago', status: 'In Progress' },
        { id: 'A-03', type: 'Low Stock', item: 'Coffee Beans', location: 'Level 1 Kitchenette', reporter: 'Samantha Chen', time: '3 hours ago', status: 'Resolved' }
    ]);

    // Mock Resident Access Database
    const adminAccessAccounts = [
        { zid: "z5392014", name: "Alex Rivera", startup: "Solaris AI", category: "Current UNSW Student", stageLabel: "Card Encoding / Badge Pickup", accessActive: true, deskAssigned: "Bay A - Desk 1" },
        { zid: "z5104882", name: "Samantha Chen", startup: "BioMesh Tech", category: "Pre-10x Incubator", stageLabel: "Safety Moodle Pending", accessActive: false, deskAssigned: "Bay A - Desk 3" },
        { zid: "z5294011", name: "Marcus Vance", startup: "QuantumLeap Dynamics", category: "External / Alumni", stageLabel: "HR / zID Affiliate Setup", accessActive: false, deskAssigned: "Bay B - Desk 1" }
    ];

    // Department Breakdown Performance Shares Data
    const departmentBreakdown = [
        { dept: 'UNSW Engineering', share: 45, color: 'bg-black' },
        { dept: 'UNSW Business School', share: 25, color: 'bg-[#EAD64D]' },
        { dept: 'UNSW Art, Design & Architecture', share: 15, color: 'bg-[#555555]' },
        { dept: 'UNSW Science & Medicine', share: 10, color: 'bg-[#888888]' },
        { dept: 'External Partners', share: 5, color: 'bg-[#CCCCCC]' }
    ];

    // Floorplan Excel Layout State (Pods 0 to 14)
    const [pods, setPods] = useState([
        {
            id: 'pod-0',
            label: 'POD 0',
            desks: [
                { id: 'd-2', number: 2, name: 'Dina Titkova', title: 'Senior Manager, Entrepreneurship', type: 'staff' },
                { id: 'd-3', number: 3, name: 'Celine Olarte', title: 'Program Coordinator', type: 'staff' }
            ]
        },
        {
            id: 'pod-1',
            label: 'POD 1',
            desks: [
                { id: 'd-4', number: 4, name: 'Steven', title: 'Project Officer - Splice', type: 'staff' },
                { id: 'd-5', number: 5, name: 'Nina Juhl', title: 'Senior Manager, Entrepreneurship', type: 'staff' },
                { id: 'd-6', number: 6, name: 'Maddison McCoy', title: 'Community Manager, Engineering', type: 'staff' },
                { id: 'd-7', number: 7, name: 'Wistani Wijaya', title: 'Investment Portfolio Coordinator', type: 'staff' }
            ]
        },
        {
            id: 'pod-2',
            label: 'POD 2',
            desks: [
                { id: 'd-8', number: 8, name: 'Vern Chan', title: 'Global Program Manager', type: 'staff' },
                { id: 'd-9', number: 9, name: 'Hotdesk', title: '(Founders Staff Only)', type: 'staffHotdesk' },
                { id: 'd-10', number: 10, name: 'Sasha Whittle', title: 'Program Manager', type: 'staff' },
                { id: 'd-11', number: 11, name: 'Joseph Po', title: 'Health Accelerator Program Manager', type: 'staff' }
            ]
        },
        {
            id: 'pod-3',
            label: 'POD 3',
            desks: [
                { id: 'd-12', number: 12, name: 'Mariana Lus Castillo Patron', title: 'Community Manager', type: 'staff' },
                { id: 'd-13', number: 13, name: 'Georgia Lyons', title: 'Program Manager', type: 'staff' },
                { id: 'd-14', number: 14, name: 'Ria Kapoor', title: 'Community Intern', type: 'staff' },
                { id: 'd-15', number: 15, name: 'Clem Assarghis', title: 'Program Manager, Foundry 10x', type: 'staff' }
            ]
        },
        {
            id: 'pod-4',
            label: 'POD 4',
            desks: [
                { id: 'd-16', number: 16, name: 'Priscila Tan', title: 'Program Manager, Edu Entre', type: 'staff' },
                { id: 'd-17', number: 17, name: 'Hotdesk', title: '(Founders Staff Only)', type: 'staffHotdesk' },
                { id: 'd-18', number: 18, name: 'Hamish McFarlane', title: 'MCIC Makerspace Coordinator', type: 'staff' },
                { id: 'd-19', number: 19, name: 'Tamara Berryman', title: 'Event Coordinator', type: 'staff' }
            ]
        },
        {
            id: 'pod-5',
            label: 'POD 5',
            desks: [
                { id: 'd-20', number: 20, name: 'Reuben Roy', company: 'Reckro', type: 'startup' },
                { id: 'd-21', number: 21, name: '', company: 'Reckro', type: 'startup' },
                { id: 'd-22', number: 22, name: 'Hotdesk', company: 'Hotdesk', type: 'startupHotdesk' }
            ]
        },
        {
            id: 'pod-6',
            label: 'POD 6',
            desks: [
                { id: 'd-23', number: 23, name: 'Simon Lim', company: 'Talk Lawyers', type: 'startup' },
                { id: 'd-24', number: 24, name: '', company: 'Green Dynamic', type: 'startup' },
                { id: 'd-25', number: 25, name: '', company: 'Green Dynamic', type: 'startup' },
                { id: 'd-26', number: 26, name: '', company: 'Gridsight', type: 'startup' },
                { id: 'd-27', number: 27, name: '', company: 'Gridsight', type: 'startup' },
                { id: 'd-28', number: 28, name: '', company: 'Gridsight', type: 'startup' }
            ]
        },
        {
            id: 'pod-7',
            label: 'POD 7',
            desks: [
                { id: 'd-29', number: 29, name: '', company: 'Gridsight', type: 'startup' },
                { id: 'd-30', number: 30, name: '', company: 'Gridsight', type: 'startup' },
                { id: 'd-31', number: 31, name: '', company: 'Gridsight', type: 'startup' },
                { id: 'd-32', number: 32, name: 'Peter Toth', company: 'Extraterrestrial Power', type: 'startup' },
                { id: 'd-33', number: 33, name: '', company: 'Extraterrestrial Power', type: 'startup' },
                { id: 'd-34', number: 34, name: 'Jacques-Samuel Prolon', company: 'Extraterrestrial Power', type: 'startup' }
            ]
        },
        {
            id: 'pod-8',
            label: 'POD 8',
            desks: [
                { id: 'd-35', number: 35, name: 'Chin (Ken) Wong', company: 'Vesculate', type: 'startup' },
                { id: 'd-37', number: 37, name: 'Matt Cabanag', company: 'Square Storm Interactive', type: 'startup' }
            ]
        },
        {
            id: 'pod-9',
            label: 'POD 9',
            desks: [
                { id: 'd-38', number: 38, name: '', company: 'ConnectOnion', type: 'startup' },
                { id: 'd-40', number: 40, name: '', company: 'Clave Systems', type: 'startup' },
                { id: 'd-41', number: 41, name: 'Aaron', company: 'ConnectOnion', type: 'startup' },
                { id: 'd-43', number: 43, name: 'Sam Brew', company: 'Clave Systems', type: 'startup' }
            ]
        },
        {
            id: 'pod-10',
            label: 'POD 10',
            desks: [
                { id: 'd-44', number: 44, name: 'Zhenwei (Eric) He', company: 'Vizia', type: 'startup' },
                { id: 'd-45', number: 45, name: 'Mathew Eyles', company: 'Vizia', type: 'startup' },
                { id: 'd-46', number: 46, name: 'Stone Drury', company: 'Vizia', type: 'startup' },
                { id: 'd-47', number: 47, name: 'Evan Shing Hin Tang', company: 'Zenith', type: 'startup' },
                { id: 'd-48', number: 48, name: 'Isobel McPhee', company: 'Zenith', type: 'startup' },
                { id: 'd-49', number: 49, name: 'Joshua John Mitchell', company: 'Zenith', type: 'startup' }
            ]
        },
        {
            id: 'pod-11',
            label: 'POD 11',
            desks: [
                { id: 'd-50', number: 50, name: 'Jason Cai', company: 'Tendor', type: 'startup' },
                { id: 'd-51', number: 51, name: '', company: 'Tendor', type: 'startup' },
                { id: 'd-52', number: 52, name: '', company: 'Tendor', type: 'startup' },
                { id: 'd-53', number: 53, name: 'Hotdesk', company: 'Hotdesk', type: 'startupHotdesk' },
                { id: 'd-54', number: 54, name: 'Hotdesk', company: 'Hotdesk', type: 'startupHotdesk' },
                { id: 'd-55', number: 55, name: 'Hotdesk', company: 'Hotdesk', type: 'startupHotdesk' }
            ]
        },
        {
            id: 'pod-12',
            label: 'POD 12',
            desks: [
                { id: 'd-56', number: 56, name: 'Jesse', company: 'Innersteps', type: 'startup' },
                { id: 'd-57', number: 57, name: '', company: 'Innersteps', type: 'startup' },
                { id: 'd-58', number: 58, name: 'Matt', company: 'Innersteps', type: 'startup' },
                { id: 'd-59', number: 59, name: '', company: 'Vocare', type: 'startup' },
                { id: 'd-60', number: 60, name: '', company: 'Vocare', type: 'startup' },
                { id: 'd-61', number: 61, name: '', company: 'Vocare', type: 'startup' }
            ]
        },
        {
            id: 'pod-13',
            label: 'POD 13',
            desks: [
                { id: 'd-62', number: 62, name: '', company: 'Rohbus AI', type: 'startup' },
                { id: 'd-63', number: 63, name: '', company: 'Rohbus AI', type: 'startup' },
                { id: 'd-64', number: 64, name: '', company: 'Rohbus AI', type: 'startup' },
                { id: 'd-65', number: 65, name: '', company: 'Hello solar again', type: 'startup' },
                { id: 'd-67', number: 67, name: 'Mohit Midha', company: 'Hoogly', type: 'startup' }
            ]
        },
        {
            id: 'pod-14',
            label: 'POD 14',
            desks: [
                { id: 'd-68', number: 68, name: '', company: 'Hello solar again', type: 'startup' },
                { id: 'd-70', number: 70, name: '', company: 'Hello solar again', type: 'startup' }
            ]
        }
    ]);

    // Drag-and-Drop & Toast Notification State
    const [draggedDeskId, setDraggedDeskId] = useState(null);
    const [notification, setNotification] = useState(null);

    const handleDragStart = (e, deskId) => {
        setDraggedDeskId(deskId);
        e.dataTransfer.setData('text/plain', deskId);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e, targetDeskId) => {
        e.preventDefault();
        if (!draggedDeskId || draggedDeskId === targetDeskId) return;

        setPods((prevPods) => {
            let sourceDesk = null;
            let targetDesk = null;

            prevPods.forEach((pod) => {
                pod.desks.forEach((d) => {
                    if (d.id === draggedDeskId) sourceDesk = d;
                    if (d.id === targetDeskId) targetDesk = d;
                });
            });

            if (!sourceDesk || !targetDesk) return prevPods;

            return prevPods.map((pod) => ({
                ...pod,
                desks: pod.desks.map((d) => {
                    if (d.id === draggedDeskId) {
                        return {
                            ...d,
                            name: targetDesk.name,
                            title: targetDesk.title,
                            company: targetDesk.company,
                            type: targetDesk.type
                        };
                    }
                    if (d.id === targetDeskId) {
                        return {
                            ...d,
                            name: sourceDesk.name,
                            title: sourceDesk.title,
                            company: sourceDesk.company,
                            type: sourceDesk.type
                        };
                    }
                    return d;
                })
            }));
        });

        setDraggedDeskId(null);
    };

    const handleDeskChange = (deskId, field, value) => {
        setPods((prevPods) =>
            prevPods.map((pod) => ({
                ...pod,
                desks: pod.desks.map((d) => (d.id === deskId ? { ...d, [field]: value } : d))
            }))
        );
    };

    const triggerPublicUpdate = (deskNumber, name) => {
        setNotification(`Desk #${deskNumber} (${name || 'Unassigned'}) updated & synced to public page!`);
        setTimeout(() => setNotification(null), 3000);
    };

    const handleAdminAuditSearch = (e) => {
        e.preventDefault();
        setHasAudited(true);
        const query = auditSearchQuery.toLowerCase().trim();
        const found = adminAccessAccounts.find(
            acc => acc.zid.toLowerCase().includes(query) || acc.name.toLowerCase().includes(query) || acc.startup.toLowerCase().includes(query)
        );
        setAuditRecord(found || null);
    };

    const handleOrganizerAudit = (e) => {
        e.preventDefault();
        if (!organizerEmail) return;
        setOrganizerAuditResult({
            email: organizerEmail,
            totalBookings: 6,
            repeatStatus: 'Repeat Hirer (High Frequency)',
            rating: '4.9 / 5.0',
            lastEvent: 'AI In Healthcare Workshop (12 Aug 2026)'
        });
    };

    const handleResolveAlert = (id) => {
        setSupplyAlerts(prev => prev.map(alert => alert.id === id ? { ...alert, status: 'Resolved' } : alert));
    };

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">
            <div className="max-w-7xl mx-auto px-6 sm:px-12 py-10 space-y-8">

                {/* TOAST NOTIFICATION */}
                {notification && (
                    <div className="fixed top-5 right-5 bg-black text-[#EAD64D] px-5 py-3 rounded-xs font-bold text-xs uppercase shadow-xl z-50 border border-[#EAD64D]">
                        {notification}
                    </div>
                )}

                {/* ADMIN HEADER */}
                <header className="bg-white p-6 sm:p-8 border border-gray-200 rounded-sm shadow-xs flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <span className="bg-[#EAD64D] text-black font-extrabold text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-xs">
                            UNSW Founders • Internal Ops & Analytics
                        </span>
                        <h1 className="text-3xl font-extrabold tracking-tight text-black uppercase mt-2">
                            MCIC Operational Control & Reporting
                        </h1>
                        <p className="text-gray-500 text-xs mt-1">
                            Comprehensive reporting for event hire performance, department participation, co-working capacity, and facility maintenance.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 border border-gray-200 text-xs font-mono font-bold rounded-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live Analytics Stream
                        </span>
                    </div>
                </header>

                {/* ADMIN TAB NAVIGATION */}
                <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
                    {[
                        { id: 'overview', label: 'Command Overview' },
                        { id: 'events-analytics', label: '📊 Events Reporting & Analytics' },
                        { id: 'spaces', label: '🗺️ Coworking Map & Occupancy' },
                        { id: 'assets', label: 'Hardware Loans' },
                        { id: 'alerts', label: 'Maintenance Alerts' },
                        { id: 'audit', label: 'Resident Audit Lookup' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-sm transition-all duration-150 cursor-pointer ${activeTab === tab.id
                                ? 'bg-black text-[#EAD64D] shadow-xs'
                                : 'bg-white text-gray-700 hover:bg-neutral-100 border border-gray-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* TAB 2: EXCEL DESK ALLOCATION FLOORPLAN */}
                {activeTab === 'spaces' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        {/* FLOORPLAN HEADER & LEGEND */}
                        <div className="bg-white p-6 border border-gray-200 rounded-sm shadow-xs flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div>
                                <h2 className="text-xl font-extrabold text-black uppercase">Interactive Desk Allocation Map</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Drag cards to swap desk locations. Click on any name or company text to edit inline.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono font-bold uppercase">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-300 border border-amber-400 rounded-xs"></span> Staff</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-100 border border-amber-200 rounded-xs"></span> Staff Hotdesk</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-black rounded-xs"></span> Startups</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-600 rounded-xs"></span> Startup Hotdesk</span>
                            </div>
                        </div>

                        {/* LAYOUT GRID */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* POD BAYS */}
                            <div className="lg:col-span-8 bg-white p-6 border border-gray-200 rounded-sm shadow-xs space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                    <h3 className="text-xs font-black uppercase text-black tracking-wider">Level 1 Main Desk Bays</h3>
                                    <span className="text-[10px] font-mono text-gray-400">💡 Drag cards to swap occupants</span>
                                </div>

                                <div className="space-y-4">
                                    {pods.map((pod) => (
                                        <div key={pod.id} className="border border-gray-200 rounded-xs p-3 bg-neutral-50/60 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-mono font-bold uppercase text-neutral-500">{pod.label}</span>
                                                <span className="text-[9px] font-mono text-gray-400">{pod.desks.length} Desks</span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                {pod.desks.map((desk) => {
                                                    const colorStyle = COLOR_CLASSES[desk.type] || COLOR_CLASSES.startup;

                                                    return (
                                                        <div
                                                            key={desk.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, desk.id)}
                                                            onDragOver={handleDragOver}
                                                            onDrop={(e) => handleDrop(e, desk.id)}
                                                            className={`p-2.5 border rounded-xs shadow-2xs transition-all cursor-grab active:cursor-grabbing flex flex-col justify-between space-y-2 ${colorStyle}`}
                                                        >
                                                            <div className="flex justify-between items-start gap-1">
                                                                <span className="font-mono text-[10px] font-bold px-1 bg-white/20 rounded-xs">
                                                                    #{desk.number}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => triggerPublicUpdate(desk.number, desk.name)}
                                                                    className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 bg-white/20 hover:bg-white hover:text-black rounded-xs transition-colors cursor-pointer"
                                                                >
                                                                    Update ➔
                                                                </button>
                                                            </div>

                                                            <div className="space-y-1">
                                                                <input
                                                                    type="text"
                                                                    value={desk.company || desk.title || ''}
                                                                    onChange={(e) => handleDeskChange(desk.id, desk.company ? 'company' : 'title', e.target.value)}
                                                                    placeholder="Company / Role..."
                                                                    className="w-full text-[10px] font-bold uppercase tracking-wider bg-transparent border-b border-transparent hover:border-white/40 focus:border-white outline-none"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={desk.name}
                                                                    onChange={(e) => handleDeskChange(desk.id, 'name', e.target.value)}
                                                                    placeholder="Occupant Name..."
                                                                    className="w-full text-xs font-extrabold bg-transparent border-b border-transparent hover:border-white/40 focus:border-white outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SIDEBAR: FACILITIES & ACTION LOG */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white p-5 border border-gray-200 rounded-sm shadow-xs space-y-3">
                                    <h4 className="text-xs font-extrabold uppercase text-black border-b border-gray-100 pb-2">Facility & Shared Zones</h4>
                                    <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold">
                                        <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xs">Kitchen</div>
                                        <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xs">Copy Room</div>
                                    </div>
                                    <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xs text-center text-xs font-bold">
                                        Framery Pods (Soundproof Phone Booths)
                                    </div>
                                </div>

                                <div className="bg-white p-6 border border-gray-200 rounded-sm shadow-xs text-center space-y-3">
                                    <span className="text-[10px] font-mono uppercase text-gray-400 block">Central Facility</span>
                                    <div className="p-12 bg-neutral-100 border border-neutral-300 text-neutral-700 font-extrabold text-lg uppercase tracking-wider rounded-xs">
                                        MSE Labs
                                    </div>
                                </div>

                                <div className="bg-white p-5 border border-gray-200 rounded-sm shadow-xs space-y-3">
                                    <h4 className="text-xs font-extrabold uppercase text-black border-b border-gray-100 pb-2">Pending Actions & Relocations</h4>
                                    <ul className="space-y-2 text-xs text-gray-700">
                                        <li className="p-2 bg-neutral-50 border border-gray-200 rounded-xs">
                                            <strong>Gridsight:</strong> David to explore End of Lease Date.
                                        </li>
                                        <li className="p-2 bg-neutral-50 border border-gray-200 rounded-xs">
                                            <strong>Hoogly:</strong> Mohit to move from desk 53 to desk 67. Then Vizia or Zenith to move in.
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: EVENTS REPORTING & ANALYTICS */}
                {activeTab === 'events-analytics' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="bg-white p-6 border border-gray-200 rounded-sm shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h2 className="text-lg font-extrabold uppercase text-black">Reporting Date Range Selector</h2>
                                <p className="text-xs text-gray-500">Filter event bookings, attendance numbers, repeat hirer ratios, and revenue metrics.</p>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-mono font-bold uppercase text-gray-400">From</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="p-2 border border-gray-300 rounded-xs text-xs font-mono bg-neutral-50 focus:border-black outline-none"
                                    />
                                </div>
                                <span className="text-gray-400 font-bold pt-3">-</span>
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-mono font-bold uppercase text-gray-400">To</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="p-2 border border-gray-300 rounded-xs text-xs font-mono bg-neutral-50 focus:border-black outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-6 border border-gray-200 rounded-sm shadow-xs space-y-1">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">1. Booked & Cancelled Events</span>
                                <span className="text-3xl font-black text-black">28 Booked</span>
                                <span className="text-[11px] text-red-500 font-bold block pt-1">3 Cancelled (89% Execution)</span>
                            </div>
                            <div className="bg-white p-6 border border-gray-200 rounded-sm shadow-xs space-y-1">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">2. Expected Attendees</span>
                                <span className="text-3xl font-black text-black">1,840</span>
                                <span className="text-[11px] text-neutral-500 block pt-1">Aggregated from booking forms</span>
                            </div>
                            <div className="bg-white p-6 border border-gray-200 rounded-sm shadow-xs space-y-1">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">4. Repeat Hirer Ratio</span>
                                <span className="text-3xl font-black text-[#EAD64D] bg-black px-2 py-0.5 rounded-xs inline-block">68%</span>
                                <span className="text-[11px] text-emerald-600 font-bold block pt-1">↑ High service quality rating</span>
                            </div>
                            <div className="bg-white p-6 border border-gray-200 rounded-sm shadow-xs space-y-1">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">5. Total Booking Income</span>
                                <span className="text-3xl font-black text-black">$34,850</span>
                                <span className="text-[11px] text-gray-500 block pt-1">Internal venue hire receipts</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-6 bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 border-b border-gray-100 pb-3">
                                    Organizer Roll History Audit
                                </h3>
                                <form onSubmit={handleOrganizerAudit} className="flex gap-2">
                                    <input
                                        type="email"
                                        value={organizerEmail}
                                        onChange={(e) => setOrganizerEmail(e.target.value)}
                                        placeholder="Enter organizer email (e.g. prof.smith@unsw.edu.au)"
                                        className="p-3 border border-gray-300 text-xs font-semibold rounded-xs outline-none focus:border-black text-black w-full bg-neutral-50"
                                    />
                                    <button
                                        type="submit"
                                        className="bg-black text-[#EAD64D] font-extrabold px-4 py-3 text-xs uppercase tracking-wider rounded-xs hover:bg-[#EAD64D] hover:text-black transition-colors shrink-0"
                                    >
                                        Audit Hirer 🔍
                                    </button>
                                </form>

                                {organizerAuditResult ? (
                                    <div className="p-4 bg-neutral-900 text-white rounded-xs space-y-2 text-xs">
                                        <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                                            <span className="font-bold text-[#EAD64D]">{organizerAuditResult.email}</span>
                                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-xs font-mono uppercase font-bold">
                                                {organizerAuditResult.repeatStatus}
                                            </span>
                                        </div>
                                        <p className="text-gray-300">Total Completed Bookings: <strong>{organizerAuditResult.totalBookings} events</strong></p>
                                        <p className="text-gray-300">Avg Feedback Score Given: <strong>{organizerAuditResult.rating}</strong></p>
                                        <p className="text-gray-400 text-[11px] font-mono pt-1">Last Reservation: {organizerAuditResult.lastEvent}</p>
                                    </div>
                                ) : (
                                    <div className="p-6 border border-dashed border-gray-200 bg-neutral-50 text-center rounded-xs text-xs text-gray-500">
                                        Enter a hirer's UNSW email above to inspect booking frequency, historical attendance, and repeat status.
                                    </div>
                                )}
                            </div>

                            <div className="lg:col-span-6 bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 border-b border-gray-100 pb-3">
                                    3. Institutional Performance Shares (Department Breakdown)
                                </h3>
                                <div className="space-y-4">
                                    {departmentBreakdown.map((dept, dIdx) => (
                                        <div key={dIdx} className="space-y-1.5">
                                            <div className="flex justify-between text-xs font-bold uppercase text-black">
                                                <span>{dept.dept}</span>
                                                <span className="font-mono">{dept.share}%</span>
                                            </div>
                                            <div className="w-full bg-neutral-100 h-3 rounded-full overflow-hidden">
                                                <div className={`${dept.color} h-full rounded-full`} style={{ width: `${dept.share}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 1: COMMAND OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="bg-white p-6 border border-gray-200 rounded-sm shadow-xs space-y-4">
                            <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">
                                        Coworking & EIR (Entrepreneurs in Residence) Capacity
                                    </h3>
                                    <p className="text-xs text-gray-500">Active card holders and desk allocations divided by workstation type.</p>
                                </div>
                                <span className="bg-black text-[#EAD64D] text-xs font-black px-3 py-1 rounded-xs uppercase font-mono">
                                    Total EIR Clearance: 42 Active
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 border border-gray-200 bg-neutral-50 rounded-xs space-y-2">
                                    <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">Allocated Desks</span>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-2xl font-black text-black">18 / 20</span>
                                        <span className="text-xs font-bold text-emerald-600">90% Full</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500">Reserved for dedicated 10x Accelerator startups.</p>
                                </div>

                                <div className="p-4 border border-gray-200 bg-neutral-50 rounded-xs space-y-2">
                                    <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">Hot Desks</span>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-2xl font-black text-black">14 / 24</span>
                                        <span className="text-xs font-bold text-neutral-600">58% Occupied</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500">Equipped with external monitors & USB-C hubs.</p>
                                </div>

                                <div className="p-4 border border-gray-200 bg-neutral-50 rounded-xs space-y-2">
                                    <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">Informal Coworking</span>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-2xl font-black text-black">10 / 30</span>
                                        <span className="text-xs font-bold text-emerald-600">33% Occupied</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500">Lounges, high benches, and informal break-out tables.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: HARDWARE & PROTOTYPE LOANS */}
                {activeTab === 'assets' && (
                    <div className="bg-white border border-gray-200 p-6 sm:p-8 rounded-sm shadow-xs space-y-6 animate-in fade-in duration-200">
                        <div className="border-b border-gray-100 pb-4">
                            <h2 className="text-xl font-extrabold uppercase text-black tracking-tight">Hardware & Prototype Loan Registry</h2>
                            <p className="text-xs text-gray-500">Track outbound hardware (tablets, printers, scanners) lent to resident startups for testing and trials.</p>
                        </div>

                        <div className="border border-gray-200 rounded-xs overflow-hidden">
                            <table className="w-full text-left bg-white text-xs">
                                <thead className="bg-neutral-900 text-white font-bold uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="py-3 px-4">Loan ID</th>
                                        <th className="py-3 px-4">Hardware Item</th>
                                        <th className="py-3 px-4">Borrower / Startup</th>
                                        <th className="py-3 px-4">Issued</th>
                                        <th className="py-3 px-4">Due Date</th>
                                        <th className="py-3 px-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-medium">
                                    {activeLoans.map((loan) => (
                                        <tr key={loan.id} className="hover:bg-neutral-50 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold">{loan.id}</td>
                                            <td className="py-3 px-4 font-bold text-black">{loan.item}</td>
                                            <td className="py-3 px-4">{loan.borrower} <span className="text-gray-400 font-mono text-[10px]">({loan.zID})</span></td>
                                            <td className="py-3 px-4 font-mono text-gray-500">{loan.issuedDate}</td>
                                            <td className="py-3 px-4 font-mono text-gray-500">{loan.due}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 text-[10px] font-mono uppercase font-bold rounded-xs ${loan.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                                    {loan.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 4: SUPPLY & MAINTENANCE ALERTS */}
                {activeTab === 'alerts' && (
                    <div className="bg-white border border-gray-200 p-6 sm:p-8 rounded-sm shadow-xs space-y-6 animate-in fade-in duration-200">
                        <div className="border-b border-gray-100 pb-4">
                            <h2 className="text-xl font-extrabold uppercase text-black tracking-tight">Kitchen Supply & Maintenance Tickets</h2>
                            <p className="text-xs text-gray-500">Incoming restock requests and equipment repair tickets logged by residents in the space.</p>
                        </div>

                        <div className="space-y-3">
                            {supplyAlerts.map((alert) => (
                                <div key={alert.id} className="p-4 border border-gray-200 bg-neutral-50/50 rounded-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 text-[9px] font-mono uppercase font-bold rounded-xs ${alert.type === 'Low Stock' ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-900'}`}>
                                                {alert.type}
                                            </span>
                                            <span className="text-xs font-black uppercase text-black">{alert.item}</span>
                                            <span className="text-[11px] text-gray-400 font-mono">({alert.location})</span>
                                        </div>
                                        <p className="text-[11px] text-gray-600">
                                            Reported by <strong>{alert.reporter}</strong> • {alert.time}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded-xs ${alert.status === 'Resolved' ? 'bg-neutral-200 text-neutral-600' : 'bg-black text-[#EAD64D]'}`}>
                                            {alert.status}
                                        </span>
                                        {alert.status !== 'Resolved' && (
                                            <button
                                                onClick={() => handleResolveAlert(alert.id)}
                                                className="bg-emerald-600 text-white font-bold px-3 py-1.5 text-[10px] uppercase tracking-wider rounded-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                                            >
                                                Mark Resolved ✓
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB 5: RESIDENT AUDIT LOOKUP */}
                {activeTab === 'audit' && (
                    <div className="bg-white border border-gray-200 p-6 sm:p-8 rounded-sm shadow-xs space-y-6 animate-in fade-in duration-200">
                        <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div>
                                <h2 className="text-xl font-extrabold uppercase text-black tracking-tight">Resident zID Clearance & Audit Lookup</h2>
                                <p className="text-xs text-gray-500">Look up any founder or startup member by zID, name, or company to verify access clearance and desk assignment.</p>
                            </div>
                            <form onSubmit={handleAdminAuditSearch} className="flex gap-2 w-full sm:w-auto">
                                <input
                                    type="text"
                                    value={auditSearchQuery}
                                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                                    placeholder="Search zID or Name..."
                                    className="p-2.5 border border-gray-300 text-xs font-semibold rounded-xs outline-none focus:border-black text-black w-full sm:w-64 bg-neutral-50"
                                />
                                <button
                                    type="submit"
                                    className="bg-black text-[#EAD64D] font-extrabold px-4 py-2.5 text-xs uppercase tracking-wider rounded-xs hover:bg-[#EAD64D] hover:text-black transition-colors cursor-pointer shrink-0"
                                >
                                    Lookup
                                </button>
                            </form>
                        </div>

                        {hasAudited && (
                            <div className="pt-2">
                                {!auditRecord ? (
                                    <div className="bg-neutral-50 border border-dashed border-gray-300 p-6 text-center rounded-xs">
                                        <span className="text-xs font-bold uppercase text-gray-700 block">No Resident Record Found</span>
                                        <span className="text-[11px] text-gray-500">No active access profile matches "{auditSearchQuery}".</span>
                                    </div>
                                ) : (
                                    <div className="bg-neutral-900 text-white p-6 rounded-xs space-y-4">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-neutral-800 pb-4 gap-2">
                                            <div>
                                                <span className="text-[10px] font-mono text-neutral-400 uppercase">
                                                    {auditRecord.category} • {auditRecord.startup}
                                                </span>
                                                <h3 className="text-lg font-black text-[#EAD64D] uppercase mt-0.5">
                                                    {auditRecord.name} ({auditRecord.zid})
                                                </h3>
                                            </div>
                                            <div className="bg-neutral-800 px-3 py-1.5 rounded-xs border border-neutral-700">
                                                <span className="text-[9px] font-mono text-neutral-400 block uppercase">Assigned Desk</span>
                                                <span className="text-xs font-bold text-white uppercase">{auditRecord.deskAssigned}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </main>
    );
}