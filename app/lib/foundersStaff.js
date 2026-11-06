import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SEED = [
    { name: 'Celine Olarte', role: 'Program Coordinator', email: 'c.olarte@unsw.edu.au' },
    { name: 'David Burt', role: 'Director - Entrepreneurship', email: 'd.burt@unsw.edu.au' },
    { name: 'Dina Titkova', role: 'Senior Manager, Entrepreneurship', email: 'd.titkova@unsw.edu.au' },
    { name: 'Eleni Assargiotis', role: 'Program Manager, Foundry 10x', email: 'e.assargiotis@unsw.edu.au' },
    { name: 'Georgia Lyons', role: 'Program Manager', email: 'georgia.lyons@unsw.edu.au' },
    { name: 'Hamish McFarlane', role: 'MCIC Makerspace Coordinator', email: 'h.mcfarlane@unsw.edu.au' },
    { name: 'Joseph Po', role: 'Health Accelerator Program Manager', email: 'j.po@unsw.edu.au' },
    { name: 'Maddison McCoy', role: 'Community Manager, Engineering', email: 'm.mccoy@unsw.edu.au' },
    { name: 'Mariana Luis Castillo Patron', role: 'Community Manager', email: 'm.castillopatron@unsw.edu.au' },
    { name: 'Nina Juhl', role: 'Senior Manager, Entrepreneurship', email: 'n.juhl@unsw.edu.au' },
    { name: 'Priscilla Tan', role: 'Program Manager, Edu Entre', email: 'priscilla.tan@unsw.edu.au' },
    { name: 'Ria Kapoor', role: 'Comms Intern', email: 'ria.kapoor@unsw.edu.au' },
    { name: 'Sasha Whittle', role: 'Program Manager', email: 'sasha.whittle@unsw.edu.au' },
    { name: 'Steven Hiotis', role: 'Project Officer - Splice', email: 's.hiotis@unsw.edu.au' },
    { name: 'Tamara Berryman', role: 'Event Coordinator', email: 't.berryman@unsw.edu.au' },
    { name: 'Vern Chan', role: 'Global Program Manager', email: 'vern.chan@unsw.edu.au' },
    { name: 'Wisiani Wijaya', role: 'Investment Portfolio Coordinator', email: 'w.wijaya@unsw.edu.au' }
];

const SEEDED = doc(db, 'settings', 'foundersStaffSeeded');

function clean(value, max) {
    return String(value || '').trim().slice(0, max);
}

function staffId(email) {
    return clean(email, 200).toLowerCase().replace(/\//g, '');
}

function view(data) {
    return {
        name: data.name || '',
        role: data.role || '',
        email: String(data.email || '').toLowerCase()
    };
}

async function ensureSeeded() {
    const marker = await getDoc(SEEDED);
    if (marker.exists()) return;
    await Promise.all(SEED.map((person) => setDoc(doc(db, 'foundersStaff', staffId(person.email)), {
        ...person,
        email: person.email.toLowerCase(),
        updatedAt: new Date().toISOString()
    })));
    await setDoc(SEEDED, { seededAt: new Date().toISOString() });
}

export async function listFoundersStaff() {
    await ensureSeeded();
    const snapshot = await getDocs(collection(db, 'foundersStaff'));
    return snapshot.docs
        .map((entry) => view(entry.data()))
        .filter((person) => person.email && person.name)
        .sort((a, b) => a.name.localeCompare(b.name));
}

export async function staffByEmail(email) {
    const id = staffId(email);
    if (!id) return null;
    await ensureSeeded();
    const snapshot = await getDoc(doc(db, 'foundersStaff', id));
    if (!snapshot.exists()) return null;
    const person = view(snapshot.data());
    return person.email ? person : null;
}

export async function staffByName(name) {
    const needle = clean(name, 120).toLowerCase();
    if (!needle) return null;
    const people = await listFoundersStaff();
    return people.find((person) => person.name.toLowerCase() === needle) || null;
}

export async function saveFoundersStaff(input) {
    const email = clean(input.email, 200).toLowerCase();
    const name = clean(input.name, 120);
    const role = clean(input.role, 120);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) {
        const error = new Error('A name and email are required.');
        error.status = 400;
        throw error;
    }
    await ensureSeeded();
    await setDoc(doc(db, 'foundersStaff', staffId(email)), {
        name,
        role,
        email,
        updatedAt: new Date().toISOString()
    });
    return { name, role, email };
}

export async function removeFoundersStaff(email) {
    const id = staffId(email);
    if (!id) {
        const error = new Error('Choose a staff member to remove.');
        error.status = 400;
        throw error;
    }
    await deleteDoc(doc(db, 'foundersStaff', id));
}
