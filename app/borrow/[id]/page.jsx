"use client";

import { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function BorrowPage({ params }) {
    const itemId = params?.id ? params.id.toUpperCase() : "UNKNOWN-ASSET";

    const [itemDetails, setItemDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [borrowerName, setBorrowerName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [actionSuccess, setActionSuccess] = useState(false);

    // Fullscreen Image Lightbox Modal State
    const [activeLightboxImg, setActiveLightboxImg] = useState(null);

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
    const [editAssetId, setEditAssetId] = useState('');
    const [editName, setEditName] = useState('');
    const [selectedRoom, setSelectedRoom] = useState('MCIC Event Space');
    const [specificLocation, setSpecificLocation] = useState('');
    const [editDimensions, setEditDimensions] = useState('');
    const [editIncludedItems, setEditIncludedItems] = useState('');
    const [editQuantity, setEditQuantity] = useState('1');
    const [editItemType, setEditItemType] = useState('reusable');

    // Multi-photo Editing States (up to 4 photos)
    const [existingImages, setExistingImages] = useState([]);
    const [newImageFiles, setNewImageFiles] = useState([]);
    const [newImagePreviews, setNewImagePreviews] = useState([]);
    const [activeDisplayPhotoIdx, setActiveDisplayPhotoIdx] = useState(0);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const roomOptions = [
        "MCIC Event Space",
        "MCIC Design Space",
        "Fishbowl",
        "Founders Place Event Space",
        "Founders Place Group Study",
        "Ground Floor Lockers",
        "Founders Level 1 Office",
        "Founders Level 1 Copy Room",
        "Founders Level 1 Kitchen"
    ];

    useEffect(() => {
        async function fetchItem() {
            setLoading(true);
            try {
                const docRef = doc(db, "items", itemId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setItemDetails({ id: docSnap.id, ...data });

                    setEditAssetId(docSnap.id);
                    setEditName(data.name || '');
                    setSelectedRoom(data.room || 'MCIC Event Space');
                    setSpecificLocation(data.specificLocation || '');
                    setEditDimensions(data.dimensions || '');
                    setEditIncludedItems(data.includedItems || '');
                    setEditQuantity(data.quantity ? String(data.quantity) : '1');
                    setEditItemType(data.itemType || 'reusable');

                    const imgs = data.images && data.images.length > 0
                        ? data.images
                        : (data.image ? [data.image] : []);
                    setExistingImages(imgs);
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

    const totalPhotosCount = existingImages.length + newImageFiles.length;

    const handleAddPhotos = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const availableSlots = 4 - totalPhotosCount;
        if (availableSlots <= 0) return;

        const filesToAdd = files.slice(0, availableSlots);
        const updatedNewFiles = [...newImageFiles, ...filesToAdd];
        setNewImageFiles(updatedNewFiles);

        const updatedPreviews = updatedNewFiles.map(file => URL.createObjectURL(file));
        setNewImagePreviews(updatedPreviews);
    };

    const handleRemoveExistingPhoto = (index) => {
        setExistingImages(existingImages.filter((_, i) => i !== index));
    };

    const handleRemoveNewPhoto = (index) => {
        const updatedFiles = newImageFiles.filter((_, i) => i !== index);
        const updatedPreviews = newImagePreviews.filter((_, i) => i !== index);
        setNewImageFiles(updatedFiles);
        setNewImagePreviews(updatedPreviews);
    };

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

        const fullStorageLocation = specificLocation.trim()
            ? `${selectedRoom}\n${specificLocation.trim()}`
            : selectedRoom;

        try {
            const newlyUploadedUrls = [];

            if (newImageFiles.length > 0) {
                for (let i = 0; i < newImageFiles.length; i++) {
                    const storageRef = ref(storage, `inventory/${itemId}_${Date.now()}_${i + 1}`);
                    await uploadBytes(storageRef, newImageFiles[i]);
                    const url = await getDownloadURL(storageRef);
                    newlyUploadedUrls.push(url);
                }
            }

            const allFinalImages = [...existingImages, ...newlyUploadedUrls].slice(0, 4);

            const docRef = doc(db, "items", itemId);
            const updatedData = {
                name: editName.trim(),
                room: selectedRoom,
                specificLocation: specificLocation.trim(),
                storageLocation: fullStorageLocation,
                dimensions: editDimensions.trim(),
                includedItems: editIncludedItems.trim(),
                quantity: parseInt(editQuantity, 10) || 1,
                itemType: editItemType,
                image: allFinalImages[0] || '',
                images: allFinalImages
            };

            await updateDoc(docRef, updatedData);

            setItemDetails(prev => ({
                ...prev,
                ...updatedData
            }));

            setExistingImages(allFinalImages);
            setNewImageFiles([]);
            setNewImagePreviews([]);
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
    const displayPhotosList = itemDetails.images && itemDetails.images.length > 0
        ? itemDetails.images
        : (itemDetails.image ? [itemDetails.image] : []);

    const activePhotoUrl = displayPhotosList[activeDisplayPhotoIdx] || displayPhotosList[0] || null;

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">
            <div className="max-w-md mx-auto px-6 py-12 space-y-6">

                {/* MAIN CARD CONTAINER */}
                <div className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-6">

                    {/* EDIT LISTING BUTTON */}
                    <div className="flex justify-end items-center border-b border-gray-100 pb-3">
                        <button
                            type="button"
                            onClick={() => setIsEditing(!isEditing)}
                            className="text-neutral-700 hover:text-black font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-xs transition-colors"
                        >
                            <span>{isEditing ? '✕ Cancel Edit' : '✏️ Edit Listing'}</span>
                        </button>
                    </div>

                    {/* EDIT SPECIFICATIONS FORM */}
                    {isEditing ? (
                        <form onSubmit={handleSaveItemEdit} className="space-y-5">

                            <div className="border-b border-gray-200 pb-2">
                                <h3 className="font-extrabold text-xs tracking-wider uppercase text-black">
                                    Update Asset Details
                                </h3>
                            </div>

                            {/* 1. ITEM NAME */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    Item Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Guillotine, Banner..."
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-neutral-50 border border-gray-200 text-sm p-3 rounded-sm focus:outline-none focus:border-black font-medium text-black placeholder-gray-400"
                                />
                            </div>

                            {/* 2. LOCATION SECTION */}
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    Location
                                </label>

                                <div className="border border-gray-200 p-3.5 bg-neutral-50/50 rounded-sm space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Room *
                                        </label>
                                        <div className="grid grid-cols-1 gap-1.5">
                                            {roomOptions.map((room) => {
                                                const isSelected = selectedRoom === room;
                                                return (
                                                    <button
                                                        key={room}
                                                        type="button"
                                                        onClick={() => setSelectedRoom(room)}
                                                        className={`p-2.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-all cursor-pointer text-left flex items-center justify-between ${isSelected
                                                            ? 'bg-black text-[#EAD64D] border-black shadow-xs'
                                                            : 'bg-white text-neutral-700 border-gray-200 hover:border-black hover:bg-neutral-100'
                                                            }`}
                                                    >
                                                        <span>{room}</span>
                                                        {isSelected && <span className="text-[10px]">✓</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-1 pt-2 border-t border-gray-200/60">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Storage Point
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Locker 50"
                                            value={specificLocation}
                                            onChange={(e) => setSpecificLocation(e.target.value)}
                                            className="w-full bg-white border border-gray-200 text-xs p-2.5 rounded-sm focus:outline-none focus:border-black font-medium text-black placeholder-gray-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 3. DIMENSIONS */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    Dimensions (if relevant)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. 170cm (H) x 65cm (W) x 75cm (D)"
                                    value={editDimensions}
                                    onChange={(e) => setEditDimensions(e.target.value)}
                                    className="w-full bg-neutral-50 border border-gray-200 text-xs p-3 rounded-sm focus:outline-none focus:border-black text-black placeholder-gray-400"
                                />
                            </div>

                            {/* 4. WHAT'S INCLUDED */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    What's Included (if relevant)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Power Cable, HDMI Cable, Remote Control"
                                    value={editIncludedItems}
                                    onChange={(e) => setEditIncludedItems(e.target.value)}
                                    className="w-full bg-neutral-50 border border-gray-200 text-xs p-3 rounded-sm focus:outline-none focus:border-black text-black placeholder-gray-400"
                                />
                            </div>

                            {/* 5. QUANTITY */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={editQuantity}
                                    onChange={(e) => setEditQuantity(e.target.value)}
                                    className="w-full bg-neutral-50 border border-gray-200 text-xs p-3 rounded-sm focus:outline-none focus:border-black font-medium text-black"
                                />
                            </div>

                            {/* 6. SINGLE-USE VS RE-USABLE QUESTION */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    Is this Single-Use or Re-usable? *
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditItemType('reusable')}
                                        className={`p-2.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-all cursor-pointer flex items-center justify-between ${editItemType === 'reusable'
                                            ? 'bg-black text-[#EAD64D] border-black shadow-xs'
                                            : 'bg-neutral-50 text-neutral-700 border-gray-200 hover:border-black'
                                            }`}
                                    >
                                        <span>🔄 Re-usable</span>
                                        {editItemType === 'reusable' && <span className="text-[10px]">✓</span>}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setEditItemType('single-use')}
                                        className={`p-2.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-all cursor-pointer flex items-center justify-between ${editItemType === 'single-use'
                                            ? 'bg-black text-[#EAD64D] border-black shadow-xs'
                                            : 'bg-neutral-50 text-neutral-700 border-gray-200 hover:border-black'
                                            }`}
                                    >
                                        <span>📦 Single-Use</span>
                                        {editItemType === 'single-use' && <span className="text-[10px]">✓</span>}
                                    </button>
                                </div>
                            </div>

                            {/* 7. ASSET ID */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    Asset ID
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. IPAD_004"
                                    value={editAssetId}
                                    onChange={(e) => setEditAssetId(e.target.value)}
                                    className="w-full bg-neutral-50 border border-gray-200 text-xs p-3 font-mono rounded-sm focus:outline-none focus:border-black text-black"
                                />
                            </div>

                            {/* 8. MULTI-PHOTO EDITING SECTION */}
                            <div className="space-y-2 pt-2 border-t border-gray-200/60">
                                <div className="flex items-center justify-between text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                                    <span>Asset Photos (4 max)</span>
                                    <span className="text-gray-400 font-normal">{totalPhotosCount}/4 Selected</span>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    {existingImages.map((src, idx) => (
                                        <div key={`existing-${idx}`} className="relative aspect-square bg-neutral-100 border border-gray-200 rounded-sm overflow-hidden group">
                                            <img src={src} alt={`Saved Photo ${idx + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveExistingPhoto(idx)}
                                                className="absolute top-1 right-1 bg-black/80 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center opacity-90 hover:bg-red-600 transition-colors cursor-pointer"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}

                                    {newImagePreviews.map((src, idx) => (
                                        <div key={`new-${idx}`} className="relative aspect-square bg-neutral-100 border border-gray-200 rounded-sm overflow-hidden group">
                                            <img src={src} alt={`New Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveNewPhoto(idx)}
                                                className="absolute top-1 right-1 bg-black/80 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center opacity-90 hover:bg-red-600 transition-colors cursor-pointer"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}

                                    {totalPhotosCount < 4 && (
                                        <label className="aspect-square bg-neutral-50 border-2 border-dashed border-gray-200 rounded-sm flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors">
                                            <span className="text-xl text-gray-400">📷</span>
                                            <span className="text-[9px] font-bold uppercase text-gray-400 mt-1">+ Photo</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handleAddPhotos}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* SAVE BUTTON */}
                            <button
                                type="submit"
                                disabled={isSavingEdit}
                                className="w-full py-3 bg-black text-[#EAD64D] font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-[#EAD64D] hover:text-black transition-colors cursor-pointer flex items-center justify-center gap-2"
                            >
                                <span>💾</span> {isSavingEdit ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    ) : (
                        /* VIEW MODE: BALANCED HEADER & DETAILS */
                        <div className="space-y-4">

                            {/* COMPACT IMAGE CONTAINER (FIT WITHIN CONTAINER) */}
                            {activePhotoUrl ? (
                                <div
                                    onClick={() => setActiveLightboxImg(activePhotoUrl)}
                                    className="relative w-full h-44 bg-neutral-50 border border-gray-200 rounded-sm cursor-pointer group overflow-hidden flex items-center justify-center p-2"
                                >
                                    <img
                                        src={activePhotoUrl}
                                        alt={itemDetails.name}
                                        className="h-full w-auto max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                                    />
                                    <div className="absolute bottom-2 left-2 bg-black/80 text-white text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-xs backdrop-blur-xs">
                                        🔍 Click to Enlarge
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-32 bg-neutral-50 border border-dashed border-gray-200 rounded-sm flex flex-col items-center justify-center text-neutral-400 text-xs font-bold uppercase tracking-wider">
                                    📷 No Image Uploaded
                                </div>
                            )}

                            {/* GALLERY THUMBNAILS IF MULTIPLE */}
                            {displayPhotosList.length > 1 && (
                                <div className="flex gap-2">
                                    {displayPhotosList.map((photoUrl, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setActiveDisplayPhotoIdx(idx)}
                                            className={`w-10 h-10 rounded-xs overflow-hidden border cursor-pointer transition-all ${activeDisplayPhotoIdx === idx ? 'border-black ring-1 ring-black' : 'border-gray-200 opacity-60 hover:opacity-100'}`}
                                        >
                                            <img src={photoUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* ITEM TITLE & LOCATION BELOW */}
                            <div className="space-y-1">
                                <h1 className="text-2xl font-extrabold tracking-tight text-black">
                                    {itemDetails.name}
                                </h1>
                                <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                                    📍 <strong className="text-neutral-500 font-semibold">Storage Location:</strong>{' '}
                                    <span className="text-black font-bold">{itemDetails.storageLocation}</span>
                                </p>
                            </div>

                            {/* SPECIFICATIONS */}
                            {(itemDetails.dimensions || itemDetails.includedItems || itemDetails.itemType) && (
                                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-sm text-xs space-y-1 font-medium text-neutral-700">
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

                            {/* STATUS BADGE */}
                            <div>
                                {isAvailable ? (
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-sm border border-emerald-200">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                        Available for Checkout
                                    </span>
                                ) : (
                                    <div className="space-y-1">
                                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-sm border border-amber-200">
                                            Currently Checked Out
                                        </span>
                                        <p className="text-xs text-gray-500 font-medium pt-0.5">
                                            👤 Holder: <span className="text-amber-700 font-bold">{itemDetails.user || '-'}</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SECTION 1: CHECKOUT / RESERVATION SECTION */}
                    {!isEditing && (
                        <div className="pt-2 border-t border-gray-100 space-y-4">
                            <div className="p-4 bg-neutral-50/60 border border-neutral-200/80 rounded-sm space-y-4">
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-black block border-b border-neutral-200 pb-2">
                                    🤝 Checkout or Reserve Item
                                </span>

                                {actionSuccess ? (
                                    <div className={`p-3 font-bold text-xs text-center uppercase tracking-wider rounded-sm animate-pulse ${actionSuccess === 'reservation' ? 'bg-black text-[#EAD64D]' :
                                        actionSuccess === 'borrow' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#EAD64D] text-black'
                                        }`}>
                                        {actionSuccess === 'reservation' && "📅 Future Asset Reservation Logged"}
                                        {actionSuccess === 'borrow' && "✓ Asset Returned to Stock"}
                                        {actionSuccess === 'return' && "🎟️ Asset Checkout Logged"}
                                    </div>
                                ) : (
                                    <form onSubmit={handleCheckoutPipeline} className="space-y-3.5">

                                        {isAvailable && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                    Checkout Intention
                                                </label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCheckoutIntent('now')}
                                                        className={`p-2 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${checkoutIntent === 'now'
                                                            ? 'bg-black text-[#EAD64D] border-black'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-neutral-50'
                                                            }`}
                                                    >
                                                        Checkout Now
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCheckoutIntent('future')}
                                                        className={`p-2 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${checkoutIntent === 'future'
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
                                            <div className="p-3 bg-white border border-gray-200 rounded-sm space-y-3 animate-in fade-in duration-200">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                        Date Option Type
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setDateSelectionType('single')}
                                                            className={`p-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${dateSelectionType === 'single'
                                                                ? 'bg-neutral-800 text-white border-neutral-800'
                                                                : 'bg-white text-gray-600 border-gray-200'
                                                                }`}
                                                        >
                                                            Individual Date
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDateSelectionType('range')}
                                                            className={`p-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${dateSelectionType === 'range'
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
                                                            className="w-full p-2 border border-gray-200 bg-white text-xs font-semibold rounded-sm outline-none focus:border-black text-black"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                                Start Date *
                                                            </label>
                                                            <input
                                                                type="date"
                                                                required
                                                                value={bookingStartDate}
                                                                onChange={(e) => setBookingStartDate(e.target.value)}
                                                                className="w-full p-2 border border-gray-200 bg-white text-xs font-semibold rounded-sm outline-none focus:border-black text-black"
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
                                                                className="w-full p-2 border border-gray-200 bg-white text-xs font-semibold rounded-sm outline-none focus:border-black text-black"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                            Start Time *
                                                        </label>
                                                        <input
                                                            type="time"
                                                            required
                                                            value={bookingStartTime}
                                                            onChange={(e) => setBookingStartTime(e.target.value)}
                                                            className="w-full p-2 border border-gray-200 bg-white text-xs font-semibold rounded-sm outline-none focus:border-black text-black"
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
                                                            className="w-full p-2 border border-gray-200 bg-white text-xs font-semibold rounded-sm outline-none focus:border-black text-black"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {(isAvailable || checkoutIntent === 'future') && (
                                            <>
                                                <div className="space-y-1 animate-in fade-in duration-200">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                        Your Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="e.g. John Smith"
                                                        value={borrowerName}
                                                        onChange={(e) => setBorrowerName(e.target.value)}
                                                        className="w-full p-2.5 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none focus:border-neutral-400 text-black placeholder-gray-400"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                        Are you part of the UNSW Founders Team?
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsUnswFoundersTeam('yes')}
                                                            className={`p-2 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${isUnswFoundersTeam === 'yes'
                                                                ? 'bg-black text-[#EAD64D] border-black'
                                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-neutral-50'
                                                                }`}
                                                        >
                                                            Yes
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsUnswFoundersTeam('no')}
                                                            className={`p-2 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${isUnswFoundersTeam === 'no'
                                                                ? 'bg-black text-[#EAD64D] border-black'
                                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-neutral-50'
                                                                }`}
                                                        >
                                                            No
                                                        </button>
                                                    </div>
                                                </div>

                                                {isUnswFoundersTeam === 'no' && (
                                                    <div className="space-y-1 animate-in fade-in duration-200">
                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                            Email Address *
                                                        </label>
                                                        <input
                                                            type="email"
                                                            required
                                                            placeholder="e.g. john.smith@example.com"
                                                            value={borrowerEmail}
                                                            onChange={(e) => setBorrowerEmail(e.target.value)}
                                                            className="w-full p-2.5 border border-gray-200 bg-white text-xs font-medium rounded-sm outline-none focus:border-neutral-400 text-black placeholder-gray-400"
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={isProcessing}
                                            className={`w-full py-3 text-center font-bold text-xs uppercase tracking-wider rounded-sm transition-all text-white bg-black ${isProcessing ? 'opacity-50 cursor-wait' : 'hover:bg-[#EAD64D] hover:text-black cursor-pointer'}`}
                                        >
                                            {isProcessing
                                                ? "Processing..."
                                                : (checkoutIntent === 'future' ? "Confirm Future Reservation 📅" : (isAvailable ? "Confirm Asset Checkout ↗" : "Process Return Check-In ↩"))
                                            }
                                        </button>

                                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-0.5">
                                            <span>Asset ID</span>
                                            <span className="font-mono bg-white border px-2 py-0.5 rounded-sm text-neutral-800">{itemDetails.id}</span>
                                        </div>

                                    </form>
                                )}
                            </div>

                            {/* SECTION 2: REPORT LOW STOCK / DAMAGE BUTTONS */}
                            <div className="pt-1 border-t border-gray-100 space-y-3">
                                <button
                                    type="button"
                                    onClick={() => setShowReportSection(!showReportSection)}
                                    className="w-full p-3 bg-neutral-50 hover:bg-black hover:text-[#EAD64D] border border-neutral-200 rounded-sm text-center font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-between group"
                                >
                                    <span className="flex items-center gap-2">
                                        <span>🚨</span>
                                        <span>Report Issue or Low Stock</span>
                                    </span>
                                    <span className="text-sm font-mono">{showReportSection ? '−' : '+'}</span>
                                </button>

                                {showReportSection && (
                                    <div className="p-4 bg-neutral-50/60 border border-neutral-200/80 rounded-sm space-y-3 animate-in fade-in duration-200">

                                        {supplyAlert && (
                                            <div className="p-2.5 bg-[#EAD64D] text-black font-bold text-xs rounded-xs flex justify-between items-center border border-black animate-in fade-in duration-150">
                                                <div className="flex items-center gap-2">
                                                    <span>✓</span>
                                                    <span>Report sent to MCIC Ops!</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSupplyAlert(null)}
                                                    className="text-black font-extrabold px-1 py-0.5 hover:bg-black hover:text-white rounded-xs transition-colors cursor-pointer"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}

                                        <form onSubmit={handleReportSubmit} className="space-y-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                    Issue Type
                                                </label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setReportType('broken')}
                                                        className={`p-2 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${reportType === 'broken'
                                                            ? 'bg-black text-[#EAD64D] border-black'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-neutral-50'
                                                            }`}
                                                    >
                                                        🔧 Broken / Damaged
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReportType('stock')}
                                                        className={`p-2 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${reportType === 'stock'
                                                            ? 'bg-black text-[#EAD64D] border-black'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-neutral-50'
                                                            }`}
                                                    >
                                                        ⚠️ Low Stock / Empty
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="font-extrabold text-black uppercase text-xs tracking-wide block">
                                                    {reportType === 'broken' ? 'Describe the issue or damage *' : 'Describe the stock status *'}
                                                </label>
                                                <textarea
                                                    required
                                                    rows="3"
                                                    placeholder={reportType === 'broken' ? "e.g. Screen flickering, cable frayed, missing part..." : "e.g. Only 1 left in box, completely empty..."}
                                                    value={reportDescription}
                                                    onChange={(e) => setReportDescription(e.target.value)}
                                                    className="w-full p-2.5 border border-neutral-300 bg-white text-xs font-medium rounded-xs outline-none focus:border-black text-black placeholder-gray-400"
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                className="w-full bg-black text-[#EAD64D] font-extrabold py-2.5 text-xs uppercase tracking-wider rounded-xs hover:bg-[#EAD64D] hover:text-black transition-colors cursor-pointer"
                                            >
                                                {reportType === 'broken' ? 'Submit Damage Report 🔧' : 'Report Low Stock ⚠️'}
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                <div className="text-center pt-2">
                    <a href="/inventory" className="text-xs text-gray-400 hover:text-black font-bold tracking-wider uppercase transition-colors">
                        ← Return to Inventory Catalog
                    </a>
                </div>

            </div>

            {/* FULLSCREEN LIGHTBOX MODAL */}
            {activeLightboxImg && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setActiveLightboxImg(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center">
                        <img
                            src={activeLightboxImg}
                            alt={itemDetails.name}
                            className="max-w-full max-h-[82vh] object-contain rounded-xs border border-white/20 shadow-2xl"
                        />
                        <button
                            type="button"
                            onClick={() => setActiveLightboxImg(null)}
                            className="mt-4 bg-[#EAD64D] text-black hover:bg-white text-xs font-black uppercase tracking-wider px-6 py-2 rounded-xs transition-colors cursor-pointer"
                        >
                            ✕ Close Lightbox View
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}