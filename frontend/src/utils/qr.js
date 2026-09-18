// QR codes for products encode a small custom-scheme string rather than
// just the raw SKU, so the scanner can tell "one of our product QR codes"
// apart from an arbitrary QR code someone points the camera at.
const PREFIX = 'invpro:sku:';

export function encodeProductQr(sku) {
  return `${PREFIX}${sku}`;
}

export function decodeProductQr(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith(PREFIX)) return null;
  const sku = trimmed.slice(PREFIX.length).trim();
  return sku.length > 0 ? sku : null;
}
