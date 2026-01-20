const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type SlotGame = { id: string; name: string; slug: string };

export type AssetKind = "BG" | "TEXT" | "ELEMENT";

export type Asset = {
  id: string;
  kind: AssetKind;
  slotSlug: string;
  fileName: string;
  publicUrl: string; // например: http://localhost:4000/files/...
  width?: number | null;
  height?: number | null;
};

export async function fetchSlotGames(): Promise<SlotGame[]> {
  const res = await fetch(`${API_URL}/slot-games`, { cache: "no-store" });
  if (!res.ok) throw new Error(`slot-games failed: ${res.status}`);
  const data = await res.json();
  return data.items ?? [];
}

export async function fetchAssets(slotSlug: string, kind: AssetKind): Promise<Asset[]> {
  const url = new URL(`${API_URL}/assets`);
  url.searchParams.set("slotSlug", slotSlug);
  url.searchParams.set("kind", kind);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`assets failed: ${res.status}`);
  const data = await res.json();
  return data.items ?? [];
}
