const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: "apps/api/.env" });
require("dotenv").config(); // на всякий (если есть корневой .env)

const { PrismaClient } = require("@prisma/client");
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

async function main() {
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

  for (const slotName of slotFolders) {
    const slotPath = path.join(LIB_ROOT, slotName);
    const slotGame = await upsertSlotGame(slotName);

    const categories = new Map([
      ["bg", "BG"],
      ["background", "BG"],
      ["text", "TEXT"],
      ["elements", "ELEMENTS"],
      ["element", "ELEMENTS"],
    ]);

    const catFolders = fs
      .readdirSync(slotPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const folder of catFolders) {
      const normalized = folder.toLowerCase();
      const cat = categories.get(normalized);
      if (!cat) {
        skipped += 1;
        continue;
      }

      const catPath = path.join(slotPath, folder);
      const files = fs.readdirSync(catPath);

      for (const f of files) {
        if (!isImage(f)) {
          skipped += 1;
          continue;
        }

        await upsertAsset(slotGame.id, cat, path.join(catPath, f));
        assetsUpserted += 1;
      }
    }
  }

  console.log(`[scan] Upserted assets: ${assetsUpserted}`);
  console.log(`[scan] Skipped entries: ${skipped}`);
  console.log("[scan] Done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
