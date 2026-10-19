import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get('history')
  getHistory(@Query() q: any) {
    return this.svc.getHistory(q);
  }

  @Post('broadcast')
  broadcastNotification(@Body() b: any) {
    return this.svc.broadcastNotification(b);
  }

  @Get('templates')
  getTemplates() {
    return this.svc.getTemplates();
  }

  @Post('templates')
  createTemplate(@Body() b: any) {
    return this.svc.createTemplate(b);
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() b: any) {
    return this.svc.updateTemplate(id, b);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: JwtPayload) {
    return this.svc.getUnreadCount(user.userId);
  }

  @Post()
  createNotification(@Body() b: any) {
    return this.svc.createNotification(b);
  }

  @Post('mark-all-read')
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.svc.markAllRead(user.userId);
  }

  @Get(':id')
  findAll(@Param('id') userId: string) {
    return this.svc.findAll(userId);
  }

  @Patch(':id/read')
  @HttpCode(200)
  markRead(@Param('id') id: string) {
    return this.svc.markRead(id);
  }

  @Post('send-sms')
  @HttpCode(200)
  sendSms(@Body() b: any) {
    return this.svc.sendSms(b);
  }

  @Post('send-email')
  @HttpCode(200)
  sendEmail(@Body() b: any) {
    return this.svc.sendEmail(b);
  }
}
