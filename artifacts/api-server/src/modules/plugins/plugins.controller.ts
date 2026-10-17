import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PluginsService } from './plugins.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getCallerCtx } from '../../common/context/tenant-context';

@ApiTags('plugins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('plugins')
export class PluginsController {
  constructor(private readonly svc: PluginsService) {}

  @Get('sdk-spec')
  getSdkSpec() { return this.svc.getSdkSpec(); }

  @Get()
  findAll(@Req() req: any) {
    return this.svc.findAll(getCallerCtx(req));
  }

  @Post()
  register(@Req() req: any, @Body() body: any) {
    return this.svc.register(getCallerCtx(req), body);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.svc.findOne(getCallerCtx(req), id);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(getCallerCtx(req), id, body);
  }
}
