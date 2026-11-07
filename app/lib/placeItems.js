import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export const KITCHEN_PENDING = 'Contents to be added';

export const KITCHENS = [
    {
        id: 'k1',
        name: 'Kitchen 1',
        image: '/kitchen-1.png',
        zones: [
            { id: 'k1u1', name: 'Upper cupboard 1', rect: [109, 160, 149, 191], items: 'tea, sugar' },
            { id: 'k1u2', name: 'Upper cupboard 2', rect: [259, 160, 159, 191], items: 'almond milk, full cream milk, soy milk, oat milk, coffee' },
            { id: 'k1u3', name: 'Upper cupboard 3', rect: [419, 160, 193, 191], items: KITCHEN_PENDING },
            { id: 'k1u4', name: 'Upper cupboard 4', rect: [613, 160, 193, 191], items: KITCHEN_PENDING },
            { id: 'k1u5', name: 'Upper cupboard 5', rect: [807, 160, 224, 191], items: KITCHEN_PENDING },
            { id: 'k1d1', name: 'Cutlery drawer', rect: [89, 588, 180, 47], items: KITCHEN_PENDING },
            { id: 'k1l1', name: 'Lower cupboard 1', rect: [89, 636, 180, 219], items: 'paper bags, glad wrap, zip lock bags' },
            { id: 'k1l2', name: 'Lower cupboard 2', rect: [270, 588, 147, 267], items: 'disposable cutlery, takeaway boxes' },
            { id: 'k1l3', name: 'Lower cupboard 3', rect: [418, 588, 169, 267], items: KITCHEN_PENDING },
            { id: 'k1l4', name: 'Lower cupboard 5', rect: [589, 588, 221, 267], items: 'bin' },
            { id: 'k1fridge', name: 'Fridge', rect: [1083, 201, 356, 688], items: KITCHEN_PENDING }
        ]
    },
    {
        id: 'k2',
        name: 'Kitchen 2',
        image: '/kitchen-2.png',
        zones: [
            { id: 'k2u1', name: 'Upper cupboard 1', rect: [102, 132, 184, 190], items: 'mugs, glasses, cups' },
            { id: 'k2u2', name: 'Upper cupboard 2', rect: [287, 132, 219, 190], items: 'plates, bowls, cake stands' },
            { id: 'k2u3', name: 'Upper cupboard 3', rect: [507, 132, 214, 190], items: 'plates, bowls, cake stands' },
            { id: 'k2u4', name: 'Upper cupboard 4', rect: [722, 132, 227, 190], items: KITCHEN_PENDING },
            { id: 'k2u5', name: 'Upper cupboard 5', rect: [950, 132, 234, 190], items: KITCHEN_PENDING },
            { id: 'k2u6', name: 'Upper cupboard 6', rect: [1185, 132, 250, 190], items: KITCHEN_PENDING },
            { id: 'k2l1', name: 'Lower cupboard 1', rect: [282, 570, 212, 301], items: KITCHEN_PENDING },
            { id: 'k2l2', name: 'Lower cupboard 2', rect: [495, 570, 249, 301], items: 'cleaning supplies' },
            { id: 'k2l3', name: 'Lower cupboard 3', rect: [1002, 570, 231, 301], items: 'bin' },
            { id: 'k2d1', name: 'Right-hand drawer 1', rect: [1235, 570, 240, 70], items: 'cutlery, knife, fork, spoon, tongs, bottle opener' },
            { id: 'k2d2', name: 'Right-hand drawer 2', rect: [1235, 645, 240, 225], items: 'tea station, large serving plates, cutting boards' }
        ]
    }
];

export function kitchenItemId(zoneId, name) {
    const slug = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'item';
    return `KITCHEN_${zoneId}_${slug}`;
}

export function lockerItemId(lockerId) {
    return `LOCKER_${lockerId}`;
}

export function kitchenZones() {
    return KITCHENS.flatMap((kitchen) => kitchen.zones.map((zone) => ({
        ...zone,
        kitchenId: kitchen.id,
        kitchenName: kitchen.name
    })));
}

export function kitchenSeedItems() {
    return kitchenZones().flatMap((zone) => {
        if (zone.items === KITCHEN_PENDING) return [];
        return zone.items.split(',').map((name) => name.trim()).filter(Boolean).map((name) => ({
            id: kitchenItemId(zone.id, name),
            data: placeItemData({
                name,
                room: 'Founders Level 1 Kitchen',
                specificLocation: `${zone.kitchenName}, ${zone.name}`,
                tab: 'kitchen',
                extra: { kitchenId: zone.kitchenId, kitchenZone: zone.id }
            })
        }));
    });
}

export function placeItemData({ name, room, specificLocation, tab, extra = {} }) {
    return {
        name,
        room,
        specificLocation: specificLocation || '',
        storageLocation: specificLocation ? `${room}\n${specificLocation}` : room,
        tabs: [tab],
        status: 'Available',
        user: '-',
        viewAccess: ['account'],
        ...extra
    };
}

function keptTabs(previous, tab) {
    const tabs = Array.isArray(previous.tabs) ? previous.tabs : [];
    return Array.from(new Set([...tabs, tab]));
}

export async function saveLinkedKitchenItem(db, { name, zoneId }) {
    const zone = kitchenZones().find((item) => item.id === zoneId);
    const trimmed = String(name || '').trim();
    if (!zone || !trimmed) return null;
    const id = kitchenItemId(zone.id, trimmed);
    const ref = doc(db, 'items', id);
    const snap = await getDoc(ref);
    const prev = snap.exists() ? snap.data() : {};
    await setDoc(ref, {
        ...placeItemData({
            name: trimmed,
            room: 'Founders Level 1 Kitchen',
            specificLocation: `${zone.kitchenName}, ${zone.name}`,
            tab: 'kitchen',
            extra: { kitchenId: zone.kitchenId, kitchenZone: zone.id }
        }),
        tabs: keptTabs(prev, 'kitchen'),
        status: prev.status || 'Available',
        user: prev.user || '-',
        viewAccess: prev.viewAccess || ['account']
    }, { merge: true });
    return id;
}

export async function saveLinkedLockerItem(db, lockerId, itemsText) {
    const name = String(itemsText || '').trim();
    const id = lockerItemId(lockerId);
    const ref = doc(db, 'items', id);
    const snap = await getDoc(ref);
    if (!name && !snap.exists()) return null;
    const prev = snap.exists() ? snap.data() : {};
    const filledIn = prev.costPerDay || prev.dimensions || prev.details || prev.includedItems || prev.assetId || (Array.isArray(prev.images) && prev.images.length);
    if (!name && !filledIn) {
        await deleteDoc(ref);
        return id;
    }
    await setDoc(ref, {
        ...placeItemData({
            name,
            room: 'Ground Floor Lockers',
            specificLocation: `Locker ${lockerId}`,
            tab: 'locker',
            extra: { lockerId: String(lockerId) }
        }),
        tabs: keptTabs(prev, 'locker'),
        status: prev.status || 'Available',
        user: prev.user || '-',
        viewAccess: prev.viewAccess || ['account']
    }, { merge: true });
    return id;
}

export async function syncLockerFromInventory(db, lockerId, name) {
    if (!lockerId) return;
    await updateDoc(doc(db, 'lockers', String(lockerId)), { items: name || '' });
}
