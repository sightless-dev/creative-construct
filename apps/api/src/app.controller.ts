import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      name: "Creative Construct API",
      ok: true,
      routes: ["/health", "/auth/register", "/auth/login", "/auth/logout", "/auth/refresh", "/auth/me"],
    };
  }

  @Get("health")
  health() {
    return { ok: true };
  }
}
