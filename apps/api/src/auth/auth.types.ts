import { RoleName } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: RoleName;
  studentProfileId?: string;
  emailVerified: boolean;
};

export type AccessTokenPayload = AuthenticatedUser & {
  type: 'access';
  iat: number;
  exp: number;
};

export type RequestWithUser = {
  user?: AuthenticatedUser;
  headers: {
    authorization?: string;
  };
};
