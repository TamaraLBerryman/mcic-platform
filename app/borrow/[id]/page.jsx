"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function BorrowPage({ params }) {
    const itemId = params.id ? params.id.toUpperCase() : "UNKNOWN-ASSET";

    const [itemDetails, setItemDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [borrowerName, setBorrowerName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [actionSuccess, setActionSuccess] = useState(false);

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
        const isCurrentlyAvailable = itemDetails.status === 'Available';

        const newStatus = isCurrentlyAvailable ? 'Borrowed' : 'Available';
        const newBorrower = isCurrentlyAvailable ? borrowerName : '-';

        try {
            const docRef = doc(db, "items", itemId);
            await updateDoc(docRef, {
                status: newStatus,
                user: newBorrower
            });

            setActionSuccess(true);
            setItemDetails(prev => ({
                ...prev,
                status: newStatus,
                user: newBorrower
            }));

            setTimeout(() => {
                setActionSuccess(false);
                setBorrowerName('');
            }, 2500);
        } catch (error) {
            console.error("Error updating document in Firebase:", error);
            alert("Database update failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-[#F9F9F9] flex items-center justify-center p-6 text-xs font-bold uppercase tracking-wider text-gray-400">
                Loading item from Firebase...
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
                <header className="space-y-2 text-center">
                    <div className="inline-block bg-neutral-900 text-white font-mono text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-sm shadow-sm">
                        QR Node: Tracking Gateway
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-black pt-1">
                        Asset Transaction Desk
                    </h1>
                </header>

                <div className="bg-white border border-gray-200 p-6 rounded-sm shadow-sm space-y-6">
                    <div className="border-b border-gray-100 pb-4 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <span>Hardware Registration ID</span>
                            <span className="font-mono bg-neutral-50 border px-2 py-0.5 rounded-sm text-neutral-800">{itemDetails.id}</span>
                        </div>

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
                        <div className={`p-4 font-bold text-xs text-center uppercase tracking-wider rounded-sm animate-pulse ${isAvailable ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#EAD64D] text-black'}`}>
                            {isAvailable ? "✓ Asset Returned to Stock" : "🎟️ Asset Checkout Logged"}
                        </div>
                    ) : (
                        <form onSubmit={handleCheckoutPipeline} className="space-y-4">
                            {isAvailable && (
                                <div className="space-y-1.5 animate-in fade-in duration-200">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                        Borrower Name & Venture Team
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
                                className={`w-full py-3.5 text-center font-bold text-xs uppercase tracking-wider rounded-sm transition-all text-white bg-black ${isProcessing ? 'opacity-50 cursor-wait' : 'hover:bg-[#EAD64D] hover:text-black'}`}
                            >
                                {isProcessing
                                    ? "Processing..."
                                    : (isAvailable ? "Confirm Asset Checkout ↗" : "Process Return Check-In ↩")
                                }
                            </button>
                        </form>
                    )}
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