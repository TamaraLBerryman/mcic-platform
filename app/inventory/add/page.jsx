"use client";

import { useState } from 'react';
import Gate from '../../../components/Gate';
import InventoryItemForm from '../../../components/InventoryItemForm';
import { useRouter } from 'next/navigation';
import { db, storage } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function AddInventoryItemPage() {
    const router = useRouter();

    const [itemId, setItemId] = useState('');
    const [name, setName] = useState('');

    // Split Room and Sub-Location State
    const [selectedRoom, setSelectedRoom] = useState('MCIC Event Space');
    const [specificLocation, setSpecificLocation] = useState('');

    // Additional Specification Details
    const [dimensions, setDimensions] = useState('');
    const [includedItems, setIncludedItems] = useState('');
    const [details, setDetails] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [costPerDay, setCostPerDay] = useState('');
    const [costAppliesTo, setCostAppliesTo] = useState('item');

    const [tabs, setTabs] = useState([]);
    const [viewAccess, setViewAccess] = useState(['account']);
    const [freeInclusionSpaces, setFreeInclusionSpaces] = useState([]);

    // Multi-photo State (up to 4 photos)
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);

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

            if (imageFiles.length > 0) {
                for (let i = 0; i < imageFiles.length; i++) {
                    const storageRef = ref(storage, `inventory/${formattedId}_${Date.now()}_${i + 1}`);
                    await uploadBytes(storageRef, imageFiles[i]);
                    const url = await getDownloadURL(storageRef);
                    uploadedUrls.push(url);
                }
            }

            const fullStorageLocation = specificLocation.trim()
                ? `${selectedRoom}\n${specificLocation.trim()}`
                : selectedRoom;

            await setDoc(doc(db, "items", formattedId), {
                name: name.trim(),
                room: selectedRoom,
                specificLocation: specificLocation.trim(),
                storageLocation: fullStorageLocation,
                dimensions: dimensions.trim(),
                includedItems: includedItems.trim(),
                details: details.trim(),
                quantity: parseInt(quantity, 10) || 1,
                costPerDay: parseFloat(costPerDay) || 0,
                costAppliesTo,
                tabs,
                section: tabs.includes('digital') ? 'digital' : 'general',
                viewAccess,
                freeInclusionSpaces: freeInclusionSpaces,
                assetId: itemId.trim(),
                status: 'Available',
                user: '-',
                image: uploadedUrls[0] || '',
                images: uploadedUrls,
                createdAt: new Date().toISOString()
            });

            setIsSubmitting(false);
            setSuccessMessage(true);

            setItemId('');
            setName('');
            setSelectedRoom('MCIC Event Space');
            setSpecificLocation('');
            setDimensions('');
            setIncludedItems('');
            setDetails('');
            setQuantity('1');
            setCostPerDay('');
            setCostAppliesTo('item');
            setTabs([]);
            setViewAccess(['account']);
            setFreeInclusionSpaces([]);
            setImageFiles([]);
            setImagePreviews([]);

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
            <div className="max-w-md mx-auto px-6 py-12">
                <div className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-6">
                    <a href="/inventory" aria-label="Back to inventory" className="inline-block text-xl font-bold leading-none">←</a>
                    {successMessage ? (
                        <p className="text-sm font-bold text-emerald-800">Item added. Returning to inventory.</p>
                    ) : (
                        <InventoryItemForm
                            values={{
                                name,
                                details,
                                assetId: itemId,
                                room: selectedRoom,
                                specificLocation,
                                costPerDay,
                                costAppliesTo,
                                quantity,
                                viewAccess,
                                tabs,
                                freeInclusionSpaces,
                                dimensions,
                                includedItems
                            }}
                            onChange={(field, value) => {
                                const update = {
                                    name: setName,
                                    details: setDetails,
                                    assetId: setItemId,
                                    room: setSelectedRoom,
                                    specificLocation: setSpecificLocation,
                                    costPerDay: setCostPerDay,
                                    costAppliesTo: setCostAppliesTo,
                                    quantity: setQuantity,
                                    viewAccess: setViewAccess,
                                    tabs: setTabs,
                                    freeInclusionSpaces: setFreeInclusionSpaces,
                                    dimensions: setDimensions,
                                    includedItems: setIncludedItems
                                };
                                update[field](value);
                            }}
                            photos={imagePreviews.map((src, index) => ({ key: String(index), src }))}
                            onAddPhotos={handleImageChange}
                            onRemovePhoto={(key) => handleRemovePhoto(Number(key))}
                            submitLabel={isSubmitting ? 'Saving...' : 'Save'}
                            submitting={isSubmitting}
                            onSubmit={handleSubmit}
                        />
                    )}
                </div>
            </div>
        </main>
    );
}

export default function Page() {
    return <Gate level="staff"><AddInventoryItemPage /></Gate>;
}