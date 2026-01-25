"use client";

import {useEffect, useMemo, useState} from "react";
import {Asset, AssetKind, fetchAssets, fetchSlotGames, SlotGame} from "@/lib/api";

const KIND_TABS: {key: AssetKind; label: string}[] = [
  { key: "BG", label: "BG" },
  { key: "TEXT", label: "TEXT" },
  { key: "ELEMENTS", label: "ELEMENTS" }
];

function cls(...a: Array<string | false | undefined | null>) {
  return a.filter(Boolean).join(" ");
}

export default function CreateClient() {
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slots, setSlots] = useState<SlotGame[]>([]);
  const [activeSlotSlug, setActiveSlotSlug] = useState<string>("");
  const [kind, setKind] = useState<AssetKind>("ELEMENTS");
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [galleryBg, setGalleryBg] = useState<Asset[]>([]);
  const [galleryElements, setGalleryElements] = useState<Asset[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [q, setQ] = useState("");

  // “мини-проект”: выбранные ассеты
  const [selected, setSelected] = useState<{BG?: Asset; TEXT?: Asset; ELEMENTS: Asset[]}>({
    ELEMENTS: []
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingSlots(true);
      try {
        const items = await fetchSlotGames();
        if (!alive) return;
        setSlots(items);
        setActiveSlotSlug(items[0]?.slug || "");
      } finally {
        if (alive) setLoadingSlots(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!activeSlotSlug) return;
    let alive = true;
    (async () => {
      setLoadingAssets(true);
      try {
        const items = await fetchAssets(activeSlotSlug, kind);
        if (!alive) return;
        setAssets(items);
      } catch (e) {
        // если /assets ещё не реализован, будет видно тут
        console.error(e);
        if (alive) setAssets([]);
      } finally {
        if (alive) setLoadingAssets(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [activeSlotSlug, kind]);

  useEffect(() => {
    if (!activeSlotSlug) return;
    let alive = true;
    (async () => {
      setLoadingGallery(true);
      try {
        const [bg, elements] = await Promise.all([
          fetchAssets(activeSlotSlug, "BG"),
          fetchAssets(activeSlotSlug, "ELEMENTS")
        ]);
        if (!alive) return;
        setGalleryBg(bg);
        setGalleryElements(elements);
      } catch (e) {
        console.error(e);
        if (alive) {
          setGalleryBg([]);
          setGalleryElements([]);
        }
      } finally {
        if (alive) setLoadingGallery(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [activeSlotSlug]);

  const filteredAssets = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return assets;
    return assets.filter(a => a.fileName.toLowerCase().includes(qq));
  }, [assets, q]);

  function pickAsset(a: Asset) {
    if (a.kind === "BG") {
      setSelected(s => ({...s, BG: a}));
      return;
    }
    if (a.kind === "TEXT") {
      setSelected(s => ({...s, TEXT: a}));
      return;
    }
    // ELEMENTS
    setSelected(s => ({...s, ELEMENTS: [...s.ELEMENTS, a]}));
  }

  function removeElement(id: string) {
    setSelected(s => ({...s, ELEMENTS: s.ELEMENTS.filter(x => x.id !== id)}));
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">Creative Construct — Create</div>
            <div className="text-sm text-neutral-500">Library → pick assets → build a draft</div>
          </div>

          <div className="flex items-center gap-2">
            <a
              className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-neutral-50"
              href="http://localhost:4000/slot-games"
              target="_blank"
              rel="noreferrer"
            >
              API: /slot-games
            </a>
            <a
              className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-neutral-50"
              href={`http://localhost:4000/assets?slotSlug=${encodeURIComponent(activeSlotSlug)}&kind=${kind}`}
              target="_blank"
              rel="noreferrer"
            >
              API: /assets
            </a>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-12 gap-4">
          {/* LEFT: slots */}
          <div className="col-span-12 md:col-span-3">
            <div className="rounded-2xl border bg-white p-3">
              <div className="mb-2 text-sm font-medium">Slots</div>

              {loadingSlots ? (
                <div className="text-sm text-neutral-500">Loading…</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {slots.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSlotSlug(s.slug)}
                      className={cls(
                        "rounded-xl px-3 py-2 text-left text-sm transition",
                        activeSlotSlug === s.slug
                          ? "bg-neutral-900 text-white"
                          : "hover:bg-neutral-100"
                      )}
                    >
                      <div className="font-medium">{s.name}</div>
                      <div className={cls("text-xs", activeSlotSlug === s.slug ? "text-white/70" : "text-neutral-500")}>
                        {s.slug}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected */}
            <div className="mt-4 rounded-2xl border bg-white p-3">
              <div className="mb-2 text-sm font-medium">Selected</div>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-neutral-500">BG</div>
                  {selected.BG ? (
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="truncate">{selected.BG.fileName}</span>
                      <button
                        className="rounded-md border px-2 py-1 text-xs hover:bg-neutral-50"
                        onClick={() => setSelected(s => ({...s, BG: undefined}))}
                      >
                        remove
                      </button>
                    </div>
                  ) : (
                    <div className="text-neutral-400">none</div>
                  )}
                </div>

                <div>
                  <div className="text-xs text-neutral-500">TEXT</div>
                  {selected.TEXT ? (
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="truncate">{selected.TEXT.fileName}</span>
                      <button
                        className="rounded-md border px-2 py-1 text-xs hover:bg-neutral-50"
                        onClick={() => setSelected(s => ({...s, TEXT: undefined}))}
                      >
                        remove
                      </button>
                    </div>
                  ) : (
                    <div className="text-neutral-400">none</div>
                  )}
                </div>

                <div>
                  <div className="text-xs text-neutral-500">ELEMENTS</div>
                  {selected.ELEMENTS.length ? (
                    <div className="mt-1 space-y-1">
                      {selected.ELEMENTS.map(e => (
                        <div key={e.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{e.fileName}</span>
                          <button
                            className="rounded-md border px-2 py-1 text-xs hover:bg-neutral-50"
                            onClick={() => removeElement(e.id)}
                          >
                            remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-neutral-400">none</div>
                  )}
                </div>
              </div>

              <div className="mt-4 text-xs text-neutral-500">
                Следующий шаг: собрать canvas 1080×1080 и “накладывать” выбранное слоями.
              </div>
            </div>
          </div>

          {/* RIGHT: assets */}
          <div className="col-span-12 md:col-span-9 space-y-4">
            <div className="rounded-2xl border bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {KIND_TABS.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setKind(t.key)}
                      className={cls(
                        "rounded-xl px-3 py-2 text-sm",
                        kind === t.key ? "bg-neutral-900 text-white" : "border hover:bg-neutral-50"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by filename…"
                  className="w-full max-w-xs rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
                />
              </div>

              <div className="mt-3 text-sm text-neutral-500">
                Slot: <span className="font-medium text-neutral-900">{activeSlotSlug || "—"}</span>
                {" · "}
                Kind: <span className="font-medium text-neutral-900">{kind}</span>
              </div>

              {loadingAssets ? (
                <div className="mt-6 text-sm text-neutral-500">Loading assets…</div>
              ) : filteredAssets.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed p-6 text-sm text-neutral-500">
                  Assets empty.
                  <div className="mt-2 text-xs">
                    Проверь что API /assets реализован и что в storage есть файлы по структуре слота/категории.
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredAssets.map(a => (
                    <button
                      key={a.id}
                      onClick={() => pickAsset(a)}
                      className="group overflow-hidden rounded-2xl border bg-white text-left hover:shadow-sm"
                      title={a.fileName}
                    >
                      <div className="aspect-square w-full bg-neutral-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={a.publicUrl}
                          alt={a.fileName}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-2">
                        <div className="truncate text-xs font-medium">{a.fileName}</div>
                        <div className="text-[11px] text-neutral-500">
                          {a.width ?? "?"}×{a.height ?? "?"}
                        </div>
                        <div className="mt-2 text-[11px] text-neutral-400 group-hover:text-neutral-600">
                          click to select
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Gallery */}
            <div className="rounded-2xl border bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Gallery</div>
                <div className="text-xs text-neutral-500">
                  {loadingGallery ? "Loading…" : `${galleryBg.length} BG · ${galleryElements.length} ELEMENTS`}
                </div>
              </div>

              {loadingGallery ? (
                <div className="mt-4 text-sm text-neutral-500">Loading gallery…</div>
              ) : (
                <div className="mt-4 space-y-6">
                  <div>
                    <div className="mb-2 text-xs font-medium text-neutral-600">Backgrounds</div>
                    {galleryBg.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-4 text-xs text-neutral-500">No BG assets.</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {galleryBg.map(a => (
                          <button
                            key={a.id}
                            onClick={() => pickAsset(a)}
                            className="group overflow-hidden rounded-2xl border bg-white text-left hover:shadow-sm"
                          >
                            <div className="aspect-square w-full bg-neutral-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={a.publicUrl}
                                alt={a.fileName}
                                className="h-full w-full object-contain"
                                loading="lazy"
                              />
                            </div>
                            <div className="p-2">
                              <div className="truncate text-xs font-medium">{a.fileName}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-medium text-neutral-600">Elements</div>
                    {galleryElements.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-4 text-xs text-neutral-500">No ELEMENTS assets.</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {galleryElements.map(a => (
                          <button
                            key={a.id}
                            onClick={() => pickAsset(a)}
                            className="group overflow-hidden rounded-2xl border bg-white text-left hover:shadow-sm"
                          >
                            <div className="aspect-square w-full bg-neutral-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={a.publicUrl}
                                alt={a.fileName}
                                className="h-full w-full object-contain"
                                loading="lazy"
                              />
                            </div>
                            <div className="p-2">
                              <div className="truncate text-xs font-medium">{a.fileName}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Preview (простое) */}
            <div className="mt-4 rounded-2xl border bg-white p-3">
              <div className="text-sm font-medium">Draft preview (placeholder)</div>
              <div className="mt-2 text-xs text-neutral-500">
                Тут следующим шагом будет canvas-редактор: BG → TEXT → ELEMENTS с позиционированием/масштабом/яркостью.
              </div>
              <div className="mt-3 h-[360px] rounded-xl border border-dashed bg-neutral-50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
