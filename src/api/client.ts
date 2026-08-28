import { clearToken, getToken } from '../auth'

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  'http://feedbackapi.luckyfishes.site'

export class ApiError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.code = code
  }
}

interface EnvelopeLike {
  code?: number
  message?: string
  data?: unknown
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (init?.headers) Object.assign(headers, init.headers as Record<string, string>)
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })

  let body: EnvelopeLike
  try {
    body = (await res.json()) as EnvelopeLike
  } catch {
    throw new ApiError(-1, `请求失败（HTTP ${res.status}）`)
  }

  // 管理员 token 错误或缺失 → 清除本地 token 并通知跳登录
  if (res.status === 401 || body.code === 40101) {
    clearToken()
    window.dispatchEvent(new Event('auth-expired'))
    throw new ApiError(40101, '登录已过期，请重新输入 Token')
  }
  if (body.code !== 0) {
    throw new ApiError(body.code ?? -1, body.message ?? '请求失败')
  }
  return body.data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
}
