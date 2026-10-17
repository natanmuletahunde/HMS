import { Module } from '@nestjs/common';
import { ModuleConfigController } from './module-config.controller';
import { ModuleConfigService } from './module-config.service';

@Module({
  controllers: [ModuleConfigController],
  providers: [ModuleConfigService],
  exports: [ModuleConfigService],
})
export class ModuleConfigModule {}
