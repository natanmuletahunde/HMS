import { Controller, Get, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ModuleConfigService } from './module-config.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getCallerCtx } from '../../common/context/tenant-context';

@ApiTags('modules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('modules')
export class ModuleConfigController {
  constructor(private readonly svc: ModuleConfigService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.svc.findAll(getCallerCtx(req));
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.svc.getStats(getCallerCtx(req));
  }

  @Patch(':moduleCode')
  toggle(@Req() req: any, @Param('moduleCode') moduleCode: string, @Body() body: any) {
    return this.svc.toggle(getCallerCtx(req), moduleCode, body);
  }
}
