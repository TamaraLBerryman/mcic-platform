'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authFetch, useSignedInUser } from '../../../lib/clientAuth';

function genderLabel(answers) {
    if (answers.genderIdentity === 'Self-describe' && answers.genderSelfDescribe) return answers.genderSelfDescribe;
    return answers.genderIdentity || 'Prefer not to say';
}

function attended(person) {
    return person.status === 'ATTENDED' || Boolean(person.attendedAt);
}

function uniqueOptions(registrations, read) {
    const values = new Set();
    registrations.forEach(person => {
        const value = read(person.answers || {});
        const list = Array.isArray(value) ? value : [value];
        list.filter(Boolean).forEach(item => values.add(item));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
}

export default function GuestRosterPage({ params }) {
    const router = useRouter();
    const { ready, user } = useSignedInUser();
    const [roster, setRoster] = useState(null);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [attendance, setAttendance] = useState('ALL');
    const [gender, setGender] = useState('ALL');
    const [faculty, setFaculty] = useState('ALL');
    const [affiliation, setAffiliation] = useState('ALL');
    const [diet, setDiet] = useState('ALL');

    useEffect(() => {
        if (!ready) return;
        if (!user) {
            router.replace(`/login?next=${encodeURIComponent(`/events/${params.slug}/guests`)}`);
            return;
        }
        authFetch(`/api/registrations/roster?eventSlug=${encodeURIComponent(params.slug)}`)
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    setError(data.error || 'Registrations could not be loaded.');
                    return;
                }
                setRoster(data);
            })
            .catch(() => setError('Registrations could not be loaded.'));
    }, [ready, user, params.slug, router]);

    const people = roster?.registrations || [];
    const genders = useMemo(() => uniqueOptions(people, answers => genderLabel(answers)), [people]);
    const faculties = useMemo(() => uniqueOptions(people, answers => answers.faculties || []), [people]);
    const affiliations = useMemo(() => uniqueOptions(people, answers => answers.affiliations || []), [people]);
    const diets = useMemo(() => uniqueOptions(people, answers => (answers.dietary || []).filter(item => item !== 'None')), [people]);

    const visible = people.filter(person => {
        const answers = person.answers || {};
        if (attendance === 'IN' && !attended(person)) return false;
        if (attendance === 'OUT' && attended(person)) return false;
        if (gender !== 'ALL' && genderLabel(answers) !== gender) return false;
        if (faculty !== 'ALL' && !(answers.faculties || []).includes(faculty)) return false;
        if (affiliation !== 'ALL' && !(answers.affiliations || []).includes(affiliation)) return false;
        if (diet !== 'ALL' && !(answers.dietary || []).includes(diet)) return false;
        const haystack = [answers.firstName, answers.lastName, answers.email, answers.zid].join(' ').toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
    });

    const checkedIn = people.filter(attended).length;

    if (!ready || !user) {
        return <main className="min-h-screen bg-[#F9F9F9] p-12 text-sm">Checking sign-in…</main>;
    }

    return (
        <main className="min-h-screen bg-[#F9F9F9] text-black font-sans">
            <div className="max-w-5xl mx-auto px-6 py-12 space-y-6">
                <Link href="/my-bookings" className="text-xs font-bold uppercase tracking-wider">← My bookings</Link>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Registrations</h1>
                    <p className="text-sm text-neutral-600 mt-1">{roster?.eventTitle || 'Event guests'}</p>
                </div>
                {error && <p className="text-sm font-bold text-red-700">{error}</p>}
                {roster && !roster.usingPlatform && (
                    <p className="text-sm text-neutral-700 bg-white border border-gray-200 rounded-sm p-4">This booking is not using MCIC registration, so there is no guest list here.</p>
                )}
                {roster?.usingPlatform && (
                    <>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white border border-gray-200 rounded-sm p-4">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Registered</p>
                                <p className="text-2xl font-black">{people.length}</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-sm p-4">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Checked in</p>
                                <p className="text-2xl font-black">{checkedIn}</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-sm p-4">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Not checked in</p>
                                <p className="text-2xl font-black">{people.length - checkedIn}</p>
                            </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-sm p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <label className="space-y-1 sm:col-span-2 lg:col-span-3">
                                <span className="text-[10px] font-bold uppercase text-gray-500">Search name, email, or zID</span>
                                <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full p-2 border border-gray-200 text-sm rounded-sm" />
                            </label>
                            {[
                                ['Attendance', attendance, setAttendance, [['ALL', 'All'], ['IN', 'Checked in'], ['OUT', 'Not checked in']]],
                                ['Gender', gender, setGender, [['ALL', 'All'], ...genders.map(item => [item, item])]],
                                ['Faculty', faculty, setFaculty, [['ALL', 'All'], ...faculties.map(item => [item, item])]],
                                ['Affiliation', affiliation, setAffiliation, [['ALL', 'All'], ...affiliations.map(item => [item, item])]],
                                ['Dietary', diet, setDiet, [['ALL', 'All'], ...diets.map(item => [item, item])]]
                            ].map(([label, value, setValue, options]) => (
                                <label key={label} className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-gray-500">{label}</span>
                                    <select value={value} onChange={(event) => setValue(event.target.value)} className="w-full p-2 border border-gray-200 text-sm rounded-sm bg-white">
                                        {options.map(([optionValue, optionLabel]) => (
                                            <option key={optionValue} value={optionValue}>{optionLabel}</option>
                                        ))}
                                    </select>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-neutral-500">Showing {visible.length} of {people.length}</p>
                        {visible.length === 0 && <p className="text-sm text-neutral-600">No registrations match these filters.</p>}
                        <div className="space-y-3">
                            {visible.map(person => {
                                const answers = person.answers || {};
                                const name = [answers.firstName, answers.lastName].filter(Boolean).join(' ') || 'Guest';
                                return (
                                    <article key={person.id} className="bg-white border border-gray-200 rounded-sm p-4 space-y-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <h2 className="text-lg font-black">{name}</h2>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm ${attended(person) ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-700'}`}>
                                                {attended(person) ? 'Checked in' : 'Registered'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-neutral-700">{answers.email}{answers.phone ? ` · ${answers.phone}` : ''}{answers.zid ? ` · ${answers.zid}` : ''}</p>
                                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-neutral-700">
                                            <div><dt className="inline font-bold">Affiliation: </dt><dd className="inline">{(answers.affiliations || []).join(', ') || '—'}</dd></div>
                                            <div><dt className="inline font-bold">Faculty: </dt><dd className="inline">{(answers.faculties || []).join(', ') || '—'}</dd></div>
                                            <div><dt className="inline font-bold">Gender: </dt><dd className="inline">{genderLabel(answers)}</dd></div>
                                            <div><dt className="inline font-bold">Dietary: </dt><dd className="inline">{(answers.dietary || []).filter(item => item !== 'None').join(', ') || '—'}</dd></div>
                                            {answers.accessibilityNeeds && <div className="sm:col-span-2"><dt className="inline font-bold">Accessibility: </dt><dd className="inline">{answers.accessibilityNeeds}</dd></div>}
                                            {answers.questionGoal && <div className="sm:col-span-2"><dt className="inline font-bold">Hopes to get: </dt><dd className="inline">{answers.questionGoal}</dd></div>}
                                        </dl>
                                    </article>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
