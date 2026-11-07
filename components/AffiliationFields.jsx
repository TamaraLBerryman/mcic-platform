'use client';

const DIVISIONS = [
    'UNSW Art, Design & Architecture',
    'UNSW Business School',
    'UNSW Canberra',
    'UNSW Divisions',
    'UNSW Engineering',
    'UNSW Law',
    'UNSW Medicine',
    'UNSW Science'
];

export const EMPTY_AFFILIATION = {
    userType: 'Internal to UNSW',
    departmentType: 'UNSW Founders',
    department: '',
    unswDivision: '',
    companyName: ''
};

export function affiliationError(value) {
    if (value.userType !== 'Internal to UNSW' && value.userType !== 'External to UNSW') {
        return 'Choose internal or external to UNSW.';
    }
    if (value.userType === 'External to UNSW' && !String(value.companyName || '').trim()) {
        return 'Enter the company or organisation name.';
    }
    if (value.userType === 'Internal to UNSW' && value.departmentType === 'Other' && !String(value.department || '').trim()) {
        return 'Enter the faculty or department name.';
    }
    return '';
}

export default function AffiliationFields({ value, onChange }) {
    const set = (patch) => onChange({ ...value, ...patch });

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Select University Relationship</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Internal to UNSW', 'External to UNSW'].map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => set({ userType: type })}
                            className={`p-3 text-sm font-bold text-center border rounded-sm ${value.userType === type ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-neutral-700'}`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {value.userType === 'External to UNSW' && (
                <label className="block space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Company / Organisation Name</span>
                    <input
                        type="text"
                        required
                        value={value.companyName}
                        onChange={(event) => set({ companyName: event.target.value })}
                        placeholder="e.g. Acme Corporation Pty Ltd"
                        className="w-full p-3 border border-gray-200 text-sm rounded-sm outline-none focus:border-black"
                    />
                </label>
            )}

            {value.userType === 'Internal to UNSW' && (
                <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Specific Department</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {['UNSW Founders', 'Other Faculty or Division'].map((type) => {
                            const selected = type === 'UNSW Founders' ? value.departmentType !== 'Other' : value.departmentType === 'Other';
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => set({ departmentType: type === 'UNSW Founders' ? 'UNSW Founders' : 'Other' })}
                                    className={`p-3 text-xs font-bold uppercase tracking-wider text-center border rounded-sm ${selected ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-neutral-700'}`}
                                >
                                    {type}
                                </button>
                            );
                        })}
                    </div>
                    {value.departmentType === 'Other' && (
                        <div className="space-y-3">
                            <label className="block space-y-1">
                                <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">UNSW Faculty / Division</span>
                                <select
                                    value={value.unswDivision}
                                    onChange={(event) => set({ unswDivision: event.target.value })}
                                    className="w-full p-3 border border-gray-200 text-sm rounded-sm outline-none bg-white"
                                >
                                    <option value="">Please select a division</option>
                                    {DIVISIONS.map((division) => <option key={division} value={division}>{division}</option>)}
                                </select>
                            </label>
                            <label className="block space-y-1">
                                <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">Specific Unit / School / Department Name</span>
                                <input
                                    type="text"
                                    required
                                    value={value.department}
                                    onChange={(event) => set({ department: event.target.value })}
                                    placeholder="e.g. School of Computer Science"
                                    className="w-full p-3 border border-gray-200 text-sm rounded-sm outline-none focus:border-black"
                                />
                            </label>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
