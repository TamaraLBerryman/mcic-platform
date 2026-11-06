"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { addDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import InventorySuggest from '../../components/InventorySuggest';
import { allows } from '../lib/access';
import { useAccess } from '../../components/useAccess';

export default function InventoryPage() {
    const router = useRouter();
    const { access } = useAccess();
    const [searchQuery, setSearchQuery] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showReport, setShowReport] = useState(false);
    const [reportWhat, setReportWhat] = useState('');
    const [reportItemId, setReportItemId] = useState(null);
    const [reportInInventory, setReportInInventory] = useState(false);
    const [reportFinished, setReportFinished] = useState(false);
    const [reportWhere, setReportWhere] = useState('');
    const [reportDetails, setReportDetails] = useState('');
    const [reporterName, setReporterName] = useState('');
    const [reportMessage, setReportMessage] = useState('');
    const [reportBusy, setReportBusy] = useState(false);

    const submitBrokenReport = async (event) => {
        event.preventDefault();
        if (!reportWhat.trim() || !reportWhere.trim() || !reportDetails.trim() || !reporterName.trim()) return;
        setReportBusy(true);
        setReportMessage('');
        try {
            await addDoc(collection(db, 'alerts'), {
                type: 'Maintenance / Damaged Asset',
                item: reportWhat.trim(),
                itemId: reportInInventory ? reportItemId : null,
                inInventory: Boolean(reportInInventory && reportItemId),
                location: reportWhere.trim(),
                description: reportDetails.trim(),
                reporter: reporterName.trim(),
                status: 'Pending',
                createdAt: new Date().toISOString()
            });
            setReportWhat('');
            setReportItemId(null);
            setReportInInventory(false);
            setReportFinished(false);
            setReportWhere('');
            setReportDetails('');
            setReporterName('');
            setShowReport(false);
            setReportMessage('Report sent. The MCIC team can see it in admin.');
        } catch (error) {
            console.error('Broken item report failed:', error);
            setReportMessage('The report could not be sent. Please try again.');
        } finally {
            setReportBusy(false);
        }
    };

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
            if (!allows(access, item.viewAccess || 'public')) return false;
            return nameMatch || locationMatch;
        });
    }, [items, searchQuery, access]);

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">
            <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">

                {/* HEADER */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-black">
                            Inventory Hub
                        </h1>
                        <p className="text-gray-600 text-xs sm:text-sm">Search, Check-Out, Book and Report Broken Items.</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setShowReport((open) => !open)}
                            className="inline-block bg-white text-black border border-gray-300 hover:border-black transition-colors px-4 py-2.5 rounded-sm font-bold text-xs uppercase tracking-wider"
                        >
                            Report something broken
                        </button>
                        {access.staff && (
                            <Link
                                href="/inventory/add"
                                className="inline-block bg-black text-white hover:bg-[#EAD64D] hover:text-black transition-colors px-4 py-2.5 rounded-sm font-bold text-xs uppercase tracking-wider"
                            >
                                + Add New Item
                            </Link>
                        )}
                    </div>
                </header>

                {/* SUB-NAVIGATION TAB BAR */}
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto text-xs font-bold uppercase tracking-wider">
                    <Link
                        href="/inventory"
                        className="px-3.5 py-2 bg-black text-white rounded-sm shrink-0"
                    >
                        🗄️ General Inventory
                    </Link>
                    {access.staff && (
                        <Link
                            href="/lockers"
                            className="px-3.5 py-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-sm transition-colors shrink-0"
                        >
                            🔒 Lockers
                        </Link>
                    )}
                    {access.staff && (
                        <Link
                            href="/kitchen"
                            className="px-3.5 py-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-sm transition-colors shrink-0"
                        >
                            🍽️ Kitchens
                        </Link>
                    )}
                </div>

                {reportMessage && (
                    <p className="text-xs font-bold text-black">{reportMessage}</p>
                )}

                {showReport && (
                    <form onSubmit={submitBrokenReport} className="bg-white p-4 border border-gray-200 rounded-sm shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                            <h2 className="text-sm font-extrabold uppercase">Report something broken</h2>
                            <p className="text-xs text-gray-500 mt-1">Use this when there is no inventory item, for example a broken tap or a light in the building.</p>
                        </div>
                        <InventorySuggest
                            items={items}
                            value={reportWhat}
                            itemId={reportItemId}
                            finished={reportFinished}
                            onChange={({ text, itemId, inInventory, finished }) => {
                                setReportWhat(text);
                                setReportItemId(itemId);
                                setReportInInventory(inInventory);
                                setReportFinished(Boolean(finished));
                            }}
                        />
                        <input required value={reportWhere} onChange={(event) => setReportWhere(event.target.value)} placeholder="Where" className="p-3 border border-gray-300 text-xs rounded-sm" />
                        <input required value={reporterName} onChange={(event) => setReporterName(event.target.value)} placeholder="Your name" className="p-3 border border-gray-300 text-xs rounded-sm" />
                        <textarea required value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder="What is wrong" className="p-3 border border-gray-300 text-xs rounded-sm h-20" />
                        <button type="submit" disabled={reportBusy} className="sm:col-span-2 bg-[#EAD64D] text-black font-bold text-xs uppercase py-3 rounded-sm disabled:opacity-50">
                            Send report
                        </button>
                    </form>
                )}

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
                            const targetUrl = `/borrow/${item.id.toLowerCase()}`;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => router.push(targetUrl)}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-neutral-50 transition-colors gap-4 cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-neutral-100 border border-gray-200 rounded-sm shrink-0 overflow-hidden flex items-center justify-center">
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                />
                                            ) : (
                                                <span className="text-xl">📦</span>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <div>
                                                <span className={`font-mono text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-sm border ${isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                    {isAvailable ? 'Available' : `Borrowed by ${item.user || '-'}`}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-lg text-black pt-1 group-hover:underline">
                                                {item.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 font-medium">
                                                📍 Storage: <span className="text-neutral-800 font-semibold">{item.storageLocation}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="sm:w-auto w-full shrink-0 pt-2 sm:pt-0">
                                        <a
                                            href={targetUrl}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`inline-block text-center w-full sm:w-auto px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors ${isAvailable ? 'bg-black text-white hover:bg-[#EAD64D] hover:text-black' : 'bg-neutral-900 text-white hover:bg-red-600'}`}
                                        >
                                            {isAvailable ? 'Select Item ↗' : 'Return Item ↩'}
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