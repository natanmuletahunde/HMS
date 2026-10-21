import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('occupancy')
  getOccupancyReport(@Query() q: any) {
    return this.svc.getOccupancyReport(q);
  }

  @Get('revenue')
  getRevenueReport(@Query() q: any) {
    return this.svc.getRevenueReport(q);
  }

  @Get('reservations')
  getReservationReport(@Query() q: any) {
    return this.svc.getReservationReport(q);
  }

  @Get('housekeeping')
  getHousekeepingReport(@Query() q: any) {
    return this.svc.getHousekeepingReport(q);
  }

  @Get('maintenance')
  getMaintenanceReport(@Query() q: any) {
    return this.svc.getMaintenanceReport(q);
  }

  @Get('restaurant')
  getRestaurantReport(@Query() q: any) {
    return this.svc.getRestaurantReport(q);
  }

  @Get('inventory')
  getInventoryReport(@Query() q: any) {
    return this.svc.getInventoryReport(q);
  }

  @Get('procurement')
  getProcurementReport(@Query() q: any) {
    return this.svc.getProcurementReport(q);
  }

  @Get('hr')
  getHrReport(@Query() q: any) {
    return this.svc.getHrReport(q);
  }

  @Get('complaints')
  getComplaintReport(@Query() q: any) {
    return this.svc.getComplaintReport(q);
  }

  @Get('financial')
  getFinancialSummary(@Query() q: any) {
    return this.svc.getFinancialSummary(q);
  }

  @Get('conference')
  getConferenceReport(@Query() q: any) {
    return this.svc.getConferenceReport(q);
  }

  @Get('transport')
  getTransportReport(@Query() q: any) {
    return this.svc.getTransportReport(q);
  }

  @Get('guests')
  getGuestsReport(@Query() q: any) {
    return this.svc.getGuestsReport(q);
  }

  @Get('executive-summary')
  getExecutiveSummary(@Query() q: any) {
    return this.svc.getExecutiveSummary(q);
  }
}
