import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"

export { BACKEND_URL }

export function extractSetCookieToken(
  headers: Headers,
  name: string,
): string | null {
  const raw = headers.get("set-cookie")
  if (!raw) return null
  const re = new RegExp(`${name}=([^;]+)`)
  const m = raw.match(re)
  return m ? m[1] : null
}

export async function forwardRefreshCookie(
  backendHeaders: Headers,
  response: NextResponse,
) {
  const token = extractSetCookieToken(backendHeaders, "refreshToken")
  if (token) {
    const store = await cookies()
    store.set("refreshToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    })
  }
}

export async function getRefreshCookie(): Promise<string | undefined> {
  const store = await cookies()
  return store.get("refreshToken")?.value
}
