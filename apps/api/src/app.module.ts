import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { PrismaService } from "./prisma.service";
import { AuthModule } from "./auth/auth.module";
import { LibraryModule } from "./library/library.module";

@Module({
  imports: [ConfigModule.forRoot({isGlobal:true}), AuthModule, LibraryModule],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule {}
