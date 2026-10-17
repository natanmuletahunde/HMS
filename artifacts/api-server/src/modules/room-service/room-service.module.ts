import { Module } from '@nestjs/common';
import { RoomServiceController } from './room-service.controller';
import { RoomServiceService } from './room-service.service';

@Module({ controllers: [RoomServiceController], providers: [RoomServiceService] })
export class RoomServiceModule {}
