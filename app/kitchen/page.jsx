"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from 'next/link';
import Gate from '../../components/Gate';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { KITCHENS, KITCHEN_PENDING, kitchenZones, saveLinkedKitchenItem } from '../lib/placeItems';

function percentageRect([x, y, width, height]) {
  return {
    left: `${(x / 1536) * 100}%`,
    top: `${(y / 1024) * 100}%`,
    width: `${(width / 1536) * 100}%`,
    height: `${(height / 1024) * 100}%`,
  };
}

function KitchenItemFinderPage() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");
  const [placeItems, setPlaceItems] = useState(null);
  const [newName, setNewName] = useState("");
  const [newZone, setNewZone] = useState(kitchenZones()[0]?.id || "");
  const [adding, setAdding] = useState(false);

  const kitchenRefs = useRef({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "items"), (snapshot) => {
      setPlaceItems(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    }, () => setPlaceItems([]));
    return () => unsubscribe();
  }, []);

  const zones = useMemo(() => {
    const loaded = Array.isArray(placeItems);
    return KITCHENS.flatMap((kitchen) => kitchen.zones.map((zone) => {
      const names = (placeItems || []).filter((item) => item.kitchenZone === zone.id && item.name).map((item) => item.name);
      const items = names.length ? names.join(", ") : (loaded ? KITCHEN_PENDING : zone.items);
      return { ...zone, items, kitchenId: kitchen.id, kitchenName: kitchen.name };
    }));
  }, [placeItems]);

  // Extract unique items mapped to zone location and kitchen name
  const items = useMemo(() => {
    const itemMap = [];
    zones.forEach((zone) => {
      if (zone.items === KITCHEN_PENDING) return;
      zone.items.split(",").map((item) => item.trim()).forEach((item) => {
        if (item) {
          itemMap.push({
            item,
            zoneId: zone.id,
            zoneName: zone.name,
            kitchenName: zone.kitchenName
          });
        }
      });
    });
    return itemMap.sort((a, b) => a.item.localeCompare(b.item));
  }, [zones]);

  // Filter autocomplete suggestions based on query
  const suggestions = useMemo(() => {
    if (!query.trim()) return items.slice(0, 8); // Show default top items on focus
    const searchTerm = query.trim().toLowerCase();
    return items.filter(({ item, zoneName }) =>
      item.toLowerCase().includes(searchTerm) || zoneName.toLowerCase().includes(searchTerm)
    ).slice(0, 8);
  }, [items, query]);

  function highlight(zoneId, itemLabel) {
    setSelectedId(zoneId);
    if (itemLabel) setQuery(itemLabel);
    setFocused(false);
    setError("");

    // Find parent kitchen to trigger smooth scroll
    const match = zones.find((z) => z.id === zoneId);
    if (match && kitchenRefs.current[match.kitchenId]) {
      setTimeout(() => {
        kitchenRefs.current[match.kitchenId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }, 50);
    }
  }

  function findItem(event) {
    event.preventDefault();
    const searchTerm = query.trim().toLowerCase();
    if (!searchTerm) return;
    const match = zones.find((zone) => zone.items.split(",").some((item) => item.trim().toLowerCase() === searchTerm))
      || zones.find((zone) => zone.items.toLowerCase().includes(searchTerm));

    if (match && match.items !== KITCHEN_PENDING) {
      highlight(match.id, query);
    } else {
      setSelectedId(null);
      setError("No stored item matches that search yet.");
    }
  }

  async function addKitchenItem(event) {
    event.preventDefault();
    const name = newName.trim();
    if (!name || !newZone) return;
    setAdding(true);
    setError("");
    try {
      await saveLinkedKitchenItem(db, { name, zoneId: newZone });
      setNewName("");
      highlight(newZone, name);
    } catch (err) {
      console.error("Kitchen item was not saved:", err);
      setError("The item could not be added.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F9F9F9] text-black font-sans antialiased selection:bg-[#EAD64D]">
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">

        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-black">
              Kitchen Search
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm">Locate tea, mugs, cutlery etc. in kitchen cupboards.</p>
            <p className="text-sm font-bold text-black pt-2">Fridge passcode: 308</p>
          </div>
        </header>

        {/* SEARCH BAR SECTION WITH SUGGESTIONS DROPDOWN */}
        <div className="bg-white p-4 border border-gray-200 rounded-sm shadow-xs space-y-2 relative z-30">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Search Item
          </label>
          <form className="relative flex flex-col sm:flex-row gap-2" onSubmit={findItem}>
            <div className="relative min-w-0 flex-1">
              <input
                value={query}
                onChange={(event) => { setQuery(event.target.value); setError(""); }}
                onFocus={() => setFocused(true)}
                onBlur={() => window.setTimeout(() => setFocused(false), 200)}
                placeholder="Try plates, mugs, cutlery, milk, coffee…"
                className="w-full bg-gray-50 border border-gray-300 text-sm px-3.5 py-2.5 rounded-sm focus:outline-none focus:border-black font-medium text-black placeholder:text-gray-400"
                aria-label="Search kitchen items"
                autoComplete="off"
              />

              {/* AUTOCOMPLETE SUGGESTIONS DROPDOWN */}
              {focused && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 border border-gray-200 bg-white shadow-xl rounded-sm overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {suggestions.map(({ item, zoneId }, idx) => (
                    <button
                      key={`${item}-${zoneId}-${idx}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        highlight(zoneId, item);
                      }}
                      className="w-full px-4 py-2.5 text-left block hover:bg-[#EAD64D] transition-colors cursor-pointer text-xs font-bold text-black capitalize"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="bg-black text-white hover:bg-[#EAD64D] hover:text-black transition-colors px-6 py-2.5 rounded-sm font-bold text-xs uppercase tracking-wider shrink-0 cursor-pointer"
            >
              Find Item ↗
            </button>
          </form>

          {error && (
            <p className="text-xs font-bold text-red-600 pt-1">{error}</p>
          )}
        </div>

        <form onSubmit={addKitchenItem} className="bg-white p-4 border border-gray-200 rounded-sm shadow-xs flex flex-col sm:flex-row gap-2">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Add an item, e.g. tea"
            aria-label="Item name"
            className="min-w-0 flex-1 bg-gray-50 border border-gray-300 text-sm px-3.5 py-2.5 rounded-sm focus:outline-none focus:border-black font-medium text-black"
          />
          <select
            value={newZone}
            onChange={(event) => setNewZone(event.target.value)}
            aria-label="Cupboard"
            className="bg-white border border-gray-300 text-sm px-3 py-2.5 rounded-sm"
          >
            {kitchenZones().map((zone) => (
              <option key={zone.id} value={zone.id}>{zone.kitchenName}, {zone.name}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={adding}
            className="bg-black text-white hover:bg-[#EAD64D] hover:text-black transition-colors px-6 py-2.5 rounded-sm font-bold text-xs uppercase tracking-wider shrink-0 cursor-pointer disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add item"}
          </button>
        </form>

        {/* SIDE-BY-SIDE HORIZONTAL SCROLLABLE KITCHEN MAPS */}
        <div className="relative">
          <div className="flex gap-6 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth no-scrollbar">
            {KITCHENS.map((kitchen) => {
              const selectedZone = kitchen.zones.find((zone) => zone.id === selectedId);
              return (
                <article
                  key={kitchen.id}
                  ref={(el) => (kitchenRefs.current[kitchen.id] = el)}
                  className={`w-[85vw] max-w-lg shrink-0 snap-center bg-white border transition-all rounded-sm shadow-xs overflow-hidden ${selectedZone ? 'border-black ring-2 ring-black/10' : 'border-gray-200'
                    }`}
                >
                  <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-neutral-50/50">
                    <h2 className="text-xs font-extrabold uppercase tracking-widest text-black">
                      {kitchen.name}
                    </h2>
                    {selectedZone ? (
                      <span>
                      </span>
                    ) : (
                      <span> </span>
                    )}
                  </div>

                  <div className="relative overflow-hidden bg-neutral-100">
                    <img
                      src={kitchen.image}
                      alt={`${kitchen.name} layout illustration`}
                      className="block h-auto w-full"
                    />
                    {selectedZone && (
                      <div
                        className="pointer-events-none absolute border-4 border-black bg-[#EAD64D]/50 animate-pulse shadow-lg"
                        style={percentageRect(selectedZone.rect)}
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

      </div>
    </main>
  );
}

export default function Page() {
  return <Gate level="staff"><KitchenItemFinderPage /></Gate>;
}