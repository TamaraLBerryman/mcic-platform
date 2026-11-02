"use client";

import React, { useState } from 'react';

export default function EventFAQs() {
    const [activeAccordion, setActiveAccordion] = useState(null);

    const toggleAccordion = (id) => {
        setActiveAccordion(activeAccordion === id ? null : id);
    };

    return (
        <div className="space-y-4 bg-white p-6 border border-gray-200 rounded-sm shadow-sm">

            <div className="border border-gray-200 rounded-sm divide-y divide-gray-200 overflow-hidden bg-white shadow-xs">

                {/* ACCORDION VENUE RULES INTEGRATION HUB */}
                <div className="space-y-4 bg-white p-6 border border-gray-200 rounded-sm shadow-sm">
                    <div className="text-left">
                        <h4 className="text-sm font-black uppercase tracking-wider text-black">FAQs</h4>
                    </div>

                    <div className="border border-gray-200 rounded-sm divide-y divide-gray-200 overflow-hidden bg-white shadow-xs">

                        {/* 15. WHO CAN BOOK OUR SPACES */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('eligibility')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Who can book our spaces?</span>
                                <span>{activeAccordion === 'eligibility' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'eligibility' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-700 font-normal leading-relaxed">
                                    <p className="font-medium text-neutral-900">
                                        Anyone can book an event space at the Michael Crouch Innovation Centre.
                                    </p>
                                    <ul className="space-y-2.5 text-neutral-700">
                                        <li>
                                            <strong>External Bookings:</strong> Charged a full fee.
                                        </li>
                                        <li>
                                            <strong>UNSW Startups & Arc Student Societies:</strong> Fees are completely waived for registered Arc student societies and UNSW startups running entrepreneurship related events (subject to MCIC team approval).
                                        </li>
                                        <li>
                                            <strong>UNSW Departments:</strong> Charged a discounted fee.
                                        </li>
                                        <li>
                                            <strong>Alignment Discounts:</strong> MCIC event spaces are prioritised for initiatives aligned with innovation, entrepreneurship, and creative problem-solving across UNSW, so extra discounts can be applied when an event aligns.
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* 10. OPERATING HOURS & STAFFING FEES */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('hours')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Operating Hours & Staffing Fees</span>
                                <span>{activeAccordion === 'hours' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'hours' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-gray-600 font-normal leading-relaxed">
                                    <p>
                                        The venue space is available for reservation 24/7; however, variable fees apply outside regular working hours:
                                    </p>
                                    <div className="space-y-3">
                                        <p>
                                            <strong className="text-neutral-900 block uppercase text-[10px] tracking-wide mb-0.5">Standard Office Hours (9:00am – 4:00pm)</strong>
                                            No additional expenses automatically apply during these hours.
                                        </p>
                                        <p>
                                            <strong className="text-neutral-900 block uppercase text-[10px] tracking-wide mb-0.5">Outside Office Hours (Before 9:00am or After 4:00pm)</strong>
                                            Hiring a dedicated casual staff support member is required. This costs $50 per hour (3-hour minimum block). Sunday or Public Holiday shifts require a 4-hour minimum.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 1. LOCATION, TRANSPORT & PARKING */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('location-transport')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Location, Transport, Parking & Deliveries</span>
                                <span>{activeAccordion === 'location-transport' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'location-transport' && (
                                <div className="p-6 bg-white text-xs space-y-5 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <div className="space-y-1">
                                        <span className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide block border-b border-neutral-100 pb-1">
                                            Where on Campus
                                        </span>
                                        <p className="pt-1">
                                            <strong>Address:</strong> Michael Crouch Innovation Centre (MCIC), Building E10, UNSW Kensington Campus, Kensington NSW 2033.<br />
                                            The building is located right beside the Alumni Lawn. If arriving by car, enter via the Gate 2 Avenue entrance on High Street.
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide block border-b border-neutral-100 pb-1">
                                            Public Transport
                                        </span>
                                        <div className="space-y-1.5 pt-1">
                                            <p>• <strong>L3 Kingsford Light Rail:</strong> Alight at the UNSW Anzac Parade stop. Walk directly up onto campus from the main Anzac Parade gates.</p>
                                            <p>• <strong>Buses:</strong> Alight at UNSW Anzac Parade / NIDA (Routes 303, 392X, 392, 396).</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide block border-b border-neutral-100 pb-1">
                                            Uber & Taxis
                                        </span>
                                        <div className="space-y-1.5 pt-1">
                                            <p>• <strong>Ride Share Drop-off:</strong> Direct drivers to UNSW Gate 2, High St, Randwick. Get dropped off at the first roundabout just inside the gate (where there is a natural taxi bay) and simply walk straight across the lawn to the MCIC.</p>
                                        </div>
                                    </div>

                                    {/* COMPREHENSIVE PARKING SECTION */}
                                    <div className="space-y-3">
                                        <span className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide block border-b border-neutral-100 pb-1">
                                            Campus Parking & EV Facilities
                                        </span>
                                        <div className="space-y-3 pt-1">
                                            <p>
                                                <strong>For Staff:</strong> UNSW Staff can choose between annual permits (via UNSW vPermit) or pay-as-you-go parking sessions (via the CellOPark App). Having either an active permit or CellOPark session allows parking in any bay marked <strong>'UNSW Permit Holder'</strong>.
                                            </p>
                                            <p>
                                                <strong>For Students & Visitors:</strong> All-day parking is available at the top level of Botany Street multi-storey Carpark (entry via Gate 11). Timed 2P or 4P bays are located near Gates 2, 8 (off High St), Gate 11 Apron (off Botany St), and Western Campus.
                                            </p>
                                            <p className="text-neutral-500 italic">
                                                Payment is required on arrival via CellOPark App or Pay-By-Plate meter. Parking is <strong>free between 7:30 PM and 7:30 AM weekdays, and all day weekends & public holidays</strong>.
                                            </p>

                                            {/* CELLOPARK STEPS */}
                                            <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xs space-y-1">
                                                <span className="font-bold text-neutral-900 block uppercase text-[10px]">CellOPark App Setup:</span>
                                                <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-neutral-600">
                                                    <li>Download CellOPark and add your zID & email to your profile.</li>
                                                    <li>Register your vehicle plate number and credit card details.</li>
                                                    <li>Select zone <strong className="font-mono text-black">2052033 UNSW Permit Holder Parking</strong> (tap the STAR to favourite).</li>
                                                    <li>Press <strong>START</strong> on arrival. Flat rate is $8/day (no need to press stop).</li>
                                                </ol>
                                            </div>

                                            {/* EV, MOTORCYCLES & BICYCLES */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                                                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs space-y-0.5">
                                                    <span className="font-bold text-neutral-900 block uppercase text-[10px]">⚡ EV Charging</span>
                                                    <p className="text-neutral-600">6 solar EV charging stations on top level of Botany St carpark.</p>
                                                </div>
                                                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs space-y-0.5">
                                                    <span className="font-bold text-neutral-900 block uppercase text-[10px]">🏍️ Motorcycles</span>
                                                    <p className="text-neutral-600">Free in designated Motorcycle Bays (e.g. Union Rd behind Hilmer).</p>
                                                </div>
                                                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs space-y-0.5">
                                                    <span className="font-bold text-neutral-900 block uppercase text-[10px]">🚲 Bicycles</span>
                                                    <p className="text-neutral-600">Park in designated racks on Union Rd behind Hilmer (unauthorised bikes impounded after 48h).</p>
                                                </div>
                                            </div>

                                            {/* HELPFUL PARKING LINKS */}
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] pt-1 border-t border-neutral-100">
                                                <a href="https://www.estate.unsw.edu.au/getting-here/parking-campus" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline hover:text-[#EAD64D]">Parking at UNSW ↗</a>
                                                <a href="https://www.estate.unsw.edu.au/getting-here/parking/parking-rates" target="_blank" rel="noopener noreferrer" className="text-neutral-500 underline hover:text-black">Parking Rates ↗</a>
                                                <a href="https://www.estate.unsw.edu.au/unsw-solar-powered-electric-vehicle-charging-stations" target="_blank" rel="noopener noreferrer" className="text-neutral-500 underline hover:text-black">EV Charging ↗</a>
                                                <a href="https://www.estate.unsw.edu.au/getting-here/maps?id=514c6a097d4c475abd7f391b5c69b1e2" target="_blank" rel="noopener noreferrer" className="text-neutral-500 underline hover:text-black">Bicycle Map ↗</a>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DELIVERIES, LOADING DOCK & MAP IMAGE */}
                                    <div className="space-y-3">
                                        <span className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide block border-b border-neutral-100 pb-1">
                                            Deliveries & Loading Dock
                                        </span>
                                        <p className="pt-1">
                                            Couriers should enter via Gate 2 on High Street. Instruct them to either park in the Loading Bays at Gate 2 Entrance or proceed down the avenue to the E10 Hilmer Building. Note that vehicles cannot stay parked after drop-off and must move on immediately. More information on Loading Bays in the image below.
                                        </p>

                                        {/* LOADING BAY DIAGRAM IMAGE */}
                                        <div className="mt-3 border border-neutral-200 rounded-sm overflow-hidden bg-neutral-900 p-2 shadow-sm">
                                            <img
                                                src="/images/LoadingBays.jpg"
                                                alt="MCIC Loading Bays Map & Gate 2 Access Guide"
                                                className="w-full h-auto rounded-xs object-cover hover:opacity-95 transition-opacity"
                                            />
                                            <div className="p-2 text-[10px] text-neutral-400 font-mono text-center">
                                                🗺️ Gate 2 Access Routes & 15-Minute Loading Zone Map
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3.5 bg-neutral-900 text-white font-medium rounded-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <span>🗺️ Need help navigating?</span>
                                        <a
                                            href="https://link.mazemap.com/IjnOhWjK"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-white text-neutral-900 px-3 py-1.5 rounded-xs font-bold uppercase tracking-wider text-[9px] hover:bg-neutral-50 text-center whitespace-nowrap"
                                        >
                                            View Campus Map Pin ↗
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. DIGITAL & WI-FI ACCESS */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('digital')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Can I access WiFi for myself and my attendees?</span>
                                <span>{activeAccordion === 'digital' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'digital' && (
                                <div className="p-6 bg-white text-xs space-y-6 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* LEFT BOX: STAFF & STUDENTS (EDUROAM) */}
                                        <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3 flex flex-col justify-between">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                    <span>🎓</span> For those with a zID (Eduroam)
                                                </div>
                                                <p className="text-neutral-600 text-xs leading-relaxed">
                                                    The <strong>Eduroam</strong> network provides Internet access to staff and students visiting from UNSW or other participating educational institutions globally.
                                                </p>
                                                <p className="text-neutral-500 text-[11px] leading-relaxed">
                                                    If you intend on using Eduroam at a participating University and haven't used it before, you should setup and test Eduroam while still on campus at UNSW.
                                                </p>

                                                <div className="p-3 bg-white border border-neutral-200 rounded-xs space-y-1 font-mono text-[11px]">
                                                    <div><span className="text-neutral-400 uppercase text-[9px] font-sans font-bold block">Network Name:</span> eduroam</div>
                                                    <div><span className="text-neutral-400 uppercase text-[9px] font-sans font-bold block">Username:</span> zID@ad.unsw.edu.au</div>
                                                    <div><span className="text-neutral-400 uppercase text-[9px] font-sans font-bold block">Password:</span> zID Password</div>
                                                </div>
                                            </div>

                                            {/* HELPFUL LINKS */}
                                            <div className="pt-2 border-t border-neutral-200/60 space-y-1 text-[11px]">
                                                <span className="font-bold text-neutral-900 uppercase text-[9px] block">Device Setup Guides:</span>
                                                <div className="flex flex-wrap gap-2">
                                                    <a href="https://www.unsw.edu.au/get-online" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline hover:text-[#EAD64D]">Staff & Students Access Support Page ↗</a>
                                                    <a href="https://www.unsw.edu.au/get-online/bring-your-own-device-ios" target="_blank" rel="noopener noreferrer" className="text-neutral-500 underline hover:text-black">iOS ↗</a>
                                                    <a href="https://www.unsw.edu.au/get-online/standard-unsw-android-device" target="_blank" rel="noopener noreferrer" className="text-neutral-500 underline hover:text-black">Android ↗</a>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT BOX: GUESTS & VISITORS */}
                                        <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-4 flex flex-col justify-between">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                    <span>🌐</span> External Visitors & Guests
                                                </div>
                                                <p className="text-neutral-600 text-xs">
                                                    Visitors can access Wi-Fi at UNSW by connecting to the <strong>UNSW Guest</strong> network:
                                                </p>

                                                <ol className="space-y-3 text-neutral-600 text-xs">
                                                    <li className="space-y-1">
                                                        <strong>Step 1</strong> — Navigate to Wi-Fi settings and connect to the <strong>'UNSW Guest'</strong> Network.
                                                    </li>

                                                    <li className="space-y-1">
                                                        <strong>Step 2</strong> — In the Captive Wi-Fi pop-up screen:
                                                        <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-neutral-500 my-1">
                                                            <li>Type your Full Name and Email Address in the fields provided.</li>
                                                            <li>Tick the checkbox to accept the terms and conditions.</li>
                                                            <li>Tap <strong>Submit</strong>.</li>
                                                        </ul>
                                                        <p className="text-[11px] text-neutral-500 italic">You will see a welcome screen confirming your temporary access.</p>
                                                        <img src="/images/wifi/step2.png" alt="Step 2 - Captive Portal Registration" className="mt-2 rounded-xs border border-neutral-200 max-h-36 object-contain bg-white p-1" />
                                                    </li>

                                                    <li className="space-y-1">
                                                        <strong>Step 3</strong> — An email from <code className="bg-white px-1 border rounded-xs text-[10px]">guestwireless@unsw.edu.au</code> will be sent to your email address. Navigate to your email message.
                                                        <p className="text-[10px] text-neutral-400 font-medium">Note: If you cannot find the email in your inbox, check your junk or spam folder.</p>
                                                    </li>

                                                    <li className="space-y-1">
                                                        <strong>Step 4</strong> — In the email, select <strong>click here</strong>.
                                                        <img src="/images/wifi/step4.png" alt="Step 4 - Activation Email Link" className="mt-2 rounded-xs border border-neutral-200 max-h-36 object-contain bg-white p-1" />
                                                    </li>

                                                    <li className="space-y-1">
                                                        <strong>Step 5</strong> — You will then be prompted to Confirm or Reject access. Select <strong>Confirm</strong>.
                                                        <img src="/images/wifi/step5.png" alt="Step 5 - Confirm Access" className="mt-2 rounded-xs border border-neutral-200 max-h-36 object-contain bg-white p-1" />
                                                    </li>
                                                </ol>
                                            </div>

                                            {/* GUEST HELPFUL LINK */}
                                            <div className="pt-2 border-t border-neutral-200/60 text-[11px]">
                                                <a href="https://www.unsw.edu.au/get-online/guest-access" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline hover:text-[#EAD64D]">
                                                    UNSW Guest Access Support Page ↗
                                                </a>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. PRINTING & COPYING SERVICES */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('printing')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Can I print or photocopy documents on-site?</span>
                                <span>{activeAccordion === 'printing' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'printing' && (
                                <div className="p-6 bg-white text-xs space-y-6 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* LEFT BOX: MCIC DESIGN SPACE PRINTER */}
                                        <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-3 flex flex-col justify-between">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                    <span>🖨️</span> MCIC On-Site Printing (Design Space)
                                                </div>
                                                <p className="text-neutral-600 text-xs leading-relaxed">
                                                    There is a printer located in the <strong>MCIC Design Space</strong>. Please note it is <strong>not connected to the UNSW network</strong>, so jobs can only be printed locally via USB flash drive.
                                                </p>
                                                <p>
                                                    For other Event Spaces, if you require 30 or less A4 pages printed daily for an upcoming event, email <a href="mailto:MCIC@UNSW.edu.au" className="font-mono font-bold text-black underline">MCIC@UNSW.edu.au</a> and our team can print them out for you.
                                                </p>
                                            </div>
                                        </div>

                                        {/* RIGHT BOX: HIGH-VOLUME & LIBRARY / POST OFFICE PRINTING */}
                                        <div className="p-5 border border-neutral-200 bg-neutral-50/40 rounded-xs space-y-4 flex flex-col justify-between">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase tracking-tight text-[10px]">
                                                    <span>📚</span> High-Volume Printing (Library & Post Office)
                                                </div>
                                                <p className="text-neutral-600 text-xs leading-relaxed">
                                                    For larger print volumes (substantially more than 30 pages), please use campus services at the <a href="https://link.mazemap.com/Pd5JYQzv" target="_blank" rel="noopener noreferrer" className="font-bold text-black underline">UNSW Main Library ↗</a> or <a href="https://link.mazemap.com/eZRjrq9D" target="_blank" rel="noopener noreferrer" className="font-bold text-black underline">UNSW Post Office ↗</a>.
                                                </p>

                                                <div className="p-3 bg-white border border-neutral-200 rounded-xs space-y-2 text-[11px] text-neutral-700">
                                                    <span className="font-bold text-neutral-900 block uppercase text-[10px]">Library Print & Copy Rules:</span>
                                                    <ul className="list-disc pl-4 space-y-1 text-neutral-600">
                                                        <li>Photocopy, scan, and print copies directly at any Print/Copy station.</li>
                                                        <li>Purchase a reusable photocopy card at the Print/Copy Services desk on <strong>Level 2, Main Library</strong>.</li>
                                                        <li>Minimum charge is <strong>$5</strong> (covers card cost and initial print credits).</li>
                                                        <li><em className="text-neutral-500">Unused credit cannot be refunded.</em></li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. WILL THE SPACE BE SET-UP FOR ME */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('setup')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Will the space be set-up for me?</span>
                                <span>{activeAccordion === 'setup' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'setup' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <p>
                                        Please expect to set up the chairs, tables, and equipment yourself. While we aim to assist or arrange layouts prior to your arrival, this is not always possible.
                                    </p>
                                    <p>
                                        A staff member will always unlock the space, show you how to use and find equipment, and lock the room at check-out. If you require support in the room for the entirety of your event you must hire casual staff through the booking form at a cost of $50 per hour (minimum 3 hours).
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* WHAT HOURS SHOULD I BOOK THE SPACE */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('bookingHours')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>What hours should I book the space for?</span>
                                <span>{activeAccordion === 'bookingHours' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'bookingHours' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <p>
                                        Please book the space for the entire period you require access—from the moment you need to enter for setup to the exact time you will depart after cleaning up and packing down (not just the time your event runs).
                                    </p>
                                    <p>
                                        You will <strong>not</strong> have access to the space before or after your confirmed booking window. Be sure to factor in sufficient time for setting up equipment, tables, and chairs prior to your event, as well as clearing away rubbish and tidying the room afterward.
                                    </p>
                                    <p>
                                        A staff member will always unlock the space, show you how to use and find equipment, and lock the room at check-out. If you require support in the room for the entirety of your event you must hire casual staff through the booking form at a cost of $50 per hour (minimum 3 hours).
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 4. WILL THERE BE STAFF TO HELP ME AT ALL TIMES */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('staff')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Will there be staff to help me at all times?</span>
                                <span>{activeAccordion === 'staff' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'staff' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <p>
                                        A staff member will be on-site to facilitate check-in, demonstrate core AV equipment controls, and securely lock the facility doors at the conclusion of your reservation window.
                                    </p>
                                    <p>
                                        Throughout your event window, staff remain inside the core building infrastructure and can be paged immediately to troubleshoot unexpected technical issues. Staff do not maintain an ongoing presence inside your room unless dedicated casual staffing coverage is requested ($50/hr, min 3 hours).
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 5. DO I NEED TO BE THERE THE WHOLE TIME WITH GUESTS */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('host-responsibility')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Do I need to be there the whole time if I have guests in the space?</span>
                                <span>{activeAccordion === 'host-responsibility' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'host-responsibility' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <div className="p-3.5 bg-neutral-900 text-white font-medium rounded-xs">
                                        Yes. You are fully responsible for all equipment, asset safety, and room conditions during the entirety of your booking window.
                                    </div>
                                    <div className="space-y-1.5 font-medium text-neutral-800">
                                        <p className="text-neutral-950 font-bold uppercase text-[10px] tracking-wide mb-1">Strict Supervision Directives:</p>
                                        <p>• <strong>Do not leave guests unattended</strong> inside the space at any point.</p>
                                        <p>• <strong>Do not leave the facility doors wide open</strong> or unlocked while completely unattended.</p>
                                    </div>
                                    <div className="space-y-3 border-t border-neutral-100 pt-3">
                                        <p>
                                            If you must step out of the room at any point during your booking, you must contact venue staff immediately so they can come and lock the facility doors securely.
                                        </p>
                                        <p>
                                            We frequently experience situations where hosts depart before their attendees have fully exited, resulting in guests slowly filtering out over time with absolutely nobody cleaning up the space, resetting equipment, or locking down university assets.
                                        </p>
                                        <p>
                                            Similarly, you <strong>cannot</strong> book rooms for unstaffed "drop-in" functions and request doors remain unlocked if a dedicated, responsible organizer is not physically present to supervise the space.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* WHEN ARE BOOKINGS OPEN / AVAILABILITY */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('availability')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>When can I book the space / How far in advance?</span>
                                <span>{activeAccordion === 'availability' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'availability' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <p>
                                        Our spaces are subject to a standard booking lockout until closer to term start. This allows our internal UNSW Founders team to finalise program schedules and secure priority space allocations.
                                    </p>
                                    <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1 text-neutral-800">
                                        <strong className="block uppercase text-[10px] tracking-wide">Lockout dates are as follows:</strong>
                                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-neutral-700">
                                            <li><strong>Term 1 2027</strong> (8 Feb - 28 May): Bookings open from 20 November 2026</li>
                                            <li><strong>Term 2 2027</strong> (24 April - 10 Sept): Bookings open from 23 April 2027</li>
                                            <li><strong>Term 3 2027</strong> (6 Sept - 9 December): Bookings open from 6 August 2027</li>
                                        </ul>
                                    </div>
                                    <p>
                                        Because we receive high-volume booking requests from across the university, spaces are allocated on a <strong>first-come, first-served basis</strong> once lockouts expire.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 6. STORAGE PROTOCOLS */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('storage')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Can I store items in the space before or after my event?</span>
                                <span>{activeAccordion === 'storage' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'storage' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <div className="p-3.5 bg-neutral-900 text-white font-medium rounded-xs">
                                        No. On-site storage is strictly unavailable outside of your booking time.
                                    </div>
                                    <p>
                                        We simply do not have storage facilities to hold your items. The on-site kitchen cupboards and fridge are completely full and restricted to UNSW Founders Staff.
                                    </p>
                                    <p>
                                        All items, banners, and food supplies must arrive with your team at check-in and be completely evacuated at checkout to ensure subsequent bookings can load in seamlessly. Please ensure your caterer can collect all items within your booking window.
                                    </p>
                                    <p>
                                        If you absolutely require exceptional storage arrangements, please contact <a href="mailto:MCIC@unsw.edu.au" className="font-bold text-black underline">MCIC@unsw.edu.au</a> as soon as possible.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 7. FACILITY CONSUMABLES */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('consumables')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Can I use the milk, tea, coffee, soft drinks, paper plates, or cups at the facility?</span>
                                <span>{activeAccordion === 'consumables' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'consumables' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <div className="p-3.5 bg-neutral-900 text-white font-medium rounded-xs">
                                        No. This venue functions under a strict self-service model regarding food, beverages, and event consumables.
                                    </div>
                                    <ul className="list-disc pl-4 space-y-1.5 text-neutral-700 font-medium">
                                        <li>All food items, hot drink stock, and disposable serviceware stored on shelves belong to core Founders programs and cannot be accessed.</li>
                                        <li>Hirers are responsible for bringing all event serviceware including plates, napkins, cups, serving utensils, and cutlery items.</li>
                                        <li>Glassware setups, ceramic mugs and plates, ice buckets and a water dispenser can be added to your booking for an extra fee via the booking form.</li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* 8. HOW DOES CATERING WORK */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('catering-hub')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>How does Catering work?</span>
                                <span>{activeAccordion === 'catering-hub' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'catering-hub' && (
                                <div className="p-6 bg-white text-xs space-y-5 animate-in slide-in-from-top-1 duration-150 text-neutral-700 font-medium leading-relaxed">
                                    <div className="space-y-2 pl-2 border-l-2 border-neutral-200 text-neutral-600 font-normal">
                                        <p><strong>Self-Service:</strong> BYO food, drink, ice and serviceware (plates, napkins, cups, serving utensils, and cutlery items). An urn, water dispenser, glasses, plates, mugs and ice buckets are available for an extra fee via the booking form.</p>
                                        <p><strong>Any Caterer:</strong> No restrictions. You can bring any food or external catering you like.</p>
                                        <p><strong>No Storage:</strong> On-site fridge/cupboards are full. Everything must arrive and leave within your booking window. If you want to keep items cold, please supply your own ice and book the Ice Buckets.</p>
                                        <p><strong>Deliveries:</strong> We will not meet your delivery drivers to collect your order. You must direct and meet your own delivery drivers unless you have paid for casual venue staff (you must select this option in your booking form).</p>
                                        <p><strong>Mandatory Cleanup:</strong> Pack up all leftovers and rubbish immediately on conclusion of your event. Large waste goes to bins in the hallway by the back door of the Design Space. If you do not leave the space clean, you will be charged a cleaning fee ($200 + GST minimum).</p>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide border-b border-neutral-100 pb-2">
                                            Caterers we have seen in the space:
                                        </h4>
                                        <div className="overflow-x-auto border border-neutral-200 rounded-sm">
                                            <table className="w-full text-left text-[10px] text-neutral-600 whitespace-nowrap">
                                                <thead className="bg-neutral-50 border-b border-neutral-200 uppercase font-bold text-neutral-900">
                                                    <tr>
                                                        <th className="p-2.5">Caterer</th>
                                                        <th className="p-2.5">Style</th>
                                                        <th className="p-2.5">Price</th>
                                                        <th className="p-2.5">Notice & Delivery Hours</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-neutral-100 font-normal text-neutral-600">
                                                    {[
                                                        { name: "Mad Toppings", url: "https://madtoppings.com.au", style: "Pizza", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "11am – 11pm Daily" },
                                                        { name: "OOshman", url: "https://ooshman.au", style: "Pizza & Wraps", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "10am – 11:30pm (Late until 2am/3am Thu-Sat)" },
                                                        { name: "Byblos Lebanese Cuisine", url: "https://bybloslebanesecuisine.com.au/", style: "Lebanese & Platters", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "10am – 9pm Mon-Sat (Closed Sun)" },
                                                        { name: "Catering Project", url: "https://www.cateringproject.com.au", style: "Corp Platters", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "7am – 6pm Mon-Fri (9am-4pm Sat, 9am-2pm Sun)" },
                                                        { name: "Foodie Del Mar", url: "http://foodiedelmar.com.au/", style: "Canape & Grazing", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "Flexible delivery timelines upon booking request" },
                                                        { name: "Mama B’s", url: "https://mamabs.com.au", style: "Vegan Specialty", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "7am – 6pm Daily (Order by 12pm cutoff)" },
                                                        { name: "Sals Pizza", url: "https://www.salspizza.com.au", style: "NY Style Pizza", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "11am – 9pm Sun-Wed (Extended until Midnight Thu-Sat)" },
                                                        { name: "The Rusty Rabit", url: "https://therustyrabbit.com.au", style: "Breakfast & Coffee", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "7am – 3:30pm Mon-Fri (8am–3pm Sat-Sun)" },
                                                        { name: "Racha Syrian Kitchen", url: "https://www.rachasyriankitchen.com.au", style: "Middle Eastern", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$$$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "11am – 8:30pm Tue-Sun (Closed Mon) • 1 wk notice for 30+" },
                                                        { name: "Vanilla Blue", url: "https://www.vanillablue.com.au/unsw", style: "Corporate Buffets", styleBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", price: "$$$", priceBadge: "bg-neutral-100 text-neutral-800 border-neutral-200", delivery: "6:30am – 6:30pm Mon-Fri (7:30am–2pm Sat)" }
                                                    ].map((v, i) => (
                                                        <tr key={i} className="hover:bg-neutral-50">
                                                            <td className="p-2.5 font-bold text-neutral-900">
                                                                <a href={v.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-neutral-900 inline-flex items-center gap-0.5">
                                                                    {v.name} <span className="text-neutral-400 font-normal text-[8px]">↗</span>
                                                                </a>
                                                            </td>
                                                            <td className="p-2.5">
                                                                <span className={`px-2 py-0.5 text-[9px] font-semibold border rounded-sm ${v.styleBadge}`}>
                                                                    {v.style}
                                                                </span>
                                                            </td>
                                                            <td className="p-2.5">
                                                                <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-sm ${v.priceBadge}`}>
                                                                    {v.price}
                                                                </span>
                                                            </td>
                                                            <td className="p-2.5 text-neutral-500 font-medium">{v.delivery}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="p-3.5 bg-neutral-900 text-white font-medium rounded-xs">
                                        All catering must be delivered inside your specific booking hours. Early drop-offs will be turned away as we have no space to store.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SERVING ALCOHOL & RSA COMPLIANCE */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('alcohol-rsa')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Can I serve alcohol at my event?</span>
                                <span>{activeAccordion === 'alcohol-rsa' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'alcohol-rsa' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <p className="font-medium text-neutral-900">
                                        Yes, serving alcohol is permitted, provided you strictly comply with NSW liquor legislation and UNSW venue safety policies:
                                    </p>

                                    <ul className="space-y-3 text-neutral-700">
                                        <li className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1">
                                            <strong className="text-neutral-900 block uppercase text-[10px] tracking-wide">1. Mandatory RSA Holder & Proof Submission</strong>
                                            <p className="text-neutral-600 text-xs">
                                                Anyone responsible for supervising or serving alcohol must hold a valid <strong>NSW Responsible Service of Alcohol (RSA) Competency Card</strong>. A photocopy of this card must be submitted to venue management prior to your event commencement.
                                            </p>
                                        </li>

                                        <li className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1">
                                            <strong className="text-neutral-900 block uppercase text-[10px] tracking-wide">2. Option to Hire RSA-Certified Venue Staff</strong>
                                            <p className="text-neutral-600 text-xs">
                                                If you or your catering team do not hold an RSA card—or if you prefer not to manage service compliance yourself—you can <strong>hire an RSA-certified MCIC casual staff member</strong> directly via the booking form ($50/hr; 3-hr minimum Mon–Sat, 4-hr minimum Sun/Public Holidays). They will oversee a Gallery / Self-Service Station. You will still be resonsible for providing all alcohol, serviceware, ice etc. and ensuring your guests are of legal drinking age.
                                            </p>
                                        </li>

                                        <li className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1">
                                            <strong className="text-neutral-900 block uppercase text-[10px] tracking-wide">3. Service Models: Bartender vs. Gallery Self-Service</strong>
                                            <div className="space-y-1 text-xs text-neutral-600">
                                                <p>Alcohol can be served in two ways depending on your event setup:</p>
                                                <p>• <strong>Dedicated Bartender Service:</strong> Drinks are actively poured and handed out by an RSA holder.</p>
                                                <p>• <strong>Gallery / Self-Service Station:</strong> Drinks (e.g. wine/beer) can be set out on tables for self-service during exhibitions, networking, or gallery-style events. Under NSW liquor guidelines, an RSA cardholder must still actively oversee the drink station to monitor consumption and prevent underaged access.</p>
                                            </div>
                                        </li>

                                        <li className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1">
                                            <strong className="text-neutral-900 block uppercase text-[10px] tracking-wide">4. Responsible Consumption & Underage Guests</strong>
                                            <p className="text-neutral-600 text-xs">
                                                Food and non-alcoholic beverage options must be freely available whenever alcohol is served. Venue staff reserve the right to immediately suspend alcohol service if RSA documentation is missing, if minors are present without explicit prior safety arrangements, or if unsafe behaviour occurs.
                                            </p>
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>
                        {/* TICKETING & REGISTRATION FAQ */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('ticketing')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>How does event ticketing, registration & fee splitting work?</span>
                                <span>{activeAccordion === 'ticketing' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'ticketing' && (
                                <div className="p-6 bg-white text-xs space-y-5 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">

                                    {/* HIRER SELF-MANAGEMENT */}
                                    <div className="space-y-2 border-b border-neutral-100 pb-3">
                                        <span className="font-bold text-neutral-900 uppercase block text-[11px]">Option 1: Managing Your Own Ticketing (Default)</span>
                                        <p className="text-neutral-700">
                                            By default, event hosts manage their own attendee registration using their preferred ticketing platform (e.g., <strong>Humanitix, Luma, Eventbrite</strong>, or internal web forms). You retain full legal and financial responsibility for managing guest lists, door check-ins, and issuing ticket refunds if your event is cancelled or postponed.
                                        </p>
                                    </div>

                                    {/* VENUE ASSISTED / OFFICIAL TICKETING */}
                                    <div className="space-y-2 border-b border-neutral-100 pb-3">
                                        <span className="font-bold text-neutral-900 uppercase block text-[11px]">Option 2: UNSW Founders / Venue-Managed Ticketing</span>
                                        <p className="text-neutral-700">
                                            Upon request or by mutual agreement, UNSW Founders can assist with managing registration and attendee check-ins through our nominated venue ticketing channels.
                                        </p>
                                    </div>

                                    {/* THREE-WAY MONEY SPLIT EXPLAINED */}
                                    <div className="space-y-3 border-b border-neutral-100 pb-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-neutral-900 uppercase">Paid Events & Fee Breakdown</span>
                                        </div>
                                        <p className="text-neutral-600 text-[11px]">
                                            When UNSW Founders manages ticketing for a paid event, ticket revenues collected from attendees are split to cover platform and venue costs before paying out net earnings to the event host:
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                                            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1">
                                                <span className="font-bold text-neutral-900 uppercase text-[10px] block">1. Platform / Card Fees</span>
                                                <p className="text-neutral-600 text-[10px]">
                                                    Standard processing & booking gateway fees associated with the ticketing software used.
                                                </p>
                                            </div>
                                            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1">
                                                <span className="font-bold text-neutral-900 uppercase text-[10px] block">2. Venue Consignment</span>
                                                <p className="text-neutral-600 text-[10px]">
                                                    A flat <strong>$2.50 (inc. GST)</strong> venue consignment fee applies per ticket for paid tickets priced over $25.00.
                                                </p>
                                            </div>
                                            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1">
                                                <span className="font-bold text-neutral-900 uppercase text-[10px] block">3. Host Net Payout</span>
                                                <p className="text-neutral-600 text-[10px]">
                                                    All remaining net ticket revenue (less any unpaid venue hire or staffing balances) is paid out to the host.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* NEW FAQ: PROMOTION & LOGO USE */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('promotion-branding')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>How can I promote my event / Can I use the MCIC or UNSW logo?</span>
                                <span>{activeAccordion === 'promotion-branding' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'promotion-branding' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <p>
                                        You are welcome to state the physical event location as <strong>"Michael Crouch Innovation Centre, UNSW"</strong> on your promotional materials, flyers, and event listings.
                                    </p>
                                    <p>
                                        UNSW Founders reserves the right to review promotional materials bearing the MCIC or UNSW logo/branding. Materials deemed inaccurate, misleading, or implying official UNSW endorsement without prior written authorization may be requested to be modified or taken down immediately.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 11. CANCELLATION & FEES (UPDATED TO MATCH T&Cs) */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('financial')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Deposit, Overtime, Cleaning & Cancellation Charges</span>
                                <span>{activeAccordion === 'financial' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'financial' && (
                                <div className="p-6 bg-white text-xs space-y-6 animate-in slide-in-from-top-1 duration-150 text-gray-600 font-normal leading-relaxed">

                                    {/* DEPOSIT & BALANCE SCHEDULE */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                                            <span className="font-bold text-neutral-900 uppercase">Deposit & Balance Schedule</span>
                                            <span className="font-mono font-bold bg-neutral-900 text-white px-2 py-0.5 rounded-xs">50% / 50%</span>
                                        </div>
                                        <p>
                                            A <strong>50% deposit</strong> is required upon booking to confirm your reservation. The remaining <strong>50% balance</strong> must be paid no later than <strong>48 hours prior</strong> to the event commencement.
                                        </p>
                                    </div>

                                    {/* OVERTIME RATES */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                                            <span className="font-bold text-neutral-900 uppercase">Overtime Rates</span>
                                            <span className="font-mono font-bold bg-neutral-900 text-white px-2 py-0.5 rounded-xs">$150 / HR</span>
                                        </div>
                                        <p>
                                            A standard 15-minute grace window applies on both ends of your reservation. Extensions exceeding this generate pro-rata penalties based on hourly rate.
                                        </p>
                                    </div>

                                    {/* CLEANING & RESET FEE */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                                            <span className="font-bold text-neutral-900 uppercase">Cleaning & Reset Fee</span>
                                            <span className="font-mono font-bold bg-neutral-900 text-white px-2 py-0.5 rounded-xs">$200 + GST MIN</span>
                                        </div>
                                        <p>
                                            Please leave the space as clean and orderly as you found it. Leaving rubbish, catering waste or promotional clutter will initiate a cleaning fee recovery charge ($200 + GST minimum).
                                        </p>
                                    </div>

                                    {/* CANCELLATION CHARGES */}
                                    <div className="space-y-3">
                                        <div className="border-b border-neutral-100 pb-2">
                                            <span className="font-bold text-neutral-900 uppercase">Cancellation Charges</span>
                                        </div>
                                        <div className="space-y-2">
                                            <p>Cancellations must be filed formally in writing. Charges are dependent on notice timelines:</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                                                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs">
                                                    <span className="block font-sans font-bold text-neutral-900 uppercase text-[9px]">6+ Working Days</span>
                                                    <span className="text-neutral-900 font-bold font-sans">Full Refund / No Fee</span>
                                                </div>
                                                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs">
                                                    <span className="block font-sans font-bold text-neutral-900 uppercase text-[9px]">3 - 5 Working Days</span>
                                                    <span className="text-neutral-900 font-bold font-sans">50% Fee Forfeited</span>
                                                </div>
                                                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs">
                                                    <span className="block font-sans font-bold text-neutral-900 uppercase text-[9px]">Less than 2 Days</span>
                                                    <span className="text-neutral-900 font-bold font-sans">100% Fee Forfeited</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider pt-2 border-t border-neutral-100">
                                        ⚠️ All outstanding balances must be fully resolved before securing future bookings.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 12. BUMP-OUT & VACATING */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('exit')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>My event is finished, how should I leave the space?</span>
                                <span>{activeAccordion === 'exit' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'exit' && (
                                <div className="p-6 bg-white text-xs space-y-5 animate-in slide-in-from-top-1 duration-150 text-gray-600 font-normal leading-relaxed">
                                    <div className="p-3.5 bg-neutral-900 text-white font-medium rounded-xs">
                                        Leave the space as clean as you found it. You must clear out all rubbish and pack away equipment before your end time. Never leave the room without notifying venue staff first.
                                    </div>

                                    <div>
                                        <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide mb-2">Mandatory Checkout Checklist:</h5>
                                        <ul className="list-disc pl-4 space-y-2 text-neutral-600">
                                            <li>Turn off AV displays.</li>
                                            <li>Put everything you took out back in its place. Flag items if you are unsure where they belong.</li>
                                            <li>Use the cleaning supplies provided to wipe tables, benches, and whiteboards.</li>
                                            <li>Load used glasses or mugs straight into the dishwasher (if full, stack neatly inside the sink).</li>
                                            <li>Do not leave food debris in sink drains.</li>
                                            <li>Large boxes (e.g., pizza boxes) must go into the large bins in the Hallway by the back door of the MCIC Design Space.</li>
                                            <li>Lost items can be taken with you, handed to venue staff, or taken to Gate 2 Security.</li>
                                            <li>You may be requested to assist setting up the room for the following event during your pack-up time.</li>
                                            <li>Contact your venue contact to let them know you are ready to depart and need the space locked.</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 13. OTHER CAMPUS & CBD SPACES */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('other-spaces')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>What other spaces can I book on Kensington campus, Paddington, or in the CBD?</span>
                                <span>{activeAccordion === 'other-spaces' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'other-spaces' && (
                                <div className="p-6 bg-white text-xs space-y-6 animate-in slide-in-from-top-1 duration-150 text-gray-600 font-normal leading-relaxed">
                                    <p className="text-gray-600 font-medium">
                                        It can be a real challenge finding suitable spaces on campus! UNSW staff, student groups, and innovation ecosystem members can explore these recommended seminar, meeting, workshop, and event spaces:
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">

                                        {/* INNOVATION HUB STUDIO - PADDINGTON */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Innovation Hub Studio (A104)</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Paddington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Capacity:</strong> 16–20 people</li>
                                                <li><strong>Details:</strong> Managed by UNSW Innovation Hub. Ideal for small to medium workshops.</li>
                                                <li><strong>Contact:</strong> <a href="mailto:innovationhub@unsw.edu.au" className="underline font-bold text-black">innovationhub@unsw.edu.au ↗</a></li>
                                            </ul>
                                        </div>

                                        {/* BOARDROOM - LEVEL 5 LOWY */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Boardroom, Level 5 Lowy (501)</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Capacity:</strong> 18 people</li>
                                                <li><strong>Details:</strong> Belongs to ADA (Arts, Design & Architecture). Nicole Pridham can book on behalf of the UNSW Innovation Ecosystem.</li>
                                                <li><strong>Contact:</strong> <a href="mailto:innovationhub@unsw.edu.au" className="underline font-bold text-black">innovationhub@unsw.edu.au ↗</a></li>
                                            </ul>
                                        </div>

                                        {/* MEETING ROOM - LEVEL 5 LOWY */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Meeting Room, Level 5 Lowy (534)</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Capacity:</strong> 10 people</li>
                                                <li><strong>Details:</strong> ADA room. Best suited for small workshops or team meetings.</li>
                                                <li><strong>Contact:</strong> <a href="mailto:innovationhub@unsw.edu.au" className="underline font-bold text-black">innovationhub@unsw.edu.au ↗</a></li>
                                            </ul>
                                        </div>

                                        {/* HEALTH TRANSLATION HUB */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Health Translation Hub (HTH)</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Spaces:</strong> HTH Seminar Room & Level 5 Meeting Room</li>
                                                <li>
                                                    <strong>Details & Bookings:</strong> Explore options on the <a href="https://www.unsw.edu.au/precincts/rhip/hth/events/seminar-room" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">HTH Seminar Room Page ↗</a>.
                                                </li>
                                            </ul>
                                        </div>

                                        {/* SEMINAR ROOMS */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Campus Seminar Rooms</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Capacity:</strong> Cluster style layout for 36 pax. Built-in self-service AV. Free for staff.</li>
                                                <li>
                                                    <strong>How to Book:</strong> Book via <a href="https://resourcebooker.unsw.edu.au/" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">UNSW Resource Booker ↗</a> (or via <a href="https://my.unsw.edu.au" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">myUNSW ↗</a> under <em>Services for Staff</em>).
                                                </li>
                                            </ul>
                                        </div>

                                        {/* CBD MEETING ROOMS */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">UNSW CBD Campus Rooms</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Sydney CBD</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Capacity:</strong> 6–8 guests for up to 4 hours (Mon–Fri 8am–5pm). Teams AV built-in. Free for staff.</li>
                                                <li><strong>How to Book:</strong> Email <a href="mailto:cbdcampus@unsw.edu.au" className="underline font-bold text-black">cbdcampus@unsw.edu.au ↗</a> or visit the <a href="https://www.unsw.edu.au/estate/campus-development/projects/cbd-campus" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">CBD Campus Info Page ↗</a>.</li>
                                            </ul>
                                        </div>

                                        {/* BUSINESS SCHOOL LOUNGE */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Business School Dean's Lounge</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Details:</strong> Executive meeting space and lounge setup for Business School events.</li>
                                                <li><strong>Link:</strong> <a href="https://www.unsw.edu.au/estate/campus-development/projects/business-school-deans-lounge" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">Business School Lounge Page ↗</a></li>
                                            </ul>
                                        </div>

                                        {/* DESIGN NEXT STUDIO */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Design Next Studio</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Details:</strong> Dedicated design sprint & interdisciplinary teaching space.</li>
                                                <li><strong>Link:</strong> <a href="https://www.designnext.unsw.edu.au/" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">Design Next Studio ↗</a></li>
                                            </ul>
                                        </div>

                                        {/* TEACHING COMMONS */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Teaching Commons</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Details:</strong> Collaborative teaching and staff development environment.</li>
                                                <li><strong>Link:</strong> <a href="https://www.education.unsw.edu.au/teaching/teaching-commons" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">Teaching Commons ↗</a></li>
                                            </ul>
                                        </div>

                                        {/* THE BANK */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">The Bank</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Details:</strong> Specialised space managed by the Health Precincts team.</li>
                                                <li><strong>Contact:</strong> Enquire directly through the UNSW Health Precincts team.</li>
                                            </ul>
                                        </div>

                                        {/* CHANCELLERY MEETING ROOMS */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Chancellery Meeting Rooms</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Details:</strong> High-level executive boardrooms and meeting spaces.</li>
                                                <li><strong>How to Book:</strong> Enquire via Chancellery executive booking staff.</li>
                                            </ul>
                                        </div>

                                        {/* ARC ROUNDHOUSE BOOKINGS */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">Arc Roundhouse</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Kensington</span>
                                            </div>
                                            <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                <li><strong>Details:</strong> Large-scale event spaces and main hall bookings (for a cost).</li>
                                                <li><strong>Link:</strong> <a href="https://www.arc.unsw.edu.au/roundhouse/bookings" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">Arc Roundhouse Bookings ↗</a></li>
                                            </ul>
                                        </div>

                                        {/* MAIN CAMPUS VENUES & EVENT SERVICES */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2 sm:col-span-2">
                                            <div className="flex justify-between items-center border-b border-neutral-200 pb-1.5">
                                                <span className="font-extrabold text-black uppercase text-[10px] tracking-wider">UNSW Venue & Event Services (Central Venues)</span>
                                                <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">Campus Wide</span>
                                            </div>
                                            <p className="text-neutral-700 text-[11px]">
                                                For major campus venues, large lecture theatres, outdoor lawns, and dedicated event management support, explore options directly through <a href="https://www.venueandeventservices.unsw.edu.au/venues" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black">UNSW Venue & Event Services ↗</a>.
                                            </p>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>

                        {/* DO I NEED TO WRITE MY OWN RISK ASSESSMENT */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('riskAssessment')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>Do I need to write my own risk assessment for an event in one of your spaces?</span>
                                <span>{activeAccordion === 'riskAssessment' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'riskAssessment' && (
                                <div className="p-6 bg-white text-xs space-y-4 animate-in slide-in-from-top-1 duration-150 text-neutral-600 font-normal leading-relaxed">
                                    <p>
                                        No, you do not need to create your own risk assessment for standard events hosted in our facilities.
                                    </p>
                                    <p>
                                        We have an official UNSW risk assessment covering general events within the Michael Crouch Innovation Centre (MCIC) Event Spaces: <strong>Risk Assessment #1120290</strong>.
                                    </p>
                                    <p>
                                        However, if your event involves high-power electrical gear, heavy staging, specialised machinery, or high-risk activities beyond standard event operations, please notify our team prior to your booking so safety compliance can be reviewed.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 14. FIRST AID, SECURITY, EMERGENCY & SAFETY */}
                        <div>
                            <button
                                type="button"
                                onClick={() => toggleAccordion('security')}
                                className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                            >
                                <span>First Aid, Security, Emergency & Safety</span>
                                <span>{activeAccordion === 'security' ? '−' : '+'}</span>
                            </button>
                            {activeAccordion === 'security' && (
                                <div className="p-6 bg-white text-xs space-y-5 animate-in slide-in-from-top-1 duration-150 text-neutral-700 font-medium leading-relaxed">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                        {/* FIRST AID, INJURY & EVACUATION PROCEDURES (LEFT COLUMN) */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-4 flex flex-col justify-between">
                                            <div className="space-y-4">

                                                {/* FIRST AID & DEFIBRILLATOR LOCATIONS */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
                                                        <span className="font-extrabold text-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                                            <span>🩹</span> First Aid & Defibrillator
                                                        </span>
                                                        <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">
                                                            On-Site
                                                        </span>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <span className="font-bold text-neutral-900 block text-[11px]">First Aid Kits Located:</span>
                                                        <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                            <li>• Wall beside the Computer in Design Space <em>(Red Bag)</em></li>
                                                            <li>• On the Red Cabinet in Founders Place <em>(White Box)</em></li>
                                                            <li>• In UNSW Makerspace beside Ground Floor Event Spaces <em>(White Cabinet)</em></li>
                                                            <li>• In UNSW Founders Level 1 Copy Room <em>(White Cabinet)</em></li>
                                                        </ul>
                                                    </div>

                                                    <div className="p-2.5 bg-red-50/60 border border-red-200/80 rounded-xs text-[11px] text-red-950 mt-2">
                                                        ⚡ <strong>Defibrillator:</strong> Located on Ground Floor at glass doors between Hilmer Building Foyer and hallway behind MCIC Ground Floor Event Spaces.{' '}
                                                        <a href="https://link.mazemap.com/0S4Nxpm9" target="_blank" rel="noopener noreferrer" className="font-bold text-red-700 underline hover:text-red-900 inline-flex items-center gap-0.5">
                                                            View Map Pin ↗
                                                        </a>
                                                    </div>
                                                </div>

                                                {/* IN CASE OF INJURY */}
                                                <div className="space-y-1.5 pt-3 border-t border-neutral-200/60">
                                                    <span className="font-bold text-neutral-900 block text-[10px] uppercase tracking-wider">🩺 In Case of Injury:</span>
                                                    <p className="text-neutral-700 text-[11px]">
                                                        Depending on severity and preference, seek prompt attention via:
                                                    </p>
                                                    <ul className="space-y-1 text-neutral-700 text-[11px]">
                                                        <li>• <strong>First Aid Officer:</strong> Hamish, Tamara or any Makerspace Staff</li>
                                                        <li>• <strong>Ambulance:</strong> Call Security on <a href="tel:0293856666" className="font-mono font-bold text-black underline">9385 6666</a> (or ext <span className="font-mono font-bold">56666</span>)</li>
                                                        <li>• Hospital or nearest medical facility</li>
                                                        <li>• Treating local doctor</li>
                                                    </ul>
                                                </div>

                                                {/* BUILDING EVACUATION */}
                                                <div className="space-y-2 pt-3 border-t border-neutral-200/60">
                                                    <div className="flex justify-between items-center border-b border-neutral-200 pb-1.5">
                                                        <span className="font-extrabold text-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                                            <span>🚨</span> Building Evacuation Protocols
                                                        </span>
                                                    </div>

                                                    <div className="space-y-1.5 text-[11px]">
                                                        <span className="font-bold text-neutral-900 block">Building & Floor Wardens:</span>
                                                        <p className="text-neutral-700">
                                                            Find warden details on <strong>Archibus</strong> under <em>"Emergency Contacts by Building"</em>, or contact Security Ops (<a href="tel:0293856000" className="font-mono font-bold text-black underline">9385 6000</a>) / <a href="mailto:emergency@unsw.edu.au" className="font-mono font-bold text-black underline">emergency@unsw.edu.au</a>.
                                                        </p>
                                                    </div>

                                                    <div className="space-y-1.5 text-[11px]">
                                                        <span className="font-bold text-neutral-900 block">Evacuation Process & Drills:</span>
                                                        <p className="text-neutral-700">
                                                            Follow instructions on <strong>orange A3 posters</strong> displayed throughout the building. Annual drills are conducted to ensure safe exit.
                                                        </p>
                                                    </div>
                                                </div>

                                            </div>

                                            {/* EVACUATION LINK */}
                                            <div className="pt-3 border-t border-neutral-200/60 text-[11px]">
                                                <p className="text-neutral-600">
                                                    Additional information available at:
                                                </p>
                                                <a href="https://www.estate.unsw.edu.au/emergencies" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline hover:text-[#EAD64D]">
                                                    UNSW Emergency & Evacuation Procedures ↗
                                                </a>
                                            </div>
                                        </div>

                                        {/* CAMPUS SECURITY & SAFEZONE APP (RIGHT COLUMN) */}
                                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-4 flex flex-col justify-between">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
                                                    <span className="font-extrabold text-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                                        <span>🛡️</span> Campus Security & SafeZone
                                                    </span>
                                                    <span className="bg-[#EAD64D] text-black font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-xs">
                                                        24/7 Gate 2
                                                    </span>
                                                </div>

                                                <p className="text-neutral-700 text-[11px]">
                                                    Security is available <strong>24 hours a day, 7 days a week</strong> at Gate 2 on High Street.
                                                </p>

                                                {/* 24/7 NUMBERS */}
                                                <div className="p-3 bg-white border border-neutral-200/80 rounded-xs space-y-2">
                                                    <span className="font-bold text-neutral-900 block uppercase text-[10px] tracking-wide">24/7 Phone Numbers:</span>
                                                    <div className="space-y-1 text-[11px]">
                                                        <p>
                                                            General Operations: <a href="tel:0293856000" className="font-mono font-bold text-black underline">9385 6000</a>
                                                        </p>
                                                        <p className="text-red-600 font-bold">
                                                            Emergency Line: <a href="tel:0293856666" className="font-mono underline">9385 6666</a>
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* SAFEZONE APP CARD */}
                                                <div className="p-3 bg-white border border-neutral-200/80 rounded-xs space-y-2.5">
                                                    <div className="flex items-center gap-1.5 text-neutral-900 font-bold uppercase text-[10px] tracking-wide">
                                                        <span>📲</span> SafeZone App
                                                    </div>
                                                    <p className="text-neutral-700 text-[11px]">
                                                        Download the <strong>SafeZone App</strong> to stay connected with safety alerts, emergency assistance, and first aid response on campus.
                                                    </p>

                                                    {/* SCREENSHOT CONTAINER */}
                                                    <div className="border border-neutral-200 rounded-xs overflow-hidden bg-neutral-100">
                                                        <img
                                                            src="/images/safezone-app.png"
                                                            alt="SafeZone App Setup & Features"
                                                            className="w-full h-auto object-cover block"
                                                        />
                                                    </div>
                                                </div>

                                                <p className="text-neutral-700 text-[11px]">
                                                    Inquiries: <a href="mailto:security.services@unsw.edu.au" className="font-mono font-bold text-black underline">security.services@unsw.edu.au</a>
                                                </p>
                                            </div>

                                            <div className="pt-3 border-t border-neutral-200/60 text-[11px]">
                                                <p className="text-neutral-600">
                                                    Additional information available at:
                                                </p>
                                                <a href="https://www.estate.unsw.edu.au/protective-services/your-safety" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline hover:text-[#EAD64D]">
                                                    UNSW Protective Services Portal ↗
                                                </a>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}

                            {/* VENUE HIRE TERMS & CONDITIONS */}
                            <div>
                                <button
                                    type="button"
                                    onClick={() => toggleAccordion('terms-conditions')}
                                    className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wide text-neutral-800 bg-neutral-50/60 hover:bg-neutral-50 border-t border-neutral-100 cursor-pointer"
                                >
                                    <span>Venue Hire Terms & Conditions (T&Cs)</span>
                                    <span>{activeAccordion === 'terms-conditions' ? '−' : '+'}</span>
                                </button>
                                {activeAccordion === 'terms-conditions' && (
                                    <div className="p-6 bg-white text-xs space-y-6 animate-in slide-in-from-top-1 duration-150 text-neutral-700 font-normal leading-relaxed">

                                        {/* TOP ACTION BAR */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-neutral-50 border border-neutral-200 rounded-xs">
                                            <span className="text-[11px] text-neutral-600 font-medium">
                                                By submitting a booking request, hirers agree to abide by all sections of the Venue Hire Agreement outlined below.
                                            </span>
                                            <a
                                                href="/docs/MCIC_Venue_Hire_Terms_and_Conditions.pdf"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-neutral-900 text-white px-3 py-1.5 rounded-xs font-bold uppercase tracking-wider text-[10px] hover:bg-neutral-800 text-center whitespace-nowrap shrink-0"
                                            >
                                                Download PDF ↗
                                            </a>
                                        </div>

                                        {/* FULL UNABBREVIATED AGREEMENT TEXT DISPLAY */}
                                        <div className="space-y-6 border-t border-neutral-100 pt-4 text-neutral-600 text-[11px] font-sans">

                                            <div className="space-y-1 font-mono text-[10px] text-neutral-500 uppercase tracking-wider">
                                                <strong className="text-neutral-900 text-xs block font-sans font-bold">VENUE HIRE AGREEMENT: TERMS & CONDITIONS</strong>
                                                <p><strong>PARTIES:</strong></p>
                                                <p>1. UNSW Founders (ABN 57 195 873 179) of Michael Crouch Innovation Centre, UNSW Sydney, Sydney, NSW 2052</p>
                                                <p>2. "The Hirer"</p>
                                                <p>(together, the "Parties").</p>
                                            </div>

                                            {/* SECTION 1 */}
                                            <div className="space-y-1.5 border-b border-neutral-100 pb-4">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 1. PAYMENT & DEPOSIT SCHEDULE</h5>
                                                <p><strong>1.1 Deposit:</strong> A deposit payment of 50% of the total hire charge is required upon booking to confirm and secure the space reservation.</p>
                                                <p><strong>1.2 Balance Payment:</strong> The remaining 50% balance must be paid no later than 48 hours prior to the event commencement time upon receipt of a tax invoice.</p>
                                                <p><strong>1.3 Failure to Pay:</strong> Failure to settle the deposit or final balance within the required timeframe grants UNSW Founders the right to cancel the booking.</p>
                                                <p><strong>1.4 Cleaning & Reset Surcharges:</strong> If the Hired and Shared Areas are left disorderly, dirty, or requiring furniture resets after the booking window, UNSW Founders reserves the right to recover full cleaning costs at a minimum rate of $200 + GST.</p>
                                                <p><strong>1.5 Casual Staffing Rates:</strong> Event support staff are billed at $50 per hour (minimum 3-hour shift for Mon–Sat; minimum 4-hour shift for Sundays and Public Holidays).</p>
                                                <p><strong>1.6 Staff Overtime:</strong> Overtime beyond 8 hours is charged at 1.5x the base rate ($75/hr). Shifts exceeding 10 hours are charged at double time ($100/hr).</p>
                                            </div>

                                            {/* SECTION 2 */}
                                            <div className="space-y-1.5 border-b border-neutral-100 pb-4">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 2. CANCELLATION, REFUNDS & VENUE VARIATIONS</h5>
                                                <p><strong>2.1 Cancellation Window & Charges (By Hirer):</strong></p>
                                                <div className="pl-4 space-y-1">
                                                    <p><strong>2.1.1 6+ Working Days Notice:</strong> Cancellations received in writing at least 6 working days prior to the event will receive a full refund of all monies paid.</p>
                                                    <p><strong>2.1.2 3 to 5 Working Days Notice:</strong> Cancellations received between 3 and 5 working days prior will forfeit 50% of the total booking fee.</p>
                                                    <p><strong>2.1.3 Less than 2 Working Days Notice:</strong> Cancellations received less than 2 working days prior will forfeit 100% of the total booking fee.</p>
                                                </div>
                                                <p><strong>2.2 Venue Scheduling Conflicts & Emergency Variations (By Venue):</strong></p>
                                                <div className="pl-4 space-y-1">
                                                    <p><strong>2.2.1</strong> UNSW Founders reserves the right to vary, reschedule, or cancel a booking due to emergency facility maintenance, safety concerns, unexpected double-booking, or urgent internal program priorities.</p>
                                                    <p><strong>2.2.2</strong> In such instances, UNSW Founders will provide as much advance notice as reasonably practicable and issue a full (100%) refund of all hire fees paid for that booking.</p>
                                                </div>
                                            </div>

                                            {/* SECTION 3 */}
                                            <div className="space-y-1.5 border-b border-neutral-100 pb-4">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 3. HIRER RESPONSIBILITIES</h5>
                                                <p><strong>3.1 Authorised Purpose:</strong> The Hirer may use the venue only for the specific purpose outlined in the booking agreement and must abide by all venue directives.</p>
                                                <p><strong>3.2 Supervision:</strong> The Hirer must maintain active physical supervision throughout the booking window. Guests and facilities must not be left unattended.</p>
                                                <p><strong>3.3 Damages:</strong> Any damage to the venue, furniture, or AV equipment caused during the hire period is the sole financial responsibility of the Hirer (charged at full replacement cost).</p>
                                                <p><strong>3.4 Entry & Emergency Compliance:</strong> UNSW Founders staff reserve the right to refuse entry to or remove any person from the premises on reasonable safety grounds. Hirers must comply with all emergency personnel instructions and emergency evacuation procedures.</p>
                                            </div>

                                            {/* SECTION 4 */}
                                            <div className="space-y-1.5 border-b border-neutral-100 pb-4">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 4. EQUIPMENT & VENUE USE</h5>
                                                <p><strong>4.1 Equipment Care:</strong> The Hirer accepts full responsibility for the safe operation of all hired items and must restore equipment to its original condition upon conclusion (fair wear and tear excepted).</p>
                                                <p><strong>4.2 Specialised Equipment Notification:</strong> The Hirer must notify UNSW Founders prior to bringing in high-power electrical gear, staging, or specialised heavy equipment so technical staff can review safety compliance. Standard laptops, handheld cameras, personal presentation devices, and small portable items do not require prior notice.</p>
                                                <p><strong>4.3 Prohibited Materials:</strong> Open flames, explosive materials, hazardous chemicals, fuels, and pyrotechnics are strictly prohibited anywhere within or near the venue.</p>
                                                <p><strong>4.4 Asset Egress:</strong> All external props, catering supplies, and personal items must be removed immediately at the conclusion of the booking period.</p>
                                            </div>

                                            {/* SECTION 5 */}
                                            <div className="space-y-1.5 border-b border-neutral-100 pb-4">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 5. CATERING & ALCOHOL</h5>
                                                <p><strong>5.1 Self-Service Catering:</strong> Hirers have full responsibility for organising food and beverages. All food and waste must be cleared away before departure. UNSW Founders reserves the right to reject third-party catering services deemed unsafe or damaging.</p>
                                                <p><strong>5.2 Responsible Service of Alcohol (RSA):</strong> If alcohol is being served, the Hirer or designated server must hold a valid NSW RSA competency card submitted prior to the event. Alcohol must be served responsibly in accordance with NSW legislation. Alternatively, the Hirer may request and hire an RSA-certified UNSW Founders casual staff member at standard casual staffing rates ($50/hr, minimum shift requirements apply). Alcohol service will be refused or suspended if RSA requirements are unfulfilled or if minors are present.</p>
                                            </div>

                                            {/* SECTION 6 */}
                                            <div className="space-y-1.5 border-b border-neutral-100 pb-4">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 6. TICKETING, REGISTRATION & EVENT REVENUE</h5>
                                                <p><strong>6.1 Hirer Ticketing Responsibility:</strong> Unless otherwise agreed in writing, the Hirer manages their own event registration or ticketing via their preferred external platform (e.g., Humanitix, Luma, Eventbrite, or self-hosted forms) and holds sole legal and financial responsibility for guest management and attendee ticket refunds.</p>
                                                <p><strong>6.2 Discretionary Venue & Platform Ticketing Option:</strong> UNSW Founders reserves the right, at its absolute discretion or by mutual written agreement, to manage, execute, or require event ticketing and attendee check-in through UNSW Founders’ nominated ticketing provider or official venue platform. Where UNSW Founders manages or hosts event ticketing:</p>
                                                <div className="pl-4 space-y-1 text-neutral-600">
                                                    <p><strong>6.2.1 Multi-Party Fee & Revenue Distribution:</strong> For paid or ticketed events managed by UNSW Founders, total ticket proceeds collected will be distributed to cover:</p>
                                                    <p className="pl-3">(a) Applicable platform software or transaction processing fees;</p>
                                                    <p className="pl-3">(b) A UNSW Founders venue consignment fee of $2.50 (inc. GST) per ticket sold or distributed for paid tickets priced over $25.00;</p>
                                                    <p className="pl-3">(c) Any outstanding venue hire, staff, or operational fees owed to UNSW Founders under this Agreement;</p>
                                                    <p className="pl-3">(d) Net remaining ticket revenue payable to the Hirer following event conclusion.</p>
                                                    <p><strong>6.2.2 Event Cancellation Refunds:</strong> In the event of event postponement or cancellation, UNSW Founders reserves the right to deduct unrecoverable transaction processing fees and refund attendees directly from collected proceeds.</p>
                                                </div>
                                            </div>

                                            {/* SECTION 7 */}
                                            <div className="space-y-1.5 border-b border-neutral-100 pb-4">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 7. PROMOTION & BRAND PROTECTION</h5>
                                                <p><strong>7.1 Venue Attribution:</strong> The Hirer may use the venue name ("Michael Crouch Innovation Centre") to indicate the physical event location.</p>
                                                <p><strong>7.2 Brand Review Right:</strong> UNSW Founders reserves the right to review any promotional material bearing its name, logo, or venue branding, and may request immediate edits, correction, or withdrawal of materials deemed inaccurate, misleading, or in conflict with university policies.</p>
                                            </div>

                                            {/* SECTION 8 */}
                                            <div className="space-y-1.5 border-b border-neutral-100 pb-4">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 8. SAFETY & INSURANCE</h5>
                                                <p><strong>8.1 Workplace Health & Safety:</strong> Both parties must comply with applicable WHS legislation. Hirers must follow all safety instructions provided by UNSW staff.</p>
                                                <p><strong>8.2 Liability & Indemnity:</strong> The Hirer agrees to hold UNSW Founders indemnified against third-party claims, personal injury, or property loss arising directly from the Hirer’s negligence or event activities.</p>
                                                <p><strong>8.3 Property Insurance:</strong> UNSW Founders is not responsible for loss, theft, or damage to personal or external contractor property brought into the venue.</p>
                                            </div>

                                            {/* SECTION 9 */}
                                            <div className="space-y-1.5">
                                                <h5 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">SECTION 9. TERMINATION</h5>
                                                <p><strong>9.1 Termination for Breach:</strong> UNSW Founders may terminate this Agreement immediately if the Hirer breaches terms, fails to settle invoices, or experiences insolvency/administration.</p>
                                                <p><strong>9.2 No Claim Clause:</strong> Upon termination, cancellation, or scheduling variation of this Agreement, the Hirer's sole remedy against UNSW Founders is limited to a refund of hire fees paid (where applicable). The Hirer holds no right or legal claim against UNSW Founders for indirect damages, lost commercial revenue, marketing expenses, or consequential losses.</p>
                                            </div>

                                        </div>
                                    </div>
                                )}
                            </div>                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}