import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getCallerCtx } from '../../common/context/tenant-context';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly svc: TenantsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.svc.findAll(getCallerCtx(req));
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.svc.create(getCallerCtx(req), body);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.svc.findOne(getCallerCtx(req), id);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(getCallerCtx(req), id, body);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.svc.remove(getCallerCtx(req), id);
  }

  @Get(':id/branding')
  getBranding(@Req() req: any, @Param('id') id: string) {
    return this.svc.getBranding(getCallerCtx(req), id);
  }

  @Patch(':id/branding')
  updateBranding(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.updateBranding(getCallerCtx(req), id, body);
  }
}
