"use client";

import { ITEM_ACCESS_OPTIONS, itemAccessLevels } from '../app/lib/access';

const ROOM_OPTIONS = [
    "MCIC Event Space",
    "MCIC Design Space",
    "Fishbowl",
    "Founders Place Event Space",
    "Founders Place Group Study",
    "Ground Floor Lockers",
    "Founders Level 1 Office",
    "Founders Level 1 Copy Room",
    "Founders Level 1 Kitchen"
];

const VENUE_HIRE_SPACES = [
    "MCIC Ground - Entire Space",
    "MCIC Ground - Event Space",
    "MCIC Ground - Design Space",
    "MCIC Level 1 - Founders Place",
    "MCIC Level 1 - Group Study"
];

const inputClass = "w-full bg-white border border-gray-200 text-sm p-2 rounded-sm outline-none focus:border-black text-black";

function FieldLine({ label, children }) {
    return (
        <label className="block text-sm text-neutral-800">
            <strong className="font-extrabold text-black">{label}</strong>
            <div className="mt-1">{children}</div>
        </label>
    );
}

export default function InventoryItemForm({
    values,
    onChange,
    photos,
    onAddPhotos,
    onRemovePhoto,
    assetIdReadOnly = false,
    submitLabel,
    submitting = false,
    onSubmit,
    status = null
}) {
    const set = (field) => (event) => onChange(field, event.target.value);
    const included = values.freeInclusionSpaces || [];
    const toggleSpace = (spaceName) => {
        onChange(
            'freeInclusionSpaces',
            included.includes(spaceName) ? included.filter((space) => space !== spaceName) : [...included, spaceName]
        );
    };
    const preview = photos[0]?.src || '';

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <input
                type="text"
                required
                placeholder="Item name"
                value={values.name}
                onChange={set('name')}
                className="w-full text-2xl font-extrabold tracking-tight text-black bg-transparent border border-transparent focus:border-gray-200 rounded-sm outline-none"
            />

            <div className="space-y-2">
                {preview ? (
                    <div className="relative w-full h-44 bg-neutral-50 border border-gray-200 rounded-sm overflow-hidden flex items-center justify-center p-2">
                        <img src={preview} alt="" className="h-full w-auto max-w-full object-contain" />
                    </div>
                ) : (
                    <div className="w-full h-32 bg-neutral-50 border border-dashed border-gray-200 rounded-sm flex items-center justify-center text-neutral-400 text-xs font-bold uppercase tracking-wider">
                        No image
                    </div>
                )}
                <div className="flex gap-2 items-center">
                    {photos.map((photo) => (
                        <div key={photo.key} className="relative w-10 h-10">
                            <img src={photo.src} alt="" className="w-10 h-10 rounded-xs object-cover border border-gray-200" />
                            <button
                                type="button"
                                onClick={() => onRemovePhoto(photo.key)}
                                aria-label="Remove photo"
                                className="absolute -top-1 -right-1 bg-black text-white text-[9px] w-4 h-4 rounded-full cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    {photos.length < 4 && (
                        <label className="w-10 h-10 bg-neutral-50 border border-dashed border-gray-300 rounded-xs flex items-center justify-center cursor-pointer text-lg text-gray-400">
                            +
                            <input type="file" accept="image/*" multiple onChange={onAddPhotos} className="hidden" />
                        </label>
                    )}
                </div>
            </div>

            {status}

            <div className="space-y-3">
                <FieldLine label="Storage Location">
                    <div className="grid grid-cols-1 gap-2">
                        <select required aria-label="Room" value={values.room} onChange={set('room')} className={inputClass}>
                            {ROOM_OPTIONS.map((room) => <option key={room} value={room}>{room}</option>)}
                        </select>
                        <input type="text" aria-label="Storage point" placeholder="Storage point, e.g. Locker 50" value={values.specificLocation} onChange={set('specificLocation')} className={inputClass} />
                    </div>
                </FieldLine>
                <FieldLine label="Quantity">
                    <input type="number" min="1" required value={values.quantity} onChange={set('quantity')} className={inputClass} />
                </FieldLine>
                <FieldLine label="Dimensions">
                    <input type="text" placeholder="e.g. 170cm (H) x 65cm (W) x 75cm (D)" value={values.dimensions} onChange={set('dimensions')} className={inputClass} />
                </FieldLine>
                <div>
                    <FieldLine label="Standard Cost of Hire">
                        <input type="number" step="0.01" min="0" placeholder="0.00" value={values.costPerDay} onChange={set('costPerDay')} className={inputClass} />
                    </FieldLine>
                    <div className="mt-2 space-y-1 text-sm text-black">
                        <label className="flex items-center gap-2">
                            <input type="radio" name="cost-applies-to" checked={values.costAppliesTo !== 'all'} onChange={() => onChange('costAppliesTo', 'item')} className="accent-black" />
                            <span>Per item</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="radio" name="cost-applies-to" checked={values.costAppliesTo === 'all'} onChange={() => onChange('costAppliesTo', 'all')} className="accent-black" />
                            <span>Entire quantity</span>
                        </label>
                    </div>
                    <div className="mt-3 space-y-1 text-[11px] text-gray-500">
                        <p className="font-extrabold text-black text-sm">Included free with</p>
                        {VENUE_HIRE_SPACES.map((space) => (
                            <label key={space} className="flex items-center gap-2">
                                <input type="checkbox" checked={included.includes(space)} onChange={() => toggleSpace(space)} className="w-3.5 h-3.5 accent-black" />
                                <span>{space}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <FieldLine label="Item details">
                    <textarea rows={3} placeholder="What someone needs to know before they book or borrow this." value={values.details} onChange={set('details')} className={inputClass} />
                </FieldLine>
                <FieldLine label="What's Included">
                    <input type="text" placeholder="e.g. Power cable, HDMI cable, remote" value={values.includedItems} onChange={set('includedItems')} className={inputClass} />
                </FieldLine>
            </div>

            <div className="pt-2 space-y-3 text-[11px] text-gray-500">
                <div className="space-y-1">
                    <p className="text-black">Access Group</p>
                    {ITEM_ACCESS_OPTIONS.map(([value, label]) => (
                        <label key={value} className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={itemAccessLevels(values.viewAccess).includes(value)}
                                onChange={() => {
                                    const selected = itemAccessLevels(values.viewAccess);
                                    const next = selected.includes(value)
                                        ? selected.filter((level) => level !== value)
                                        : [...selected, value];
                                    if (next.length) onChange('viewAccess', next);
                                }}
                                className="w-3.5 h-3.5 accent-black"
                            />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>
                <div className="space-y-1 border-t border-gray-200 pt-3">
                    <p className="text-black">Tab</p>
                    {[
                        ['digital', 'Digital asset'],
                        ['locker', 'Locker'],
                        ['kitchen', 'Kitchen']
                    ].map(([value, label]) => (
                        <label key={value} className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={(values.tabs || []).includes(value)}
                                onChange={() => {
                                    const selected = values.tabs || [];
                                    onChange('tabs', selected.includes(value) ? selected.filter((tab) => tab !== value) : [...selected, value]);
                                }}
                                className="w-3.5 h-3.5 accent-black"
                            />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>
                <label className="block">
                    Asset ID
                    <input
                        type="text"
                        placeholder="Only if you have one"
                        value={values.assetId}
                        onChange={set('assetId')}
                        readOnly={assetIdReadOnly}
                        className={`${inputClass} mt-1 ${assetIdReadOnly ? 'text-neutral-500' : ''}`}
                    />
                </label>
            </div>

            <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 text-center font-bold text-xs uppercase tracking-wider rounded-sm bg-black text-white ${submitting ? 'opacity-50 cursor-wait' : 'hover:bg-[#EAD64D] hover:text-black cursor-pointer'}`}
            >
                {submitLabel}
            </button>
        </form>
    );
}
