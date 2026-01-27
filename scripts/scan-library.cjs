const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: "apps/api/.env" });
require("dotenv").config(); // на всякий (если есть корневой .env)

const { PrismaClient } = require("@prisma/client");
const chokidar = require("chokidar");
const sizeOf = require("image-size");

const prisma = new PrismaClient();
const STORAGE_DIR = process.env.STORAGE_DIR || "storage";
const LIB_ROOT = path.resolve(process.cwd(), STORAGE_DIR, "library");

function slugify(input) {
  return (
    input
      .toLowerCase()
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, "") // emoji
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "slot"
  );
}

function isImage(file) {
  const ext = path.extname(file).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp"].includes(ext);
}

function detectMime(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

function readImageMeta(absPath) {
  try {
    const { width, height } = sizeOf(absPath);
    return { width, height };
  } catch (error) {
    console.warn(`[scan] Failed to read image size: ${absPath}`);
    return { width: null, height: null };
  }
}

async function upsertSlotGame(name) {
  const slug = slugify(name);
  return prisma.slotGame.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });
}

async function upsertAsset(slotGameId, category, absPath) {
  const rel = path.relative(LIB_ROOT, absPath).replace(/\\/g, "/");
  const storageKey = `${STORAGE_DIR}/library/${rel}`;
  const fileName = path.basename(absPath);
  const stats = fs.statSync(absPath);
  const { width, height } = readImageMeta(absPath);

  await prisma.asset.upsert({
    where: { storageKey },
    update: {
      slotGameId,
      category,
      fileName,
      mimeType: detectMime(absPath),
      width,
      height,
      sizeBytes: stats.size,
    },
    create: {
      slotGameId,
      category,
      fileName,
      mimeType: detectMime(absPath),
      storageKey,
      width,
      height,
      sizeBytes: stats.size,
    },
  });
}

async function removeMissingAssets(slotGameId, seenKeys) {
  if (seenKeys.size === 0) {
    await prisma.asset.deleteMany({ where: { slotGameId } });
    return;
  }

  await prisma.asset.deleteMany({
    where: {
      slotGameId,
      storageKey: { notIn: Array.from(seenKeys) },
    },
  });
}

async function removeMissingSlots(scannedSlugs) {
  const existing = await prisma.slotGame.findMany({ select: { id: true, slug: true } });
  const stale = existing.filter((slot) => !scannedSlugs.has(slot.slug));
  if (stale.length === 0) return;

  const staleIds = stale.map((slot) => slot.id);
  await prisma.asset.deleteMany({ where: { slotGameId: { in: staleIds } } });
  await prisma.slotGame.deleteMany({ where: { id: { in: staleIds } } });
}

async function scanOnce() {
  if (!fs.existsSync(LIB_ROOT)) {
    console.error(`[scan] Folder not found: ${LIB_ROOT}`);
    process.exit(1);
  }

  const slotFolders = fs
    .readdirSync(LIB_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  console.log(`[scan] Slot folders: ${slotFolders.length}`);
  let assetsUpserted = 0;
  let skipped = 0;
  let unknownCategory = 0;
  const scannedSlugs = new Set();

  for (const slotName of slotFolders) {
    const slotPath = path.join(LIB_ROOT, slotName);
    const slotGame = await upsertSlotGame(slotName);
    scannedSlugs.add(slotGame.slug);
    const seenKeys = new Set();

    const categories = new Map([
      ["bg", "BG"],
      ["background", "BG"],
      ["text", "TEXT"],
      ["elements", "ELEMENTS"],
      ["element", "ELEMENTS"],
    ]);

    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const absPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(absPath);
          continue;
        }

        if (!isImage(entry.name)) {
          skipped += 1;
          continue;
        }

        const relFromSlot = path.relative(slotPath, absPath).replace(/\\/g, "/");
        const firstSegment = relFromSlot.split("/")[0] || "";
        const normalized = firstSegment.toLowerCase();
        const cat = categories.get(normalized) || "ELEMENTS";

        if (!categories.has(normalized) && normalized) {
          unknownCategory += 1;
        }

        await upsertAsset(slotGame.id, cat, absPath);
        assetsUpserted += 1;
        const rel = path.relative(LIB_ROOT, absPath).replace(/\\/g, "/");
        seenKeys.add(`${STORAGE_DIR}/library/${rel}`);
      }
    };

    walk(slotPath);

    await removeMissingAssets(slotGame.id, seenKeys);
  }

  await removeMissingSlots(scannedSlugs);

  console.log(`[scan] Upserted assets: ${assetsUpserted}`);
  console.log(`[scan] Skipped entries: ${skipped}`);
  console.log(`[scan] Unknown category folders: ${unknownCategory}`);
  console.log("[scan] Done");
}

async function main() {
  const watch = process.argv.includes("--watch");
  await scanOnce();

  if (!watch) return;

  console.log("[scan] Watching storage for changes...");
  let timer = null;

  const watcher = chokidar.watch(LIB_ROOT, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await scanOnce();
      } catch (error) {
        console.error(error);
      }
    }, 400);
  };

  watcher.on("add", schedule);
  watcher.on("unlink", schedule);
  watcher.on("addDir", schedule);
  watcher.on("unlinkDir", schedule);
  watcher.on("change", schedule);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
