import { NextResponse, type NextRequest } from 'next/server';

/**
 * A first, cheap gate: someone with no session cookie never sees the inside of an app, only its sign-in screen.
 * This only checks that a cookie exists. It cannot say whether the session is still valid (that needs the database,
 * which middleware cannot reach): every API call checks that for real, and the apps send a 401 back to sign-in.
 *
 * Each app has its own sign-in: /auth/login (customers), /auth/cashier/login and /auth/admin/login.
 */
const production = process.env.NODE_ENV === 'production';
const CUSTOMER_COOKIE = production ? '__Host-cj_c' : 'cj_c';
const STAFF_COOKIE = production ? '__Host-cj_s' : 'cj_s';

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const admin = pathname === '/admin' || pathname.startsWith('/admin/');
  const cashier = pathname === '/cashier' || pathname.startsWith('/cashier/');
  const hasCookie = req.cookies.has(admin || cashier ? STAFF_COOKIE : CUSTOMER_COOKIE);
  if (hasCookie) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = admin ? '/auth/admin/login' : cashier ? '/auth/cashier/login' : '/auth/login';
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/cards/:path*', '/rewards/:path*', '/offers/:path*', '/history/:path*', '/notifications/:path*', '/profile/:path*', '/setup/:path*', '/cashier/:path*', '/admin/:path*'],
};
