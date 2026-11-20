import type { NextConfig } from 'next';

const production = process.env.NODE_ENV === 'production';

/**
 * Headers for every response. The content security policy is deliberately small: it stops the app being shown inside another
 * site (clickjacking), blocks injected <base> tags and form posts to other sites, and forbids plugins, without restricting
 * scripts (a script policy needs a nonce on every request). The camera is allowed for the cashier's QR scanner and location for
 * the Outlets page. HSTS is only sent in production, where the site is served over HTTPS.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=(), payment=()' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  ...(production ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /** The old addresses keep working: bookmarks and links sent before the sign-in screens moved under /auth, and /owner became /admin. */
  async redirects() {
    return [
      { source: '/login', destination: '/auth/login', permanent: true },
      { source: '/staff/login', destination: '/auth/cashier/login', permanent: true },
      { source: '/staff/forgot-pin', destination: '/auth/cashier/forgot-password', permanent: true },
      { source: '/owner', destination: '/admin', permanent: true },
      { source: '/owner/:path*', destination: '/admin/:path*', permanent: true },
    ];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // The push service worker must always be fetched fresh, or a fixed version would take days to reach phones that already have it.
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' }] },
    ];
  },
};

export default nextConfig;
