import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CustomerServiceService } from './customer-service.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('customer-service')
@UseGuards(JwtAuthGuard)
export class CustomerServiceController {
  constructor(private readonly svc: CustomerServiceService) {}

  @Get('dashboard')
  getDashboard() {
    return this.svc.getDashboard();
  }

  @Get('stats')
  getStats() {
    return this.svc.getStats();
  }

  @Get()
  findAll(@Query() q: any) {
    return this.svc.findAll(q);
  }

  @Post()
  create(@Body() b: any) {
    return this.svc.create(b);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() b: any) {
    return this.svc.update(id, b);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @Body() b: any) {
    return this.svc.addComment(id, b);
  }

  @Post(':id/feedback')
  submitFeedback(@Param('id') id: string, @Body() b: any) {
    return this.svc.submitFeedback(id, b);
  }
}
