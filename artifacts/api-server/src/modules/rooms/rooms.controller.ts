import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { RoomsService } from './rooms.service';
import { db, buildingsTable, roomsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { getUserAccessInfo } from '../../common/utils/access-control';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly svc: RoomsService) {}

  @Get('availability')
  async getAvailability(@CurrentUser() user: JwtPayload, @Query() q: any) {
    const access = await getUserAccessInfo(user);
    const allowedBranchIds = access.isGlobal ? null : access.branchIds;
    return this.svc.findAvailable(q.roomTypeId, allowedBranchIds);
  }

  @Get()
  async findAll(@CurrentUser() user: JwtPayload, @Query() q: any) {
    const access = await getUserAccessInfo(user);
    const allowedBranchIds = access.isGlobal ? null : access.branchIds;
    return this.svc.findAll(q, allowedBranchIds);
  }

  @Get('export')
  async exportRooms(@CurrentUser() user: JwtPayload, @Query() q: any) {
    const access = await getUserAccessInfo(user);
    const allowedBranchIds = access.isGlobal ? null : access.branchIds;
    return this.svc.exportRooms(q, allowedBranchIds);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const room = await this.svc.findOne(id);
    const access = await getUserAccessInfo(user);
    if (!access.isGlobal && room.branchId && !access.branchIds.includes(room.branchId)) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  @Get(':id/detail')
  async getDetail(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const detail = await this.svc.getDetail(id);
    const access = await getUserAccessInfo(user);
    if (!access.isGlobal && detail.branchId && !access.branchIds.includes(detail.branchId)) {
      throw new NotFoundException('Room not found');
    }
    return detail;
  }

  @Get(':id/amenities') getAmenities(@Param('id') id: string) { return this.svc.getRoomAmenities(id); }
  @Get(':id/images') getImages(@Param('id') id: string) { return this.svc.getRoomImages(id); }
  @Get(':id/pricing') getPricing(@Param('id') id: string) { return this.svc.getRoomPricing(id); }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() body: any) {
    const access = await getUserAccessInfo(user);
    if (!access.isGlobal) {
      const [bld] = await db.select({ branchId: buildingsTable.branchId }).from(buildingsTable).where(eq(buildingsTable.id, body.buildingId));
      if (!bld || !access.branchIds.includes(bld.branchId)) {
        throw new ForbiddenException('You cannot create rooms outside your assigned branch.');
      }
    }
    return this.svc.create({ ...body, createdBy: user.userId });
  }

  @Post('bulk-import')
  async bulkImport(@CurrentUser() user: JwtPayload, @Body() body: any) {
    const access = await getUserAccessInfo(user);
    if (!access.isGlobal) {
      throw new ForbiddenException('Bulk import is restricted to global administrators.');
    }
    return this.svc.bulkImport(body.rooms);
  }

  @Post(':id/block') block(@Param('id') id: string) { return this.svc.changeStatus(id, 'blocked'); }
  @Post(':id/unblock') unblock(@Param('id') id: string) { return this.svc.changeStatus(id, 'available'); }
  @Post(':id/amenities') assignAmenities(@Param('id') id: string, @Body() body: any) { return this.svc.assignAmenities(id, body.amenityIds); }
  @Post(':id/images') addImage(@Param('id') id: string, @Body() body: any) { return this.svc.addImage(id, body); }

  @Patch(':id')
  async update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    const access = await getUserAccessInfo(user);
    if (!access.isGlobal) {
      const [r] = await db.select({ buildingId: roomsTable.buildingId }).from(roomsTable).where(eq(roomsTable.id, id));
      if (!r) throw new NotFoundException('Room not found');
      const [bld] = await db.select({ branchId: buildingsTable.branchId }).from(buildingsTable).where(eq(buildingsTable.id, r.buildingId));
      if (!bld || !access.branchIds.includes(bld.branchId)) {
        throw new ForbiddenException('You cannot modify rooms outside your assigned branch.');
      }
    }
    return this.svc.update(id, { ...body, updatedBy: user.userId });
  }

  @Patch(':id/status') changeStatus(@Param('id') id: string, @Body() body: any) { return this.svc.changeStatus(id, body.status); }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const access = await getUserAccessInfo(user);
    if (!access.isGlobal) {
      const [r] = await db.select({ buildingId: roomsTable.buildingId }).from(roomsTable).where(eq(roomsTable.id, id));
      if (!r) throw new NotFoundException('Room not found');
      const [bld] = await db.select({ branchId: buildingsTable.branchId }).from(buildingsTable).where(eq(buildingsTable.id, r.buildingId));
      if (!bld || !access.branchIds.includes(bld.branchId)) {
        throw new ForbiddenException('You cannot delete rooms outside your assigned branch.');
      }
    }
    return this.svc.remove(id);
  }

  @Delete(':id/amenities/:amenityId') removeAmenity(@Param('id') id: string, @Param('amenityId') amenityId: string) { return this.svc.removeAmenity(id, amenityId); }
  @Delete(':id/images/:imageId') removeImage(@Param('id') id: string, @Param('imageId') imageId: string) { return this.svc.removeImage(imageId); }
}
