import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";

type JwtPayload = { sub: string; email: string };

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  private accessSecret() { return this.config.get<string>("JWT_ACCESS_SECRET") || "change_me_access_secret"; }
  private refreshSecret() { return this.config.get<string>("JWT_REFRESH_SECRET") || "change_me_refresh_secret"; }

  private signAccess(payload: JwtPayload) { return jwt.sign(payload, this.accessSecret(), { expiresIn: "15m" }); }
  private signRefresh(payload: JwtPayload) { return jwt.sign(payload, this.refreshSecret(), { expiresIn: "30d" }); }

  setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie("cc_access", accessToken, { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 15*60*1000 });
    res.cookie("cc_refresh", refreshToken, { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 30*24*60*60*1000 });
  }
  clearAuthCookies(res: Response) {
    res.clearCookie("cc_access", { path: "/" });
    res.clearCookie("cc_refresh", { path: "/" });
  }

  async register(email: string, password: string) {
    email = (email || "").trim().toLowerCase();
    if (!email || !password || password.length < 8) throw new BadRequestException("Invalid email or password (min 8 chars).");
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException("Email already registered.");
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({ data: { email, passwordHash } });
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return { user: { id: user.id, email: user.email }, accessToken: this.signAccess(payload), refreshToken: this.signRefresh(payload) };
  }

  async login(email: string, password: string) {
    email = (email || "").trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("Invalid credentials.");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials.");
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return { user: { id: user.id, email: user.email }, accessToken: this.signAccess(payload), refreshToken: this.signRefresh(payload) };
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) throw new UnauthorizedException("No refresh token.");
    try {
      const decoded = jwt.verify(refreshToken, this.refreshSecret()) as JwtPayload;
      const user = await this.prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user) throw new UnauthorizedException("User not found.");
      const payload: JwtPayload = { sub: user.id, email: user.email };
      return { accessToken: this.signAccess(payload), refreshToken: this.signRefresh(payload) };
    } catch {
      throw new UnauthorizedException("Invalid refresh token.");
    }
  }

  async me(accessToken?: string) {
    if (!accessToken) throw new UnauthorizedException("No access token.");
    try {
      const decoded = jwt.verify(accessToken, this.accessSecret()) as JwtPayload;
      return { user: { id: decoded.sub, email: decoded.email } };
    } catch {
      throw new UnauthorizedException("Invalid access token.");
    }
  }
}
