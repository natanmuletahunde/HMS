import { Controller, Get, Delete, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CacheService } from './cache.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getCallerCtx } from '../../common/context/tenant-context';

@ApiTags('cache')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cache')
export class CacheController {
  constructor(private readonly cache: CacheService) {}

  @Get('stats')
  stats() { return this.cache.stats(); }

  /**
   * Cache flush is an infrastructure operation restricted to platform admins (tenantId === null).
   * Tenant admins may not flush the global cache — it would clear other tenants' cached data.
   */
  @Delete('flush')
  flush(@Req() req: any) {
    const ctx = getCallerCtx(req);
    if (ctx.tenantId !== null) {
      throw new ForbiddenException('Cache flush is restricted to platform admins');
    }
    this.cache.flush();
    return { ok: true };
  }
}
