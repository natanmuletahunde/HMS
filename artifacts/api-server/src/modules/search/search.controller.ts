import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Get()
  searchAll(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.svc.searchAll(q, limit ? parseInt(limit, 10) : 20);
  }
}
