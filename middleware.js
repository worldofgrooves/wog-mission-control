import { NextResponse } from 'next/server'

export function middleware(request) {
  const session = request.cookies.get('mc_session')
  const isValid = session?.value === process.env.SESSION_SECRET

  if (!isValid) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Protect everything except login, auth + agent APIs, and Next.js internals
    '/((?!login|api/auth|api/agents|_next/static|_next/image|favicon\\.ico).*)',
  ],
}
