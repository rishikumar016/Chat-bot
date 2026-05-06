import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { BACKEND_URL, getRefreshCookie } from "@/lib/proxy-utils"

export async function GET(req: NextRequest) {
  const authorization = req.headers.get("authorization") || ""
  const refreshToken = await getRefreshCookie()

  try {
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      headers: {
        Authorization: authorization,
        Cookie: refreshToken ? `refreshToken=${refreshToken}` : "",
      },
    })
  } catch {
    // best-effort — clear local session regardless
  }

  const store = await cookies()
  store.delete("refreshToken")

  return NextResponse.json({ message: "Logged out" })
}
