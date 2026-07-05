import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

type PresignedUploadInput = {
  applicationId: string;
  documentType: string;
  contentType: string;
};

@Injectable()
export class StorageService {
  private readonly client: S3Client;

  constructor(private readonly config: ConfigService) {
    this.client = new S3Client({
      region: this.config.getOrThrow<string>('AWS_REGION'),
    });
  }

  async createPresignedUpload(input: PresignedUploadInput) {
    const bucket = this.config.get<string>('AWS_S3_BUCKET');

    if (!bucket) {
      throw new Error('AWS_S3_BUCKET must be configured before file uploads can be used.');
    }

    const key = [
      'graduation-applications',
      input.applicationId,
      input.documentType,
      `${randomUUID()}`,
    ].join('/');

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: input.contentType,
    });

    const expiresIn = this.config.getOrThrow<number>('AWS_S3_PRESIGN_EXPIRES_SECONDS');
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

    return {
      bucket,
      key,
      uploadUrl,
      expiresIn,
    };
  }

  async createPresignedDownload(input: { bucket: string; key: string }) {
    const command = new GetObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
    });
    const expiresIn = this.config.getOrThrow<number>('AWS_S3_PRESIGN_EXPIRES_SECONDS');
    const downloadUrl = await getSignedUrl(this.client, command, { expiresIn });

    return {
      downloadUrl,
      expiresIn,
    };
  }
}
