import { NextResponse } from 'next/server';

// In-memory sliding window rate limiter for brute-force protection
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  return 'unknown-ip';
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const now = Date.now();

    // Check rate limit status
    const record = loginAttempts.get(ip);
    if (record) {
      if (now < record.resetTime) {
        if (record.count >= MAX_ATTEMPTS) {
          const remainingSeconds = Math.ceil((record.resetTime - now) / 1000);
          return NextResponse.json(
            {
              success: false,
              message: `คุณกรอกรหัสผ่านผิดเกิน ${MAX_ATTEMPTS} ครั้ง เพื่อความปลอดภัยกรุณารออีก ${remainingSeconds} วินาที`,
            },
            { status: 429 }
          );
        }
      } else {
        // Window expired, reset record
        loginAttempts.delete(ip);
      }
    }

    const body = await req.json();
    const { password } = body;

    const serverPassword = process.env.ADMIN_PASSWORD || 'Jd245727';

    if (typeof password === 'string' && password === serverPassword) {
      // Clear failed attempts on successful login
      loginAttempts.delete(ip);
      return NextResponse.json({ success: true });
    }

    // Increment failed attempt counter
    const current = loginAttempts.get(ip) || { count: 0, resetTime: now + LOCKOUT_WINDOW_MS };
    current.count += 1;
    current.resetTime = now + LOCKOUT_WINDOW_MS;
    loginAttempts.set(ip, current);

    const remainingAttempts = Math.max(0, MAX_ATTEMPTS - current.count);

    return NextResponse.json(
      {
        success: false,
        message: remainingAttempts > 0
          ? `รหัสผ่านไม่ถูกต้อง (เหลือโอกาสลองอีก ${remainingAttempts} ครั้ง)`
          : `รหัสผ่านไม่ถูกต้อง บัญชีถูกระงับชั่วคราว 5 นาที`,
      },
      { status: 401 }
    );
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน' },
      { status: 500 }
    );
  }
}
