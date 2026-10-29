"use client";

import { useMemo, useState, useRef } from "react";
import Link from 'next/link';

const pending = "Contents to be added";

const kitchens = [
  {
    id: "k1",
    name: "Kitchen 1",
    image: "/kitchen-1.png",
    zones: [
      { id: "k1u1", name: "Upper cupboard 1", rect: [109, 160, 149, 191], items: "tea, sugar" },
      { id: "k1u2", name: "Upper cupboard 2", rect: [259, 160, 159, 191], items: "almond milk, full cream milk, soy milk, oat milk, coffee" },
      { id: "k1u3", name: "Upper cupboard 3", rect: [419, 160, 193, 191], items: pending },
      { id: "k1u4", name: "Upper cupboard 4", rect: [613, 160, 193, 191], items: pending },
      { id: "k1u5", name: "Upper cupboard 5", rect: [807, 160, 224, 191], items: pending },
      { id: "k1d1", name: "Cutlery drawer", rect: [89, 588, 180, 47], items: pending },
      { id: "k1l1", name: "Lower cupboard 1", rect: [89, 636, 180, 219], items: "paper bags, glad wrap, zip lock bags" },
      { id: "k1l2", name: "Lower cupboard 2", rect: [270, 588, 147, 267], items: "disposable cutlery, takeaway boxes" },
      { id: "k1l3", name: "Lower cupboard 3", rect: [418, 588, 169, 267], items: pending },
      { id: "k1l4", name: "Lower cupboard 5", rect: [589, 588, 221, 267], items: "bin" },
      { id: "k1fridge", name: "Fridge", rect: [1083, 201, 356, 688], items: pending },
    ],
  },
  {
    id: "k2",
    name: "Kitchen 2",
    image: "/kitchen-2.png",
    zones: [
      { id: "k2u1", name: "Upper cupboard 1", rect: [102, 132, 184, 190], items: "mugs, glasses, cups" },
      { id: "k2u2", name: "Upper cupboard 2", rect: [287, 132, 219, 190], items: "plates, bowls, cake stands" },
      { id: "k2u3", name: "Upper cupboard 3", rect: [507, 132, 214, 190], items: "plates, bowls, cake stands" },
      { id: "k2u4", name: "Upper cupboard 4", rect: [722, 132, 227, 190], items: pending },
      { id: "k2u5", name: "Upper cupboard 5", rect: [950, 132, 234, 190], items: pending },
      { id: "k2u6", name: "Upper cupboard 6", rect: [1185, 132, 250, 190], items: pending },
      { id: "k2l1", name: "Lower cupboard 1", rect: [282, 570, 212, 301], items: pending },
      { id: "k2l2", name: "Lower cupboard 2", rect: [495, 570, 249, 301], items: "cleaning supplies" },
      { id: "k2l3", name: "Lower cupboard 3", rect: [1002, 570, 231, 301], items: "bin" },
      { id: "k2d1", name: "Right-hand drawer 1", rect: [1235, 570, 240, 70], items: "cutlery, knife, fork, spoon, tongs, bottle opener" },
      { id: "k2d2", name: "Right-hand drawer 2", rect: [1235, 645, 240, 225], items: "tea station, large serving plates, cutting boards" },
    ],
  },
];

function percentageRect([x, y, width, height]) {
  return {
    left: `${(x / 1536) * 100}%`,
    top: `${(y / 1024) * 100}%`,
    width: `${(width / 1536) * 100}%`,
    height: `${(height / 1024) * 100}%`,
  };
}

export default function KitchenItemFinderPage() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");

  // Refs to scroll directly to the matched kitchen article
  const kitchenRefs = useRef({});

  const zones = useMemo(
    () => kitchens.flatMap((kitchen) => kitchen.zones.map((zone) => ({ ...zone, kitchenId: kitchen.id, kitchenName: kitchen.name }))),
    [],
  );

  // Extract unique items mapped to zone location and kitchen name
  const items = useMemo(() => {
    const itemMap = [];
    zones.forEach((zone) => {
      if (zone.items === pending) return;
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

    if (match) {
      highlight(match.id, query);
    } else {
      setSelectedId(null);
      setError("No stored item matches that search yet.");
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

        {/* SIDE-BY-SIDE HORIZONTAL SCROLLABLE KITCHEN MAPS */}
        <div className="relative">
          <div className="flex gap-6 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth no-scrollbar">
            {kitchens.map((kitchen) => {
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