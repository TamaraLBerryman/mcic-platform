'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { allows } from '../app/lib/access';
import { useAccess } from './useAccess';

export default function Navbar() {
    const { access } = useAccess();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navRef = useRef(null);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    useEffect(() => {
        function handleClickOutside(event) {
            if (navRef.current && !navRef.current.contains(event.target)) {
                closeMenu();
            }
        }

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isMenuOpen]);

    return (
        <>
            {isMenuOpen && (
                <div
                    onClick={closeMenu}
                    className="fixed inset-0 bg-black/40 z-40 transition-opacity"
                    aria-hidden="true"
                />
            )}

            <header ref={navRef} className="bg-neutral-900 text-white border-b border-neutral-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link
                        href="/"
                        onClick={closeMenu}
                        className="font-extrabold tracking-tight text-lg uppercase flex items-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        <span className="bg-[#EAD64D] text-black px-2 py-0.5 rounded-xs font-mono text-xs">MCIC</span>
                        <span>Platform</span>
                    </Link>

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

                {isMenuOpen && (
                    <div className="bg-neutral-900 border-b border-neutral-800 animate-in slide-in-from-top duration-200 relative z-50">
                        <nav className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-5 text-sm font-bold uppercase tracking-wider">
                            {[
                                { href: '/booking', label: 'Book an Event Space', level: 'public' },
                                { href: '/casuals', label: 'Book casual staff', level: 'founders' },
                                { href: '/my-bookings', label: 'My bookings', level: 'account' },
                                { href: '/events', label: 'Events', level: 'public' },
                                { href: '/boards', label: 'Event countdown', level: 'founders' },
                                { href: '/boards/spaces', label: 'Spaces today', level: 'public' },
                                { href: '/coworking', label: 'Startup Access & Coworking', level: 'public' },
                                { href: '/inventory', label: 'MCIC Inventory', level: 'public' },
                                { href: '/kitchen', label: 'Kitchen search', level: 'staff' },
                                { href: '/lockers', label: 'Lockers', level: 'staff' },
                                { href: '/timesheets', label: 'Submit a Timesheet', level: 'staff' },
                                { href: '/casuals/available', label: 'Shift availability', level: 'casual' },
                                { href: '/casuals/hours', label: 'My shifts', level: 'casual' },
                                { href: '/casuals/approve', label: 'Approve casual hours', level: 'founders' },
                                { href: '/OnTheDay', label: 'On the day', level: 'public' },
                                { href: '/admin', label: 'Admin', level: 'founders' }
                            ].filter((item) => item.level === 'public' || item.level === 'account' || allows(access, item.level)).map((item) => (
                                <Link key={item.href} href={item.href} onClick={closeMenu} className="hover:text-[#EAD64D] transition-colors py-1 border-b border-neutral-800/60">
                                    {item.label}
                                </Link>
                            ))}

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
        </>
    );
}
