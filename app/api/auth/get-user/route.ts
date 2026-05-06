import { NextRequest, NextResponse } from "next/server"
import { BACKEND_URL } from "@/lib/proxy-utils"

export async function GET(req: NextRequest) {
  const authorization = req.headers.get("authorization") || ""

  const res = await fetch(`${BACKEND_URL}/api/auth/get-user`, {
    headers: {
      Authorization: authorization,
      "Cache-Control": "no-cache",
    },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
