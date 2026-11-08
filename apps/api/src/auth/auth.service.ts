import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import { ROLE_CAPABILITIES } from '@orderwise/shared';
import type { MemberRole } from '@orderwise/prisma';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private sign(payload: AuthUser) {
    const accessExp = this.config.get<string>('JWT_ACCESS_TTL', '900');
    const access = this.jwt.sign(payload, { expiresIn: `${accessExp}s` });
    const refresh = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: `${this.config.get<string>('JWT_REFRESH_TTL', '604800')}s`,
    });
    return { accessToken: access, refreshToken: refresh };
  }

  async register(email: string, password: string, fullName: string, phone?: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, fullName, phone },
    });

    const tokens = this.sign({ id: user.id, email: user.email, fullName: user.fullName });
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(tokens.refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 604800_000),
      },
    });

    return { user, ...tokens };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.sign({ id: user.id, email: user.email, fullName: user.fullName });
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(tokens.refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 604800_000),
      },
    });

    const { passwordHash: _ph, deletedAt: _d, ...safe } = user;
    return { user: safe, ...tokens };
  }

  /**
   * Current user + all shops they belong to (with role + capabilities).
   * This is what a client uses after login to know which shops to render and
   * which picks to offer in a shop-switcher.
   */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException();
    const memberships = await this.prisma.shopMember.findMany({
      where: { userId },
      include: { shop: true },
    });
    const shops = memberships.map((m) => ({
      id: m.shopId,
      name: m.shop.name,
      slug: m.shop.slug,
      role: m.role,
      capabilities: Array.from(
        ROLE_CAPABILITIES[m.role as MemberRole] ?? [],
      ),
    }));
    const { passwordHash: _ph, deletedAt: _d, ...safe } = user;
    return { user: safe, shops };
  }

  async refresh(token: string) {
    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      }) as AuthUser;
      const record = await this.prisma.refreshToken.findUnique({
        where: { tokenHash: this.hashToken(token) },
      });
      if (!record || record.revokedAt || record.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      await this.prisma.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date() },
      });
      const tokens = this.sign(payload);
      await this.prisma.refreshToken.create({
        data: {
          tokenHash: this.hashToken(tokens.refreshToken),
          userId: payload.id,
          expiresAt: new Date(Date.now() + 604800_000),
        },
      });
      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
