import { Module } from '@nestjs/common';
import { BedTypesController } from './bed-types.controller';
import { BedTypesService } from './bed-types.service';

@Module({ controllers: [BedTypesController], providers: [BedTypesService] })
export class BedTypesModule {}
