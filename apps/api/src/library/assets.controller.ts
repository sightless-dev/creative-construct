import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

const categories = ["BG", "TEXT", "ELEMENTS"] as const;
type Category = (typeof categories)[number];

@Controller("assets")
export class AssetsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(
    @Query("slotSlug") slotSlug?: string,
    @Query("kind") kind?: string
  ) {
    if (!slotSlug) throw new BadRequestException("slotSlug is required");

    const normalizedKind = (kind ?? "").toUpperCase();
    const category = normalizedKind === "ELEMENT" ? "ELEMENTS" : normalizedKind;

    if (!categories.includes(category as Category)) {
      throw new BadRequestException("kind must be BG|TEXT|ELEMENTS");
    }

    const slotGame = await this.prisma.slotGame.findUnique({
      where: { slug: slotSlug },
      select: { id: true },
    });
    if (!slotGame) return { items: [] };

    const items = await this.prisma.asset.findMany({
      where: { slotGameId: slotGame.id, category: category as Category },
      orderBy: { fileName: "asc" },
      select: {
        id: true,
        fileName: true,
        storageKey: true,
        mimeType: true,
        width: true,
        height: true,
        sizeBytes: true,
        category: true,
      },
    });

    // Добавим удобный URL для превью файла
    return {
      items: items.map((a) => ({
        ...a,
        kind: a.category,
        publicUrl: `/files/${encodeURIComponent(a.storageKey)}`,
      })),
    };
  }
}
