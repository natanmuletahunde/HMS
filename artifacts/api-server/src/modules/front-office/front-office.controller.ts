import { Controller, Get, UseGuards } from '@nestjs/common';
import { FrontOfficeService } from './front-office.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('front-office')
@UseGuards(JwtAuthGuard)
export class FrontOfficeController {
  constructor(private readonly svc: FrontOfficeService) {}

  @Get()
  getDashboard() {
    return this.svc.getDashboard();
  }
}
