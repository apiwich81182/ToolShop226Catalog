import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { generateAdminToken, verifyAdminToken, getAdminTokenFromRequest } from '@/lib/authUtils';

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

/**
 * GET: Check whether the current session has valid admin authorization
 */
export async function GET(req: Request) {
  const token = getAdminTokenFromRequest(req);
  const isValid = verifyAdminToken(token);
  return NextResponse.json({ authenticated: isValid });
}

/**
 * DELETE: Logout admin and clear session cookie
 */
export async function DELETE() {
  const res = NextResponse.json({ success: true, message: 'ออกจากระบบเรียบร้อยแล้ว' });
  res.cookies.set('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}

/**
 * POST: Authenticate admin with password and set secure HTTP-only cookie
 */
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

    const serverPassword = process.env.ADMIN_PASSWORD;

    // Secure check: ADMIN_PASSWORD must be configured in environment variables
    if (!serverPassword) {
      console.error('CRITICAL: ADMIN_PASSWORD environment variable is not configured');
      return NextResponse.json(
        {
          success: false,
          message: 'ระบบยังไม่ได้ตั้งค่ารหัสผ่านผู้ดูแลระบบ (ADMIN_PASSWORD) ใน Environment Variables',
        },
        { status: 500 }
      );
    }

    if (typeof password === 'string') {
      const passwordBuffer = Buffer.from(password.trim());
      const serverPasswordBuffer = Buffer.from(serverPassword.trim());

      // Timing-safe comparison to prevent timing attacks
      const isMatch =
        passwordBuffer.length === serverPasswordBuffer.length &&
        crypto.timingSafeEqual(passwordBuffer, serverPasswordBuffer);

      if (isMatch) {
        // Clear failed attempts on successful login
        loginAttempts.delete(ip);

        // Generate HMAC-signed admin session token
        const token = generateAdminToken();

        const res = NextResponse.json({ success: true });
        // Set secure HTTP-only cookie (7 days duration)
        res.cookies.set('admin_session', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return res;
      }
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
        message:
          remainingAttempts > 0
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
