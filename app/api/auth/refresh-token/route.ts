import { NextResponse } from "next/server"
import {
  BACKEND_URL,
  getRefreshCookie,
  forwardRefreshCookie,
} from "@/lib/proxy-utils"

export async function GET() {
  const refreshToken = await getRefreshCookie()

  if (!refreshToken) {
    return NextResponse.json(
      { message: "No refresh token" },
      { status: 401 },
    )
  }

  const res = await fetch(`${BACKEND_URL}/api/auth/refresh-token`, {
    headers: { Cookie: `refreshToken=${refreshToken}` },
  })

  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status })
  }

  const response = NextResponse.json({ accessToken: data.accessToken })
  await forwardRefreshCookie(res.headers, response)
  return response
}
