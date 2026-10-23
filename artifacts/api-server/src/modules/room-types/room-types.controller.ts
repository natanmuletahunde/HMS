import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RoomTypesService } from './room-types.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('room-types')
@UseGuards(JwtAuthGuard)
export class RoomTypesController {
  constructor(private readonly svc: RoomTypesService) {}

  @Get()
  findAll(@Query('categoryId') categoryId?: string) {
    return this.svc.findAll(categoryId);
  }

  @Post()
  create(@Body() b: any) {
    return this.svc.create(b);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() b: any) {
    return this.svc.update(id, b);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
