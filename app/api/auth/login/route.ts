import { NextRequest, NextResponse } from "next/server"
import { BACKEND_URL, forwardRefreshCookie } from "@/lib/proxy-utils"

export async function POST(req: NextRequest) {
  const body = await req.json()

  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status })
  }

  const response = NextResponse.json({ accessToken: data.accessToken })
  await forwardRefreshCookie(res.headers, response)
  return response
}
