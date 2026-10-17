import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
@Controller('roles') @UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly svc: RolesService) {}
  @Get() findAll() { return this.svc.findAll(); }
  @Post() create(@Body() b: any) { return this.svc.create(b); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() b: any) { return this.svc.update(id, b); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
