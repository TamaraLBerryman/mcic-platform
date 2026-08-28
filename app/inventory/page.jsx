"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export default function InventoryPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Master inventory asset dataset
    const inventoryItems = [
        { id: "CAM-01", name: "Sony Alpha 7 IV Camera", category: "Media & AV", location: "Black Cabinet (Zone B)", status: "Available", user: "-" },
        { id: "MIC-02", name: "Røde Wireless GO II Mics", category: "Media & AV", location: "Black Cabinet (Zone B)", status: "Available", user: "-" },
        { id: "MIC-03", name: "Shure SM7B Vocal Mic", category: "Media & AV", location: "Podcast Studio", status: "Borrowed", user: "Jessica Jones" },
        { id: "DISP-01", name: "Samsung 55\" Rolling Display", category: "AV & Events", location: "Main Hallway", status: "Available", user: "-" },
        { id: "KEY-101", name: "Room 140 Boardroom Keycard", category: "Facility Keys", location: "Ops Desk", status: "Available", user: "-" },
        { id: "LAP-04", name: "Dell XPS 15 (Testing Rig)", category: "Hardware", location: "Makerspace Lab", status: "Borrowed", user: "Alex Smith" },
        { id: "VR-01", name: "Meta Quest 3 Headset", category: "Hardware", location: "Makerspace Lab", status: "Available", user: "-" },
    ];

    const categories = ["All", "Media & AV", "AV & Events", "Facility Keys", "Hardware"];

    const filteredItems = useMemo(() => {
        return inventoryItems.filter(item => {
            const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.location.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [searchQuery, selectedCategory]);

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">
            <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">

                <header className="space-y-2">
                    <div className="inline-block bg-[#EAD64D] text-black font-extrabold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-sm">
                        MCIC Asset Catalog & Tracking
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-black">Inventory</h1>
                    <p className="text-gray-600 text-xs sm:text-sm">Real-time tracking of equipment, AV hardware, and room access keys across Level 1.</p>
                </header>

                {/* SEARCH & FILTER BAR */}
                <div className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <input
                            type="text"
                            placeholder="Search by gear name, ID (e.g. CAM-01), or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-96 p-3 border border-gray-200 bg-neutral-50 text-xs font-semibold rounded-sm outline-none focus:border-black text-black"
                        />

                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer ${selectedCategory === cat
                                            ? 'bg-black text-white'
                                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* INVENTORY LIST */}
                <div className="bg-white border border-gray-200 rounded-sm shadow-xs overflow-hidden">
                    <div className="divide-y divide-gray-100">
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
                                            <div className="flex items-center gap-2 pt-1">
                                                <span className="font-mono text-xs font-bold bg-black text-white px-2 py-0.5 rounded-xs">{item.id}</span>
                                                <h3 className="font-bold text-lg text-black">{item.name}</h3>
                                            </div>
                                            <p className="text-xs text-gray-500 font-medium">
                                                📍 Storage: <span className="text-neutral-800 font-semibold">{item.location}</span> ({item.category})
                                            </p>
                                        </div>
                                        <div className="sm:w-auto w-full shrink-0 pt-2 sm:pt-0">
                                            <button
                                                type="button"
                                                onClick={() => router.push(`/borrow/${item.id.toLowerCase()}`)}
                                                className={`w-full sm:w-auto px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer ${isAvailable ? 'bg-black text-white hover:bg-[#EAD64D] hover:text-black' : 'bg-neutral-900 text-white hover:bg-red-600'
                                                    }`}
                                            >
                                                {isAvailable ? 'Checkout Item ↗' : 'Return Item ↩'}
                                            </button>
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

            </div>
        </main>
    );
}