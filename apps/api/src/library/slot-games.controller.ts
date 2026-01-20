import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Controller("slot-games")
export class SlotGamesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    const items = await this.prisma.slotGame.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });

    return { items };
  }
}
