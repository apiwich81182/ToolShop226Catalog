import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus: 'connected' | 'not_configured' | 'error' = 'not_configured';
  let latencyMs = 0;
  let dbError: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      const dbStart = Date.now();
      const { error } = await supabase.from('products').select('id').limit(1);
      latencyMs = Date.now() - dbStart;

      if (error) {
        dbStatus = 'error';
        dbError = error.message;
      } else {
        dbStatus = 'connected';
      }
    } catch (err: unknown) {
      dbStatus = 'error';
      dbError = err instanceof Error ? err.message : 'Database check failed';
    }
  }

  const isHealthy = dbStatus !== 'error';
  const responsePayload = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'production',
    service: 'tool-shop-226-catalog',
    database: {
      status: dbStatus,
      latencyMs: dbStatus === 'connected' ? latencyMs : undefined,
      error: dbError,
    },
    totalResponseTimeMs: Date.now() - startTime,
  };

  return NextResponse.json(responsePayload, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
