import { type NextRequest, NextResponse } from "next/server"

const PROTECTED_PREFIXES = ["/dashboard", "/chat", "/documents"]
const AUTH_ROUTES = ["/sign-in", "/sign-up"]

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((p) => pathname.startsWith(p))
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasRefreshToken = request.cookies.has("refreshToken")

  if (isAuthRoute(pathname) && hasRefreshToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (isProtected(pathname) && !hasRefreshToken) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)",
  ],
}
