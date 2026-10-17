import { Module } from '@nestjs/common';
import { RoomAmenitiesController } from './room-amenities.controller';
import { RoomAmenitiesService } from './room-amenities.service';

@Module({ controllers: [RoomAmenitiesController], providers: [RoomAmenitiesService] })
export class RoomAmenitiesModule {}
