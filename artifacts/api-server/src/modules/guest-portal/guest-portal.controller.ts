import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { GuestPortalService } from './guest-portal.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('guest-portal')
@Public()
export class GuestPortalController {
  constructor(private readonly svc: GuestPortalService) {}

  @Post('login')
  login(@Body() body: { roomNumber: string; accessCode?: string }) {
    return this.svc.login(body);
  }

  @Post('register')
  register(
    @Body()
    body: {
      firstName: string;
      lastName: string;
      phone?: string;
      email?: string;
      roomNumber: string;
      nationality?: string;
      idType?: string;
      idNumber?: string;
      foodPreference?: string;
      bedPreference?: string;
      smokingPreference?: string;
      specialRequests?: string;
    },
  ) {
    return this.svc.register(body);
  }

  @Get('qr-code')
  getQrCode(
    @Query('url') url?: string,
    @Query('roomNumber') roomNumber?: string,
  ) {
    return this.svc.generateQrCode({ url, roomNumber });
  }

  @Get('catalog')
  getCatalog() {
    return this.svc.getCatalog();
  }

  @Post('order')
  submitOrder(
    @Body()
    body: {
      roomNumber: string;
      guestName: string;
      guestId?: string;
      reservationId?: string;
      serviceType: string;
      description: string;
      specialInstructions?: string;
      priority?: string;
      chargeAmount?: number;
    },
  ) {
    return this.svc.submitServiceRequest(body);
  }

  @Post('stay-change')
  requestStayChange(
    @Body()
    body: {
      reservationId: string;
      guestId: string;
      roomNumber: string;
      guestName: string;
      actionType: string;
      requestedCheckOut?: string;
      reason: string;
    },
  ) {
    return this.svc.requestStayChange(body);
  }

  @Get('my-orders')
  getRoomOrders(@Query('roomNumber') roomNumber: string) {
    return this.svc.getRoomOrders(roomNumber);
  }

  @Get('my-folio')
  getRoomFolio(@Query('guestId') guestId: string) {
    return this.svc.getRoomFolio(guestId);
  }

  @Post('request-checkout')
  requestCheckout(
    @Body()
    body: {
      roomNumber: string;
      reservationId?: string;
      guestId?: string;
      notes?: string;
    },
  ) {
    return this.svc.requestCheckoutInspection(body);
  }

  @Get('checkout-status')
  getCheckoutStatus(@Query('reservationId') reservationId: string) {
    return this.svc.getCheckoutStatus(reservationId);
  }
}
