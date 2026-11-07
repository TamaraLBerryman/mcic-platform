"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '../lib/firebase';
import { addDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import InventorySuggest from '../../components/InventorySuggest';
import { canViewItem } from '../lib/access';
import { useAccess } from '../../components/useAccess';
import Gate from '../../components/Gate';
import { pageIsHidden } from '../lib/sitePages';
import { useHiddenPages } from '../../components/SitePages';

function InventoryPage() {
    const router = useRouter();
    const { access } = useAccess();
    const { hiddenPages } = useHiddenPages();
    const [searchQuery, setSearchQuery] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const searchParams = useSearchParams();
    const requestedSection = searchParams.get('section');
    const section = requestedSection === 'digital' || requestedSection === 'locker' || requestedSection === 'kitchen' ? requestedSection : 'general';
    const [showReport, setShowReport] = useState(false);
    const [reportType, setReportType] = useState(null);
    const [reportWhat, setReportWhat] = useState('');
    const [reportItemId, setReportItemId] = useState(null);
    const [reportInInventory, setReportInInventory] = useState(false);
    const [reportFinished, setReportFinished] = useState(false);
    const [reportWhere, setReportWhere] = useState('');
    const [reportDetails, setReportDetails] = useState('');
    const [reportMessage, setReportMessage] = useState('');
    const [reportBusy, setReportBusy] = useState(false);

    const accountName = (access?.name || '').trim() || access?.email || '';

    const submitBrokenReport = async (event) => {
        event.preventDefault();
        if (!reportType || !reportWhat.trim() || !reportWhere.trim() || !reportDetails.trim() || !accountName) return;
        setReportBusy(true);
        setReportMessage('');
        try {
            await addDoc(collection(db, 'alerts'), {
                type: reportType === 'stock' ? 'Low Stock Alert' : 'Maintenance / Damaged Asset',
                item: reportWhat.trim(),
                itemId: reportInInventory ? reportItemId : null,
                inInventory: Boolean(reportInInventory && reportItemId),
                location: reportWhere.trim(),
                description: reportDetails.trim(),
                reporter: accountName,
                status: 'Pending',
                createdAt: new Date().toISOString()
            });
            setReportType(null);
            setReportWhat('');
            setReportItemId(null);
            setReportInInventory(false);
            setReportFinished(false);
            setReportWhere('');
            setReportDetails('');
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
            const tabs = Array.isArray(item.tabs) && item.tabs.length
                ? item.tabs
                : (item.section === 'digital' ? ['digital'] : []);
            const listedInGeneral = tabs.length === 0 || tabs.includes('kitchen') || tabs.includes('locker');
            if (section === 'general' ? !listedInGeneral : !tabs.includes(section)) return false;
            if (!canViewItem(access, item.viewAccess)) return false;
            return nameMatch || locationMatch;
        });
    }, [items, searchQuery, access, section]);

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">
            <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">

                {/* HEADER */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-black">
                            Inventory Hub
                        </h1>
                        <p className="text-gray-600 text-xs sm:text-sm">Search, check out, book, and report something broken or low on stock.</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => { setReportType(null); setShowReport(true); }}
                            className="inline-block bg-white text-black border border-gray-300 hover:border-black transition-colors px-4 py-2.5 rounded-sm font-bold text-xs uppercase tracking-wider"
                        >
                            Report something broken or low on stock
                        </button>
                        {access.staff && !pageIsHidden('/inventory/add', hiddenPages) && (
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
                        className={`px-3.5 py-2 rounded-sm shrink-0 ${section === 'general' ? 'bg-black text-white' : 'text-gray-600 hover:text-black hover:bg-gray-100 transition-colors'}`}
                    >
                        🗄️ General Inventory
                    </Link>
                    <Link
                        href="/inventory?section=digital"
                        className={`px-3.5 py-2 rounded-sm shrink-0 ${section === 'digital' ? 'bg-black text-white' : 'text-gray-600 hover:text-black hover:bg-gray-100 transition-colors'}`}
                    >
                        💻 Digital Assets
                    </Link>
                    {access.staff && !pageIsHidden('/lockers', hiddenPages) && (
                        <Link
                            href="/lockers"
                            className="px-3.5 py-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-sm transition-colors shrink-0"
                        >
                            🔒 Lockers
                        </Link>
                    )}
                    {access.staff && !pageIsHidden('/kitchen', hiddenPages) && (
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
                                                    {isAvailable ? 'Available' : `Checked out By ${item.user || '—'}`}
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
                            {section === 'digital' ? 'No digital assets found.' : section === 'locker' ? 'No locker items found.' : section === 'kitchen' ? 'No kitchen items found.' : 'No inventory items found. Change your search parameters or add a new item.'}
                        </div>
                    )}
                </div>

            </div>

            {showReport && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => { if (!reportBusy) setShowReport(false); }}>
                    <div className="bg-white max-w-md w-full p-6 rounded-sm space-y-4 max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3">
                            <h2 className="text-lg font-extrabold">Report something broken or low on stock</h2>
                            <button type="button" onClick={() => setShowReport(false)} disabled={reportBusy} className="text-xs font-bold uppercase tracking-wider">Close</button>
                        </div>
                        <form onSubmit={submitBrokenReport} className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button type="button" onClick={() => setReportType('broken')} className={`py-3 text-xs font-bold uppercase tracking-wider rounded-sm border cursor-pointer ${reportType === 'broken' ? 'bg-black text-[#EAD64D] border-black' : 'bg-white text-black border-gray-300'}`}>🔧 Broken / Damaged</button>
                                <button type="button" onClick={() => setReportType('stock')} className={`py-3 text-xs font-bold uppercase tracking-wider rounded-sm border cursor-pointer ${reportType === 'stock' ? 'bg-black text-[#EAD64D] border-black' : 'bg-white text-black border-gray-300'}`}>⚠️ Low Stock</button>
                            </div>
                            {reportType && (
                                <>
                                    <InventorySuggest
                                        items={items}
                                        value={reportWhat}
                                        itemId={reportItemId}
                                        finished={reportFinished}
                                        placeholder={reportType === 'stock' ? 'What is running low' : 'What is broken'}
                                        onChange={({ text, itemId, inInventory, finished }) => {
                                            setReportWhat(text);
                                            setReportItemId(itemId);
                                            setReportInInventory(inInventory);
                                            setReportFinished(Boolean(finished));
                                        }}
                                    />
                                    <input required value={reportWhere} onChange={(event) => setReportWhere(event.target.value)} placeholder="Where" className="w-full p-3 border border-gray-300 text-xs rounded-sm" />
                                    <textarea required value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder={reportType === 'stock' ? 'e.g. Only 2 left, paper out, batteries needed...' : 'e.g. Screen flickering, cable frayed, missing part...'} className="w-full p-3 border border-gray-300 text-xs rounded-sm h-24" />
                                    <button type="submit" disabled={reportBusy} className="w-full bg-black text-white font-bold text-xs uppercase py-3 rounded-sm hover:bg-[#EAD64D] hover:text-black cursor-pointer disabled:bg-neutral-200 disabled:text-neutral-500">
                                        {reportBusy ? 'Sending...' : 'Send report'}
                                    </button>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function Page() {
    return <Gate level="account"><InventoryPage /></Gate>;
}