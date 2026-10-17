"use client";

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';

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
    const itemId = params.id ? params.id.toUpperCase() : "UNKNOWN-ASSET";

    const [itemDetails, setItemDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [borrowerName, setBorrowerName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [actionSuccess, setActionSuccess] = useState(false);

    // Future Reservation Date States
    const [checkoutIntent, setCheckoutIntent] = useState('now'); // 'now' | 'future'
    const [dateSelectionType, setDateSelectionType] = useState('single'); // 'single' | 'range'
    const [bookingDate, setBookingDate] = useState('');
    const [bookingStartDate, setBookingStartDate] = useState('');
    const [bookingEndDate, setBookingEndDate] = useState('');
    const [bookingStartTime, setBookingStartTime] = useState('');
    const [bookingEndTime, setBookingEndTime] = useState('');

    // Reporting Low Stock / Maintenance States
    const [supplyAlert, setSupplyAlert] = useState(null);
    const [reportType, setReportType] = useState('stock'); // 'stock' | 'broken'
    const [stockSearchQuery, setStockSearchQuery] = useState('');
    const [dispatchLocation, setDispatchLocation] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [isCustomInput, setIsCustomInput] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Fetch item document from Firebase Firestore
    useEffect(() => {
        async function fetchItem() {
            setLoading(true);
            try {
                const docRef = doc(db, "items", itemId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setItemDetails({ id: docSnap.id, ...docSnap.data() });
                } else {
                    console.error("No matching document in Firebase!");
                }
            } catch (err) {
                console.error("Firebase error fetching item:", err);
            }
            setLoading(false);
        }

        if (itemId !== "UNKNOWN-ASSET") {
            fetchItem();
        }
    }, [itemId]);

    const handleCheckoutPipeline = async (e) => {
        e.preventDefault();
        if (!itemDetails) return;

        setIsProcessing(true);

        try {
            if (checkoutIntent === 'future') {
                // Log future reservation directly into Firestore
                await addDoc(collection(db, "asset_reservations"), {
                    itemId: itemId,
                    itemName: itemDetails.name,
                    borrowerName: borrowerName.trim(),
                    dateSelectionType: dateSelectionType,
                    bookingDate: dateSelectionType === 'single' ? bookingDate : null,
                    bookingStartDate: dateSelectionType === 'range' ? bookingStartDate : null,
                    bookingEndDate: dateSelectionType === 'range' ? bookingEndDate : null,
                    bookingStartTime: bookingStartTime,
                    bookingEndTime: bookingEndTime,
                    status: 'Scheduled',
                    createdAt: new Date().toISOString()
                });

                setActionSuccess('reservation');
            } else {
                const isCurrentlyAvailable = itemDetails.status === 'Available';
                const newStatus = isCurrentlyAvailable ? 'Borrowed' : 'Available';
                const newBorrower = isCurrentlyAvailable ? borrowerName : '-';

                const docRef = doc(db, "items", itemId);
                await updateDoc(docRef, {
                    status: newStatus,
                    user: newBorrower
                });

                setItemDetails(prev => ({
                    ...prev,
                    status: newStatus,
                    user: newBorrower
                }));

                setActionSuccess(isCurrentlyAvailable ? 'borrow' : 'return');
            }

            setTimeout(() => {
                setActionSuccess(false);
                setBorrowerName('');
                setBookingDate('');
                setBookingStartDate('');
                setBookingEndDate('');
                setBookingStartTime('');
                setBookingEndTime('');
                setCheckoutIntent('now');
            }, 2500);
        } catch (error) {
            console.error("Error updating document in Firebase:", error);
            alert("Database update failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Low Stock / Broken Equipment Alert Handler
    const handleReportSubmit = async (e) => {
        e.preventDefault();
        const itemText = isCustomInput ? stockSearchQuery : (selectedItem?.label || stockSearchQuery);
        if (!itemText.trim() || !dispatchLocation.trim()) return;

        const actionTag = reportType === 'broken' ? 'Maintenance' : 'Low Stock';

        try {
            await addDoc(collection(db, "alerts"), {
                type: actionTag,
                item: itemText.trim(),
                location: dispatchLocation,
                status: 'Pending',
                createdAt: new Date().toISOString()
            });

            setSupplyAlert(`${actionTag} ${itemText} at ${dispatchLocation}`);

            setStockSearchQuery('');
            setSelectedItem(null);
            setDispatchLocation('');
            setIsCustomInput(false);
            setDropdownOpen(false);
        } catch (err) {
            console.error("Error logging alert to Firebase:", err);
            alert("Failed to submit alert.");
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-[#F9F9F9] flex items-center justify-center p-6 text-xs font-bold uppercase tracking-wider text-gray-400">
                Loading item...
            </main>
        );
    }

    if (!itemDetails) {
        return (
            <main className="min-h-screen bg-[#F9F9F9] flex flex-col items-center justify-center p-6 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-red-500">Asset Record ({itemId}) Not Found</p>
                <a href="/inventory" className="text-xs font-bold uppercase tracking-wider text-black underline">Return to Inventory</a>
            </main>
        );
    }

    const isAvailable = itemDetails.status === 'Available';

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">
            <div className="max-w-md mx-auto px-6 py-16 space-y-8">

                <div className="bg-white border border-gray-200 p-6 rounded-sm shadow-sm space-y-6">
                    <div className="border-b border-gray-100 pb-4 space-y-3">

                        <div className="flex items-center gap-4 pt-2">
                            <div className="w-16 h-16 bg-neutral-100 border border-gray-200 rounded-sm shrink-0 overflow-hidden flex items-center justify-center">
                                {itemDetails.image ? (
                                    <img src={itemDetails.image} alt={itemDetails.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xl">📦</span>
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-extrabold tracking-tight text-black">{itemDetails.name}</h2>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">
                                    📍 Storage Location: <span className="text-neutral-800 font-bold">{itemDetails.storageLocation}</span>
                                </p>
                            </div>
                        </div>

                        <div className="pt-2">
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
                                        👤 Holder: <span className="text-amber-700 font-bold">{itemDetails.user || '-'}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {actionSuccess ? (
                        <div className={`p-4 font-bold text-xs text-center uppercase tracking-wider rounded-sm animate-pulse ${actionSuccess === 'reservation' ? 'bg-black text-[#EAD64D]' :
                                actionSuccess === 'borrow' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#EAD64D] text-black'
                            }`}>
                            {actionSuccess === 'reservation' && "📅 Future Asset Reservation Logged"}
                            {actionSuccess === 'borrow' && "✓ Asset Returned to Stock"}
                            {actionSuccess === 'return' && "🎟️ Asset Checkout Logged"}
                        </div>
                    ) : (
                        <form onSubmit={handleCheckoutPipeline} className="space-y-4">

                            {/* TOGGLE: CHECKOUT NOW VS BOOK FUTURE DATE */}
                            {isAvailable && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                        Checkout Intention
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCheckoutIntent('now')}
                                            className={`p-2.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${checkoutIntent === 'now'
                                                    ? 'bg-black text-[#EAD64D] border-black'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-neutral-50'
                                                }`}
                                        >
                                            Checkout Now
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCheckoutIntent('future')}
                                            className={`p-2.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${checkoutIntent === 'future'
                                                    ? 'bg-black text-[#EAD64D] border-black'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-neutral-50'
                                                }`}
                                        >
                                            Book Future Date 📅
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* FUTURE BOOKING CONFIGURATION (SINGLE VS RANGE) */}
                            {isAvailable && checkoutIntent === 'future' && (
                                <div className="p-4 bg-neutral-50 border border-gray-200 rounded-sm space-y-4 animate-in fade-in duration-200">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                            Date Option Type
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setDateSelectionType('single')}
                                                className={`p-2 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${dateSelectionType === 'single'
                                                        ? 'bg-neutral-800 text-white border-neutral-800'
                                                        : 'bg-white text-gray-600 border-gray-200'
                                                    }`}
                                            >
                                                Individual Date
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDateSelectionType('range')}
                                                className={`p-2 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${dateSelectionType === 'range'
                                                        ? 'bg-neutral-800 text-white border-neutral-800'
                                                        : 'bg-white text-gray-600 border-gray-200'
                                                    }`}
                                            >
                                                Date Range
                                            </button>
                                        </div>
                                    </div>

                                    {dateSelectionType === 'single' ? (
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                Select Date *
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={bookingDate}
                                                onChange={(e) => setBookingDate(e.target.value)}
                                                className="w-full p-2.5 border border-gray-200 bg-white text-xs font-semibold rounded-sm outline-none focus:border-black text-black"
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                    Start Date *
                                                </label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={bookingStartDate}
                                                    onChange={(e) => setBookingStartDate(e.target.value)}
                                                    className="w-full p-2.5 border border-gray-200 bg-white text-xs font-semibold rounded-sm outline-none focus:border-black text-black"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                    End Date *
                                                </label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={bookingEndDate}
                                                    onChange={(e) => setBookingEndDate(e.target.value)}
                                                    className="w-full p-2.5 border border-gray-200 bg-white text-xs font-semibold rounded-sm outline-none focus:border-black text-black"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                Start Time *
                                            </label>
                                            <input
                                                type="time"
                                                required
                                                value={bookingStartTime}
                                                onChange={(e) => setBookingStartTime(e.target.value)}
                                                className="w-full p-2.5 border border-gray-200 bg-white text-xs font-semibold rounded-sm outline-none focus:border-black text-black"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                End Time *
                                            </label>
                                            <input
                                                type="time"
                                                required
                                                value={bookingEndTime}
                                                onChange={(e) => setBookingEndTime(e.target.value)}
                                                className="w-full p-2.5 border border-gray-200 bg-white text-xs font-semibold rounded-sm outline-none focus:border-black text-black"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(isAvailable || checkoutIntent === 'future') && (
                                <div className="space-y-1.5 animate-in fade-in duration-200">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                        Your Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Sarah Jenkins (EcoVibe Tech)"
                                        value={borrowerName}
                                        onChange={(e) => setBorrowerName(e.target.value)}
                                        className="w-full p-3 border border-gray-200 bg-white text-sm font-medium rounded-sm outline-none focus:border-neutral-400 text-black placeholder-gray-400"
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isProcessing}
                                className={`w-full py-3.5 text-center font-bold text-xs uppercase tracking-wider rounded-sm transition-all text-white bg-black ${isProcessing ? 'opacity-50 cursor-wait' : 'hover:bg-[#EAD64D] hover:text-black cursor-pointer'}`}
                            >
                                {isProcessing
                                    ? "Processing..."
                                    : (checkoutIntent === 'future' ? "Confirm Future Reservation 📅" : (isAvailable ? "Confirm Asset Checkout ↗" : "Process Return Check-In ↩"))
                                }
                            </button>

                            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <span>Asset ID</span>
                                <span className="font-mono bg-neutral-50 border px-2 py-0.5 rounded-sm text-neutral-800">{itemDetails.id}</span>
                            </div>

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

                    {supplyAlert && (
                        <div className="p-4 bg-[#EAD64D] text-black font-bold text-xs rounded-xs flex justify-between items-center shadow-xs border border-black animate-in fade-in duration-150">
                            <div className="flex items-center gap-2.5">
                                <span className="text-base">✓</span>
                                <span>Logged: Request for <strong>{supplyAlert}</strong> sent to MCIC Ops!</span>
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

                    <form onSubmit={handleReportSubmit} className="space-y-6">
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
                                    <span className="flex items-center gap-2">⚠️ Low Stock</span>
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
                                    <span className="flex items-center gap-2">🔧 Broken / Damaged</span>
                                    {reportType === 'broken' && <span className="text-xs">✓</span>}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 relative">
                            <label className="font-extrabold text-black uppercase text-xs tracking-wide block">
                                2. {reportType === 'broken' ? 'WHAT IS BROKEN, DAMAGED OR MALFUNCTIONING?' : 'WHAT IS RUNNING LOW OR EMPTY?'}
                            </label>

                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={reportType === 'broken' ? "What's broken or damaged?" : "What needs restocking?"}
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
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">🔍</span>
                            </div>

                            {dropdownOpen && stockSearchQuery.trim().length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-black rounded-xs shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-neutral-100">
                                    {allSupplyCatalog
                                        .filter(item => {
                                            const matchesCategory = reportType === 'broken' ? item.category === 'Maintenance' : item.category !== 'Maintenance';
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
                                        <span className="text-[9px] font-mono uppercase text-neutral-400 group-hover:text-[#EAD64D]">Custom Input</span>
                                    </button>
                                </div>
                            )}
                        </div>

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
                        ← Return to Inventory Catalog
                    </a>
                </div>

            </div>
        </main>
    );
}