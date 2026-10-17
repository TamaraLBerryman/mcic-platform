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

    // Multi-photo State (1 to 4 photos)
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

            // 1. Upload photos (1 to 4) to Firebase Storage
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
                status: 'Available',
                user: '-',
                image: uploadedUrls[0] || '', // Primary thumbnail photo
                images: uploadedUrls,          // Array of 1 to 4 photo URLs
                createdAt: new Date().toISOString()
            });

            setIsSubmitting(false);
            setSuccessMessage(true);

            // Reset Form fields
            setItemId('');
            setName('');
            setSelectedRoom('MCIC Event Space');
            setSpecificLocation('');
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
            <div className="max-w-xl mx-auto px-6 py-16 space-y-8">

                <header className="space-y-2">
                    <h1 className="text-3xl font-extrabold tracking-tight text-black">
                        Add New Item to Inventory
                    </h1>
                </header>

                <div className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-6">

                    {successMessage ? (
                        <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider text-center rounded-sm animate-pulse">
                            ✓ Item added successfully! Redirecting to Inventory List...
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">

                            {/* ITEM NAME */}
                            <div>
                                <input
                                    type="text"
                                    required
                                    placeholder="Item Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-neutral-50 border border-gray-200 text-sm p-3.5 rounded-sm focus:outline-none focus:border-black font-medium text-black placeholder-gray-400"
                                />
                            </div>

                            {/* LOCATION GROUP SECTION */}
                            <div className="border border-gray-200 p-4 bg-neutral-50/50 rounded-sm space-y-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                                    Location
                                </span>

                                <select
                                    value={selectedRoom}
                                    onChange={(e) => setSelectedRoom(e.target.value)}
                                    className="w-full bg-white border border-gray-200 text-sm p-3.5 rounded-sm focus:outline-none focus:border-black font-semibold text-black cursor-pointer"
                                >
                                    {roomOptions.map((room) => (
                                        <option key={room} value={room}>
                                            {room}*
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="text"
                                    placeholder="Storage Point e.g. Locker 50"
                                    value={specificLocation}
                                    onChange={(e) => setSpecificLocation(e.target.value)}
                                    className="w-full bg-white border border-gray-200 text-sm p-3.5 rounded-sm focus:outline-none focus:border-black font-medium text-black placeholder-gray-400"
                                />
                            </div>

                            {/* ASSET ID */}
                            <div>
                                <input
                                    type="text"
                                    placeholder="Asset ID (if relevent) e.g. Ipad_004"
                                    value={itemId}
                                    onChange={(e) => setItemId(e.target.value)}
                                    className="w-full bg-neutral-50 border border-gray-200 text-sm p-3.5 font-mono font-bold rounded-sm focus:outline-none focus:border-black text-black placeholder-gray-400"
                                />
                            </div>

                            {/* MULTI-PHOTO UPLOAD SECTION (1 to 4 Photos) */}
                            <div className="space-y-3 pt-2 border-t border-gray-100">
                                <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                                    <span>Upload Photos (1 to 4 max)</span>
                                    <span>{imageFiles.length}/4 Selected</span>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    {imagePreviews.map((src, idx) => (
                                        <div key={idx} className="relative aspect-square bg-neutral-100 border border-gray-200 rounded-sm overflow-hidden group">
                                            <img src={src} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePhoto(idx)}
                                                className="absolute top-1 right-1 bg-black/80 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center opacity-90 hover:bg-red-600 transition-colors"
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
                                className={`w-full py-3.5 text-center font-bold text-xs uppercase tracking-wider rounded-sm transition-all text-white bg-black ${isSubmitting ? 'opacity-50 cursor-wait' : 'hover:bg-[#EAD64D] hover:text-black'}`}
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