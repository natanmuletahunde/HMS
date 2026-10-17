import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoomsService } from './rooms.service';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly svc: RoomsService) {}

  @Get('availability') getAvailability(@Query() q: any) { return this.svc.findAvailable(q.roomTypeId); }
  @Get() findAll(@Query() q: any) { return this.svc.findAll(q); }
  @Get('export') exportRooms(@Query() q: any) { return this.svc.exportRooms(q); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Get(':id/detail') getDetail(@Param('id') id: string) { return this.svc.getDetail(id); }
  @Get(':id/amenities') getAmenities(@Param('id') id: string) { return this.svc.getRoomAmenities(id); }
  @Get(':id/images') getImages(@Param('id') id: string) { return this.svc.getRoomImages(id); }
  @Get(':id/pricing') getPricing(@Param('id') id: string) { return this.svc.getRoomPricing(id); }

  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Post('bulk-import') bulkImport(@Body() body: any) { return this.svc.bulkImport(body.rooms); }
  @Post(':id/block') block(@Param('id') id: string) { return this.svc.changeStatus(id, 'blocked'); }
  @Post(':id/unblock') unblock(@Param('id') id: string) { return this.svc.changeStatus(id, 'available'); }
  @Post(':id/amenities') assignAmenities(@Param('id') id: string, @Body() body: any) { return this.svc.assignAmenities(id, body.amenityIds); }
  @Post(':id/images') addImage(@Param('id') id: string, @Body() body: any) { return this.svc.addImage(id, body); }

  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
  @Patch(':id/status') changeStatus(@Param('id') id: string, @Body() body: any) { return this.svc.changeStatus(id, body.status); }

  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
  @Delete(':id/amenities/:amenityId') removeAmenity(@Param('id') id: string, @Param('amenityId') amenityId: string) { return this.svc.removeAmenity(id, amenityId); }
  @Delete(':id/images/:imageId') removeImage(@Param('id') id: string, @Param('imageId') imageId: string) { return this.svc.removeImage(imageId); }
}
