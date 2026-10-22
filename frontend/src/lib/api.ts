const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api').replace(/\/+$/, '')

let accessToken: string | null = null

export class ApiError extends Error {
  public readonly status: number
  public readonly errors?: Record<string, string[]>

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export function setApiToken(token: string | null): void {
  accessToken = token
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (accessToken !== null) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${apiBaseUrl}/${path.replace(/^\/+/, '')}`, {
    ...init,
    headers,
  })
  let payload: unknown = null

  if (response.status !== 204) {
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      payload = await response.json()
    } else {
      payload = await response.text()
    }
  }

  if (!response.ok) {
    const body = typeof payload === 'object' && payload !== null
      ? payload as { message?: string; errors?: Record<string, string[]> }
      : {}

    const message = typeof payload === 'string' && payload.trim() !== ''
      ? payload
      : body.message ?? `Request failed with status ${response.status}`

    throw new ApiError(message, response.status, body.errors)
  }

  if (typeof payload === 'string') {
    throw new ApiError('The API returned a non-JSON response.', response.status)
  }

  return payload as T
}
