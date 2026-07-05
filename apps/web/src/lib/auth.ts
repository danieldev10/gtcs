import { apiBaseUrl } from './config';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  studentProfile: {
    id: string;
    studentId: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
  } | null;
};

export type AuthSession = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
};

export const authTokenStorageKey = 'gtcs.accessToken';
export const authUserStorageKey = 'gtcs.user';

export function getStoredAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(authTokenStorageKey);
}

export function saveAuthSession(session: AuthSession) {
  window.localStorage.setItem(authTokenStorageKey, session.accessToken);
  window.localStorage.setItem(authUserStorageKey, JSON.stringify(session.user));
}

export function clearAuthSession() {
  window.localStorage.removeItem(authTokenStorageKey);
  window.localStorage.removeItem(authUserStorageKey);
}

export async function authRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  });

  const body = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    throw new Error(readApiError(body));
  }

  return body as T;
}

type ApiErrorBody = {
  message?: unknown;
  error?: string;
};

function readApiError(body: unknown) {
  if (!body || typeof body !== 'object') {
    return 'The server could not process the request.';
  }

  const apiError = body as ApiErrorBody;

  if (typeof apiError.message === 'string') {
    return apiError.message;
  }

  if (Array.isArray(apiError.message)) {
    return apiError.message.join(' ');
  }

  if (apiError.message && typeof apiError.message === 'object') {
    const flattened = flattenErrorObject(apiError.message);

    if (flattened) {
      return flattened;
    }
  }

  return apiError.error ?? 'The server could not process the request.';
}

function flattenErrorObject(value: object) {
  const messages: string[] = [];

  for (const item of Object.values(value)) {
    if (Array.isArray(item)) {
      messages.push(...item.map(String));
    } else if (item && typeof item === 'object') {
      const nested = flattenErrorObject(item);

      if (nested) {
        messages.push(nested);
      }
    }
  }

  return messages.join(' ');
}
