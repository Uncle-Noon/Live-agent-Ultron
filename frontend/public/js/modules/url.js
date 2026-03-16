// ── URL normalizer — adds https:// if the user omits the protocol ─────────────
export function normalizeUrl(raw) {
  const s = (raw || '').trim();
  if (!s) return s;
  if (/^https?:\/\//i.test(s)) return s;      // already has protocol
  return 'https://' + s;                        // instagram.com → https://instagram.com
}

// ── Domain validator — rejects obviously fake strings ─────────────────────────
// Valid: youtube.com, www.instagram.com, my-app.io, maps.google.co.uk
// Invalid: asdfasdf, hello!!!, notawebsite, 12345
export function isValidDomain(urlString) {
  try {
    const { hostname } = new URL(urlString);
    return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i.test(hostname);
  } catch { return false; }
}
