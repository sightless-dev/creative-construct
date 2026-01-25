"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import {Asset, AssetKind, fetchAssets, fetchSlotGames, SlotGame} from "@/lib/api";
import dynamic from "next/dynamic";
import {EditorCanvasRef} from "./EditorCanvas";
import {useSearchParams} from "next/navigation";

const KIND_TABS: {key: AssetKind; label: string}[] = [
  { key: "BG", label: "BG" },
  { key: "TEXT", label: "TEXT" },
  { key: "ELEMENTS", label: "ELEMENTS" }
];

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "size-desc", label: "Size (big → small)" },
  { value: "size-asc", label: "Size (small → big)" }
] as const;

function cls(...a: Array<string | false | undefined | null>) {
  return a.filter(Boolean).join(" ");
}

function formatBytes(value?: number | null) {
  if (!value) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let idx = 0;
  let size = value;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  return `${size.toFixed(1)} ${units[idx]}`;
}

function formatDimensions(asset: Asset | null) {
  if (!asset) return "—";
  if (!asset.width || !asset.height) return "—";
  return `${asset.width}×${asset.height}`;
}

export default function CreateClient() {
  const searchParams = useSearchParams();
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
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]["value"]>("name-asc");
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<Asset[]>([]);
  const [canvasMode, setCanvasMode] = useState<"square" | "story">("square");
  const editorRef = useRef<EditorCanvasRef | null>(null);

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
        const paramSlot = searchParams.get("slot");
        const defaultSlot = items[0]?.slug || "";
        setActiveSlotSlug(paramSlot || defaultSlot);
        const paramKind = searchParams.get("kind");
        if (paramKind === "BG" || paramKind === "TEXT" || paramKind === "ELEMENTS") {
          setKind(paramKind);
        }
      } finally {
        if (alive) setLoadingSlots(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [searchParams]);

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
    const base = qq ? assets.filter(a => a.fileName.toLowerCase().includes(qq)) : assets;
    const sorted = [...base];
    sorted.sort((a, b) => {
      switch (sort) {
        case "name-desc":
          return b.fileName.localeCompare(a.fileName);
        case "size-desc":
          return (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0);
        case "size-asc":
          return (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0);
        default:
          return a.fileName.localeCompare(b.fileName);
      }
    });
    return sorted;
  }, [assets, q, sort]);

  function pickAsset(a: Asset) {
    setPreviewAsset(a);
    setHistory((prev) => {
      const next = [a, ...prev.filter((item) => item.id !== a.id)];
      return next.slice(0, 8);
    });

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

  const canvasSize = canvasMode === "square" ? {width: 1080, height: 1080} : {width: 1080, height: 1920};

  function exportCanvas(kind: "square" | "story") {
    const filename = `creative-${kind}-${Date.now()}.png`;
    editorRef.current?.exportDownload(filename);
  }

  const EditorCanvas = dynamic(() => import("./EditorCanvas").then((mod) => mod.EditorCanvas), {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center rounded-2xl border bg-neutral-50 text-sm text-neutral-500">
        Loading editor…
      </div>
    )
  });

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

            <div className="mt-4 rounded-2xl border bg-white p-3">
              <div className="mb-2 text-sm font-medium">Recent picks</div>
              {history.length === 0 ? (
                <div className="text-xs text-neutral-500">Нет выбранных ассетов.</div>
              ) : (
                <div className="space-y-2 text-xs">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setPreviewAsset(item)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border px-2 py-1 text-left hover:bg-neutral-50"
                    >
                      <span className="truncate">{item.fileName}</span>
                      <span className="text-[10px] text-neutral-500">{item.kind}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl border bg-white p-3">
              <div className="mb-2 text-sm font-medium">Export presets</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => exportCanvas("square")}
                  className="rounded-lg border px-3 py-2 text-xs hover:bg-neutral-50"
                >
                  Export 1:1 (1080×1080)
                </button>
                <button
                  onClick={() => exportCanvas("story")}
                  className="rounded-lg border px-3 py-2 text-xs hover:bg-neutral-50"
                >
                  Export 9:16 (1080×1920)
                </button>
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

                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as (typeof SORT_OPTIONS)[number]["value"])}
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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

            <div className="rounded-2xl border bg-white p-3">
              <div className="text-sm font-medium">Preview</div>
              {previewAsset ? (
                <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr]">
                  <div className="aspect-square overflow-hidden rounded-xl border bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewAsset.publicUrl}
                      alt={previewAsset.fileName}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="space-y-2 text-sm text-neutral-600">
                    <div className="text-base font-semibold text-neutral-900">{previewAsset.fileName}</div>
                    <div>Kind: <span className="font-medium text-neutral-900">{previewAsset.kind}</span></div>
                    <div>Dimensions: <span className="font-medium text-neutral-900">{formatDimensions(previewAsset)}</span></div>
                    <div>File size: <span className="font-medium text-neutral-900">{formatBytes(previewAsset.sizeBytes)}</span></div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-neutral-500">
                  Select an asset to see its preview and metadata.
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-white p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-medium">Canvas mode</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCanvasMode("square")}
                    className={cls(
                      "rounded-lg border px-3 py-2 text-xs",
                      canvasMode === "square" ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"
                    )}
                  >
                    1:1 (1080×1080)
                  </button>
                  <button
                    onClick={() => setCanvasMode("story")}
                    className={cls(
                      "rounded-lg border px-3 py-2 text-xs",
                      canvasMode === "story" ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"
                    )}
                  >
                    9:16 (1080×1920)
                  </button>
                </div>
              </div>

              <EditorCanvas
                ref={editorRef}
                size={canvasSize}
                bg={selected.BG}
                text={selected.TEXT}
                elements={selected.ELEMENTS}
              />
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
