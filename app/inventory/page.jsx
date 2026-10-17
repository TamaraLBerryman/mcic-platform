"use client";

import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function InventoryPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Listen to live inventory changes in Firebase Firestore
    useEffect(() => {
        const q = query(collection(db, "items"), orderBy("name", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const inventoryData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setItems(inventoryData);
            setLoading(false);
        }, (error) => {
            console.error("Firebase Firestore fetch error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Filter items based on local search query
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const nameMatch = item.name ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
            const locationMatch = item.storageLocation ? item.storageLocation.toLowerCase().includes(searchQuery.toLowerCase()) : false;
            return nameMatch || locationMatch;
        });
    }, [items, searchQuery]);

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">
            <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">

                {/* HEADER */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-extrabold tracking-tight text-black">Inventory</h1>
                        <p className="text-gray-600 text-xs sm:text-sm">Search, Check-Out, Book and Report Borken Items.</p>
                    </div>
                    <div>
                        <a
                            href="/inventory/add"
                            className="inline-block bg-black text-white hover:bg-[#EAD64D] hover:text-black transition-colors px-4 py-2.5 rounded-sm font-bold text-xs uppercase tracking-wider"
                        >
                            + Add New Item
                        </a>
                    </div>
                </header>

                {/* SEARCH BAR */}
                <div className="bg-white p-4 border border-gray-200 rounded-sm shadow-xs">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Search Item or Location
                    </label>
                    <input
                        type="text"
                        placeholder="Banner, Guillotine, Paper Plates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-black font-medium text-black"
                    />
                </div>

                {/* INVENTORY LIST */}
                <div className="bg-white border border-gray-200 divide-y divide-gray-100 rounded-sm shadow-xs overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-xs font-bold uppercase text-gray-400 animate-pulse tracking-wide">
                            Loading...
                        </div>
                    ) : filteredItems.length > 0 ? (
                        filteredItems.map(item => {
                            const isAvailable = item.status === 'Available';
                            return (
                                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-neutral-50/50 transition-colors gap-4">
                                    <div className="flex items-center gap-4">
                                        {/* THUMBNAIL PHOTO DISPLAY */}
                                        <div className="w-16 h-16 bg-neutral-100 border border-gray-200 rounded-sm shrink-0 overflow-hidden flex items-center justify-center">
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-xl">📦</span>
                                            )}
                                        </div>

                                        {/* ITEM DETAILS */}
                                        <div className="space-y-1">
                                            <div>
                                                <span className={`font-mono text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-sm border ${isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                    {isAvailable ? 'Available' : `Borrowed by ${item.user || '-'}`}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-lg text-black pt-1">{item.name}</h3>
                                            <p className="text-xs text-gray-500 font-medium">
                                                📍 Storage: <span className="text-neutral-800 font-semibold">{item.storageLocation}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* ACTION LINK */}
                                    <div className="sm:w-auto w-full shrink-0 pt-2 sm:pt-0">
                                        <a
                                            href={`/borrow/${item.id.toLowerCase()}`}
                                            className={`inline-block text-center w-full sm:w-auto px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors ${isAvailable ? 'bg-black text-white hover:bg-[#EAD64D] hover:text-black' : 'bg-neutral-900 text-white hover:bg-red-600'
                                                }`}
                                        >
                                            {isAvailable ? 'Checkout Item ↗' : 'Return Item ↩'}
                                        </a>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center text-xs font-bold uppercase text-gray-400 italic tracking-wide">
                            No inventory items found. Change your search parameters or add a new item.
                        </div>
                    )}
                </div>

            </div>
        </main>
    );
}