import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { SlotGamesController } from "./slot-games.controller";
import { AssetsController } from "./assets.controller";
import { FilesController } from "./files.controller";

@Module({
  controllers: [SlotGamesController, AssetsController, FilesController],
  providers: [PrismaService],
})
export class LibraryModule {}
