import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getCallerCtx } from '../../common/context/tenant-context';

@ApiTags('workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly svc: WorkflowsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.svc.findAllDefinitions(getCallerCtx(req));
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.svc.createDefinition(getCallerCtx(req), body);
  }

  @Get('instances')
  findInstances(@Req() req: any, @Query('status') status?: string, @Query('entityType') entityType?: string) {
    return this.svc.findAllInstances(getCallerCtx(req), { status, entityType });
  }

  @Post('instances/start')
  startInstance(@Req() req: any, @Body() body: any) {
    return this.svc.startInstance(getCallerCtx(req), body);
  }

  @Patch('instances/:id/advance')
  advanceInstance(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.advanceInstance(getCallerCtx(req), id, body);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.svc.findOneDefinition(getCallerCtx(req), id);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.updateDefinition(getCallerCtx(req), id, body);
  }

  @Post(':id/steps')
  addStep(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.addStep(getCallerCtx(req), id, body);
  }

  @Delete('steps/:stepId')
  deleteStep(@Req() req: any, @Param('stepId') stepId: string) {
    return this.svc.deleteStep(getCallerCtx(req), stepId);
  }
}
