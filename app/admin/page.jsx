"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { firebaseAuth, watchAuth } from '../lib/clientAuth';
import { allows, ACCESS_GROUPS } from '../lib/access';
import { useAccess } from '../../components/useAccess';
import AffiliationFields, { EMPTY_AFFILIATION, affiliationError } from '../../components/AffiliationFields';
import Gate from '../../components/Gate';
import { DEFAULT_DESK_LAYOUT } from '../lib/deskLayout';
import { ACCESS_PIPELINE, pipelineStepOf } from '../lib/accessPipeline';
import { sessionIsActive } from '../lib/hotDesks';
import { casualShiftQuantity } from '../lib/casualStaff';
import { bookingEquipmentWindows, formatInventoryWindow, reservationWindows, withItemNames } from '../lib/inventoryBookings';
import { WORK_END, WORK_START } from '../lib/workingHours';
import { SITE_PAGE_GROUPS, canHidePage, pageIsHidden } from '../lib/sitePages';
import { durationLabel } from '../lib/casualTimesheets';
import { bookingQueueTag, holdAvailability } from '../lib/bookingRules';
import OrganiserField from '../../components/OrganiserField';
import DeskMap from '../../components/DeskMap';
import InventorySuggest from '../../components/InventorySuggest';

function clock(value) {
    const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '';
}

function bookingDates(booking) {
    const fromRecurrence = Array.isArray(booking.recurrence?.bookedDates)
        ? [...new Set(booking.recurrence.bookedDates.map(dateOnly).filter(Boolean))]
        : [];
    if (fromRecurrence.length) return fromRecurrence;
    const date = dateOnly(booking.bumpInDate);
    return date ? [date] : [''];
}

function timesOn(booking, date) {
    if (!booking) return null;
    const hold = Array.isArray(booking.tentativeHolds)
        ? booking.tentativeHolds.find((item) => dateOnly(item.bumpInDate) === date)
        : null;
    const source = hold || booking;
    return {
        bumpIn: clock(source.bumpIn),
        eventStart: clock(source.eventStart),
        eventEnd: clock(source.eventEnd),
        bumpOut: clock(source.bumpOut),
        space: hold?.space || booking.space || ''
    };
}

function eventOutsideHours(times) {
    if (!times) return false;
    return [times.bumpIn, times.eventStart].some((value) => value && value < WORK_START)
        || [times.eventEnd, times.bumpOut].some((value) => value && value > WORK_END);
}

function shiftOutsideHours(start, end) {
    const from = clock(start);
    const to = clock(end);
    return Boolean((from && from < WORK_START) || (to && to > WORK_END));
}

function askedForStaff(booking, requests) {
    if (booking.wantsCasualStaff === 'Yes' || booking.needsFoundersCasualStaff === 'Yes' || booking.requestCasualStaff) return true;
    return requests.some((request) => request.bookingId === booking.id);
}

function byShiftDate(a, b) {
    const byDate = String(a.date || '9999-99-99').localeCompare(String(b.date || '9999-99-99'));
    if (byDate) return byDate;
    return String(a.start || a.times?.eventStart || '').localeCompare(String(b.start || b.times?.eventStart || ''));
}

function casualRoster(bookings, requests) {
    const byId = new Map(bookings.map((booking) => [booking.id, booking]));
    const rows = [];
    bookings.forEach((booking) => {
        if (['DECLINED', 'CANCELLED'].includes(booking.status)) return;
        if (!askedForStaff(booking, [])) return;
        const shifts = Array.isArray(booking.casualStaffDetails) && booking.casualStaffDetails.length ? booking.casualStaffDetails : [{}];
        const dates = bookingDates(booking);
        shifts.forEach((shift, index) => {
            const shiftDates = shift.date ? [dateOnly(shift.date)].filter(Boolean) : dates;
            shiftDates.forEach((date) => {
                const times = timesOn(booking, date);
                const start = clock(shift.shiftStart);
                const end = clock(shift.shiftEnd);
                rows.push({
                    id: `booking:${booking.id}:${date}:${index}`,
                    date,
                    start,
                    end,
                    quantity: casualShiftQuantity(shift) || 1,
                    tasks: shift.tasks || '',
                    preferred: shift.preferredStaff || '',
                    event: booking.eventName || 'Untitled event',
                    place: times.space || booking.space || '',
                    times,
                    outsideShift: shiftOutsideHours(start, end),
                    outsideEvent: eventOutsideHours(times),
                    who: booking.mainContact?.name || '',
                    email: booking.organiserEmail || booking.mainContact?.email || '',
                    source: 'Booking form',
                    status: booking.status || ''
                });
            });
        });
    });
    requests.forEach((request) => {
        const booking = request.bookingId ? byId.get(request.bookingId) : null;
        if (booking && ['DECLINED', 'CANCELLED'].includes(booking.status)) return;
        const shifts = Array.isArray(request.shifts) && request.shifts.length ? request.shifts : [{}];
        const date = dateOnly(request.shiftDate);
        const times = timesOn(booking, date);
        shifts.forEach((shift, index) => {
            const start = clock(shift.shiftStart);
            const end = clock(shift.shiftEnd);
            rows.push({
                id: `request:${request.id}:${index}`,
                date,
                start,
                end,
                quantity: casualShiftQuantity(shift) || 1,
                tasks: shift.tasks || '',
                preferred: shift.preferredStaff || '',
                event: request.eventName || request.purpose || 'No event in particular',
                place: request.eventName ? (times?.space || request.space || '') : '',
                times,
                outsideShift: shiftOutsideHours(start, end),
                outsideEvent: eventOutsideHours(times),
                who: request.requesterName || '',
                email: request.requesterEmail || '',
                source: 'Casual staff page',
                status: request.status || 'PENDING'
            });
        });
    });
    return rows.sort(byShiftDate);
}

function unstaffedEvents(bookings, requests) {
    const rows = [];
    bookings.forEach((booking) => {
        if (['DECLINED', 'CANCELLED'].includes(booking.status)) return;
        if (askedForStaff(booking, requests)) return;
        bookingDates(booking).forEach((date) => {
            const times = timesOn(booking, date);
            rows.push({
                id: `missing:${booking.id}:${date}`,
                date,
                start: times.eventStart,
                event: booking.eventName || 'Untitled event',
                place: times.space || '',
                times,
                outsideEvent: eventOutsideHours(times),
                who: booking.mainContact?.name || '',
                email: booking.organiserEmail || booking.mainContact?.email || '',
                status: booking.status || ''
            });
        });
    });
    return rows.sort(byShiftDate);
}

function eventTimesLabel(times) {
    if (!times || ![times.bumpIn, times.eventStart, times.eventEnd, times.bumpOut].some(Boolean)) return 'No event times on file';
    const running = times.eventStart && times.eventEnd ? `${times.eventStart}–${times.eventEnd}` : 'start and end not set';
    const bump = [
        times.bumpIn ? `bump in ${times.bumpIn}` : '',
        times.bumpOut ? `bump out ${times.bumpOut}` : ''
    ].filter(Boolean).join(', ');
    return bump ? `Event ${running} · ${bump}` : `Event ${running}`;
}

const EMPTY_CASUAL = { name: '', email: '', zid: '', phone: '', payRate: '', group: 'General', notes: '' };

function assignedRoom(offer, shift) {
    const assigned = Array.isArray(offer?.assigned) ? offer.assigned : [];
    return assigned.length < (shift.quantity || 1);
}

function replyRows(offer) {
    const asked = Array.isArray(offer?.asked) ? offer.asked : [];
    const responses = Array.isArray(offer?.responses) ? offer.responses : [];
    const assigned = Array.isArray(offer?.assigned) ? offer.assigned : [];
    const byEmail = new Map(responses.map((response) => [response.email, response]));
    return asked.map((person) => {
        const response = byEmail.get(person.email);
        const booking = assigned.find((entry) => entry.email === person.email);
        let answer = 'waiting';
        if (booking) answer = 'booked';
        else if (response) answer = response.available ? 'yes' : 'no';
        return { ...person, answer, booking };
    });
}

function dateOnly(value) {
    const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
}

function shiftDate(iso, days) {
    const [year, month, day] = iso.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
    const nextDay = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${nextMonth}-${nextDay}`;
}

function inDateRange(iso, start, end) {
    if (!iso) return false;
    if (start && iso < start) return false;
    if (end && iso > end) return false;
    return true;
}

function money(value) {
    return `$${Number(value || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function splitExGst(amount) {
    const cents = Math.round(Number(amount || 0) * 100);
    const deposit = Math.round(cents / 2);
    return { deposit: deposit / 100, balance: (cents - deposit) / 100 };
}

function checkedIn(registration) {
    return registration.status === 'ATTENDED' || Boolean(registration.attendedAt);
}

function confirmedRegistration(registration) {
    return registration.status !== 'PENDING_REVIEW' && registration.status !== 'DENIED';
}

function registrationStanding(registration) {
    if (registration.status === 'PENDING_REVIEW') return 'Needs review';
    if (registration.status === 'DENIED') return 'Not confirmed';
    if (checkedIn(registration)) return 'Attended';
    return 'Registered';
}

const departmentBreakdown = [
    { dept: 'UNSW Engineering', share: 45, color: 'bg-black' },
    { dept: 'UNSW Business School', share: 25, color: 'bg-[#EAD64D]' },
    { dept: 'UNSW Art, Design & Architecture', share: 15, color: 'bg-[#555555]' },
    { dept: 'UNSW Science & Medicine', share: 10, color: 'bg-[#888888]' },
    { dept: 'External Partners', share: 5, color: 'bg-[#CCCCCC]' }
];

function wantsDedicatedDesk(application) {
    return application.wantsDesk === true
        || application.accessStatusNeeded === 'No'
        || application.deskRequestType === 'Formal Co-Working Dedicated Desk Request';
}

function applicationSortValue(application) {
    if (typeof application.waitlistOrder === 'number') return application.waitlistOrder;
    return application.createdAt || '';
}

function AdminDashboardPage() {
    const { ready: accessReady, access } = useAccess();
    const [activeTab, setActiveTab] = useState('reporting');
    const [startDate, setStartDate] = useState('2026-01-01');
    const [endDate, setEndDate] = useState('2026-12-31');
    const [paymentStart, setPaymentStart] = useState('2026-01-01');
    const [paymentEnd, setPaymentEnd] = useState('2026-12-31');
    const [organizerEmail, setOrganizerEmail] = useState('');
    const [organizerAuditResult, setOrganizerAuditResult] = useState(null);

    const [layout, setLayout] = useState(DEFAULT_DESK_LAYOUT);
    const [publishedLayout, setPublishedLayout] = useState(DEFAULT_DESK_LAYOUT);
    const [layoutMessage, setLayoutMessage] = useState('');
    const [layoutBusy, setLayoutBusy] = useState(false);
    const [ticketing, setTicketing] = useState(true);
    const [ticketingBusy, setTicketingBusy] = useState(false);
    const [ticketingMessage, setTicketingMessage] = useState('');
    const [hiddenPages, setHiddenPages] = useState([]);
    const [pageBusy, setPageBusy] = useState('');
    const [pageMessage, setPageMessage] = useState('');

    const [applications, setApplications] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [bans, setBans] = useState([]);
    const [banEmail, setBanEmail] = useState('');
    const [banName, setBanName] = useState('');
    const [banNote, setBanNote] = useState('');
    const [reviewMessage, setReviewMessage] = useState('');
    const [frameryReports, setFrameryReports] = useState([]);
    const [frameryDate, setFrameryDate] = useState('');
    const [frameryAverage, setFrameryAverage] = useState('');
    const [frameryTrend, setFrameryTrend] = useState('');
    const [frameryMessage, setFrameryMessage] = useState('');
    const [qrDesk, setQrDesk] = useState(null);
    const [hotDeskSessions, setHotDeskSessions] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [rsaCards, setRsaCards] = useState([]);
    const [casualRequests, setCasualRequests] = useState([]);
    const [casualSide, setCasualSide] = useState('requested');
    const [casualOffers, setCasualOffers] = useState([]);
    const [rosterPeople, setRosterPeople] = useState([]);
    const [rosterGroups, setRosterGroups] = useState(['General']);
    const [sendGroup, setSendGroup] = useState('General');
    const [rosterForm, setRosterForm] = useState(EMPTY_CASUAL);
    const [editingId, setEditingId] = useState('');
    const [groupName, setGroupName] = useState('');
    const [accessPeople, setAccessPeople] = useState([]);
    const [accessAccounts, setAccessAccounts] = useState([]);
    const [directory, setDirectory] = useState([]);
    const [staffDraft, setStaffDraft] = useState({ name: '', role: '', email: '' });
    const [accessEmail, setAccessEmail] = useState('');
    const [accessGroup, setAccessGroup] = useState('founders');
    const [accessAffiliation, setAccessAffiliation] = useState(EMPTY_AFFILIATION);
    const [accessName, setAccessName] = useState('');
    const [accessPhone, setAccessPhone] = useState('');
    const [accessNotice, setAccessNotice] = useState('');
    const [hoursShifts, setHoursShifts] = useState([]);
    const [budgetCodes, setBudgetCodes] = useState([]);
    const [budgetDraft, setBudgetDraft] = useState('');
    const [showArchivedHours, setShowArchivedHours] = useState(false);
    const [casualMessage, setCasualMessage] = useState('');
    const [casualBusy, setCasualBusy] = useState(false);
    const [items, setItems] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [alerts, setAlerts] = useState([]);

    const [residentQuery, setResidentQuery] = useState('');
    const [relationshipFilter, setRelationshipFilter] = useState('All');
    const [stageFilter, setStageFilter] = useState('All');
    const [deskFilter, setDeskFilter] = useState('All');
    const [personQuery, setPersonQuery] = useState('');
    const [selectedEmail, setSelectedEmail] = useState('');

    const [showAdminReport, setShowAdminReport] = useState(false);
    const [reportWhat, setReportWhat] = useState('');
    const [reportItemId, setReportItemId] = useState(null);
    const [reportInInventory, setReportInInventory] = useState(false);
    const [reportFinished, setReportFinished] = useState(false);
    const [reportWhere, setReportWhere] = useState('');
    const [reportDetails, setReportDetails] = useState('');
    const [reportMessage, setReportMessage] = useState('');

    useEffect(() => {
        getDoc(doc(db, 'settings', 'deskLayout')).then((snapshot) => {
            const data = snapshot.data();
            if (!data) return;
            if (Array.isArray(data.draft) && data.draft.length) setLayout(data.draft);
            else if (Array.isArray(data.published) && data.published.length) setLayout(data.published);
            if (Array.isArray(data.published) && data.published.length) setPublishedLayout(data.published);
        }).catch((error) => {
            console.error('Desk layout load failed:', error);
        });

        const stopApplications = onSnapshot(collection(db, 'coworkingApplications'), (snapshot) => {
            setApplications(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        });
        const stopItems = onSnapshot(collection(db, 'items'), (snapshot) => {
            setItems(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        });
        const stopReservations = onSnapshot(collection(db, 'asset_reservations'), (snapshot) => {
            setReservations(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        });
        const stopAlerts = onSnapshot(collection(db, 'alerts'), (snapshot) => {
            setAlerts(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        });
        const stopRegistrations = onSnapshot(collection(db, 'registrations'), (snapshot) => {
            setRegistrations(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        });
        const stopBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
            setBookings(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        });
        const stopRsaCards = onSnapshot(collection(db, 'rsaCards'), (snapshot) => {
            setRsaCards(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        });
        const stopBans = onSnapshot(collection(db, 'bans'), (snapshot) => {
            setBans(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        });
        const stopFramery = onSnapshot(collection(db, 'frameryReports'), (snapshot) => {
            setFrameryReports(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        });
        const stopHotDesks = onSnapshot(collection(db, 'hotDeskSessions'), (snapshot) => {
            setHotDeskSessions(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        });
        const stopCasualRequests = onSnapshot(collection(db, 'casualRequests'), (snapshot) => {
            setCasualRequests(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        });
        const stopCasualOffers = onSnapshot(collection(db, 'casualOffers'), (snapshot) => {
            setCasualOffers(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        });

        return () => {
            stopApplications();
            stopItems();
            stopReservations();
            stopAlerts();
            stopRegistrations();
            stopBookings();
            stopRsaCards();
            stopBans();
            stopFramery();
            stopHotDesks();
            stopCasualRequests();
            stopCasualOffers();
        };
    }, []);

    useEffect(() => {
        const tab = new URLSearchParams(window.location.search).get('tab');
        if (['reporting', 'coworking', 'inventory', 'database', 'casuals'].includes(tab)) {
            setActiveTab(tab);
        }
    }, []);

    const applyRoster = (data) => {
        setRosterPeople(data.people || []);
        setRosterGroups(data.groups?.length ? data.groups : ['General']);
        setSendGroup((current) => (data.groups || []).includes(current) ? current : (data.groups?.[0] || 'General'));
    };

    const loadRoster = async () => {
        const user = firebaseAuth().currentUser;
        if (!user) {
            setRosterPeople([]);
            setCasualMessage('Sign in with the admin email to see casual details.');
            return;
        }
        const token = await user.getIdToken();
        const response = await fetch('/api/casuals/roster', { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!data.success) {
            setCasualMessage(data.error || 'The casual roster could not be loaded.');
            return;
        }
        setCasualMessage((current) => (current.startsWith('Sign in') ? '' : current));
        applyRoster(data);
        const hoursResponse = await fetch('/api/casuals/hours/admin', { headers: { Authorization: `Bearer ${token}` } });
        const hours = await hoursResponse.json();
        if (hours.success) {
            setHoursShifts(hours.shifts || []);
            setBudgetCodes(hours.budgetCodes || []);
        }
    };

    useEffect(() => {
        let cancelled = false;
        fetch('/api/site')
            .then((response) => response.json())
            .then((data) => {
                if (!cancelled && data.success) {
                    setTicketing(data.ticketing !== false);
                    setHiddenPages(Array.isArray(data.hiddenPages) ? data.hiddenPages : []);
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    const toggleTicketing = async () => {
        const user = firebaseAuth().currentUser;
        if (!user) {
            setTicketingMessage('Sign in with an admin email to change ticketing.');
            return;
        }
        setTicketingBusy(true);
        setTicketingMessage('');
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/site', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketing: !ticketing })
            });
            const data = await response.json();
            if (!data.success) {
                setTicketingMessage(data.error || 'Ticketing could not be changed.');
                return;
            }
            setTicketing(data.ticketing !== false);
            setTicketingMessage(data.ticketing === false
                ? 'Ticketing is off. The booking form no longer asks for tickets, and Attend our Events is off the menu.'
                : 'Ticketing is back on.');
        } catch (error) {
            setTicketingMessage(error.message || 'Ticketing could not be changed.');
        } finally {
            setTicketingBusy(false);
        }
    };

    const togglePage = async (path) => {
        const user = firebaseAuth().currentUser;
        if (!user) {
            setPageMessage('Sign in with an admin email to hide a page.');
            return;
        }
        const hidden = !hiddenPages.includes(path);
        setPageBusy(path);
        setPageMessage('');
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/site', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, hidden })
            });
            const data = await response.json();
            if (!data.success) {
                setPageMessage(data.error || 'That page could not be updated.');
                return;
            }
            setHiddenPages(Array.isArray(data.hiddenPages) ? data.hiddenPages : []);
            window.dispatchEvent(new Event('mcic-site-settings'));
        } catch (error) {
            setPageMessage(error.message || 'That page could not be updated.');
        } finally {
            setPageBusy('');
        }
    };

    useEffect(() => {
        if (!accessReady) return;
        const levels = { reporting: 'admin', coworking: 'admin', inventory: 'admin', database: 'founders', casuals: 'admin', access: 'admin', pages: 'admin', staffing: 'admin', events: 'admin' };
        if (!allows(access, levels[activeTab] || 'admin')) setActiveTab('database');
    }, [accessReady, access, activeTab]);

    useEffect(() => {
        if (activeTab !== 'casuals') return undefined;
        return watchAuth((user) => {
            if (!user) {
                setRosterPeople([]);
                setCasualMessage('Sign in with the admin email to see casual details.');
                return;
            }
            loadRoster().catch((error) => setCasualMessage(error.message || 'The casual roster could not be loaded.'));
        });
    }, [activeTab]);

    const loadAccess = async () => {
        const user = firebaseAuth().currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const response = await fetch('/api/access', { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (data.success) {
            setAccessPeople(data.people || []);
            setAccessAccounts(data.accounts || []);
        } else setAccessNotice(data.error || 'Access could not be loaded.');
        const staffResponse = await fetch('/api/staff', { headers: { Authorization: `Bearer ${token}` } });
        const staffData = await staffResponse.json();
        if (staffData.success) setDirectory(staffData.staff || []);
    };

    useEffect(() => {
        if (activeTab === 'access') loadAccess().catch(() => setAccessNotice('Access could not be loaded.'));
    }, [activeTab]);

    const saveAccess = async (event) => {
        event.preventDefault();
        const user = firebaseAuth().currentUser;
        if (!user) return;
        if (!accessName.trim()) {
            setAccessNotice('Enter their full name.');
            return;
        }
        if (!accessPhone.trim()) {
            setAccessNotice('Enter their mobile phone.');
            return;
        }
        const affiliationProblem = affiliationError(accessAffiliation);
        if (affiliationProblem) {
            setAccessNotice(affiliationProblem);
            return;
        }
        setAccessNotice('');
        const token = await user.getIdToken();
        const response = await fetch('/api/access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ email: accessEmail, group: accessGroup, name: accessName, phone: accessPhone, ...accessAffiliation })
        });
        const data = await response.json();
        if (!data.success) {
            setAccessNotice(data.error || 'That person could not be saved.');
            return;
        }
        setAccessPeople(data.people || []);
        setAccessNotice(`Saved ${accessEmail}. They sign in with that email and a password they choose.`);
        setAccessEmail('');
        setAccessName('');
        setAccessPhone('');
        setAccessAffiliation(EMPTY_AFFILIATION);
    };

    const removeAccess = async (email) => {
        const user = firebaseAuth().currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const response = await fetch('/api/access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ action: 'remove', email })
        });
        const data = await response.json();
        if (data.success) setAccessPeople(data.people || []);
        else setAccessNotice(data.error || 'That person could not be removed.');
    };

    const saveStaffMember = async (event) => {
        event.preventDefault();
        const user = firebaseAuth().currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const response = await fetch('/api/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(staffDraft)
        });
        const data = await response.json();
        if (!data.success) {
            setAccessNotice(data.error || 'That staff member could not be saved.');
            return;
        }
        setDirectory(data.staff || []);
        setStaffDraft({ name: '', role: '', email: '' });
        setAccessNotice('Staff directory updated.');
    };

    const removeStaffMember = async (email) => {
        const user = firebaseAuth().currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const response = await fetch('/api/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ action: 'remove', email })
        });
        const data = await response.json();
        if (data.success) setDirectory(data.staff || []);
        else setAccessNotice(data.error || 'That staff member could not be removed.');
    };

    const unpublished = JSON.stringify(layout) !== JSON.stringify(publishedLayout);
    const deskRequests = useMemo(() => (
        applications
            .filter(wantsDedicatedDesk)
            .sort((a, b) => String(applicationSortValue(a)).localeCompare(String(applicationSortValue(b)), undefined, { numeric: true }))
    ), [applications]);

    const rangedRegistrations = registrations.filter((registration) => confirmedRegistration(registration) && inDateRange(dateOnly(registration.eventDate), startDate, endDate));
    const registrantCount = rangedRegistrations.length;
    const attendeeCount = rangedRegistrations.filter(checkedIn).length;

    const people = useMemo(() => {
        const byEmail = new Map();
        registrations.forEach((registration) => {
            const email = String(registration.answers?.email || '').trim().toLowerCase();
            if (!email) return;
            const answers = registration.answers || {};
            const existing = byEmail.get(email) || {
                email,
                name: '',
                phone: '',
                zid: '',
                events: []
            };
            const name = `${answers.firstName || ''} ${answers.lastName || ''}`.trim();
            if (name) existing.name = name;
            if (answers.phone) existing.phone = answers.phone;
            if (answers.zid) existing.zid = answers.zid;
            existing.events.push({
                id: registration.id,
                title: registration.eventTitle || 'Event',
                date: dateOnly(registration.eventDate),
                slug: registration.eventSlug || '',
                attended: checkedIn(registration),
                standing: registrationStanding(registration),
                attendedAt: registration.attendedAt || ''
            });
            byEmail.set(email, existing);
        });
        return [...byEmail.values()]
            .map((person) => ({
                ...person,
                events: person.events.sort((a, b) => String(b.date).localeCompare(String(a.date)))
            }))
            .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
    }, [registrations]);

    const filteredPeople = people.filter((person) => {
        const haystack = [person.name, person.email, person.zid, ...person.events.map((event) => event.title)].join(' ').toLowerCase();
        return !personQuery.trim() || haystack.includes(personQuery.trim().toLowerCase());
    });
    const selectedPerson = people.find((person) => person.email === selectedEmail) || null;

    const paymentRows = useMemo(() => {
        return bookings
            .filter((booking) => booking.status !== 'DECLINED' && booking.status !== 'CANCELLED')
            .flatMap((booking) => {
                const amounts = splitExGst(booking.quoteSummary?.subtotalExcludingTax);
                const who = booking.mainContact?.name || booking.organiserEmail || 'Organiser';
                const eventName = booking.eventName || 'Booking';
                const depositDue = dateOnly(booking.createdAt) || dateOnly(booking.bumpInDate);
                const balanceDue = dateOnly(booking.bumpInDate) ? shiftDate(dateOnly(booking.bumpInDate), -2) : '';
                const paid = booking.paymentRecord || {};
                return [
                    { id: `${booking.id}-deposit`, bookingId: booking.id, field: 'depositPaid', who, what: `${eventName} · Deposit`, space: booking.space || '', cost: amounts.deposit, due: depositDue, paid: Number(paid.depositPaid || 0), status: booking.status },
                    { id: `${booking.id}-balance`, bookingId: booking.id, field: 'balancePaid', who, what: `${eventName} · Balance`, space: booking.space || '', cost: amounts.balance, due: balanceDue, paid: Number(paid.balancePaid || 0), status: booking.status }
                ];
            })
            .filter((row) => inDateRange(row.due, paymentStart, paymentEnd))
            .sort((a, b) => String(a.due).localeCompare(String(b.due)));
    }, [bookings, paymentStart, paymentEnd]);

    const paymentExpected = paymentRows.reduce((sum, row) => sum + row.cost, 0);
    const paymentReceived = paymentRows.reduce((sum, row) => sum + row.paid, 0);
    const paymentOutstanding = paymentExpected - paymentReceived;
    const sortedFramery = [...frameryReports].sort((a, b) => String(b.fortnightEnding || '').localeCompare(String(a.fortnightEnding || '')));
    const latestFramery = sortedFramery[0];
    const pendingReviews = registrations.filter((registration) => registration.status === 'PENDING_REVIEW');
    const casualShifts = useMemo(() => casualRoster(bookings, casualRequests), [bookings, casualRequests]);
    const offersByShift = useMemo(() => {
        const map = new Map();
        casualOffers.forEach((offer) => {
            if (offer.shiftKey) map.set(offer.shiftKey, offer);
        });
        return map;
    }, [casualOffers]);
    const eventsWithoutStaff = useMemo(() => unstaffedEvents(bookings, casualRequests), [bookings, casualRequests]);
    const bookingRequests = useMemo(() => {
        const approved = bookings.filter((booking) => booking.status === 'APPROVED');
        return bookings
            .filter((booking) => (booking.status || 'PENDING') === 'PENDING')
            .map((booking) => ({
                ...booking,
                queueTag: bookingQueueTag(booking, approved),
                holdTags: holdAvailability(booking, approved)
            }))
            .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    }, [bookings]);
    const hotDeskOccupancy = hotDeskSessions.reduce((map, session) => {
        if (sessionIsActive(session)) map[session.id] = { name: session.occupantName };
        return map;
    }, {});

    const borrowedItems = items.filter((item) => Number(item.checkedOutQty) > 0 || (item.status && item.status !== 'Available'));
    const openAlerts = [...alerts].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    const filteredApplications = applications
        .filter((application) => {
            const haystack = [
                application.fullName,
                application.email,
                application.startupName,
                application.zID,
                application.phone
            ].join(' ').toLowerCase();
            const matchesQuery = !residentQuery.trim() || haystack.includes(residentQuery.trim().toLowerCase());
            const matchesRelationship = relationshipFilter === 'All' || application.relationshipToUNSW === relationshipFilter;
            const matchesStage = stageFilter === 'All' || application.ventureStage === stageFilter;
            const matchesDesk = deskFilter === 'All'
                || (deskFilter === 'Desk' && wantsDedicatedDesk(application))
                || (deskFilter === 'Access only' && !wantsDedicatedDesk(application));
            return matchesQuery && matchesRelationship && matchesStage && matchesDesk;
        })
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    const handleOrganizerAudit = (event) => {
        event.preventDefault();
        if (!organizerEmail) return;
        setOrganizerAuditResult({
            email: organizerEmail,
            totalBookings: 6,
            repeatStatus: 'Repeat Hirer (High Frequency)',
            rating: '4.9 / 5.0',
            lastEvent: 'AI In Healthcare Workshop (12 Aug 2026)'
        });
    };

    const saveLayout = async (publish) => {
        setLayoutBusy(true);
        setLayoutMessage('');
        try {
            const payload = publish
                ? { draft: layout, published: layout, publishedAt: new Date().toISOString() }
                : { draft: layout, draftSavedAt: new Date().toISOString() };
            await setDoc(doc(db, 'settings', 'deskLayout'), payload, { merge: true });
            if (publish) setPublishedLayout(layout);
            setLayoutMessage(publish
                ? 'The coworking desk map now shows this layout.'
                : 'Saved in admin. The coworking page is unchanged until you click Update.');
        } catch (error) {
            console.error('Desk layout save failed:', error);
            setLayoutMessage('The layout could not be saved.');
        } finally {
            setLayoutBusy(false);
        }
    };

    const moveRequest = async (id, direction) => {
        const index = deskRequests.findIndex((application) => application.id === id);
        const nextIndex = index + direction;
        if (index < 0 || nextIndex < 0 || nextIndex >= deskRequests.length) return;
        const reordered = deskRequests.slice();
        const [moved] = reordered.splice(index, 1);
        reordered.splice(nextIndex, 0, moved);
        await Promise.all(reordered.map((application, order) => (
            updateDoc(doc(db, 'coworkingApplications', application.id), { waitlistOrder: order })
        )));
    };

    const setPipeline = async (id, step) => {
        await updateDoc(doc(db, 'coworkingApplications', id), {
            pipelineStep: step,
            pipelineUpdatedAt: new Date().toISOString()
        });
    };

    const submitAdminReport = async (event) => {
        event.preventDefault();
        if (!reportWhat.trim() || !reportWhere.trim() || !reportDetails.trim()) return;
        try {
            await addDoc(collection(db, 'alerts'), {
                type: 'Maintenance / Damaged Asset',
                item: reportWhat.trim(),
                itemId: reportInInventory ? reportItemId : null,
                inInventory: Boolean(reportInInventory && reportItemId),
                location: reportWhere.trim(),
                description: reportDetails.trim(),
                reporter: 'Admin',
                status: 'Pending',
                createdAt: new Date().toISOString()
            });
            setReportWhat('');
            setReportItemId(null);
            setReportInInventory(false);
            setReportFinished(false);
            setReportWhere('');
            setReportDetails('');
            setShowAdminReport(false);
            setReportMessage('Added to the maintenance list.');
        } catch (error) {
            console.error('Admin maintenance report failed:', error);
            setReportMessage('The report could not be saved.');
        }
    };

    const resolveAlert = async (id) => {
        await updateDoc(doc(db, 'alerts', id), { status: 'Resolved' });
    };

    const saveFrameryReport = async (submitEvent) => {
        submitEvent.preventDefault();
        setFrameryMessage('');
        const dailyAverage = frameryAverage.trim();
        const trend = frameryTrend.trim();
        if (!frameryDate || !dailyAverage || !trend) return;
        await addDoc(collection(db, 'frameryReports'), {
            fortnightEnding: frameryDate,
            dailyAverage,
            trend,
            spaces: 2,
            createdAt: new Date().toISOString()
        });
        setFrameryAverage('');
        setFrameryTrend('');
        setFrameryMessage('Fortnight saved.');
    };

    const addBan = async (submitEvent) => {
        submitEvent.preventDefault();
        const email = banEmail.trim().toLowerCase();
        if (!email) return;
        if (bans.some((entry) => String(entry.email || '').toLowerCase() === email)) {
            setReviewMessage('That email is already on the banned list.');
            return;
        }
        await addDoc(collection(db, 'bans'), {
            email,
            name: banName.trim(),
            note: banNote.trim(),
            createdAt: new Date().toISOString()
        });
        setBanEmail('');
        setBanName('');
        setBanNote('');
        setReviewMessage('Added to the banned list.');
    };

    const reviewRegistration = async (id, decision) => {
        setReviewMessage('');
        const user = firebaseAuth().currentUser;
        if (!user) {
            setReviewMessage('Sign in with the admin email to approve or deny.');
            return;
        }
        const token = await user.getIdToken();
        const response = await fetch('/api/registrations/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ id, decision })
        });
        const data = await response.json();
        if (!data.success) {
            setReviewMessage(data.error || 'The review could not be saved.');
            return;
        }
        if (decision === 'DENIED') {
            setReviewMessage('Registration denied. Email them yourself if you need to.');
            return;
        }
        setReviewMessage(data.emailSent ? 'Approved, and the ticket email was sent.' : `Approved. The ticket email was not sent: ${data.emailError}`);
    };

    const rosterRequest = async (body) => {
        const user = firebaseAuth().currentUser;
        if (!user) {
            setCasualMessage('Sign in with the admin email to change the roster.');
            return false;
        }
        setCasualBusy(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/casuals/roster', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!data.success) {
                setCasualMessage(data.error || 'That casual could not be saved.');
                return false;
            }
            applyRoster(data);
            setCasualMessage('Casual roster saved.');
            return true;
        } finally {
            setCasualBusy(false);
        }
    };

    const saveCasualForm = () => rosterRequest({ person: { ...rosterForm, id: editingId } });

    const saveHoursOrganiser = async (shift) => {
        const user = firebaseAuth().currentUser;
        if (!user) {
            setCasualMessage('Sign in with the admin email to change the organiser.');
            return;
        }
        setCasualBusy(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/casuals/hours/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(shift)
            });
            const data = await response.json();
            if (!data.success) {
                setCasualMessage(data.error || 'The organiser could not be saved.');
                return;
            }
            setHoursShifts(data.shifts || []);
            if (data.budgetCodes) setBudgetCodes(data.budgetCodes);
            setCasualMessage(data.shift?.emailError ? `Organiser saved. Their email was not sent: ${data.shift.emailError}` : 'Organiser saved.');
        } finally {
            setCasualBusy(false);
        }
    };

    const markPayroll = async (shift, payrollSent) => {
        if (!shift.id || shift.status !== 'approved') {
            setCasualMessage('Approve the hours before marking them sent to payroll.');
            return;
        }
        const user = firebaseAuth().currentUser;
        if (!user) {
            setCasualMessage('Sign in with the admin email to update payroll.');
            return;
        }
        setHoursShifts((current) => current.map((entry) => entry.id === shift.id ? { ...entry, payrollSent } : entry));
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/casuals/hours/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action: 'payroll', id: shift.id, payrollSent })
            });
            const data = await response.json();
            if (!data.success) {
                setHoursShifts((current) => current.map((entry) => entry.id === shift.id ? { ...entry, payrollSent: !payrollSent } : entry));
                setCasualMessage(data.error || 'That payroll tick could not be saved.');
                return;
            }
            setHoursShifts(data.shifts || []);
            if (data.budgetCodes) setBudgetCodes(data.budgetCodes);
            setCasualMessage(payrollSent ? 'Marked as sent to payroll.' : 'Payroll tick cleared.');
        } catch (error) {
            setHoursShifts((current) => current.map((entry) => entry.id === shift.id ? { ...entry, payrollSent: !payrollSent } : entry));
            setCasualMessage(error.message || 'That payroll tick could not be saved.');
        }
    };

    const hoursRequest = async (body, successMessage) => {
        const user = firebaseAuth().currentUser;
        if (!user) {
            setCasualMessage('Sign in with the admin email to update casual hours.');
            return false;
        }
        setCasualBusy(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/casuals/hours/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!data.success) {
                setCasualMessage(data.error || 'That could not be saved.');
                return false;
            }
            setHoursShifts(data.shifts || []);
            setBudgetCodes(data.budgetCodes || []);
            setCasualMessage(successMessage);
            return true;
        } finally {
            setCasualBusy(false);
        }
    };

    const chooseCasual = (id) => {
        setEditingId(id);
        const person = rosterPeople.find((entry) => entry.id === id);
        setRosterForm(person ? {
            name: person.name,
            email: person.email,
            zid: person.zid,
            phone: person.phone,
            payRate: person.payRate,
            group: person.group,
            notes: person.notes
        } : { ...EMPTY_CASUAL, group: sendGroup });
    };

    const askCasuals = async () => {
        setCasualMessage('');
        const user = firebaseAuth().currentUser;
        if (!user) {
            setCasualMessage('Sign in with the admin email to send shifts.');
            return;
        }
        setCasualBusy(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/casuals/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    group: sendGroup,
                    shifts: casualShifts.map((shift) => ({
                        id: shift.id,
                        date: shift.date,
                        start: shift.start,
                        end: shift.end,
                        quantity: shift.quantity,
                        tasks: shift.tasks,
                        preferred: shift.preferred,
                        event: shift.event,
                        place: shift.place,
                        times: shift.times,
                        who: shift.who,
                        organiserEmail: shift.email
                    }))
                })
            });
            const data = await response.json();
            if (!data.success) {
                setCasualMessage(data.error || 'The shifts could not be sent.');
                return;
            }
            const parts = [`Asked ${data.asked} casual${data.asked === 1 ? '' : 's'} in ${data.group || sendGroup}.`];
            if (data.sent !== data.asked) parts.push(`Emails went to ${data.sent}.`);
            if (data.failed?.length) parts.push(data.failed.join(' '));
            if (data.missing?.length) parts.push(`No email saved yet: ${data.missing.join(', ')}.`);
            setCasualMessage(parts.join(' '));
        } finally {
            setCasualBusy(false);
        }
    };

    const bookCasual = async (shift, person) => {
        setCasualMessage('');
        const user = firebaseAuth().currentUser;
        if (!user) {
            setCasualMessage('Sign in with the admin email to book a casual.');
            return;
        }
        setCasualBusy(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/casuals/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ shiftKey: shift.id, email: person.email })
            });
            const data = await response.json();
            if (!data.success) {
                setCasualMessage(data.error || 'That casual could not be booked.');
                return;
            }
            if (data.calendarEventId) {
                setCasualMessage(`${data.name} is booked, and the calendar hold was sent.`);
                return;
            }
            if (!data.emailError) {
                setCasualMessage(`${data.name} is booked. The calendar hold was not created (${data.calendarError}). The shift details were emailed instead.`);
                return;
            }
            setCasualMessage(`${data.name} is booked on the list. The calendar hold was not created (${data.calendarError}). The email was not sent (${data.emailError}).`);
        } finally {
            setCasualBusy(false);
        }
    };

    const savePaid = async (row, amount) => {
        const paid = Number.isFinite(amount) && amount > 0 ? amount : 0;
        await updateDoc(doc(db, 'bookings', row.bookingId), {
            [`paymentRecord.${row.field}`]: paid
        });
    };

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">
            <div className="max-w-7xl mx-auto px-6 sm:px-12 py-10 space-y-8">
                <header className="bg-white p-6 sm:p-8 border border-gray-200 rounded-sm shadow-xs space-y-4">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-black">
                        MCIC Admin Dashboard
                    </h1>
                    {access.admin && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={toggleTicketing}
                                disabled={ticketingBusy}
                                className="px-4 py-3 text-xs font-bold uppercase tracking-wider bg-black text-[#EAD64D] rounded-sm disabled:opacity-50"
                            >
                                {ticketing ? 'Turn off ticketing' : 'Turn ticketing back on'}
                            </button>
                            <p className="text-sm text-gray-600">
                                {ticketing
                                    ? 'Ticket setup is on the booking form, and Attend our Events is in the menu.'
                                    : 'Ticket setup is hidden, and Attend our Events is off the menu.'}
                            </p>
                        </div>
                    )}
                    {ticketingMessage && <p className="text-sm font-semibold">{ticketingMessage}</p>}
                </header>

                <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
                    {[
                        { id: 'staffing', label: 'Casual Staffing', level: 'admin' },
                        { id: 'events', label: 'Events', level: 'admin' },
                        { id: 'reporting', label: 'Reporting', level: 'admin' },
                        { id: 'coworking', label: 'Coworking', level: 'admin' },
                        { id: 'inventory', label: 'Inventory', level: 'admin' },
                        { id: 'database', label: 'Database', level: 'founders' },
                        { id: 'casuals', label: 'Casual staff', level: 'admin' },
                        { id: 'access', label: 'Access', level: 'admin' },
                        { id: 'pages', label: 'All pages', level: 'admin' }
                    ].filter((tab) => allows(access, tab.level)).map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-sm transition-all duration-150 cursor-pointer ${activeTab === tab.id
                                ? 'bg-black text-[#EAD64D] shadow-xs'
                                : 'bg-white text-gray-700 hover:bg-neutral-100 border border-gray-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {(activeTab === 'staffing' || activeTab === 'events') && (
                    <section className="bg-white border border-gray-200 rounded-sm p-6 space-y-4">
                        <h2 className="text-xl font-extrabold uppercase">{activeTab === 'staffing' ? 'Casual Staffing' : 'Events'}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(activeTab === 'staffing' ? [
                                ['/casuals', 'Book casual staff'],
                                ['/casuals/available', 'Shift availability'],
                                ['/casuals/hours', 'My shifts'],
                                ['/timesheets', 'Submit a Timesheet'],
                                ['/casuals/approve', 'Approve casual hours']
                            ] : [
                                ['/boards', 'Event countdown'],
                                ['/boards/spaces', 'Spaces today'],
                                ['/events', 'Attend our Events'],
                                ['/my-bookings', 'My bookings']
                            ]).filter(([href]) => (href !== '/events' || ticketing) && !pageIsHidden(href, hiddenPages)).map(([href, label]) => (
                                <Link key={href} href={href} className="border border-gray-200 p-4 text-sm font-bold hover:border-black">
                                    {label}
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {activeTab === 'pages' && (
                    <section className="bg-white border border-gray-200 rounded-sm p-6 space-y-6">
                        <div>
                            <h2 className="text-xl font-extrabold uppercase">All pages</h2>
                            <p className="text-sm text-gray-600">Hide takes a page off the menu and out of the site. Publish puts it back. Admin and sign in stay available so this list can still be opened.</p>
                        </div>
                        {pageMessage && <p className="text-sm font-semibold">{pageMessage}</p>}
                        {SITE_PAGE_GROUPS.map((group) => (
                            <div key={group.title} className="space-y-2">
                                <h3 className="text-xs font-black uppercase tracking-wider">{group.title}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {group.pages.map(([href, label]) => {
                                        const hidden = hiddenPages.includes(href);
                                        return (
                                            <div key={href + label} className="border border-gray-200 p-3 text-sm flex items-start justify-between gap-3">
                                                <a href={href} className="min-w-0 hover:underline">
                                                    <span className="block font-bold">{label}</span>
                                                    <span className="text-xs text-gray-500">{href}{hidden ? ' · Hidden' : ''}</span>
                                                </a>
                                                {canHidePage(href) ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePage(href)}
                                                        disabled={pageBusy === href}
                                                        className="shrink-0 px-3 py-2 text-[10px] font-bold uppercase tracking-wider border border-black rounded-sm disabled:opacity-50"
                                                    >
                                                        {hidden ? 'Publish' : 'Hide'}
                                                    </button>
                                                ) : (
                                                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Stays available</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </section>
                )}
                {activeTab === 'access' && (
                    <section className="bg-white border border-gray-200 rounded-sm p-6 space-y-4">
                        <div>
                            <h2 className="text-xl font-extrabold uppercase">Access</h2>
                            <p className="text-sm text-gray-600">Add an email to Admin, Founders general staff, or Casual staff. They sign in with that email and a password they choose. Anyone else can create their own account from the sign-in page and is treated as Others.</p>
                        </div>
                        {accessNotice && <p className="text-sm font-semibold">{accessNotice}</p>}
                        <form onSubmit={saveAccess} className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input type="email" required value={accessEmail} onChange={(event) => setAccessEmail(event.target.value)} placeholder="name@unsw.edu.au" className="flex-1 p-2 border border-gray-200 rounded-sm text-sm" />
                                <select value={accessGroup} onChange={(event) => setAccessGroup(event.target.value)} className="p-2 border border-gray-200 rounded-sm text-sm">
                                    {ACCESS_GROUPS.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
                                </select>
                                <button type="submit" className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider bg-black text-[#EAD64D] rounded-sm">Add</button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input type="text" required value={accessName} onChange={(event) => setAccessName(event.target.value)} placeholder="Full name" className="p-2 border border-gray-200 rounded-sm text-sm" />
                                <input type="tel" required value={accessPhone} onChange={(event) => setAccessPhone(event.target.value)} placeholder="Mobile phone" className="p-2 border border-gray-200 rounded-sm text-sm" />
                            </div>
                            <AffiliationFields value={accessAffiliation} onChange={setAccessAffiliation} />
                        </form>
                        <div className="space-y-2 text-sm">
                            {accessPeople.length === 0 && <p className="text-gray-500">No one has been added yet. Emails in the server admin list still have admin access.</p>}
                            {accessPeople.map((person) => (
                                <div key={person.email} className="flex items-center justify-between gap-3 border border-gray-200 p-3">
                                    <span>{person.email} · {ACCESS_GROUPS.find((group) => group.id === person.group)?.label || person.group}{person.userType ? ` · ${person.userType}${person.department ? `, ${person.department}` : ''}` : ''}</span>
                                    <button type="button" onClick={() => removeAccess(person.email)} className="text-[10px] font-bold uppercase tracking-wider border border-gray-300 px-2 py-1 rounded-sm">Remove</button>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2 text-sm border-t border-gray-200 pt-4">
                            <h3 className="font-extrabold uppercase">Signed-in accounts</h3>
                            <p className="text-gray-600">These are people who have signed in with email and password. The login itself stays in Firebase Authentication. Others appear here after they create their own account.</p>
                            {accessAccounts.length === 0 && <p className="text-gray-500">No one has signed in yet.</p>}
                            {accessAccounts.map((account) => (
                                <p key={account.email} className="border border-gray-200 p-3">
                                    {account.email} · {ACCESS_GROUPS.find((group) => group.id === account.group)?.label || 'Others'}{account.userType ? ` · ${account.userType}${account.department ? `, ${account.department}` : ''}` : ''}
                                    {account.lastSeenAt ? ` · last signed in ${account.lastSeenAt.slice(0, 16).replace('T', ' ')}` : ''}
                                </p>
                            ))}
                        </div>
                        <div className="space-y-3 text-sm border-t border-gray-200 pt-4">
                            <h3 className="font-extrabold uppercase">Founders staff directory</h3>
                            <p className="text-gray-600">This list is used by the doorbell and the shift organiser dropdown. It is stored in Firebase, so adding someone here does not need a code change.</p>
                            <form onSubmit={saveStaffMember} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                <input required value={staffDraft.name} onChange={(event) => setStaffDraft({ ...staffDraft, name: event.target.value })} placeholder="Name" className="p-2 border border-gray-200 rounded-sm" />
                                <input value={staffDraft.role} onChange={(event) => setStaffDraft({ ...staffDraft, role: event.target.value })} placeholder="Role" className="p-2 border border-gray-200 rounded-sm" />
                                <input type="email" required value={staffDraft.email} onChange={(event) => setStaffDraft({ ...staffDraft, email: event.target.value })} placeholder="Email" className="p-2 border border-gray-200 rounded-sm" />
                                <button type="submit" className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider bg-black text-[#EAD64D] rounded-sm">Save staff member</button>
                            </form>
                            {directory.map((person) => (
                                <div key={person.email} className="flex items-center justify-between gap-3 border border-gray-200 p-3">
                                    <span>{person.name}{person.role ? ` · ${person.role}` : ''} · {person.email}</span>
                                    <button type="button" onClick={() => removeStaffMember(person.email)} className="text-[10px] font-bold uppercase tracking-wider border border-gray-300 px-2 py-1 rounded-sm">Remove</button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                {activeTab === 'reporting' && (
                    <div className="space-y-8">
                        <section className="bg-white border border-gray-200 rounded-sm p-6 space-y-4">
                            <div>
                                <h2 className="text-lg font-extrabold uppercase">Booking requests</h2>
                                <p className="text-sm text-gray-600">Listed in the order they were received. Each request is Held until you accept a booking for that time. After that, the other requests for the same time are tagged Unavailable.</p>
                            </div>
                            {bookingRequests.length === 0 && <p className="text-sm text-gray-500">No booking requests are waiting.</p>}
                            {bookingRequests.map((booking) => (
                                <a key={booking.id} href={`/admin/approve?id=${booking.id}`} className="block border border-gray-200 p-4 hover:border-black space-y-1">
                                    <p className="text-xs font-bold uppercase tracking-wider">
                                        <span className={`inline-block px-2 py-0.5 rounded-sm ${booking.queueTag === 'Unavailable' ? 'bg-rose-100 text-rose-800' : 'bg-[#EAD64D] text-black'}`}>
                                            {booking.queueTag}
                                        </span>
                                    </p>
                                    <p className="font-black">{booking.eventName || 'Untitled booking'}</p>
                                    <p className="text-sm text-neutral-700">{booking.space}</p>
                                    <p className="text-sm text-neutral-700">{booking.bumpInDate} · {booking.bumpIn}–{booking.bumpOut}</p>
                                    {Array.isArray(booking.tentativeHolds) && booking.tentativeHolds.length > 1 && booking.tentativeHolds.map((hold, index) => (
                                        <p key={`${booking.id}-${index}`} className="text-xs text-neutral-700">
                                            Hold {index + 1}: {hold.bumpInDate} · {hold.bumpIn}–{hold.bumpOut} · {hold.space}
                                            <span className={`ml-2 font-bold uppercase ${booking.holdTags?.[index] === 'Unavailable' ? 'text-rose-800' : 'text-black'}`}>{booking.holdTags?.[index]}</span>
                                        </p>
                                    ))}
                                </a>
                            ))}
                        </section>
                        <section className="bg-white border border-gray-200 rounded-sm p-6 space-y-4">
                            <div>
                                <h2 className="text-lg font-extrabold uppercase">RSA cards</h2>
                                <p className="text-sm text-gray-600">Add the expiry date from the card. That person will not be asked to upload again until the day after it expires.</p>
                            </div>
                            {rsaCards.length === 0 && <p className="text-sm text-gray-500">No RSA cards have been uploaded.</p>}
                            {[...rsaCards].sort((a, b) => String(a.expiryDate || '').localeCompare(String(b.expiryDate || '')) || String(a.email || a.id).localeCompare(String(b.email || b.id))).map((card) => (
                                <div key={card.id} className="border border-gray-200 p-4 space-y-2">
                                    <p className="font-bold">{card.email || card.id}</p>
                                    <p className="text-sm text-neutral-700">{card.fileName || 'RSA card'}{card.uploadedAt ? ` · uploaded ${card.uploadedAt.slice(0, 10)}` : ''}</p>
                                    {card.fileData && (
                                        <a href={card.fileData} target="_blank" rel="noreferrer" className="text-sm font-bold underline">View card</a>
                                    )}
                                    <label className="flex items-center gap-2 text-sm">
                                        <span className="font-bold">Expiry</span>
                                        <input
                                            type="date"
                                            value={card.expiryDate || ''}
                                            onChange={(event) => updateDoc(doc(db, 'rsaCards', card.id), { expiryDate: event.target.value })}
                                            className="p-2 border border-gray-200 rounded-sm"
                                        />
                                    </label>
                                </div>
                            ))}
                        </section>
                        <section className="space-y-6">
                            <div className="bg-white p-6 border border-gray-200 rounded-sm shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h2 className="text-lg font-extrabold uppercase text-black">Events</h2>
                                    <p className="text-xs text-gray-500">Registrants and checked-in attendees use the event date in this range.</p>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="flex flex-col">
                                        <label className="text-[10px] font-mono font-bold uppercase text-gray-400">From</label>
                                        <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="p-2 border border-gray-300 rounded-xs text-xs font-mono bg-neutral-50 focus:border-black outline-none" />
                                    </div>
                                    <span className="text-gray-400 font-bold pt-3">-</span>
                                    <div className="flex flex-col">
                                        <label className="text-[10px] font-mono font-bold uppercase text-gray-400">To</label>
                                        <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="p-2 border border-gray-300 rounded-xs text-xs font-mono bg-neutral-50 focus:border-black outline-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white p-6 border border-gray-200 rounded-sm shadow-xs space-y-1">
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">1. Booked & Cancelled Events</span>
                                    <span className="text-3xl font-black text-black">28 Booked</span>
                                    <span className="text-[11px] text-red-500 font-bold block pt-1">3 Cancelled (89% Execution)</span>
                                </div>
                                <div className="bg-white p-6 border border-gray-200 rounded-sm shadow-xs space-y-1">
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">2. Registrants</span>
                                    <span className="text-3xl font-black text-black">{registrantCount.toLocaleString('en-AU')}</span>
                                    <span className="text-[11px] text-neutral-500 block pt-1">Attendees checked in: {attendeeCount.toLocaleString('en-AU')}</span>
                                </div>
                                <div className="bg-white p-6 border border-gray-200 rounded-sm shadow-xs space-y-1">
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">4. Repeat Hirer Ratio</span>
                                    <span className="text-3xl font-black text-[#EAD64D] bg-black px-2 py-0.5 rounded-xs inline-block">68%</span>
                                    <span className="text-[11px] text-emerald-600 font-bold block pt-1">↑ High service quality rating</span>
                                </div>
                                <div className="bg-white p-6 border border-gray-200 rounded-sm shadow-xs space-y-1">
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">5. Quote value, ex GST</span>
                                    <span className="text-3xl font-black text-black">{money(paymentExpected)}</span>
                                    <span className="text-[11px] text-gray-500 block pt-1">Received {money(paymentReceived)} · To come {money(paymentOutstanding)}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                <div className="lg:col-span-6 bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 border-b border-gray-100 pb-3">Organizer Roll History Audit</h3>
                                    <form onSubmit={handleOrganizerAudit} className="flex gap-2">
                                        <input type="email" value={organizerEmail} onChange={(event) => setOrganizerEmail(event.target.value)} placeholder="Enter organizer email" className="p-3 border border-gray-300 text-xs font-semibold rounded-xs outline-none focus:border-black text-black w-full bg-neutral-50" />
                                        <button type="submit" className="bg-black text-[#EAD64D] font-extrabold px-4 py-3 text-xs uppercase tracking-wider rounded-xs hover:bg-[#EAD64D] hover:text-black transition-colors shrink-0">Audit Hirer</button>
                                    </form>
                                    {organizerAuditResult ? (
                                        <div className="p-4 bg-neutral-900 text-white rounded-xs space-y-2 text-xs">
                                            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                                                <span className="font-bold text-[#EAD64D]">{organizerAuditResult.email}</span>
                                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-xs font-mono uppercase font-bold">{organizerAuditResult.repeatStatus}</span>
                                            </div>
                                            <p className="text-gray-300">Total Completed Bookings: <strong>{organizerAuditResult.totalBookings} events</strong></p>
                                            <p className="text-gray-300">Avg Feedback Score Given: <strong>{organizerAuditResult.rating}</strong></p>
                                            <p className="text-gray-400 text-[11px] font-mono pt-1">Last Reservation: {organizerAuditResult.lastEvent}</p>
                                        </div>
                                    ) : (
                                        <div className="p-6 border border-dashed border-gray-200 bg-neutral-50 text-center rounded-xs text-xs text-gray-500">
                                            Enter a hirer&apos;s UNSW email above to inspect booking frequency, historical attendance, and repeat status.
                                        </div>
                                    )}
                                </div>
                                <div className="lg:col-span-6 bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 border-b border-gray-100 pb-3">Institutional Performance Shares</h3>
                                    <div className="space-y-4">
                                        {departmentBreakdown.map((dept) => (
                                            <div key={dept.dept} className="space-y-1.5">
                                                <div className="flex justify-between text-xs font-bold uppercase text-black">
                                                    <span>{dept.dept}</span>
                                                    <span className="font-mono">{dept.share}%</span>
                                                </div>
                                                <div className="w-full bg-neutral-100 h-3 rounded-full overflow-hidden">
                                                    <div className={`${dept.color} h-full rounded-full`} style={{ width: `${dept.share}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-4">
                            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-extrabold uppercase text-black">Payments</h2>
                                    <p className="text-xs text-gray-500">Deposit and balance from each booking quote. Cost is ex GST. The deposit is due when the booking is sent. The balance is due two days before the event.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                        <label className="text-[10px] font-mono font-bold uppercase text-gray-400">Due from</label>
                                        <input type="date" value={paymentStart} onChange={(event) => setPaymentStart(event.target.value)} className="p-2 border border-gray-300 rounded-xs text-xs font-mono bg-neutral-50 focus:border-black outline-none" />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[10px] font-mono font-bold uppercase text-gray-400">Due to</label>
                                        <input type="date" value={paymentEnd} onChange={(event) => setPaymentEnd(event.target.value)} className="p-2 border border-gray-300 rounded-xs text-xs font-mono bg-neutral-50 focus:border-black outline-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div className="border border-gray-200 p-3"><span className="block text-[10px] uppercase text-gray-400">Expected</span><span className="text-lg font-black">{money(paymentExpected)}</span></div>
                                <div className="border border-gray-200 p-3"><span className="block text-[10px] uppercase text-gray-400">Received</span><span className="text-lg font-black">{money(paymentReceived)}</span></div>
                                <div className="border border-gray-200 p-3"><span className="block text-[10px] uppercase text-gray-400">To come</span><span className="text-lg font-black">{money(paymentOutstanding)}</span></div>
                            </div>
                            {paymentRows.length === 0 ? (
                                <p className="text-xs text-gray-500 border border-dashed border-gray-300 p-6 text-center">No quote payments are due in this date range.</p>
                            ) : (
                                <div className="border border-gray-200 rounded-xs overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-neutral-900 text-white font-bold uppercase text-[10px] tracking-wider">
                                            <tr>
                                                <th className="py-3 px-4">Who</th>
                                                <th className="py-3 px-4">What</th>
                                                <th className="py-3 px-4">Cost (ex GST)</th>
                                                <th className="py-3 px-4">Due</th>
                                                <th className="py-3 px-4">Paid</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {paymentRows.map((row) => (
                                                <tr key={row.id}>
                                                    <td className="py-3 px-4 font-bold">{row.who}</td>
                                                    <td className="py-3 px-4">{row.what}{row.space ? <span className="block text-gray-500">{row.space}</span> : null}<span className="block text-[10px] uppercase text-gray-400">{row.status}</span></td>
                                                    <td className="py-3 px-4 font-mono">{money(row.cost)}</td>
                                                    <td className="py-3 px-4 font-mono">{row.due || '—'}</td>
                                                    <td className="py-3 px-4">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            defaultValue={row.paid ? row.paid.toFixed(2) : ''}
                                                            key={`${row.id}-${row.paid}`}
                                                            onBlur={(event) => savePaid(row, Number(event.target.value))}
                                                            placeholder="0.00"
                                                            className="w-24 p-2 border border-gray-300 rounded-xs font-mono"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        <section className="bg-white p-6 border border-gray-200 rounded-sm shadow-xs space-y-4">
                            <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-extrabold uppercase text-black">Desks</h2>
                                    <p className="text-xs text-gray-500">Active card holders and desk allocations divided by workstation type.</p>
                                </div>
                                <span className="bg-black text-[#EAD64D] text-xs font-black px-3 py-1 rounded-xs uppercase font-mono">Total EIR Clearance: 42 Active</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 border border-gray-200 bg-neutral-50 rounded-xs space-y-2">
                                    <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">Allocated Desks</span>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-2xl font-black text-black">18 / 20</span>
                                        <span className="text-xs font-bold text-emerald-600">90% Full</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500">Reserved for dedicated 10x Accelerator startups.</p>
                                </div>
                                <div className="p-4 border border-gray-200 bg-neutral-50 rounded-xs space-y-2">
                                    <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">Hot Desks</span>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-2xl font-black text-black">14 / 24</span>
                                        <span className="text-xs font-bold text-neutral-600">58% Occupied</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500">Equipped with external monitors and USB-C hubs.</p>
                                </div>
                                <div className="p-4 border border-gray-200 bg-neutral-50 rounded-xs space-y-2">
                                    <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">Informal Coworking</span>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-2xl font-black text-black">10 / 30</span>
                                        <span className="text-xs font-bold text-emerald-600">33% Occupied</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500">Lounges, high benches, and informal break-out tables.</p>
                                </div>
                            </div>
                            <div className="border-t border-gray-100 pt-4 space-y-4">
                                <div>
                                    <h3 className="text-sm font-extrabold uppercase">Framery pods</h3>
                                    <p className="text-xs text-gray-500">Two pods. Add the weekday figures each fortnight. Earlier fortnights stay in the list.</p>
                                </div>
                                {latestFramery && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-4 border border-gray-200 rounded-xs space-y-1">
                                            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">Daily average usage per space</span>
                                            <p className="text-2xl font-black">{latestFramery.dailyAverage}</p>
                                            <p className="text-[11px] text-gray-500">On average each space was used this much during weekdays.</p>
                                            <p className="text-[10px] font-mono text-gray-400">Fortnight ending {latestFramery.fortnightEnding}</p>
                                        </div>
                                        <div className="p-4 border border-gray-200 rounded-xs space-y-1">
                                            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">Trend of average usage</span>
                                            <p className="text-2xl font-black">{latestFramery.trend}</p>
                                            <p className="text-[11px] text-gray-500">When compared to the previous two weeks, this is how much the daily average usage per space has changed.</p>
                                        </div>
                                    </div>
                                )}
                                <form onSubmit={saveFrameryReport} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                                    <label className="text-[10px] font-bold uppercase text-gray-500 space-y-1">
                                        Fortnight ending
                                        <input required type="date" value={frameryDate} onChange={(event) => setFrameryDate(event.target.value)} className="w-full p-2 border border-gray-300 rounded-xs text-xs font-mono" />
                                    </label>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 space-y-1">
                                        Daily average
                                        <input required value={frameryAverage} onChange={(event) => setFrameryAverage(event.target.value)} placeholder="3h 9min" className="w-full p-2 border border-gray-300 rounded-xs text-xs" />
                                    </label>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 space-y-1">
                                        Trend
                                        <input required value={frameryTrend} onChange={(event) => setFrameryTrend(event.target.value)} placeholder="+27min" className="w-full p-2 border border-gray-300 rounded-xs text-xs" />
                                    </label>
                                    <button type="submit" className="bg-black text-[#EAD64D] font-bold text-xs uppercase py-2.5 rounded-xs">Add fortnight</button>
                                </form>
                                {frameryMessage && <p className="text-xs font-bold">{frameryMessage}</p>}
                                {sortedFramery.length > 0 && (
                                    <div className="border border-gray-200 rounded-xs overflow-hidden">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-neutral-100 text-[10px] uppercase tracking-wider">
                                                <tr>
                                                    <th className="py-2 px-3">Fortnight ending</th>
                                                    <th className="py-2 px-3">Daily average per space</th>
                                                    <th className="py-2 px-3">Trend</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {sortedFramery.map((entry) => (
                                                    <tr key={entry.id}>
                                                        <td className="py-2 px-3 font-mono">{entry.fortnightEnding}</td>
                                                        <td className="py-2 px-3">{entry.dailyAverage}</td>
                                                        <td className="py-2 px-3">{entry.trend}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'coworking' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 border border-gray-200 rounded-sm shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-extrabold text-black uppercase">Desk map</h2>
                                <p className="text-xs text-gray-500 mt-1">Drag a desk onto another to swap who sits there, or edit the name and person. Save keeps this version in admin. Update publishes it to the coworking page.</p>
                                {unpublished && <p className="text-xs font-bold text-amber-700 mt-2">This map has changes that are not on the coworking page yet.</p>}
                                {layoutMessage && <p className="text-xs font-bold text-black mt-2">{layoutMessage}</p>}
                            </div>
                            <div className="flex gap-2">
                                <button type="button" disabled={layoutBusy} onClick={() => saveLayout(false)} className="px-4 py-3 text-xs font-bold uppercase tracking-wider bg-white border border-gray-300 rounded-sm hover:border-black disabled:opacity-50">Save</button>
                                <button type="button" disabled={layoutBusy} onClick={() => saveLayout(true)} className="px-4 py-3 text-xs font-bold uppercase tracking-wider bg-black text-[#EAD64D] rounded-sm hover:bg-[#EAD64D] hover:text-black disabled:opacity-50">Update</button>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs overflow-x-auto">
                            <DeskMap layout={layout} editable onLayoutChange={setLayout} occupancy={hotDeskOccupancy} onHotDeskQr={setQrDesk} />
                            {qrDesk && (
                                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
                                    <div className="bg-white border border-gray-200 rounded-sm p-6 max-w-sm w-full text-center space-y-4">
                                        <h3 className="text-lg font-extrabold uppercase">{qrDesk.label}</h3>
                                        <p className="text-xs text-gray-500">Print this and put it on the desk. Scanning it checks that desk in or out. It is available again at midnight.</p>
                                        <img src={`/api/desks/qr?key=${encodeURIComponent(qrDesk.key)}`} alt={`QR code for ${qrDesk.label}`} className="mx-auto w-56 h-56" />
                                        <div className="flex gap-2 justify-center">
                                            <a href={`/coworking/desk/${encodeURIComponent(qrDesk.key)}/print`} target="_blank" rel="noreferrer" className="px-4 py-2 text-xs font-bold uppercase bg-black text-[#EAD64D] rounded-xs">Print</a>
                                            <button type="button" onClick={() => setQrDesk(null)} className="px-4 py-2 text-xs font-bold uppercase border border-gray-300 rounded-xs">Close</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <section className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-4">
                            <div>
                                <h2 className="text-xl font-extrabold uppercase text-black">Desk request waitlist</h2>
                                <p className="text-xs text-gray-500">Applications from the coworking form that asked for a dedicated desk. Move a request up or down the list.</p>
                            </div>
                            {deskRequests.length === 0 ? (
                                <p className="text-xs text-gray-500 border border-dashed border-gray-300 p-6 text-center">No desk requests have been submitted yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {deskRequests.map((application, index) => (
                                        <article key={application.id} className="border border-gray-200 p-4 rounded-xs flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="space-y-1 text-xs">
                                                <p className="font-black uppercase">{index + 1}. {application.fullName} · {application.startupName}</p>
                                                <p>{application.email} · {application.phone} · {application.zID || 'No zID'}</p>
                                                <p>{application.relationshipToUNSW} · {application.ventureStage}</p>
                                                <p>Desks requested: {application.desksRequestedCount || 1}</p>
                                                <p className="text-gray-500">{application.accessStatusNeeded}</p>
                                                <p className="text-gray-600">{application.projectDescription}</p>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button type="button" disabled={index === 0} onClick={() => moveRequest(application.id, -1)} className="px-3 py-2 text-[10px] font-bold uppercase border border-gray-300 rounded-xs disabled:opacity-30">Up</button>
                                                <button type="button" disabled={index === deskRequests.length - 1} onClick={() => moveRequest(application.id, 1)} className="px-3 py-2 text-[10px] font-bold uppercase border border-gray-300 rounded-xs disabled:opacity-30">Down</button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-4">
                            <div>
                                <h2 className="text-xl font-extrabold uppercase text-black">Entrepreneurs in Residence</h2>
                                <p className="text-xs text-gray-500">Every application from the coworking form. Move someone through the pipeline and that step is what they see when they search their name on the coworking page.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <input value={residentQuery} onChange={(event) => setResidentQuery(event.target.value)} placeholder="Search name, email, startup, or zID" className="p-3 border border-gray-300 text-xs rounded-xs md:col-span-1" />
                                <select value={relationshipFilter} onChange={(event) => setRelationshipFilter(event.target.value)} className="p-3 border border-gray-300 text-xs rounded-xs">
                                    <option>All</option>
                                    <option>Student</option>
                                    <option>Staff</option>
                                    <option>Alumni</option>
                                    <option>Other</option>
                                </select>
                                <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} className="p-3 border border-gray-300 text-xs rounded-xs">
                                    <option>All</option>
                                    <option>Idea Stage / Early Research</option>
                                    <option>Minimum Viable Product (MVP)</option>
                                    <option>In-Market / Active Users</option>
                                    <option>Scaling / Funded Startup</option>
                                </select>
                                <select value={deskFilter} onChange={(event) => setDeskFilter(event.target.value)} className="p-3 border border-gray-300 text-xs rounded-xs">
                                    <option>All</option>
                                    <option>Desk</option>
                                    <option>Access only</option>
                                </select>
                            </div>
                            {filteredApplications.length === 0 ? (
                                <p className="text-xs text-gray-500 border border-dashed border-gray-300 p-6 text-center">No applications match.</p>
                            ) : (
                                <div className="space-y-3">
                                    {filteredApplications.map((application) => (
                                        <article key={application.id} className="border border-gray-200 p-4 rounded-xs text-xs space-y-2">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <p className="font-black uppercase">{application.fullName} · {application.startupName}</p>
                                                    <p>{application.email} · {application.phone} · {application.zID || 'No zID'}</p>
                                                    <p>{application.relationshipToUNSW} · {application.ventureStage}</p>
                                                    <p>{wantsDedicatedDesk(application) ? `Desk request: ${application.desksRequestedCount || 1}` : 'Access only'}</p>
                                                    <p className="text-gray-600">{application.projectDescription}</p>
                                                    <p className="text-gray-400">{application.createdAt ? new Date(application.createdAt).toLocaleString() : ''}</p>
                                                </div>
                                                <label className="text-[10px] font-bold uppercase text-gray-500 space-y-1 shrink-0">
                                                    Pipeline
                                                    <select
                                                        value={pipelineStepOf(application)}
                                                        onChange={(event) => setPipeline(application.id, Number(event.target.value))}
                                                        className="block w-full sm:w-48 p-2 border border-gray-300 text-xs rounded-xs"
                                                    >
                                                        {ACCESS_PIPELINE.map((step) => (
                                                            <option key={step.step} value={step.step}>{step.step}. {step.title}</option>
                                                        ))}
                                                    </select>
                                                </label>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="space-y-6">
                        <section className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-4">
                            <div>
                                <h2 className="text-xl font-extrabold uppercase text-black">Checkouts</h2>
                                <p className="text-xs text-gray-500">Items that are out now, and the next inventory bookings so you can see when each one is needed again.</p>
                            </div>
                            {borrowedItems.length === 0 ? (
                                <p className="text-xs text-gray-500 border border-dashed border-gray-300 p-6 text-center">Nothing is currently checked out.</p>
                            ) : (
                                <div className="border border-gray-200 rounded-xs overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-neutral-900 text-white font-bold uppercase text-[10px] tracking-wider">
                                            <tr>
                                                <th className="py-3 px-4">Item</th>
                                                <th className="py-3 px-4">Borrower</th>
                                                <th className="py-3 px-4">Checked out</th>
                                                <th className="py-3 px-4">Next booking</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {borrowedItems.map((item) => {
                                                const upcoming = withItemNames([
                                                    ...reservations.flatMap(reservation => reservationWindows(reservation)),
                                                    ...bookings.flatMap(booking => bookingEquipmentWindows(booking))
                                                ], items);
                                                const next = upcoming
                                                    .filter(window => window.itemId === String(item.id).toUpperCase() && window.end > new Date())
                                                    .sort((a, b) => a.start - b.start)[0];
                                                return (
                                                    <tr key={item.id}>
                                                        <td className="py-3 px-4 font-bold">{item.name}</td>
                                                        <td className="py-3 px-4">{item.user || '—'}</td>
                                                        <td className="py-3 px-4">{item.checkedOutAt ? new Date(item.checkedOutAt).toLocaleString('en-AU') : '—'}</td>
                                                        <td className="py-3 px-4">{next ? formatInventoryWindow(next) : 'None'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div className="pt-2">
                                <h3 className="text-sm font-extrabold uppercase text-black">Upcoming inventory bookings</h3>
                            </div>
                            {(() => {
                                const upcoming = withItemNames([
                                    ...reservations.flatMap(reservation => reservationWindows(reservation)),
                                    ...bookings.flatMap(booking => bookingEquipmentWindows(booking))
                                ], items).filter(window => window.end > new Date()).sort((a, b) => a.start - b.start);
                                if (!upcoming.length) return <p className="text-xs text-gray-500">No upcoming inventory bookings.</p>;
                                return (
                                    <ul className="space-y-1">
                                        {upcoming.map((window, index) => (
                                            <li key={`${window.itemId}-${window.start.toISOString()}-${index}`} className="text-xs text-neutral-800">{formatInventoryWindow(window)}</li>
                                        ))}
                                    </ul>
                                );
                            })()}
                        </section>

                        <section className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-extrabold uppercase text-black">Maintenance</h2>
                                    <p className="text-xs text-gray-500">Reports submitted against an inventory item, and reports of something broken in the building.</p>
                                </div>
                                <button type="button" onClick={() => setShowAdminReport((open) => !open)} className="px-4 py-3 text-xs font-bold uppercase tracking-wider bg-black text-[#EAD64D] rounded-sm">
                                    Add something broken
                                </button>
                            </div>
                            {reportMessage && <p className="text-xs font-bold">{reportMessage}</p>}
                            {showAdminReport && (
                                <form onSubmit={submitAdminReport} className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-gray-200 p-4 rounded-xs">
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
                                    <input required value={reportWhere} onChange={(event) => setReportWhere(event.target.value)} placeholder="Where" className="p-3 border border-gray-300 text-xs rounded-xs" />
                                    <textarea required value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder="What you noticed" className="sm:col-span-2 p-3 border border-gray-300 text-xs rounded-xs h-20" />
                                    <button type="submit" className="sm:col-span-2 bg-[#EAD64D] text-black font-bold text-xs uppercase py-3 rounded-xs">Save report</button>
                                </form>
                            )}
                            {openAlerts.length === 0 ? (
                                <p className="text-xs text-gray-500 border border-dashed border-gray-300 p-6 text-center">No maintenance reports yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {openAlerts.map((alert) => (
                                        <article key={alert.id} className="border border-gray-200 p-4 rounded-xs flex flex-col sm:flex-row justify-between gap-3">
                                            <div className="text-xs space-y-1">
                                                <p className="font-black uppercase">{alert.item} {alert.inInventory === false && <span className="ml-2 inline-block text-[10px] font-bold uppercase tracking-wider text-neutral-700 bg-neutral-100 border border-neutral-300 px-2 py-0.5 rounded-full">Not in inventory</span>}</p>
                                                <p>{alert.location} · {alert.type}</p>
                                                <p className="text-gray-600">{alert.description}</p>
                                                <p className="text-gray-400">{alert.reporter || 'Inventory report'} · {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ''}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase">{alert.status || 'Pending'}</span>
                                                {alert.status !== 'Resolved' && (
                                                    <button type="button" onClick={() => resolveAlert(alert.id)} className="px-3 py-2 text-[10px] font-bold uppercase bg-emerald-600 text-white rounded-xs">Mark resolved</button>
                                                )}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === 'database' && (
                    <div className="space-y-6">
                    <section className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-4">
                        <div>
                            <h2 className="text-xl font-extrabold uppercase text-black">Banned from programs, events, and spaces</h2>
                            <p className="text-xs text-gray-500">Anyone who registers with one of these email addresses is held for review. You get an email, then you approve or deny it here. If you need to write to them, do that from your own email.</p>
                        </div>
                        {reviewMessage && <p className="text-xs font-bold">{reviewMessage}</p>}
                        <form onSubmit={addBan} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                            <input required type="email" value={banEmail} onChange={(event) => setBanEmail(event.target.value)} placeholder="Email" className="p-2 border border-gray-300 rounded-xs text-xs" />
                            <input value={banName} onChange={(event) => setBanName(event.target.value)} placeholder="Name" className="p-2 border border-gray-300 rounded-xs text-xs" />
                            <input value={banNote} onChange={(event) => setBanNote(event.target.value)} placeholder="Note" className="p-2 border border-gray-300 rounded-xs text-xs" />
                            <button type="submit" className="bg-black text-[#EAD64D] font-bold text-xs uppercase py-2.5 rounded-xs">Add to list</button>
                        </form>
                        {bans.length === 0 ? (
                            <p className="text-xs text-gray-500 border border-dashed border-gray-300 p-4 text-center">No one is on the banned list.</p>
                        ) : (
                            <div className="space-y-2">
                                {bans.map((entry) => (
                                    <div key={entry.id} className="border border-gray-200 p-3 rounded-xs flex justify-between gap-3 text-xs">
                                        <div>
                                            <p className="font-bold">{entry.name || entry.email}</p>
                                            <p className="text-gray-500">{entry.email}{entry.note ? ` · ${entry.note}` : ''}</p>
                                        </div>
                                        <button type="button" onClick={() => deleteDoc(doc(db, 'bans', entry.id))} className="text-[10px] font-bold uppercase text-gray-500">Remove</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="border-t border-gray-100 pt-4 space-y-3">
                            <h3 className="text-sm font-extrabold uppercase">Waiting for your decision</h3>
                            {pendingReviews.length === 0 ? (
                                <p className="text-xs text-gray-500">No registrations are waiting.</p>
                            ) : pendingReviews.map((registration) => {
                                const answers = registration.answers || {};
                                const person = `${answers.firstName || ''} ${answers.lastName || ''}`.trim();
                                return (
                                    <article key={registration.id} className="border border-gray-200 p-3 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                        <div>
                                            <p className="font-bold">{person || answers.email}</p>
                                            <p className="text-gray-500">{answers.email} · {registration.eventTitle}{registration.eventDate ? ` · ${registration.eventDate}` : ''}</p>
                                            {registration.banNote && <p className="text-gray-500">Ban note: {registration.banNote}</p>}
                                            {registration.reviewEmailError && <p className="text-gray-500">The review email was not sent: {registration.reviewEmailError}</p>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => reviewRegistration(registration.id, 'APPROVED')} className="px-3 py-2 text-[10px] font-bold uppercase bg-black text-[#EAD64D] rounded-xs">Approve</button>
                                            <button type="button" onClick={() => reviewRegistration(registration.id, 'DENIED')} className="px-3 py-2 text-[10px] font-bold uppercase border border-gray-300 rounded-xs">Deny</button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                    <section className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-4">
                        <div>
                            <h2 className="text-xl font-extrabold uppercase text-black">People</h2>
                            <p className="text-xs text-gray-500">Everyone who has registered for an event. The record is kept by email address.</p>
                        </div>
                        <input value={personQuery} onChange={(event) => setPersonQuery(event.target.value)} placeholder="Search name, email, or event" className="w-full p-3 border border-gray-300 text-xs rounded-xs" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="space-y-2 max-h-[32rem] overflow-auto">
                                {filteredPeople.length === 0 ? (
                                    <p className="text-xs text-gray-500 border border-dashed border-gray-300 p-6 text-center">No one matches.</p>
                                ) : filteredPeople.map((person) => (
                                    <button
                                        key={person.email}
                                        type="button"
                                        onClick={() => setSelectedEmail(person.email)}
                                        className={`w-full text-left border p-3 rounded-xs text-xs ${selectedEmail === person.email ? 'border-black bg-neutral-50' : 'border-gray-200'}`}
                                    >
                                        <span className="font-black uppercase block">{person.name || 'No name'}</span>
                                        <span className="text-gray-500">{person.email}</span>
                                        <span className="block text-gray-400">{person.events.length} registration{person.events.length === 1 ? '' : 's'} · {person.events.filter((event) => event.attended).length} attended</span>
                                    </button>
                                ))}
                            </div>
                            <div className="border border-gray-200 p-4 rounded-xs text-xs min-h-40">
                                {!selectedPerson ? (
                                    <p className="text-gray-500">Select a person to see the events they registered for or attended.</p>
                                ) : (
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[10px] uppercase text-gray-400">Email</p>
                                            <p className="font-black">{selectedPerson.email}</p>
                                            <p className="font-bold uppercase mt-2">{selectedPerson.name || 'No name recorded'}</p>
                                            <p>{selectedPerson.phone || 'No phone'} · {selectedPerson.zid || 'No zID'}</p>
                                        </div>
                                        <div className="space-y-2">
                                            {selectedPerson.events.map((event) => (
                                                <article key={event.id} className="border border-gray-200 p-3 rounded-xs">
                                                    <p className="font-bold">{event.title}</p>
                                                    <p className="text-gray-500">{event.date || 'No date'} · {event.standing}</p>
                                                </article>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                    </div>
                )}

                {activeTab === 'casuals' && (
                    <section className="bg-white border border-gray-200 p-6 rounded-sm shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-extrabold uppercase text-black">Casual staff</h2>
                                <p className="text-xs text-gray-500 max-w-xl">
                                    {casualSide === 'requested'
                                        ? 'Requests from the event booking form and the casual staff page, ordered by the date of the shift. Event times are shown so you can compare them with the shift.'
                                        : 'Events with no casual staff request, ordered by event date, so a missing request is easy to spot.'}
                                    {' '}Anything before {WORK_START} or after {WORK_END} is marked.
                                </p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {[
                                    { id: 'requested', label: 'Staff requested' },
                                    { id: 'missing', label: 'No staff requested' }
                                ].map((side) => (
                                    <button
                                        key={side.id}
                                        type="button"
                                        onClick={() => setCasualSide(side.id)}
                                        className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-sm cursor-pointer ${casualSide === side.id ? 'bg-black text-[#EAD64D]' : 'bg-white text-gray-700 border border-gray-200'}`}
                                    >
                                        {side.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                Send to group
                                <select value={sendGroup} onChange={(event) => setSendGroup(event.target.value)} className="mt-1 block w-full sm:w-56 p-2 border border-gray-200 rounded-sm text-xs font-semibold text-black normal-case">
                                    {rosterGroups.map((group) => <option key={group} value={group}>{group}</option>)}
                                </select>
                            </label>
                            <button type="button" onClick={askCasuals} disabled={casualBusy || casualShifts.length === 0} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider bg-black text-[#EAD64D] rounded-sm cursor-pointer disabled:opacity-40">Send these shifts</button>
                        </div>
                        {casualMessage && <p className="text-xs font-semibold">{casualMessage}</p>}
                        <details className="border border-gray-200 rounded-xs">
                            <summary className="cursor-pointer px-4 py-3 text-sm font-black uppercase">Casual roster · {rosterPeople.filter((person) => !person.archived).length} active</summary>
                            <div className="px-4 pb-4 space-y-4 text-xs">
                                <p className="text-gray-500">zID, phone, pay rate, and notes are encrypted in the database and only load here after you sign in with the admin email.</p>
                                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                                    <label className="flex-1">
                                        Casual
                                        <select value={editingId} onChange={(event) => chooseCasual(event.target.value)} className="mt-1 w-full p-2 border border-gray-200 rounded-sm font-semibold">
                                            <option value="">Add a casual</option>
                                            {rosterPeople.map((person) => (
                                                <option key={person.id} value={person.id}>{person.name} · {person.group}{person.archived ? ' · archived' : ''}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>
                                        New group
                                        <span className="mt-1 flex gap-2">
                                            <input value={groupName} onChange={(event) => setGroupName(event.target.value)} className="p-2 border border-gray-200 rounded-sm" />
                                            <button type="button" disabled={casualBusy} onClick={() => rosterRequest({ action: 'addGroup', name: groupName }).then((saved) => { if (saved) setGroupName(''); })} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider border border-gray-300 rounded-sm cursor-pointer">Add group</button>
                                        </span>
                                    </label>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {[
                                        ['name', 'Name'],
                                        ['email', 'Email'],
                                        ['zid', 'zID'],
                                        ['phone', 'Phone'],
                                        ['payRate', 'Pay rate'],
                                        ['group', 'Group']
                                    ].map(([key, label]) => (
                                        <label key={key}>
                                            {label}
                                            {key === 'group' ? (
                                                <input list="casual-group-names" value={rosterForm.group} onChange={(event) => setRosterForm({ ...rosterForm, group: event.target.value })} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" />
                                            ) : (
                                                <input value={rosterForm[key]} onChange={(event) => setRosterForm({ ...rosterForm, [key]: event.target.value })} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" />
                                            )}
                                        </label>
                                    ))}
                                    <label className="sm:col-span-2">
                                        Notes
                                        <input value={rosterForm.notes} onChange={(event) => setRosterForm({ ...rosterForm, notes: event.target.value })} className="mt-1 w-full p-2 border border-gray-200 rounded-sm" />
                                    </label>
                                </div>
                                <datalist id="casual-group-names">
                                    {rosterGroups.map((group) => <option key={group} value={group} />)}
                                </datalist>
                                <div className="flex gap-2">
                                    <button type="button" disabled={casualBusy} onClick={saveCasualForm} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider bg-black text-[#EAD64D] rounded-sm cursor-pointer disabled:opacity-40">{editingId ? 'Save casual' : 'Add casual'}</button>
                                    {editingId && (
                                        <button
                                            type="button"
                                            disabled={casualBusy}
                                            onClick={() => {
                                                const person = rosterPeople.find((entry) => entry.id === editingId);
                                                rosterRequest({ action: person?.archived ? 'restore' : 'archive', id: editingId });
                                            }}
                                            className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider border border-gray-300 rounded-sm cursor-pointer"
                                        >
                                            {rosterPeople.find((entry) => entry.id === editingId)?.archived ? 'Restore casual' : 'Archive casual'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </details>
                        <div className="border border-gray-200 rounded-xs p-4 space-y-3">
                            <div>
                                <h2 className="text-sm font-black uppercase">Hours for payroll</h2>
                                <p className="text-xs text-gray-500">The organiser chooses a budget code or rejects the shift with a note. Rejected shifts stay here until you archive them. Highlighted rows are still waiting for a timesheet. Tick a row once you have entered it in the official payroll site.</p>
                            </div>
                            <div className="space-y-2 text-xs">
                                <p className="font-black uppercase text-[10px] tracking-wider">Budget codes</p>
                                <div className="flex gap-2">
                                    <input value={budgetDraft} onChange={(event) => setBudgetDraft(event.target.value)} placeholder="Add a budget code" className="flex-1 p-2 border border-gray-200 rounded-sm" />
                                    <button
                                        type="button"
                                        disabled={casualBusy}
                                        onClick={() => {
                                            const code = budgetDraft.trim();
                                            if (!code) return;
                                            hoursRequest({ action: 'codes', codes: [...budgetCodes, code] }, 'Budget code saved.').then((saved) => { if (saved) setBudgetDraft(''); });
                                        }}
                                        className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider border border-gray-300 rounded-sm cursor-pointer disabled:opacity-40"
                                    >Add code</button>
                                </div>
                                {budgetCodes.length === 0 ? (
                                    <p className="text-gray-500">No budget codes yet. Add the codes the organiser should choose from.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {budgetCodes.map((code) => (
                                            <button key={code} type="button" disabled={casualBusy} onClick={() => hoursRequest({ action: 'codes', codes: budgetCodes.filter((item) => item !== code) }, 'Budget code removed.')} className="px-2 py-1 border border-gray-300 rounded-sm cursor-pointer">{code} ×</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <label className="flex items-center gap-2 text-xs font-bold">
                                <input type="checkbox" checked={showArchivedHours} onChange={(event) => setShowArchivedHours(event.target.checked)} />
                                Show archived
                            </label>
                            {hoursShifts.filter((shift) => showArchivedHours || !shift.archived).length === 0 ? (
                                <p className="text-xs text-gray-500 border border-dashed border-gray-300 p-6 text-center">{hoursShifts.some((shift) => shift.archived) ? 'Archived shifts are hidden.' : 'No rostered hours yet.'}</p>
                            ) : (
                                <div className="space-y-3">
                                    {hoursShifts.filter((shift) => !shift.archived && shift.status === 'open').length > 0 && (
                                        <p className="text-[10px] font-black uppercase tracking-wider bg-[#EAD64D] text-black inline-block px-2 py-0.5">{hoursShifts.filter((shift) => !shift.archived && shift.status === 'open').length} timesheet{hoursShifts.filter((shift) => !shift.archived && shift.status === 'open').length === 1 ? '' : 's'} outstanding</p>
                                    )}
                                    {hoursShifts.filter((shift) => showArchivedHours || !shift.archived).map((shift, index) => {
                                        const outstanding = shift.status === 'open' && !shift.archived;
                                        const same = (entry) => shift.id ? entry.id === shift.id : entry.shiftKey === shift.shiftKey && entry.casualName === shift.casualName && entry.casualEmail === shift.casualEmail;
                                        return (
                                        <article key={shift.id || `${shift.casualEmail || shift.casualName}-${shift.shiftKey}-${index}`} className={`border p-3 rounded-xs text-xs space-y-2 ${outstanding ? 'border-[#EAD64D] bg-[#EAD64D]/20' : 'border-gray-200'}`}>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="font-black uppercase">{shift.date || 'No date'} · {shift.casualName || 'Casual'}</p>
                                                <span className="flex flex-wrap gap-1">
                                                    {outstanding && <span className="text-[10px] font-black uppercase tracking-wider bg-[#EAD64D] text-black px-2 py-0.5">Timesheet outstanding</span>}
                                                    {shift.status === 'rejected' && <span className="text-[10px] font-black uppercase tracking-wider bg-black text-[#EAD64D] px-2 py-0.5">{shift.archived ? 'Archived' : 'Rejected'}</span>}
                                                    {shift.source === 'added' && <span className="text-[10px] font-black uppercase tracking-wider bg-[#EAD64D] text-black px-2 py-0.5">Not rostered</span>}
                                                </span>
                                            </div>
                                            <p className="font-bold">{shift.event || 'Shift'}{shift.place ? ` · ${shift.place}` : ''}</p>
                                            <p>Rostered: {shift.source === 'added' ? 'Not rostered' : (durationLabel(shift.allocatedStart, shift.allocatedEnd) || 'No times')}</p>
                                            <p>Actual: {durationLabel(shift.actualStart, shift.actualEnd) || 'Not submitted'}</p>
                                            {shift.casualNotes && <p>Casual notes: {shift.casualNotes}</p>}
                                            {shift.rejectionNote && <p>Rejection note: {shift.rejectionNote}</p>}
                                            <p>{shift.archived ? 'Archived' : shift.status === 'approved' ? `Approved · ${shift.fund}` : shift.status === 'rejected' ? 'Rejected' : shift.status === 'submitted' ? 'Waiting for the organiser' : 'Not submitted'}</p>
                                            <label className={`flex items-center gap-2 font-bold ${shift.status === 'approved' ? '' : 'text-gray-400'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(shift.payrollSent)}
                                                    disabled={shift.status !== 'approved' || casualBusy}
                                                    onChange={(event) => markPayroll(shift, event.target.checked)}
                                                />
                                                Sent to payroll
                                            </label>
                                            {shift.status === 'rejected' && (
                                                <button type="button" disabled={casualBusy} onClick={() => hoursRequest({ action: 'archive', id: shift.id, archived: !shift.archived }, shift.archived ? 'Shift restored.' : 'Shift archived.')} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider border border-gray-300 rounded-sm cursor-pointer disabled:opacity-40">{shift.archived ? 'Restore' : 'Archive'}</button>
                                            )}
                                            <label className="block">Organiser
                                                <OrganiserField
                                                    email={shift.organiserEmail}
                                                    onChange={(person) => setHoursShifts((current) => current.map((entry) => same(entry) ? { ...entry, organiserName: person?.name || '', organiserEmail: person?.email || '' } : entry))}
                                                    className="mt-1 w-full p-2 border border-gray-200 rounded-sm"
                                                />
                                            </label>
                                            <button type="button" disabled={casualBusy} onClick={() => saveHoursOrganiser(shift)} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider border border-gray-300 rounded-sm cursor-pointer disabled:opacity-40">Save organiser</button>
                                        </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        {casualSide === 'requested' ? (
                            casualShifts.length === 0 ? (
                                <p className="text-xs text-gray-500 border border-dashed border-gray-300 p-6 text-center">No casual staff requests yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {casualShifts.map((shift) => {
                                        const outside = shift.outsideShift || shift.outsideEvent;
                                        const flags = [
                                            shift.outsideEvent ? `Event outside ${WORK_START}–${WORK_END}` : '',
                                            shift.outsideShift ? `Shift outside ${WORK_START}–${WORK_END}` : ''
                                        ].filter(Boolean);
                                        const timesheetOutstanding = hoursShifts.some((entry) => entry.shiftKey === shift.id && entry.status === 'open' && !entry.archived);
                                        const timesheetRejected = hoursShifts.some((entry) => entry.shiftKey === shift.id && entry.status === 'rejected' && !entry.archived);
                                        return (
                                            <article key={shift.id} className={`border p-4 rounded-xs text-xs space-y-1 ${outside || timesheetOutstanding ? 'border-[#EAD64D] bg-[#EAD64D]/20' : 'border-gray-200'}`}>
                                                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                                                    <p className="font-black uppercase">Shift {shift.date || 'No date'} · {shift.start && shift.end ? `${shift.start}–${shift.end}` : 'No times'}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{shift.source} · {shift.status}</p>
                                                </div>
                                                {(outside || timesheetOutstanding || timesheetRejected) && (
                                                    <p className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 ${timesheetRejected && !outside && !timesheetOutstanding ? 'bg-black text-[#EAD64D]' : 'bg-[#EAD64D] text-black'}`}>{[timesheetOutstanding ? 'Timesheet outstanding' : '', timesheetRejected ? 'Timesheet rejected' : '', ...flags].filter(Boolean).join(' · ')}</p>
                                                )}
                                                <p className="font-bold">{shift.event}{shift.place && shift.place !== shift.event ? ` · ${shift.place}` : ''}</p>
                                                <p className="font-semibold">{eventTimesLabel(shift.times)}</p>
                                                <p>{shift.quantity === 1 ? '1 person' : `${shift.quantity} people`}{shift.preferred ? ` · Preferred: ${shift.preferred}` : ''}</p>
                                                {shift.tasks && <p className="text-gray-600">{shift.tasks}</p>}
                                                <p className="text-gray-500">{[shift.who, shift.email].filter(Boolean).join(' · ') || 'No contact'}</p>
                                                {(() => {
                                                    const offer = offersByShift.get(shift.id);
                                                    if (!offer?.asked?.length) return <p className="text-gray-400">Not sent to casuals yet.</p>;
                                                    const rows = replyRows(offer);
                                                    const answered = rows.filter((person) => person.answer !== 'waiting').length;
                                                    return (
                                                        <div className="pt-2 space-y-1">
                                                            <p className="font-black uppercase text-[10px] tracking-wider">{answered === rows.length ? 'Everyone has answered' : `${answered} of ${rows.length} have answered`}{offer.askedGroup ? ` · ${offer.askedGroup}` : ''}</p>
                                                            {rows.map((person) => (
                                                                <div key={person.email || person.name} className="flex flex-wrap items-center gap-2">
                                                                    <span className="w-28 font-bold truncate">{person.name}</span>
                                                                    <span className={person.answer === 'waiting' ? 'text-gray-400' : 'font-semibold'}>
                                                                        {person.answer === 'yes' ? 'Yes' : person.answer === 'no' ? 'No' : person.answer === 'booked' ? 'Booked' : 'Waiting'}
                                                                    </span>
                                                                    {person.answer === 'booked' && <span className="text-gray-500">{person.booking?.calendarEventId ? 'Calendar hold sent' : person.booking?.calendarError ? `Calendar not sent: ${person.booking.calendarError}` : ''}</span>}
                                                                    {person.answer === 'yes' && assignedRoom(offer, shift) && (
                                                                        <button type="button" disabled={casualBusy} onClick={() => bookCasual(shift, person)} className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-black text-[#EAD64D] rounded-sm cursor-pointer disabled:opacity-40">Book</button>
                                                                    )}
                                                                    {person.answer === 'booked' && !person.booking?.calendarEventId && (
                                                                        <button type="button" disabled={casualBusy} onClick={() => bookCasual(shift, person)} className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-black text-[#EAD64D] rounded-sm cursor-pointer disabled:opacity-40">Send calendar hold</button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </article>
                                        );
                                    })}
                                </div>
                            )
                        ) : (
                            eventsWithoutStaff.length === 0 ? (
                                <p className="text-xs text-gray-500 border border-dashed border-gray-300 p-6 text-center">No events are missing a casual staff request.</p>
                            ) : (
                                <div className="space-y-3">
                                    {eventsWithoutStaff.map((event) => (
                                        <article key={event.id} className={`border p-4 rounded-xs text-xs space-y-1 ${event.outsideEvent ? 'border-[#EAD64D] bg-[#EAD64D]/20' : 'border-gray-200'}`}>
                                            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                                                <p className="font-black uppercase">{event.date || 'No date'}</p>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{event.status}</p>
                                            </div>
                                            {event.outsideEvent && (
                                                <p className="inline-block text-[10px] font-black uppercase tracking-wider bg-[#EAD64D] text-black px-2 py-0.5">Outside {WORK_START}–{WORK_END}</p>
                                            )}
                                            <p className="font-bold">{event.event}{event.place ? ` · ${event.place}` : ''}</p>
                                            <p className="font-semibold">{eventTimesLabel(event.times)}</p>
                                            <p className="text-gray-500">{[event.who, event.email].filter(Boolean).join(' · ') || 'No contact'}</p>
                                        </article>
                                    ))}
                                </div>
                            )
                        )}
                    </section>
                )}

            </div>
        </main>
    );
}

export default function Page() {
    return <Gate level="founders"><AdminDashboardPage /></Gate>;
}
