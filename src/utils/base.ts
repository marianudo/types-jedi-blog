/**
 * Prefix a path with the configured `base` from astro.config.mjs, correctly
 * whether or not BASE_URL ends in a slash. Use this for any internal link
 * instead of hand-concatenating import.meta.env.BASE_URL — that's exactly
 * the kind of string-stitching bug a schema can't catch for you.
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return cleanPath ? `${base}/${cleanPath}` : `${base}/`;
}
