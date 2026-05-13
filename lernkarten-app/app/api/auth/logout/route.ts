import { NextResponse } from 'next/server';
import { loescheSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  await loescheSession();
  return NextResponse.json({ ok: true });
}
