import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(@Body() body: { email: string; password: string }, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(body.email, body.password);
    this.auth.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post("login")
  async login(@Body() body: { email: string; password: string }, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(body.email, body.password);
    this.auth.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post("logout")
  async logout(@Res({ passthrough: true }) res: Response) {
    this.auth.clearAuthCookies(res);
    return { ok: true };
  }

  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rt = (req as any).cookies?.cc_refresh;
    const result = await this.auth.refresh(rt);
    this.auth.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { ok: true };
  }

  @Get("me")
  async me(@Req() req: Request) {
    const at = (req as any).cookies?.cc_access;
    return this.auth.me(at);
  }
}
