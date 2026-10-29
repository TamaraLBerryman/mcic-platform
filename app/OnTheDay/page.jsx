"use client";

import React, { useState } from "react";

export default function DayOfEventiPadPage() {
    // Selected Room State
    const [selectedRoom, setSelectedRoom] = useState("eventSpace");
    // Options: 'entireSpace' | 'eventSpace' | 'designSpace' | 'foundersPlace'

    // Selected Video Index State (for rooms with multiple videos)
    const [selectedVideoIdx, setSelectedVideoIdx] = useState(0);

    // Card Tabs & Dropdown States
    const [cateringTab, setCateringTab] = useState("food"); // 'food' | 'alcohol'
    const [wifiTab, setWifiTab] = useState("eduroam"); // 'eduroam' | 'guest'
    const [transportTab, setTransportTab] = useState("public"); // 'public' | 'parking' | 'bikes'
    const [showTerms, setShowTerms] = useState(false); // Toggle for T&Cs card dropdown
    const [showAllFirstAid, setShowAllFirstAid] = useState(false); // Toggle for All Kit Locations
    const [showCheckoutList, setShowCheckoutList] = useState(false); // Toggle for Bump Out Checklist

    // Full Unabbreviated Checkout Directives Across Rooms
    const fullCheckoutChecklist = [
        "Turn off AV displays.",
        "Put everything you took out back in its place. Flag items if you are unsure where they belong.",
        "Use the cleaning supplies provided to wipe tables, benches, and whiteboards.",
        "Load used glasses or mugs straight into the dishwasher (if full, stack neatly inside the sink).",
        "Do not leave food debris in sink drains.",
        "Large boxes (e.g., pizza boxes) must go into the large bins in the Hallway by the back door of the MCIC Design Space.",
        "Lost items can be taken with you, handed to venue staff, or taken to Gate 2 Security.",
        "You may be requested to assist setting up the room for the following event during your pack-up time.",
        "Contact your venue contact to let them know you are ready to depart and need the space locked."
    ];

    // Dynamic Room-Specific Data Map
    const roomDetails = {
        entireSpace: {
            name: "Full Ground Floor Space",
            code: "G22 + G26",
            aircon: {
                type: "manual",
                location: "Buttons by each hallway door (4 total).",
                note: "Press button hourly. Keep doors closed for most effective heating/cooling."
            },
            kitchen: {
                setup: "Ground Floor Kitchen (2 ZipTaps, 2 Microwaves).",
                fridgeNote: "Ground floor fridge & cupboards are completely full and strictly restricted to UNSW Founders Staff."
            },
            firstAid: "Hanging on the wall inside the Design Space AV Cabinet (Red Bag).",
            evacuation: "Exit directly through glass doors onto Alumni Lawn.",
            avVideos: [
                {
                    title: "Projector, TVs & Lectern",
                    url: "/videos/av-full-space.mov"
                },
                {
                    title: "Stage Lights",
                    url: "/videos/stage-lights.mov"
                }
            ],
            avSteps: [
                { step: "1", title: "Lectern Touchscreen", desc: "Tap the main touch console on the front lectern to wake up the system." },
                { step: "2", title: "Audio & Mics", desc: "4 wireless handhelds & 4 lapels stored in lectern drawer. Adjust volume on touch screen." },
                { step: "3", title: "Dual Display", desc: "Select Lectern PC or Laptop HDMI source to send presentation to all 4 screens." }
            ]
        },
        eventSpace: {
            name: "MCIC Ground - Event Space",
            code: "Room G26",
            aircon: {
                type: "manual",
                location: "Buttons by each hallway door (2 total).",
                note: "Press button hourly. Keep doors closed for most effective heating/cooling."
            },
            kitchen: {
                setup: "Ground Floor Kitchen (2 ZipTaps, 2 Microwaves).",
                fridgeNote: "Ground floor fridge & cupboards are completely full and strictly restricted to UNSW Founders Staff."
            },
            firstAid: "Hanging on the wall inside the AV Cabinet in the adjoining Design Space (Red Bag).",
            evacuation: "Exit directly through glass double doors onto Alumni Lawn.",
            avVideos: [
                {
                    title: "Projector & Lectern",
                    url: "/videos/av-event-space.mov"
                },
                {
                    title: "Stage Lights",
                    url: "/videos/stage-lights.mov"
                }
            ],
            avSteps: [
                { step: "1", title: "Lectern Console", desc: "Tap main touchscreen on lectern to lower front projector screens." },
                { step: "2", title: "Microphones", desc: "Lectern mic + 2 handhelds + 2 lapels available in lectern drawer." },
                { step: "3", title: "Presentation", desc: "Plug HDMI into lectern or select built-in PC on touchscreen." }
            ]
        },
        designSpace: {
            name: "MCIC Ground - Design Space",
            code: "Room G22",
            aircon: {
                type: "manual",
                location: "Buttons by each hallway door (2 total).",
                note: "Press button hourly. Keep doors closed for most effective heating/cooling."
            },
            kitchen: {
                setup: "Ground Floor Kitchen (2 ZipTaps, 2 Microwaves).",
                fridgeNote: "Ground floor fridge & cupboards are completely full and strictly restricted to UNSW Founders Staff."
            },
            firstAid: "Hanging on the wall inside the AV Cabinet (Red Bag).",
            evacuation: "Exit through the back glass doors and assemble on Alumni Lawn.",
            avVideos: [
                {
                    title: "Design Space AV Setup",
                    url: "/videos/av-design-space.mov"
                }
            ],
            avSteps: [
                { step: "1", title: "Wall Panel", desc: "Touch wall controller beside AV rack to turn on screen." },
                { step: "2", title: "Microphones", desc: "2 wireless handhelds + 2 lapel mics stored inside AV rack." },
                { step: "3", title: "Mobile Display", desc: "Connect portable TV carts using wireless HDMI dongles." }
            ]
        },
        foundersPlace: {
            name: "MCIC Level 1 - Founders Place",
            code: "Room 124",
            aircon: {
                type: "automatic",
                location: "Central Building Automation (No Manual Controller)",
                note: "Air conditioning in Founders Place runs automatically set at 23 degrees. It cannot be turned on or off or adjusted."
            },
            kitchen: {
                setup: "Level 1 Shared Kitchen (ZipTap, Microwave, Fridge).",
                fridgeNote: "Level 1 fridge IS available for short-term event drink cooling during your booking window."
            },
            firstAid: "Sitting directly on top of the red AV Cabinet inside Founders Place.",
            evacuation: "Proceed down Level 1 stairs to Ground Floor, exit glass doors to Alumni Lawn.",
            avVideos: [
                {
                    title: "Founders Place AV Setup",
                    url: "/videos/av-founders-place.mov"
                }
            ],
            avSteps: [
                { step: "1", title: "Press 'ON'", desc: "Press 'ON' on the wall panel. Projector turns on and screen lowers automatically." },
                { step: "2", title: "Connect HDMI", desc: "Plug wall HDMI into laptop (USB-C adapter attached for Mac)." },
                { step: "3", title: "Press 'OFF'", desc: "When finished, press 'OFF' on panel to retract screen." }
            ]
        }
    };

    const currentData = roomDetails[selectedRoom];
    const currentVideo = currentData.avVideos[selectedVideoIdx] || currentData.avVideos[0];

    // Handle Room Switching & Reset Video Index
    const handleRoomChange = (roomKey) => {
        setSelectedRoom(roomKey);
        setSelectedVideoIdx(0);
    };

    return (
        <div className="min-h-screen bg-neutral-100 text-neutral-900 font-sans flex flex-col justify-between p-6 sm:p-8 select-none overflow-x-hidden">

            {/* TOP BAR & ROOM SELECTOR */}
            <header className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black">
                            Operational Guide
                        </h1>
                    </div>
                </div>

                {/* ROOM SELECTION TABS */}
                <div className="flex bg-neutral-100 p-1 rounded-md text-[10px] font-bold uppercase tracking-wide overflow-x-auto shrink-0">
                    <button
                        onClick={() => handleRoomChange("eventSpace")}
                        className={`px-3 py-2 rounded-xs transition-all cursor-pointer whitespace-nowrap ${selectedRoom === "eventSpace" ? "bg-black text-[#EAD64D] shadow-xs" : "text-neutral-600 hover:text-black"}`}
                    >
                        Event Space (G26)
                    </button>
                    <button
                        onClick={() => handleRoomChange("designSpace")}
                        className={`px-3 py-2 rounded-xs transition-all cursor-pointer whitespace-nowrap ${selectedRoom === "designSpace" ? "bg-black text-[#EAD64D] shadow-xs" : "text-neutral-600 hover:text-black"}`}
                    >
                        Design Space (G22)
                    </button>
                    <button
                        onClick={() => handleRoomChange("entireSpace")}
                        className={`px-3 py-2 rounded-xs transition-all cursor-pointer whitespace-nowrap ${selectedRoom === "entireSpace" ? "bg-black text-[#EAD64D] shadow-xs" : "text-neutral-600 hover:text-black"}`}
                    >
                        Full Space (G22+26)
                    </button>
                    <button
                        onClick={() => handleRoomChange("foundersPlace")}
                        className={`px-3 py-2 rounded-xs transition-all cursor-pointer whitespace-nowrap ${selectedRoom === "foundersPlace" ? "bg-black text-[#EAD64D] shadow-xs" : "text-neutral-600 hover:text-black"}`}
                    >
                        Founders Place (L1)
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT GRID */}
            <main className="grid grid-cols-12 gap-6 my-auto py-6 items-start">

                {/* LEFT COLUMN: LOCATION -> FIRST AID -> AIRCON -> WIFI -> PRINTING -> TRANSPORT -> DELIVERIES/RISK */}
                <div className="col-span-12 lg:col-span-6 space-y-4">

                    {/* 1. VENUE LOCATION & MAP PIN */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-2">
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                            <div className="flex items-center gap-2 text-black font-extrabold text-xs uppercase tracking-wider">
                                <span className="p-1 bg-amber-100 rounded-xs text-amber-900">📍</span> Venue Location
                            </div>
                            <a
                                href="https://link.mazemap.com/IjnOhWjK"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-black underline hover:text-[#EAD64D]"
                            >
                                MazeMap Pin ↗
                            </a>
                        </div>
                        <p className="text-[11px] text-neutral-700 leading-relaxed">
                            <strong>Michael Crouch Innovation Centre (MCIC)</strong><br />
                            Building E10, UNSW Kensington Campus, Kensington NSW 2033.<br />
                            <span className="text-[10px] text-neutral-500">Located directly beside the Alumni Lawn (Gate 2 Avenue entrance off High St).</span>
                        </p>
                    </div>

                    {/* 2. FIRST AID & DEFIBRILLATOR (WITH DROPDOWN FOR ALL LOCATIONS) */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                            <div className="flex items-center gap-2 text-black font-extrabold text-xs uppercase tracking-wider">
                                <span className="p-1 bg-red-100 rounded-xs text-red-700">🏥</span> First Aid & Defibrillator
                            </div>
                        </div>

                        <div className="space-y-1.5 text-[11px] text-neutral-700">
                            <div className="p-2 bg-neutral-50 rounded-xs border border-neutral-200">
                                <strong className="text-black block text-[10px] uppercase font-bold">This Room's Kit:</strong>
                                <p className="text-neutral-800 font-medium text-[11px]">{currentData.firstAid}</p>
                            </div>

                            {/* COLLAPSIBLE ALL KIT LOCATIONS DROPDOWN */}
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setShowAllFirstAid(!showAllFirstAid)}
                                    className="w-full text-left py-1 text-[10px] font-extrabold uppercase text-neutral-700 hover:text-black flex justify-between items-center cursor-pointer border-t border-neutral-100 pt-1.5"
                                >
                                    <span>View All 4 Kit Locations</span>
                                    <span className="font-mono text-neutral-500">{showAllFirstAid ? "Hide ↑" : "Show ↓"}</span>
                                </button>

                                {showAllFirstAid && (
                                    <ul className="space-y-0.5 text-[10px] text-neutral-600 pl-1 pt-1 animate-in fade-in duration-150">
                                        <li>• Wall beside Computer in Design Space <em>(Red Bag)</em></li>
                                        <li>• On Red Cabinet in Founders Place <em>(White Box)</em></li>
                                        <li>• UNSW Makerspace beside Ground Floor <em>(White Cabinet)</em></li>
                                        <li>• UNSW Founders Level 1 Copy Room <em>(White Cabinet)</em></li>
                                    </ul>
                                )}
                            </div>

                            <div className="p-2 bg-red-50 border border-red-200 rounded-xs text-[10px] text-red-950 mt-1">
                                ⚡ <strong>Defibrillator:</strong> Ground Floor at glass doors between Hilmer Foyer and MCIC back hallway.{' '}
                                <a href="https://link.mazemap.com/0S4Nxpm9" target="_blank" rel="noopener noreferrer" className="font-bold text-red-700 underline hover:text-red-900">
                                    View Map Pin ↗
                                </a>
                            </div>

                            <div className="pt-1 border-t border-neutral-100 text-[10px] text-neutral-600">
                                🩺 <strong>In Case of Injury:</strong> Contact First Aid Officer (Hamish/Tamara/Makerspace staff), or call Security Emergency on <a href="tel:0293856666" className="font-mono font-bold text-black underline">9385 6666</a>.
                            </div>
                        </div>
                    </div>

                    {/* 3. AIR CONDITIONING POLICY */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-2">
                        <div className="flex items-center gap-2 text-black font-extrabold text-xs uppercase tracking-wider">
                            <span className="p-1 bg-amber-100 rounded-xs text-amber-900">❄️</span> Aircon — {currentData.code}
                        </div>
                        <div className="space-y-1.5 text-[11px] text-neutral-700">
                            {currentData.aircon.type === "manual" ? (
                                <>
                                    <div className="p-2 bg-neutral-50 rounded-xs border border-neutral-200/80">
                                        <strong className="text-black uppercase text-[9px] block">Wall Panel Location:</strong>
                                        <p className="text-neutral-600 text-[11px]">{currentData.aircon.location}</p>
                                    </div>
                                    <p className="text-neutral-500 italic text-[10px]">
                                        💡 {currentData.aircon.note} Temperature is set at 23 degrees and cannot be adjusted.
                                    </p>
                                </>
                            ) : (
                                <div className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-xs space-y-0.5">
                                    <strong className="text-amber-900 uppercase text-[9px] block">Automatic Climate Control:</strong>
                                    <p className="text-amber-800 text-[11px]">{currentData.aircon.note}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 4. CAMPUS WI-FI SERVICES */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                            <div className="flex items-center gap-2 text-black font-extrabold text-xs uppercase tracking-wider">
                                <span className="p-1 bg-amber-100 rounded-xs text-amber-900">📶</span> Campus Wi-Fi Connection
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400">Select Network</span>
                        </div>

                        {/* TOGGLE BUTTONS */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase">
                            <button
                                onClick={() => setWifiTab('eduroam')}
                                className={`p-2 rounded-xs border transition-all cursor-pointer text-center ${wifiTab === 'eduroam' ? 'bg-black text-[#EAD64D] border-black' : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'}`}
                            >
                                🎓 Eduroam (Staff / Students)
                            </button>
                            <button
                                onClick={() => setWifiTab('guest')}
                                className={`p-2 rounded-xs border transition-all cursor-pointer text-center ${wifiTab === 'guest' ? 'bg-black text-[#EAD64D] border-black' : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'}`}
                            >
                                🌐 UNSW Guest (Visitors)
                            </button>
                        </div>

                        {/* CONTENT: EDUROAM */}
                        {wifiTab === 'eduroam' && (
                            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-2 animate-in fade-in duration-150 text-xs text-neutral-600">
                                <p className="text-[11px]">
                                    The <strong>Eduroam</strong> network provides Internet access to staff and students visiting from UNSW or other participating educational institutions globally.
                                </p>
                                <div className="p-2.5 bg-white border border-neutral-200 font-mono text-[11px] space-y-0.5">
                                    <div><span className="text-neutral-400 uppercase text-[9px] font-sans font-bold block">Network Name:</span> eduroam</div>
                                    <div><span className="text-neutral-400 uppercase text-[9px] font-sans font-bold block">Username:</span> zID@ad.unsw.edu.au</div>
                                    <div><span className="text-neutral-400 uppercase text-[9px] font-sans font-bold block">Password:</span> zID Password</div>
                                </div>
                                <div className="pt-1 flex flex-wrap gap-2 text-[10px]">
                                    <a href="https://www.unsw.edu.au/get-online" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline">Staff & Student Access Support ↗</a>
                                    <a href="https://www.unsw.edu.au/get-online/bring-your-own-device-ios" target="_blank" rel="noopener noreferrer" className="text-neutral-500 underline">iOS Guide ↗</a>
                                    <a href="https://www.unsw.edu.au/get-online/standard-unsw-android-device" target="_blank" rel="noopener noreferrer" className="text-neutral-500 underline">Android Guide ↗</a>
                                </div>
                            </div>
                        )}

                        {/* CONTENT: UNSW GUEST */}
                        {wifiTab === 'guest' && (
                            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs space-y-2 animate-in fade-in duration-150 text-xs text-neutral-600">
                                <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                                    <li><strong>Step 1:</strong> Connect to the <strong>'UNSW Guest'</strong> Wi-Fi Network.</li>
                                    <li><strong>Step 2:</strong> Type your Full Name and Email Address in the pop-up screen, accept terms & tap <strong>Submit</strong>.</li>
                                    <li><strong>Step 3:</strong> Open email sent from <code>guestwireless@unsw.edu.au</code> and select <strong>click here</strong>.</li>
                                    <li><strong>Step 4:</strong> Tap <strong>Confirm</strong> to activate access.</li>
                                </ol>
                                <a href="https://www.unsw.edu.au/get-online/guest-access" target="_blank" rel="noopener noreferrer" className="text-black font-bold underline text-[10px] block pt-1">
                                    UNSW Guest Access Support Page ↗
                                </a>
                            </div>
                        )}
                    </div>

                    {/* 5. PRINTING SERVICES (ROOM DYNAMIC - STRICTLY 2 BULLET POINTS) */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-2">
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                            <div className="flex items-center gap-2 text-black font-extrabold text-xs uppercase tracking-wider">
                                <span className="p-1 bg-amber-100 rounded-xs text-amber-900">🖨️</span> Printing & Copying
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400">{currentData.code}</span>
                        </div>
                        <div className="space-y-1.5 text-[11px] text-neutral-700">
                            {/* DYNAMIC BULLET POINT 1 BASED ON SELECTED ROOM */}
                            {selectedRoom === "designSpace" || selectedRoom === "entireSpace" ? (
                                <p>
                                    • <strong>MCIC Design Space Printer:</strong> Standalone local printer (USB flash drive only; not on UNSW network).
                                </p>
                            ) : (
                                <p>
                                    • <strong>Small Event Printing (&lt;30 pages):</strong> Email <a href="mailto:MCIC@UNSW.edu.au" className="font-bold underline text-black">MCIC@UNSW.edu.au</a> and staff can print them for you on-site.
                                </p>
                            )}

                            {/* BULLET POINT 2 FOR ALL ROOMS */}
                            <p>
                                • <strong>High-Volume Printing:</strong> Visit <a href="https://link.mazemap.com/Pd5JYQzv" target="_blank" rel="noopener noreferrer" className="font-bold underline text-black">The Library ↗</a> or <a href="https://link.mazemap.com/eZRjrq9D" target="_blank" rel="noopener noreferrer" className="font-bold underline text-black">Post Office ↗</a> on campus.
                            </p>

                            <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-xs text-[10px] text-neutral-600 space-y-0.5">
                                <strong>About Library Printing:</strong> Purchase a reusable photocopy card at Print/Copy Services desk (Level 2 Main Library). Minimum charge $5 covers card and credits (non-refundable).
                            </div>
                        </div>
                    </div>

                    {/* 6. TRANSPORT & PARKING */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                            <div className="flex items-center gap-2 text-black font-extrabold text-xs uppercase tracking-wider">
                                <span className="p-1 bg-amber-100 rounded-xs text-amber-900">🚗</span> Transport & Parking
                            </div>
                        </div>

                        {/* TRANSPORT TABS */}
                        <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase">
                            <button
                                onClick={() => setTransportTab("public")}
                                className={`p-2 rounded-xs border transition-all cursor-pointer text-center ${transportTab === "public" ? "bg-black text-[#EAD64D] border-black" : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"}`}
                            >
                                🚃 Light Rail & Taxis
                            </button>
                            <button
                                onClick={() => setTransportTab("parking")}
                                className={`p-2 rounded-xs border transition-all cursor-pointer text-center ${transportTab === "parking" ? "bg-black text-[#EAD64D] border-black" : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"}`}
                            >
                                🅿️ Car Park & CellOPark
                            </button>
                            <button
                                onClick={() => setTransportTab("bikes")}
                                className={`p-2 rounded-xs border transition-all cursor-pointer text-center ${transportTab === "bikes" ? "bg-black text-[#EAD64D] border-black" : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"}`}
                            >
                                ⚡ EV, Motorbikes & Bikes
                            </button>
                        </div>

                        {/* TAB 1: PUBLIC TRANSPORT */}
                        {transportTab === "public" && (
                            <div className="space-y-2 text-[11px] text-neutral-700 animate-in fade-in duration-150">
                                <p><strong>L3 Kingsford Light Rail:</strong> Alight at UNSW Anzac Parade stop and walk up campus from main Anzac Parade gates.</p>
                                <p><strong>Buses:</strong> Alight at UNSW Anzac Parade / NIDA (Routes 303, 392X, 392, 396).</p>
                                <p><strong>Uber / Taxis:</strong> Direct drivers to UNSW Gate 2, High St, Randwick. Drop off at first roundabout inside gate and walk across Alumni Lawn to MCIC.</p>
                            </div>
                        )}

                        {/* TAB 2: CAR PARKING & CELLOPARK */}
                        {transportTab === "parking" && (
                            <div className="space-y-2 text-[11px] text-neutral-700 animate-in fade-in duration-150">
                                <p><strong>Staff:</strong> Choose between annual vPermits or pay-as-you-go sessions via CellOPark App to park in 'UNSW Permit Holder' bays.</p>
                                <p><strong>Students & Visitors:</strong> All-day parking available on top level of Botany Street Carparks (Gate 11 entry). Short term 2P/4P bays near Gate 2, Gate 8, Gate 11 Apron, and Western Campus.</p>
                                <p className="text-[10px] text-neutral-500 italic">Free parking between 7:30 PM and 7:30 AM weekdays, and all day weekends/public holidays.</p>
                                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1 text-[10px]">
                                    <strong className="text-black uppercase block font-bold">CellOPark Setup (Zone 2052033):</strong>
                                    <ol className="list-decimal pl-4 space-y-0.5 text-neutral-600">
                                        <li>Download CellOPark & enter zID/email in profile.</li>
                                        <li>Register vehicle registration plate and credit card.</li>
                                        <li>Select zone <strong>2052033 UNSW Permit Holder Parking</strong> (press STAR to favourite).</li>
                                        <li>Press <strong>START</strong> on arrival ($8 flat rate/day; no need to press stop).</li>
                                    </ol>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: EV & BIKES */}
                        {transportTab === "bikes" && (
                            <div className="space-y-2 text-[11px] text-neutral-700 animate-in fade-in duration-150">
                                <p><strong>⚡ Solar EV Charging:</strong> 6 EV charging stations on rooftop level of Botany Street car park.</p>
                                <p><strong>🏍️ Motorbike Parking:</strong> Free in designated 'Motorcycle Bays' (e.g. Union Rd behind Hilmer Building).</p>
                                <p><strong>🚲 Bicycle Racks:</strong> Park in designated racks on Union Rd behind Hilmer. Bikes chained to railings will be impounded after 48h by Security.</p>
                            </div>
                        )}
                    </div>

                    {/* 7. DELIVERIES & RISK ASSESSMENT CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        {/* CARD 1: DELIVERIES & LOADING DOCK */}
                        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-2 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-black font-extrabold text-xs uppercase tracking-wider border-b border-neutral-100 pb-1.5 mb-2">
                                    <span className="p-1 bg-amber-100 rounded-xs text-amber-900">📦</span> Deliveries & Loading Dock
                                </div>
                                <p className="text-[11px] text-neutral-700 leading-relaxed">
                                    Couriers enter via Gate 2 on High Street and park in Loading Bays or proceed to E10 Hilmer. Vehicles must move immediately after drop-off.
                                </p>
                            </div>

                            <a
                                href="/images/LoadingBays.jpg"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-2 bg-neutral-900 text-white rounded-xs text-center text-[10px] font-mono hover:bg-neutral-800 transition-colors"
                            >
                                🗺️ View Gate 2 Loading Bay Map ↗
                            </a>
                        </div>

                        {/* CARD 2: RISK ASSESSMENT */}
                        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-2 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5 mb-2">
                                    <div className="flex items-center gap-2 text-black font-extrabold text-xs uppercase tracking-wider">
                                        <span className="p-1 bg-amber-100 rounded-xs text-amber-900">📋</span> Risk Assessment
                                    </div>
                                </div>
                                <p className="text-[11px] text-neutral-700 leading-relaxed">
                                    Standard events in MCIC spaces are covered under official UNSW <strong>Risk Assessment #1120290</strong>.
                                </p>
                            </div>
                        </div>

                    </div>

                    {/* 6. VENUE TERMS & CONDITIONS CARD (WITH EXPANDABLE DROPDOWN) */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-2">
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-tight text-black flex items-center gap-1.5">
                                    <span>📜</span> Venue Hire Terms & Conditions
                                </h2>
                                <p className="text-[10px] text-neutral-500">
                                    Official terms governing bookings at MCIC.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <a
                                    href="/docs/MCIC_Venue_Hire_Terms_and_Conditions.pdf"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-neutral-900 text-white px-2.5 py-1 rounded-xs font-bold uppercase tracking-wider text-[9px] hover:bg-neutral-800 text-center"
                                >
                                    PDF ↗
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setShowTerms(!showTerms)}
                                    className="bg-[#EAD64D] text-black font-extrabold uppercase text-[10px] px-3 py-1 rounded-xs hover:bg-amber-300 transition-colors cursor-pointer"
                                >
                                    {showTerms ? "Hide T&Cs −" : "Show T&Cs +"}
                                </button>
                            </div>
                        </div>

                        {/* EXPANDABLE DROPDOWN CONTENT */}
                        {showTerms && (
                            <div className="space-y-4 pt-2 text-neutral-600 text-[10px] leading-relaxed animate-in fade-in duration-200 max-h-[300px] overflow-y-auto pr-1">
                                <div className="space-y-0.5 font-mono text-[9px] text-neutral-500 uppercase tracking-wider bg-neutral-50 p-2 rounded-xs border border-neutral-200">
                                    <strong className="text-neutral-900 text-[10px] block font-sans font-bold">VENUE HIRE AGREEMENT: TERMS & CONDITIONS</strong>
                                    <p><strong>PARTIES:</strong> 1. UNSW Founders (ABN 57 195 873 179) of Michael Crouch Innovation Centre, UNSW Sydney, Sydney, NSW 2052 | 2. "The Hirer"</p>
                                </div>

                                <div className="space-y-1 border-b border-neutral-100 pb-2">
                                    <h5 className="font-bold text-neutral-900 uppercase text-[9px] tracking-wide">SECTION 1. PAYMENT & DEPOSIT SCHEDULE</h5>
                                    <p><strong>1.1 Deposit:</strong> A deposit payment of 50% of the total hire charge is required upon booking to confirm and secure the space reservation.</p>
                                    <p><strong>1.2 Balance Payment:</strong> The remaining 50% balance must be paid no later than 48 hours prior to the event commencement time upon receipt of a tax invoice.</p>
                                    <p><strong>1.3 Failure to Pay:</strong> Failure to settle the deposit or final balance within the required timeframe grants UNSW Founders the right to cancel the booking.</p>
                                    <p><strong>1.4 Cleaning & Reset Surcharges:</strong> If the Hired and Shared Areas are left disorderly or dirty, or requiring furniture resets after the booking window, UNSW Founders reserves the right to recover full cleaning costs at a minimum rate of $200 + GST.</p>
                                    <p><strong>1.5 Casual Staffing Rates:</strong> Event support staff are billed at $50 per hour (minimum 3-hour shift for Mon–Sat; minimum 4-hour shift for Sundays and Public Holidays).</p>
                                    <p><strong>1.6 Staff Overtime:</strong> Overtime beyond 8 hours is charged at 1.5x the base rate ($75/hr). Shifts exceeding 10 hours are charged at double time ($100/hr).</p>
                                </div>

                                <div className="space-y-1 border-b border-neutral-100 pb-2">
                                    <h5 className="font-bold text-neutral-900 uppercase text-[9px] tracking-wide">SECTION 2. CANCELLATION, REFUNDS & VENUE VARIATIONS</h5>
                                    <p><strong>2.1 Cancellation Window & Charges (By Hirer):</strong></p>
                                    <div className="pl-3 space-y-0.5 text-neutral-600">
                                        <p><strong>2.1.1 6+ Working Days Notice:</strong> Full refund of all monies paid.</p>
                                        <p><strong>2.1.2 3 to 5 Working Days Notice:</strong> Forfeit 50% of total booking fee.</p>
                                        <p><strong>2.1.3 Less than 2 Working Days Notice:</strong> Forfeit 100% of total booking fee.</p>
                                    </div>
                                    <p><strong>2.2 Emergency Variations (By Venue):</strong> UNSW Founders reserves the right to cancel due to emergency facility maintenance or safety concerns, issuing a 100% refund.</p>
                                </div>

                                <div className="space-y-1 border-b border-neutral-100 pb-2">
                                    <h5 className="font-bold text-neutral-900 uppercase text-[9px] tracking-wide">SECTION 3. HIRER RESPONSIBILITIES</h5>
                                    <p><strong>3.1 Authorised Purpose:</strong> Use venue only for the specific purpose outlined in booking agreement.</p>
                                    <p><strong>3.2 Supervision:</strong> Maintain active physical supervision throughout booking window.</p>
                                    <p><strong>3.3 Damages:</strong> Any damage to venue or AV equipment is charged at full replacement cost.</p>
                                </div>

                                <div className="space-y-1 border-b border-neutral-100 pb-2">
                                    <h5 className="font-bold text-neutral-900 uppercase text-[9px] tracking-wide">SECTION 4–9. EQUIPMENT, CATERING, TICKETING & WHS</h5>
                                    <p><strong>4.1 Care & Safety:</strong> Restore equipment to original condition upon conclusion. Open flames and hazardous materials strictly prohibited.</p>
                                    <p><strong>5.1 RSA Compliance:</strong> Valid NSW RSA competency card required if alcohol is served.</p>
                                    <p><strong>8.1 Indemnity:</strong> Hirer holds UNSW Founders indemnified against third-party claims or loss during event.</p>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* RIGHT COLUMN: NEED ASSISTANCE (TOP RIGHT) -> AV GUIDE -> CATERING -> OVERTIME -> BUMP OUT (DROPDOWN) -> VENUE T&CS */}
                <div className="col-span-12 lg:col-span-6 space-y-4">

                    {/* 1. TOP RIGHT FIRST: NEED ON-SITE ASSISTANCE & CAMPUS SECURITY */}
                    <div className="bg-white border-2 border-black rounded-xl p-5 shadow-md relative overflow-hidden flex flex-col justify-between text-center">
                        <div>
                            <div className="w-10 h-10 bg-[#EAD64D] text-black rounded-full flex items-center justify-center text-xl mx-auto mb-1.5 font-bold shadow-xs">
                                📞
                            </div>
                            <h2 className="text-lg font-black uppercase tracking-tight text-black">
                                Need On-Site Assistance?
                            </h2>
                        </div>

                        <div className="w-full space-y-2 mt-3 text-left text-xs">
                            {/* TAMARA BERRYMAN CONTACT */}
                            <div className="p-2.5 bg-neutral-50 rounded-md border border-neutral-200 flex justify-between items-center">
                                <div>
                                    <span className="font-extrabold text-black block text-xs">Tamara Berryman</span>
                                    <span className="text-[10px] text-neutral-500 block">Tech, AV & Room Hire Support</span>
                                </div>
                                <a
                                    href="tel:0435628586"
                                    className="px-3 py-1.5 bg-black text-[#EAD64D] font-mono text-xs font-bold rounded-xs hover:bg-neutral-800 transition-colors shrink-0"
                                >
                                    0435 628 586
                                </a>
                            </div>

                            {/* CAMPUS SECURITY DETAILS */}
                            <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 space-y-2">
                                <div className="flex justify-between items-center border-b border-neutral-200 pb-1.5">
                                    <span className="font-extrabold text-black uppercase text-[10px] tracking-wide flex items-center gap-1">
                                        🛡️ Campus Security Services
                                    </span>
                                    <span className="bg-black text-[#EAD64D] font-mono font-bold text-[9px] uppercase px-1.5 py-0.5 rounded-xs">
                                        24/7 Gate 2
                                    </span>
                                </div>

                                <p className="text-[10px] text-neutral-600">
                                    Security is available <strong>24 hours a day, 7 days a week</strong> located at Gate 2 on High Street.
                                </p>

                                <div className="space-y-1.5 text-[10px]">
                                    <div className="flex justify-between items-center">
                                        <span className="text-neutral-600 font-medium">General Operations:</span>
                                        <a href="tel:0293856000" className="font-mono font-bold text-black underline">
                                            9385 6000
                                        </a>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-red-700 font-bold">24/7 Emergency Line:</span>
                                        <a href="tel:0293856666" className="font-mono font-bold text-red-600 underline">
                                            9385 6666 (Ext 56666)
                                        </a>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* 2. DIRECTLY BELOW ASSISTANCE: AV VIDEO & INSTRUCTIONS GUIDE */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-3">

                        {/* SECTION HEADER & VIDEO SELECTOR */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-2 gap-2">
                            <div className="flex items-center gap-2 text-black font-extrabold text-xs uppercase tracking-wider">
                                <span className="p-1 bg-amber-100 rounded-xs text-amber-900">🎥</span> AV Guide — {currentData.name}
                            </div>

                            {/* VIDEO SELECTOR TABS (IF MULTIPLE VIDEOS EXIST) */}
                            {currentData.avVideos.length > 1 && (
                                <div className="flex gap-1 bg-neutral-100 p-1 rounded-xs text-[9px] font-bold uppercase">
                                    {currentData.avVideos.map((vid, vIdx) => (
                                        <button
                                            key={vIdx}
                                            onClick={() => setSelectedVideoIdx(vIdx)}
                                            className={`px-2 py-1 rounded-xs transition-all cursor-pointer whitespace-nowrap ${selectedVideoIdx === vIdx ? "bg-black text-[#EAD64D]" : "text-neutral-600 hover:text-black"}`}
                                        >
                                            {vid.title}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* DYNAMIC FULL-SIZE VIDEO PLAYER (NO POSTER THUMBNAIL) */}
                        <div className="bg-neutral-900 rounded-lg overflow-hidden border border-neutral-200 shadow-inner w-full flex items-center justify-center">
                            <video
                                key={`${selectedRoom}-${selectedVideoIdx}`} // Forces video re-render on room or tab switch
                                src={currentVideo.url}
                                controls
                                className="w-full h-auto max-h-[400px] object-contain"
                            >
                                Your browser does not support video playback.
                            </video>
                        </div>

                        {/* DYNAMIC STEP-BY-STEP AV INSTRUCTIONS */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {currentData.avSteps.map((stepItem, idx) => (
                                <div key={idx} className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs text-xs space-y-1">
                                    <div className="flex items-center gap-1 font-bold text-black text-[10px] uppercase">
                                        <span className="w-4 h-4 rounded-full bg-black text-white flex items-center justify-center text-[9px] shrink-0">
                                            {stepItem.step}
                                        </span>
                                        <span>{stepItem.title}</span>
                                    </div>
                                    <p className="text-neutral-600 text-[10px] leading-relaxed">
                                        {stepItem.desc}
                                    </p>
                                </div>
                            ))}
                        </div>

                    </div>

                    {/* 3. CATERING & ALCOHOL SERVICE */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                            <div className="flex items-center gap-2 text-black font-extrabold text-xs uppercase tracking-wider">
                                <span className="p-1 bg-amber-100 rounded-xs text-amber-900">🍕</span> Food & Drink
                            </div>
                        </div>

                        {/* TAB SWITCHER */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase">
                            <button
                                onClick={() => setCateringTab("food")}
                                className={`p-2 rounded-xs border transition-all cursor-pointer text-center ${cateringTab === "food" ? "bg-black text-[#EAD64D] border-black" : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"}`}
                            >
                                Food & Catering
                            </button>
                            <button
                                onClick={() => setCateringTab("alcohol")}
                                className={`p-2 rounded-xs border transition-all cursor-pointer text-center ${cateringTab === "alcohol" ? "bg-black text-[#EAD64D] border-black" : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"}`}
                            >
                                Alcohol Service
                            </button>
                        </div>

                        {/* TAB 1: FOOD & CATERING DIRECTIVES */}
                        {cateringTab === "food" && (
                            <div className="space-y-2 text-[11px] text-neutral-700 animate-in fade-in duration-150">
                                <ul className="space-y-1.5">
                                    <li className="flex items-start gap-1.5">
                                        <span className="font-bold text-black">•</span>
                                        <span><strong>Self-Service:</strong> Bring all food, drinks, milk, tea/coffee, paper plates, napkins, cups, serving utensils, and cutlery. Please do not take stock from cupboards. Items in venue cupboards are strictly restricted to Founders programs and not included in space hire with the exception of the urn, water dispenser, glasses, plates, mugs and ice buckets which can be accessed if booked via the booking form.</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span className="font-bold text-black">•</span>
                                        <span><strong>You Must Accept Deliveries:</strong> We will not meet your delivery drivers to collect your order. You must direct and meet your own delivery drivers within your booking window unless you have paid for casual venue staff.</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span className="font-bold text-black">•</span>
                                        <span><strong>Mandatory Cleanup:</strong> Pack up all leftovers and rubbish immediately on conclusion of your event. Large waste goes to bins in the hallway by the back door of the Design Space ($200 + GST minimum charge applies if the space is not clean on exit).</span>
                                    </li>
                                </ul>
                            </div>
                        )}

                        {/* TAB 2: ALCOHOL & RSA RULES */}
                        {cateringTab === "alcohol" && (
                            <div className="space-y-2 text-[11px] text-neutral-700 animate-in fade-in duration-150">
                                <p>
                                    Serving alcohol is permitted, provided you strictly comply with NSW liquor legislation and UNSW venue safety policies:
                                </p>
                                <ul className="space-y-1 pl-1">
                                    <li className="flex items-start gap-1.5">
                                        <span className="font-bold text-black">•</span>
                                        <span>You must have submitted a valid NSW Responsible Service of Alcohol (RSA) Competency Card or hired RSA-Certified Venue Staff ($50/hr).</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span className="font-bold text-black">•</span>
                                        <span>Food and non-alcoholic beverage options must be freely available whenever alcohol is served. Venue staff reserve the right to immediately suspend alcohol service if RSA documentation is missing, if minors are present without explicit prior safety arrangements, or if unsafe behaviour occurs.</span>
                                    </li>
                                </ul>

                                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xs space-y-1 mt-1">
                                    <strong className="text-neutral-900 block uppercase text-[10px]">Alcohol Service Models:</strong>
                                    <ul className="space-y-1 text-[10px] text-neutral-600">
                                        <li>• Dedicated Bartender Service: Drinks are actively poured and handed out by an RSA holder.</li>
                                        <li>• Gallery / Self-Service Station: Drinks (e.g. wine/beer) can be set out on tables for self-service during exhibitions, networking, or gallery-style events. Under NSW liquor guidelines, an RSA cardholder must still actively oversee the drink station to monitor consumption and prevent underaged access.</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 4. OVERTIME & CLEANING SURCHARGES */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-2">
                        <div className="flex items-center gap-2 text-black font-extrabold text-xs uppercase tracking-wider border-b border-neutral-100 pb-1.5">
                            <span className="p-1 bg-amber-100 rounded-xs text-amber-900">⏱️</span> Overtime & Cleaning Charges
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-0.5">
                            <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-xs space-y-0.5">
                                <strong className="text-black uppercase block font-sans text-[9px]">Overtime Rates:</strong>
                                <span className="font-mono font-bold text-black">$150 / HR</span>
                                <p className="text-neutral-500 text-[9px]">15-min grace window applies. Extensions exceeding this generate pro-rata penalties based on hourly rate.</p>
                            </div>
                            <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-xs space-y-0.5">
                                <strong className="text-black uppercase block font-sans text-[9px]">Cleaning Fee:</strong>
                                <span className="font-mono font-bold text-black">$200 + GST MIN</span>
                                <p className="text-neutral-500 text-[9px]">Leaving rubbish, waste, or promotional clutter initiates recovery charges.</p>
                            </div>
                        </div>
                    </div>

                    {/* 5. BUMP OUT INSTRUCTIONS CARD (WITH ENTICING DROPDOWN) */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                            <div className="flex items-center gap-2 text-black font-extrabold text-xs uppercase tracking-wider">
                                <span className="p-1 bg-amber-100 rounded-xs text-amber-900">🧽</span> Bump Out Instructions
                            </div>
                        </div>

                        <div className="p-3 bg-neutral-900 text-white font-medium rounded-xs text-xs leading-relaxed">
                            Leave the space as clean as you found it. You must clear out all rubbish and pack away equipment before your end time. Never leave the room without notifying venue staff first.
                        </div>

                        {/* ENTICING CALL-TO-ACTION TOGGLE BUTTON FOR BUMP OUT LIST */}
                        <div className="pt-1">
                            <button
                                type="button"
                                onClick={() => setShowCheckoutList(!showCheckoutList)}
                                className="w-full py-2 px-3 bg-[#EAD64D] hover:bg-amber-300 text-black font-extrabold text-xs uppercase tracking-wide rounded-xs transition-all flex items-center justify-between cursor-pointer shadow-xs border border-black/10"
                            >
                                <span>📋 View Mandatory Bump Out Checklist (9 Steps)</span>
                                <span className="font-mono text-sm">{showCheckoutList ? "▲" : "▼"}</span>
                            </button>

                            {showCheckoutList && (
                                <div className="space-y-2 pt-3 text-[11px] text-neutral-700 animate-in fade-in duration-200 border-t border-neutral-100 mt-2">
                                    <ul className="space-y-1.5 text-neutral-700">
                                        {fullCheckoutChecklist.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-1.5">
                                                <span className="font-bold text-black shrink-0">•</span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

            </main>

            {/* FOOTER */}
            <footer className="border-t border-neutral-200 pt-3 mt-4 flex justify-between items-center text-[10px] text-neutral-400 font-mono">
                <div>UNSW Founders MCIC • Gate 2 High Street Kensington • CellOPark Zone 2052033</div>
                <div>Inquiries: <a href="mailto:MCIC@unsw.edu.au" className="text-neutral-600 underline">MCIC@unsw.edu.au</a></div>
            </footer>
        </div>
    );
}