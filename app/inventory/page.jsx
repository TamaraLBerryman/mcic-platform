"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
// 1. Import your actual data file
import { INVENTORY_ITEMS } from '../data/inventory';

export default function InventoryPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    // 2. Filter using the imported INVENTORY_ITEMS array
    const filteredItems = useMemo(() => {
        return INVENTORY_ITEMS.filter(item => {
            return item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.storageLocation.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [searchQuery]);

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">
            <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">

                <header className="space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight text-black">Inventory</h1>
                    <p className="text-gray-600 text-xs sm:text-sm">Real-time tracking of MCIC Assets.</p>
                </header>

                {/* SEARCH BAR */}
                <div className="bg-white p-4 border border-gray-200 rounded-sm shadow-xs">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Search Hardware or Location
                    </label>
                    <input
                        type="text"
                        placeholder="Search Dell, Fishbowl, TV..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-black font-medium text-black"
                    />
                </div>

                {/* INVENTORY LIST */}
                <div className="bg-white border border-gray-200 divide-y divide-gray-100 rounded-sm shadow-xs overflow-hidden">
                    {filteredItems.length > 0 ? (
                        filteredItems.map(item => {
                            const isAvailable = item.status === 'Available';
                            return (
                                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-neutral-50/50 transition-colors gap-4">
                                    <div className="space-y-1">
                                        <div>
                                            <span className={`font-mono text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-sm border ${isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                {isAvailable ? 'Available' : `Borrowed by ${item.user}`}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-lg text-black pt-1">{item.name}</h3>
                                        <p className="text-xs text-gray-500 font-medium">
                                            📍 Storage: <span className="text-neutral-800 font-semibold">{item.storageLocation}</span>
                                        </p>
                                    </div>
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
                            No equipment matches your search query.
                        </div>
                    )}
                </div>

            </div>
        </main>
    );
}