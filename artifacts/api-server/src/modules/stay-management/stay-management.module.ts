import { Module } from '@nestjs/common';
import { StayManagementController } from './stay-management.controller';
import { StayManagementService } from './stay-management.service';

@Module({ controllers: [StayManagementController], providers: [StayManagementService] })
export class StayManagementModule {}
