import { Module } from '@nestjs/common';
import { RoomPricingController } from './room-pricing.controller';
import { RoomPricingService } from './room-pricing.service';

@Module({ controllers: [RoomPricingController], providers: [RoomPricingService] })
export class RoomPricingModule {}
