import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getCallerCtx } from '../../common/context/tenant-context';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly svc: OrganizationsService) {}

  @Get()
  findAll(@Req() req: any, @Query('type') type?: string) {
    return this.svc.findAll(getCallerCtx(req), { type });
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

  @Get(':id/stats')
  getStats(@Req() req: any, @Param('id') id: string) {
    return this.svc.getStats(getCallerCtx(req), id);
  }
}
