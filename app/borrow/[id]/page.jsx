"use client";

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';

export default function BorrowPage({ params }) {
    const itemId = params.id ? params.id.toUpperCase() : "UNKNOWN-ASSET";

    const [itemDetails, setItemDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [borrowerName, setBorrowerName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [actionSuccess, setActionSuccess] = useState(false);

    // UNSW Team & Email Verification States
    const [isUnswFoundersTeam, setIsUnswFoundersTeam] = useState('yes'); // 'yes' | 'no'
    const [borrowerEmail, setBorrowerEmail] = useState('');

    // Future Reservation Date States
    const [checkoutIntent, setCheckoutIntent] = useState('now'); // 'now' | 'future'
    const [dateSelectionType, setDateSelectionType] = useState('single'); // 'single' | 'range'
    const [bookingDate, setBookingDate] = useState('');
    const [bookingStartDate, setBookingStartDate] = useState('');
    const [bookingEndDate, setBookingEndDate] = useState('');
    const [bookingStartTime, setBookingStartTime] = useState('');
    const [bookingEndTime, setBookingEndTime] = useState('');

    // Reporting States & Visibility Toggle
    const [showReportSection, setShowReportSection] = useState(false);
    const [reportType, setReportType] = useState('broken'); // 'broken' | 'stock'
    const [reportDescription, setReportDescription] = useState('');
    const [supplyAlert, setSupplyAlert] = useState(null);

    // Edit Item Details Modal / Form States
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editDimensions, setEditDimensions] = useState('');
    const [editIncludedItems, setEditIncludedItems] = useState('');
    const [editQuantity, setEditQuantity] = useState('1');
    const [editItemType, setEditItemType] = useState('reusable');
    const [editImageUrl, setEditImageUrl] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Fetch item document from Firebase Firestore
    useEffect(() => {
        async function fetchItem() {
            setLoading(true);
            try {
                const docRef = doc(db, "items", itemId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setItemDetails({ id: docSnap.id, ...data });

                    // Populate edit form states
                    setEditName(data.name || '');
                    setEditLocation(data.storageLocation || '');
                    setEditDimensions(data.dimensions || '');
                    setEditIncludedItems(data.includedItems || '');
                    setEditQuantity(data.quantity ? String(data.quantity) : '1');
                    setEditItemType(data.itemType || 'reusable');
                    setEditImageUrl(data.image || '');
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
                await addDoc(collection(db, "asset_reservations"), {
                    itemId: itemId,
                    itemName: itemDetails.name,
                    borrowerName: borrowerName.trim(),
                    isUnswFoundersTeam: isUnswFoundersTeam,
                    borrowerEmail: isUnswFoundersTeam === 'no' ? borrowerEmail.trim() : '-',
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
                setBorrowerEmail('');
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

    const handleReportSubmit = async (e) => {
        e.preventDefault();
        if (!itemDetails || !reportDescription.trim()) return;

        const actionTag = reportType === 'broken' ? 'Maintenance / Damaged Asset' : 'Low Stock Alert';

        try {
            await addDoc(collection(db, "alerts"), {
                type: actionTag,
                itemId: itemDetails.id,
                item: itemDetails.name,
                location: itemDetails.storageLocation || 'Unknown Location',
                description: reportDescription.trim(),
                status: 'Pending',
                createdAt: new Date().toISOString()
            });

            setSupplyAlert(`${actionTag} for ${itemDetails.name}`);
            setReportDescription('');
        } catch (err) {
            console.error("Error logging report to Firebase:", err);
            alert("Failed to submit report.");
        }
    };

    const handleSaveItemEdit = async (e) => {
        e.preventDefault();
        setIsSavingEdit(true);

        try {
            const docRef = doc(db, "items", itemId);
            const updatedData = {
                name: editName.trim(),
                storageLocation: editLocation.trim(),
                dimensions: editDimensions.trim(),
                includedItems: editIncludedItems.trim(),
                quantity: parseInt(editQuantity, 10) || 1,
                itemType: editItemType,
                image: editImageUrl.trim()
            };

            await updateDoc(docRef, updatedData);

            setItemDetails(prev => ({
                ...prev,
                ...updatedData
            }));

            setIsEditing(false);
        } catch (err) {
            console.error("Error updating item specs in Firestore:", err);
            alert("Failed to update item details. Please try again.");
        } finally {
            setIsSavingEdit(false);
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
            <div className="max-w-md mx-auto px-6 py-16">

                {/* SINGLE MAIN CONTAINER BOX */}
                <div className="bg-white border border-gray-200 p-6 sm:p-8 rounded-sm shadow-sm space-y-6">

                    {/* ITEM HEADER & SPECIFICATIONS */}
                    <div className="border-b border-gray-100 pb-4 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <span>Asset Record</span>
                            <button
                                type="button"
                                onClick={() => setIsEditing(!isEditing)}
                                className="text-neutral-700 hover:text-black font-extrabold flex items-center gap-1 cursor-pointer bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-xs transition-colors"
                            >
                                <span>{isEditing ? '✕ Cancel Edit' : '✏️ Edit Spec'}</span>
                            </button>
                        </div>

                        {/* EDIT SPECIFICATIONS FORM */}
                        {isEditing ? (
                            <form onSubmit={handleSaveItemEdit} className="p-4 sm:p-6 bg-[#F9F9F9] border border-gray-200 rounded-sm space-y-5 animate-in fade-in duration-200">
                                <div className="border-b border-gray-200 pb-2">
                                    <h3 className="font-extrabold text-xs tracking-wider uppercase text-black">
                                        UPDATE ASSET DETAILS
                                    </h3>
                                </div>

                                {/* ITEM NAME */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                        ITEM NAME
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full p-3 border border-gray-200 bg-white text-xs font-semibold rounded-sm outline-none focus:border-black text-black"
                                    />
                                </div>

                                {/* STORAGE LOCATION */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                        STORAGE LOCATION
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editLocation}
                                        onChange={(e) => setEditLocation(e.target.value)}
                                        className="w-full p-3 border border-gray-200 bg-white text-xs font-semibold rounded-sm outline-none focus:border-black text-black"
                                    />
                                </div>

                                {/* DIMENSIONS & QUANTITY */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                            DIMENSIONS
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 50cm x 30cm"
                                            value={editDimensions}
                                            onChange={(e) => setEditDimensions(e.target.value)}
                                            className="w-full p-3 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none focus:border-black text-black placeholder-gray-400"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                            QUANTITY
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={editQuantity}
                                            onChange={(e) => setEditQuantity(e.target.value)}
                                            className="w-full p-3 border border-gray-200 bg-white text-xs font-semibold rounded-sm outline-none focus:border-black text-black"
                                        />
                                    </div>
                                </div>

                                {/* WHAT'S INCLUDED */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                        WHAT'S INCLUDED
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Power Cable, Case..."
                                        value={editIncludedItems}
                                        onChange={(e) => setEditIncludedItems(e.target.value)}
                                        className="w-full p-3 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none focus:border-black text-black placeholder-gray-400"
                                    />
                                </div>

                                {/* ASSET TYPE TOGGLE */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                        ASSET TYPE
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setEditItemType('reusable')}
                                            className={`p-2.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${editItemType === 'reusable'
                                                    ? 'bg-black text-[#EAD64D] border-black'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-neutral-50'
                                                }`}
                                        >
                                            <span>🔄</span> RE-USABLE
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditItemType('single-use')}
                                            className={`p-2.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${editItemType === 'single-use'
                                                    ? 'bg-black text-[#EAD64D] border-black'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-neutral-50'
                                                }`}
                                        >
                                            <span>📦</span> SINGLE-USE
                                        </button>
                                    </div>
                                </div>

                                {/* IMAGE URL */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                        IMAGE URL
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="https://..."
                                        value={editImageUrl}
                                        onChange={(e) => setEditImageUrl(e.target.value)}
                                        className="w-full p-3 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none focus:border-black text-black placeholder-gray-400"
                                    />
                                </div>

                                {/* SAVE BUTTON */}
                                <button
                                    type="submit"
                                    disabled={isSavingEdit}
                                    className="w-full py-3 bg-black text-[#EAD64D] font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-[#EAD64D] hover:text-black transition-colors cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <span>💾</span> {isSavingEdit ? 'SAVING CHANGES...' : 'SAVE CHANGES'}
                                </button>
                            </form>
                        ) : (
                            <>
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

                                {(itemDetails.dimensions || itemDetails.includedItems || itemDetails.itemType) && (
                                    <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-sm text-xs space-y-1 font-medium text-neutral-700">
                                        {itemDetails.dimensions && (
                                            <div>📐 <strong>Dimensions:</strong> {itemDetails.dimensions}</div>
                                        )}
                                        {itemDetails.includedItems && (
                                            <div>🔌 <strong>Included:</strong> {itemDetails.includedItems}</div>
                                        )}
                                        {itemDetails.itemType && (
                                            <div>🏷️ <strong>Type:</strong> {itemDetails.itemType === 'single-use' ? 'Single-Use Consumable' : 'Re-usable Asset'}</div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

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

                    {/* SECTION 1: CHECKOUT / RESERVATION SECTION */}
                    <div className="p-4 sm:p-5 bg-neutral-50/60 border border-neutral-200/80 rounded-sm space-y-4">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-black block border-b border-neutral-200 pb-2">
                            🎟️ Checkout or Reserve Item
                        </span>

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

                                {isAvailable && checkoutIntent === 'future' && (
                                    <div className="p-4 bg-white border border-gray-200 rounded-sm space-y-4 animate-in fade-in duration-200">
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
                                    <>
                                        <div className="space-y-1.5 animate-in fade-in duration-200">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                Your Name
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. John Smith"
                                                value={borrowerName}
                                                onChange={(e) => setBorrowerName(e.target.value)}
                                                className="w-full p-3 border border-gray-200 bg-white text-sm font-medium rounded-sm outline-none focus:border-neutral-400 text-black placeholder-gray-400"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                Are you part of the UNSW Founders Team?
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsUnswFoundersTeam('yes')}
                                                    className={`p-2.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${isUnswFoundersTeam === 'yes'
                                                        ? 'bg-black text-[#EAD64D] border-black'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-neutral-50'
                                                        }`}
                                                >
                                                    Yes
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsUnswFoundersTeam('no')}
                                                    className={`p-2.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${isUnswFoundersTeam === 'no'
                                                        ? 'bg-black text-[#EAD64D] border-black'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-neutral-50'
                                                        }`}
                                                >
                                                    No
                                                </button>
                                            </div>
                                        </div>

                                        {isUnswFoundersTeam === 'no' && (
                                            <div className="space-y-1.5 animate-in fade-in duration-200">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                    Email Address *
                                                </label>
                                                <input
                                                    type="email"
                                                    required
                                                    placeholder="e.g. john.smith@example.com"
                                                    value={borrowerEmail}
                                                    onChange={(e) => setBorrowerEmail(e.target.value)}
                                                    className="w-full p-3 border border-gray-200 bg-white text-sm font-medium rounded-sm outline-none focus:border-neutral-400 text-black placeholder-gray-400"
                                                />
                                            </div>
                                        )}
                                    </>
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

                                <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-1">
                                    <span>Asset ID</span>
                                    <span className="font-mono bg-white border px-2 py-0.5 rounded-sm text-neutral-800">{itemDetails.id}</span>
                                </div>

                            </form>
                        )}
                    </div>

                    {/* SECTION 2: REPORT LOW STOCK / DAMAGE BUTTONS */}
                    <div className="pt-2 border-t border-gray-100 space-y-4">
                        <button
                            type="button"
                            onClick={() => setShowReportSection(!showReportSection)}
                            className="w-full p-3.5 bg-neutral-50 hover:bg-black hover:text-[#EAD64D] border border-neutral-200 rounded-sm text-center font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-between group"
                        >
                            <span className="flex items-center gap-2">
                                <span>⚠️</span>
                                <span>Report Issue or Low Stock</span>
                            </span>
                            <span className="text-sm font-mono">{showReportSection ? '−' : '+'}</span>
                        </button>

                        {/* REPORT FORM (VISIBLE ONLY WHEN BUTTON IS CLICKED) */}
                        {showReportSection && (
                            <div className="p-4 sm:p-5 bg-neutral-50/60 border border-neutral-200/80 rounded-sm space-y-4 animate-in fade-in duration-200">

                                {supplyAlert && (
                                    <div className="p-3 bg-[#EAD64D] text-black font-bold text-xs rounded-xs flex justify-between items-center border border-black animate-in fade-in duration-150">
                                        <div className="flex items-center gap-2">
                                            <span>✓</span>
                                            <span>Report sent to MCIC Ops!</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSupplyAlert(null)}
                                            className="text-black font-extrabold px-1.5 py-0.5 hover:bg-black hover:text-white rounded-xs transition-colors cursor-pointer"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}

                                <form onSubmit={handleReportSubmit} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                            Issue Type
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setReportType('broken')}
                                                className={`p-2.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${reportType === 'broken'
                                                    ? 'bg-black text-[#EAD64D] border-black'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-neutral-50'
                                                    }`}
                                            >
                                                🔧 Broken / Damaged
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setReportType('stock')}
                                                className={`p-2.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${reportType === 'stock'
                                                    ? 'bg-black text-[#EAD64D] border-black'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-neutral-50'
                                                    }`}
                                            >
                                                ⚠️ Low Stock / Empty
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="font-extrabold text-black uppercase text-xs tracking-wide block">
                                            {reportType === 'broken' ? 'Describe the issue or damage *' : 'Describe the stock status *'}
                                        </label>
                                        <textarea
                                            required
                                            rows="3"
                                            placeholder={reportType === 'broken' ? "e.g. Screen flickering, cable frayed, missing part..." : "e.g. Only 1 left in box, completely empty..."}
                                            value={reportDescription}
                                            onChange={(e) => setReportDescription(e.target.value)}
                                            className="w-full p-3 border border-neutral-300 bg-white text-xs font-medium rounded-xs outline-none focus:border-black text-black placeholder-gray-400"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-black text-[#EAD64D] font-extrabold py-3 text-xs uppercase tracking-wider rounded-xs hover:bg-[#EAD64D] hover:text-black transition-colors cursor-pointer"
                                    >
                                        {reportType === 'broken' ? 'Submit Damage Report 🔧' : 'Report Low Stock ⚠️'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                </div>

                <div className="text-center pt-4">
                    <a href="/inventory" className="text-xs text-gray-400 hover:text-black font-bold tracking-wider uppercase transition-colors">
                        ← Return to Inventory Catalog
                    </a>
                </div>

            </div>
        </main>
    );
}