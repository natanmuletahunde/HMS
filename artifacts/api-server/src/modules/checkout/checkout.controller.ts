import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller(['checkouts', 'checkout'])
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  constructor(private readonly svc: CheckoutService) {}

  @Get()
  findAll(@Query() q: any) {
    return this.svc.findAll({
      page: q.page ? +q.page : 1,
      limit: q.limit ? +q.limit : 20,
      search: q.search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }
}
