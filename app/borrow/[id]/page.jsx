"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { INVENTORY_ITEMS } from '../../data/inventory';

// Master catalog for the reporting combobox
const allSupplyCatalog = [
    { id: '1', label: 'Full Fat Milk', icon: '🥛', category: 'Kitchen', keywords: 'dairy milk full fat white' },
    { id: '2', label: 'Oat Milk', icon: '🌾', category: 'Kitchen', keywords: 'oat milk dairy free plant' },
    { id: '3', label: 'Almond Milk', icon: '🥜', category: 'Kitchen', keywords: 'almond milk nut plant' },
    { id: '4', label: 'Coffee Beans', icon: '☕', category: 'Kitchen', keywords: 'coffee espresso beans roast' },
    { id: '5', label: 'Tea Bags', icon: '🫖', category: 'Kitchen', keywords: 'tea Earl Grey green' },
    { id: '6', label: 'Dishsoap', icon: '🧼', category: 'Kitchen', keywords: 'soap dish detergent cleaning' },
    { id: '7', label: 'Paper Towel', icon: '🧻', category: 'Kitchen', keywords: 'towel paper roll wipe' },
    { id: '8', label: 'Hand Soap', icon: '🧴', category: 'Kitchen', keywords: 'soap wash hands' },
    { id: '9', label: 'Paper (A4)', icon: '📄', category: 'Printing', keywords: 'paper A4 printer copy' },
    { id: '10', label: 'Paper (A3)', icon: '📑', category: 'Printing', keywords: 'paper A3 large print' },
    { id: '11', label: 'Ink / Toner Depleted', icon: '🖨️', category: 'Printing', keywords: 'ink toner cartridge print' },
    { id: '12', label: 'Bandaids', icon: '🩹', category: 'First Aid', keywords: 'bandaid plaster bandage first aid' },
    { id: '13', label: 'Printer Jam / Error', icon: '🖨️', category: 'Maintenance', keywords: 'printer broken jam paper fix' },
    { id: '14', label: 'Coffee Machine Malfunction', icon: '☕', category: 'Maintenance', keywords: 'coffee machine broken water repair' },
    { id: '15', label: 'AV Screen / HDMI Cable Damaged', icon: '🖥️', category: 'Maintenance', keywords: 'tv screen display monitor hdmi cable' },
    { id: '16', label: 'Phone Booth Door / Light Broken', icon: '🚪', category: 'Maintenance', keywords: 'phone booth door light socket power' }
];

export default function BorrowPage({ params }) {
    const router = useRouter();

    // 1. Grab the ID from the URL and find it in our MASTER list
    const itemId = params.id ? params.id.toUpperCase() : "UNKNOWN-ASSET";
    const foundItem = INVENTORY_ITEMS.find(item => item.id === itemId);

    // 2. Set the state dynamically based on the exact item matched
    const [itemDetails, setItemDetails] = useState({
        name: foundItem ? foundItem.name : "Asset Not Found",
        location: foundItem ? foundItem.storageLocation : "Unknown Location",
        status: foundItem ? foundItem.status : "Available",
        user: foundItem ? foundItem.user : "-"
    });

    const [borrowerName, setBorrowerName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [actionSuccess, setActionSuccess] = useState(false);

    // Reporting Low Stock / Maintenance States
    const [supplyAlert, setSupplyAlert] = useState(null);
    const [reportType, setReportType] = useState('stock'); // 'stock' or 'broken'
    const [stockSearchQuery, setStockSearchQuery] = useState('');
    const [dispatchLocation, setDispatchLocation] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [isCustomInput, setIsCustomInput] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const handleCheckoutPipeline = (e) => {
        e.preventDefault();
        setIsProcessing(true);

        setTimeout(() => {
            setIsProcessing(false);
            setActionSuccess(true);
            setItemDetails(prev => ({
                ...prev,
                status: prev.status === 'Available' ? 'Borrowed' : 'Available',
                user: prev.status === 'Available' ? borrowerName : '-'
            }));

            setTimeout(() => {
                setActionSuccess(false);
                setBorrowerName('');
            }, 2500);
        }, 1500);
    };

    const isAvailable = itemDetails.status === 'Available';

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">

            {/* TOP NAVIGATION */}
            <nav className="bg-white text-black py-4 px-8 border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col gap-4 xl:flex-row xl:justify-between xl:items-center">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
                        <span className="bg-black text-white font-black px-2.5 py-1 text-sm tracking-wider font-mono">UNSW</span>
                        <span className="font-bold text-base tracking-tight uppercase text-neutral-800">MCIC Platform</span>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 font-bold text-[11px] tracking-wider uppercase text-gray-400">
                        <a href="/" className="hover:text-black transition-colors">Home Hub</a>
                        <a href="/inventory" className="hover:text-black transition-colors">📦 Inventory</a>
                        <span className="text-black underline decoration-[#EAD64D] decoration-2">📲 QR Scan</span>
                        <a href="/admin" className="text-red-500 hover:text-red-700 transition-colors">🔒 Admin Center</a>
                    </div>
                </div>
            </nav>

            <div className="max-w-xl mx-auto px-6 py-12 space-y-8">

                <header className="space-y-2 text-center">
                </header>

                {/* CHECKOUT / RETURN CARD */}
                <div className="bg-white border border-gray-200 p-6 sm:p-8 rounded-sm shadow-sm space-y-6">
                    <div className="border-b border-gray-100 pb-4 space-y-3">
                        <div>
                            <h2 className="text-2xl font-extrabold tracking-tight text-black">{itemDetails.name}</h2>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                📍 Storage Location: <span className="text-neutral-800 font-bold">{itemDetails.location}</span>
                            </p>
                        </div>

                        <div className="pt-1">
                            {isAvailable ? (
                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-sm border border-emerald-100">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    Available for Checkout
                                </span>
                            ) : (
                                <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-sm border border-amber-100">
                                        Currently Checked Out
                                    </span>
                                    <p className="text-xs text-gray-500 font-medium pt-1">
                                        👤 Borrowed by: <span className="text-amber-700 font-bold">{itemDetails.user}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {actionSuccess ? (
                        <div className={`p-4 font-bold text-xs text-center uppercase tracking-wider rounded-sm animate-pulse ${isAvailable ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#EAD64D] text-black'}`}>
                            {isAvailable ? "✓ Asset Returned to Cabinet Stock" : "🎟️ Asset Checkout Logged Successfully"}
                        </div>
                    ) : (
                        <form onSubmit={handleCheckoutPipeline} className="space-y-4">
                            {isAvailable && (
                                <div className="space-y-1.5 animate-in fade-in duration-200">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                        Borrower Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Jane Doe"
                                        value={borrowerName}
                                        onChange={(e) => setBorrowerName(e.target.value)}
                                        className="w-full p-3 border border-gray-200 bg-white text-sm font-medium rounded-sm outline-none focus:border-neutral-400 text-black placeholder-gray-400"
                                    />
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={isProcessing}
                                className={`w-full py-3.5 text-center font-bold text-xs uppercase tracking-wider rounded-sm transition-all text-white bg-black ${isProcessing ? 'opacity-50 cursor-wait' : 'hover:bg-[#EAD64D] hover:text-black'}`}
                            >
                                {isProcessing
                                    ? "Processing Transmission Log..."
                                    : (isAvailable ? "Checkout Asset ↗" : "Return Item ↩")
                                }
                            </button>
                        </form>
                    )}
                </div>

                {/* REPORT LOW STOCK OR MAINTENANCE SECTION */}
                <div className="bg-white border border-gray-200 p-6 sm:p-8 rounded-sm shadow-sm space-y-6">
                    <div className="border-b border-gray-100 pb-4 space-y-1">
                        <h2 className="text-xl font-extrabold uppercase text-black tracking-tight">
                            Report Low Stock or Maintenance
                        </h2>
                        <p className="text-xs text-gray-500 font-normal">
                            Noticed a depleted consumable or broken equipment while here? Submit a ticket directly to operations.
                        </p>
                    </div>

                    {/* ALERT CONFIRMATION NOTIFICATION */}
                    {supplyAlert && (
                        <div className="p-4 bg-[#EAD64D] text-black font-bold text-xs rounded-xs flex justify-between items-center shadow-xs border border-black animate-in fade-in duration-150">
                            <div className="flex items-center gap-2.5">
                                <span className="text-base">✓</span>
                                <span>
                                    Logged: Request for <strong>{supplyAlert}</strong> sent to MCIC Ops!
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSupplyAlert(null)}
                                className="text-black font-extrabold px-2 py-0.5 hover:bg-black hover:text-white rounded-xs transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* UNIFIED SEARCHABLE DISPATCH FORM */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const itemText = isCustomInput ? stockSearchQuery : (selectedItem?.label || stockSearchQuery);
                            if (!itemText.trim() || !dispatchLocation.trim()) return;

                            const actionTag = reportType === 'broken' ? '[Maintenance]' : '[Stock]';
                            setSupplyAlert(`${actionTag} ${itemText} at ${dispatchLocation}`);

                            // Reset Form
                            setStockSearchQuery('');
                            setSelectedItem(null);
                            setDispatchLocation('');
                            setIsCustomInput(false);
                            setDropdownOpen(false);
                        }}
                        className="space-y-6"
                    >
                        {/* STEP 1: REPORT TYPE QUESTION */}
                        <div className="space-y-2">
                            <label className="font-extrabold text-black uppercase text-xs tracking-wide block">
                                1. Is this about Low Stock or Maintenance?
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setReportType('stock')}
                                    className={`p-3.5 border text-left font-bold text-xs rounded-xs transition-all cursor-pointer flex items-center justify-between ${reportType === 'stock'
                                        ? 'bg-black text-[#EAD64D] border-black shadow-xs'
                                        : 'bg-neutral-50 text-neutral-800 border-neutral-200 hover:border-black'
                                        }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span>⚠️</span> Low Stock
                                    </span>
                                    {reportType === 'stock' && <span className="text-xs">✓</span>}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setReportType('broken')}
                                    className={`p-3.5 border text-left font-bold text-xs rounded-xs transition-all cursor-pointer flex items-center justify-between ${reportType === 'broken'
                                        ? 'bg-black text-[#EAD64D] border-black shadow-xs'
                                        : 'bg-neutral-50 text-neutral-800 border-neutral-200 hover:border-black'
                                        }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span>🔧</span> Broken
                                    </span>
                                    {reportType === 'broken' && <span className="text-xs">✓</span>}
                                </button>
                            </div>
                        </div>

                        {/* STEP 2: ITEM SEARCH / SELECT COMBOBOX */}
                        <div className="space-y-2 relative">
                            <label className="font-extrabold text-black uppercase text-xs tracking-wide block">
                                2. {reportType === 'broken' ? 'WHAT IS BROKEN OR MALFUNCTIONING?' : 'WHAT IS RUNNING LOW OR EMPTY?'}
                            </label>

                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={
                                        reportType === 'broken'
                                            ? "What's Broken?"
                                            : "What needs restocking?"
                                    }
                                    value={stockSearchQuery}
                                    onChange={(e) => {
                                        setStockSearchQuery(e.target.value);
                                        setDropdownOpen(true);
                                        setSelectedItem(null);
                                        setIsCustomInput(true);
                                    }}
                                    onFocus={() => setDropdownOpen(true)}
                                    className="w-full p-3.5 border border-neutral-300 bg-white text-xs font-medium rounded-xs outline-none focus:border-black text-black pr-10"
                                    required
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                                    🔍
                                </span>
                            </div>

                            {/* SEARCH DROPDOWN MENU */}
                            {dropdownOpen && stockSearchQuery.trim().length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-black rounded-xs shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-neutral-100">

                                    {/* PRE-DEFINED MATCHES FILTERED BY REPORT TYPE */}
                                    {allSupplyCatalog
                                        .filter(item => {
                                            const matchesCategory = reportType === 'broken'
                                                ? item.category === 'Maintenance'
                                                : item.category !== 'Maintenance';
                                            const matchesQuery = item.label.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
                                                item.keywords.toLowerCase().includes(stockSearchQuery.toLowerCase());
                                            return matchesCategory && matchesQuery;
                                        })
                                        .map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                    setStockSearchQuery(item.label);
                                                    setSelectedItem(item);
                                                    setIsCustomInput(false);
                                                    setDropdownOpen(false);
                                                }}
                                                className="w-full p-3 text-left hover:bg-neutral-50 flex items-center justify-between cursor-pointer transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-base">{item.icon}</span>
                                                    <span className="font-bold text-xs text-neutral-900">{item.label}</span>
                                                </div>
                                                <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-xs font-bold">
                                                    {item.category}
                                                </span>
                                            </button>
                                        ))
                                    }

                                    {/* FREETEXT FALLBACK OPTION */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCustomInput(true);
                                            setSelectedItem(null);
                                            setDropdownOpen(false);
                                        }}
                                        className="w-full p-3 text-left bg-neutral-50 hover:bg-black hover:text-[#EAD64D] flex items-center justify-between cursor-pointer transition-colors group"
                                    >
                                        <span className="font-bold text-xs text-neutral-800 group-hover:text-white">
                                            ✍️ Use custom request: "{stockSearchQuery}"
                                        </span>
                                        <span className="text-[9px] font-mono uppercase text-neutral-400 group-hover:text-[#EAD64D]">
                                            Custom Input
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* STEP 3: LOCATION SELECTOR */}
                        <div className="space-y-2">
                            <label className="font-extrabold text-black uppercase text-xs tracking-wide block">
                                3. WHERE IS IT LOCATED IN MCIC?
                            </label>
                            <div className="flex flex-col gap-2">
                                <select
                                    value={dispatchLocation}
                                    onChange={(e) => setDispatchLocation(e.target.value)}
                                    className="w-full p-3.5 border border-neutral-300 bg-white text-xs font-bold rounded-xs outline-none focus:border-black text-black cursor-pointer"
                                    required
                                >
                                    <option value="" disabled>Select Location...</option>
                                    <option value="Main Kitchen (Level 1)">Kitchen (Level 1 Formal Coworking Space)</option>
                                    <option value="Founders Place Kitchenette">Kitchen (Level 1 Founders Place Informal Coworking Space)</option>
                                    <option value="Copy Room & Print Hub">Copy Room</option>
                                    <option value="Founders Place">Founders Place</option>
                                    <option value="MCIC Event Space (Ground)">MCIC Event Space (Ground)</option>
                                </select>

                                <button
                                    type="submit"
                                    className="w-full bg-black text-[#EAD64D] font-extrabold py-3.5 text-xs uppercase tracking-wider rounded-xs hover:bg-[#EAD64D] hover:text-black transition-colors cursor-pointer"
                                >
                                    Send Report
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="text-center">
                    <a href="/inventory" className="text-xs text-gray-400 hover:text-black font-bold tracking-wider uppercase transition-colors">
                        ← Cancel & Return to Inventory Catalog
                    </a>
                </div>

            </div>
        </main>
    );
}