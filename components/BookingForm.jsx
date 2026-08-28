"use client";

import { useState, useEffect } from 'react';
import { calculateQuote } from '../lib/pricing';

export default function BookingForm() {
    const [formData, setFormData] = useState({
        userType: 'Internal to UNSW',
        unswDivision: '', // New field for the dropdown choice
        department: '',
        isDelegation: false,
        sameAsMain: false,
        // Contacts
        mainContact: { name: '', email: '', phone: '' },
        onDayContact: { name: '', email: '', phone: '' },
        // Logistics
        space: 'MCIC Event Space',
        setups: [{ type: 'Workshop Style', startTime: '', endTime: '', details: '' }],
        timeline: [{ time: '', activity: '' }],
        bumpIn: '',
        eventStart: '',
        eventEnd: '',
        bumpOut: '',
        // AV Items
        av: {
            handheldMics: 0,
            lapelMics: 0,
            lecternMic: 0,
            projectorScreens: 0,
            backgroundMusic: false
        },
        furniture: [
            { id: 'booth', name: 'Couch Booths', qty: 0, placement: '', img: '/api/placeholder/300/200' },
            { id: 'whiteboard', name: 'A-frame Whiteboards', qty: 0, placement: '', img: '/api/placeholder/300/200' }
        ],
        catering: null,
        alcohol: null,
        eventDescription: '',
        attendees: 0
    });

    const [quote, setQuote] = useState({ base: 0, staff: 0, total: 0 });

    useEffect(() => {
        const q = calculateQuote(
            formData.space,
            false,
            formData.userType.includes('Internal') ? 'internal' : 'external',
            formData.bumpIn || '09:00',
            formData.bumpOut || '17:00'
        );
        setQuote(q);
    }, [formData.space, formData.userType, formData.bumpIn, formData.bumpOut]);

    const addSetup = () => setFormData({ ...formData, setups: [...formData.setups, { type: 'Workshop Style', startTime: '', endTime: '', details: '' }] });
    const addTimelineRow = () => setFormData({ ...formData, timeline: [...formData.timeline, { time: '', activity: '' }] });

    return (
        <div className="p-8 lg:p-16 space-y-24 bg-white border-4 border-black shadow-[15px_15px_0px_0px_#000]">
            <header className="border-b-8 border-black pb-4">
                <h1 className="text-6xl font-black uppercase tracking-tighter italic text-black">Booking Form</h1>
            </header>

            {/* 1. IDENTITY & AFFILIATION */}
            <section className="space-y-8">
                <h2 className="text-4xl font-black uppercase tracking-tight underline decoration-[#FFE600] decoration-8 text-black">1. Identity</h2>

                <div className="space-y-6">
                    <label className="font-black uppercase text-sm tracking-widest italic block text-black">What is your affiliation with the University?</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {['Internal to UNSW', 'External to UNSW'].map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setFormData({ ...formData, userType: t })}
                                className={`p-8 border-4 border-black font-black uppercase text-2xl transition-all duration-100 ${formData.userType === t
                                        ? 'bg-[#FFE600] translate-x-2 translate-y-2 shadow-none scale-95 text-black'
                                        : 'bg-white text-black shadow-[10px_10px_0px_0px_black] hover:bg-gray-50'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* INTERNAL ONLY FIELDS (Dropdown maps to your attachment) */}
                {formData.userType === 'Internal to UNSW' && (
                    <div className="space-y-8 p-8 border-4 border-black border-dashed bg-gray-50 animate-in zoom-in-95 duration-300">

                        {/* FACULTY / DIVISION DROPDOWN */}
                        <div className="space-y-2">
                            <label className="font-black uppercase text-xs tracking-widest text-black">UNSW Faculty / Division</label>
                            <select
                                value={formData.unswDivision}
                                onChange={(e) => setFormData({ ...formData, unswDivision: e.target.value })}
                                className="w-full p-4 border-4 border-black font-black text-lg bg-white outline-none focus:bg-[#FFE600]/10 text-black appearance-none cursor-pointer"
                                style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'black\' stroke-width=\'4\' stroke-linecap=\'square\' stroke-linejoin=\'miter\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")', backgroundPosition: 'right 20px center', backgroundRepeat: 'no-repeat' }}
                            >
                                <option value="" disabled>please select</option>
                                <option value="UNSW Art, Design & Architecture">UNSW Art, Design & Architecture</option>
                                <option value="UNSW Business School">UNSW Business School</option>
                                <option value="UNSW Canberra">UNSW Canberra</option>
                                <option value="UNSW Divisions">UNSW Divisions</option>
                                <option value="UNSW Engineering">UNSW Engineering</option>
                                <option value="UNSW Law">UNSW Law</option>
                                <option value="UNSW Medicine">UNSW Medicine</option>
                                <option value="UNSW Science">UNSW Science</option>
                            </select>
                        </div>

                        {/* SPECIFIC DEPARTMENT STRING INPUT */}
                        <div className="space-y-2">
                            <label className="font-black uppercase text-xs tracking-widest text-black">Specific School / Unit / Department</label>
                            <input
                                type="text"
                                placeholder="e.g. UNSW Founders, School of CS, etc."
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                className="w-full p-4 border-4 border-black font-black text-lg outline-none bg-white focus:bg-[#FFE600]/10 text-black"
                            />
                        </div>

                        {/* DELEGATION TICKBOX */}
                        <label className="flex items-center gap-4 cursor-pointer p-6 border-4 border-black bg-white shadow-[6px_6px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1">
                            <input
                                type="checkbox"
                                className="w-8 h-8 border-4 border-black accent-black cursor-pointer"
                                checked={formData.isDelegation}
                                onChange={(e) => setFormData({ ...formData, isDelegation: e.target.checked })}
                            />
                            <div className="flex flex-col">
                                <span className="font-black uppercase text-xl leading-none text-black">International Delegation?</span>
                                <span className="text-xs font-bold text-red-600 uppercase mt-1 italic">Tick if this is an official visiting delegation</span>
                            </div>
                        </label>
                    </div>
                )}
            </section>

            {/* 2. EVENT INFO */}
            <section className="space-y-8">
                <h2 className="text-4xl font-black uppercase tracking-tight underline decoration-[#FFE600] decoration-8 text-black">2. Event Details</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-2">
                        <label className="font-black uppercase text-sm block text-black">Event Name</label>
                        <input type="text" placeholder="e.g. Startup Pitch Night" className="w-full p-4 border-4 border-black font-black text-lg outline-none bg-white focus:bg-[#FFE600]/5 text-black" />
                    </div>
                    <div className="space-y-2">
                        <label className="font-black uppercase text-sm block italic text-black">No. of Attendees</label>
                        <input
                            type="number"
                            placeholder="0"
                            min="0"
                            className="w-full p-4 border-4 border-black font-black text-lg outline-none bg-white focus:bg-[#FFE600]/5 text-black"
                            onChange={(e) => setFormData({ ...formData, attendees: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="font-black uppercase text-sm block tracking-widest text-black">Description of Event</label>
                    <textarea
                        placeholder="Please provide details for the staff runsheet..."
                        className="w-full p-6 border-4 border-black font-bold h-32 outline-none focus:bg-[#FFE600]/5 text-black"
                        onChange={(e) => setFormData({ ...formData, eventDescription: e.target.value })}
                    />
                </div>
            </section>

            {/* 3. LOGISTICS (WHEN) */}
            <section className="space-y-8">
                <div className="flex justify-between items-end border-b-4 border-black pb-2">
                    <h2 className="text-4xl font-black uppercase tracking-tight text-black">3. Timing</h2>
                    <button type="button" className="bg-black text-[#FFE600] px-4 py-2 font-black text-[10px] uppercase hover:bg-[#FFE600] hover:text-black transition-all">
                        Check Availability 📅
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="font-black uppercase text-[10px] block text-black">Bump in</label>
                            <input type="time" value={formData.bumpIn} onChange={e => setFormData({ ...formData, bumpIn: e.target.value })} className="w-full p-3 border-4 border-black font-black text-black" />
                        </div>
                        <div className="space-y-2">
                            <label className="font-black uppercase text-[10px] block text-black">Event Start</label>
                            <input type="time" className="w-full p-3 border-4 border-black font-black text-black" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="font-black uppercase text-[10px] block text-black">Event End</label>
                            <input type="time" className="w-full p-3 border-4 border-black font-black text-black" />
                        </div>
                        <div className="space-y-2">
                            <label className="font-black uppercase text-[10px] block text-black">Bump out</label>
                            <input type="time" value={formData.bumpOut} onChange={e => setFormData({ ...formData, bumpOut: e.target.value })} className="w-full p-3 border-4 border-black font-black text-black" />
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. AV REQUIREMENTS */}
            <section className="space-y-8">
                <h2 className="text-4xl font-black uppercase tracking-tight underline decoration-[#FFE600] decoration-8 text-black">4. AV & Media</h2>

                <div className="border-4 border-black divide-y-4 divide-black">
                    {[
                        { label: 'Handheld Microphones', key: 'handheldMics', max: 4 },
                        { label: 'Lapel Microphones', key: 'lapelMics', max: 4 },
                        { label: 'Lectern Microphone', key: 'lecternMic', max: 1 },
                        { label: 'Projector Screens', key: 'projectorScreens', max: 2 },
                    ].map((item) => (
                        <div key={item.key} className="flex justify-between items-center p-6 bg-white hover:bg-gray-50 transition-colors">
                            <span className="font-black uppercase text-lg tracking-tighter text-black">{item.label}</span>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-bold text-gray-400 uppercase italic">Max {item.max}</span>
                                <input
                                    type="number" min="0" max={item.max}
                                    placeholder="0"
                                    className="w-20 p-2 border-4 border-black font-black text-center text-xl focus:bg-[#FFE600] text-black"
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        av: { ...formData.av, [item.key]: parseInt(e.target.value) || 0 }
                                    })}
                                />
                            </div>
                        </div>
                    ))}
                    <div className="flex justify-between items-center p-6 bg-yellow-50">
                        <span className="font-black uppercase text-lg tracking-tighter text-black">Background Music System</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={formData.av.backgroundMusic}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    av: { ...formData.av, backgroundMusic: e.target.checked }
                                })}
                            />
                            <div className="w-14 h-8 bg-black border-2 border-black peer-checked:bg-[#FFE600] rounded-none transition-all"></div>
                            <div className="absolute left-1 top-1 w-6 h-6 bg-white border-2 border-black peer-checked:translate-x-6 transition-all"></div>
                        </label>
                    </div>
                </div>
            </section>

            {/* 5. CATERING & ALCOHOL */}
            <section className="space-y-8">
                <h2 className="text-4xl font-black uppercase tracking-tight underline decoration-[#FFE600] decoration-8 text-black">5. Hospitality</h2>

                <div className="space-y-12">
                    <div className="space-y-4">
                        <p className="font-black uppercase text-xl italic tracking-tighter text-black">Will you be providing catering for your guests?</p>
                        <div className="flex gap-4">
                            {['Yes', 'No'].map(choice => (
                                <button
                                    key={choice}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, catering: choice })}
                                    className={`flex-1 p-6 border-4 border-black font-black uppercase text-2xl transition-all ${formData.catering === choice ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}`}
                                >
                                    {choice}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="font-black uppercase text-xl italic tracking-tighter text-black">Will you be serving alcohol at this event?</p>
                        <div className="flex gap-4">
                            {['Yes', 'No'].map(choice => (
                                <button
                                    key={choice}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, alcohol: choice })}
                                    className={`flex-1 p-6 border-4 border-black font-black uppercase text-2xl transition-all ${formData.alcohol === choice ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}`}
                                >
                                    {choice}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. FURNITURE */}
            <section className="space-y-8">
                <h2 className="text-4xl font-black uppercase tracking-tight underline decoration-[#FFE600] decoration-8 text-black">6. Furniture</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {formData.furniture.map((item) => (
                        <div key={item.id} className="border-4 border-black p-4 flex flex-col gap-4 hover:shadow-[8px_8px_0px_0px_#FFE600] transition-all bg-white group">
                            <img src={item.img} alt={item.name} className="w-full border-2 border-black grayscale group-hover:grayscale-0 transition-all" />
                            <div className="flex justify-between items-center border-b-4 border-black pb-2">
                                <span className="font-black uppercase text-sm text-black">{item.name}</span>
                                <input type="number" placeholder="0" className="w-20 p-2 border-2 border-black font-black text-center focus:bg-[#FFE600]/10 text-black outline-none" />
                            </div>
                            <textarea placeholder="Placement instructions..." className="p-3 border-2 border-black italic text-xs font-bold h-20 resize-none focus:bg-[#FFE600]/5 text-black outline-none" />
                        </div>
                    ))}
                </div>
            </section>

            {/* 7. TIMELINE TABLE */}
            <section className="space-y-8">
                <h2 className="text-4xl font-black uppercase tracking-tight underline decoration-[#FFE600] decoration-8 text-black">7. Timeline</h2>
                <div className="border-4 border-black overflow-hidden shadow-[8px_8px_0px_0px_black]">
                    <table className="w-full text-left bg-white">
                        <thead className="bg-black text-white uppercase text-xs font-black">
                            <tr>
                                <th className="p-4 border-r border-white/20 w-1/4">Time</th>
                                <th className="p-4">Activity / Proceeding</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-4 divide-black">
                            {formData.timeline.map((row, idx) => (
                                <tr key={idx}>
                                    <td className="p-2 border-r-4 border-black"><input type="time" className="w-full p-2 font-black outline-none text-black" /></td>
                                    <td className="p-2"><input type="text" placeholder="Activity..." className="w-full p-2 font-bold outline-none text-black" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <button type="button" onClick={addTimelineRow} className="text-xs font-black uppercase bg-black text-white px-4 py-2 hover:bg-gray-800 tracking-widest transition-colors">+ Add Timeline Row</button>
            </section>

            {/* 8. CONTACT DETAILS */}
            <section className="space-y-12">
                <h2 className="text-4xl font-black uppercase tracking-tight underline decoration-[#FFE600] decoration-8 text-black">8. Contacts</h2>

                <div className="p-8 border-4 border-black bg-gray-50 space-y-4 shadow-[8px_8px_0px_0px_black]">
                    <p className="font-black uppercase text-xs tracking-widest text-black">Primary Event Organizer</p>
                    <input type="text" placeholder="Full Name" className="w-full p-4 border-4 border-black font-black text-lg outline-none bg-white text-black" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="email" placeholder="Email Address" className="w-full p-4 border-4 border-black font-black text-lg outline-none text-black" />
                        <input type="tel" placeholder="Mobile Number" className="w-full p-4 border-4 border-black font-black text-lg outline-none text-black" />
                    </div>
                </div>

                <label className="flex items-center gap-4 cursor-pointer p-6 border-4 border-black bg-yellow-50 hover:bg-yellow-100 transition-colors shadow-[6px_6px_0px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1">
                    <input
                        type="checkbox"
                        className="w-8 h-8 border-4 border-black accent-black cursor-pointer"
                        checked={formData.sameAsMain}
                        onChange={(e) => setFormData({ ...formData, sameAsMain: e.target.checked })}
                    />
                    <div className="flex flex-col">
                        <span className="font-black uppercase text-xl leading-none text-black">The Organizer is the On-Day Contact</span>
                    </div>
                </label>

                {!formData.sameAsMain && (
                    <div className="p-8 border-4 border-black bg-gray-50 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-[8px_8px_0px_0px_black]">
                        <p className="font-black uppercase text-xs tracking-widest text-red-600 italic">On-Day Emergency Contact Required</p>
                        <input type="text" placeholder="Full Name" className="w-full p-4 border-4 border-black font-black text-lg outline-none bg-white text-black" />
                        <input type="tel" placeholder="Mobile Number" className="w-full p-4 border-4 border-black font-black text-lg outline-none bg-white text-black" />
                    </div>
                )}
            </section>

            {/* FOOTER: QUOTE & SUBMIT */}
            <div className="bg-black text-white p-12 space-y-8 border-t-8 border-[#FFE600]">
                <div className="flex justify-between items-center text-6xl font-black tracking-tighter">
                    <span className="uppercase">Platform Estimate</span>
                    <span className="text-[#FFE600]">${quote.total}</span>
                </div>
                <p className="text-gray-400 font-bold text-xs uppercase italic">Note: Staffing fees apply for events outside 8:30am – 4:30pm weekdays.</p>
                <button type="submit" className="w-full bg-[#FFE600] text-black font-black py-10 text-5xl border-4 border-white hover:bg-white hover:scale-[1.01] transition-all uppercase tracking-tighter shadow-[10px_10px_0px_0px_rgba(255,255,255,0.2)]">
                    Submit Booking Request
                </button>
            </div>
        </div>
    );
}