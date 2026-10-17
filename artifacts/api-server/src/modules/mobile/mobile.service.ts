import { Injectable, UnauthorizedException } from '@nestjs/common';
import { eq, and, desc, gte, getTableColumns } from 'drizzle-orm';
import { db, mobileSessionsTable, reservationsTable, roomsTable, guestsTable } from '@workspace/db';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '../auth/jwt.strategy';
import type { CallerCtx } from '../../common/context/tenant-context';
import { requireSessionSecret } from '../../common/config/runtime-secrets';

// ─── Tenant isolation note ────────────────────────────────────────────────────
// Hotel-domain tables (reservations, rooms, guests) do not yet have tenant_id
// columns — that is added in Task #10. Until then:
//   • Platform admins (ctx.tenantId === null) → full sync access
//   • Tenant users (ctx.tenantId !== null)    → empty delta (no cross-tenant leakage)

@Injectable()
export class MobileService {
  constructor(private readonly jwt: JwtService) {}

  async registerDevice(userId: string, body: { deviceId: string; deviceName?: string; platform?: string; pushToken?: string }) {
    const [existing] = await db.select(getTableColumns(mobileSessionsTable))
      .from(mobileSessionsTable)
      .where(and(eq(mobileSessionsTable.userId, userId), eq(mobileSessionsTable.deviceId, body.deviceId)));

    if (existing) {
      const [updated] = await db.update(mobileSessionsTable).set({
        pushToken: body.pushToken ?? existing.pushToken,
        deviceName: body.deviceName ?? existing.deviceName,
        platform: body.platform ?? existing.platform,
        isActive: true,
        lastSeenAt: new Date(),
      }).where(eq(mobileSessionsTable.id, existing.id)).returning();
      return updated;
    }

    const [session] = await db.insert(mobileSessionsTable).values({
      userId,
      deviceId: body.deviceId,
      deviceName: body.deviceName ?? null,
      platform: body.platform ?? null,
      pushToken: body.pushToken ?? null,
      lastSeenAt: new Date(),
    }).returning();
    return session;
  }

  async tokenRefresh(refreshToken: string) {
    const REFRESH_SECRET = requireSessionSecret() + '-refresh';
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, { secret: REFRESH_SECRET });
      const newPayload: JwtPayload = {
        userId: payload.userId, roleId: payload.roleId,
        roleName: payload.roleName, email: payload.email,
        tenantId: payload.tenantId ?? null,
      };
      return {
        accessToken: this.jwt.sign(newPayload),
        refreshToken: this.jwt.sign(newPayload, { secret: REFRESH_SECRET, expiresIn: '7d' }),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async syncDelta(ctx: CallerCtx, since: string) {
    const sinceDate = new Date(since);

    // Tenant users cannot receive cross-tenant data until Task #10 adds tenant columns
    if (ctx.tenantId !== null) {
      return {
        syncedAt: new Date().toISOString(),
        since,
        _note: 'Tenant-scoped sync requires row-level isolation (upcoming schema migration).',
        counts: { reservations: 0, rooms: 0, guests: 0 },
        data: { reservations: [], rooms: [], guests: [] },
      };
    }

    const [reservations, rooms, guests] = await Promise.all([
      db.select(getTableColumns(reservationsTable)).from(reservationsTable)
        .where(gte(reservationsTable.updatedAt, sinceDate))
        .orderBy(desc(reservationsTable.updatedAt)).limit(100),
      db.select(getTableColumns(roomsTable)).from(roomsTable)
        .where(gte(roomsTable.updatedAt, sinceDate)).limit(100),
      db.select(getTableColumns(guestsTable)).from(guestsTable)
        .where(gte(guestsTable.updatedAt, sinceDate)).limit(100),
    ]);
    return {
      syncedAt: new Date().toISOString(),
      since,
      counts: { reservations: reservations.length, rooms: rooms.length, guests: guests.length },
      data: { reservations, rooms, guests },
    };
  }

  async pushSync(ctx: CallerCtx, userId: string, changes: { entity: string; action: string; data: any }[]) {
    if (ctx.tenantId !== null) {
      return { accepted: 0, conflicts: 0, results: [],
        _note: 'Tenant-scoped sync requires row-level isolation (upcoming schema migration).' };
    }
    const results = changes.map(change => ({
      ...change, status: 'accepted', syncedAt: new Date().toISOString(),
    }));
    return { accepted: results.length, conflicts: 0, results };
  }
}
