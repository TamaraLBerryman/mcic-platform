'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db, storage } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import {
    Search,
    Edit3,
    Upload,
    X,
    Check,
    Grid,
    List,
    Filter,
    Image as ImageIcon,
    Loader2,
    RotateCcw,
    BarChart3,
    ChevronDown,
    ChevronRight,
    Users,
    Box
} from 'lucide-react';

// Helper function to return owner chip styles
const getOwnerChipStyle = (groupName = '', userGroup = '', name = '') => {
    const value = (groupName || userGroup || name || '').toLowerCase().trim();

    if (!value || value === 'free' || value === 'unallocated' || value === 'other') {
        return null;
    }
    if (value.includes('club') || value.includes('society') || value.includes('create') || value.includes('bikeology') || value.includes('ramsoc') || value.includes('dessoc') || value.includes('pcsoc') || value.includes('enactus') || value.includes('ted-x') || value.includes('digisoc')) {
        return 'bg-blue-600 text-white';
    }
    if (value.includes('makerspace')) {
        return 'bg-purple-600 text-white';
    }
    if (value.includes('tamara')) {
        return 'bg-pink-500 text-white';
    }
    if (value.includes('georgia')) {
        return 'bg-blue-900 text-white';
    }
    if (value.includes('10x')) {
        return 'bg-green-500 text-white';
    }
    if (value.includes('maddy')) {
        return 'bg-orange-500 text-white';
    }
    if (value.includes('eir') || value.includes('entrepreneur')) {
        return 'bg-red-600 text-white';
    }
    if (value.includes('spare') || value.includes('unsw founders') || value.includes('founders')) {
        return 'bg-yellow-400 text-black';
    }
    return 'bg-neutral-700 text-white';
};

// Helper function to format date for <input type="date" /> (YYYY-MM-DD)
const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return '';
};

export default function LockerManagementPage() {
    const [lockers, setLockers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table' | 'analytics'
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [groupFilter, setGroupFilter] = useState('All');
    const [selectedLocker, setSelectedLocker] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState(null);
    const [showClubDetails, setShowClubDetails] = useState(true);

    // 1. FETCH LIVE DATA FROM FIRESTORE
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'lockers'), (snapshot) => {
            const lockerData = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            }));
            lockerData.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
            setLockers(lockerData);
            setLoading(false);
        }, (error) => {
            console.error('Error listening to Firestore lockers:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Filtered lockers
    const filteredLockers = useMemo(() => {
        return lockers.filter(locker => {
            const matchesSearch =
                (locker.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (locker.groupName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (locker.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (locker.items || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (locker.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (locker.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (locker.lastContacted || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (locker.passcode || '').toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === 'All' || locker.status === statusFilter;

            const ownerVal = (locker.groupName || locker.userGroup || locker.name || '').toLowerCase().trim();
            let matchesGroup = groupFilter === 'All';

            if (groupFilter === 'Club/Society') {
                matchesGroup = ownerVal.includes('club') || ownerVal.includes('society') || ownerVal.includes('create') || ownerVal.includes('bikeology') || ownerVal.includes('ramsoc') || ownerVal.includes('dessoc') || ownerVal.includes('pcsoc') || ownerVal.includes('enactus') || ownerVal.includes('ted-x') || ownerVal.includes('digisoc');
            } else if (groupFilter === 'Makerspace') {
                matchesGroup = ownerVal.includes('makerspace');
            } else if (groupFilter === 'Tamara') {
                matchesGroup = ownerVal.includes('tamara');
            } else if (groupFilter === 'Georgia') {
                matchesGroup = ownerVal.includes('georgia');
            } else if (groupFilter === '10x Team') {
                matchesGroup = ownerVal.includes('10x');
            } else if (groupFilter === 'Maddy') {
                matchesGroup = ownerVal.includes('maddy');
            } else if (groupFilter === 'Entrepreneurs in Residence') {
                matchesGroup = ownerVal.includes('eir') || ownerVal.includes('entrepreneur');
            } else if (groupFilter === 'UNSW Founders Spare') {
                matchesGroup = ownerVal.includes('spare') || ownerVal.includes('unsw founders') || ownerVal.includes('founders');
            } else if (groupFilter === 'Other') {
                matchesGroup = ownerVal !== '' && !['club', 'society', 'create', 'bikeology', 'ramsoc', 'dessoc', 'pcsoc', 'enactus', 'ted-x', 'digisoc', 'makerspace', 'tamara', 'georgia', '10x', 'maddy', 'eir', 'entrepreneur', 'spare', 'unsw founders', 'founders'].some(k => ownerVal.includes(k));
            }

            return matchesSearch && matchesStatus && matchesGroup;
        });
    }, [lockers, searchQuery, statusFilter, groupFilter]);

    // Enhanced Group & Status Hierarchy Calculation
    const lockerStats = useMemo(() => {
        const total = lockers.length || 150;
        const freeCount = lockers.filter(l => l.status === 'Free').length;
        const inUseCount = lockers.filter(l => l.status === 'In Use').length;

        const sizeCounts = {
            Large: { total: 0, free: 0, inUse: 0 },
            Medium: { total: 0, free: 0, inUse: 0 },
            Small: { total: 0, free: 0, inUse: 0 }
        };

        const createEmptyGroupObj = (label) => ({
            label,
            total: 0,
            inUse: { total: 0, large: 0, medium: 0, small: 0 },
            free: { total: 0, large: 0, medium: 0, small: 0 }
        });

        const groups = {
            tamara: createEmptyGroupObj('Tamara'),
            maddy: createEmptyGroupObj('Maddy'),
            georgia: createEmptyGroupObj('Georgia'),
            makerspace: createEmptyGroupObj('Makerspace'),
            tenX: createEmptyGroupObj('10x Team'),
            eir: createEmptyGroupObj('Entrepreneurs in Residence'),
            foundersSpare: createEmptyGroupObj('UNSW Founders Spare'),
            other: createEmptyGroupObj('Other / Custom')
        };

        const clubsCombined = createEmptyGroupObj('All Clubs & Societies');

        const clubBreakdown = {
            'Create': createEmptyGroupObj('Create'),
            'Bikeology': createEmptyGroupObj('Bikeology'),
            'RamSoc': createEmptyGroupObj('RamSoc'),
            'TED-x Society': createEmptyGroupObj('TED-x Society'),
            'PCSoc': createEmptyGroupObj('PCSoc'),
            'Enactus': createEmptyGroupObj('Enactus'),
            'DESSoc': createEmptyGroupObj('DESSoc'),
            'Other Clubs': createEmptyGroupObj('Other Clubs')
        };

        lockers.forEach(locker => {
            const lockerNum = parseInt(locker.id, 10);
            let lSize = locker.size;
            if (lockerNum <= 90) lSize = 'Large';
            if (!lSize) lSize = 'Small';

            const isFree = locker.status === 'Free';

            if (sizeCounts[lSize]) {
                sizeCounts[lSize].total++;
                sizeCounts[lSize][isFree ? 'free' : 'inUse']++;
            }

            const val = (locker.groupName || locker.userGroup || locker.name || '').toLowerCase().trim();
            if (!val) return;

            const isClub = val.includes('club') || val.includes('society') || val.includes('create') || val.includes('bikeology') || val.includes('ramsoc') || val.includes('dessoc') || val.includes('pcsoc') || val.includes('enactus') || val.includes('ted-x') || val.includes('digisoc');

            const addLockerToObj = (obj) => {
                obj.total++;
                const statusObj = isFree ? obj.free : obj.inUse;
                statusObj.total++;
                if (lSize === 'Large') statusObj.large++;
                else if (lSize === 'Medium') statusObj.medium++;
                else if (lSize === 'Small') statusObj.small++;
            };

            if (isClub) {
                addLockerToObj(clubsCombined);

                let clubKey = 'Other Clubs';
                if (val.includes('create')) clubKey = 'Create';
                else if (val.includes('bikeology')) clubKey = 'Bikeology';
                else if (val.includes('ramsoc')) clubKey = 'RamSoc';
                else if (val.includes('ted-x')) clubKey = 'TED-x Society';
                else if (val.includes('pcsoc')) clubKey = 'PCSoc';
                else if (val.includes('enactus')) clubKey = 'Enactus';
                else if (val.includes('dessoc')) clubKey = 'DESSoc';

                addLockerToObj(clubBreakdown[clubKey]);
                return;
            }

            let targetGroup = null;
            if (val.includes('tamara')) targetGroup = groups.tamara;
            else if (val.includes('maddy')) targetGroup = groups.maddy;
            else if (val.includes('georgia')) targetGroup = groups.georgia;
            else if (val.includes('makerspace')) targetGroup = groups.makerspace;
            else if (val.includes('10x')) targetGroup = groups.tenX;
            else if (val.includes('eir') || val.includes('entrepreneur')) targetGroup = groups.eir;
            else if (val.includes('spare') || val.includes('unsw founders') || val.includes('founders')) targetGroup = groups.foundersSpare;
            else if (val !== 'free' && val !== 'unallocated' && val !== 'other') targetGroup = groups.other;

            if (targetGroup) {
                addLockerToObj(targetGroup);
            }
        });

        return {
            total,
            freeCount,
            freePct: Math.round((freeCount / total) * 100),
            inUseCount,
            inUsePct: Math.round((inUseCount / total) * 100),
            sizeCounts,
            clubsCombined,
            clubBreakdown,
            groups
        };
    }, [lockers]);

    // Open modal for details/editing
    const handleLockerClick = (locker) => {
        setSelectedLocker(locker);
        setEditFormData({ ...locker });
        setIsEditing(false);
    };

    // Save edits
    const handleSave = async () => {
        if (!editFormData) return;
        setSaving(true);

        try {
            let imageUrl = editFormData.img || '';

            if (editFormData.img && editFormData.img.startsWith('data:image')) {
                try {
                    const imageRef = ref(storage, `lockers/${editFormData.id}_${Date.now()}.jpg`);
                    await uploadString(imageRef, editFormData.img, 'data_url');
                    imageUrl = await getDownloadURL(imageRef);
                } catch (imgErr) {
                    console.warn('Storage upload failed, falling back to base64 inline:', imgErr);
                }
            }

            const lockerRef = doc(db, 'lockers', editFormData.id);
            await updateDoc(lockerRef, {
                status: editFormData.status || 'Free',
                passcode: editFormData.passcode || '',
                items: editFormData.items || '',
                userGroup: editFormData.userGroup || 'Other',
                groupName: editFormData.groupName || '',
                otherDetails: editFormData.otherDetails || '',
                name: editFormData.name || '',
                email: editFormData.email || '',
                phone: editFormData.phone || '',
                lastContacted: editFormData.lastContacted || '',
                img: imageUrl,
                updatedAt: serverTimestamp()
            });

            setSelectedLocker(null);
            setEditFormData(null);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update locker in Firebase:', error);
            alert('Failed to save changes to Firebase. Check console for details.');
        } finally {
            setSaving(false);
        }
    };

    // Image Upload handler
    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (file && editFormData) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditFormData({ ...editFormData, img: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    // Layout columns for 3-high grid (001 - 090) and 5-high grid (091 - 150)
    const columns3High = useMemo(() => {
        const cols = [];
        for (let i = 1; i <= 90; i += 3) {
            cols.push(lockers.slice(i - 1, i + 2));
        }
        return cols;
    }, [lockers]);

    const columns5High = useMemo(() => {
        const cols = [];
        for (let i = 91; i <= 150; i += 5) {
            cols.push(lockers.slice(i - 1, i + 4));
        }
        return cols;
    }, [lockers]);

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
                <div className="flex items-center gap-3 bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-black" />
                    <span className="text-sm font-bold text-black">Connecting to Firestore...</span>
                </div>
            </div>
        );
    }

    // Helper component to render Group rows with Free and In Use sub-rows
    const renderGroupRows = (title, data, isClubMaster = false) => {
        if (!data || data.total === 0) return null;
        const totalPct = Math.round((data.total / lockerStats.total) * 100);

        return (
            <React.Fragment key={`grp-block-${title}`}>
                {/* GROUP TITLE HEADER ROW */}
                <tr className={`${isClubMaster ? 'bg-blue-100/80 text-blue-950 font-black' : 'bg-neutral-100/90 text-black font-extrabold'} border-t-2 border-neutral-300 text-xs uppercase tracking-tight`}>
                    <td colSpan={2} className="p-3 border-r border-neutral-300">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">{title}</span>
                            {isClubMaster && (
                                <button
                                    onClick={() => setShowClubDetails(!showClubDetails)}
                                    className="px-2 py-0.5 bg-blue-600 text-white text-[9px] rounded font-bold hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-1"
                                >
                                    {showClubDetails ? 'Collapse Societies ▲' : 'Expand Societies ▼'}
                                </button>
                            )}
                        </div>
                    </td>
                    <td className="p-3 text-center font-mono font-black text-purple-900 bg-purple-50/50 border-r border-neutral-300">
                        {data.inUse.large + data.free.large}
                    </td>
                    <td className="p-3 text-center font-mono font-black text-blue-900 bg-blue-50/50 border-r border-neutral-300">
                        {data.inUse.medium + data.free.medium}
                    </td>
                    <td className="p-3 text-center font-mono font-black text-neutral-800 bg-neutral-100 border-r border-neutral-300">
                        {data.inUse.small + data.free.small}
                    </td>
                    <td className="p-3 text-center font-mono font-black text-sm text-black border-r border-neutral-300">
                        {data.total}
                    </td>
                    <td className="p-3 text-center font-mono text-neutral-600">
                        {totalPct}%
                    </td>
                </tr>

                {/* SUB ROW: IN USE */}
                {data.inUse.total > 0 && (
                    <tr className="hover:bg-neutral-50/80 transition-colors text-xs font-medium">
                        <td className="p-2.5 pl-6 border-r border-neutral-200 text-neutral-400 font-mono text-[10px]"></td>
                        <td className="p-2.5 border-r border-neutral-200 text-neutral-900 font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-neutral-900"></span> In Use
                        </td>
                        <td className="p-2.5 text-center font-mono text-purple-900 bg-purple-50/30 border-r border-neutral-200">{data.inUse.large}</td>
                        <td className="p-2.5 text-center font-mono text-blue-900 bg-blue-50/30 border-r border-neutral-200">{data.inUse.medium}</td>
                        <td className="p-2.5 text-center font-mono text-neutral-700 bg-neutral-50 border-r border-neutral-200">{data.inUse.small}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-black border-r border-neutral-200">{data.inUse.total}</td>
                        <td className="p-2.5 text-center font-mono text-neutral-400 text-[11px]">{Math.round((data.inUse.total / lockerStats.total) * 100)}%</td>
                    </tr>
                )}

                {/* SUB ROW: FREE */}
                {data.free.total > 0 && (
                    <tr className="hover:bg-neutral-50/80 transition-colors text-xs font-medium">
                        <td className="p-2.5 pl-6 border-r border-neutral-200 text-neutral-400 font-mono text-[10px]"></td>
                        <td className="p-2.5 border-r border-neutral-200 text-emerald-800 font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Free
                        </td>
                        <td className="p-2.5 text-center font-mono text-purple-900 bg-purple-50/30 border-r border-neutral-200">{data.free.large}</td>
                        <td className="p-2.5 text-center font-mono text-blue-900 bg-blue-50/30 border-r border-neutral-200">{data.free.medium}</td>
                        <td className="p-2.5 text-center font-mono text-neutral-700 bg-neutral-50 border-r border-neutral-200">{data.free.small}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-emerald-700 border-r border-neutral-200">{data.free.total}</td>
                        <td className="p-2.5 text-center font-mono text-neutral-400 text-[11px]">{Math.round((data.free.total / lockerStats.total) * 100)}%</td>
                    </tr>
                )}
            </React.Fragment>
        );
    };

    return (
        <div className="min-h-screen bg-neutral-50 text-neutral-900 p-6 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* HEADER & 3-WAY VIEW TOGGLE */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
                    <div>
                        <div className="space-y-1">
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-black">
                                Locker Inventory
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wide rounded border transition-all cursor-pointer ${viewMode === 'grid'
                                ? 'bg-black text-white border-black shadow-sm'
                                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                                }`}
                        >
                            <Grid className="w-3.5 h-3.5 inline mr-1.5" /> Grid View
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wide rounded border transition-all cursor-pointer ${viewMode === 'table'
                                ? 'bg-black text-white border-black shadow-sm'
                                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                                }`}
                        >
                            <List className="w-3.5 h-3.5 inline mr-1.5" /> Table View
                        </button>
                        <button
                            onClick={() => setViewMode('analytics')}
                            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wide rounded border transition-all cursor-pointer ${viewMode === 'analytics'
                                ? 'bg-black text-white border-black shadow-sm'
                                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                                }`}
                        >
                            <BarChart3 className="w-3.5 h-3.5 inline mr-1.5" /> Analytics View
                        </button>
                    </div>
                </div>

                {/* VIEW MODE 1: VISUAL PHYSICAL LAYOUT GRID */}
                {viewMode === 'grid' && (
                    <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm overflow-x-auto relative space-y-6">
                        {/* UNIFIED HEADER & FILTER TOOLBAR INSIDE STORAGE BANK SECTION */}
                        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md pb-4 border-b border-neutral-200 space-y-3">
                            {/* HEADER TITLE */}
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-black text-black">Lockers 001 – 150</h2>
                                <div className="text-[11px] text-neutral-500 font-medium">
                                    Showing <span className="font-bold text-black">{filteredLockers.length}</span> / {lockers.length}
                                </div>
                            </div>

                            {/* UNIFIED CONTROLS: SEARCH + INTERACTIVE STATUS BUTTONS */}
                            <div className="flex flex-wrap items-center gap-3 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                                {/* Search Input */}
                                <div className="relative flex-1 min-w-[220px]">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                                    <input
                                        type="text"
                                        placeholder="Search locker #, items, owner, email, or phone..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white border border-neutral-200 rounded-md pl-9 pr-4 py-1.5 text-xs text-black placeholder-neutral-400 focus:outline-none focus:border-black transition-all"
                                    />
                                </div>

                                {/* Interactive Clickable Status Filter Buttons */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] text-neutral-500 font-black uppercase mr-1">Status:</span>

                                    {/* ALL */}
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('All')}
                                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${statusFilter === 'All'
                                            ? 'bg-black text-white shadow-xs'
                                            : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                                            }`}
                                    >
                                        All
                                    </button>

                                    {/* FREE */}
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter(statusFilter === 'Free' ? 'All' : 'Free')}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer border ${statusFilter === 'Free'
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400/20 shadow-xs'
                                            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                                            }`}
                                    >
                                        <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-400 inline-block" />
                                        <span>Free</span>
                                    </button>

                                    {/* IN USE */}
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter(statusFilter === 'In Use' ? 'All' : 'In Use')}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer border ${statusFilter === 'In Use'
                                            ? 'bg-neutral-900 text-white border-neutral-900 ring-2 ring-neutral-900/20 shadow-xs'
                                            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                                            }`}
                                    >
                                        <span className="w-2.5 h-2.5 rounded bg-neutral-900 inline-block" />
                                        <span>In Use</span>
                                    </button>
                                </div>

                                {/* Clear Filter Button */}
                                {(groupFilter !== 'All' || statusFilter !== 'All' || searchQuery !== '') && (
                                    <button
                                        onClick={() => {
                                            setGroupFilter('All');
                                            setStatusFilter('All');
                                            setSearchQuery('');
                                        }}
                                        className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1.5 rounded transition-all cursor-pointer ml-auto sm:ml-0"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Clear
                                    </button>
                                )}
                            </div>

                            {/* INTERACTIVE CLICKABLE GROUP LEGEND KEY */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[9px] text-neutral-400 font-mono font-bold uppercase mr-1">FILTER BY GROUP:</span>
                                <button
                                    onClick={() => setGroupFilter('All')}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${groupFilter === 'All' ? 'bg-black text-white shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setGroupFilter(groupFilter === 'Club/Society' ? 'All' : 'Club/Society')}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${groupFilter === 'Club/Society' ? 'ring-2 ring-black scale-105 shadow-md' : 'opacity-85 hover:opacity-100'} bg-blue-600 text-white`}
                                >
                                    Club / Society
                                </button>
                                <button
                                    onClick={() => setGroupFilter(groupFilter === 'Makerspace' ? 'All' : 'Makerspace')}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${groupFilter === 'Makerspace' ? 'ring-2 ring-black scale-105 shadow-md' : 'opacity-85 hover:opacity-100'} bg-purple-600 text-white`}
                                >
                                    Makerspace
                                </button>
                                <button
                                    onClick={() => setGroupFilter(groupFilter === 'Tamara' ? 'All' : 'Tamara')}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${groupFilter === 'Tamara' ? 'ring-2 ring-black scale-105 shadow-md' : 'opacity-85 hover:opacity-100'} bg-pink-500 text-white`}
                                >
                                    Tamara
                                </button>
                                <button
                                    onClick={() => setGroupFilter(groupFilter === 'Georgia' ? 'All' : 'Georgia')}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${groupFilter === 'Georgia' ? 'ring-2 ring-black scale-105 shadow-md' : 'opacity-85 hover:opacity-100'} bg-blue-900 text-white`}
                                >
                                    Georgia
                                </button>
                                <button
                                    onClick={() => setGroupFilter(groupFilter === 'Maddy' ? 'All' : 'Maddy')}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${groupFilter === 'Maddy' ? 'ring-2 ring-black scale-105 shadow-md' : 'opacity-85 hover:opacity-100'} bg-orange-500 text-white`}
                                >
                                    Maddy
                                </button>
                                <button
                                    onClick={() => setGroupFilter(groupFilter === '10x Team' ? 'All' : '10x Team')}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${groupFilter === '10x Team' ? 'ring-2 ring-black scale-105 shadow-md' : 'opacity-85 hover:opacity-100'} bg-green-500 text-white`}
                                >
                                    10x Team
                                </button>
                                <button
                                    onClick={() => setGroupFilter(groupFilter === 'Entrepreneurs in Residence' ? 'All' : 'Entrepreneurs in Residence')}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${groupFilter === 'Entrepreneurs in Residence' ? 'ring-2 ring-black scale-105 shadow-md' : 'opacity-85 hover:opacity-100'} bg-red-600 text-white`}
                                >
                                    Entrepreneurs in Residence
                                </button>
                                <button
                                    onClick={() => setGroupFilter(groupFilter === 'UNSW Founders Spare' ? 'All' : 'UNSW Founders Spare')}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${groupFilter === 'UNSW Founders Spare' ? 'ring-2 ring-black scale-105 shadow-md' : 'opacity-85 hover:opacity-100'} bg-yellow-400 text-black`}
                                >
                                    UNSW Founders Spare
                                </button>
                                <button
                                    onClick={() => setGroupFilter(groupFilter === 'Other' ? 'All' : 'Other')}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${groupFilter === 'Other' ? 'ring-2 ring-black scale-105 shadow-md' : 'opacity-85 hover:opacity-100'} bg-neutral-700 text-white`}
                                >
                                    Other
                                </button>
                            </div>
                        </div>

                        {/* SINGLE HORIZONTAL BANK WITH PHYSICAL AISLE SEPARATORS */}
                        <div className="flex gap-2.5 min-w-max pb-3 items-stretch">
                            {/* LARGE LOCKER BANK COLUMNS (001 - 090: 3 HIGH) */}
                            {columns3High.map((col, colIdx) => {
                                const showAisleGap = colIdx === 5 || colIdx === 11 || colIdx === 17 || colIdx === 23 || colIdx === 29;

                                return (
                                    <React.Fragment key={`col-3-frag-${colIdx}`}>
                                        <div className="flex flex-col gap-2.5 w-40 h-[720px]">
                                            {col.map(locker => {
                                                const isFilteredOut = !filteredLockers.some(f => f.id === locker.id);
                                                const chipStyle = getOwnerChipStyle(locker.groupName, locker.userGroup, locker.name);
                                                const rawOwner = locker.groupName || locker.userGroup || locker.name || '';
                                                const ownerText = rawOwner.toLowerCase() !== 'other' && rawOwner.toLowerCase() !== 'free' ? rawOwner : '';

                                                return (
                                                    <button
                                                        key={locker.id}
                                                        onClick={() => handleLockerClick(locker)}
                                                        className={`h-1/3 rounded-md border p-2 flex flex-col justify-between text-left transition-all relative overflow-hidden group cursor-pointer ${isFilteredOut ? 'opacity-20 pointer-events-none' : 'hover:border-black hover:shadow-lg'
                                                            } ${locker.status === 'Free'
                                                                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                                                                : 'bg-neutral-900 border-neutral-900 text-white'
                                                            }`}
                                                    >
                                                        {/* Header */}
                                                        <div className="flex items-center justify-between z-10 w-full gap-1">
                                                            <div className="flex items-center gap-1">
                                                                <span className={`font-mono text-xs font-black ${locker.status === 'Free' ? 'text-black' : 'text-white'}`}>
                                                                    {locker.id}
                                                                </span>
                                                                {locker.status === 'Free' ? (
                                                                    <span className="text-[7px] bg-emerald-200 text-emerald-900 font-black px-1 py-0.2 rounded uppercase shrink-0">FREE</span>
                                                                ) : (
                                                                    <span className="text-[7px] bg-neutral-800 text-white font-black px-1 py-0.2 rounded uppercase shrink-0">IN USE</span>
                                                                )}
                                                            </div>

                                                            {chipStyle && ownerText && (
                                                                <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded truncate max-w-[65px] ${chipStyle}`}>
                                                                    {ownerText}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Image + Items Description Together */}
                                                        <div className="flex flex-col gap-1 my-1 overflow-hidden">
                                                            {locker.img && (
                                                                <div className="w-full h-20 relative rounded overflow-hidden border border-neutral-700/50 bg-black flex items-center justify-center shrink-0">
                                                                    <img
                                                                        src={locker.img}
                                                                        alt={`Locker ${locker.id}`}
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                                    />
                                                                </div>
                                                            )}
                                                            {locker.items && (
                                                                <p className={`text-[9px] line-clamp-2 leading-tight ${locker.status === 'Free' ? 'text-neutral-600' : 'text-neutral-300'}`}>
                                                                    {locker.items}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Footer Pin Code */}
                                                        <div className="text-[8px] font-mono text-neutral-400 truncate z-10 flex items-center justify-between">
                                                            <span>{locker.passcode ? `🔑 ${locker.passcode}` : 'No Lock'}</span>
                                                            {locker.img && <span className="text-[8px] opacity-75">📷 Photo</span>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {showAisleGap && (
                                            <div className="flex items-center justify-center px-3">
                                                <div className="w-[3px] h-full bg-black rounded-full my-0.5 opacity-80"></div>
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}

                            {/* MULTI-SIZE LOCKER BANK COLUMNS (091 - 150: 5 HIGH) */}
                            {columns5High.map((col, colIdx) => (
                                <div key={`col-5-${colIdx}`} className="flex flex-col gap-2 w-40 h-[720px]">
                                    {col.map(locker => {
                                        const isFilteredOut = !filteredLockers.some(f => f.id === locker.id);
                                        const isMedium = locker.size === 'Medium';
                                        const chipStyle = getOwnerChipStyle(locker.groupName, locker.userGroup, locker.name);
                                        const rawOwner = locker.groupName || locker.userGroup || locker.name || '';
                                        const ownerText = rawOwner.toLowerCase() !== 'other' && rawOwner.toLowerCase() !== 'free' ? rawOwner : '';

                                        return (
                                            <button
                                                key={locker.id}
                                                onClick={() => handleLockerClick(locker)}
                                                className={`rounded-md border p-1.5 flex flex-col justify-between text-left transition-all relative overflow-hidden group cursor-pointer ${isMedium ? 'h-[175px]' : 'h-[125px]'
                                                    } ${isFilteredOut ? 'opacity-20 pointer-events-none' : 'hover:border-black hover:shadow-lg'
                                                    } ${locker.status === 'Free'
                                                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                                                        : 'bg-neutral-900 border-neutral-900 text-white'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between z-10 w-full gap-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className={`font-mono text-[11px] font-black ${locker.status === 'Free' ? 'text-black' : 'text-white'}`}>
                                                            {locker.id}
                                                        </span>
                                                        {locker.status === 'Free' ? (
                                                            <span className="text-[6px] bg-emerald-200 text-emerald-900 font-black px-1 py-0.2 rounded uppercase shrink-0">FREE</span>
                                                        ) : (
                                                            <span className="text-[6px] bg-neutral-800 text-white font-black px-1 py-0.2 rounded uppercase shrink-0">IN USE</span>
                                                        )}
                                                    </div>

                                                    {chipStyle && ownerText && (
                                                        <span className={`text-[6px] font-bold px-1 py-0.2 rounded truncate max-w-[55px] ${chipStyle}`}>
                                                            {ownerText}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-0.5 my-0.5 overflow-hidden">
                                                    {locker.img && (
                                                        <div className={`w-full ${isMedium ? 'h-16' : 'h-10'} relative rounded overflow-hidden border border-neutral-700/50 bg-black flex items-center justify-center shrink-0`}>
                                                            <img
                                                                src={locker.img}
                                                                alt={`Locker ${locker.id}`}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                            />
                                                        </div>
                                                    )}
                                                    {locker.items && (
                                                        <p className={`text-[8px] line-clamp-2 leading-tight ${locker.status === 'Free' ? 'text-neutral-600' : 'text-neutral-300'}`}>
                                                            {locker.items}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="text-[8px] font-mono text-neutral-400 truncate z-10">
                                                    {locker.passcode ? `🔑 ${locker.passcode}` : ''}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* VIEW MODE 2: DATA TABLE */}
                {viewMode === 'table' && (
                    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-neutral-700 min-w-max border-collapse">
                                <thead className="bg-neutral-100 text-black uppercase font-black tracking-wider border-b border-neutral-200 text-[10px]">
                                    <tr>
                                        <th className="p-3 whitespace-nowrap">Column / Bank</th>
                                        <th className="p-3 whitespace-nowrap">Locker #</th>
                                        <th className="p-3 whitespace-nowrap">Status</th>
                                        <th className="p-3 whitespace-nowrap">Size</th>
                                        <th className="p-3 whitespace-nowrap">Passcode</th>
                                        <th className="p-3 whitespace-nowrap">Items / Contents</th>
                                        <th className="p-3 whitespace-nowrap">Group / Owner</th>
                                        <th className="p-3 whitespace-nowrap">Contact Email</th>
                                        <th className="p-3 whitespace-nowrap">Phone</th>
                                        <th className="p-3 whitespace-nowrap">Last Contacted</th>
                                        <th className="p-3 text-right whitespace-nowrap">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {filteredLockers.map((locker) => {
                                        const lockerNum = parseInt(locker.id, 10);
                                        const chipStyle = getOwnerChipStyle(locker.groupName, locker.userGroup, locker.name);
                                        const rawOwner = locker.groupName || locker.userGroup || locker.name || '';
                                        const ownerText = rawOwner.toLowerCase() !== 'other' && rawOwner.toLowerCase() !== 'free' ? rawOwner : '';

                                        let colNum = 0;
                                        let isFirstInCol = false;
                                        let colSpanHeight = 1;

                                        if (lockerNum <= 90) {
                                            colNum = Math.ceil(lockerNum / 3);
                                            isFirstInCol = (lockerNum - 1) % 3 === 0;
                                            colSpanHeight = 3;
                                        } else {
                                            colNum = 30 + Math.ceil((lockerNum - 90) / 5);
                                            isFirstInCol = (lockerNum - 91) % 5 === 0;
                                            colSpanHeight = 5;
                                        }

                                        const showSectionDivider = isFirstInCol && (colNum === 1 || colNum === 7 || colNum === 13 || colNum === 19 || colNum === 25 || colNum === 31);

                                        return (
                                            <React.Fragment key={`table-row-${locker.id}`}>
                                                {showSectionDivider && (
                                                    <tr className="bg-neutral-900 text-white font-mono text-[10px] font-bold uppercase tracking-widest">
                                                        <td colSpan={11} className="px-3 py-1.5 bg-neutral-900 text-[#EAD64D]">
                                                        </td>
                                                    </tr>
                                                )}

                                                <tr
                                                    onClick={() => handleLockerClick(locker)}
                                                    className="hover:bg-neutral-100 transition-colors cursor-pointer group"
                                                >
                                                    {isFirstInCol ? (
                                                        <td
                                                            rowSpan={colSpanHeight}
                                                            className="p-3 bg-neutral-50 font-mono text-[11px] font-black text-black border-r border-neutral-200 text-center vertical-middle align-middle select-none"
                                                        >
                                                            <div className="flex flex-col items-center justify-center gap-0.5">
                                                                <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">COL</span>
                                                                <span className="text-sm font-black text-black">{colNum}</span>
                                                                <span className="text-[8px] text-neutral-500 font-normal">
                                                                    ({colNum <= 30 ? `${String((colNum - 1) * 3 + 1).padStart(3, '0')}-${String(colNum * 3).padStart(3, '0')}` : `${String(91 + (colNum - 31) * 5).padStart(3, '0')}-${String(90 + (colNum - 30) * 5).padStart(3, '0')}`})
                                                                </span>
                                                            </div>
                                                        </td>
                                                    ) : null}

                                                    <td className="p-3 font-mono font-black text-black whitespace-nowrap">{locker.id}</td>
                                                    <td className="p-3 whitespace-nowrap">
                                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${locker.status === 'Free' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-900 text-white'
                                                            }`}>
                                                            {locker.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 font-medium whitespace-nowrap">{locker.size || (lockerNum <= 90 ? 'Large' : 'Small')}</td>
                                                    <td className="p-3 font-mono text-neutral-500 whitespace-nowrap">{locker.passcode || '-'}</td>
                                                    <td className="p-3 max-w-xs truncate font-medium whitespace-nowrap flex items-center gap-2">
                                                        {locker.img && (
                                                            <span className="text-[10px] bg-neutral-200 px-1 py-0.5 rounded font-bold text-neutral-700 shrink-0">
                                                                📷 Photo
                                                            </span>
                                                        )}
                                                        <span className="truncate">{locker.items || ''}</span>
                                                    </td>
                                                    <td className="p-3 font-bold whitespace-nowrap">
                                                        {chipStyle && ownerText ? (
                                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${chipStyle}`}>
                                                                {ownerText}
                                                            </span>
                                                        ) : ''}
                                                    </td>
                                                    <td className="p-3 text-neutral-500 whitespace-nowrap">{locker.email || '-'}</td>
                                                    <td className="p-3 text-neutral-500 font-mono whitespace-nowrap">{locker.phone || '-'}</td>
                                                    <td className="p-3 text-neutral-500 whitespace-nowrap">{locker.lastContacted || '-'}</td>
                                                    <td className="p-3 text-right whitespace-nowrap">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleLockerClick(locker);
                                                            }}
                                                            className="px-2.5 py-1 bg-white group-hover:bg-black group-hover:text-white rounded border border-neutral-300 text-xs font-bold transition-all shadow-sm whitespace-nowrap cursor-pointer"
                                                        >
                                                            Details / Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* VIEW MODE 3: HIERARCHICAL ANALYTICS VIEW (GROUP -> STATUS -> SIZE) */}
                {viewMode === 'analytics' && (
                    <div className="space-y-6">
                        {/* Card 1: Overall Locker Availability */}
                        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-sm flex flex-col justify-between space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                                        Locker Availability
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                        {lockerStats.freePct}% Free
                                    </span>
                                </div>

                                <div className="flex items-baseline space-x-2 mt-2">
                                    <span className="text-4xl font-black text-neutral-900 font-mono tracking-tight">
                                        {lockerStats.freeCount}
                                    </span>
                                    <span className="text-sm font-medium text-neutral-500">
                                        available lockers
                                    </span>
                                </div>
                            </div>

                            {/* Stacked Progress Bar & Explicit Visual Legend */}
                            <div className="space-y-2 pt-1">
                                {/* Multi-segment visual bar */}
                                <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden flex">
                                    {/* Occupied Portion (In Use) */}
                                    <div
                                        className="bg-amber-500 h-full transition-all duration-500"
                                        style={{ width: `${lockerStats.inUsePct}%` }}
                                        title={`${lockerStats.inUseCount} In Use`}
                                    />
                                    {/* Free Portion (Available) */}
                                    <div
                                        className="bg-emerald-500 h-full transition-all duration-500"
                                        style={{ width: `${lockerStats.freePct}%` }}
                                        title={`${lockerStats.freeCount} Free`}
                                    />
                                </div>

                                {/* Clear Color-Coded Legend */}
                                <div className="flex items-center justify-between text-[11px] font-medium text-neutral-600">
                                    <div className="flex items-center space-x-3">
                                        <span className="flex items-center space-x-1">
                                            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                            <span>{lockerStats.inUseCount} In Use ({lockerStats.inUsePct}%)</span>
                                        </span>
                                        <span className="flex items-center space-x-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                            <span className="font-semibold text-emerald-700">{lockerStats.freeCount} Free ({lockerStats.freePct}%)</span>
                                        </span>
                                    </div>
                                    <span className="text-neutral-400 font-semibold">Total: {lockerStats.freeCount + lockerStats.inUseCount}</span>
                                </div>
                            </div>


                            {/* Card 2: Available by Size */}
                            <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-sm flex flex-col justify-between space-y-3">
                                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                                    Available by Size
                                </span>

                                <div className="grid grid-cols-3 gap-3">
                                    {/* Large Size */}
                                    <div className="bg-neutral-50/80 border border-neutral-100 rounded-lg p-3 text-center flex flex-col justify-between">
                                        <div>
                                            <span className="text-2xl font-black text-purple-950 font-mono block">
                                                {lockerStats.sizeCounts.Large.free}
                                            </span>
                                            <span className="inline-block px-1.5 py-0.5 mt-1 rounded text-[10px] font-extrabold text-purple-700 bg-purple-100/70 uppercase">
                                                Large
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-medium text-neutral-400 mt-2 block">
                                            of {lockerStats.sizeCounts.Large.total} total
                                        </span>
                                    </div>

                                    {/* Medium Size */}
                                    <div className="bg-neutral-50/80 border border-neutral-100 rounded-lg p-3 text-center flex flex-col justify-between">
                                        <div>
                                            <span className="text-2xl font-black text-blue-950 font-mono block">
                                                {lockerStats.sizeCounts.Medium.free}
                                            </span>
                                            <span className="inline-block px-1.5 py-0.5 mt-1 rounded text-[10px] font-extrabold text-blue-700 bg-blue-100/70 uppercase">
                                                Medium
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-medium text-neutral-400 mt-2 block">
                                            of {lockerStats.sizeCounts.Medium.total} total
                                        </span>
                                    </div>

                                    {/* Small Size */}
                                    <div className="bg-neutral-50/80 border border-neutral-100 rounded-lg p-3 text-center flex flex-col justify-between">
                                        <div>
                                            <span className="text-2xl font-black text-neutral-900 font-mono block">
                                                {lockerStats.sizeCounts.Small.free}
                                            </span>
                                            <span className="inline-block px-1.5 py-0.5 mt-1 rounded text-[10px] font-extrabold text-neutral-700 bg-neutral-200/70 uppercase">
                                                Small
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-medium text-neutral-400 mt-2 block">
                                            of {lockerStats.sizeCounts.Small.total} total
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. MAIN HIERARCHICAL TABLE (GROUP -> STATUS -> SIZE) */}
                        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-neutral-200 bg-neutral-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-base font-black text-black uppercase tracking-tight">Group Allocation & Status Breakdown</h2>
                                    <p className="text-xs text-neutral-500 mt-0.5">
                                        Structured view detailing In Use vs Free locker sizes for every owner group.
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-neutral-900 text-white font-black uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="p-3 w-10"></th>
                                            <th className="p-3">Group Category / Status</th>
                                            <th className="p-3 text-center bg-purple-900 text-purple-200 w-24">Large (001–090)</th>
                                            <th className="p-3 text-center bg-blue-900 text-blue-200 w-24">Medium</th>
                                            <th className="p-3 text-center bg-neutral-800 text-neutral-300 w-24">Small</th>
                                            <th className="p-3 text-center w-28">Total Lockers</th>
                                            <th className="p-3 text-center w-24">% Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200">
                                        {/* 1. CLUBS & SOCIETIES SECTION */}
                                        {renderGroupRows('Clubs & Societies (Combined)', lockerStats.clubsCombined, true)}

                                        {/* INDIVIDUAL CLUBS BREAKDOWN IF EXPANDED */}
                                        {showClubDetails && Object.entries(lockerStats.clubBreakdown).map(([clubName, clubData]) => (
                                            renderGroupRows(` ${clubName}`, clubData)
                                        ))}

                                        {/* 2. TAMARA */}
                                        {renderGroupRows('Tamara', lockerStats.groups.tamara)}

                                        {/* 3. MADDY */}
                                        {renderGroupRows('Maddy', lockerStats.groups.maddy)}

                                        {/* 4. GEORGIA */}
                                        {renderGroupRows('Georgia', lockerStats.groups.georgia)}

                                        {/* 5. MAKERSPACE */}
                                        {renderGroupRows('Makerspace', lockerStats.groups.makerspace)}

                                        {/* 6. 10X TEAM */}
                                        {renderGroupRows('10x Team', lockerStats.groups.tenX)}

                                        {/* 7. ENTREPRENEURS IN RESIDENCE */}
                                        {renderGroupRows('Entrepreneurs in Residence', lockerStats.groups.eir)}

                                        {/* 8. UNSW FOUNDERS SPARE */}
                                        {renderGroupRows('UNSW Founders Spare', lockerStats.groups.foundersSpare)}

                                        {/* 9. OTHER / CUSTOM */}
                                        {renderGroupRows('Other / Custom', lockerStats.groups.other)}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-black text-white font-black text-xs border-t-2 border-black">
                                            <td colSpan={2} className="p-3 uppercase tracking-wider">SYSTEM SUMMARY TOTALS</td>
                                            <td className="p-3 text-center font-mono text-purple-300">{lockerStats.sizeCounts.Large.total}</td>
                                            <td className="p-3 text-center font-mono text-blue-300">{lockerStats.sizeCounts.Medium.total}</td>
                                            <td className="p-3 text-center font-mono text-neutral-300">{lockerStats.sizeCounts.Small.total}</td>
                                            <td className="p-3 text-center font-mono text-base">{lockerStats.total}</td>
                                            <td className="p-3 text-center font-mono">100%</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* DETAIL & EDIT MODAL (CLICK BACKDROP TO CLOSE) */}
            {
                selectedLocker && editFormData && (
                    <div
                        onClick={() => setSelectedLocker(null)}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white border border-neutral-200 rounded-lg max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] cursor-default"
                        >
                            {/* Modal Header */}
                            <div className="p-5 bg-neutral-900 text-white flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-2xl font-black bg-white text-black px-3 py-1 rounded-sm">
                                        {editFormData.id}
                                    </span>
                                    <div>
                                        <h3 className="text-lg font-bold">Locker Details & Inventory</h3>
                                        <p className="text-xs text-neutral-400">Size: {editFormData.size || (parseInt(editFormData.id, 10) <= 90 ? 'Large' : 'Small')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedLocker(null)}
                                    className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 overflow-y-auto space-y-6 bg-white">
                                {!isEditing ? (
                                    /* VIEW MODE */
                                    <div className="space-y-6">
                                        {selectedLocker.img ? (
                                            <div className="w-full max-h-[400px] rounded-lg overflow-hidden border border-neutral-200 bg-neutral-950 flex items-center justify-center p-2">
                                                <img
                                                    src={selectedLocker.img}
                                                    alt={`Locker ${selectedLocker.id} full photo`}
                                                    className="max-h-[380px] w-auto object-contain rounded"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-36 bg-neutral-50 border border-dashed border-neutral-300 rounded-md flex flex-col items-center justify-center text-neutral-400 text-xs">
                                                <ImageIcon className="w-8 h-8 mb-2 opacity-30" />
                                                No inventory image uploaded
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-md border border-neutral-200">
                                            <div>
                                                <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider">Status</span>
                                                <p className="text-sm font-bold text-black mt-0.5">{selectedLocker.status}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider">Passcode / Lock</span>
                                                <p className="text-sm font-mono font-bold text-black mt-0.5">{selectedLocker.passcode || '-'}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider">Items / Inventory Content</span>
                                                <p className="text-sm text-neutral-800 font-medium mt-0.5">{selectedLocker.items || '-'}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 border-t border-neutral-200 pt-4">
                                            <h4 className="text-xs font-black text-black uppercase tracking-wider">Ownership & Contact</h4>
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div>
                                                    <span className="text-neutral-500 font-medium">Group / Owner:</span>{' '}
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getOwnerChipStyle(selectedLocker.groupName, selectedLocker.userGroup, selectedLocker.name) || 'bg-neutral-200 text-neutral-700'}`}>
                                                        {selectedLocker.groupName || selectedLocker.name || '-'}
                                                    </span>
                                                </div>
                                                {selectedLocker.otherDetails && (
                                                    <div className="col-span-2"><span className="text-neutral-500 font-medium">Other Notes:</span> <span className="text-black font-medium italic">{selectedLocker.otherDetails}</span></div>
                                                )}
                                                <div><span className="text-neutral-500 font-medium">Contact Name:</span> <span className="text-black font-bold">{selectedLocker.name || '-'}</span></div>
                                                <div><span className="text-neutral-500 font-medium">Email:</span> <span className="text-black font-bold">{selectedLocker.email || '-'}</span></div>
                                                <div><span className="text-neutral-500 font-medium">Phone:</span> <span className="text-black font-bold">{selectedLocker.phone || '-'}</span></div>
                                                <div><span className="text-neutral-500 font-medium">Last Contacted:</span> <span className="text-black font-bold">{selectedLocker.lastContacted || '-'}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* EDIT FORM MODE */
                                    <div className="space-y-4 text-xs">
                                        {/* INVENTORY PHOTO UPLOAD */}
                                        <div className="space-y-2">
                                            <label className="text-black font-bold block">Inventory Photo</label>
                                            <div className="flex items-center gap-4">
                                                {editFormData.img && (
                                                    <img src={editFormData.img} alt="Preview" className="w-16 h-16 object-cover rounded border border-neutral-300" />
                                                )}
                                                <label className="cursor-pointer bg-white hover:bg-neutral-100 border border-neutral-300 rounded-md px-3 py-2 text-black font-bold flex items-center gap-2 shadow-sm transition-all">
                                                    <Upload className="w-4 h-4" /> Upload Image
                                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                                </label>
                                            </div>
                                        </div>

                                        {/* STATUS & PASSCODE */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-neutral-500 font-bold block mb-1">Status</label>
                                                <select
                                                    value={editFormData.status || 'In Use'}
                                                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                                                    className="w-full bg-neutral-50 border border-neutral-300 rounded p-2 text-black font-medium focus:outline-none focus:border-black cursor-pointer"
                                                >
                                                    <option value="In Use">In Use</option>
                                                    <option value="Free">Free</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-neutral-500 font-bold block mb-1">Passcode / Lock</label>
                                                <input
                                                    type="text"
                                                    value={editFormData.passcode || ''}
                                                    onChange={(e) => setEditFormData({ ...editFormData, passcode: e.target.value })}
                                                    className="w-full bg-neutral-50 border border-neutral-300 rounded p-2 text-black font-mono focus:outline-none focus:border-black"
                                                    placeholder="e.g. 2021, Key, No Lock"
                                                />
                                            </div>
                                        </div>

                                        {/* ITEMS / INVENTORY CONTENTS */}
                                        <div>
                                            <label className="text-neutral-500 font-bold block mb-1">Items / Inventory Contents</label>
                                            <textarea
                                                rows={3}
                                                value={editFormData.items || ''}
                                                onChange={(e) => setEditFormData({ ...editFormData, items: e.target.value })}
                                                className="w-full bg-neutral-50 border border-neutral-300 rounded p-2 text-black font-medium focus:outline-none focus:border-black"
                                                placeholder="List stored equipment, materials, consumables..."
                                            />
                                        </div>

                                        {/* OWNERSHIP & CONTACT DETAILS */}
                                        <div className="grid grid-cols-2 gap-3 border-t border-neutral-200 pt-3">
                                            {/* GROUP / OWNER NAME DROPDOWN */}
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="text-neutral-500 font-bold block mb-1">Group / Owner Category</label>
                                                <select
                                                    value={
                                                        editFormData.userGroup === 'Club/Society' || editFormData.groupName === 'Club/Society'
                                                            ? 'Club/Society'
                                                            : (editFormData.userGroup === 'Entrepreneurs in Residence' || editFormData.groupName === 'Entrepreneurs in Residence' || editFormData.userGroup === 'EIR')
                                                                ? 'Entrepreneurs in Residence'
                                                                : editFormData.userGroup === 'Other'
                                                                    ? 'Other'
                                                                    : editFormData.groupName || ''
                                                    }
                                                    onChange={(e) => {
                                                        const selectedVal = e.target.value;
                                                        if (selectedVal === 'Club/Society') {
                                                            setEditFormData({
                                                                ...editFormData,
                                                                userGroup: 'Club/Society',
                                                                groupName: editFormData.clubName || 'Club/Society'
                                                            });
                                                        } else if (selectedVal === 'Entrepreneurs in Residence') {
                                                            setEditFormData({
                                                                ...editFormData,
                                                                userGroup: 'Entrepreneurs in Residence',
                                                                groupName: editFormData.eirStartupName || 'Entrepreneurs in Residence'
                                                            });
                                                        } else if (selectedVal === 'Other') {
                                                            setEditFormData({
                                                                ...editFormData,
                                                                userGroup: 'Other',
                                                                groupName: editFormData.customOtherText || editFormData.groupName || 'Other'
                                                            });
                                                        } else {
                                                            setEditFormData({
                                                                ...editFormData,
                                                                userGroup: selectedVal,
                                                                groupName: selectedVal
                                                            });
                                                        }
                                                    }}
                                                    className="w-full bg-neutral-50 border border-neutral-300 rounded p-2 text-black font-medium focus:outline-none focus:border-black cursor-pointer"
                                                >
                                                    <option value="">-- Select Group / Owner --</option>
                                                    <option value="Club/Society">Club / Society</option>
                                                    <option value="Makerspace">Makerspace</option>
                                                    <option value="Tamara">Tamara</option>
                                                    <option value="Georgia">Georgia</option>
                                                    <option value="10x Team">10x Team</option>
                                                    <option value="Maddy">Maddy</option>
                                                    <option value="Entrepreneurs in Residence">Entrepreneurs in Residence</option>
                                                    <option value="UNSW Founders Spare">UNSW Founders Spare</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>

                                            {/* CONDITIONAL SPECIFIC CLUB / SOCIETY NAME TEXTBOX */}
                                            {(editFormData.userGroup === 'Club/Society' || editFormData.groupName === 'Club/Society') && (
                                                <div className="col-span-2 sm:col-span-1">
                                                    <label className="text-blue-600 font-bold block mb-1">Club or Society Name</label>
                                                    <input
                                                        type="text"
                                                        value={editFormData.clubName !== undefined ? editFormData.clubName : (editFormData.groupName && editFormData.groupName !== 'Club/Society' ? editFormData.groupName : '')}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setEditFormData({
                                                                ...editFormData,
                                                                clubName: val,
                                                                groupName: val || 'Club/Society',
                                                                userGroup: 'Club/Society'
                                                            });
                                                        }}
                                                        className="w-full bg-blue-50 border border-blue-300 rounded p-2 text-black font-medium focus:outline-none focus:border-blue-600"
                                                        placeholder="e.g. Create, Bikeology, RamSoc, DESSOC..."
                                                    />
                                                </div>
                                            )}

                                            {/* CONDITIONAL SPECIFIC EIR STARTUP NAME TEXTBOX */}
                                            {(editFormData.userGroup === 'Entrepreneurs in Residence' || editFormData.groupName === 'Entrepreneurs in Residence' || editFormData.userGroup === 'EIR') && (
                                                <div className="col-span-2 sm:col-span-1">
                                                    <label className="text-red-600 font-bold block mb-1">Startup Name (EIR)</label>
                                                    <input
                                                        type="text"
                                                        value={editFormData.eirStartupName !== undefined ? editFormData.eirStartupName : (editFormData.groupName && editFormData.groupName !== 'Entrepreneurs in Residence' ? editFormData.groupName : '')}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setEditFormData({
                                                                ...editFormData,
                                                                eirStartupName: val,
                                                                groupName: val || 'Entrepreneurs in Residence',
                                                                userGroup: 'Entrepreneurs in Residence'
                                                            });
                                                        }}
                                                        className="w-full bg-red-50 border border-red-300 rounded p-2 text-black font-medium focus:outline-none focus:border-red-600"
                                                        placeholder="e.g. Viridescent, Forage, Canopy..."
                                                    />
                                                </div>
                                            )}

                                            {/* CONDITIONAL TEXTBOX WHEN "OTHER" IS SELECTED */}
                                            {editFormData.userGroup === 'Other' && (
                                                <div className="col-span-2 sm:col-span-1">
                                                    <label className="text-neutral-700 font-bold block mb-1">Owner Name / Label (Other)</label>
                                                    <input
                                                        type="text"
                                                        value={editFormData.customOtherText !== undefined ? editFormData.customOtherText : (editFormData.groupName !== 'Other' ? editFormData.groupName : '')}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setEditFormData({
                                                                ...editFormData,
                                                                customOtherText: val,
                                                                groupName: val || 'Other',
                                                                userGroup: 'Other'
                                                            });
                                                        }}
                                                        className="w-full bg-neutral-100 border border-neutral-300 rounded p-2 text-black font-medium focus:outline-none focus:border-black"
                                                        placeholder="e.g. Student etc..."
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <label className="text-neutral-500 font-bold block mb-1">Contact Name</label>
                                                <input
                                                    type="text"
                                                    value={editFormData.name || ''}
                                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                                    className="w-full bg-neutral-50 border border-neutral-300 rounded p-2 text-black font-medium focus:outline-none focus:border-black"
                                                    placeholder="e.g. Jane Doe"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-neutral-500 font-bold block mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    value={editFormData.email || ''}
                                                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                                    className="w-full bg-neutral-50 border border-neutral-300 rounded p-2 text-black font-medium focus:outline-none focus:border-black"
                                                    placeholder="e.g. contact@unsw.edu.au"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-neutral-500 font-bold block mb-1">Phone</label>
                                                <input
                                                    type="text"
                                                    value={editFormData.phone || ''}
                                                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                                    className="w-full bg-neutral-50 border border-neutral-300 rounded p-2 text-black font-medium focus:outline-none focus:border-black"
                                                    placeholder="e.g. 0455322458"
                                                />
                                            </div>

                                            {/* DATE SELECTION INPUT FOR LAST CONTACTED */}
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="text-neutral-500 font-bold block mb-1">Last Contacted</label>
                                                <input
                                                    type="date"
                                                    value={formatDateForInput(editFormData.lastContacted)}
                                                    onChange={(e) => setEditFormData({ ...editFormData, lastContacted: e.target.value })}
                                                    className="w-full bg-neutral-50 border border-neutral-300 rounded p-2 text-black font-medium focus:outline-none focus:border-black cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-between items-center">
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-2 bg-black hover:bg-neutral-800 text-white font-bold rounded flex items-center gap-2 text-xs transition-all shadow-sm cursor-pointer"
                                    >
                                        <Edit3 className="w-4 h-4" /> Edit Inventory & Details
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 ml-auto">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            disabled={saving}
                                            className="px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-black font-bold rounded text-xs transition-all disabled:opacity-50 cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="px-4 py-2 bg-black hover:bg-neutral-800 text-white font-bold rounded flex items-center gap-1.5 text-xs transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-4 h-4" /> Save Changes
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                )
            }
        </div >
    );
}