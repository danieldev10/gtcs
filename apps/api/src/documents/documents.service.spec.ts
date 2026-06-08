import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { DocumentType } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { StorageService } from '../storage/storage.service';

type CreatePresignedUpload = StorageService['createPresignedUpload'];

describe(DocumentsService, () => {
  it('creates a presigned upload request for a valid document', async () => {
    const createPresignedUpload = jest.fn<CreatePresignedUpload>(async () => ({
      bucket: 'aungtcs',
      key: 'graduation-applications/app-1/unofficial_transcript/file-id',
      uploadUrl: 'https://example.com/upload',
      expiresIn: 900,
    }));

    const storageService = {
      createPresignedUpload,
    } as unknown as StorageService;

    const service = new DocumentsService(storageService);

    await expect(
      service.presignUpload({
        applicationId: 'app-1',
        documentType: DocumentType.UNOFFICIAL_TRANSCRIPT,
        contentType: 'application/pdf',
      }),
    ).resolves.toMatchObject({
      bucket: 'aungtcs',
      expiresIn: 900,
    });

    expect(createPresignedUpload).toHaveBeenCalledWith({
      applicationId: 'app-1',
      documentType: 'unofficial_transcript',
      contentType: 'application/pdf',
    });
  });

  it('rejects invalid presign payloads', async () => {
    const createPresignedUpload = jest.fn<CreatePresignedUpload>();

    const storageService = {
      createPresignedUpload,
    } as unknown as StorageService;

    const service = new DocumentsService(storageService);

    await expect(service.presignUpload({ applicationId: '' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(createPresignedUpload).not.toHaveBeenCalled();
  });
});
