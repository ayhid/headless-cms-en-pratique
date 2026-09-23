// Strapi returns media URLs relative to its own origin (local upload provider: "/uploads/...").
// They are prefixed with NEXT_PUBLIC_STRAPI_URL, or STRAPI_URL (server components), see frontend/.env.example.
// Absolute URLs (cloud upload providers) are returned untouched.

export function strapiMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url) || url.startsWith('//')) return url;
  const base = (process.env.NEXT_PUBLIC_STRAPI_URL || process.env.STRAPI_URL || 'http://localhost:1337').replace(
    /\/+$/,
    '',
  );
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}
