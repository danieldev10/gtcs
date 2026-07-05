import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoleName } from '@prisma/client';
import { describe, expect, it } from '@jest/globals';
import { AuthTokenService } from './auth-token.service';

function createTokenService() {
  return new AuthTokenService(
    new ConfigService({
      AUTH_JWT_SECRET: 'test-secret-with-more-than-thirty-two-characters',
      AUTH_ACCESS_TOKEN_EXPIRES_SECONDS: 3600,
    }),
  );
}

describe(AuthTokenService, () => {
  it('signs and verifies access tokens', () => {
    const service = createTokenService();
    const token = service.signAccessToken({
      id: 'user-1',
      email: 'student@aun.edu.ng',
      role: RoleName.STUDENT,
      studentProfileId: 'profile-1',
      emailVerified: true,
    });

    expect(service.verifyAccessToken(token)).toEqual({
      id: 'user-1',
      email: 'student@aun.edu.ng',
      role: RoleName.STUDENT,
      studentProfileId: 'profile-1',
      emailVerified: true,
    });
  });

  it('rejects tampered tokens', () => {
    const service = createTokenService();
    const token = service.signAccessToken({
      id: 'user-1',
      email: 'student@aun.edu.ng',
      role: RoleName.STUDENT,
      emailVerified: true,
    });
    const tamperedToken = `${token.slice(0, -4)}nope`;

    expect(() => service.verifyAccessToken(tamperedToken)).toThrow(UnauthorizedException);
  });
});
