import { Module } from '@nestjs/common';
import { RoomCategoriesController } from './room-categories.controller';
import { RoomCategoriesService } from './room-categories.service';

@Module({ controllers: [RoomCategoriesController], providers: [RoomCategoriesService] })
export class RoomCategoriesModule {}
