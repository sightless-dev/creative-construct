import { Controller, Get, Param, Res } from "@nestjs/common";
import { Response } from "express";
import fs from "fs";
import path from "path";

// ВАЖНО: это dev-эндпоинт для отдачи файлов из storage.
// В проде будем отдавать через CDN/S3/Cloudflare R2.
@Controller("files")
export class FilesController {
  @Get(":storageKey(*)")
  async getFile(@Param("storageKey") storageKey: string, @Res() res: Response) {
    const decoded = decodeURIComponent(storageKey);

    // Разрешаем только storage/*
    if (!decoded.startsWith("storage/")) {
      return res.status(400).json({ error: "Invalid storageKey" });
    }

    const abs = path.resolve(process.cwd(), decoded);

    if (!fs.existsSync(abs)) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.sendFile(abs);
  }
}
