import "./global.css";
import Navbar from '../components/Navbar';
import { PublishedBody, SitePagesProvider } from '../components/SitePages';

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
                <SitePagesProvider>
                    <Navbar />
                    <div className="flex-grow">
                        <PublishedBody>{children}</PublishedBody>
                    </div>
                    <Footer />
                </SitePagesProvider>
            </body>
        </html>
    );
}
