import { Controller, Get, Param, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";
import fs from "fs";
import path from "path";

// ВАЖНО: это dev-эндпоинт для отдачи файлов из storage.
// В проде будем отдавать через CDN/S3/Cloudflare R2.
@Controller("files")
export class FilesController {
  constructor(private config: ConfigService) {}

  @Get(":storageKey(*)")
  async getFile(@Param("storageKey") storageKey: string, @Res() res: Response) {
    const decoded = decodeURIComponent(storageKey);

    const storageDir = this.config.get<string>("STORAGE_DIR") ?? "storage";
    const normalizedKey = decoded.replace(/\\/g, "/");
    const prefix = `${storageDir}/`;

    // Разрешаем только storage/*
    if (!normalizedKey.startsWith(prefix)) {
      return res.status(400).json({ error: "Invalid storageKey" });
    }

    const storageRoot = path.resolve(process.cwd(), storageDir);
    const relative = normalizedKey.slice(prefix.length);
    const abs = path.resolve(storageRoot, relative);

    if (!abs.startsWith(`${storageRoot}${path.sep}`) && abs !== storageRoot) {
      return res.status(400).json({ error: "Invalid storageKey" });
    }

    if (!fs.existsSync(abs)) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.sendFile(abs);
  }
}
