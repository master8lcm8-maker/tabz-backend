// src/storage/spaces-upload.service.ts
import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export type ProfileImageKind = 'avatar' | 'cover';

export type UploadResult = {
  key: string;
  url: string;
  bucket: string;
  contentType: string;
  sizeBytes: number;
};

@Injectable()
export class SpacesUploadService {
  private s3: S3Client | null = null;

  // These may be unset in dev; we validate lazily on first upload call.
  private readonly endpoint?: string;
  private readonly region?: string;
  private readonly accessKeyId?: string;
  private readonly secretAccessKey?: string;

  private readonly bucket?: string;
  private readonly publicBaseUrl?: string; // e.g. https://<bucket>.<region>.digitaloceanspaces.com
  private readonly maxBytes: number;

  private readonly allowedContentTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  constructor(private readonly config: ConfigService) {
    this.endpoint = this.get('SPACES_ENDPOINT'); // e.g. https://nyc3.digitaloceanspaces.com
    this.region = this.get('SPACES_REGION'); // e.g. nyc3
    this.accessKeyId = this.get('SPACES_KEY');
    this.secretAccessKey = this.get('SPACES_SECRET');

    this.bucket = this.get('SPACES_BUCKET');

    // Recommended explicit base for deterministic URL returns:
    // https://<bucket>.<region>.digitaloceanspaces.com
    const explicitPublic = (this.get('SPACES_PUBLIC_BASE_URL') || '').trim();
    if (explicitPublic) this.publicBaseUrl = explicitPublic;
    else if (this.bucket && this.region) {
      this.publicBaseUrl = `https://${this.bucket}.${this.region}.digitaloceanspaces.com`;
    }

    const maxMb = Number(this.get('UPLOAD_MAX_MB') || '5') || 5;
    this.maxBytes = Math.max(1, maxMb) * 1024 * 1024;
  }

  async uploadProfileImage(params: {
    userId: number;
    kind: ProfileImageKind;
    buffer: Buffer;
    contentType: string;
  }): Promise<UploadResult> {
    const userId = Number(params.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new BadRequestException('invalid_user');
    }

    const kind = params.kind;
    if (kind !== 'avatar' && kind !== 'cover') {
      throw new BadRequestException('invalid_kind');
    }

    const contentType = String(params.contentType || '').toLowerCase().trim();
    if (!this.allowedContentTypes.has(contentType)) {
      throw new BadRequestException('invalid_file_type');
    }

    const buf = params.buffer;
    if (!Buffer.isBuffer(buf) || buf.length <= 0) {
      throw new BadRequestException('empty_file');
    }
    if (buf.length > this.maxBytes) {
      throw new BadRequestException('file_too_large');
    }

    const client = this.getClientOrThrow();

    const ext = this.extFromContentType(contentType);
    const ts = Date.now();

    const key = `profiles/${userId}/${kind}_${ts}.${ext}`;

    const urlBase = this.publicBaseUrl;
    if (!urlBase) {
      throw new ServiceUnavailableException('storage_not_configured');
    }
    const url = `${urlBase}/${key}`;

    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket!,
        Key: key,
        Body: buf,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
        ACL: 'public-read',
      }),
    );

    return {
      key,
      url,
      bucket: this.bucket!,
      contentType,
      sizeBytes: buf.length,
    };
  }

  private getClientOrThrow(): S3Client {
    if (this.s3) return this.s3;

    const endpoint = this.endpoint;
    const region = this.region;
    const accessKeyId = this.accessKeyId;
    const secretAccessKey = this.secretAccessKey;
    const bucket = this.bucket;

    if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) {
      throw new ServiceUnavailableException('storage_not_configured');
    }

    this.s3 = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: false,
    });

    return this.s3;
  }

  private extFromContentType(ct: string): string {
    if (ct === 'image/jpeg') return 'jpg';
    if (ct === 'image/png') return 'png';
    if (ct === 'image/webp') return 'webp';
    return 'bin';
  }

  private get(name: string): string {
    return (this.config.get<string>(name) || '').trim();
  }
}
