import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { AccessTokenPayload, AuthenticatedUser } from './auth.types';

type JwtHeader = {
  alg: 'HS256';
  typ: 'JWT';
};

@Injectable()
export class AuthTokenService {
  constructor(private readonly config: ConfigService) {}

  signAccessToken(user: AuthenticatedUser) {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = this.config.getOrThrow<number>('AUTH_ACCESS_TOKEN_EXPIRES_SECONDS');
    const payload: AccessTokenPayload = {
      ...user,
      type: 'access',
      iat: now,
      exp: now + expiresIn,
    };

    return this.sign(payload);
  }

  verifyAccessToken(token: string): AuthenticatedUser {
    const payload = this.verify(token);

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token.');
    }

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      studentProfileId: payload.studentProfileId,
      emailVerified: payload.emailVerified,
    };
  }

  private sign(payload: AccessTokenPayload) {
    const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = this.encodeJson(header);
    const encodedPayload = this.encodeJson(payload);
    const signature = this.signingDigest(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private verify(token: string): AccessTokenPayload {
    const [encodedHeader, encodedPayload, signature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException('Invalid access token.');
    }

    const expectedSignature = this.signingDigest(`${encodedHeader}.${encodedPayload}`);

    if (!this.safeEquals(signature, expectedSignature)) {
      throw new UnauthorizedException('Invalid access token.');
    }

    const header = this.decodeJson<JwtHeader>(encodedHeader);
    const payload = this.decodeJson<AccessTokenPayload>(encodedPayload);
    const now = Math.floor(Date.now() / 1000);

    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      throw new UnauthorizedException('Invalid access token.');
    }

    if (!payload.exp || payload.exp < now) {
      throw new UnauthorizedException('Access token expired.');
    }

    return payload;
  }

  private signingDigest(value: string) {
    return createHmac('sha256', this.config.getOrThrow<string>('AUTH_JWT_SECRET'))
      .update(value)
      .digest('base64url');
  }

  private encodeJson(value: unknown) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private decodeJson<T>(value: string): T {
    try {
      return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
    } catch {
      throw new UnauthorizedException('Invalid access token.');
    }
  }

  private safeEquals(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }
}
