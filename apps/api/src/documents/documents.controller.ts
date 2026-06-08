import { Body, Controller, Post } from '@nestjs/common';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('presign')
  presignUpload(@Body() body: unknown) {
    return this.documentsService.presignUpload(body);
  }
}
