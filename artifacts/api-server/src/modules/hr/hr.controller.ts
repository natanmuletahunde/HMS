import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { HrService } from './hr.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('hr')
@UseGuards(JwtAuthGuard)
export class HrController {
  constructor(private readonly svc: HrService) {}

  @Get('dashboard')
  getDashboard() { return this.svc.getDashboard(); }

  @Get('departments')
  getDepartments() { return this.svc.getDepartments(); }

  @Post('departments')
  createDepartment(@Body() b: any) { return this.svc.createDepartment(b); }

  @Patch('departments/:id')
  updateDepartment(@Param('id') id: string, @Body() b: any) { return this.svc.updateDepartment(id, b); }

  @Get('attendance')
  getAttendance(@Query() q: any) { return this.svc.getAttendance(q); }

  @Post('attendance/clock-in')
  clockIn(@Body() b: any) { return this.svc.clockIn(b); }

  @Patch('attendance/:id/clock-out')
  clockOut(@Param('id') id: string, @Body() b: any) { return this.svc.clockOut(id, b); }

  @Get('leaves')
  getLeaves(@Query() q: any) { return this.svc.getLeaves(q); }

  @Post('leaves')
  createLeave(@Body() b: any) { return this.svc.createLeave(b); }

  @Patch('leaves/:id')
  updateLeave(@Param('id') id: string, @Body() b: any) { return this.svc.updateLeave(id, b); }

  @Get('shifts')
  getShifts() { return this.svc.getShifts(); }

  @Post('shifts')
  createShift(@Body() b: any) { return this.svc.createShift(b); }

  @Get('shift-assignments')
  getShiftAssignments(@Query() q: any) { return this.svc.getShiftAssignments(q); }

  @Post('shift-assignments')
  assignShift(@Body() b: any) { return this.svc.assignShift(b); }

  @Get('performance-reviews')
  getPerformanceReviews(@Query() q: any) { return this.svc.getPerformanceReviews(q); }

  @Post('performance-reviews')
  createPerformanceReview(@Body() b: any) { return this.svc.createPerformanceReview(b); }

  @Patch('performance-reviews/:id')
  updatePerformanceReview(@Param('id') id: string, @Body() b: any) { return this.svc.updatePerformanceReview(id, b); }
}
