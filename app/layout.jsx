import "./global.css";
import Link from 'next/link';

export const metadata = {
    title: 'MCIC Platform',
    description: 'UNSW Founders Unified Operations Gateway',
};

// Global Navbar Component
function Navbar() {
    return (
        <header className="bg-neutral-900 text-white border-b border-neutral-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

                {/* BRAND LOGO */}
                <Link href="/" className="font-extrabold tracking-tight text-lg uppercase flex items-center gap-2 hover:opacity-90 transition-opacity">
                    <span className="bg-[#EAD64D] text-black px-2 py-0.5 rounded-xs font-mono text-xs">MCIC</span>
                    <span>Platform</span>
                </Link>

                {/* GLOBAL NAV LINKS */}
                <nav className="flex items-center gap-6 text-xs font-bold uppercase tracking-wider">

                    {/* TEXT LINKS */}
                    <Link href="/booking" className="hover:text-[#EAD64D] transition-colors">
                        Book an Event Space
                    </Link>

                    <Link href="/coworking" className="hover:text-[#EAD64D] transition-colors">
                        Startup Access & Coworking
                    </Link>

                    {/* EXTERNAL MAKERSPACE LINK */}
                    <a
                        href="https://www.making.unsw.edu.au/mcic/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#EAD64D] transition-colors flex items-center gap-1"
                    >
                        Makerspace ↗
                    </a>

                    {/* EXTERNAL MAIN UNSW FOUNDERS LINK */}
                    <a
                        href="https://unswfounders.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#EAD64D] transition-colors flex items-center gap-1"
                    >
                        Main UNSW Founders Site ↗
                    </a>

                    {/* YELLOW PRIMARY ACTION BUTTON */}
                    <Link
                        href="/contact"
                        className="bg-[#EAD64D] text-black px-3.5 py-2 rounded-sm hover:bg-white transition-colors"
                    >
                        Contact
                    </Link>

                </nav>

            </div>
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