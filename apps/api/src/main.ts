import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = parseInt(config.get("PORT") || "4000", 10);

  app.use(cookieParser());

  app.enableCors({
    origin: (config.get("CORS_ORIGIN") || "http://localhost:3000")
      .split(",")
      .map((s) => s.trim()),
    credentials: true
  });

  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

bootstrap();
