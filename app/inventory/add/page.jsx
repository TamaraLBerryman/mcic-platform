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

    // Split Room and Specific Sub-Location State
    const [selectedRoom, setSelectedRoom] = useState('MCIC Event Space');
    const [specificLocation, setSpecificLocation] = useState('');

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);

    // Standardized Room Options
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

    // Handle Image Preview
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const formattedId = itemId.trim().toUpperCase().replace(/\s+/g, '_');
            let imageUrl = '';

            // 1. Upload photo to Firebase Storage if selected
            if (imageFile) {
                const storageRef = ref(storage, `inventory/${formattedId}_${Date.now()}`);
                await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(storageRef);
            }

            // Combine Room and Specific Location
            const fullStorageLocation = specificLocation.trim()
                ? `${selectedRoom} - ${specificLocation.trim()}`
                : selectedRoom;

            // 2. Save document record into Firebase Firestore
            await setDoc(doc(db, "items", formattedId), {
                name: name.trim(),
                room: selectedRoom,
                specificLocation: specificLocation.trim(),
                storageLocation: fullStorageLocation,
                status: 'Available',
                user: '-',
                image: imageUrl,
                createdAt: new Date().toISOString()
            });

            setIsSubmitting(false);
            setSuccessMessage(true);

            // Reset Form fields
            setItemId('');
            setName('');
            setSelectedRoom('MCIC Event Space');
            setSpecificLocation('');
            setImageFile(null);
            setImagePreview(null);

            // Redirect back to inventory after 2 seconds
            setTimeout(() => {
                router.push('/inventory');
            }, 1800);

        } catch (error) {
            console.error("Error creating item in Firebase:", error);
            alert("Failed to save item. Please check your Firebase configuration or security rules.");
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">
            <div className="max-w-xl mx-auto px-6 py-16 space-y-8">

                <header className="space-y-2">
                    <div className="inline-block bg-black text-white font-mono text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-sm">
                        Database Registry Entry
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-black">
                        Add New Inventory Asset
                    </h1>
                    <p className="text-gray-600 text-xs sm:text-sm">
                        Register hardware, laptops, keys, or media equipment into your live Firebase inventory catalog.
                    </p>
                </header>

                <div className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-6">

                    {successMessage ? (
                        <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider text-center rounded-sm animate-pulse">
                            ✓ Item Registered Successfully! Redirecting to catalog...
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">

                            {/* ITEM ID */}
                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    Asset ID / Code (Unique Tag) *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. CAM_001, IPAD_004, KEYS_L1"
                                    value={itemId}
                                    onChange={(e) => setItemId(e.target.value)}
                                    className="w-full bg-neutral-50 border border-gray-200 text-sm p-3 font-mono font-bold rounded-sm focus:outline-none focus:border-black text-black placeholder-gray-400"
                                />
                            </div>

                            {/* ITEM NAME */}
                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    Equipment Title / Item Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Sony Alpha 7 IV Camera, iPad #004"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-neutral-50 border border-gray-200 text-sm p-3 rounded-sm focus:outline-none focus:border-black font-medium text-black placeholder-gray-400"
                                />
                            </div>

                            {/* ROOM SELECTOR DROPDOWN */}
                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    Primary Room Location *
                                </label>
                                <select
                                    value={selectedRoom}
                                    onChange={(e) => setSelectedRoom(e.target.value)}
                                    className="w-full bg-neutral-50 border border-gray-200 text-sm p-3 rounded-sm focus:outline-none focus:border-black font-semibold text-black cursor-pointer"
                                >
                                    {roomOptions.map((room) => (
                                        <option key={room} value={room}>
                                            {room}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* SPECIFIC LOCATION IN ROOM */}
                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    Specific Location in Room (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Black Cabinet (Zone B), Drawer 3, AV Shutter Shelf 2"
                                    value={specificLocation}
                                    onChange={(e) => setSpecificLocation(e.target.value)}
                                    className="w-full bg-neutral-50 border border-gray-200 text-sm p-3 rounded-sm focus:outline-none focus:border-black font-medium text-black placeholder-gray-400"
                                />
                            </div>

                            {/* PHOTO UPLOAD INPUT */}
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    Equipment Photo (Upload)
                                </label>

                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 bg-neutral-100 border border-gray-200 rounded-sm shrink-0 overflow-hidden flex items-center justify-center">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl">📷</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-sm file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-black file:text-white hover:file:bg-[#EAD64D] hover:file:text-black file:cursor-pointer"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, or WEBP photo format.</p>
                                    </div>
                                </div>
                            </div>

                            {/* SUBMIT BUTTON */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full py-3.5 text-center font-bold text-xs uppercase tracking-wider rounded-sm transition-all text-white bg-black ${isSubmitting ? 'opacity-50 cursor-wait' : 'hover:bg-[#EAD64D] hover:text-black'}`}
                            >
                                {isSubmitting ? "Uploading Photo & Saving to Firebase..." : "+ Save Asset to Inventory"}
                            </button>

                        </form>
                    )}

                </div>

                <div className="text-center">
                    <a href="/inventory" className="text-xs text-gray-400 hover:text-black font-bold tracking-wider uppercase transition-colors">
                        ← Cancel & Return to Catalog
                    </a>
                </div>

            </div>
        </main>
    );
}