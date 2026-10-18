"use client";

import "./global.css";
import Link from 'next/link';
import { useState } from 'react';

// Global Navbar Component with Hamburger Drawer
function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    return (
        <header className="bg-neutral-900 text-white border-b border-neutral-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

                {/* BRAND LOGO */}
                <Link
                    href="/"
                    onClick={closeMenu}
                    className="font-extrabold tracking-tight text-lg uppercase flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                    <span className="bg-[#EAD64D] text-black px-2 py-0.5 rounded-xs font-mono text-xs">MCIC</span>
                    <span>Platform</span>
                </Link>

                {/* HAMBURGER TOGGLE BUTTON */}
                <button
                    type="button"
                    onClick={toggleMenu}
                    aria-label="Toggle Navigation Menu"
                    className="p-2 text-white hover:text-[#EAD64D] transition-colors focus:outline-none flex items-center gap-2 cursor-pointer"
                >
                    <span className="text-xs font-extrabold uppercase tracking-wider hidden sm:inline-block">
                        {isMenuOpen ? 'Close' : ''}
                    </span>
                    <div className="w-6 h-5 flex flex-col justify-between items-center relative">
                        <span className={`w-full h-0.5 bg-current transition-all duration-200 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                        <span className={`w-full h-0.5 bg-current transition-opacity duration-200 ${isMenuOpen ? 'opacity-0' : ''}`} />
                        <span className={`w-full h-0.5 bg-current transition-all duration-200 ${isMenuOpen ? '-rotate-45 -translate-y-2.5' : ''}`} />
                    </div>
                </button>

            </div>

            {/* SLIDE-DOWN HAMBURGER MENU DRAWER */}
            {isMenuOpen && (
                <div className="bg-neutral-900 border-b border-neutral-800 animate-in slide-in-from-top duration-200">
                    <nav className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-5 text-sm font-bold uppercase tracking-wider">

                        <Link
                            href="/booking"
                            onClick={closeMenu}
                            className="hover:text-[#EAD64D] transition-colors py-1 border-b border-neutral-800/60"
                        >
                            Book an Event Space
                        </Link>

                        <Link
                            href="/coworking"
                            onClick={closeMenu}
                            className="hover:text-[#EAD64D] transition-colors py-1 border-b border-neutral-800/60"
                        >
                            Startup Access & Coworking
                        </Link>

                        {/* EXTERNAL MAKERSPACE LINK */}
                        <a
                            href="https://www.making.unsw.edu.au/mcic/"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={closeMenu}
                            className="hover:text-[#EAD64D] transition-colors py-1 border-b border-neutral-800/60 flex items-center justify-between"
                        >
                            <span>Makerspace ↗</span>
                            <span className="text-xs text-neutral-500">↗</span>
                        </a>

                        {/* EXTERNAL MAIN UNSW FOUNDERS LINK */}
                        <a
                            href="https://unswfounders.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={closeMenu}
                            className="hover:text-[#EAD64D] transition-colors py-1 border-b border-neutral-800/60 flex items-center justify-between"
                        >
                            <span>Main UNSW Founders Site ↗</span>
                            <span className="text-xs text-neutral-500">↗</span>
                        </a>

                        {/* NEW ROUTE 1: MCIC INVENTORY */}
                        <Link
                            href="/inventory"
                            onClick={closeMenu}
                            className="hover:text-[#EAD64D] transition-colors py-1 border-b border-neutral-800/60"
                        >
                            MCIC Inventory
                        </Link>

                        {/* NEW ROUTE 2: TIMESHEETS */}
                        <Link
                            href="/timesheets"
                            onClick={closeMenu}
                            className="hover:text-[#EAD64D] transition-colors py-1 border-b border-neutral-800/60"
                        >
                            Submit a Timesheet
                        </Link>

                        {/* YELLOW PRIMARY ACTION BUTTON */}
                        <div className="pt-2">
                            <Link
                                href="/contact"
                                onClick={closeMenu}
                                className="inline-block bg-[#EAD64D] text-black px-5 py-3 rounded-sm font-extrabold text-xs tracking-wider hover:bg-white transition-colors text-center w-full sm:w-auto"
                            >
                                Contact Us
                            </Link>

                        </div>

                    </nav>
                </div>
            )}
        </header>
    );
}

// Global Footer Component
function Footer() {
    return (
        <footer className="bg-white border-t border-gray-200 py-12 px-8">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6 text-xs text-neutral-500 font-medium">
                <div>
                    © {new Date().getFullYear()} MCIC Platform // UNSW Founders
                </div>
                <div className="flex gap-6 font-bold uppercase tracking-wider text-[10px]">
                    <a
                        href="https://unswfounders.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-400 hover:text-black transition-colors"
                    >
                        Main UNSW Founders Site ↗
                    </a>
                </div>
            </div>
        </footer>
    );
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className="bg-neutral-50 text-black antialiased flex flex-col min-h-screen">
                <Navbar />

                {/* PAGE CONTENT */}
                <div className="flex-grow">
                    {children}
                </div>

                <Footer />
            </body>
        </html>
    );
}