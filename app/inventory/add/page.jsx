"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, storage } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function AddInventoryItemPage() {
    const router = useRouter();

    const [itemId, setItemId] = useState('');
    const [name, setName] = useState('');

    // Split Room and Sub-Location State
    const [selectedRoom, setSelectedRoom] = useState('MCIC Event Space');
    const [specificLocation, setSpecificLocation] = useState('');

    // Additional Specification Details
    const [dimensions, setDimensions] = useState('');
    const [includedItems, setIncludedItems] = useState('');
    const [quantity, setQuantity] = useState('1');

    // Multi-photo State (up to 4 photos)
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);

    // Standardized Room Selection Options
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

    // Handle Multi-Photo Selection (Up to 4)
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const updatedFiles = [...imageFiles, ...files].slice(0, 4);
        setImageFiles(updatedFiles);

        const updatedPreviews = updatedFiles.map(file => URL.createObjectURL(file));
        setImagePreviews(updatedPreviews);
    };

    const handleRemovePhoto = (index) => {
        const updatedFiles = imageFiles.filter((_, i) => i !== index);
        const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
        setImageFiles(updatedFiles);
        setImagePreviews(updatedPreviews);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const formattedId = itemId.trim()
                ? itemId.trim().toUpperCase().replace(/\s+/g, '_')
                : `ITEM_${Date.now()}`;

            const uploadedUrls = [];

            // 1. Upload photos (up to 4) to Firebase Storage
            if (imageFiles.length > 0) {
                for (let i = 0; i < imageFiles.length; i++) {
                    const storageRef = ref(storage, `inventory/${formattedId}_${Date.now()}_${i + 1}`);
                    await uploadBytes(storageRef, imageFiles[i]);
                    const url = await getDownloadURL(storageRef);
                    uploadedUrls.push(url);
                }
            }

            // Combine Primary Room and Sub-Location into full storage string
            const fullStorageLocation = specificLocation.trim()
                ? `${selectedRoom} - ${specificLocation.trim()}`
                : selectedRoom;

            // 2. Save document record into Firebase Firestore
            await setDoc(doc(db, "items", formattedId), {
                name: name.trim(),
                room: selectedRoom,
                specificLocation: specificLocation.trim(),
                storageLocation: fullStorageLocation,
                dimensions: dimensions.trim(),
                includedItems: includedItems.trim(),
                quantity: parseInt(quantity, 10) || 1,
                status: 'Available',
                user: '-',
                image: uploadedUrls[0] || '', // Primary thumbnail photo
                images: uploadedUrls,          // Array of up to 4 photo URLs
                createdAt: new Date().toISOString()
            });

            setIsSubmitting(false);
            setSuccessMessage(true);

            // Reset Form fields
            setItemId('');
            setName('');
            setSelectedRoom('MCIC Event Space');
            setSpecificLocation('');
            setDimensions('');
            setIncludedItems('');
            setQuantity('1');
            setImageFiles([]);
            setImagePreviews([]);

            // Redirect back to inventory after 2 seconds
            setTimeout(() => {
                router.push('/inventory');
            }, 1800);

        } catch (error) {
            console.error("Error creating item in Firebase:", error);
            alert("Failed to save item. Please check your Firebase configuration or storage rules.");
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">
            <div className="max-w-2xl mx-auto px-6 py-16 space-y-8">

                <header className="space-y-2">
                    <h1 className="text-3xl font-extrabold tracking-tight text-black">
                        Add New Item to Inventory
                    </h1>
                </header>

                <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-sm shadow-xs space-y-6">

                    {successMessage ? (
                        <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider text-center rounded-sm animate-pulse">
                            ✓ Item added successfully! Redirecting to Inventory List...
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* 1. ITEM NAME */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    Item Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Guillotine, Banner..."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-neutral-50 border border-gray-200 text-sm p-3.5 rounded-sm focus:outline-none focus:border-black font-medium text-black placeholder-gray-400"
                                />
                            </div>

                            {/* 2. LOCATION SECTION */}
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    Location
                                </label>

                                <div className="border border-gray-200 p-5 bg-neutral-50/50 rounded-sm space-y-5">

                                    {/* ROOM PILLS */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Room *
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {roomOptions.map((room) => {
                                                const isSelected = selectedRoom === room;
                                                return (
                                                    <button
                                                        key={room}
                                                        type="button"
                                                        onClick={() => setSelectedRoom(room)}
                                                        className={`p-3 text-[11px] font-bold uppercase tracking-wider rounded-sm border transition-all cursor-pointer text-left flex items-center justify-between ${isSelected
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

                                    {/* STORAGE POINT INPUT */}
                                    <div className="space-y-1.5 pt-2 border-t border-gray-200/60">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Storage Point
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Locker 50"
                                            value={specificLocation}
                                            onChange={(e) => setSpecificLocation(e.target.value)}
                                            className="w-full bg-white border border-gray-200 text-sm p-3.5 rounded-sm focus:outline-none focus:border-black font-medium text-black placeholder-gray-400"
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
                                    value={dimensions}
                                    onChange={(e) => setDimensions(e.target.value)}
                                    className="w-full bg-neutral-50 border border-gray-200 text-sm p-3.5 rounded-sm focus:outline-none focus:border-black font-medium text-black placeholder-gray-400"
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
                                    value={includedItems}
                                    onChange={(e) => setIncludedItems(e.target.value)}
                                    className="w-full bg-neutral-50 border border-gray-200 text-sm p-3.5 rounded-sm focus:outline-none focus:border-black font-medium text-black placeholder-gray-400"
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
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="w-full bg-neutral-50 border border-gray-200 text-sm p-3.5 rounded-sm focus:outline-none focus:border-black font-medium text-black"
                                />
                            </div>

                            {/* 6. ASSET ID */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    Asset ID (if relevant)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Ipad_004"
                                    value={itemId}
                                    onChange={(e) => setItemId(e.target.value)}
                                    className="w-full bg-neutral-50 border border-gray-200 text-sm p-3.5 font-medium rounded-sm focus:outline-none focus:border-black text-black placeholder-gray-400"
                                />
                            </div>

                            {/* 7. MULTI-PHOTO UPLOAD SECTION (4 MAX) */}
                            <div className="space-y-3 pt-2 border-t border-gray-100">
                                <div className="flex items-center justify-between text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                                    <span>Upload Photos (4 max)</span>
                                    <span className="text-gray-400 font-normal">{imageFiles.length}/4 Selected</span>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    {imagePreviews.map((src, idx) => (
                                        <div key={idx} className="relative aspect-square bg-neutral-100 border border-gray-200 rounded-sm overflow-hidden group">
                                            <img src={src} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePhoto(idx)}
                                                className="absolute top-1 right-1 bg-black/80 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center opacity-90 hover:bg-red-600 transition-colors cursor-pointer"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}

                                    {imageFiles.length < 4 && (
                                        <label className="aspect-square bg-neutral-50 border-2 border-dashed border-gray-200 rounded-sm flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors">
                                            <span className="text-xl text-gray-400">📷</span>
                                            <span className="text-[9px] font-bold uppercase text-gray-400 mt-1">+ Photo</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handleImageChange}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400">PNG, JPG, or WEBP formats allowed.</p>
                            </div>

                            {/* SUBMIT BUTTON */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full py-3.5 text-center font-bold text-xs uppercase tracking-wider rounded-sm transition-all text-white bg-black ${isSubmitting ? 'opacity-50 cursor-wait' : 'hover:bg-[#EAD64D] hover:text-black cursor-pointer'}`}
                            >
                                {isSubmitting ? "Uploading Photos & Saving..." : "+ Save Item to Inventory"}
                            </button>

                        </form>
                    )}

                </div>

                <div className="text-center">
                    <a href="/inventory" className="text-xs text-gray-400 hover:text-black font-bold tracking-wider uppercase transition-colors">
                        ← Cancel & Return to Inventory List.
                    </a>
                </div>

            </div>
        </main>
    );
}