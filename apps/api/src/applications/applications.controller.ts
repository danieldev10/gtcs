import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApplicationsService } from './applications.service';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  findMany() {
    return this.applicationsService.findMany();
  }

  @Post('draft')
  createDraft(@Body() body: unknown) {
    return this.applicationsService.createDraft(body);
  }
}
