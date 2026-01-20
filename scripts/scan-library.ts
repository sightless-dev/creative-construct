import fs from "fs";
import path from "path";
import { PrismaClient, AssetCategory } from "@prisma/client";

const prisma = new PrismaClient();
const LIB_ROOT = path.resolve(process.cwd(), "storage", "library");

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "") // emoji
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "slot";
}

function isImage(file: string) {
  const ext = path.extname(file).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp"].includes(ext);
}

function detectMime(file: string) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

async function upsertSlotGame(name: string) {
  const slug = slugify(name);
  return prisma.slotGame.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });
}

async function upsertAsset(slotGameId: string, category: AssetCategory, absPath: string) {
  const rel = path.relative(process.cwd(), absPath).replace(/\\/g, "/");
  const fileName = path.basename(absPath);

  await prisma.asset.upsert({
    where: { storageKey: rel },
    update: { slotGameId, category, fileName, mimeType: detectMime(absPath) },
    create: {
      slotGameId,
      category,
      fileName,
      mimeType: detectMime(absPath),
      storageKey: rel,
    },
  });
}

async function main() {
  if (!fs.existsSync(LIB_ROOT)) {
    console.error(`[scan] Folder not found: ${LIB_ROOT}`);
    process.exit(1);
  }

  const slotFolders = fs.readdirSync(LIB_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  console.log(`[scan] Slot folders: ${slotFolders.length}`);

  for (const slotName of slotFolders) {
    const slotPath = path.join(LIB_ROOT, slotName);
    const slotGame = await upsertSlotGame(slotName);

    const cats: Array<[string, AssetCategory]> = [
      ["BG", "BG"],
      ["TEXT", "TEXT"],
      ["ELEMENTS", "ELEMENTS"],
    ];

    for (const [folder, cat] of cats) {
      const catPath = path.join(slotPath, folder);
      if (!fs.existsSync(catPath)) continue;

      const files = fs.readdirSync(catPath).filter(isImage);

      for (const f of files) {
        await upsertAsset(slotGame.id, cat, path.join(catPath, f));
      }
    }
  }

  console.log("[scan] Done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
