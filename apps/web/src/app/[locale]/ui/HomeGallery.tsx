"use client";

import {useEffect, useMemo, useState} from "react";
import {Asset, AssetKind, fetchAssets, fetchSlotGames, SlotGame} from "@/lib/api";
import Link from "next/link";

const TABS: {key: AssetKind; label: string}[] = [
  {key: "BG", label: "BG"},
  {key: "TEXT", label: "TEXT"},
  {key: "ELEMENTS", label: "ELEMENTS"}
];

export default function HomeGallery({locale}: {locale: string}) {
  const [slots, setSlots] = useState<SlotGame[]>([]);
  const [activeSlot, setActiveSlot] = useState<string>("");
  const [kind, setKind] = useState<AssetKind>("BG");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const items = await fetchSlotGames();
      if (!alive) return;
      setSlots(items);
      setActiveSlot(items[0]?.slug ?? "");
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!activeSlot) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const items = await fetchAssets(activeSlot, kind);
        if (!alive) return;
        setAssets(items);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [activeSlot, kind]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((asset) => asset.fileName.toLowerCase().includes(q));
  }, [assets, query]);

  return (
    <div className="mt-10 rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">Gallery</div>
          <div className="text-sm text-neutral-500">Pick a slot and a library tab to preview assets.</div>
        </div>
        <Link
          href={`/${locale}/create`}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Open editor
        </Link>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="rounded-xl border p-3">
          <div className="mb-2 text-xs font-semibold uppercase text-neutral-400">Slots</div>
          <div className="space-y-1">
            {slots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => setActiveSlot(slot.slug)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  activeSlot === slot.slug ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"
                }`}
              >
                {slot.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setKind(tab.key)}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  kind === tab.key ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"
                }`}
              >
                {tab.label}
              </button>
            ))}

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets..."
              className="ml-auto w-full max-w-xs rounded-lg border px-3 py-2 text-xs"
            />
          </div>

          {loading ? (
            <div className="mt-6 text-sm text-neutral-500">Loading assets...</div>
          ) : filtered.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed p-6 text-sm text-neutral-500">
              No assets found.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((asset) => (
                <div key={asset.id} className="rounded-xl border bg-white p-2">
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.publicUrl} alt={asset.fileName} className="h-full w-full object-contain" />
                  </div>
                  <div className="mt-2 text-xs font-medium truncate">{asset.fileName}</div>
                  <Link
                    href={`/${locale}/create?slot=${encodeURIComponent(activeSlot)}&kind=${kind}`}
                    className="mt-2 block rounded-lg border px-2 py-1 text-center text-[11px] hover:bg-neutral-50"
                  >
                    Open in editor
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
