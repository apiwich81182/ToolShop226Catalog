import crypto from 'crypto';

export function getAdminSecret(): string | null {
  return process.env.ADMIN_PASSWORD || null;
}

export function generateAdminToken(): string {
  const secret = getAdminSecret();
  if (!secret) return '';
  const payload = `admin:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}:${hmac}`;
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const secret = getAdminSecret();
  if (!secret) return false;

  const parts = token.split(':');
  if (parts.length !== 3) return false;
  const [role, timestampStr, hmac] = parts;
  if (role !== 'admin') return false;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  // Session token valid for 7 days
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > maxAgeMs) return false;

  const payload = `${role}:${timestampStr}`;
  const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  try {
    const hmacBuf = Buffer.from(hmac, 'hex');
    const expectedBuf = Buffer.from(expectedHmac, 'hex');
    if (hmacBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(hmacBuf, expectedBuf);
  } catch {
    return false;
  }
}

export function getAdminTokenFromRequest(req: Request): string | null {
  // 1. Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Check Cookie header
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/admin_session=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1].trim());
    }
  }

  return null;
}
