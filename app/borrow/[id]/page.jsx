"use client";

import { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, deleteField } from 'firebase/firestore';
import { reservationWindows, bookingEquipmentWindows, withItemNames, overlappingQuantity } from '../../lib/inventoryBookings';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { canViewItem, itemAccessLabel, itemAccessLevels } from '../../lib/access';
import { isFoundersBooker } from '../../lib/bookingRules';
import { useAccess } from '../../../components/useAccess';
import Gate from '../../../components/Gate';
import InventoryItemForm from '../../../components/InventoryItemForm';
import { syncLockerFromInventory } from '../../lib/placeItems';
import { hirePriceText } from '../../lib/pricing';

function visibleAssetId(item) {
    if (!item) return '';
    if (typeof item.assetId === 'string') return item.assetId.trim();
    const id = String(item.id || '');
    return /^item_\d+$/i.test(id) ? '' : id;
}

function nextBookingText(window) {
    if (!window?.start || !window?.end) return 'None';
    const date = window.start.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
    const time = (value) => value.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });
    const amount = Number(window.quantity) > 1 ? ` · ${window.quantity}` : '';
    return `${date} ${time(window.start)}–${time(window.end)}${window.who ? ` · ${window.who}` : ''}${amount}`;
}

function stockOf(item) {
    const stock = parseInt(item?.quantity, 10);
    return Number.isFinite(stock) && stock > 0 ? stock : 1;
}

function unitsOut(item, stock) {
    if (typeof item?.checkedOutQty === 'number' && !Number.isNaN(item.checkedOutQty)) {
        return Math.min(stock, Math.max(0, item.checkedOutQty));
    }
    return item?.status === 'Borrowed' ? stock : 0;
}

function holdersOf(item, stock) {
    if (Array.isArray(item?.checkoutBy) && item.checkoutBy.length) {
        return item.checkoutBy.filter((entry) => Number(entry?.qty) > 0);
    }
    const out = unitsOut(item, stock);
    if (!out) return [];
    return [{ name: item.user && item.user !== '-' ? item.user : 'Someone', email: item.borrowerEmail || '', qty: out }];
}

function withHolder(list, name, email, qty) {
    const next = list.map((entry) => ({ ...entry }));
    const existing = next.find((entry) => (email && entry.email === email) || entry.name === name);
    if (existing) existing.qty += qty;
    else next.push({ name, email, qty });
    return next.filter((entry) => entry.qty > 0);
}

function withoutHolder(list, email, name, qty) {
    let left = qty;
    const next = list.map((entry) => ({ ...entry }));
    const ordered = [
        ...next.filter((entry) => email && entry.email === email),
        ...next.filter((entry) => entry.name === name && !(email && entry.email === email)),
        ...next.filter((entry) => !(email && entry.email === email) && entry.name !== name)
    ];
    ordered.forEach((entry) => {
        if (left <= 0) return;
        const take = Math.min(entry.qty, left);
        entry.qty -= take;
        left -= take;
    });
    return next.filter((entry) => entry.qty > 0);
}

function heldByAccount(holders, email, name) {
    const wantedEmail = String(email || '').trim().toLowerCase();
    return holders.reduce((sum, entry) => {
        const entryEmail = String(entry.email || '').trim().toLowerCase();
        if (wantedEmail && entryEmail && entryEmail === wantedEmail) return sum + Number(entry.qty || 0);
        if (!wantedEmail && name && entry.name === name) return sum + Number(entry.qty || 0);
        return sum;
    }, 0);
}

function holderLabel(holders) {
    return holders.map((entry) => (holders.length > 1 && entry.qty > 1 ? `${entry.name} (${entry.qty})` : entry.name)).join(', ');
}

function chosenWindow(type, single, startDate, endDate, startTime, endTime) {
    const from = type === 'range' ? startDate : single;
    const to = type === 'range' ? endDate : single;
    if (!from || !to || !startTime || !endTime) return null;
    const start = new Date(`${from}T${startTime}:00`);
    const end = new Date(`${to}T${endTime}:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
    return { start, end };
}

function ChoiceButton({ selected, disabled, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`py-3 px-2 text-center font-bold text-xs uppercase tracking-wider rounded-sm border cursor-pointer disabled:bg-neutral-200 disabled:text-neutral-500 disabled:cursor-not-allowed ${selected ? 'bg-black text-[#EAD64D] border-black' : 'bg-white text-black border-gray-300 hover:border-black'}`}
        >
            {children}
        </button>
    );
}

function Dialog({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white max-w-md w-full p-6 rounded-sm space-y-4 max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-extrabold">{title}</h2>
                    <button type="button" onClick={onClose} className="text-xs font-bold uppercase tracking-wider">Close</button>
                </div>
                {children}
            </div>
        </div>
    );
}

function DetailLine({ icon, label, children }) {
    return (
        <p className="text-sm text-neutral-800">
            {icon ? <span aria-hidden="true">{icon} </span> : null}
            <strong className="font-extrabold text-black">{label}:</strong> {children}
        </p>
    );
}

function BorrowPage({ params }) {
    const itemId = params?.id ? params.id.toUpperCase() : "UNKNOWN-ASSET";
    const { ready: accessReady, access } = useAccess();

    const [itemDetails, setItemDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [useModal, setUseModal] = useState(false);
    const [useChoice, setUseChoice] = useState(null);
    const [reportModal, setReportModal] = useState(false);
    const [bookingNotice, setBookingNotice] = useState('');
    const [bookingsTick, setBookingsTick] = useState(0);

    // Fullscreen Lightbox Modal State
    const [activeLightboxImg, setActiveLightboxImg] = useState(null);

    const isUnswFoundersTeam = access?.founders || isFoundersBooker(access?.userType, access?.department) ? 'yes' : 'no';
    const borrowerEmail = access?.email || '';
    const accountName = (access?.name || '').trim() || access?.email || '';

    const [dateSelectionType, setDateSelectionType] = useState('single');
    const [bookingDate, setBookingDate] = useState('');
    const [bookingStartDate, setBookingStartDate] = useState('');
    const [bookingEndDate, setBookingEndDate] = useState('');
    const [bookingStartTime, setBookingStartTime] = useState('');
    const [bookingEndTime, setBookingEndTime] = useState('');
    const [itemWindows, setItemWindows] = useState([]);
    const [calendarHolds, setCalendarHolds] = useState([]);
    const [calendarState, setCalendarState] = useState('loading');
    const [requestQty, setRequestQty] = useState(1);
    const [returnQty, setReturnQty] = useState(1);
    const [showReturn, setShowReturn] = useState(false);

    // Reporting States & Visibility Toggle
    const [reportType, setReportType] = useState(null);
    const [reportDescription, setReportDescription] = useState('');
    const [supplyAlert, setSupplyAlert] = useState(null);

    // Edit Item Details Modal / Form States
    const [isEditing, setIsEditing] = useState(false);
    const [editAssetId, setEditAssetId] = useState('');
    const [editName, setEditName] = useState('');
    const [selectedRoom, setSelectedRoom] = useState('MCIC Event Space');
    const [specificLocation, setSpecificLocation] = useState('');
    const [editDimensions, setEditDimensions] = useState('');
    const [editIncludedItems, setEditIncludedItems] = useState('');
    const [editDetails, setEditDetails] = useState('');
    const [editQuantity, setEditQuantity] = useState('1');
    const [editCostPerDay, setEditCostPerDay] = useState('');
    const [editCostAppliesTo, setEditCostAppliesTo] = useState('item');
    const [editTabs, setEditTabs] = useState([]);
    const [editViewAccess, setEditViewAccess] = useState(['account']);
    const [editFreeInclusionSpaces, setEditFreeInclusionSpaces] = useState([]);

    // Multi-photo Editing States
    const [existingImages, setExistingImages] = useState([]);
    const [newImageFiles, setNewImageFiles] = useState([]);
    const [newImagePreviews, setNewImagePreviews] = useState([]);
    const [activeDisplayPhotoIdx, setActiveDisplayPhotoIdx] = useState(0);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    useEffect(() => {
        async function fetchItem() {
            setLoading(true);
            try {
                const docRef = doc(db, "items", itemId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setItemDetails({ id: docSnap.id, ...data });

                    const generatedId = /^item_\d+$/i.test(docSnap.id);
                    setEditAssetId(typeof data.assetId === 'string' ? data.assetId : (generatedId ? '' : docSnap.id));
                    setEditName(data.name || '');
                    setSelectedRoom(data.room || 'MCIC Event Space');
                    setSpecificLocation(data.specificLocation || '');
                    setEditDimensions(data.dimensions || '');
                    setEditIncludedItems(data.includedItems || '');
                    setEditDetails(data.details || '');
                    setEditQuantity(data.quantity ? String(data.quantity) : '1');
                    setEditCostPerDay(data.costPerDay !== undefined && data.costPerDay !== null ? String(data.costPerDay) : '');
                    setEditCostAppliesTo(data.costAppliesTo === 'all' ? 'all' : 'item');
                    setEditTabs(Array.isArray(data.tabs) ? data.tabs.filter((tab) => tab === 'digital' || tab === 'locker' || tab === 'kitchen') : (data.section === 'digital' ? ['digital'] : []));
                    setEditViewAccess(itemAccessLevels(data.viewAccess));
                    setEditFreeInclusionSpaces(Array.isArray(data.freeInclusionSpaces) ? data.freeInclusionSpaces : []);

                    const imgs = data.images && data.images.length > 0
                        ? data.images
                        : (data.image ? [data.image] : []);
                    setExistingImages(imgs);
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

    useEffect(() => {
        if (!db || itemId === 'UNKNOWN-ASSET') return undefined;
        let cancelled = false;
        Promise.all([
            getDocs(collection(db, 'asset_reservations')),
            getDocs(collection(db, 'bookings'))
        ]).then(([reservationSnap, bookingSnap]) => {
            if (cancelled) return;
            const windows = withItemNames([
                ...reservationSnap.docs.flatMap(entry => reservationWindows({ id: entry.id, ...entry.data() })),
                ...bookingSnap.docs.flatMap(entry => bookingEquipmentWindows({ id: entry.id, ...entry.data() }))
            ], []);
            const mine = windows.filter((window) => window.itemId === String(itemId).toUpperCase() && window.end > new Date());
            setItemWindows(mine);
        }).catch(() => {
            if (!cancelled) setItemWindows([]);
        });
        return () => {
            cancelled = true;
        };
    }, [itemId, bookingsTick]);

    useEffect(() => {
        const name = itemDetails?.name;
        if (!name) return undefined;
        let cancelled = false;
        setCalendarState('loading');
        fetch(`/api/inventory/calendar?item=${encodeURIComponent(name)}`)
            .then((response) => response.json())
            .then((data) => {
                if (cancelled) return;
                if (!data.success) {
                    setCalendarState('error');
                    return;
                }
                setCalendarHolds((data.holds || []).flatMap((hold) => {
                    const start = new Date(hold.start);
                    const end = new Date(hold.end);
                    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
                    return [{ ...hold, start, end }];
                }));
                setCalendarState('ready');
            })
            .catch(() => {
                if (!cancelled) setCalendarState('error');
            });
        return () => {
            cancelled = true;
        };
    }, [itemDetails?.name, bookingsTick]);

    const totalPhotosCount = existingImages.length + newImageFiles.length;

    const handleAddPhotos = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const availableSlots = 4 - totalPhotosCount;
        if (availableSlots <= 0) return;

        const filesToAdd = files.slice(0, availableSlots);
        const updatedNewFiles = [...newImageFiles, ...filesToAdd];
        setNewImageFiles(updatedNewFiles);

        const updatedPreviews = updatedNewFiles.map(file => URL.createObjectURL(file));
        setNewImagePreviews(updatedPreviews);
    };

    const handleRemoveExistingPhoto = (index) => {
        setExistingImages(existingImages.filter((_, i) => i !== index));
    };

    const handleRemoveNewPhoto = (index) => {
        const updatedFiles = newImageFiles.filter((_, i) => i !== index);
        const updatedPreviews = newImagePreviews.filter((_, i) => i !== index);
        setNewImageFiles(updatedFiles);
        setNewImagePreviews(updatedPreviews);
    };

    const requestedAmount = () => {
        const stock = stockOf(itemDetails);
        if (stock <= 1) return 1;
        const qty = parseInt(requestQty, 10);
        if (!Number.isFinite(qty) || qty < 1) return 1;
        return Math.min(stock, qty);
    };

    const availabilityHolds = () => (calendarState === 'ready' ? calendarHolds : itemWindows);

    const recordCheckout = async (checkingOut, qty) => {
        const stock = stockOf(itemDetails);
        const holders = holdersOf(itemDetails, stock);
        const nextHolders = checkingOut
            ? withHolder(holders, accountName, borrowerEmail, qty)
            : withoutHolder(holders, borrowerEmail, accountName, qty);
        const out = nextHolders.reduce((sum, entry) => sum + Number(entry.qty || 0), 0);
        const docRef = doc(db, "items", itemId);
        const checkedOutAt = new Date().toISOString();
        await updateDoc(docRef, {
            status: out >= stock ? 'Borrowed' : 'Available',
            user: nextHolders.length ? holderLabel(nextHolders) : '-',
            checkoutBy: nextHolders,
            checkedOutQty: out,
            checkedOutAt: out ? checkedOutAt : '',
            borrowerEmail: out ? borrowerEmail : ''
        });
        await addDoc(collection(db, 'asset_checkouts'), {
            itemId,
            itemName: itemDetails.name,
            borrowerName: accountName,
            borrowerEmail,
            quantity: qty,
            checkedOutAt,
            returnedAt: checkingOut ? '' : checkedOutAt,
            status: checkingOut ? 'out' : 'returned'
        });
        setItemDetails(prev => ({
            ...prev,
            status: out >= stock ? 'Borrowed' : 'Available',
            user: nextHolders.length ? holderLabel(nextHolders) : '-',
            checkoutBy: nextHolders,
            checkedOutQty: out,
            checkedOutAt: out ? checkedOutAt : ''
        }));
    };

    const confirmCheckout = async () => {
        if (!itemDetails || !accountName) return;
        const stock = stockOf(itemDetails);
        const qty = requestedAmount();
        const remaining = stock - unitsOut(itemDetails, stock);
        if (qty > remaining) {
            alert(remaining > 0 ? `Only ${remaining} available to check out.` : 'None are available to check out.');
            return;
        }
        setIsProcessing(true);
        try {
            await recordCheckout(true, qty);
            setUseModal(false);
            setUseChoice(null);
        } catch (error) {
            console.error("Error updating document in Firebase:", error);
            alert("Database update failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const returnItem = async (qty) => {
        if (!itemDetails) return;
        const stock = stockOf(itemDetails);
        const holders = holdersOf(itemDetails, stock);
        const out = unitsOut(itemDetails, stock);
        const mine = heldByAccount(holders, borrowerEmail, accountName);
        const allowed = access.admin ? out : mine;
        const returning = Math.min(out, allowed, qty);
        if (!out || returning < 1) return;
        setIsProcessing(true);
        try {
            await recordCheckout(false, returning);
            setShowReturn(false);
            setReturnQty(1);
        } catch (error) {
            console.error("Error updating document in Firebase:", error);
            alert("Database update failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const bookFutureDate = async (event) => {
        event.preventDefault();
        if (!itemDetails || !accountName) return;
        if (calendarState === 'loading') return;
        const window = chosenWindow(dateSelectionType, bookingDate, bookingStartDate, bookingEndDate, bookingStartTime, bookingEndTime);
        if (!window) {
            setBookingNotice('Choose a date and a start and end time.');
            return;
        }
        const stock = stockOf(itemDetails);
        const qty = requestedAmount();
        const booked = overlappingQuantity(availabilityHolds(), window.start, window.end);
        if (booked + qty > stock) {
            setBookingNotice(stock - booked <= 0 ? 'This item is already booked then.' : `Only ${stock - booked} available then.`);
            return;
        }
        setIsProcessing(true);
        setBookingNotice('');
        try {
            const reservation = {
                itemId: itemId,
                itemName: itemDetails.name,
                borrowerName: accountName,
                isUnswFoundersTeam: isUnswFoundersTeam,
                borrowerEmail: borrowerEmail || '-',
                dateSelectionType: dateSelectionType,
                bookingDate: dateSelectionType === 'single' ? bookingDate : null,
                bookingStartDate: dateSelectionType === 'range' ? bookingStartDate : null,
                bookingEndDate: dateSelectionType === 'range' ? bookingEndDate : null,
                bookingStartTime: bookingStartTime,
                bookingEndTime: bookingEndTime,
                quantity: qty,
                status: 'Scheduled',
                createdAt: new Date().toISOString()
            };
            const saved = await addDoc(collection(db, "asset_reservations"), reservation);
            const calendarResponse = await fetch('/api/inventory/calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...reservation, reservationId: saved.id })
            });
            if (!calendarResponse.ok) {
                alert('The reservation was saved, but it could not be added to the Google Calendar.');
            }
            setBookingDate('');
            setBookingStartDate('');
            setBookingEndDate('');
            setBookingStartTime('');
            setBookingEndTime('');
            setUseModal(false);
            setUseChoice(null);
            setBookingNotice('This date is booked.');
            setBookingsTick((value) => value + 1);
        } catch (error) {
            console.error("Error updating document in Firebase:", error);
            alert("Database update failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReportSubmit = async (e) => {
        e.preventDefault();
        if (!itemDetails || !reportDescription.trim()) return;

        const actionTag = reportType === 'broken' ? 'Maintenance / Damaged Asset' : 'Low Stock Alert';

        try {
            await addDoc(collection(db, "alerts"), {
                type: actionTag,
                itemId: itemDetails.id,
                item: itemDetails.name,
                location: itemDetails.storageLocation || 'Unknown Location',
                description: reportDescription.trim(),
                reporter: accountName,
                status: 'Pending',
                createdAt: new Date().toISOString()
            });

            setSupplyAlert(`${actionTag} for ${itemDetails.name}`);
            setReportDescription('');
            setReportType(null);
            setReportModal(false);
        } catch (err) {
            console.error("Error logging report to Firebase:", err);
            alert("Failed to submit report.");
        }
    };

    const handleSaveItemEdit = async (e) => {
        e.preventDefault();
        setIsSavingEdit(true);

        const fullStorageLocation = specificLocation.trim()
            ? `${selectedRoom}\n${specificLocation.trim()}`
            : selectedRoom;

        try {
            const newlyUploadedUrls = [];

            if (newImageFiles.length > 0) {
                for (let i = 0; i < newImageFiles.length; i++) {
                    const storageRef = ref(storage, `inventory/${itemId}_${Date.now()}_${i + 1}`);
                    await uploadBytes(storageRef, newImageFiles[i]);
                    const url = await getDownloadURL(storageRef);
                    newlyUploadedUrls.push(url);
                }
            }

            const allFinalImages = [...existingImages, ...newlyUploadedUrls].slice(0, 4);

            const docRef = doc(db, "items", itemId);
            const updatedData = {
                name: editName.trim(),
                room: selectedRoom,
                specificLocation: specificLocation.trim(),
                storageLocation: fullStorageLocation,
                dimensions: editDimensions.trim(),
                includedItems: editIncludedItems.trim(),
                details: editDetails.trim(),
                quantity: parseInt(editQuantity, 10) || 1,
                costPerDay: parseFloat(editCostPerDay) || 0,
                costAppliesTo: editCostAppliesTo,
                tabs: editTabs,
                section: editTabs.includes('digital') ? 'digital' : 'general',
                viewAccess: editViewAccess,
                freeInclusionSpaces: editFreeInclusionSpaces,
                assetId: editAssetId.trim(),
                image: allFinalImages[0] || '',
                images: allFinalImages,
                itemType: deleteField(),
                hireScope: deleteField(),
                isFoundersStaffOnly: deleteField()
            };

            await updateDoc(docRef, updatedData);
            if (itemDetails.lockerId) {
                await syncLockerFromInventory(db, itemDetails.lockerId, editName.trim());
            }

            setItemDetails(prev => {
                const next = { ...prev, ...updatedData };
                delete next.itemType;
                delete next.hireScope;
                delete next.isFoundersStaffOnly;
                return next;
            });

            setExistingImages(allFinalImages);
            setNewImageFiles([]);
            setNewImagePreviews([]);
            setIsEditing(false);
        } catch (err) {
            console.error("Error updating item specs in Firestore:", err);
            alert("Failed to update item details. Please try again.");
        } finally {
            setIsSavingEdit(false);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-[#F9F9F9] flex items-center justify-center p-6 text-xs font-bold uppercase tracking-wider text-gray-400">
                Loading item...
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

    if (!accessReady || !canViewItem(access, itemDetails.viewAccess)) {
        return (
            <main className="min-h-screen bg-[#F9F9F9] flex flex-col items-center justify-center p-6 space-y-4">
                <p className="text-sm font-bold">{accessReady ? 'You do not have access to this item.' : 'Checking access…'}</p>
                <a href="/inventory" className="text-xs font-bold uppercase tracking-wider text-black underline">Return to Inventory</a>
            </main>
        );
    }

    const stock = stockOf(itemDetails);
    const outNow = unitsOut(itemDetails, stock);
    const remaining = Math.max(0, stock - outNow);
    const isAvailable = remaining > 0;
    const holders = holdersOf(itemDetails, stock);
    const holds = calendarState === 'ready' ? calendarHolds : itemWindows;
    const upcomingHolds = holds.filter((hold) => hold.end > new Date()).sort((a, b) => a.start - b.start);
    const nextBooking = upcomingHolds[0] || null;
    const selectedWindow = chosenWindow(dateSelectionType, bookingDate, bookingStartDate, bookingEndDate, bookingStartTime, bookingEndTime);
    const bookedThen = selectedWindow ? overlappingQuantity(holds, selectedWindow.start, selectedWindow.end) : 0;
    const freeThen = Math.max(0, stock - bookedThen);
    const amount = stock > 1 ? Math.min(stock, Math.max(1, parseInt(requestQty, 10) || 1)) : 1;
    const dateClash = Boolean(selectedWindow) && amount > freeThen;
    const bookBlocked = dateClash || calendarState === 'loading';
    const clashText = freeThen <= 0 ? 'This item is already booked then.' : `Only ${freeThen} available then.`;
    const myOut = heldByAccount(holders, borrowerEmail, accountName);
    const returnable = access.admin ? outNow : myOut;
    const canReturn = returnable > 0;
    const returning = Math.min(returnable, Math.max(1, parseInt(returnQty, 10) || 1));
    const quantityKnown = Number.isFinite(parseInt(itemDetails.quantity, 10)) && parseInt(itemDetails.quantity, 10) > 0;
    const quantityText = !quantityKnown ? '—' : (outNow > 0 ? `${remaining} available, ${outNow} checked out` : `${stock} available`);
    const pageButtonClass = 'py-3 text-center font-bold text-xs uppercase tracking-wider rounded-sm border border-black bg-white text-black hover:bg-black hover:text-white cursor-pointer';
    const displayPhotosList = itemDetails.images && itemDetails.images.length > 0
        ? itemDetails.images
        : (itemDetails.image ? [itemDetails.image] : []);

    const activePhotoUrl = displayPhotosList[activeDisplayPhotoIdx] || displayPhotosList[0] || null;
    const hireCost = hirePriceText(itemDetails.costPerDay, itemDetails.costAppliesTo);
    const assetIdLabel = visibleAssetId(itemDetails);
    const accessGroup = itemAccessLabel(itemDetails.viewAccess);

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">
            <div className="max-w-md mx-auto px-6 py-12 space-y-6">

                <div className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-6">

                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <a href="/inventory" aria-label="Back to inventory" className="shrink-0 text-xl font-bold leading-none mt-1">←</a>
                            {!isEditing && (
                                <h1 className="text-2xl font-extrabold tracking-tight text-black break-words">{itemDetails.name}</h1>
                            )}
                        </div>
                        {access.staff && <button
                            type="button"
                            onClick={() => setIsEditing(!isEditing)}
                            className="shrink-0 text-neutral-700 hover:text-black font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-xs transition-colors"
                        >
                            <span>{isEditing ? '✕ Cancel Edit' : '✏️ Edit Listing'}</span>
                        </button>}
                    </div>

                    {isEditing ? (
                        <InventoryItemForm
                            values={{
                                name: editName,
                                details: editDetails,
                                assetId: editAssetId,
                                room: selectedRoom,
                                specificLocation,
                                costPerDay: editCostPerDay,
                                costAppliesTo: editCostAppliesTo,
                                quantity: editQuantity,
                                viewAccess: editViewAccess,
                                tabs: editTabs,
                                freeInclusionSpaces: editFreeInclusionSpaces,
                                dimensions: editDimensions,
                                includedItems: editIncludedItems
                            }}
                            onChange={(field, value) => {
                                const update = {
                                    name: setEditName,
                                    details: setEditDetails,
                                    assetId: setEditAssetId,
                                    room: setSelectedRoom,
                                    specificLocation: setSpecificLocation,
                                    costPerDay: setEditCostPerDay,
                                    costAppliesTo: setEditCostAppliesTo,
                                    quantity: setEditQuantity,
                                    viewAccess: setEditViewAccess,
                                    tabs: setEditTabs,
                                    freeInclusionSpaces: setEditFreeInclusionSpaces,
                                    dimensions: setEditDimensions,
                                    includedItems: setEditIncludedItems
                                };
                                update[field](value);
                            }}
                            photos={[
                                ...existingImages.map((src, index) => ({ key: `existing-${index}`, src })),
                                ...newImagePreviews.map((src, index) => ({ key: `new-${index}`, src }))
                            ]}
                            onAddPhotos={handleAddPhotos}
                            onRemovePhoto={(key) => {
                                const [kind, index] = key.split('-');
                                if (kind === 'existing') handleRemoveExistingPhoto(Number(index));
                                else handleRemoveNewPhoto(Number(index));
                            }}
                            submitLabel={isSavingEdit ? 'Saving...' : 'Save changes'}
                            submitting={isSavingEdit}
                            onSubmit={handleSaveItemEdit}
                            status={(
                                <div className={`p-3 rounded-sm border ${isAvailable ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'}`}>
                                    <p className="text-sm font-extrabold">
                                        {isAvailable ? 'Available for Checkout' : `Checked out By ${holderLabel(holders) || '—'}`}
                                    </p>
                                    {isAvailable && outNow > 0 && (
                                        <p className="text-sm mt-1">Checked out: {outNow} by {holderLabel(holders)}</p>
                                    )}
                                    <p className="text-sm mt-1">Next booking: {nextBookingText(nextBooking)}</p>
                                </div>
                            )}
                        />
                    ) : (
                        <div className="space-y-4">
                            {activePhotoUrl ? (
                                <div className="relative w-full h-44 bg-neutral-50 border border-gray-200 rounded-sm overflow-hidden flex items-center justify-center p-2">
                                    <img
                                        src={activePhotoUrl}
                                        alt={itemDetails.name}
                                        className="h-full w-auto max-w-full object-contain"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setActiveLightboxImg(activePhotoUrl)}
                                        aria-label="Enlarge"
                                        className="absolute bottom-2 right-2 text-lg leading-none cursor-pointer"
                                    >
                                        🔍
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full h-32 bg-neutral-50 border border-dashed border-gray-200 rounded-sm flex items-center justify-center text-neutral-400 text-xs font-bold uppercase tracking-wider">
                                    No image
                                </div>
                            )}

                            {displayPhotosList.length > 1 && (
                                <div className="flex gap-2">
                                    {displayPhotosList.map((photoUrl, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setActiveDisplayPhotoIdx(idx)}
                                            className={`w-10 h-10 rounded-xs overflow-hidden border cursor-pointer transition-all ${activeDisplayPhotoIdx === idx ? 'border-black ring-1 ring-black' : 'border-gray-200 opacity-60 hover:opacity-100'}`}
                                        >
                                            <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className={`p-3 rounded-sm border ${isAvailable ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'}`}>
                                <p className="text-sm font-extrabold">
                                    {isAvailable ? 'Available for Checkout' : `Checked out By ${holderLabel(holders) || '—'}`}
                                </p>
                                {isAvailable && outNow > 0 && (
                                    <p className="text-sm mt-1">Checked out: {outNow} by {holderLabel(holders)}</p>
                                )}
                                <p className="text-sm mt-1">Next booking: {nextBookingText(nextBooking)}</p>
                            </div>

                            <div className="space-y-1">
                                <DetailLine icon="📍" label="Storage Location">{itemDetails.storageLocation || '—'}</DetailLine>
                                <DetailLine icon="🔢" label="Quantity">{quantityText}</DetailLine>
                                <DetailLine icon="📐" label="Dimensions">{itemDetails.dimensions || '—'}</DetailLine>
                                <div className="text-sm text-neutral-800">
                                    <p>
                                        <span aria-hidden="true">💰 </span>
                                        <strong className="font-extrabold text-black">Standard Cost of Hire:</strong> {hireCost}
                                    </p>
                                    {Array.isArray(itemDetails.freeInclusionSpaces) && itemDetails.freeInclusionSpaces.length > 0 && (
                                        <div className="mt-2 pl-6">
                                            <p className="font-extrabold text-black">Included free with</p>
                                            <ul className="mt-1 list-disc pl-4 space-y-0.5">
                                                {itemDetails.freeInclusionSpaces.map((space) => (
                                                    <li key={space}>{space}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                {itemDetails.details && (
                                    <div className="pt-2">
                                        <p className="text-sm font-extrabold text-black">Item details</p>
                                        <p className="text-sm text-neutral-800 whitespace-pre-wrap">{itemDetails.details}</p>
                                    </div>
                                )}
                                {itemDetails.includedItems && (
                                    <DetailLine icon="🔌" label="What's Included">{itemDetails.includedItems}</DetailLine>
                                )}
                            </div>
                        </div>
                    )}

                    {!isEditing && (
                        <div className="space-y-4">
                            {bookingNotice && (
                                <p className="text-xs font-bold text-black">{bookingNotice}</p>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setUseChoice(null); setUseModal(true); }}
                                    className={pageButtonClass}
                                >
                                    Checkout or Book Item
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setReportType(null); setReportModal(true); }}
                                    className={pageButtonClass}
                                >
                                    Damaged or Low Stock
                                </button>
                            </div>
                            {supplyAlert && (
                                <p className="text-xs font-bold text-black">Report sent.</p>
                            )}
                            {canReturn && (
                                <div className="space-y-3">
                                    {showReturn && returnable > 1 && (
                                        <label className="block text-sm text-neutral-800">
                                            <strong className="font-extrabold text-black">How many:</strong>
                                            <input
                                                type="number"
                                                min="1"
                                                max={returnable}
                                                value={returnQty}
                                                onChange={(event) => setReturnQty(event.target.value)}
                                                className="mt-1 w-24 p-2 border border-gray-300 text-sm font-semibold rounded-sm"
                                            />
                                        </label>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (returnable > 1 && !showReturn) {
                                                setShowReturn(true);
                                                return;
                                            }
                                            returnItem(returning);
                                        }}
                                        disabled={isProcessing}
                                        className="w-full py-3 text-center font-bold text-xs uppercase tracking-wider rounded-sm border border-black cursor-pointer disabled:bg-neutral-200 disabled:text-neutral-500"
                                    >
                                        {isProcessing ? 'Processing...' : `Return${returnable > 1 && showReturn ? ` ${returning}` : ''}`}
                                    </button>
                                </div>
                            )}

                            <div className="pt-2 space-y-1 text-[11px] text-gray-400">
                                <p>Access Group: {accessGroup}</p>
                                {assetIdLabel ? <p>Asset ID: {assetIdLabel}</p> : null}
                            </div>
                        </div>
                    )}

                </div>

            </div>

            {activeLightboxImg && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setActiveLightboxImg(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center">
                        <img
                            src={activeLightboxImg}
                            alt={itemDetails.name}
                            className="max-w-full max-h-[82vh] object-contain rounded-xs border border-white/20 shadow-2xl"
                        />
                        <button
                            type="button"
                            onClick={() => setActiveLightboxImg(null)}
                            className="mt-4 bg-[#EAD64D] text-black hover:bg-white text-xs font-black uppercase tracking-wider px-6 py-2 rounded-xs transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {useModal && (
                <Dialog title="Checkout or book item" onClose={() => { if (!isProcessing) { setUseModal(false); setUseChoice(null); } }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ChoiceButton selected={useChoice === 'checkout'} disabled={!isAvailable} onClick={() => setUseChoice('checkout')}>Checkout Now</ChoiceButton>
                        <ChoiceButton selected={useChoice === 'book'} onClick={() => setUseChoice('book')}>Book for Future Date</ChoiceButton>
                    </div>
                    {useChoice === 'checkout' && (
                        <div className="space-y-3">
                            {stock > 1 && (
                                <label className="block text-sm text-neutral-800">
                                    <strong className="font-extrabold text-black">How many:</strong>
                                    <input
                                        type="number"
                                        min="1"
                                        max={remaining}
                                        value={requestQty}
                                        onChange={(event) => setRequestQty(event.target.value)}
                                        className="mt-1 w-24 p-2 border border-gray-300 text-sm font-semibold rounded-sm"
                                    />
                                </label>
                            )}
                            {amount > remaining && (
                                <p className="text-xs font-bold text-red-700">Only {remaining} available.</p>
                            )}
                            <p className="text-sm">This will check out {Math.min(amount, remaining)} as {accountName}.</p>
                            <p className="text-sm text-neutral-700">Next booking: {nextBookingText(nextBooking)}</p>
                            <button type="button" onClick={confirmCheckout} disabled={isProcessing || amount > remaining} className="w-full py-3 text-xs font-bold uppercase tracking-wider bg-black text-white rounded-sm cursor-pointer disabled:bg-neutral-200 disabled:text-neutral-500 disabled:cursor-not-allowed">{isProcessing ? 'Processing...' : 'Confirm'}</button>
                        </div>
                    )}
                    {useChoice === 'book' && (
                        <form onSubmit={bookFutureDate} className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <ChoiceButton selected={dateSelectionType === 'single'} onClick={() => setDateSelectionType('single')}>One date</ChoiceButton>
                                <ChoiceButton selected={dateSelectionType === 'range'} onClick={() => setDateSelectionType('range')}>Date range</ChoiceButton>
                            </div>
                            {dateSelectionType === 'single' ? (
                                <input type="date" required aria-label="Date" value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} className="w-full p-2 border border-gray-200 text-xs font-semibold rounded-sm outline-none focus:border-black" />
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="date" required aria-label="Start date" value={bookingStartDate} onChange={(event) => setBookingStartDate(event.target.value)} className="w-full p-2 border border-gray-200 text-xs font-semibold rounded-sm outline-none focus:border-black" />
                                    <input type="date" required aria-label="End date" value={bookingEndDate} onChange={(event) => setBookingEndDate(event.target.value)} className="w-full p-2 border border-gray-200 text-xs font-semibold rounded-sm outline-none focus:border-black" />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <input type="time" required aria-label="Start time" value={bookingStartTime} onChange={(event) => setBookingStartTime(event.target.value)} className="w-full p-2 border border-gray-200 text-xs font-semibold rounded-sm outline-none focus:border-black" />
                                <input type="time" required aria-label="End time" value={bookingEndTime} onChange={(event) => setBookingEndTime(event.target.value)} className="w-full p-2 border border-gray-200 text-xs font-semibold rounded-sm outline-none focus:border-black" />
                            </div>
                            {stock > 1 && (
                                <label className="block text-sm text-neutral-800">
                                    <strong className="font-extrabold text-black">How many:</strong>
                                    <input type="number" min="1" max={stock} value={requestQty} onChange={(event) => setRequestQty(event.target.value)} className="mt-1 w-24 p-2 border border-gray-300 text-sm font-semibold rounded-sm" />
                                </label>
                            )}
                            {dateClash && <p className="text-xs font-bold text-red-700">{clashText}</p>}
                            <button type="submit" disabled={isProcessing || bookBlocked} className="w-full py-3 font-bold text-xs uppercase tracking-wider rounded-sm bg-black text-white hover:bg-[#EAD64D] hover:text-black cursor-pointer disabled:bg-neutral-200 disabled:text-neutral-500 disabled:cursor-not-allowed">{isProcessing ? 'Processing...' : 'Book this date'}</button>
                        </form>
                    )}
                </Dialog>
            )}

            {reportModal && (
                <Dialog title="Damaged or low stock" onClose={() => { setReportModal(false); setReportType(null); }}>
                    <form onSubmit={handleReportSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <ChoiceButton selected={reportType === 'broken'} onClick={() => setReportType('broken')}>🔧 Broken / Damaged</ChoiceButton>
                            <ChoiceButton selected={reportType === 'stock'} onClick={() => setReportType('stock')}>⚠️ Low Stock</ChoiceButton>
                        </div>
                        {reportType && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-black block">{reportType === 'stock' ? 'What is running low? *' : 'Describe the issue or damage *'}</label>
                                    <textarea required rows="3" placeholder={reportType === 'stock' ? 'e.g. Only 2 left, paper out, batteries needed...' : 'e.g. Screen flickering, cable frayed, missing part...'} value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} className="w-full p-2.5 border border-neutral-300 bg-white text-xs rounded-sm outline-none focus:border-black" />
                                </div>
                                <button type="submit" className="w-full bg-black text-white font-bold py-3 text-xs uppercase tracking-wider rounded-sm hover:bg-[#EAD64D] hover:text-black cursor-pointer">Submit Report</button>
                            </>
                        )}
                    </form>
                </Dialog>
            )}
        </main>
    );
}

export default function Page(props) {
    return <Gate level="account"><BorrowPage {...props} /></Gate>;
}
