import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import * as nodePath from 'path';

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket = process.env.R2_BUCKET;
  private readonly publicUrl = process.env.R2_PUBLIC_URL;

  constructor() {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  async uploadFile(path: string, file: Express.Multer.File) {
    try {
      const put = new PutObjectCommand({
        Bucket: this.bucket,
        Key: path,
        Body: file.buffer,
        ContentType: file.mimetype ?? 'application/octet-stream',
      });

      await this.s3.send(put);

      return {
        key: path,
        localFileName: file.originalname,
        remoteFileName: nodePath.basename(path),
        fileSize: file.size,
        mimeType: file.mimetype,
        url: `${this.publicUrl}/${path}`,
      };
    } catch (err) {
      console.error('Upload R2 error:', err);
      throw err;
    }
  }

  async deleteFile(path: string) {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: path,
        }),
      );

      return { success: true };
    } catch (err) {
      console.error('Delete R2 error:', err);
      throw err;
    }
  }

  async readFile(path: string): Promise<Buffer> {
    try {
      const res = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: path,
        }),
      );

      const stream = res.Body as Readable;

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }

      return Buffer.concat(chunks);
    } catch (err) {
      console.error('Read R2 error:', err);
      throw err;
    }
  }
}
