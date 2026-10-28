// Calls the API with the in-memory access token. Only the API's own routes are called from here.
import { config } from '../config';
import { accessTokenOrNull, setSession } from '../auth/session';

export class SignedOutError extends Error {
  constructor() {
    super('Not signed in');
    this.name = 'SignedOutError';
  }
}

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`API request failed with status ${status}`);
    this.name = 'ApiError';
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = accessTokenOrNull();
  if (token === null) {
    throw new SignedOutError();
  }
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${config.apiBaseUrl}${path}`, { ...init, headers });
  if (response.status === 401) {
    setSession(null);
    throw new SignedOutError();
  }
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return response;
}
