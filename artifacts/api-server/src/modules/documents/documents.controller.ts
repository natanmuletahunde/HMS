import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly svc: DocumentsService) {}

  @Get('reference/:referenceType/:referenceId')
  getByReference(
    @Param('referenceType') referenceType: string,
    @Param('referenceId') referenceId: string,
  ) {
    return this.svc.getByReference(referenceType, referenceId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: { _handleFile: (_req: any, file: any, cb: any) => { const chunks: Buffer[] = []; file.stream.on('data', (c: any) => chunks.push(c)); file.stream.on('end', () => cb(null, { buffer: Buffer.concat(chunks), size: Buffer.concat(chunks).length })); }, _removeFile: (_req: any, _file: any, cb: any) => cb(null) } }))
  upload(@UploadedFile() file: any, @Body() b: any) {
    return this.svc.upload(file, b);
  }

  @Get()
  findAll(@Query() q: any) {
    return this.svc.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() b: any) {
    return this.svc.update(id, b);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
