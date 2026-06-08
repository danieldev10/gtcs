import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { z } from 'zod';
import { StorageService } from '../storage/storage.service';

const presignUploadSchema = z.object({
  applicationId: z.string().min(1),
  documentType: z.nativeEnum(DocumentType),
  contentType: z.string().min(1).default('application/pdf'),
});

@Injectable()
export class DocumentsService {
  constructor(private readonly storageService: StorageService) {}

  async presignUpload(input: unknown) {
    const parsed = presignUploadSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.storageService.createPresignedUpload({
      applicationId: parsed.data.applicationId,
      documentType: parsed.data.documentType.toLowerCase(),
      contentType: parsed.data.contentType,
    });
  }
}
