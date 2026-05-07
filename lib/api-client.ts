import axios, { type InternalAxiosRequestConfig } from "axios"
import { getStore } from "@/lib/store/store-ref"
import { reset, setAccessToken } from "@/lib/store/auth-slice"

export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
})

// ── Request interceptor: attach access token ──────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = getStore()?.getState().auth.accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Mutex-based refresh: single in-flight refresh, queue all others ──
let refreshPromise: Promise<string> | null = null

export function getNewToken(): Promise<string> {
  if (refreshPromise) return refreshPromise

  refreshPromise = axios
    .get<{ accessToken: string }>("/api/auth/refresh-token", {
      withCredentials: true,
    })
    .then((res) => {
      const newToken = res.data.accessToken
      getStore()?.dispatch(setAccessToken(newToken))
      return newToken
    })
    .catch((err) => {
      getStore()?.dispatch(reset())
      throw err
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

// ── Response interceptor: 401 → refresh once, retry, never loop ──────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh-token")
    ) {
      originalRequest._retry = true

      try {
        const newToken = await getNewToken()
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch {
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)
