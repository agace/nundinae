const API_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('nundinae.token');
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem('nundinae.token', token);
  else localStorage.removeItem('nundinae.token');
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = (isJson && body && typeof body === 'object' && 'error' in body)
      ? (body as { error: string }).error
      : `Erro ${res.status}`;
    throw new ApiError(res.status, msg, body);
  }
  return body as T;
}

/** Upload de arquivo (multipart). Não seta Content-Type — o browser cuida do
 *  boundary do FormData. Reaproveita o token e o tratamento de erro do api(). */
export async function upload<T>(path: string, formData: FormData): Promise<T> {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: formData });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = (isJson && body && typeof body === 'object' && 'error' in body)
      ? (body as { error: string }).error
      : `Erro ${res.status}`;
    throw new ApiError(res.status, msg, body);
  }
  return body as T;
}

export const http = {
  get: <T>(path: string) => api<T>(path),
  post: <T>(path: string, body?: unknown) =>
    api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    api<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    api<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => api<T>(path, { method: 'DELETE' }),
  upload,
};
