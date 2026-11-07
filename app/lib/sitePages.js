const WILD_SEGMENTS = new Set(['SLUG', 'KEY', 'ITEM', 'ID', 'CODE']);
const RESERVED_SEGMENTS = {
    events: new Set(['list'])
};

export const SITE_PAGE_GROUPS = [
    {
        title: 'Public',
        pages: [
            ['/', 'Home'],
            ['/booking', 'Book an event space'],
            ['/events', 'Attend our events'],
            ['/events/SLUG', 'One event'],
            ['/coworking', 'Startup access and coworking'],
            ['/coworking/desk/KEY', 'Hot desk check-in'],
            ['/coworking/desk/KEY/print', 'Hot desk QR print'],
            ['/boards/spaces', 'Spaces today'],
            ['/inventory', 'Inventory'],
            ['/borrow/ITEM', 'Borrow an item'],
            ['/OnTheDay', 'On the day'],
            ['/contact', 'Contact'],
            ['/doorbell', 'Lobby doorbell'],
            ['/ticket/CODE', 'Guest ticket']
        ]
    },
    {
        title: 'Any signed-in account',
        pages: [
            ['/my-bookings', 'My bookings'],
            ['/my-bookings/ID', 'One booking'],
            ['/login', 'Sign in']
        ]
    },
    {
        title: 'Founders general staff and Admin',
        pages: [
            ['/casuals', 'Book casual staff'],
            ['/events/list', 'List an off-site event'],
            ['/boards', 'Event countdown'],
            ['/casuals/approve', 'Approve casual hours'],
            ['/admin', 'Admin, Database tab']
        ]
    },
    {
        title: 'Casual staff and Admin',
        pages: [
            ['/casuals/available', 'Shift availability'],
            ['/casuals/hours', 'My shifts']
        ]
    },
    {
        title: 'Founders, casuals, and Admin',
        pages: [
            ['/kitchen', 'Kitchen search'],
            ['/lockers', 'Lockers'],
            ['/timesheets', 'Timesheets'],
            ['/inventory/add', 'Add an inventory item'],
            ['/events/SLUG/door', 'Door check-in, also open to that event’s organiser']
        ]
    },
    {
        title: 'Admin',
        pages: [
            ['/admin', 'Reporting, coworking, inventory, casuals, access, and this list'],
            ['/admin/approve', 'Approve a booking'],
            ['/admin/changes', 'Review a booking change'],
            ['/admin/listings', 'Review an off-site listing'],
            ['/events/SLUG/guests', 'Guest list, also open to the booker']
        ]
    }
];

const KNOWN_PATHS = new Set(SITE_PAGE_GROUPS.flatMap((group) => group.pages.map(([path]) => path)));

export function isKnownPage(path) {
    return KNOWN_PATHS.has(path);
}

export function canHidePage(path) {
    return isKnownPage(path) && path !== '/admin' && path !== '/login';
}

export function pathMatches(pattern, pathname) {
    const path = String(pathname || '').split('?')[0].replace(/\/$/, '') || '/';
    const wanted = String(pattern || '').split('?')[0].replace(/\/$/, '') || '/';
    if (wanted === '/') return path === '/';
    const patternParts = wanted.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);
    if (patternParts.length !== pathParts.length) return false;
    return patternParts.every((part, index) => {
        if (!WILD_SEGMENTS.has(part)) return part === pathParts[index];
        const parent = patternParts[index - 1];
        return !RESERVED_SEGMENTS[parent]?.has(pathParts[index]);
    });
}

export function pageIsHidden(pathname, hiddenPages) {
    return (hiddenPages || []).some((pattern) => canHidePage(pattern) && pathMatches(pattern, pathname));
}
